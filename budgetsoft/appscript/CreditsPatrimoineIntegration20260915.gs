const CREDITS_PATRIMOINE_INTEGRATION_20260915_VERSION='2026-09-21.1';

/**
 * Vue d'intégration strictement en lecture seule entre Crédits et Patrimoine.
 * Aucun calcul métier de dette n'est recréé ici : Crédits reste propriétaire de
 * l'endettement et Patrimoine consomme exactement cette valeur dans la même
 * révision du snapshot global.
 */
function chargerCreditsPatrimoineIntegres20260915(){
  const etat=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
  const credits=etat&&etat.modules&&etat.modules.credits||null;
  const patrimoine=etat&&etat.modules&&etat.modules.patrimoine||null;
  const revisionBudgetSoft=String(etat&&etat.revisionBudgetSoft||'');
  const sourceBudgetSoft=etat?'snapshot_global':'snapshot_global_indisponible';

  const r=n=>Math.round(Number(n||0)*100)/100;
  const endettementTotal=r(credits&&credits.endettementTotal);
  const totalDettesPatrimoine=r(patrimoine&&patrimoine.totalDettes);
  const patrimoineTotal=r(patrimoine&&patrimoine.totalActifs);
  const patrimoineNet=r(patrimoine&&patrimoine.patrimoineNet);
  const ecartDette=r(totalDettesPatrimoine-endettementTotal);
  const ecartNet=r(patrimoineNet-(patrimoineTotal-endettementTotal));

  return{
    ok:!!(credits&&patrimoine)&&Math.abs(ecartDette)<=.01&&Math.abs(ecartNet)<=.01,
    version:CREDITS_PATRIMOINE_INTEGRATION_20260915_VERSION,
    lectureSeule:true,
    sourceBudgetSoft,
    revisionBudgetSoft,
    credits,
    patrimoine,
    coherence:{endettementTotal,totalDettesPatrimoine,patrimoineTotal,patrimoineNet,ecartDette,ecartNet},
    erreur:credits&&patrimoine?'':'Crédits ou Patrimoine absents du snapshot global.'
  };
}

function auditerCreditsPatrimoineIntegres20260915(){
  const r=chargerCreditsPatrimoineIntegres20260915();
  const out={
    ok:r.ok,
    version:r.version,
    lectureSeule:r.lectureSeule,
    sourceBudgetSoft:r.sourceBudgetSoft,
    revisionBudgetSoft:r.revisionBudgetSoft,
    coherence:r.coherence
  };
  console.log('[AUDIT CREDITS PATRIMOINE] '+JSON.stringify(out));
  return out;
}
