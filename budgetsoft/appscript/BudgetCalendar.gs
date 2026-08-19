const BUDGETSOFT_SPRINT_VERSION = '0.9.3';
const BUDGETSOFT_JOUR_DEBUT_CYCLE = 28;

function jourDebutCycleBudgetSoft_() {
  return BUDGETSOFT_JOUR_DEBUT_CYCLE;
}

function chargerConfigurationBudgetaire() {
  verifierInitialisation_();
  const parametres = lireTable_('Parametres');
  const dictionnaire = Object.fromEntries(parametres.map(p => [String(p.cle), p.valeur]));
  const jourDebut = jourDebutCycleBudgetSoft_();
  const operations = lireTable_('Operations');
  return {
    version: BUDGETSOFT_SPRINT_VERSION,
    jourDebutMois: jourDebut,
    jourSalaire: jourDebut,
    devise: String(dictionnaire.devise || 'EUR'),
    periodeCourante: calculerPeriodeBudgetaireAvecSalaire_(new Date(), jourDebut, operations),
    regleCycle: '28 inclus → 27 inclus du mois suivant',
    etalonnage: 'jour le plus tardif observé pour le salaire principal'
  };
}

function enregistrerConfigurationBudgetaire(configuration) {
  verifierInitialisation_();
  // Depuis le 19/08/2026, le cycle BudgetSoft est une convention métier globale :
  // le 28 ouvre le nouveau mois budgétaire. Les anciens paramètres restent écrits
  // pour compatibilité mais ne peuvent plus décaler les bornes utilisées par les calculs.
  const jourDebut = jourDebutCycleBudgetSoft_();
  enregistrerParametreBudgetaire_('jour_debut_mois', jourDebut);
  enregistrerParametreBudgetaire_('jour_salaire', jourDebut);
  enregistrerParametreBudgetaire_('regle_cycle_budgetsoft', '28_inclus_27_inclus');
  enregistrerParametreBudgetaire_('version_interface', BUDGETSOFT_SPRINT_VERSION);
  return chargerConfigurationBudgetaire();
}

function calculerPeriodeBudgetaire(dateIso, jourDebut) {
  return calculerPeriodeBudgetaireCanonique_(dateIso ? new Date(dateIso) : new Date());
}

function calculerPeriodeBudgetaire_(date, jourDebut) {
  return calculerPeriodeBudgetaireCanonique_(date);
}

function calculerPeriodeBudgetaireAvecSalaire_(date, jourDebut, operations) {
  // Le salaire principal sert à ETALONNER la convention (jour le plus tardif observé = 28),
  // mais on ne déplace plus le début d'un mois au gré de sa date réelle de versement.
  // Tous les modules partagent donc exactement les mêmes bornes : 28 inclus → 27 inclus.
  return calculerPeriodeBudgetaireCanonique_(date);
}

function calculerPeriodeBudgetaireCanonique_(date) {
  const jour = jourDebutCycleBudgetSoft_();
  const reference = debutJour_(date instanceof Date && !isNaN(date) ? date : new Date());
  let debut;
  let moisLibelle;

  if (reference.getDate() >= jour) {
    debut = creerDateBudgetaire_(reference.getFullYear(), reference.getMonth(), jour);
    moisLibelle = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  } else {
    debut = creerDateBudgetaire_(reference.getFullYear(), reference.getMonth() - 1, jour);
    moisLibelle = new Date(reference.getFullYear(), reference.getMonth(), 1);
  }

  debut.setHours(0, 0, 0, 0);
  const prochainDebut = creerDateBudgetaire_(debut.getFullYear(), debut.getMonth() + 1, jour);
  prochainDebut.setHours(0, 0, 0, 0);
  const fin = new Date(prochainDebut.getTime() - 1);

  return {
    debut: debut.toISOString(),
    fin: fin.toISOString(),
    cle: Utilities.formatDate(moisLibelle, Session.getScriptTimeZone(), 'yyyy-MM'),
    libelle: moisLibelle.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    jourDebut: jour,
    jourReference: jour,
    debutAjusteSalaire: false,
    conventionCycle: '28 inclus → 27 inclus'
  };
}

function trouverSalaireAutourDate_(operations, dateReference, margeJours) {
  // Conservé pour compatibilité avec les anciens diagnostics. Cette fonction ne
  // pilote plus les bornes du cycle.
  const debutFenetre = new Date(dateReference);
  debutFenetre.setDate(debutFenetre.getDate() - Math.max(0, margeJours || 0));
  const finFenetre = new Date(dateReference);
  finFenetre.setDate(finFenetre.getDate() + Math.max(0, margeJours || 0));

  const candidats = (operations || []).map(operation => {
    const date = new Date(operation.date);
    const montant = Number(operation.montant || 0);
    const texte = normaliserTexteBanque_([operation.libelle, operation.categorie, operation.commentaire].join(' '));
    const estSalaire = montant > 0 && /\b(SALAIRE|PAYE|TRAITEMENT)\b/.test(texte);
    return { date, estSalaire, ecart: Math.abs(date.getTime() - dateReference.getTime()) };
  }).filter(c => c.estSalaire && !isNaN(c.date) && c.date >= debutFenetre && c.date <= finFenetre)
    .sort((a, b) => a.ecart - b.ecart);

  return candidats.length ? debutJour_(candidats[0].date) : null;
}

function enregistrerParametreBudgetaire_(cle, valeur) {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Parametres');
  const lignes = feuille.getLastRow() > 1 ? feuille.getRange(2, 1, feuille.getLastRow() - 1, 2).getValues() : [];
  const index = lignes.findIndex(l => String(l[0]).trim() === cle);
  if (index >= 0) feuille.getRange(index + 2, 2).setValue(valeur);
  else feuille.appendRow([cle, valeur]);
}

function bornerJourBudgetaire_(valeur) {
  // Compatibilité API : toute demande de jour de cycle converge désormais vers 28.
  return jourDebutCycleBudgetSoft_();
}

function creerDateBudgetaire_(annee, mois, jour) {
  const j = jourDebutCycleBudgetSoft_();
  return new Date(annee, mois, Math.min(j, new Date(annee, mois + 1, 0).getDate()));
}
