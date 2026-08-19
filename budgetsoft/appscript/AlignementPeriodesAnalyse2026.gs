const ALIGNEMENT_PERIODES_ANALYSE_VERSION = '2026-08-19.1';

function alignerAnalysesSurPeriodes2026_(recettes, depensesDetail, operations, categoriesRef, periodesBudgetaires) {
  const periodes = Array.isArray(periodesBudgetaires) ? periodesBudgetaires : [];
  const ops = Array.isArray(operations) ? operations : [];
  const nb = periodes.length;
  if (![3, 6, 12].includes(nb) || !periodes.length) return { recettes: recettes, depensesDetail: depensesDetail };

  const debut = dateMetier2026_(periodes[0].debut);
  const fin = dateMetier2026_(periodes[periodes.length - 1].fin);
  if (!debut || !fin) return { recettes: recettes, depensesDetail: depensesDetail };

  const dansFenetre = ops.filter(o => {
    const d = dateMetier2026_(o.date);
    return d && d >= debut && d <= fin;
  });

  if (recettes && recettes.fenetres) {
    const types = Object.fromEntries((categoriesRef || []).map(c => [String(c.nom || '').trim(), String(c.type || '').toLowerCase()]));
    let economiques = 0, structurels = 0, variables = 0, sauvetages = 0;
    const producteurs = { Patrick: 0, Madame: 0, Foyer: 0 };
    const sources = {};
    const periodesAvecSauvetage = new Set();

    dansFenetre.forEach(o => {
      const montant = Number(o.montant || 0);
      const cat = String(o.categorie || '').trim();
      if (montant > 0 && cat === 'Crédits de trésorerie') {
        sauvetages += montant;
        const d = dateMetier2026_(o.date);
        const idx = periodes.findIndex(p => {
          const pd = dateMetier2026_(p.debut), pf = dateMetier2026_(p.fin);
          return pd && pf && d >= pd && d <= pf;
        });
        if (idx >= 0) periodesAvecSauvetage.add(idx);
        return;
      }
      if (montant <= 0 || !estCategorieRevenuEconomique2026_(cat, types[cat])) return;
      economiques += montant;
      if (estRevenuStructurel2026_(cat)) structurels += montant;
      if (estRevenuVariable2026_(cat)) variables += montant;
      const prod = producteurRevenu2026_(cat);
      producteurs[prod] += montant;
      sources[cat || 'Autres'] = (sources[cat || 'Autres'] || 0) + montant;
    });

    recettes.fenetres[nb] = {
      mois: nb,
      debut: debut,
      fin: fin,
      revenusEconomiques: economiques,
      moyenneMensuelle: economiques / nb,
      revenusStructurels: structurels,
      revenusVariables: variables,
      partVariable: economiques > 0 ? variables / economiques * 100 : 0,
      producteurs: producteurs,
      sources: Object.entries(sources).map(([nom, montant]) => ({ nom: nom, montant: montant })).sort((a, b) => b.montant - a.montant),
      remboursementsProfessionnelsNeutralises: 0,
      creditsTresorerie: sauvetages,
      moisAvecSauvetage: periodesAvecSauvetage.size,
      dependanceCredit: economiques > 0 ? sauvetages / economiques * 100 : 0,
      alignementPeriodes: ALIGNEMENT_PERIODES_ANALYSE_VERSION
    };
  }

  if (depensesDetail && depensesDetail.fenetres) {
    const p = lireParametresMetier2026_();
    const dep = dansFenetre.filter(o => Number(o.montant || 0) < 0);
    const montantCat = cat => dep.filter(o => String(o.categorie || '').trim() === cat).reduce((s, o) => s + Math.abs(Number(o.montant || 0)), 0);
    const santeOps = dep.filter(o => String(o.categorie || '').trim() === 'Santé');
    const couverture = santeOps.filter(o => /MNT|AUDIENS/.test(texteMetier2026_(o))).reduce((s, o) => s + Math.abs(Number(o.montant || 0)), 0);
    const santeBrute = santeOps.reduce((s, o) => s + Math.abs(Number(o.montant || 0)), 0);
    const rembSante = dansFenetre.filter(o => Number(o.montant || 0) > 0 && String(o.categorie || '').trim() === 'Remboursements santé').reduce((s, o) => s + Number(o.montant || 0), 0);
    const pluxee = pluxeeFenetre2026_(nb, p);
    const coursesBanque = montantCat('Courses');
    const restaurantsBanque = montantCat('Restaurants');
    const themes = {
      'Logement': montantCat('Logements'),
      'Alimentation / quotidien': coursesBanque + pluxee.courses + montantCat('Dépenses diverses'),
      'Transport': montantCat('Transports') + montantCat('Voitures'),
      'Santé nette': Math.max(0, santeBrute - rembSante),
      'Assurances': montantCat('Assurances'),
      'Crédits / financement': montantCat('Crédits') + montantCat('Crédits revolving'),
      'Frais professionnels': montantCat('Frais professionnels'),
      'Loisirs / consommation': montantCat('Loisirs') + restaurantsBanque + pluxee.restaurants + montantCat('Voyages / vacances') + montantCat('Achats personnels'),
      'Impôts': montantCat('Impôts'),
      'Énergie': montantCat('Énergies'),
      'Abonnements / numérique': montantCat('Télécom / Internet / TV') + montantCat('Abonnements numériques')
    };

    depensesDetail.fenetres[nb] = {
      mois: nb,
      debut: debut,
      fin: fin,
      alimentation: {
        coursesBanque: coursesBanque,
        restaurantsBanque: restaurantsBanque,
        pluxeeCourses: pluxee.courses,
        pluxeeRestaurants: pluxee.restaurants,
        pluxeeTotal: pluxee.total,
        pluxeeMode: pluxee.mode,
        coursesReelles: coursesBanque + pluxee.courses,
        restaurantsReels: restaurantsBanque + pluxee.restaurants,
        totalReel: coursesBanque + restaurantsBanque + pluxee.total
      },
      sante: {
        soinsEtCouvertureBruts: santeBrute,
        couvertureMntAudiens: couverture,
        soinsBruts: Math.max(0, santeBrute - couverture),
        remboursements: rembSante,
        coutNet: Math.max(0, santeBrute - rembSante)
      },
      themes: Object.entries(themes).map(([nom, montant]) => ({ nom: nom, montant: montant })).sort((a, b) => b.montant - a.montant),
      alignementPeriodes: ALIGNEMENT_PERIODES_ANALYSE_VERSION
    };
  }

  return { recettes: recettes, depensesDetail: depensesDetail };
}
