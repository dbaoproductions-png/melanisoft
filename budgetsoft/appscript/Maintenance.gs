const MAINTENANCE_VERSION = '2.4';

/**
 * Maintenance BudgetSoft 2.4
 * Doctrine : ce module contrôle les données, il ne les répare, ne les migre
 * et ne les efface jamais automatiquement.
 */
function chargerCentreMaintenance() {
  verifierInitialisation_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuilles = ['Operations', 'Charges_fixes', 'Correspondances_bancaires', 'Rapprochements_a_valider'];
  const compteurs = {};
  feuilles.forEach(nom => {
    const feuille = ss.getSheetByName(nom);
    compteurs[nom] = feuille ? Math.max(0, feuille.getLastRow() - 1) : 0;
  });
  return {
    version: MAINTENANCE_VERSION,
    mode: 'lecture_seule',
    doctrine: 'Contrôle uniquement : aucune migration, réparation ou suppression automatique.',
    compteurs,
    controle: controlerQualiteBudgetSoft()
  };
}

function controlerQualiteBudgetSoft() {
  verifierInitialisation_();
  const comptes = lireTable_('Comptes');
  const categories = lireTable_('Categories');
  const operations = lireTable_('Operations');
  const chargesFixes = lireTable_('Charges_fixes');
  const anomalies = [];

  const comptesIds = new Set(comptes.map(c => String(c.id || '')));
  const comptesNoms = new Set(comptes.map(c => normaliserTexteMaintenance_(c.nom)));
  const categoriesNoms = new Set(categories.map(c => normaliserTexteMaintenance_(c.nom)));

  ajouterDoublonsNoms_(comptes, 'nom', 'Compte en double', anomalies);
  ajouterDoublonsNoms_(categories, 'nom', 'Catégorie en double', anomalies);

  operations.forEach((o, index) => {
    const numero = index + 2;
    const date = new Date(o.date);
    const montant = Number(o.montant);
    if (isNaN(date.getTime())) anomalies.push({ niveau:'erreur', domaine:'Opérations', message:'Ligne ' + numero + ' : date invalide.' });
    if (!Number.isFinite(montant) || montant === 0) anomalies.push({ niveau:'erreur', domaine:'Opérations', message:'Ligne ' + numero + ' : montant nul ou invalide.' });

    const compte = String(o.compte || '');
    if (compte && !comptesIds.has(compte) && !comptesNoms.has(normaliserTexteMaintenance_(compte))) {
      anomalies.push({ niveau:'erreur', domaine:'Comptes', message:'Ligne ' + numero + ' : compte inconnu.' });
    }

    const categorie = String(o.categorie || '').trim();
    if (!categorie) anomalies.push({ niveau:'attention', domaine:'Catégories', message:'Ligne ' + numero + ' : opération sans catégorie.' });
    else if (!categoriesNoms.has(normaliserTexteMaintenance_(categorie))) {
      anomalies.push({ niveau:'attention', domaine:'Catégories', message:'Ligne ' + numero + ' : catégorie inconnue « ' + categorie + ' ».' });
    }
  });

  const cles = {};
  operations.forEach((o, index) => {
    const date = new Date(o.date);
    const dateCle = isNaN(date.getTime()) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const cle = [
      dateCle,
      normaliserTexteMaintenance_(o.libelle),
      Math.abs(Number(o.montant || 0)).toFixed(2),
      String(o.compte || '')
    ].join('|');
    if (cles[cle]) anomalies.push({ niveau:'attention', domaine:'Doublons', message:'Doublon probable aux lignes ' + cles[cle] + ' et ' + (index + 2) + '.' });
    else cles[cle] = index + 2;
  });

  chargesFixes.forEach((c, index) => {
    const numero = index + 2;
    const actif = c.actif !== false && String(c.actif).toLowerCase() !== 'false' && String(c.actif) !== '0';
    if (!actif) return;
    const montant = Number(c.montant || 0);
    if (!Number.isFinite(montant) || montant <= 0) {
      anomalies.push({ niveau:'attention', domaine:'Charges fixes', message:'Ligne ' + numero + ' : charge active sans montant indicatif valide.' });
    }
    const categorie = String(c.categorie || '').trim();
    if (categorie && !categoriesNoms.has(normaliserTexteMaintenance_(categorie))) {
      anomalies.push({ niveau:'attention', domaine:'Charges fixes', message:'Ligne ' + numero + ' : catégorie inconnue « ' + categorie + ' ».' });
    }
  });

  const erreurs = anomalies.filter(a => a.niveau === 'erreur').length;
  const attentions = anomalies.filter(a => a.niveau === 'attention').length;
  const score = Math.max(0, Math.round(100 - erreurs * 8 - attentions * 2));
  return {
    score,
    erreurs,
    attentions,
    anomalies,
    compteurs: {
      comptes: comptes.length,
      categories: categories.length,
      operations: operations.length,
      chargesFixesActives: chargesFixes.filter(c => c.actif !== false && String(c.actif).toLowerCase() !== 'false' && String(c.actif) !== '0').length
    }
  };
}

function ajouterDoublonsNoms_(lignes, champ, libelle, anomalies) {
  const vus = {};
  lignes.forEach((ligne, index) => {
    const cle = normaliserTexteMaintenance_(ligne[champ]);
    if (!cle) return;
    if (vus[cle]) anomalies.push({ niveau:'attention', domaine:'Doublons', message:libelle + ' : lignes ' + vus[cle] + ' et ' + (index + 2) + '.' });
    else vus[cle] = index + 2;
  });
}

function normaliserTexteMaintenance_(valeur) {
  return String(valeur || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
