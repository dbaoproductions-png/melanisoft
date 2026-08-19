const ANALYSES_VERSION = '2.2';

function chargerAnalysesBudgetaires(nombrePeriodes) {
  verifierInitialisation_();

  // Toutes les tables sont chargées une seule fois. Les analyses se font ensuite
  // entièrement en mémoire : pas d'écriture et pas de génération de charges fictives.
  const operationsBrutes = lireTable_('Operations');
  const budgets = lireTable_('Budget');
  const parametres = lireTable_('Parametres');
  const categoriesRef = lireTable_('Categories');
  const chargesFixes = lireTable_('Charges_fixes');

  const operations = operationsBrutes.map(o => {
    const copie = Object.assign({}, o);
    // Pour l'analyse des flux réellement passés en banque, la date comptable fait foi.
    // Les anciennes opérations sans date_comptable conservent leur date historique.
    copie.date_analyse = copie.date_comptable || copie.date;
    return copie;
  });

  const typesCategories = Object.fromEntries(categoriesRef.map(c => [String(c.nom || '').trim(), String(c.type || '').toLowerCase()]));
  const estTresorerie = o => {
    const cat = String(o.categorie || '').trim();
    return String(o.type || '').toLowerCase() === 'tresorerie' || typesCategories[cat] === 'tresorerie' || cat === 'Crédits de trésorerie' || cat === 'Virements internes';
  };
  const dictionnaire = Object.fromEntries(parametres.map(p => [String(p.cle), p.valeur]));
  const jour = bornerJourBudgetaire_(dictionnaire.jour_debut_mois || 28);
  const nb = Math.max(3, Math.min(12, parseInt(nombrePeriodes, 10) || 6));

  // La période de référence est la dernière date comptable connue, sans aller au-delà d'aujourd'hui.
  const aujourdHui = new Date();
  const datesValides = operations.map(o => new Date(o.date_analyse)).filter(d => !isNaN(d) && d <= aujourdHui).sort((a, b) => b - a);
  const maintenant = datesValides.length ? datesValides[0] : aujourdHui;
  const periodes = [];

  for (let recul = nb - 1; recul >= 0; recul--) {
    const reference = new Date(maintenant.getFullYear(), maintenant.getMonth() - recul, 15);
    const periode = calculerPeriodeBudgetaireAvecSalaire_(reference, jour, operationsBrutes);
    const debut = new Date(periode.debut);
    const fin = new Date(periode.fin);
    const mouvements = operations.filter(o => {
      const date = new Date(o.date_analyse);
      return !isNaN(date) && date >= debut && date <= fin;
    });
    const mouvementsBudgetaires = mouvements.filter(o => !estTresorerie(o));
    const tresorerie = mouvements.filter(estTresorerie).reduce((s, o) => s + Number(o.montant || 0), 0);
    const revenus = mouvementsBudgetaires.filter(o => Number(o.montant || 0) > 0).reduce((s, o) => s + Number(o.montant || 0), 0);
    const depenses = mouvementsBudgetaires.filter(o => Number(o.montant || 0) < 0).reduce((s, o) => s + Math.abs(Number(o.montant || 0)), 0);
    periodes.push({
      cle: periode.cle,
      libelle: periode.libelle,
      debut: periode.debut,
      fin: periode.fin,
      revenus,
      depenses,
      solde: revenus - depenses,
      tauxEpargne: revenus > 0 ? Math.round(((revenus - depenses) / revenus) * 1000) / 10 : 0,
      tresorerie,
      operations: mouvementsBudgetaires.length
    });
  }

  const courante = periodes[periodes.length - 1];
  const debutCourant = new Date(courante.debut);
  const finCourant = new Date(courante.fin);
  const mouvementsCourants = operations.filter(o => {
    const date = new Date(o.date_analyse);
    return !isNaN(date) && date >= debutCourant && date <= finCourant;
  });

  const categoriesMap = {};
  mouvementsCourants.filter(o => !estTresorerie(o) && Number(o.montant || 0) < 0).forEach(o => {
    const categorie = String(o.categorie || 'Sans catégorie').trim() || 'Sans catégorie';
    categoriesMap[categorie] = (categoriesMap[categorie] || 0) + Math.abs(Number(o.montant || 0));
  });
  const totalDepenses = Object.values(categoriesMap).reduce((s, v) => s + v, 0);
  const categories = Object.entries(categoriesMap).map(([nom, montant]) => ({
    nom,
    montant,
    part: totalDepenses > 0 ? Math.round((montant / totalDepenses) * 1000) / 10 : 0
  })).sort((a, b) => b.montant - a.montant);

  const budgetCourant = budgets.filter(b => String(b.mois) === String(courante.cle) && String(b.type).toLowerCase() === 'depense' && typesCategories[String(b.poste || '').trim()] !== 'tresorerie');
  const alertes = budgetCourant.map(b => {
    const reel = categoriesMap[String(b.poste)] || 0;
    const prevu = Number(b.prevu || 0);
    return {
      poste: String(b.poste || ''),
      prevu,
      reel,
      ecart: prevu - reel,
      taux: prevu > 0 ? Math.round((reel / prevu) * 100) : 0
    };
  }).filter(a => a.prevu > 0 && a.reel > a.prevu).sort((a, b) => a.ecart - b.ecart);

  const moyenne = cle => periodes.length ? periodes.reduce((s, p) => s + Number(p[cle] || 0), 0) / periodes.length : 0;
  const precedente = periodes.length > 1 ? periodes[periodes.length - 2] : null;
  const evolutionDepenses = precedente && precedente.depenses > 0
    ? Math.round(((courante.depenses - precedente.depenses) / precedente.depenses) * 1000) / 10
    : 0;

  // Tous les blocs métier reçoivent les mêmes opérations, avec date analytique
  // basée sur la date comptable afin d'éviter des divergences avec le tableau de bord.
  const operationsMetier = operations.map(o => Object.assign({}, o, { date: o.date_analyse }));
  let recettes = typeof construireAnalyseRecettes2026_ === 'function'
    ? construireAnalyseRecettes2026_(operationsMetier, categoriesRef)
    : null;
  let depensesDetail = typeof construireAnalyseDepenses2026_ === 'function'
    ? construireAnalyseDepenses2026_(operationsMetier, categoriesRef, chargesFixes)
    : null;

  // Règle unique de période : l'utilisateur peut parler de « mois », mais toutes les
  // recettes et dépenses utilisent exactement les cycles budgétaires affichés (28 → 28,
  // techniquement du 28 inclus au 27 inclus pour éviter tout chevauchement).
  if (typeof alignerAnalysesSurPeriodes2026_ === 'function') {
    const alignees = alignerAnalysesSurPeriodes2026_(recettes, depensesDetail, operationsMetier, categoriesRef, periodes);
    recettes = alignees.recettes;
    depensesDetail = alignees.depensesDetail;
  }

  if (depensesDetail && typeof enrichirAnalyseFinancement2026_ === 'function') {
    depensesDetail = enrichirAnalyseFinancement2026_(depensesDetail, operationsMetier, periodes);
  }

  const resultat = {
    version: ANALYSES_VERSION,
    periodes,
    courante,
    categories,
    alertes,
    recettes,
    depensesDetail,
    indicateurs: {
      revenusMoyens: moyenne('revenus'),
      depensesMoyennes: moyenne('depenses'),
      epargneMoyenne: moyenne('solde'),
      tauxEpargneMoyen: moyenne('revenus') > 0 ? Math.round((moyenne('solde') / moyenne('revenus')) * 1000) / 10 : 0,
      evolutionDepenses,
      mouvementTresorerieMoyen: moyenne('tresorerie')
    },
    diagnostic: {
      sourceOperations: 'Operations',
      dateFlux: 'date_comptable puis date',
      periodeAnalyse: 'cycle budgétaire 28 → 28',
      nombreOperationsSource: operations.length,
      chargesFixesSource: chargesFixes.length
    }
  };

  // google.script.run exige un résultat composé uniquement de types sérialisables.
  // La conversion JSON remplace notamment les objets Date imbriqués par des chaînes ISO.
  return JSON.parse(JSON.stringify(resultat));
}
