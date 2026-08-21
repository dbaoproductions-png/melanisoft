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
 *   rapprochées des mouvements réellement observés ;
 * - la catégorisation réutilise le référentiel, les correspondances, les règles
 *   et l'historique validé de BudgetSoft. Le fallback ne crée jamais de vieille
 *   catégorie et préfère laisser vide plutôt que de forcer une catégorie douteuse.
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
  const reglesCategories = typeof lireReglesCategories === 'function' ? lireReglesCategories() : [];
  const indexCategories = typeof indexCategoriesIntelligentes_ === 'function' ? indexCategoriesIntelligentes_() : new Map();
  const historiqueCategories = typeof construireHistoriqueCategories_ === 'function'
    ? construireHistoriqueCategories_(existantes, indexCategories)
    : new Map();
  const aAjouter = [];
  const rapprochementsAValider = [];
  const correspondancesAIncrementer = new Map();
  const chargesAActualiser = new Map();
  const resultats = {
    importees:0, doublons:0, rapprochees:0, rapprocheesManuelles:0, aValider:0,
    reconnues:0, reconnuesRegles:0, reconnuesHistorique:0, fallback:0, sansCategorie:0, erreurs:[]
  };

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

      const operationPourCategorie = {
        date:dateComptable,
        libelle:libelleBancaire,
        libelle_bancaire:libelleBancaire,
        marchand_normalise:normaliserMarchandHelloBank_(libelleBancaire),
        montant:type === 'depense' ? -Math.abs(montantSigne) : Math.abs(montantSigne),
        type,
        compte
      };
      const proposition = typeof propositionCategorieOperation_ === 'function'
        ? propositionCategorieOperation_(operationPourCategorie, [], reglesCategories, indexCategories, historiqueCategories)
        : null;
      const categorieIntelligente = proposition && proposition.statut === 'propose' ? proposition.best.categorie : '';
      const categorieFallback = suggererCategorieHelloBank_(libelleBancaire, type, montantSigne);
      const categorie = premiereCategorieImportHelloBankValide_([
        correspondance && correspondance.categorie,
        rapprochementCharge && rapprochementCharge.charge && rapprochementCharge.charge.categorie,
        categorieIntelligente,
        categorieFallback
      ], operationPourCategorie, indexCategories);

      if (categorieIntelligente && categorie === categorieIntelligente) {
        if (proposition.best.source === 'historique') resultats.reconnuesHistorique++;
        else resultats.reconnuesRegles++;
      } else if (categorieFallback && categorie === categorieCibleImportHelloBank_(categorieFallback)) {
        resultats.fallback++;
      }
      if (!categorie) resultats.sansCategorie++;

      const libelleNormalise = correspondance?.libelle_normalise || rapprochementCharge?.charge?.libelle || proposerLibelleNormalise_(libelleBancaire);
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

function categorieCibleImportHelloBank_(categorie) {
  const brut = String(categorie || '').trim();
  return typeof categorieCibleBudgetSoft_ === 'function' ? categorieCibleBudgetSoft_(brut) : brut;
}

function categorieImportHelloBankValide_(categorie, operation, indexCategories) {
  const cible = categorieCibleImportHelloBank_(categorie);
  if (!cible) return '';
  if (!indexCategories || typeof indexCategories.has !== 'function' || !indexCategories.size) return cible;
  if (!indexCategories.has(normaliserTexteBanque_(cible))) return '';
  if (typeof categorieCompatibleOperation_ === 'function' && !categorieCompatibleOperation_(operation, cible, indexCategories)) return '';
  return cible;
}

function premiereCategorieImportHelloBankValide_(candidates, operation, indexCategories) {
  for (const candidate of candidates || []) {
    const valide = categorieImportHelloBankValide_(candidate, operation, indexCategories);
    if (valide) return valide;
  }
  return '';
}

/**
 * Fallback volontairement prudent. Les décisions apprises (correspondances,
 * règles et historique) passent avant. Ici, seules les correspondances sûres
 * et les catégories du référentiel final sont utilisées.
 */
function suggererCategorieHelloBank_(libelle, type, montant) {
  const texte = normaliserTexteBanque_(libelle);
  const m = Math.abs(Number(montant || 0));

  if (type === 'revenu') {
    if (/\bFRANCE TRAVAIL\b/.test(texte)) return 'France Travail';
    if (/\bSALAIRE\b|\bPAYE\b/.test(texte)) return 'Salaires';
    if (/\bCOSAT\b/.test(texte)) return 'Avantages employeur';
    if (/\bDAANSUREN\b/.test(texte)) return 'Concerts';
    if (/\bCPAM\b|\bASSURANCE MALADIE\b|\bMUTUELLE NATIONALE TERRITORIALE\b/.test(texte)) return 'Remboursements santé';
    if (/\bTOTALENERGIES\b/.test(texte) && /\bVIR\b|\bVIREMENT\b|\bRECU\b|\bREMBOURSEMENT\b/.test(texte)) return 'Remboursements';
    if (/\bLOYER\b/.test(texte)) return 'Revenus fonciers';
    if (/\bREMBOURSEMENT\b|\bAVOIR\b/.test(texte)) return 'Remboursements';
    return '';
  }

  if (/CARREFOUR|LECLERC|INTERMARCHE|ALDI|MONOPRIX|BOUCHERIE|BOULAN/.test(texte)) return 'Courses';
  if (/PHARMAC|QARE|SANTE|AUDIENS/.test(texte)) return 'Santé';
  if (/TISSEO/.test(texte)) return 'Transports';
  if (/LEROY|BRICASTE|ADEO/.test(texte)) return 'Maison / entretien';
  if (/FREE|SFR|BOUYGUES|NRJ MOBILE|MOBILE|TELECOM/.test(texte)) return 'Télécom / Internet / TV';
  if (/D G F I P|IMPOT/.test(texte)) return 'Impôts';
  if (/KOZOO|VET /.test(texte)) return 'Animaux';
  if (/DEEZER|GOOGLE ONE|OPENAI|IONOS|OPODO PRIME|FAMILO|MAX/.test(texte)) return 'Abonnements numériques';
  if (/SURAVENIR|ASSURANCE|MAIF|MACIF|AXA|ALLIANZ/.test(texte)) return 'Assurances';
  if (/COMMISSIONS|FRAIS BANCAIRES|HELLO PRIME/.test(texte)) return 'Frais bancaires';
  if (/TOTALENERGIES/.test(texte)) {
    if ([61,63,70].some(v => Math.abs(m-v) <= 0.05)) return 'Électricité';
    if ([220,248,286].some(v => Math.abs(m-v) <= 0.05)) return 'Gaz';
    return '';
  }
  if (/\bEDF\b/.test(texte)) return 'Électricité';
  return '';
}

function auditerAlignementImportPDFHelloBank() {
  verifierInitialisation_();
  const index = indexCategoriesIntelligentes_();
  const anciennes = ['Revenus','Transport','Logement','Télécommunications','Abonnements','Banque'];
  const anciennesEncoreActives = anciennes.filter(n => index.has(normaliserTexteBanque_(n)));
  const attendues = ['Courses','Santé','Transports','Maison / entretien','Télécom / Internet / TV','Impôts','Animaux','Abonnements numériques','Assurances','Frais bancaires','Électricité','Gaz','Salaires','France Travail','Concerts','Avantages employeur','Revenus fonciers','Remboursements','Remboursements santé'];
  const manquantes = attendues.filter(n => !index.has(normaliserTexteBanque_(n)));
  const fonctions = {
    intelligence:typeof propositionCategorieOperation_ === 'function',
    regles:typeof lireReglesCategories === 'function',
    correspondances:typeof lireCorrespondancesBancaires === 'function',
    historique:typeof construireHistoriqueCategories_ === 'function'
  };
  const ok = anciennesEncoreActives.length === 0 && manquantes.length === 0 && Object.values(fonctions).every(Boolean);
  const r = {version:'2026-08-21',ok,fonctions,anciennesEncoreActives,manquantes,categoriesActives:index.size};
  console.log(JSON.stringify(r));
  return r;
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
