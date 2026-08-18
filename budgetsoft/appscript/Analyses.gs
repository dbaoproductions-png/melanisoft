const ANALYSES_VERSION = '1.7';

function chargerAnalysesBudgetaires(nombrePeriodes) {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const budgets = lireTable_('Budget');
  const parametres = lireTable_('Parametres');
  const categoriesRef = lireTable_('Categories');
  const chargesFixes = lireTable_('Charges_fixes');
  const typesCategories = Object.fromEntries(categoriesRef.map(c => [String(c.nom || '').trim(), String(c.type || '').toLowerCase()]));
  const estTresorerie = o => String(o.type || '').toLowerCase() === 'tresorerie' || typesCategories[String(o.categorie || '').trim()] === 'tresorerie';
  const dictionnaire = Object.fromEntries(parametres.map(p => [String(p.cle), p.valeur]));
  const jour = bornerJourBudgetaire_(dictionnaire.jour_debut_mois || 28);
  const nb = Math.max(3, Math.min(12, parseInt(nombrePeriodes, 10) || 6));
  const maintenant = new Date();
  const periodes = [];

  for (let recul = nb - 1; recul >= 0; recul--) {
    const reference = new Date(maintenant.getFullYear(), maintenant.getMonth() - recul, 15);
    const periode = calculerPeriodeBudgetaireAvecSalaire_(reference, jour, operations);
    const debut = new Date(periode.debut);
    const fin = new Date(periode.fin);
    const mouvements = operations.filter(o => {
      const date = new Date(o.date);
      return !isNaN(date) && date >= debut && date <= fin;
    });
    const mouvementsBudgetaires = mouvements.filter(o => !estTresorerie(o));
    const tresorerie = mouvements.filter(estTresorerie).reduce((s, o) => s + Number(o.montant || 0), 0);
    const revenus = mouvementsBudgetaires.filter(o => Number(o.montant || 0) > 0)
      .reduce((s, o) => s + Number(o.montant || 0), 0);
    const depenses = mouvementsBudgetaires.filter(o => Number(o.montant || 0) < 0)
      .reduce((s, o) => s + Math.abs(Number(o.montant || 0)), 0);
    periodes.push({
      cle: periode.cle,
      libelle: periode.libelle,
      debut: periode.debut,
      fin: periode.fin,
      revenus,
      depenses,
      solde: revenus - depenses,
      tauxEpargne: revenus > 0 ? Math.round(((revenus - depenses) / revenus) * 1000) / 10 : 0,
      tresorerie
    });
  }

  const courante = periodes[periodes.length - 1];
  const debutCourant = new Date(courante.debut);
  const finCourant = new Date(courante.fin);
  const mouvementsCourants = operations.filter(o => {
    const date = new Date(o.date);
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

  const recettes = typeof construireAnalyseRecettes2026_ === 'function'
    ? construireAnalyseRecettes2026_(operations, categoriesRef)
    : null;
  const depensesDetail = typeof construireAnalyseDepenses2026_ === 'function'
    ? construireAnalyseDepenses2026_(operations, categoriesRef, chargesFixes)
    : null;

  return {
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
    }
  };
}
