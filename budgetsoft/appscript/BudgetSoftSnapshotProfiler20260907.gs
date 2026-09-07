const BUDGETSOFT_SNAPSHOT_PROFILER_VERSION='2026-09-07.1';

/**
 * Profile la reconstruction du snapshot sans publier de nouvelle révision.
 * Utilise le même label de contexte que la reconstruction afin que les modules
 * snapshot-first exécutent bien leur calcul propriétaire et non le snapshot déjà publié.
 */
function profilerReconstructionSnapshotBudgetSoft20260907(){
  verifierInitialisation_();
  const total0=Date.now();
  const mesures={};
  const erreurs=[];
  const executer=function(){
    function mesurer(nom,fn){
      const t=Date.now();
      try{
        const valeur=typeof fn==='function'?fn():null;
        mesures[nom]={dureeMs:Date.now()-t,ok:true};
        return valeur;
      }catch(e){
        const msg=String(e&&e.message||e);
        mesures[nom]={dureeMs:Date.now()-t,ok:false,erreur:msg};
        erreurs.push({module:nom,erreur:msg});
        return null;
      }
    }

    const sources=mesurer('sources',()=>chargerToutesLesDonnees());
    const comptes=mesurer('comptes',()=>{
      if(typeof rafraichirSnapshotComptes20260828==='function'){
        const r=rafraichirSnapshotComptes20260828();
        return r&&r.vue?r.vue:r;
      }
      return typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828();
    });
    const credits=mesurer('credits',()=>typeof chargerCreditsEtDettesV2==='function'?chargerCreditsEtDettesV2():null);
    const dashboard=mesurer('dashboard',()=>typeof chargerDashboardReelV2==='function'?chargerDashboardReelV2():(typeof chargerDashboardReel==='function'?chargerDashboardReel():null));
    const patrimoine=mesurer('patrimoine',()=>typeof composerPatrimoineCanoniqueBudgetSoft20260906_==='function'?composerPatrimoineCanoniqueBudgetSoft20260906_(sources,comptes,credits):chargerPatrimoine());
    const cibleFinCycle=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(new Date()):new Date();
    const tresorerieComptable=mesurer('tresorerieComptable',()=>typeof construireTresorerieComptableCanoniqueBudgetSoft20260906_==='function'?construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,cibleFinCycle,new Date()):null);
    const projectionEtendue=mesurer('projectionEtendue',()=>typeof chargerTresorerieFinCycle20260830==='function'?chargerTresorerieFinCycle20260830():null);
    const cerbere=mesurer('cerbere',()=>typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null);
    const cerbereExpress=mesurer('cerbereExpress',()=>typeof chargerVueCerbereExpressSansContexte20260827_==='function'?chargerVueCerbereExpressSansContexte20260827_():null);
    const modules={comptes,credits,dashboard,patrimoine,tresorerieComptable,projectionEtendue,cerbere,cerbereExpress};
    mesurer('transversales',()=>typeof construireTransversalesBudgetSoft20260906_==='function'?construireTransversalesBudgetSoft20260906_(Object.assign({sources:sources},modules)):{});
    return true;
  };

  if(typeof avecContexteLectureBudgetSoft20260827_==='function')avecContexteLectureBudgetSoft20260827_('budgetsoft-global-snapshot',executer);else executer();
  const ordre=Object.keys(mesures).map(n=>({module:n,dureeMs:mesures[n].dureeMs,ok:mesures[n].ok})).sort((a,b)=>b.dureeMs-a.dureeMs);
  const r={ok:erreurs.length===0,version:BUDGETSOFT_SNAPSHOT_PROFILER_VERSION,dureeTotaleMs:Date.now()-total0,mesures:mesures,ordre:ordre,erreurs:erreurs};
  console.log('[PROFILE Snapshot BudgetSoft] '+JSON.stringify(r));
  return r;
}
