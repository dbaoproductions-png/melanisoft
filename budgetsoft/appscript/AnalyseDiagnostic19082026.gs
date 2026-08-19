function diagnostiquerAnalyses19082026(nombrePeriodes) {
  const t0 = Date.now();
  const etapes = [];
  const note = (nom, extra) => {
    const ligne = Object.assign({ etape: nom, ms: Date.now() - t0 }, extra || {});
    etapes.push(ligne);
    console.log(JSON.stringify(ligne));
  };

  try {
    verifierInitialisation_();
    note('initialisation');

    const operationsBrutes = lireTable_('Operations');
    note('lecture_operations', { lignes: operationsBrutes.length });

    const budgets = lireTable_('Budget');
    note('lecture_budget', { lignes: budgets.length });

    const parametres = lireTable_('Parametres');
    note('lecture_parametres', { lignes: parametres.length });

    const categoriesRef = lireTable_('Categories');
    note('lecture_categories', { lignes: categoriesRef.length });

    const chargesFixes = lireTable_('Charges_fixes');
    note('lecture_charges_fixes', { lignes: chargesFixes.length });

    const operations = operationsBrutes.map(o => {
      const copie = Object.assign({}, o);
      copie.date_analyse = copie.date_comptable || copie.date;
      return copie;
    });
    note('preparation_operations');

    const dictionnaire = Object.fromEntries(parametres.map(p => [String(p.cle), p.valeur]));
    const jour = bornerJourBudgetaire_(dictionnaire.jour_debut_mois || 28);
    const nb = Math.max(3, Math.min(12, parseInt(nombrePeriodes, 10) || 6));
    const aujourdHui = new Date();
    const datesValides = operations.map(o => new Date(o.date_analyse)).filter(d => !isNaN(d) && d <= aujourdHui).sort((a, b) => b - a);
    const maintenant = datesValides.length ? datesValides[0] : aujourdHui;
    note('reference_temporelle', { nb: nb, maintenant: maintenant.toISOString() });

    for (let recul = nb - 1; recul >= 0; recul--) {
      const avant = Date.now();
      const reference = new Date(maintenant.getFullYear(), maintenant.getMonth() - recul, 15);
      const periode = calculerPeriodeBudgetaireAvecSalaire_(reference, jour, operationsBrutes);
      note('periode_' + recul, {
        dureeEtapeMs: Date.now() - avant,
        debut: periode && periode.debut,
        fin: periode && periode.fin
      });
    }

    const avantRecettes = Date.now();
    const operationsMetier = operations.map(o => Object.assign({}, o, { date: o.date_analyse }));
    const recettes = typeof construireAnalyseRecettes2026_ === 'function'
      ? construireAnalyseRecettes2026_(operationsMetier, categoriesRef)
      : null;
    note('analyse_recettes', { dureeEtapeMs: Date.now() - avantRecettes, disponible: !!recettes });

    const avantDepenses = Date.now();
    const depenses = typeof construireAnalyseDepenses2026_ === 'function'
      ? construireAnalyseDepenses2026_(operationsMetier, categoriesRef, chargesFixes)
      : null;
    note('analyse_depenses', { dureeEtapeMs: Date.now() - avantDepenses, disponible: !!depenses });

    note('termine', { totalMs: Date.now() - t0 });
    const resume = { ok: true, totalMs: Date.now() - t0, etapes: etapes };
    console.log(JSON.stringify(resume, null, 2));
    return resume;
  } catch (e) {
    const erreur = {
      ok: false,
      totalMs: Date.now() - t0,
      erreur: e && e.stack ? e.stack : String(e),
      etapes: etapes
    };
    console.log(JSON.stringify(erreur, null, 2));
    throw e;
  }
}
