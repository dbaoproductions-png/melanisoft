const MAINTENANCE_VERSION = '2.2';

function chargerCentreMaintenance() {
  verifierInitialisation_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuilles = ['Operations','Charges_fixes','Correspondances_bancaires','Rapprochements_a_valider'];
  const compteurs = {};
  feuilles.forEach(nom => {
    const feuille = ss.getSheetByName(nom);
    compteurs[nom] = feuille ? Math.max(0, feuille.getLastRow() - 1) : 0;
  });
  return { version: MAINTENANCE_VERSION, compteurs, controle: controlerQualiteBudgetSoft() };
}

function viderDonneesMaintenance(cible) {
  verifierInitialisation_();
  const autorisees = {
    operations: ['Operations'],
    rapprochements: ['Rapprochements_a_valider'],
    correspondances: ['Correspondances_bancaires'],
    charges_fixes: ['Charges_fixes'],
    imports_bancaires: ['Operations','Rapprochements_a_valider','Correspondances_bancaires']
  };
  if (!autorisees[cible]) throw new Error('Type de nettoyage inconnu.');

  const resultat = { cible, supprimees: 0, details: [] };
  if (cible === 'imports_bancaires') {
    resultat.details.push(viderOperationsPdf_());
    resultat.details.push(viderFeuilleDonnees_('Rapprochements_a_valider'));
    resultat.details.push(viderFeuilleDonnees_('Correspondances_bancaires'));
  } else {
    autorisees[cible].forEach(nom => resultat.details.push(viderFeuilleDonnees_(nom)));
  }
  resultat.supprimees = resultat.details.reduce((s, d) => s + Number(d.supprimees || 0), 0);
  journaliserMaintenance_('Nettoyage ' + cible, resultat.supprimees + ' ligne(s) supprimée(s)');
  return resultat;
}

function viderFeuilleDonnees_(nom) {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  if (!feuille || feuille.getLastRow() < 2) return { feuille: nom, supprimees: 0 };
  const nombre = feuille.getLastRow() - 1;
  feuille.getRange(2, 1, nombre, Math.max(1, feuille.getLastColumn())).clearContent();
  return { feuille: nom, supprimees: nombre };
}

function viderOperationsPdf_() {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');
  if (!feuille || feuille.getLastRow() < 2) return { feuille: 'Operations PDF', supprimees: 0 };
  const valeurs = feuille.getDataRange().getValues();
  const entetes = valeurs[0].map(v => String(v).trim());
  const indexCommentaire = entetes.indexOf('commentaire');
  if (indexCommentaire < 0) return { feuille: 'Operations PDF', supprimees: 0 };
  let supprimees = 0;
  for (let i = valeurs.length - 1; i >= 1; i--) {
    if (/\[PDF:HELLOBANK:/.test(String(valeurs[i][indexCommentaire] || ''))) {
      feuille.deleteRow(i + 1);
      supprimees++;
    }
  }
  return { feuille: 'Operations PDF', supprimees };
}

function recalculerMaintenance(cible) {
  verifierInitialisation_();
  const resultat = { cible, succes: true, details: [] };
  try {
    if (cible === 'cycles' || cible === 'tout') {
      const cycle = chargerCycleFinancier();
      resultat.details.push('Cycle recalculé : ' + cycle.periode.jourCourant + '/' + cycle.periode.dureeJours + '.');
    }
    if (cible === 'budgets' || cible === 'tout') {
      const budget = chargerBudgetPeriode('');
      resultat.details.push('Budget recalculé : ' + budget.postes.length + ' poste(s).');
    }
    if (cible === 'patrimoine' || cible === 'tout') {
      const patrimoine = chargerPatrimoine();
      resultat.details.push('Patrimoine recalculé : ' + patrimoine.patrimoineNet + ' €.');
    }
    if (cible === 'analyses' || cible === 'tout') {
      if (typeof chargerAnalysesBudgetaires === 'function') {
        chargerAnalysesBudgetaires(6);
        resultat.details.push('Analyses recalculées sur 6 périodes.');
      } else {
        resultat.details.push('Module Analyses indisponible.');
      }
    }
    journaliserMaintenance_('Recalcul ' + cible, resultat.details.join(' '));
  } catch (e) {
    resultat.succes = false;
    resultat.details.push(e.message || String(e));
  }
  return resultat;
}

function controlerQualiteBudgetSoft() {
  verifierInitialisation_();
  const comptes = lireTable_('Comptes');
  const categories = lireTable_('Categories');
  const operations = lireTable_('Operations');
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
    if (compte && !comptesIds.has(compte) && !comptesNoms.has(normaliserTexteMaintenance_(compte))) anomalies.push({ niveau:'erreur', domaine:'Comptes', message:'Ligne ' + numero + ' : compte inconnu.' });
    const categorie = String(o.categorie || '').trim();
    if (!categorie) anomalies.push({ niveau:'attention', domaine:'Catégories', message:'Ligne ' + numero + ' : opération sans catégorie.' });
    else if (!categoriesNoms.has(normaliserTexteMaintenance_(categorie))) anomalies.push({ niveau:'attention', domaine:'Catégories', message:'Ligne ' + numero + ' : catégorie inconnue « ' + categorie + ' ».' });
  });

  const cles = {};
  operations.forEach((o, index) => {
    const date = new Date(o.date);
    const dateCle = isNaN(date) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const cle = [dateCle, normaliserTexteMaintenance_(o.libelle), Math.abs(Number(o.montant || 0)).toFixed(2), String(o.compte || '')].join('|');
    if (cles[cle]) anomalies.push({ niveau:'attention', domaine:'Doublons', message:'Doublon probable aux lignes ' + cles[cle] + ' et ' + (index + 2) + '.' });
    else cles[cle] = index + 2;
  });

  try {
    const cycle = chargerCycleFinancier();
    if (!cycle.salaire) anomalies.push({ niveau:'attention', domaine:'Cycles', message:'Salaire principal non détecté.' });
    if (new Date(cycle.periode.fin) <= new Date(cycle.periode.debut)) anomalies.push({ niveau:'erreur', domaine:'Cycles', message:'Dates du cycle incohérentes.' });
  } catch (e) {
    anomalies.push({ niveau:'erreur', domaine:'Cycles', message:'Calcul du cycle impossible : ' + (e.message || e) });
  }

  const erreurs = anomalies.filter(a => a.niveau === 'erreur').length;
  const attentions = anomalies.filter(a => a.niveau === 'attention').length;
  const score = Math.max(0, Math.round(100 - erreurs * 8 - attentions * 2));
  return {
    score,
    erreurs,
    attentions,
    anomalies,
    compteurs: { comptes: comptes.length, categories: categories.length, operations: operations.length }
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

function journaliserMaintenance_(action, details) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let feuille = ss.getSheetByName('Journal');
  if (!feuille) {
    feuille = ss.insertSheet('Journal');
    feuille.appendRow(['date','action','details','utilisateur']);
  }
  feuille.appendRow([new Date(), action, details, Session.getActiveUser().getEmail() || 'Utilisateur']);
}
