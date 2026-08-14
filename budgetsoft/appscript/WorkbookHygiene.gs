const BUDGETSOFT_SECURITY_BACKUP_SHEET = 'Operations_sauvegarde_securite';

/**
 * Conserve une seule sauvegarde de securite avant ecriture bancaire.
 * La feuille est volontairement masquee pour ne pas encombrer le classeur.
 */
function creerSauvegardeOperationsSecurite_(contexte) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const operations = ss.getSheetByName('Operations');
  if (!operations) throw new Error('Feuille Operations introuvable.');

  const ancienne = ss.getSheetByName(BUDGETSOFT_SECURITY_BACKUP_SHEET);
  if (ancienne) ss.deleteSheet(ancienne);

  const sauvegarde = operations.copyTo(ss).setName(BUDGETSOFT_SECURITY_BACKUP_SHEET);
  sauvegarde.getRange('A1').setNote(
    'Sauvegarde de securite BudgetSoft - ' + String(contexte || 'operation bancaire') +
    ' - ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
  );
  sauvegarde.hideSheet();
  return sauvegarde;
}

/**
 * Cree les structures techniques stables et masque ce qui n'a pas vocation
 * a etre manipule directement dans le classeur.
 */
function assurerHygieneClasseurBudgetSoft_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (typeof initialiserRapprochementsChargesFixes_ === 'function') {
    const rapprochements = initialiserRapprochementsChargesFixes_();
    if (rapprochements && !rapprochements.isSheetHidden()) rapprochements.hideSheet();
  }

  [
    'Journal_imports_bancaires',
    'Journal',
    'Corrections_a_valider',
    'Rapprochements_a_valider',
    'Reimport_nettoyage'
  ].forEach(nom => {
    const feuille = ss.getSheetByName(nom);
    if (feuille && !feuille.isSheetHidden()) feuille.hideSheet();
  });

  const sauvegarde = ss.getSheetByName(BUDGETSOFT_SECURITY_BACKUP_SHEET);
  if (sauvegarde && !sauvegarde.isSheetHidden()) sauvegarde.hideSheet();
}

/**
 * Nettoyage explicite et prudent des feuilles temporaires historiques.
 * Ne touche jamais aux tables metier ni a la sauvegarde de securite roulante.
 */
function nettoyerOngletsTechniquesBudgetSoft() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const supprimees = [];
  const conservees = [];

  const motifsTemporaires = [
    /^Operations_backup_\d{8}_\d{6}$/,
    /^Operations_avant_restauration_\d{8}_\d{6}$/,
    /^Operations_avant_PDF_\d{8}_\d{6}$/,
    /^Operations_avant_flux_\d{8}_\d{6}$/
  ];

  ss.getSheets().slice().forEach(feuille => {
    const nom = feuille.getName();
    if (motifsTemporaires.some(re => re.test(nom))) {
      ss.deleteSheet(feuille);
      supprimees.push(nom);
    }
  });

  ['Feuille 1', 'TEST_BUDGETSOFT'].forEach(nom => {
    const feuille = ss.getSheetByName(nom);
    if (!feuille) return;
    const contientDonnees = feuille.getLastRow() > 1 || feuille.getLastColumn() > 1 || String(feuille.getRange('A1').getValue() || '').trim() !== '';
    if (contientDonnees) {
      conservees.push(nom + ' (contient des donnees)');
      return;
    }
    ss.deleteSheet(feuille);
    supprimees.push(nom);
  });

  assurerHygieneClasseurBudgetSoft_();
  return { ok: true, supprimees, conservees };
}

function initialiserHygieneClasseurBudgetSoft() {
  assurerHygieneClasseurBudgetSoft_();
  return nettoyerOngletsTechniquesBudgetSoft();
}
