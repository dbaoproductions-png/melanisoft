const BUDGET_PLAN_VERSION = '1.2';

function chargerBudgetPeriode(clePeriode) {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const parametres = lireTable_('Parametres');
  const dictionnaire = Object.fromEntries(parametres.map(p => [String(p.cle), p.valeur]));
  const jour = bornerJourBudgetaire_(dictionnaire.jour_debut_mois || 28);
  const reference = referenceDepuisCleBudget_(clePeriode);
  const periode = calculerPeriodeBudgetaireAvecSalaire_(reference, jour, operations);
  const budgets = lireTable_('Budget').filter(b => String(b.mois) === String(periode.cle));
  const categories = lireTable_('Categories').filter(c => convertirBooleen_(c.actif));
  const debut = new Date(periode.debut);
  const fin = new Date(periode.fin);
  const mouvements = operations.filter(o => {
    const d = new Date(o.date);
    return !isNaN(d) && d >= debut && d <= fin;
  });

  const postes = categories.map(categorie => {
    const nom = String(categorie.nom || '').trim();
    const type = String(categorie.type || 'depense').toLowerCase();
    const budget = budgets.find(b => String(b.poste) === nom && String(b.type).toLowerCase() === type);
    const reel = mouvements.filter(o => String(o.categorie || '') === nom && String(o.type || '').toLowerCase() === type)
      .reduce((s, o) => s + Math.abs(Number(o.montant || 0)), 0);
    const prevu = Number(budget && budget.prevu || 0);
    return { id: budget && budget.id || '', poste: nom, type, prevu, reel, ecart: prevu - reel };
  }).sort((a, b) => a.type.localeCompare(b.type) || a.poste.localeCompare(b.poste, 'fr'));

  const depenses = postes.filter(p => p.type === 'depense');
  const revenus = postes.filter(p => p.type === 'revenu');
  return {
    version: BUDGET_PLAN_VERSION,
    periode,
    postes,
    totaux: {
      depensesPrevues: depenses.reduce((s, p) => s + p.prevu, 0),
      depensesReelles: depenses.reduce((s, p) => s + p.reel, 0),
      revenusPrevus: revenus.reduce((s, p) => s + p.prevu, 0),
      revenusReels: revenus.reduce((s, p) => s + p.reel, 0)
    }
  };
}

function enregistrerBudgetPeriode(clePeriode, postes) {
  verifierInitialisation_();
  if (!Array.isArray(postes)) throw new Error('Les postes budgétaires sont invalides.');
  const donnees = chargerBudgetPeriode(clePeriode);
  const cle = donnees.periode.cle;
  const existants = lireTable_('Budget').filter(b => String(b.mois) === String(cle));
  postes.forEach(poste => {
    const nom = String(poste.poste || '').trim();
    const type = String(poste.type || 'depense').toLowerCase();
    if (!nom) return;
    const existant = existants.find(b => String(b.poste) === nom && String(b.type).toLowerCase() === type);
    enregistrerLigne('Budget', {
      id: existant && existant.id || '',
      mois: cle,
      type,
      poste: nom,
      prevu: Math.max(0, convertirNombre_(poste.prevu || 0)),
      reel: 0
    });
  });
  return chargerBudgetPeriode(cle);
}

function recopierBudgetPeriode(sourceCle, cibleCle) {
  verifierInitialisation_();
  const source = lireTable_('Budget').filter(b => String(b.mois) === String(sourceCle));
  if (!source.length) throw new Error('Aucun budget à recopier pour cette période.');
  return enregistrerBudgetPeriode(cibleCle, source.map(b => ({ poste: b.poste, type: b.type, prevu: b.prevu })));
}

function referenceDepuisCleBudget_(cle) {
  const match = String(cle || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, 15);
}
