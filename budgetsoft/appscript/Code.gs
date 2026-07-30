const BUDGETSOFT_VERSION = '0.6';

const TABLES = {
  Parametres: ['cle', 'valeur'],
  Comptes: ['id', 'nom', 'type', 'solde_initial', 'actif'],
  Operations: ['id', 'date', 'libelle', 'categorie', 'compte', 'montant', 'type', 'commentaire', 'cree_le', 'modifie_le'],
  Charges_fixes: ['id', 'libelle', 'categorie', 'compte', 'montant', 'type', 'jour_execution', 'date_debut', 'date_fin', 'actif', 'commentaire', 'frequence', 'libelle_bancaire', 'tolerance'],
  Budget: ['id', 'mois', 'type', 'poste', 'prevu', 'reel'],
  Actifs: ['id', 'nom', 'type', 'valeur', 'date_valeur'],
  Dettes: ['id', 'nom', 'capital_restant', 'mensualite', 'taux', 'date_fin'],
  Credits: ['id', 'nom', 'capital_restant', 'mensualite', 'taux', 'date_debut', 'date_fin'],
  Objectifs: ['id', 'nom', 'montant_cible', 'montant_actuel', 'date_cible', 'statut'],
  Categories: ['id', 'nom', 'type', 'couleur', 'actif']
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('BudgetSoft')
    .addItem('Initialiser / mettre à jour', 'initialiserBudgetSoft')
    .addItem('Générer les charges fixes', 'genererChargesFixes')
    .addItem('Vérifier la configuration', 'verifierConfiguration')
    .addToUi();
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('BudgetSoft')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function inclure(nomFichier) { return HtmlService.createHtmlOutputFromFile(nomFichier).getContent(); }

function initialiserBudgetSoft() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.entries(TABLES).forEach(([nom, entetes]) => {
    let feuille = ss.getSheetByName(nom);
    if (!feuille) feuille = ss.insertSheet(nom);

    if (feuille.getLastRow() === 0) {
      feuille.getRange(1, 1, 1, entetes.length).setValues([entetes]);
    } else {
      const largeurActuelle = Math.max(feuille.getLastColumn(), 1);
      const entetesActuelles = feuille.getRange(1, 1, 1, largeurActuelle).getValues()[0]
        .map(v => String(v || '').trim())
        .filter(Boolean);
      const manquantes = entetes.filter(e => !entetesActuelles.includes(e));
      if (manquantes.length) {
        feuille.getRange(1, entetesActuelles.length + 1, 1, manquantes.length).setValues([manquantes]);
      }
    }

    feuille.setFrozenRows(1);
    feuille.getRange(1, 1, 1, entetes.length)
      .setFontWeight('bold')
      .setBackground('#147d64')
      .setFontColor('#ffffff');
    feuille.autoResizeColumns(1, entetes.length);
  });

  ajouterDonneesInitiales_();
  mettreAJourVersion_();
  PropertiesService.getDocumentProperties().setProperty('BUDGETSOFT_INITIALISE', 'true');
  SpreadsheetApp.getUi().alert('BudgetSoft est initialisé et à jour (version ' + BUDGETSOFT_VERSION + ').');
}

function verifierConfiguration() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const manquantes = Object.keys(TABLES).filter(nom => !ss.getSheetByName(nom));
  const colonnesManquantes = [];

  Object.entries(TABLES).forEach(([nom, entetes]) => {
    const feuille = ss.getSheetByName(nom);
    if (!feuille || feuille.getLastRow() === 0) return;
    const largeur = Math.max(feuille.getLastColumn(), 1);
    const presentes = feuille.getRange(1, 1, 1, largeur).getValues()[0].map(v => String(v || '').trim());
    entetes.filter(e => !presentes.includes(e)).forEach(e => colonnesManquantes.push(nom + '.' + e));
  });

  let message = 'Configuration valide. BudgetSoft est prêt.';
  if (manquantes.length) message = 'Onglets manquants : ' + manquantes.join(', ');
  else if (colonnesManquantes.length) message = 'Colonnes manquantes : ' + colonnesManquantes.join(', ');

  SpreadsheetApp.getUi().alert(message);
  return { ok: manquantes.length === 0 && colonnesManquantes.length === 0, manquantes, colonnesManquantes };
}

function chargerToutesLesDonnees() {
  verifierInitialisation_();
  genererChargesFixes();
  const resultat = {};
  Object.keys(TABLES).forEach(nom => resultat[nom] = lireTable_(nom));
  resultat.meta = { version: BUDGETSOFT_VERSION, chargeLe: new Date().toISOString() };
  return resultat;
}
function lireTable(nom) { verifierNomTable_(nom); verifierInitialisation_(); return lireTable_(nom); }

function enregistrerLigne(nom, ligne) {
  verifierNomTable_(nom); verifierInitialisation_();
  if (!ligne || typeof ligne !== 'object') throw new Error('Donnée invalide.');
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  const entetes = TABLES[nom];
  const maintenant = new Date().toISOString();
  const copie = Object.assign({}, ligne);

  if (nom === 'Comptes') {
    copie.nom = String(copie.nom || '').trim();
    if (!copie.nom) throw new Error('Le nom du compte est obligatoire.');
    copie.type = String(copie.type || 'courant').trim();
    copie.solde_initial = convertirNombre_(copie.solde_initial);
    copie.actif = convertirBooleen_(copie.actif);
  }
  if (nom === 'Operations') normaliserOperation_(copie);
  if (nom === 'Charges_fixes') {
    copie.libelle = String(copie.libelle || '').trim();
    copie.compte = String(copie.compte || '').trim();
    copie.categorie = String(copie.categorie || '').trim();
    copie.type = String(copie.type || 'depense').toLowerCase();
    copie.montant = Math.abs(convertirNombre_(copie.montant));
    copie.jour_execution = Math.max(1, Math.min(31, parseInt(copie.jour_execution, 10) || 1));
    copie.date_debut = copie.date_debut ? new Date(copie.date_debut) : new Date();
    copie.date_fin = copie.date_fin ? new Date(copie.date_fin) : '';
    copie.actif = convertirBooleen_(copie.actif);
    copie.frequence = String(copie.frequence || 'Mensuelle').trim();
    copie.libelle_bancaire = String(copie.libelle_bancaire || '').trim();
    copie.tolerance = copie.tolerance === '' || copie.tolerance == null ? 0.50 : Math.abs(convertirNombre_(copie.tolerance));
    if (!copie.libelle || !copie.compte) throw new Error('Le libellé et le compte sont obligatoires.');
    if (!copie.libelle_bancaire) throw new Error('Le libellé bancaire est obligatoire.');
    if (isNaN(copie.date_debut.getTime())) throw new Error('La date de début est invalide.');
    if (copie.date_fin instanceof Date && isNaN(copie.date_fin.getTime())) throw new Error('La date de fin est invalide.');
  }

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
  } finally { verrou.releaseLock(); }
  return copie;
}

function genererChargesFixes() {
  verifierInitialisation_();
  const charges = lireTable_('Charges_fixes').filter(c => convertirBooleen_(c.actif));
  if (!charges.length) return { creees: 0 };
  const operations = lireTable_('Operations');
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = maintenant.getMonth();
  const cleMois = Utilities.formatDate(new Date(annee, mois, 1), Session.getScriptTimeZone(), 'yyyy-MM');
  const marqueurs = new Set(operations.map(o => String(o.commentaire || '')).filter(v => v.indexOf('[RECURRENCE:') >= 0));
  let creees = 0;
  charges.forEach(charge => {
    const debut = new Date(charge.date_debut);
    const fin = charge.date_fin ? new Date(charge.date_fin) : null;
    const debutMois = new Date(debut.getFullYear(), debut.getMonth(), 1);
    const moisCourant = new Date(annee, mois, 1);
    if (isNaN(debut.getTime()) || moisCourant < debutMois || (fin && !isNaN(fin.getTime()) && moisCourant > new Date(fin.getFullYear(), fin.getMonth(), 1))) return;
    const marqueur = '[RECURRENCE:' + charge.id + ':' + cleMois + ']';
    if ([...marqueurs].some(v => v.indexOf(marqueur) >= 0)) return;
    const dernierJour = new Date(annee, mois + 1, 0).getDate();
    const dateOperation = new Date(annee, mois, Math.min(Number(charge.jour_execution) || 1, dernierJour));
    enregistrerLigne('Operations', {
      date: dateOperation,
      libelle: charge.libelle,
      categorie: charge.categorie,
      compte: charge.compte,
      montant: charge.montant,
      type: charge.type || 'depense',
      commentaire: [charge.commentaire || '', marqueur].filter(Boolean).join(' ')
    });
    marqueurs.add(marqueur);
    creees++;
  });
  return { creees };
}

function supprimerLigne(nom, id) {
  verifierNomTable_(nom); verifierInitialisation_();
  const entetes = TABLES[nom], idIndex = entetes.indexOf('id');
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

function normaliserOperation_(copie) {
  copie.libelle = String(copie.libelle || '').trim();
  copie.compte = String(copie.compte || '').trim();
  copie.categorie = String(copie.categorie || '').trim();
  copie.type = String(copie.type || 'depense').toLowerCase();
  copie.date = copie.date ? new Date(copie.date) : new Date();
  if (!copie.libelle) throw new Error('Le libellé est obligatoire.');
  if (!copie.compte) throw new Error('Le compte est obligatoire.');
  if (isNaN(copie.date.getTime())) throw new Error('La date est invalide.');
  const montant = Math.abs(convertirNombre_(copie.montant));
  copie.montant = copie.type === 'depense' ? -montant : montant;
}

function ajouterDonneesInitiales_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const categories = ss.getSheetByName('Categories');
  if (categories.getLastRow() === 1) {
    [['Logement','depense'],['Courses','depense'],['Transport','depense'],['Santé','depense'],['Loisirs','depense'],['Revenus','revenu'],['Épargne','epargne'],['Crédits','depense'],['Assurances','depense'],['Télécommunications','depense'],['Abonnements','depense'],['Impôts','depense'],['Animaux','depense'],['Frais bancaires','depense']]
      .forEach(([nom, type]) => categories.appendRow([Utilities.getUuid(), nom, type, '', true]));
  }
  const parametres = ss.getSheetByName('Parametres');
  if (parametres.getLastRow() === 1) {
    parametres.appendRow(['version', BUDGETSOFT_VERSION]);
    parametres.appendRow(['devise', 'EUR']);
    parametres.appendRow(['locale', 'fr-FR']);
  }
}

function mettreAJourVersion_() {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Parametres');
  if (!feuille || feuille.getLastRow() < 2) return;
  const valeurs = feuille.getRange(2, 1, feuille.getLastRow() - 1, 2).getValues();
  const index = valeurs.findIndex(l => String(l[0]).trim() === 'version');
  if (index >= 0) feuille.getRange(index + 2, 2).setValue(BUDGETSOFT_VERSION);
  else feuille.appendRow(['version', BUDGETSOFT_VERSION]);
}

function verifierInitialisation_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const manquantes = Object.keys(TABLES).filter(nom => !ss.getSheetByName(nom));
  if (manquantes.length) throw new Error('BudgetSoft n’est pas à jour. Lancez initialiserBudgetSoft(). Onglets manquants : ' + manquantes.join(', '));
}
function verifierNomTable_(nom) { if (!Object.prototype.hasOwnProperty.call(TABLES, nom)) throw new Error('Table inconnue : ' + nom); }
function convertirNombre_(valeur) {
  const n = Number(String(valeur == null ? 0 : valeur).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) throw new Error('Le montant est invalide.');
  return n;
}
function convertirBooleen_(valeur) { return valeur !== false && String(valeur).toLowerCase() !== 'false' && String(valeur) !== '0'; }
function normaliserValeur_(valeur) {
  if (valeur === undefined || valeur === null) return '';
  if (typeof valeur === 'object' && !(valeur instanceof Date)) return JSON.stringify(valeur);
  return valeur;
}
function serialiserValeur_(valeur) { return valeur instanceof Date ? valeur.toISOString() : valeur; }