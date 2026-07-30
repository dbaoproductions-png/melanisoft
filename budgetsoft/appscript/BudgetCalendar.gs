const BUDGETSOFT_SPRINT_VERSION = '0.9.2';

function chargerConfigurationBudgetaire() {
  verifierInitialisation_();
  const parametres = lireTable_('Parametres');
  const dictionnaire = Object.fromEntries(parametres.map(p => [String(p.cle), p.valeur]));
  const jourDebut = bornerJourBudgetaire_(dictionnaire.jour_debut_mois || 28);
  const operations = lireTable_('Operations');
  return {
    version: BUDGETSOFT_SPRINT_VERSION,
    jourDebutMois: jourDebut,
    jourSalaire: bornerJourBudgetaire_(dictionnaire.jour_salaire || jourDebut),
    devise: String(dictionnaire.devise || 'EUR'),
    periodeCourante: calculerPeriodeBudgetaireAvecSalaire_(new Date(), jourDebut, operations)
  };
}

function enregistrerConfigurationBudgetaire(configuration) {
  verifierInitialisation_();
  const jourDebut = bornerJourBudgetaire_(configuration && configuration.jourDebutMois);
  const jourSalaire = bornerJourBudgetaire_(configuration && configuration.jourSalaire || jourDebut);
  enregistrerParametreBudgetaire_('jour_debut_mois', jourDebut);
  enregistrerParametreBudgetaire_('jour_salaire', jourSalaire);
  enregistrerParametreBudgetaire_('version_interface', BUDGETSOFT_SPRINT_VERSION);
  return chargerConfigurationBudgetaire();
}

function calculerPeriodeBudgetaire(dateIso, jourDebut) {
  return calculerPeriodeBudgetaire_(dateIso ? new Date(dateIso) : new Date(), jourDebut);
}

function calculerPeriodeBudgetaire_(date, jourDebut) {
  return calculerPeriodeBudgetaireAvecSalaire_(date, jourDebut, []);
}

function calculerPeriodeBudgetaireAvecSalaire_(date, jourDebut, operations) {
  const jour = bornerJourBudgetaire_(jourDebut || 28);
  const reference = debutJour_(date instanceof Date && !isNaN(date) ? date : new Date());
  let debutNominal;
  let moisLibelle;

  if (reference.getDate() >= jour) {
    debutNominal = creerDateBudgetaire_(reference.getFullYear(), reference.getMonth(), jour);
    moisLibelle = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  } else {
    debutNominal = creerDateBudgetaire_(reference.getFullYear(), reference.getMonth() - 1, jour);
    moisLibelle = new Date(reference.getFullYear(), reference.getMonth(), 1);
  }

  const prochainNominal = creerDateBudgetaire_(debutNominal.getFullYear(), debutNominal.getMonth() + 1, jour);
  const debutReel = trouverSalaireAutourDate_(operations, debutNominal, 7) || debutNominal;
  const prochainSalaire = trouverSalaireAutourDate_(operations, prochainNominal, 7);
  const fin = prochainSalaire && prochainSalaire > debutReel
    ? new Date(prochainSalaire.getTime() - 1)
    : new Date(prochainNominal.getTime() - 1);

  return {
    debut: debutReel.toISOString(),
    fin: fin.toISOString(),
    cle: Utilities.formatDate(moisLibelle, Session.getScriptTimeZone(), 'yyyy-MM'),
    libelle: moisLibelle.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    jourDebut: debutReel.getDate(),
    jourReference: jour,
    debutAjusteSalaire: debutReel.getTime() !== debutNominal.getTime()
  };
}

function trouverSalaireAutourDate_(operations, dateReference, margeJours) {
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
  return Math.max(1, Math.min(28, parseInt(valeur, 10) || 28));
}

function creerDateBudgetaire_(annee, mois, jour) {
  return new Date(annee, mois, Math.min(jour, new Date(annee, mois + 1, 0).getDate()));
}
