function chargerDashboardSyntheseV3BudgetSoft20260907(){
  try{
    if(typeof lireModuleSnapshotGlobalBudgetSoft20260906_!=='function')return{ok:false,sourceBudgetSoft:'snapshot_global_indisponible',erreur:'Accès snapshot global indisponible.'};
    const d=lireModuleSnapshotGlobalBudgetSoft20260906_('dashboard');
    if(!d)return{ok:false,sourceBudgetSoft:'snapshot_global_indisponible',erreur:'Dashboard absent du snapshot global.'};
    if(String(d.version||'')!==String(BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION))return{ok:false,sourceBudgetSoft:'snapshot_global_incompatible',revisionBudgetSoft:String(d.revisionBudgetSoft||''),erreur:'Version Dashboard du snapshot incompatible.'};
    d.source='snapshot_global';d.sourceBudgetSoft='snapshot_global';
    return typeof corrigerSemantiqueDashboardBudgetSoft20260907_==='function'?corrigerSemantiqueDashboardBudgetSoft20260907_(d):d;
  }catch(e){
    return{ok:false,sourceBudgetSoft:'snapshot_global_erreur',erreur:String(e&&e.message||e)};
  }
}
function auditerDashboardSyntheseV3BudgetSoft20260907(){const t0=Date.now(),d=chargerDashboardSyntheseV3BudgetSoft20260907(),r={ok:!!(d&&d.ok!==false),version:d&&d.version||'',source:d&&d.source||d&&d.sourceBudgetSoft||'',revisionBudgetSoft:d&&d.revisionBudgetSoft||'',dureeMs:Date.now()-t0,courant:d&&d.courtTerme||null,suivant:d&&d.cycleSuivant||null,precedent:d&&d.cyclePrecedent||null};console.log(JSON.stringify(r));return r;}

/**
 * Valeur d'affichage partagée Cerbère / Cerbère Express.
 * Lecture stricte du snapshot Dashboard : aucun recalcul métier, aucun fallback.
 */
function lirePilotableParJourDashboardSnapshotBudgetSoft20260909(){
  try{
    if(typeof lireModuleSnapshotGlobalBudgetSoft20260906_!=='function')return{ok:false,disponible:false,raison:'snapshot_indisponible'};
    const d=lireModuleSnapshotGlobalBudgetSoft20260906_('dashboard');
    const c=d&&d.courtTerme||null;
    const n=c&&Number(c.pilotableParJour);
    return{ok:Number.isFinite(n),disponible:Number.isFinite(n),pilotableParJour:Number.isFinite(n)?Math.round(n*100)/100:null,source:'dashboard_snapshot',revisionBudgetSoft:String(d&&d.revisionBudgetSoft||'')};
  }catch(e){return{ok:false,disponible:false,raison:String(e&&e.message||e)};}
}
