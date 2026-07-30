const BANK_LEARNING_VERSION = '1.0';
const BANK_MAPPING_SHEET = 'Correspondances_bancaires';
const BANK_MAPPING_HEADERS = ['id','motif_bancaire','libelle_normalise','categorie','type','compte','actif','utilisations','derniere_utilisation','cree_le','modifie_le'];

function initialiserCorrespondancesBancaires() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let feuille = ss.getSheetByName(BANK_MAPPING_SHEET);
  if (!feuille) feuille = ss.insertSheet(BANK_MAPPING_SHEET);
  if (feuille.getLastRow() === 0) feuille.getRange(1, 1, 1, BANK_MAPPING_HEADERS.length).setValues([BANK_MAPPING_HEADERS]);
  const presentes = feuille.getRange(1, 1, 1, Math.max(1, feuille.getLastColumn())).getValues()[0].map(v => String(v || '').trim());
  const manquantes = BANK_MAPPING_HEADERS.filter(h => !presentes.includes(h));
  if (manquantes.length) feuille.getRange(1, presentes.length + 1, 1, manquantes.length).setValues([manquantes]);
  feuille.setFrozenRows(1);
  feuille.getRange(1, 1, 1, BANK_MAPPING_HEADERS.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff');
  feuille.autoResizeColumns(1, BANK_MAPPING_HEADERS.length);
  return { ok: true, feuille: BANK_MAPPING_SHEET };
}

function lireCorrespondancesBancaires() {
  initialiserCorrespondancesBancaires();
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BANK_MAPPING_SHEET);
  if (feuille.getLastRow() < 2) return [];
  const valeurs = feuille.getRange(2, 1, feuille.getLastRow() - 1, BANK_MAPPING_HEADERS.length).getValues();
  return valeurs.filter(l => l.some(v => v !== '' && v !== null)).map(l => Object.fromEntries(BANK_MAPPING_HEADERS.map((h, i) => [h, l[i] instanceof Date ? l[i].toISOString() : l[i]])));
}

function enregistrerCorrespondanceBancaire(correspondance) {
  initialiserCorrespondancesBancaires();
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BANK_MAPPING_SHEET);
  const maintenant = new Date().toISOString();
  const copie = Object.assign({}, correspondance || {});
  copie.motif_bancaire = normaliserTexteBanque_(copie.motif_bancaire || copie.libelle_normalise);
  copie.libelle_normalise = String(copie.libelle_normalise || '').trim();
  copie.categorie = String(copie.categorie || '').trim();
  copie.type = String(copie.type || '').trim().toLowerCase();
  copie.compte = String(copie.compte || '').trim();
  copie.actif = copie.actif !== false && String(copie.actif).toLowerCase() !== 'false' && String(copie.actif) !== '0';
  copie.utilisations = Math.max(0, Number(copie.utilisations || 0));
  copie.derniere_utilisation = copie.derniere_utilisation || maintenant;
  copie.cree_le = copie.cree_le || maintenant;
  copie.modifie_le = maintenant;
  if (!copie.motif_bancaire || !copie.libelle_normalise) throw new Error('Le motif bancaire et le libellé normalisé sont obligatoires.');
  if (!copie.id) copie.id = Utilities.getUuid();

  const lignes = feuille.getLastRow() > 1 ? feuille.getRange(2, 1, feuille.getLastRow() - 1, BANK_MAPPING_HEADERS.length).getValues() : [];
  const indexId = BANK_MAPPING_HEADERS.indexOf('id');
  const position = lignes.findIndex(l => String(l[indexId]) === String(copie.id));
  const valeurs = BANK_MAPPING_HEADERS.map(h => copie[h] == null ? '' : copie[h]);
  if (position >= 0) feuille.getRange(position + 2, 1, 1, valeurs.length).setValues([valeurs]);
  else feuille.appendRow(valeurs);
  return copie;
}

function trouverCorrespondanceBancaire_(libelle, compte, correspondances) {
  const texte = normaliserTexteBanque_(libelle);
  const candidates = (correspondances || []).filter(c => c.actif !== false && String(c.actif).toLowerCase() !== 'false' && (!c.compte || String(c.compte) === String(compte)) && texte.includes(normaliserTexteBanque_(c.motif_bancaire)));
  candidates.sort((a, b) => normaliserTexteBanque_(b.motif_bancaire).length - normaliserTexteBanque_(a.motif_bancaire).length);
  return candidates[0] || null;
}

function apprendreCorrespondanceBancaire_(operation, resultat, correspondances) {
  if (!resultat || !resultat.libelle_normalise) return null;
  const motif = extraireMotifStableBanque_(operation.libelle || resultat.libelle_normalise);
  if (!motif) return null;
  const existante = (correspondances || []).find(c => normaliserTexteBanque_(c.motif_bancaire) === motif && (!c.compte || String(c.compte) === String(operation.compte || '')));
  if (existante) {
    existante.utilisations = Number(existante.utilisations || 0) + 1;
    existante.derniere_utilisation = new Date().toISOString();
    existante.libelle_normalise = resultat.libelle_normalise;
    if (resultat.categorie) existante.categorie = resultat.categorie;
    if (resultat.type) existante.type = resultat.type;
    return enregistrerCorrespondanceBancaire(existante);
  }
  return enregistrerCorrespondanceBancaire({
    motif_bancaire: motif,
    libelle_normalise: resultat.libelle_normalise,
    categorie: resultat.categorie || '',
    type: resultat.type || '',
    compte: operation.compte || '',
    actif: true,
    utilisations: 1
  });
}

function extraireMotifStableBanque_(libelle) {
  let texte = normaliserTexteBanque_(libelle)
    .replace(/\b(PRLV|SEPA|RECU|VIR|VIREMENT|FACTURE|CARTE|PAIEMENT|CB|RETRAIT|DAB|COMMISSIONS?)\b/g, ' ')
    .replace(/\b\d{2,}\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const mots = texte.split(' ').filter(m => m.length > 2 && !/^(FR|EUR|EURO|CLIENT|REF|REFERENCE)$/.test(m));
  return mots.slice(0, 4).join(' ');
}

function proposerLibelleNormalise_(libelle) {
  const motif = extraireMotifStableBanque_(libelle);
  if (!motif) return nettoyerLibelleHelloBank_(libelle);
  return motif.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).slice(0, 80);
}
