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
    const proj=typeof chargerTresoreriePrevisionnelle20260830==='function'?chargerTresoreriePrevisionnelle20260830(Utilities.formatDate(finSuivant,Session.getScriptTimeZone(),'yyyy-MM-dd')):null;
    const cer=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;
    const exp=typeof chargerVueCerbereExpressSansContexte20260827_==='function'?chargerVueCerbereExpressSansContexte20260827_():null;
    const r=composerDashboardSyntheseBudgetSoft20260907_({sources:sources,comptes:comptes,tresorerieComptable:tres,projectionEtendue:proj,cerbere:cer,cerbereExpress:exp});
    r.source='recalcul_secours';r.sourceBudgetSoft='recalcul_secours';return r;
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('dashboard-synthese-v3-secours',executer):executer();
}
function auditerDashboardSyntheseV3BudgetSoft20260907(){const t0=Date.now(),d=chargerDashboardSyntheseV3BudgetSoft20260907(),r={ok:!!(d&&d.ok!==false),version:d&&d.version||'',source:d&&d.source||d&&d.sourceBudgetSoft||'',revisionBudgetSoft:d&&d.revisionBudgetSoft||'',dureeMs:Date.now()-t0,courant:d&&d.courtTerme||null,suivant:d&&d.cycleSuivant||null,precedent:d&&d.cyclePrecedent||null};console.log(JSON.stringify(r));return r;}
