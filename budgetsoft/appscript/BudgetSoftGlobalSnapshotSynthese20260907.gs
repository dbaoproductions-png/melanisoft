const BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION='2026-09-07.1';

function reconstruireSnapshotGlobalSyntheseBudgetSoft20260907(origine){
  verifierInitialisation_();
  const lock=LockService.getDocumentLock();
  if(!lock.tryLock(3000))return{ok:false,version:BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION,enCours:true,message:'Une reconstruction BudgetSoft est déjà en cours.'};
  const t0=Date.now(),perf={};
  try{
    const construire=function(){
      const genereLe=new Date().toISOString(),modules={},erreurs=[];
      function prendre(nom,fn){const t=Date.now();try{const v=fn();modules[nom]=v;perf[nom]=Date.now()-t;return v;}catch(e){perf[nom]=Date.now()-t;const x={module:nom,erreur:String(e&&e.message||e)};erreurs.push(x);modules[nom]={ok:false,erreur:x.erreur};return modules[nom];}}
      const sources=prendre('sources',()=>chargerToutesLesDonnees());
      modules.sourceMeta={version:sources&&sources.meta&&sources.meta.version||'',tables:{}};Object.keys(sources||{}).forEach(k=>{if(Array.isArray(sources[k]))modules.sourceMeta.tables[k]=sources[k].length;});
      const comptes=prendre('comptes',()=>{if(typeof rafraichirSnapshotComptes20260828==='function'){const r=rafraichirSnapshotComptes20260828();return r&&r.vue?r.vue:r;}return typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828();});
      const credits=prendre('credits',()=>typeof chargerCreditsEtDettesV2==='function'?chargerCreditsEtDettesV2():null);
      const patrimoine=prendre('patrimoine',()=>typeof composerPatrimoineCanoniqueBudgetSoft20260906_==='function'?composerPatrimoineCanoniqueBudgetSoft20260906_(sources,comptes,credits):chargerPatrimoine());
      const maintenant=new Date(),finCourant=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(maintenant):new Date(maintenant.getFullYear(),maintenant.getMonth(),27),finSuivant=new Date(finCourant.getFullYear(),finCourant.getMonth()+1,finCourant.getDate());
      const tresorerieComptable=prendre('tresorerieComptable',()=>typeof construireTresorerieComptableCanoniqueBudgetSoft20260906_==='function'?construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,finCourant,maintenant):null);
      const projectionEtendue=prendre('projectionEtendue',()=>typeof chargerTresoreriePrevisionnelle20260830==='function'?chargerTresoreriePrevisionnelle20260830(Utilities.formatDate(finSuivant,Session.getScriptTimeZone(),'yyyy-MM-dd')):null);
      const cerbere=prendre('cerbere',()=>typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null);
      const cerbereExpress=prendre('cerbereExpress',()=>typeof chargerVueCerbereExpressSansContexte20260827_==='function'?chargerVueCerbereExpressSansContexte20260827_():null);
      const dashboard=prendre('dashboard',()=>composerDashboardSyntheseBudgetSoft20260907_({sources:sources,comptes:comptes,credits:credits,tresorerieComptable:tresorerieComptable,projectionEtendue:projectionEtendue,cerbere:cerbere,cerbereExpress:cerbereExpress}));
      const transversales=prendre('transversales',()=>typeof construireTransversalesBudgetSoft20260906_==='function'?construireTransversalesBudgetSoft20260906_(Object.assign({sources:sources},modules)):{});
      if(tresorerieComptable&&transversales&&transversales.tresorerie)transversales.tresorerie={version:tresorerieComptable.version||'',soldeReel:Number(tresorerieComptable.soldeReel),variationComptableCertaine:Number(tresorerieComptable.variationComptableCertaine),soldePrevisionnel:Number(tresorerieComptable.soldePrevisionnel),dateCible:tresorerieComptable.dateCible||'',nombreOperationsFutures:Number(tresorerieComptable.nombreOperationsFutures||0)};
      const provisoire={modules:modules,erreurs:erreurs,transversales:transversales},coherence=typeof auditerCoherenceRevisionBudgetSoft20260906_==='function'?auditerCoherenceRevisionBudgetSoft20260906_(provisoire):{ok:true,version:'absent',erreurs:[],avertissements:[]},revision=empreinteRevisionGlobaleBudgetSoft20260906_(genereLe,modules);
      return serialiserEtatGlobalBudgetSoft20260906_({ok:erreurs.length===0&&coherence.ok===true,publie:false,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,versionConstructeur:BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION,versionDoctrine:'2026-09-06',revisionBudgetSoft:revision,genereLe:genereLe,origine:String(origine||'manuel_synthese'),erreurs:erreurs,coherence:coherence,transversales:transversales,modules:modules,performance:{dureeMs:Date.now()-t0,modules:perf}});
    };
    const etat=typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('budgetsoft-global-snapshot-synthese',construire):construire();
    if(!etat||!etat.revisionBudgetSoft)throw new Error('Etat global BudgetSoft synthèse invalide.');
    if(etat.ok!==true){etat.publie=false;etat.message='Nouvelle révision synthèse non publiée : ancienne révision conservée.';console.log('[SNAPSHOT Synthese] '+JSON.stringify({ok:false,dureeMs:Date.now()-t0,performance:perf,erreurs:etat.erreurs,coherence:etat.coherence}));return etat;}
    etat.publie=true;ecrireSnapshotGlobalBudgetSoft20260906_(etat);archiverEtatBudgetSoftSiNecessaire20260906_(etat,String(origine||'manuel_synthese'));
    console.log('[SNAPSHOT Synthese] '+JSON.stringify({ok:true,revisionBudgetSoft:etat.revisionBudgetSoft,dureeMs:Date.now()-t0,performance:perf,dashboardVersion:dashboard&&dashboard.version}));return etat;
  }finally{lock.releaseLock();}
}
function actualiserBudgetSoftSyntheseMaintenant20260907(){return reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('manuel_force_synthese');}
function auditerSnapshotDashboardSynthesePublie20260907(){const s=chargerSnapshotGlobalBudgetSoft20260906(),e=s&&s.disponible&&s.etat,m=e&&e.modules||{},d=m.dashboard||{};const r={ok:!!(e&&e.ok&&d.version===BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION),revisionBudgetSoft:e&&e.revisionBudgetSoft||'',dashboardVersion:d.version||'',versionCorrection:d.versionCorrection||'',solde:d.courtTerme&&d.courtTerme.soldeBancaire,pilotable:d.courtTerme&&d.courtTerme.pilotableDisponible,progression:d.courtTerme&&d.courtTerme.progression,performance:e&&e.performance||null};console.log(JSON.stringify(r));return r;}
