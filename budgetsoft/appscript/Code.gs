const BUDGETSOFT_VERSION = '0.2.0';

const TABLES = {
  Parametres: ['cle', 'valeur'],
  Comptes: ['id', 'nom', 'type', 'solde_initial', 'actif'],
  Operations: ['id', 'date', 'libelle', 'categorie', 'compte', 'montant', 'type', 'commentaire', 'cree_le', 'modifie_le'],
  Budget: ['id', 'mois', 'type', 'poste', 'prevu', 'reel'],
  Actifs: ['id', 'nom', 'type', 'valeur', 'date_valeur'],
  Dettes: ['id', 'nom', 'capital_restant', 'mensualite', 'taux', 'date_fin'],
  Credits: ['id', 'nom', 'capital_restant', 'mensualite', 'taux', 'date_debut', 'date_fin'],
  Objectifs: ['id', 'nom', 'montant_cible', 'montant_actuel', 'date_cible', 'statut'],
  Categories: ['id', 'nom', 'type', 'couleur', 'actif']
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('BudgetSoft')
    .addItem('Initialiser le classeur', 'initialiserBudgetSoft')
    .addItem('Vérifier la configuration', 'verifierConfiguration')
    .addToUi();
}

function doGet() {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BudgetSoft</title></head><body style="font-family:Arial,sans-serif;padding:40px"><h1>BudgetSoft</h1><p>Le serveur Google Apps Script est opérationnel.</p><p>Version ' + BUDGETSOFT_VERSION + '</p></body></html>'
  ).setTitle('BudgetSoft');
}

function initialiserBudgetSoft() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.entries(TABLES).forEach(([nom, entetes]) => {
    let feuille = ss.getSheetByName(nom);
    if (!feuille) feuille = ss.insertSheet(nom);
    if (feuille.getLastRow() === 0) {
      feuille.getRange(1, 1, 1, entetes.length).setValues([entetes]);
      feuille.setFrozenRows(1);
      feuille.getRange(1, 1, 1, entetes.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff');
      feuille.autoResizeColumns(1, entetes.length);
    }
  });
  ajouterDonneesInitiales_();
  PropertiesService.getDocumentProperties().setProperty('BUDGETSOFT_INITIALISE', 'true');
  SpreadsheetApp.getUi().alert('BudgetSoft est initialisé. Les onglets ont été créés.');
}

function verifierConfiguration() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const manquantes = Object.keys(TABLES).filter(nom => !ss.getSheetByName(nom));
  SpreadsheetApp.getUi().alert(manquantes.length ? 'Onglets manquants : ' + manquantes.join(', ') : 'Configuration valide. BudgetSoft est prêt.');
  return { ok: manquantes.length === 0, manquantes };
}

function chargerToutesLesDonnees() {
  verifierInitialisation_();
  const resultat = {};
  Object.keys(TABLES).forEach(nom => resultat[nom] = lireTable_(nom));
  resultat.meta = { version: BUDGETSOFT_VERSION, chargeLe: new Date().toISOString() };
  return resultat;
}

function lireTable(nom) {
  verifierNomTable_(nom);
  verifierInitialisation_();
  return lireTable_(nom);
}

function enregistrerLigne(nom, ligne) {
  verifierNomTable_(nom);
  verifierInitialisation_();
  if (!ligne || typeof ligne !== 'object') throw new Error('Donnée invalide.');

  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  const entetes = TABLES[nom];
  const maintenant = new Date().toISOString();
  const copie = Object.assign({}, ligne);
  if (entetes.includes('id') && !copie.id) copie.id = Utilities.getUuid();
  if (entetes.includes('cree_le') && !copie.cree_le) copie.cree_le = maintenant;
  if (entetes.includes('modifie_le')) copie.modifie_le = maintenant;

  const verrou = LockService.getDocumentLock();
  verrou.waitLock(10000);
  try {
    const idIndex = entetes.indexOf('id');
    let ligneCible = -1;
    if (idIndex >= 0 && copie.id && feuille.getLastRow() > 1) {
      const ids = feuille.getRange(2, idIndex + 1, feuille.getLastRow() - 1, 1).getValues().flat();
      const position = ids.findIndex(id => String(id) === String(copie.id));
      if (position >= 0) ligneCible = position + 2;
    }
    const valeurs = entetes.map(cle => normaliserValeur_(copie[cle]));
    if (ligneCible > 0) feuille.getRange(ligneCible, 1, 1, entetes.length).setValues([valeurs]);
    else feuille.appendRow(valeurs);
  } finally {
    verrou.releaseLock();
  }
  return copie;
}

function supprimerLigne(nom, id) {
  verifierNomTable_(nom);
  verifierInitialisation_();
  const entetes = TABLES[nom];
  const idIndex = entetes.indexOf('id');
  if (idIndex < 0) throw new Error('Cette table ne comporte pas d’identifiant.');
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  if (feuille.getLastRow() < 2) return false;
  const ids = feuille.getRange(2, idIndex + 1, feuille.getLastRow() - 1, 1).getValues().flat();
  const position = ids.findIndex(valeur => String(valeur) === String(id));
  if (position < 0) return false;
  feuille.deleteRow(position + 2);
  return true;
}

function lireTable_(nom) {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  if (!feuille || feuille.getLastRow() < 2) return [];
  const entetes = TABLES[nom];
  const valeurs = feuille.getRange(2, 1, feuille.getLastRow() - 1, entetes.length).getValues();
  return valeurs.filter(ligne => ligne.some(v => v !== '' && v !== null))
    .map(ligne => Object.fromEntries(entetes.map((cle, i) => [cle, serialiserValeur_(ligne[i])])));
}

function ajouterDonneesInitiales_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const categories = ss.getSheetByName('Categories');
  if (categories.getLastRow() === 1) {
    [['Logement','depense'],['Courses','depense'],['Transport','depense'],['Santé','depense'],['Loisirs','depense'],['Revenus','revenu'],['Épargne','epargne'],['Crédits','depense']]
      .forEach(([nom, type]) => categories.appendRow([Utilities.getUuid(), nom, type, '', true]));
  }
  const parametres = ss.getSheetByName('Parametres');
  if (parametres.getLastRow() === 1) {
    parametres.appendRow(['version', BUDGETSOFT_VERSION]);
    parametres.appendRow(['devise', 'EUR']);
    parametres.appendRow(['locale', 'fr-FR']);
  }
}

function verifierInitialisation_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const manquantes = Object.keys(TABLES).filter(nom => !ss.getSheetByName(nom));
  if (manquantes.length) throw new Error('BudgetSoft n’est pas initialisé. Lancez initialiserBudgetSoft().');
}

function verifierNomTable_(nom) {
  if (!Object.prototype.hasOwnProperty.call(TABLES, nom)) throw new Error('Table inconnue : ' + nom);
}

function normaliserValeur_(valeur) {
  if (valeur === undefined || valeur === null) return '';
  if (typeof valeur === 'object' && !(valeur instanceof Date)) return JSON.stringify(valeur);
  return valeur;
}

function serialiserValeur_(valeur) {
  return valeur instanceof Date ? valeur.toISOString() : valeur;
}
