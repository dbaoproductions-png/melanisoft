const RAPPROCHEMENTS_SHEET = 'Rapprochements_a_valider';
const RAPPROCHEMENTS_HEADERS = [
  'id','statut','score','operation_manuelle_id','operation_importee_id',
  'date_manuelle','date_bancaire','libelle_manuel','libelle_bancaire',
  'montant','type','compte','decision','cree_le','modifie_le'
];

function importerOperationsHelloBank(operations, compte) {
  verifierInitialisation_();
  initialiserCorrespondancesBancaires();
  initialiserRapprochementsAValider_();
  if (!Array.isArray(operations) || !operations.length) throw new Error('Aucune opération PDF à importer.');
  if (!compte) throw new Error('Choisissez le compte bancaire concerné.');

  const existantes = lireTable_('Operations');
  const cles = new Set(existantes.map(cleOperationImport_));
  const charges = lireTable_('Charges_fixes').filter(c => convertirBooleen_(c.actif));
  const correspondances = lireCorrespondancesBancaires();
  const aAjouter = [];
  const rapprochementsAValider = [];
  const correspondancesAIncrementer = new Map();
  const resultats = { importees:0, doublons:0, rapprochees:0, rapprocheesManuelles:0, aValider:0, reconnues:0, apprises:0, erreurs:[] };

  operations.forEach((operation, index) => {
    try {
      const date = new Date(operation.date);
      const montant = convertirNombre_(operation.montant);
      const libelleBrut = nettoyerLibelleHelloBank_(operation.libelle);
      if (isNaN(date.getTime()) || !libelleBrut || !montant) throw new Error('ligne incomplète');

      const type = montant < 0 ? 'depense' : 'revenu';
      const cle = cleOperationImport_({ date, libelle: libelleBrut, montant, type, compte });
      if (cles.has(cle)) { resultats.doublons++; return; }

      const correspondance = trouverCorrespondanceBancaire_(libelleBrut, compte, correspondances);
      const rapprochement = rapprocherChargeFixe_(libelleBrut, Math.abs(montant), compte, charges);
      const libelleNormalise = correspondance?.libelle_normalise || rapprochement?.libelle || proposerLibelleNormalise_(libelleBrut);
      const categorie = correspondance?.categorie || rapprochement?.categorie || suggererCategorieHelloBank_(libelleBrut, type);
      // Le sens débit/crédit vient toujours du relevé PDF. Une correspondance apprise
      // peut proposer un libellé ou une catégorie, mais jamais changer une dépense en revenu.
      const typeFinal = type;
      const marqueur = '[PDF:HELLOBANK:' + Utilities.base64EncodeWebSafe(cle).slice(0, 28) + ']';
      const commentaireBanque = [
        'Libellé bancaire : ' + libelleBrut,
        operation.details && operation.details !== libelleBrut ? operation.details : '',
        marqueur,
        correspondance ? '[CORRESPONDANCE:' + correspondance.id + ']' : '',
        rapprochement ? '[RAPPROCHEMENT:' + rapprochement.id + ':' + rapprochement.score + ']' : ''
      ].filter(Boolean).join(' ');

      const candidateManuelle = trouverSaisieManuelleCorrespondante_(
        { date, libelle: libelleBrut, montant: Math.abs(montant), type: typeFinal, compte },
        existantes
      );

      if (candidateManuelle && candidateManuelle.automatique) {
        const commentaireFusionne = [candidateManuelle.operation.commentaire || '', commentaireBanque, '[RAPPROCHEMENT_MANUEL:' + candidateManuelle.score + ']'].filter(Boolean).join(' ');
        enregistrerLigne('Operations', {
          id: candidateManuelle.operation.id,
          date,
          libelle: candidateManuelle.operation.libelle || libelleNormalise,
          categorie: candidateManuelle.operation.categorie || categorie,
          compte,
          montant: Math.abs(montant),
          type: typeFinal,
          commentaire: commentaireFusionne,
          cree_le: candidateManuelle.operation.cree_le || ''
        });
        candidateManuelle.operation.date = date;
        candidateManuelle.operation.montant = typeFinal === 'depense' ? -Math.abs(montant) : Math.abs(montant);
        candidateManuelle.operation.type = typeFinal;
        candidateManuelle.operation.commentaire = commentaireFusionne;
        resultats.rapprocheesManuelles++;
      } else {
        const maintenant = new Date().toISOString();
        const operationImportee = {
          id: Utilities.getUuid(), date, libelle: libelleNormalise, categorie, compte,
          montant: typeFinal === 'depense' ? -Math.abs(montant) : Math.abs(montant), type: typeFinal, commentaire: commentaireBanque,
          cree_le: maintenant, modifie_le: maintenant
        };
        aAjouter.push(operationImportee);
        existantes.push(operationImportee);
        resultats.importees++;

        if (candidateManuelle) {
          rapprochementsAValider.push({
            id: Utilities.getUuid(), statut:'À valider', score:candidateManuelle.score,
            operation_manuelle_id:candidateManuelle.operation.id,
            operation_importee_id:operationImportee.id,
            date_manuelle:candidateManuelle.operation.date,
            date_bancaire:date,
            libelle_manuel:candidateManuelle.operation.libelle,
            libelle_bancaire:libelleBrut,
            montant:Math.abs(montant), type:typeFinal, compte,
            decision:'', cree_le:maintenant, modifie_le:maintenant
          });
          resultats.aValider++;
        }
      }

      cles.add(cle);
      if (correspondance) {
        resultats.reconnues++;
        const copie = Object.assign({}, correspondance);
        copie.utilisations = Number(copie.utilisations || 0) + 1;
        copie.derniere_utilisation = new Date().toISOString();
        // Nettoie progressivement les anciennes correspondances contaminées.
        copie.type = typeFinal;
        correspondancesAIncrementer.set(String(copie.id), copie);
      }
      if (rapprochement) resultats.rapprochees++;
    } catch (e) {
      resultats.erreurs.push('Ligne ' + (index + 1) + ' : ' + e.message);
    }
  });

  ajouterOperationsEnLot_(aAjouter);
  ajouterRapprochementsEnLot_(rapprochementsAValider);
  correspondancesAIncrementer.forEach(c => enregistrerCorrespondanceBancaire(c));
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
  const datePdf = debutJour_(new Date(operationPdf.date));
  const montantPdf = Math.abs(Number(operationPdf.montant || 0));
  const motsPdf = motsSignificatifsBanque_(operationPdf.libelle);
  const candidates = (operationsExistantes || []).map(operation => {
    if (String(operation.compte || '') !== String(operationPdf.compte || '')) return null;
    if (String(operation.type || '').toLowerCase() !== String(operationPdf.type || '').toLowerCase()) return null;
    if (Math.abs(Math.abs(Number(operation.montant || 0)) - montantPdf) > 0.01) return null;
    if (/\[PDF:HELLOBANK:/.test(String(operation.commentaire || ''))) return null;
    const dateExistante = debutJour_(new Date(operation.date));
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
  const motsVides = new Set(['PRLV','SEPA','RECU','VIR','VIREMENT','FACTURE','CARTE','PAIEMENT','CB','RETRAIT','DAB','COMMISSIONS','FR','EUR','EURO','CLIENT','REF','REFERENCE']);
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

function rapprocherChargeFixe_(libelle, montant, compte, charges) {
  const normalise = normaliserTexteBanque_(libelle);
  let meilleur = null;
  charges.forEach(charge => {
    if (String(charge.compte) !== String(compte)) return;
    const attendu = normaliserTexteBanque_(charge.libelle_bancaire || charge.libelle);
    const mots = attendu.split(' ').filter(m => m.length > 2);
    const motsTrouves = mots.filter(m => normalise.includes(m)).length;
    const scoreLibelle = mots.length ? Math.round(70 * motsTrouves / mots.length) : 0;
    const tolerance = Math.max(0.01, Number(charge.tolerance) || 0.50);
    const ecart = Math.abs(Number(charge.montant) - montant);
    const scoreMontant = ecart <= tolerance ? 30 : Math.max(0, Math.round(30 - (ecart / Math.max(montant,1)) * 100));
    const score = scoreLibelle + scoreMontant;
    if (score >= 70 && (!meilleur || score > meilleur.score)) meilleur = {id:charge.id,libelle:charge.libelle||'',categorie:charge.categorie||'',score};
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
  return String(texte || '').replace(/\s+/g,' ').replace(/^FACTURE\(S\) CARTE\s+\S+\s*/i,'').trim().slice(0,160);
}

function normaliserTexteBanque_(texte) {
  return String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
}

function cleOperationImport_(operation) {
  const date = new Date(operation.date);
  const dateCle = isNaN(date) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const type = String(operation.type || (Number(operation.montant || 0) < 0 ? 'depense' : 'revenu')).toLowerCase();
  return [dateCle, normaliserTexteBanque_(operation.libelle), Math.abs(Number(operation.montant || 0)).toFixed(2), type, String(operation.compte || '')].join('|');
}
