function chargerDashboardSyntheseV3BudgetSoft20260907(){
  try{
    if(typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'){
      const d=lireModuleSnapshotGlobalBudgetSoft20260906_('dashboard');
      if(d&&String(d.version||'')===BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION){
        d.source='snapshot_global';d.sourceBudgetSoft='snapshot_global';return d;
      }
    }
  }catch(e){}
  const executer=function(){
    const sources=chargerToutesLesDonnees();
    const comptes=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828();
    const maintenant=new Date(),finCourant=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(maintenant):new Date(maintenant.getFullYear(),maintenant.getMonth(),27);
    const finSuivant=new Date(finCourant.getFullYear(),finCourant.getMonth()+1,finCourant.getDate());
    const tres=construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,finCourant,maintenant);
    const proj=typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function'?construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(finSuivant):null;
    const cer=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;
    const exp=typeof chargerVueCerbereExpressSansContexte20260827_==='function'?chargerVueCerbereExpressSansContexte20260827_():null;
    const r=composerDashboardSyntheseBudgetSoft20260907_({sources:sources,comptes:comptes,tresorerieComptable:tres,projectionEtendue:proj,cerbere:cer,cerbereExpress:exp});
    r.source='recalcul_secours';r.sourceBudgetSoft='recalcul_secours';return r;
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('dashboard-synthese-v3-secours',executer):executer();
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
