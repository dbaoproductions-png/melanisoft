const BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION='2026-09-07.7';

function reconstruireSnapshotGlobalSyntheseBudgetSoft20260907(origine){
  verifierInitialisation_();
  const lock=LockService.getDocumentLock();
  if(!lock.tryLock(3000))return{ok:false,version:BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION,enCours:true,message:'Une reconstruction BudgetSoft est déjà en cours.'};
  const t0=Date.now(),perf={};
  try{
    const construire=function(){
      const genereLe=new Date().toISOString(),modules={},erreurs=[];
      function prendre(nom,fn){const t=Date.now();try{const v=fn();modules[nom]=v;perf[nom]=Date.now()-t;return v;}catch(e){perf[nom]=Date.now()-t;const x={module:nom,erreur:String(e&&e.message||e)};erreurs.push(x);modules[nom]={ok:false,erreur:x.erreur};return modules[nom];}}
      const tSources=Date.now();let sources;
      try{sources=chargerToutesLesDonnees();perf.sources=Date.now()-tSources;}
      catch(e){perf.sources=Date.now()-tSources;const x={module:'sources',erreur:String(e&&e.message||e)};erreurs.push(x);sources={};}
      modules.sourceMeta={version:sources&&sources.meta&&sources.meta.version||'',tables:{}};
      Object.keys(sources||{}).forEach(k=>{if(Array.isArray(sources[k]))modules.sourceMeta.tables[k]=sources[k].length;});

      const comptes=prendre('comptes',()=>{if(typeof rafraichirSnapshotComptes20260828==='function'){const r=rafraichirSnapshotComptes20260828();return r&&r.vue?r.vue:r;}return typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828();});
      const credits=prendre('credits',()=>typeof chargerCreditsEtDettesV2==='function'?chargerCreditsEtDettesV2():null);
      const patrimoine=prendre('patrimoine',()=>typeof composerPatrimoineCanoniqueBudgetSoft20260906_==='function'?composerPatrimoineCanoniqueBudgetSoft20260906_(sources,comptes,credits):chargerPatrimoine());
      const maintenant=new Date(),finCourant=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(maintenant):new Date(maintenant.getFullYear(),maintenant.getMonth(),27),finSuivant=new Date(finCourant.getFullYear(),finCourant.getMonth()+1,finCourant.getDate());
      const cibleSuivante=Utilities.formatDate(finSuivant,Session.getScriptTimeZone(),'yyyy-MM-dd');
      const tresorerieComptable=prendre('tresorerieComptable',()=>typeof construireTresorerieComptableCanoniqueBudgetSoft20260906_==='function'?construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,finCourant,maintenant):null);

      // Propriétaire unique : la trajectoire canonique encapsule le moteur doctrinal
      // 20260901 et applique le contrat anti-régression du 07/09/2026.
      const projectionEtendue=prendre('projectionEtendue',()=>{
        if(typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907!=='function')return{ok:false,erreur:'Propriétaire canonique de trésorerie absent.'};
        return construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cibleSuivante);
      });
      if(!projectionEtendue||projectionEtendue.ok===false)erreurs.push({module:'projectionEtendue',erreur:String(projectionEtendue&&projectionEtendue.erreur||'Projection canonique invalide'),diagnostic:projectionEtendue&&projectionEtendue.decompositionCanonique||null});

      const gardeRecettesCanoniques=prendre('gardeRecettesCanoniques',()=>{
        if(typeof auditerGardeRecettesCanoniquesBudgetSoft20260908!=='function')return{ok:false,erreur:'Garde métier R0 absente.'};
        return auditerGardeRecettesCanoniquesBudgetSoft20260908(projectionEtendue);
      });
      if(!gardeRecettesCanoniques||gardeRecettesCanoniques.ok!==true)erreurs.push({module:'gardeRecettesCanoniques',erreur:'Invariant métier R0 non satisfait',diagnostic:gardeRecettesCanoniques||null});

      const cerbere=prendre('cerbere',()=>typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null);
      const soldeReelUnifie=Number(projectionEtendue&&projectionEtendue.soldeReel);
      if(cerbere&&Number.isFinite(soldeReelUnifie)){
        cerbere.reel=cerbere.reel||{};
        cerbere.reel.soldeBancaire=soldeReelUnifie;
        cerbere.reel.sourceSoldeBancaire='projectionEtendue.soldeReel';
      }

      const cerbereExpress=prendre('cerbereExpress',()=>typeof chargerVueCerbereExpressSansContexte20260827_==='function'?chargerVueCerbereExpressSansContexte20260827_():null);
      const dashboard=prendre('dashboard',()=>composerDashboardSyntheseBudgetSoft20260907_({sources:sources,comptes:comptes,credits:credits,tresorerieComptable:tresorerieComptable,projectionEtendue:projectionEtendue,cerbere:cerbere,cerbereExpress:cerbereExpress}));
      const transversales=prendre('transversales',()=>typeof construireTransversalesBudgetSoft20260906_==='function'?construireTransversalesBudgetSoft20260906_(Object.assign({sources:sources},modules)):{});
      if(tresorerieComptable&&transversales&&transversales.tresorerie)transversales.tresorerie={version:tresorerieComptable.version||'',soldeReel:Number(tresorerieComptable.soldeReel),variationComptableCertaine:Number(tresorerieComptable.variationComptableCertaine),soldePrevisionnel:Number(tresorerieComptable.soldePrevisionnel),dateCible:tresorerieComptable.dateCible||'',nombreOperationsFutures:Number(tresorerieComptable.nombreOperationsFutures||0)};

      const unite=typeof auditerUniteModulesTresorerieBudgetSoft20260907_==='function'?auditerUniteModulesTresorerieBudgetSoft20260907_(modules):{ok:false,erreur:'Garde unité trésorerie absente'};
      modules.uniteTresorerie=unite;
      if(!unite.ok)erreurs.push({module:'uniteTresorerie',erreur:'Divergence inter-modules ou propriétaire canonique non conforme',diagnostic:unite});

      const contrat=projectionEtendue&&projectionEtendue.decompositionCanonique||null;
      if(!contrat||contrat.ok!==true)erreurs.push({module:'contratTresorerieCanonique',erreur:'Décomposition canonique absente ou non réconciliée',diagnostic:contrat});

      const provisoire={modules:modules,erreurs:erreurs,transversales:transversales},coherence=typeof auditerCoherenceRevisionBudgetSoft20260906_==='function'?auditerCoherenceRevisionBudgetSoft20260906_(provisoire):{ok:true,version:'absent',erreurs:[],avertissements:[]},revision=empreinteRevisionGlobaleBudgetSoft20260906_(genereLe,modules);
      return serialiserEtatGlobalBudgetSoft20260906_({ok:erreurs.length===0&&coherence.ok===true&&unite.ok===true&&contrat&&contrat.ok===true&&gardeRecettesCanoniques&&gardeRecettesCanoniques.ok===true,publie:false,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,versionConstructeur:BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION,versionDoctrine:'2026-09-06',versionDoctrineTresorerie:'2026-09-07-canonique',revisionBudgetSoft:revision,genereLe:genereLe,origine:String(origine||'manuel_synthese'),erreurs:erreurs,coherence:coherence,uniteTresorerie:unite,transversales:transversales,modules:modules,performance:{dureeMs:Date.now()-t0,modules:perf}});
    };
    const etat=typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('budgetsoft-global-snapshot',construire):construire();
    if(!etat||!etat.revisionBudgetSoft)throw new Error('Etat global BudgetSoft synthèse invalide.');
    if(etat.ok!==true){etat.publie=false;etat.message='Nouvelle révision non publiée : doctrine/unité/contrat/garde R0 non garantis ; ancienne révision conservée.';console.log('[SNAPSHOT Synthese] '+JSON.stringify({ok:false,dureeMs:Date.now()-t0,performance:perf,erreurs:etat.erreurs,coherence:etat.coherence,uniteTresorerie:etat.uniteTresorerie,contratTresorerie:etat.modules&&etat.modules.projectionEtendue&&etat.modules.projectionEtendue.decompositionCanonique||null,gardeRecettesCanoniques:etat.modules&&etat.modules.gardeRecettesCanoniques||null}));return etat;}
    etat.publie=true;ecrireSnapshotGlobalBudgetSoft20260906_(etat);archiverEtatBudgetSoftSiNecessaire20260906_(etat,String(origine||'manuel_synthese'));
    const dash=etat.modules&&etat.modules.dashboard||{},proj=etat.modules&&etat.modules.projectionEtendue||{};console.log('[SNAPSHOT Synthese] '+JSON.stringify({ok:true,revisionBudgetSoft:etat.revisionBudgetSoft,dureeMs:Date.now()-t0,performance:perf,dashboardVersion:dash.version||'',projectionVersion:proj.version||'',projectionOwner:proj.proprietaireBudgetSoft||'',contratVersion:proj.versionContratCanonique||'',gardeRecettesCanoniques:etat.modules&&etat.modules.gardeRecettesCanoniques||null,uniteTresorerie:etat.uniteTresorerie,sourceBruteStockee:!!(etat.modules&&etat.modules.sources)}));return etat;
  }finally{lock.releaseLock();}
}
function actualiserBudgetSoftSyntheseMaintenant20260907(){return reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('manuel_force_synthese');}
function auditerSnapshotDashboardSynthesePublie20260907(){const s=chargerSnapshotGlobalBudgetSoft20260906(),e=s&&s.disponible&&s.etat,m=e&&e.modules||{},d=m.dashboard||{},p=m.projectionEtendue||{},contrat=p.decompositionCanonique||null,g=m.gardeRecettesCanoniques||null;const r={ok:!!(e&&e.ok&&e.uniteTresorerie&&e.uniteTresorerie.ok&&contrat&&contrat.ok&&g&&g.ok&&d.version===BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION&&!m.sources),revisionBudgetSoft:e&&e.revisionBudgetSoft||'',dashboardVersion:d.version||'',versionCorrection:d.versionCorrection||'',projectionVersion:p.version||'',projectionOwner:p.proprietaireBudgetSoft||'',contratVersion:p.versionContratCanonique||'',versionDoctrineTresorerie:e&&e.versionDoctrineTresorerie||'',gardeRecettesCanoniques:g,uniteTresorerie:e&&e.uniteTresorerie||null,contratTresorerie:contrat,solde:d.courtTerme&&d.courtTerme.soldeBancaire,pilotable:d.courtTerme&&d.courtTerme.pilotableDisponible,progression:d.courtTerme&&d.courtTerme.progression,sourceBruteStockee:!!m.sources,performance:e&&e.performance||null};console.log(JSON.stringify(r));return r;}
