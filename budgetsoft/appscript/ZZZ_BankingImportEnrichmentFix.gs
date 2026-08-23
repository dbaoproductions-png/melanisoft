// Correctif d'enrichissement du pipeline bancaire certifie.
// Ce fichier surcharge volontairement normaliserEntreeBancaire_ afin que
// l'import transactionnel conserve les enrichissements BudgetSoft.

var BUDGETSOFT_IMPORT_CORRESPONDANCES_CACHE_ = null;
var BUDGETSOFT_IMPORT_REGLES_CATEGORIES_CACHE_ = null;

function estOperationCarteBudgetSoft_(texte) {
  const s = String(texte || '');
  if (/\bPRLV\s+SEPA\b/i.test(s) || /^\s*VIR\b/i.test(s) || /^\s*CHEQUE\b/i.test(s)) return false;
  return /FACTURE\(S\)\s+CARTE/i.test(s)
    || /REMBOURST\s+CB/i.test(s)
    || /\bCARTE\s+\d*[Xx]+\d{4}\b/i.test(s)
    || /^\s*DU\s+\d{6}\b/i.test(s)
    || /\bCB\s+DU\s+\d{6}\b/i.test(s);
}

function recupererLibelleDepuisLigneBrutePdf_(brut) {
  const texte = String(brut || '').trim();
  if (!texte) return '';

  const bruit = /^(?:RELEVE DE COMPTE|Date Nature|Hello bank|RIB\s*:|P\.\s*\d+\/|TOTAL DES OPERATIONS|SOLDE CREDITEUR|SOLDE DEBITEUR|\d{10,})/i;
  const morceaux = texte
    .split(/\s*\|\|\s*|\s*\|\s*/)
    .map(v => String(v || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter(v => !bruit.test(v))
    .filter(v => !/^\d{2}[.\/]\d{2}(?:[.\/]\d{2,4})?$/.test(v))
    .filter(v => !/^[-+]?\d{1,3}(?:[ .]\d{3})*(?:,\d{2})$/.test(v))
    .filter(v => !/^[-+]?\d+[.,]\d{2}\s*EUR$/i.test(v));

  // La premiere cellule peut contenir date + nature + date de valeur + montant
  // en un seul bloc. On retire seulement les marqueurs bancaires structurants.
  let candidat = morceaux.join(' ')
    .replace(/^\s*\d{2}[.\/]\d{2}\s+/, '')
    .replace(/\s+\d{2}[.\/]\d{2}\s+[-+]?\d{1,3}(?:[ .]\d{3})*(?:,\d{2})\s*$/, '')
    .replace(/\s+[-+]?\d{1,3}(?:[ .]\d{3})*(?:,\d{2})\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!candidat || bruit.test(candidat)) return '';
  return candidat;
}

function marchandCarteBudgetSoft_(texte) {
  let s = String(texte || '').replace(/\s+/g, ' ').trim();
  s = s
    .replace(/^\s*REMBOURST\s+CB\s+DU\s+\d{6}\s+/i, '')
    .replace(/^\s*(?:PAIEMENT\s+)?CB\s+DU\s+\d{6}\s+/i, '')
    .replace(/^\s*FACTURE\(S\)\s+CARTE\s+\S+\s+DU\s+\d{6}\s+/i, '')
    .replace(/^\s*DU\s+\d{6}\s+/i, '')
    .replace(/\s+CARTE\s+\d*[Xx]+\d{4}.*$/i, '')
    .replace(/\s+(?:FRA|IRL|NLD|ESP|DEU|LUX|BEL|ITA|GBR|PRT)\s+\d+[,.]\d{2}\s*EUR.*$/i, '')
    .trim();
  return normaliserTexteBanqueFiable_(s).slice(0, 90);
}

function correspondancesImportBudgetSoft_() {
  if (BUDGETSOFT_IMPORT_CORRESPONDANCES_CACHE_ !== null) return BUDGETSOFT_IMPORT_CORRESPONDANCES_CACHE_;
  try {
    BUDGETSOFT_IMPORT_CORRESPONDANCES_CACHE_ = typeof lireCorrespondancesBancaires === 'function'
      ? lireCorrespondancesBancaires()
      : [];
  } catch (e) {
    BUDGETSOFT_IMPORT_CORRESPONDANCES_CACHE_ = [];
  }
  return BUDGETSOFT_IMPORT_CORRESPONDANCES_CACHE_;
}

function reglesCategoriesImportBudgetSoft_() {
  if (BUDGETSOFT_IMPORT_REGLES_CATEGORIES_CACHE_ !== null) return BUDGETSOFT_IMPORT_REGLES_CATEGORIES_CACHE_;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const f = ss.getSheetByName('Regles_categories');
  if (!f || f.getLastRow() < 2) {
    BUDGETSOFT_IMPORT_REGLES_CATEGORIES_CACHE_ = [];
    return BUDGETSOFT_IMPORT_REGLES_CATEGORIES_CACHE_;
  }
  const data = f.getDataRange().getValues();
  const h = data[0].map(v => String(v || '').trim());
  const idx = {};
  h.forEach((v, i) => idx[v] = i);
  BUDGETSOFT_IMPORT_REGLES_CATEGORIES_CACHE_ = data.slice(1).map(r => ({
    motif: String(r[idx.motif] || '').trim(),
    categorie: String(r[idx.categorie] || '').trim(),
    type: String(r[idx.type] || '').trim().toLowerCase(),
    actif: idx.actif == null ? true : !(r[idx.actif] === false || String(r[idx.actif]).toLowerCase() === 'false' || String(r[idx.actif]) === '0')
  })).filter(r => r.actif && r.motif && r.categorie);
  return BUDGETSOFT_IMPORT_REGLES_CATEGORIES_CACHE_;
}

function categorieImportBudgetSoft_(libelle, compte, type, categorieExistante) {
  const deja = String(categorieExistante || '').trim();
  if (deja) return deja;
  const texte = normaliserTexteBanqueFiable_(libelle);

  const regles = reglesCategoriesImportBudgetSoft_()
    .filter(r => (!r.type || r.type === type) && texte.includes(normaliserTexteBanqueFiable_(r.motif)))
    .sort((a, b) => normaliserTexteBanqueFiable_(b.motif).length - normaliserTexteBanqueFiable_(a.motif).length);
  if (regles.length) return regles[0].categorie;

  try {
    const correspondance = trouverCorrespondanceBancaire_(libelle, compte, correspondancesImportBudgetSoft_());
    if (correspondance && String(correspondance.categorie || '').trim()) return String(correspondance.categorie).trim();
  } catch (e) {}

  try {
    if (typeof suggererCategorieHelloBank_ === 'function') return String(suggererCategorieHelloBank_(libelle, type) || '').trim();
  } catch (e) {}
  return '';
}

function libelleImportBudgetSoft_(libelleBancaire, compte, marchand, libelleFourni) {
  const fourni = String(libelleFourni || '').trim();
  try {
    const correspondance = trouverCorrespondanceBancaire_(libelleBancaire, compte, correspondancesImportBudgetSoft_());
    if (correspondance && String(correspondance.libelle_normalise || '').trim()) return String(correspondance.libelle_normalise).trim();
  } catch (e) {}
  if (fourni && normaliserTexteBanqueFiable_(fourni) !== normaliserTexteBanqueFiable_(libelleBancaire)) return fourni;
  if (marchand) {
    try { if (typeof titreLibelle === 'function') return titreLibelle(marchand); } catch (e) {}
    return marchand;
  }
  try { if (typeof proposerLibelleNormalise_ === 'function') return proposerLibelleNormalise_(libelleBancaire); } catch (e) {}
  return fourni || libelleBancaire;
}

function normaliserEntreeBancaire_(x, source) {
  x = x || {};
  source = source === 'pdf' ? 'pdf' : 'flux';

  let libelleBancaire = String(x.libelle_bancaire || x.details || x.libelle || '').trim();
  if (source === 'pdf' && !libelleBancaire) {
    libelleBancaire = recupererLibelleDepuisLigneBrutePdf_(x._ligneBrute);
  }
  if (source === 'pdf' && !libelleBancaire) {
    const dateDiag = String(x.date_comptable || x.date || '?');
    const montantDiag = String(x.montant == null ? '?' : x.montant);
    const brutDiag = String(x._ligneBrute || '').replace(/\s+/g, ' ').trim().slice(0, 220);
    throw new Error('Import PDF refusé : opération bancaire sans libellé. Date=' + dateDiag + ' ; montant=' + montantDiag + ' ; brut=' + (brutDiag || '[vide]'));
  }

  const compte = String(x.compte || '').trim();
  const montant = Number(x.montant);
  const type = String(x.type || (montant < 0 ? 'depense' : 'revenu')).toLowerCase();
  const estCarte = estOperationCarteBudgetSoft_(libelleBancaire);

  const dateComptable = dateBanque_(x.date_comptable || x.date);
  let dateAchat = dateBanque_(x.date_achat) || '';
  if (!dateAchat && estCarte) dateAchat = extraireDateAchatBanque_(libelleBancaire) || '';
  if (!dateAchat && estCarte) dateAchat = dateComptable;

  let marchand = '';
  if (estCarte) {
    marchand = String(x.marchand_normalise || '').trim();
    if (!marchand || /^(prlv|vir|virement|cheque|commission)/i.test(marchand)) marchand = marchandCarteBudgetSoft_(libelleBancaire);
  }

  let carteFin = '';
  if (estCarte) carteFin = String(x.carte_fin || extraireCarteFinBanque_(libelleBancaire) || '').trim();

  const categorie = categorieImportBudgetSoft_(libelleBancaire, compte, type, x.categorie);
  const libelle = libelleImportBudgetSoft_(libelleBancaire, compte, marchand, x.libelle);

  const o = {
    source_bancaire: source,
    statut_bancaire: source === 'pdf' ? 'definitif' : 'provisoire',
    date_comptable: dateComptable,
    date_achat: dateAchat,
    date: dateAchat || dateComptable,
    libelle_bancaire: libelleBancaire,
    libelle: libelle,
    categorie: categorie,
    compte: compte,
    montant: montant,
    type: type,
    marchand_normalise: marchand,
    carte_fin: carteFin,
    commentaire: String(x.commentaire || '').trim(),
    charge_fixe_id: String(x.charge_fixe_id || '').trim()
  };

  return o;
}
