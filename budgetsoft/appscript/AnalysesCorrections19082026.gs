const ANALYSES_CORRECTIONS_19082026_VERSION = '2.3';

/**
 * Version consolidée de l'analyse :
 * - les mois restent les cycles BudgetSoft 28 inclus -> 27 inclus ;
 * - la période courante est arrêtée à la dernière date bancaire réellement connue ;
 * - aucune opération future n'entre dans un résultat « constaté » ;
 * - les crédits de trésorerie restent exclus du résultat économique mais sont suivis séparément.
 */
function chargerAnalysesBudgetairesV23(nombrePeriodes) {
  const resultat = chargerAnalysesBudgetaires(nombrePeriodes);
  if (!resultat || !Array.isArray(resultat.periodes) || !resultat.periodes.length) return resultat;

  const operationsBrutes = lireTable_('Operations');
  const categoriesRef = lireTable_('Categories');
  const typesCategories = Object.fromEntries(categoriesRef.map(c => [String(c.nom || '').trim(), String(c.type || '').toLowerCase()]));
  const estTresorerie = o => {
    const cat = String(o.categorie || '').trim();
    return String(o.type || '').toLowerCase() === 'tresorerie' || typesCategories[cat] === 'tresorerie' || cat === 'Crédits de trésorerie' || cat === 'Virements internes';
  };

  const maintenantReel = new Date();
  const operations = operationsBrutes.map(o => {
    const x = Object.assign({}, o);
    x.date_analyse = x.date_comptable || x.date;
    return x;
  });
  const datesConnues = operations.map(o => new Date(o.date_analyse)).filter(d => !isNaN(d) && d <= maintenantReel).sort((a, b) => b - a);
  const reference = datesConnues.length ? datesConnues[0] : maintenantReel;
  const finReference = new Date(reference);
  finReference.setHours(23, 59, 59, 999);

  const courante = resultat.periodes[resultat.periodes.length - 1];
  const debutCourant = new Date(courante.debut);
  const finCourant = new Date(courante.fin);
  const borneCourante = finReference < finCourant ? finReference : finCourant;

  const mouvementsCourants = operations.filter(o => {
    const d = new Date(o.date_analyse);
    return !isNaN(d) && d >= debutCourant && d <= borneCourante;
  });
  const budgetairesCourants = mouvementsCourants.filter(o => !estTresorerie(o));
  const revenusCourants = budgetairesCourants.filter(o => Number(o.montant || 0) > 0).reduce((s, o) => s + Number(o.montant || 0), 0);
  const depensesCourantes = budgetairesCourants.filter(o => Number(o.montant || 0) < 0).reduce((s, o) => s + Math.abs(Number(o.montant || 0)), 0);
  const tresorerieCourante = mouvementsCourants.filter(estTresorerie).reduce((s, o) => s + Number(o.montant || 0), 0);

  courante.revenus = revenusCourants;
  courante.depenses = depensesCourantes;
  courante.solde = revenusCourants - depensesCourantes;
  courante.tauxEpargne = revenusCourants > 0 ? Math.round(((revenusCourants - depensesCourantes) / revenusCourants) * 1000) / 10 : 0;
  courante.tresorerie = tresorerieCourante;
  courante.operations = budgetairesCourants.length;
  courante.constateJusquAu = reference.toISOString();
  courante.periodeComplete = borneCourante >= finCourant;
  resultat.courante = courante;

  // Catégories de la période courante : elles représentent elles aussi uniquement le constaté.
  const categoriesMap = {};
  budgetairesCourants.filter(o => Number(o.montant || 0) < 0).forEach(o => {
    const cat = String(o.categorie || 'Sans catégorie').trim() || 'Sans catégorie';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + Math.abs(Number(o.montant || 0));
  });
  const totalDepenses = Object.values(categoriesMap).reduce((s, v) => s + v, 0);
  resultat.categories = Object.entries(categoriesMap).map(([nom, montant]) => ({
    nom: nom,
    montant: montant,
    part: totalDepenses > 0 ? Math.round((montant / totalDepenses) * 1000) / 10 : 0
  })).sort((a, b) => b.montant - a.montant);

  // Recalcule les indicateurs généraux après correction de la période courante.
  const moyenne = cle => resultat.periodes.length ? resultat.periodes.reduce((s, p) => s + Number(p[cle] || 0), 0) / resultat.periodes.length : 0;
  const precedente = resultat.periodes.length > 1 ? resultat.periodes[resultat.periodes.length - 2] : null;
  resultat.indicateurs = Object.assign({}, resultat.indicateurs || {}, {
    revenusMoyens: moyenne('revenus'),
    depensesMoyennes: moyenne('depenses'),
    epargneMoyenne: moyenne('solde'),
    tauxEpargneMoyen: moyenne('revenus') > 0 ? Math.round((moyenne('solde') / moyenne('revenus')) * 1000) / 10 : 0,
    evolutionDepenses: precedente && precedente.depenses > 0 ? Math.round(((courante.depenses - precedente.depenses) / precedente.depenses) * 1000) / 10 : 0,
    mouvementTresorerieMoyen: moyenne('tresorerie')
  });

  // Les blocs Recettes/Dépenses utilisent les mêmes opérations, mais aucune date future.
  const operationsMetierConstat = operations
    .filter(o => {
      const d = new Date(o.date_analyse);
      return !isNaN(d) && d <= finReference;
    })
    .map(o => Object.assign({}, o, { date: o.date_analyse }));

  if (typeof alignerAnalysesSurPeriodes2026_ === 'function') {
    const alignees = alignerAnalysesSurPeriodes2026_(resultat.recettes, resultat.depensesDetail, operationsMetierConstat, categoriesRef, resultat.periodes);
    resultat.recettes = alignees.recettes;
    resultat.depensesDetail = alignees.depensesDetail;
  }
  if (resultat.depensesDetail && typeof enrichirAnalyseFinancement2026_ === 'function') {
    resultat.depensesDetail = enrichirAnalyseFinancement2026_(resultat.depensesDetail, operationsMetierConstat, resultat.periodes);
  }

  resultat.version = ANALYSES_CORRECTIONS_19082026_VERSION;
  resultat.dateReference = reference.toISOString();
  resultat.diagnostic = Object.assign({}, resultat.diagnostic || {}, {
    periodeAnalyse: 'cycle budgétaire 28 inclus -> 27 inclus',
    periodeCourante: 'constatée jusqu’à la dernière date bancaire connue',
    operationsFuturesExclues: true
  });
  return JSON.parse(JSON.stringify(resultat));
}