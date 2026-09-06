const BUDGETSOFT_GLOBAL_ACCESS_VERSION='2026-09-06.1';

/**
 * Lecture commune du dernier snapshot global publié.
 * Pendant une reconstruction globale, on retourne volontairement null afin que
 * les moteurs propriétaires recalculent depuis les sources de la révision en cours.
 */
function lireEtatGlobalBudgetSoftSiDisponible20260906_(){
  try{
    const ctx=typeof BUDGETSOFT_READ_CONTEXT_ACTIVE_!=='undefined'?BUDGETSOFT_READ_CONTEXT_ACTIVE_:null;
    if(ctx&&String(ctx.label||'')==='budgetsoft-global-snapshot')return null;
    if(typeof chargerSnapshotGlobalBudgetSoft20260906!=='function')return null;
    const s=chargerSnapshotGlobalBudgetSoft20260906();
    const e=s&&s.disponible&&s.etat;
    if(!e||e.ok!==true||e.publie!==true||!e.revisionBudgetSoft)return null;
    return e;
  }catch(err){return null;}
}

function lireModuleSnapshotGlobalBudgetSoft20260906_(nom){
  const e=lireEtatGlobalBudgetSoftSiDisponible20260906_();
  const module=e&&e.modules&&e.modules[String(nom||'')];
  if(!module)return null;
  const r=JSON.parse(JSON.stringify(module));
  r.revisionBudgetSoft=e.revisionBudgetSoft;
  r.genereLeBudgetSoft=e.genereLe||'';
  r.sourceBudgetSoft='snapshot_global';
  return r;
}

function lireTransversalesSnapshotGlobalBudgetSoft20260906_(){
  const e=lireEtatGlobalBudgetSoftSiDisponible20260906_();
  if(!e)return null;
  return {revisionBudgetSoft:e.revisionBudgetSoft,genereLeBudgetSoft:e.genereLe||'',sourceBudgetSoft:'snapshot_global',transversales:JSON.parse(JSON.stringify(e.transversales||{}))};
}

function auditerLectureSnapshotGlobalBudgetSoft20260906(){
  const t0=Date.now(),e=lireEtatGlobalBudgetSoftSiDisponible20260906_();
  const r={ok:!!e,version:BUDGETSOFT_GLOBAL_ACCESS_VERSION,dureeMs:Date.now()-t0,revisionBudgetSoft:e&&e.revisionBudgetSoft||'',genereLe:e&&e.genereLe||'',modules:e&&e.modules?Object.keys(e.modules):[]};
  console.log(JSON.stringify(r));return r;
}
