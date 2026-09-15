const CREDITS_PATRIMOINE_INTEGRATION_20260915_VERSION='2026-09-15.1';

/**
 * Vue d'intégration strictement en lecture seule entre Crédits et Patrimoine.
 * Aucun calcul métier de dette n'est recréé ici : Crédits reste propriétaire de
 * l'endettement et Patrimoine consomme exactement cette valeur dans la même
 * révision du snapshot global.
 */
function chargerCreditsPatrimoineIntegres20260915(){
  let credits=null,patrimoine=null,revisionBudgetSoft='',sourceBudgetSoft='recalcul_secours';
  if(typeof chargerSnapshotGlobalBudgetSoft20260906==='function'){
    const s=chargerSnapshotGlobalBudgetSoft20260906();
    const e=s&&s.disponible&&s.etat;
    if(e&&e.ok===true&&e.publie===true&&e.modules){
      credits=e.modules.credits||null;
      patrimoine=e.modules.patrimoine||null;
      revisionBudgetSoft=String(e.revisionBudgetSoft||'');
      sourceBudgetSoft='snapshot_global';
    }
  }
  if(!credits&&typeof chargerCreditsEtDettesV2==='function')credits=chargerCreditsEtDettesV2();
  if(!patrimoine&&typeof chargerPatrimoine==='function')patrimoine=chargerPatrimoine();

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
    coherence:{
      endettementTotal,
      totalDettesPatrimoine,
      patrimoineTotal,
      patrimoineNet,
      ecartDette,
      ecartNet
    }
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
