const RAPPROCHEMENTS_SHEET = 'Rapprochements_a_valider';
const RAPPROCHEMENTS_HEADERS = [
  'id','statut','score','operation_manuelle_id','operation_importee_id',
  'date_manuelle','date_bancaire','libelle_manuel','libelle_bancaire',
  'montant','type','compte','decision','cree_le','modifie_le'
];

/**
 * Import canonique Hello bank! :
 * - une opération importée correspond à un mouvement bancaire réel ;
 * - les données bancaires sont écrites dans leurs colonnes dédiées ;
 * - les charges fixes ne génèrent aucune opération : elles sont uniquement
 *   rapprochées des mouvements réellement observés.
 */
function importerOperationsHelloBank(operations, compte) {
  verifierInitialisation_();
  initialiserCorrespondancesBancaires();
  initialiserRapprochementsAValider_();
  if (!Array.isArray(operations) || !operations.length) throw new Error('Aucune opération PDF à importer.');
  if (!compte) throw new Error('Choisissez le compte bancaire concerné.');

  const existantes = lireTable_('Operations');
  const clesExistantes = new Set(existantes.map(cleOperationImport_));
  const charges = lireTable_('Charges_fixes').filter(c => convertirBooleen_(c.actif));
  const correspondances = lireCorrespondancesBancaires();
  const aAjouter = [];
  const rapprochementsAValider = [];
  const correspondancesAIncrementer = new Map();
  const chargesAActualiser = new Map();
  const resultats = { importees:0, doublons:0, rapprochees:0, rapprocheesManuelles:0, aValider:0, reconnues:0, erreurs:[] };

  operations.forEach((operation, index) => {
    try {
      const dateComptable = dateLocaleBudgetSoft_(operation.date_comptable || operation.date);
      const montantSigne = convertirNombre_(operation.montant);
      const libelleBancaire = nettoyerLibelleHelloBank_(operation.libelle_bancaire || operation.details || operation.libelle);
      if (isNaN(dateComptable.getTime()) || !libelleBancaire || !montantSigne) throw new Error('ligne bancaire incomplète');

      const type = montantSigne < 0 ? 'depense' : 'revenu';
      const objetCle = { date:dateComptable, libelle_bancaire:libelleBancaire, libelle:libelleBancaire, montant:montantSigne, type, compte };
      const cle = cleOperationImport_(objetCle);
      if (clesExistantes.has(cle)) { resultats.doublons++; return; }

      const correspondance = trouverCorrespondanceBancaire_(libelleBancaire, compte, correspondances);
      const rapprochementCharge = type === 'depense'
        ? rapprocherChargeFixe_(libelleBancaire, Math.abs(montantSigne), compte, charges, dateComptable)
        : null;

      const libelleNormalise = correspondance?.libelle_normalise || rapprochementCharge?.charge?.libelle || proposerLibelleNormalise_(libelleBancaire);
      const categorie = correspondance?.categorie || rapprochementCharge?.charge?.categorie || suggererCategorieHelloBank_(libelleBancaire, type);
      const dateAchat = operation.date_achat ? dateLocaleBudgetSoft_(operation.date_achat) : null;
      const maintenant = new Date().toISOString();
      const candidateManuelle = trouverSaisieManuelleCorrespondante_(
        { date:dateComptable, libelle:libelleBancaire, montant:Math.abs(montantSigne), type, compte },
        existantes
      );

      const donneesBanque = {
        source_bancaire:'HELLOBANK_PDF',
        date_comptable:formatDateLocaleBudgetSoft_(dateComptable),
        date_achat:dateAchat ? formatDateLocaleBudgetSoft_(dateAchat) : '',
        libelle_bancaire:libelleBancaire,
        marchand_normalise:normaliserMarchandHelloBank_(libelleBancaire),
        carte_fin:String(operation.carte_fin || extraireCarteFinHelloBank_(libelleBancaire) || ''),
        cle_rapprochement:cle,
        statut_bancaire:rapprochementCharge ? 'rapprochee_charge_fixe' : 'importe_reel',
        charge_fixe_id:rapprochementCharge ? rapprochementCharge.charge.id : ''
      };

      if (candidateManuelle && candidateManuelle.automatique) {
        enregistrerLigne('Operations', Object.assign({}, candidateManuelle.operation, donneesBanque, {
          id:candidateManuelle.operation.id,
          date:dateComptable,
          libelle:candidateManuelle.operation.libelle || libelleNormalise,
          categorie:candidateManuelle.operation.categorie || categorie,
          compte,
          montant:Math.abs(montantSigne),
          type,
          commentaire:candidateManuelle.operation.commentaire || '',
          cree_le:candidateManuelle.operation.cree_le || ''
        }));
        resultats.rapprocheesManuelles++;
      } else {
        const operationImportee = Object.assign({
          id:Utilities.getUuid(), date:dateComptable, libelle:libelleNormalise, categorie, compte,
          montant:type === 'depense' ? -Math.abs(montantSigne) : Math.abs(montantSigne),
          type, commentaire:'', cree_le:maintenant, modifie_le:maintenant
        }, donneesBanque);
        aAjouter.push(operationImportee);
        existantes.push(operationImportee);
        clesExistantes.add(cle);
        resultats.importees++;

        if (candidateManuelle) {
          rapprochementsAValider.push({
            id:Utilities.getUuid(), statut:'À valider', score:candidateManuelle.score,
            operation_manuelle_id:candidateManuelle.operation.id,
            operation_importee_id:operationImportee.id,
            date_manuelle:candidateManuelle.operation.date,
            date_bancaire:formatDateLocaleBudgetSoft_(dateComptable),
            libelle_manuel:candidateManuelle.operation.libelle,
            libelle_bancaire:libelleBancaire,
            montant:Math.abs(montantSigne), type, compte,
            decision:'', cree_le:maintenant, modifie_le:maintenant
          });
          resultats.aValider++;
        }
      }

      if (correspondance) {
        resultats.reconnues++;
        const idCorrespondance = String(correspondance.id);
        const copie = correspondancesAIncrementer.get(idCorrespondance) || Object.assign({}, correspondance);
        copie.utilisations = Number(copie.utilisations || 0) + 1;
        copie.derniere_utilisation = maintenant;
        correspondancesAIncrementer.set(idCorrespondance, copie);
      }

      if (rapprochementCharge) {
        resultats.rapprochees++;
        const charge = Object.assign({}, rapprochementCharge.charge, {
          dernier_rapprochement_id:cle,
          dernier_rapprochement_date:formatDateLocaleBudgetSoft_(dateComptable),
          dernier_montant_reel:Math.abs(montantSigne),
          statut_rapprochement:'Rapprochée'
        });
        chargesAActualiser.set(String(charge.id), charge);
      }
    } catch (e) {
      resultats.erreurs.push('Ligne ' + (index + 1) + ' : ' + e.message);
    }
  });

  ajouterOperationsEnLot_(aAjouter);
  ajouterRapprochementsEnLot_(rapprochementsAValider);
  enregistrerCorrespondancesBancairesEnLot_([...correspondancesAIncrementer.values()]);
  [...chargesAActualiser.values()].forEach(c => enregistrerLigne('Charges_fixes', c));
  return resultats;
}

function ajouterOperationsEnLot_(operations) {
  if (!operations || !operations.length) return;
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');
  const entetes = TABLES.Operations;
  const lignes = operations.map(op => entetes.map(cle => normaliserValeur_(op[cle])));
  feuille.getRange(feuille.getLastRow() + 1, 1, lignes.length, entetes.length).setValues(lignes);
}

function ajouterRapprochementsEnLot_(lignesObjets) {
  if (!lignesObjets || !lignesObjets.length) return;
  initialiserRapprochementsAValider_();
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RAPPROCHEMENTS_SHEET);
  const lignes = lignesObjets.map(obj => RAPPROCHEMENTS_HEADERS.map(h => obj[h] == null ? '' : obj[h]));
  feuille.getRange(feuille.getLastRow() + 1, 1, lignes.length, RAPPROCHEMENTS_HEADERS.length).setValues(lignes);
}

function trouverSaisieManuelleCorrespondante_(operationPdf, operationsExistantes) {
  const datePdf = debutJour_(dateLocaleBudgetSoft_(operationPdf.date));
  const montantPdf = Math.abs(Number(operationPdf.montant || 0));
  const motsPdf = motsSignificatifsBanque_(operationPdf.libelle);
  const candidates = (operationsExistantes || []).map(operation => {
    if (String(operation.compte || '') !== String(operationPdf.compte || '')) return null;
    if (String(operation.type || '').toLowerCase() !== String(operationPdf.type || '').toLowerCase()) return null;
    if (Math.abs(Math.abs(Number(operation.montant || 0)) - montantPdf) > 0.01) return null;
    if (String(operation.source_bancaire || '')) return null;
    const dateExistante = debutJour_(dateLocaleBudgetSoft_(operation.date));
    if (isNaN(dateExistante.getTime())) return null;
    const ecartJours = Math.abs(Math.round((dateExistante.getTime() - datePdf.getTime()) / 86400000));
    if (ecartJours > 2) return null;
    const motsExistants = motsSignificatifsBanque_(operation.libelle);
    const communs = motsExistants.filter(m => motsPdf.includes(m)).length;
    const scoreLibelle = Math.max(motsExistants.length, motsPdf.length) ? Math.round(60 * communs / Math.max(motsExistants.length, motsPdf.length)) : 0;
    const scoreDate = ecartJours === 0 ? 30 : ecartJours === 1 ? 20 : 10;
    const score = 40 + scoreDate + scoreLibelle;
    return { operation, score, ecartJours, automatique: score >= 70 };
  }).filter(Boolean).sort((a,b)=>b.score-a.score || a.ecartJours-b.ecartJours);
  return candidates.length && candidates[0].score >= 50 ? candidates[0] : null;
}

function motsSignificatifsBanque_(texte) {
  const motsVides = new Set(['PRLV','SEPA','RECU','VIR','VIREMENT','FACTURE','CARTE','PAIEMENT','CB','RETRAIT','DAB','COMMISSIONS','FR','EUR','EURO','CLIENT','REF','REFERENCE','ECH','ID','EMETTEUR']);
  return normaliserTexteBanque_(texte).split(' ').filter(m => m.length > 2 && !motsVides.has(m) && !/^\d+$/.test(m));
}

function initialiserRapprochementsAValider_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let feuille = ss.getSheetByName(RAPPROCHEMENTS_SHEET);
  if (!feuille) feuille = ss.insertSheet(RAPPROCHEMENTS_SHEET);
  if (feuille.getLastRow() === 0) feuille.getRange(1,1,1,RAPPROCHEMENTS_HEADERS.length).setValues([RAPPROCHEMENTS_HEADERS]);
  feuille.setFrozenRows(1);
  feuille.getRange(1,1,1,RAPPROCHEMENTS_HEADERS.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff');
  feuille.autoResizeColumns(1,RAPPROCHEMENTS_HEADERS.length);
}

function enregistrerRapprochementAValider_(donnees) {
  initialiserRapprochementsAValider_();
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RAPPROCHEMENTS_SHEET);
  const maintenant = new Date().toISOString();
  const ligne = Object.assign({id:Utilities.getUuid(),statut:'À valider',decision:'',cree_le:maintenant,modifie_le:maintenant}, donnees || {});
  feuille.appendRow(RAPPROCHEMENTS_HEADERS.map(h => ligne[h] == null ? '' : ligne[h]));
  return ligne;
}

function lireRapprochementsAValider() {
  initialiserRapprochementsAValider_();
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RAPPROCHEMENTS_SHEET);
  if (feuille.getLastRow() < 2) return [];
  return feuille.getRange(2,1,feuille.getLastRow()-1,RAPPROCHEMENTS_HEADERS.length).getValues()
    .filter(l => l.some(v => v !== '' && v !== null))
    .map(l => Object.fromEntries(RAPPROCHEMENTS_HEADERS.map((h,i)=>[h,l[i] instanceof Date ? l[i].toISOString() : l[i]])));
}

function rapprocherChargeFixe_(libelle, montant, compte, charges, dateOperation) {
  const normalise = normaliserTexteBanque_(libelle);
  const dateOp = dateLocaleBudgetSoft_(dateOperation || new Date());
  let meilleur = null;
  (charges || []).forEach(charge => {
    if (String(charge.compte) !== String(compte)) return;
    const attendu = normaliserTexteBanque_(charge.libelle_bancaire || charge.libelle);
    const mots = attendu.split(' ').filter(m => m.length > 2);
    const motsTrouves = mots.filter(m => normalise.includes(m)).length;
    const scoreLibelle = mots.length ? Math.round(65 * motsTrouves / mots.length) : 0;
    const tolerance = Math.max(0.01, Number(charge.tolerance) || 0.50);
    const ecart = Math.abs(Number(charge.montant) - montant);
    const scoreMontant = ecart <= tolerance ? 25 : Math.max(0, Math.round(25 - (ecart / Math.max(Math.abs(Number(charge.montant)||montant),1)) * 100));
    const jourAttendu = Math.max(1, Math.min(31, Number(charge.jour_execution) || dateOp.getDate()));
    const ecartJour = Math.abs(dateOp.getDate() - jourAttendu);
    const scoreDate = ecartJour <= 2 ? 10 : ecartJour <= 7 ? 5 : 0;
    const score = scoreLibelle + scoreMontant + scoreDate;
    if (score >= 75 && (!meilleur || score > meilleur.score)) meilleur = {charge,score,ecartMontant:ecart,ecartJour};
  });
  return meilleur;
}

function suggererCategorieHelloBank_(libelle, type) {
  if (type === 'revenu') return /SALAIRE|PAYE|FRANCE TRAVAIL|LOYER/i.test(libelle) ? 'Revenus' : '';
  const regles = [
    [/CARREFOUR|LECLERC|INTERMARCHE|ALDI|MONOPRIX|BOUCHERIE|BOULAN/i, 'Courses'],
    [/PHARMAC|QARE|MUTUELLE|SANTE|AUDIENS/i, 'Santé'],
    [/TISSEO|EFFIA|AUTOROUTE|ALVEA|TOTAL STATION/i, 'Transport'],
    [/LEROY|BRICASTE|ADEO/i, 'Logement'],
    [/FREE|SFR|BOUYGUES|MOBILE|TELECOM/i, 'Télécommunications'],
    [/D\.G\.F\.I\.P|IMPOT/i, 'Impôts'],
    [/KOZOO|VET /i, 'Animaux'],
    [/DEEZER|GOOGLE ONE|OPENAI|IONOS|OPODO PRIME|FAMILO/i, 'Abonnements'],
    [/CASDEN|COFIDIS|CREATIS|FLOA|ONEY|CARREFOUR BANQUE/i, 'Crédits'],
    [/SURAVENIR|ASSURANCE|MAIF|MACIF|AXA|ALLIANZ/i, 'Assurances'],
    [/TOTALENERGIES|EDF|ENGIE/i, 'Logement'],
    [/COMMISSIONS|FRAIS BANCAIRES|HELLO PRIME/i, 'Banque']
  ];
  const trouvee = regles.find(r => r[0].test(libelle));
  return trouvee ? trouvee[1] : '';
}

function nettoyerLibelleHelloBank_(texte) {
  return String(texte || '').replace(/\s+/g,' ').trim().slice(0,300);
}
function normaliserMarchandHelloBank_(texte) {
  return normaliserTexteBanque_(texte)
    .replace(/\b(?:PRLV|SEPA|VIR|VIREMENT|FACTURE|CARTE|PAIEMENT|CB|ECH|ID|EMETTEUR|REF|MDT)\b/g,' ')
    .replace(/\b\d{2}[.\/]?\d{2}(?:[.\/]?\d{2,4})?\b/g,' ')
    .replace(/\s+/g,' ').trim().slice(0,120);
}
function extraireCarteFinHelloBank_(texte) {
  const m=String(texte||'').match(/(?:CARTE|CB)\s+\d*X+(\d{4})/i);return m?m[1]:'';
}
function normaliserTexteBanque_(texte) {
  return String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
}
function cleOperationImport_(operation) {
  const date = dateLocaleBudgetSoft_(operation.date_comptable || operation.date);
  const dateCle = isNaN(date) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const type = String(operation.type || (Number(operation.montant || 0) < 0 ? 'depense' : 'revenu')).toLowerCase();
  const libelle = operation.libelle_bancaire || operation.libelle;
  return [dateCle, normaliserTexteBanque_(libelle), Math.abs(Number(operation.montant || 0)).toFixed(2), type, String(operation.compte || '')].join('|');
}
