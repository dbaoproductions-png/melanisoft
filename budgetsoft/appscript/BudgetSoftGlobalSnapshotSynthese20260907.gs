const BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION='2026-09-11.1';

/**
 * Adapte le chargeur Cerbère classique à une base déjà calculée sans modifier son
 * API publique. Le remplacement est strictement local et restauré dans finally.
 */
function composerCerbereCockpitDepuisBaseSnapshotBudgetSoft20260910_(base){
  if(!base||base.ok===false)return base;
  if(typeof chargerCerbereCockpit20260902!=='function')return base;
  if(typeof chargerCerbereV374!=='function')return chargerCerbereCockpit20260902();
  const chargeurOriginal=chargerCerbereV374;
  try{
    chargerCerbereV374=function(){return base;};
    return chargerCerbereCockpit20260902();
  }finally{
    chargerCerbereV374=chargeurOriginal;
  }
}

/**
 * Optimisation 2026-09-11.1 : sur le seul chemin snapshot, Cerbère réutilise les
 * tableaux déjà chargés par chargerToutesLesDonnees(). Les chargeurs autonomes
 * V33/V374 restent inchangés. Les substitutions sont strictement locales et
 * restaurées dans finally.
 */
function trouverTableSnapshotCerbere20260911_(sources,nom){
  if(!sources||typeof sources!=='object')return null;
  const cible=String(nom||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const cles=Object.keys(sources);
  for(let i=0;i<cles.length;i++){
    const k=cles[i],nk=String(k).toLowerCase().replace(/[^a-z0-9]/g,'');
    if(nk===cible&&Array.isArray(sources[k]))return{cle:k,valeur:sources[k]};
  }
  return null;
}

function chargerCerbereBaseDepuisSourcesSnapshotBudgetSoft20260911_(sources){
  const chargeurBase=typeof chargerCerbereV374==='function'?chargerCerbereV374:(typeof chargerCerbereV37==='function'?chargerCerbereV37:null);
  if(!chargeurBase)return{base:null,partage:false,reutilisees:[]};
  if(typeof lireTable_!=='function'||typeof lireTablePlanCerbere_!=='function'||typeof lireFeuilleDynamiqueCerbereV3_!=='function'||typeof lireAjustementsCerbereV33_!=='function')return{base:chargeurBase(),partage:false,reutilisees:[]};

  const map={},reutilisees=[];
  ['Operations','Charges_fixes','Comptes','Parametres','Categories'].forEach(function(n){
    const x=trouverTableSnapshotCerbere20260911_(sources,n);
    if(x){map[n]=x.valeur;reutilisees.push({table:n,source:x.cle,lignes:x.valeur.length});}
  });

  const prechargePlan={
    objectifs:lireTablePlanCerbere_('Plan_Objectifs'),
    actions:lireFeuilleDynamiqueCerbereV3_('Plan_Actions'),
    evenements:lireTablePlanCerbere_('Plan_Evenements'),
    ajustements:lireAjustementsCerbereV33_()
  };
  const originaux={lireTable:lireTable_,lirePlanTable:lireTablePlanCerbere_,lirePlanDyn:lireFeuilleDynamiqueCerbereV3_,lireAjust:lireAjustementsCerbereV33_};
  try{
    lireTable_=function(nom){const n=String(nom||'');return Object.prototype.hasOwnProperty.call(map,n)?map[n]:originaux.lireTable.apply(this,arguments);};
    lireTablePlanCerbere_=function(nom){const n=String(nom||'');if(n==='Plan_Objectifs')return prechargePlan.objectifs;if(n==='Plan_Evenements')return prechargePlan.evenements;return originaux.lirePlanTable.apply(this,arguments);};
    lireFeuilleDynamiqueCerbereV3_=function(nom){if(String(nom||'')==='Plan_Actions')return prechargePlan.actions;return originaux.lirePlanDyn.apply(this,arguments);};
    lireAjustementsCerbereV33_=function(){return prechargePlan.ajustements;};
    return{base:chargeurBase(),partage:true,reutilisees:reutilisees};
  }finally{
    lireTable_=originaux.lireTable;
    lireTablePlanCerbere_=originaux.lirePlanTable;
    lireFeuilleDynamiqueCerbereV3_=originaux.lirePlanDyn;
    lireAjustementsCerbereV33_=originaux.lireAjust;
  }
}

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
      const finBancaireSuivante=new Date(finSuivant.getFullYear(),finSuivant.getMonth()+1,0,23,59,59,999);
      const cibleSuivante=Utilities.formatDate(finSuivant,Session.getScriptTimeZone(),'yyyy-MM-dd');
      const cibleCalculUnique=Utilities.formatDate(finBancaireSuivante,Session.getScriptTimeZone(),'yyyy-MM-dd');
      const tresorerieComptable=prendre('tresorerieComptable',()=>typeof construireTresorerieComptableCanoniqueBudgetSoft20260906_==='function'?construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,finCourant,maintenant):null);

      // Une seule base Cerbère brute alimente d'abord la projection CB multi-cycle,
      // puis le cockpit/Express. Depuis 2026-09-11.1, cette base réutilise les données
      // déjà chargées par le snapshot ; les chargeurs autonomes restent inchangés.
      let cerbereBase=null,cerbereBaseMs=0,cerberePartageDonnees=false,cerbereTablesReutilisees=[];
      const tCerbereBase=Date.now();
      try{
        const charge=chargerCerbereBaseDepuisSourcesSnapshotBudgetSoft20260911_(sources);
        cerbereBase=charge&&charge.base||null;
        cerberePartageDonnees=!!(charge&&charge.partage);
        cerbereTablesReutilisees=charge&&charge.reutilisees||[];
      }catch(e){cerbereBase=null;cerberePartageDonnees=false;cerbereTablesReutilisees=[];}
      cerbereBaseMs=Date.now()-tCerbereBase;

      let projectionCalculUnique=null;
      const projectionEtendue=prendre('projectionEtendue',()=>{
        if(typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907!=='function')return{ok:false,erreur:'Propriétaire canonique de trésorerie absent.'};
        if(typeof sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_!=='function')return{ok:false,erreur:'Sous-vue canonique anti-régression absente.'};
        projectionCalculUnique=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cibleCalculUnique,cerbereBase&&cerbereBase.ok!==false?cerbereBase:null);
        if(!projectionCalculUnique||projectionCalculUnique.ok===false)return projectionCalculUnique;
        return sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_(projectionCalculUnique,cibleSuivante);
      });
      if(!projectionEtendue||projectionEtendue.ok===false)erreurs.push({module:'projectionEtendue',erreur:String(projectionEtendue&&projectionEtendue.erreur||'Projection canonique invalide'),diagnostic:projectionEtendue&&projectionEtendue.decompositionCanonique||null});

      const gardeRecettesCanoniques=prendre('gardeRecettesCanoniques',()=>{
        if(typeof auditerGardeRecettesCanoniquesBudgetSoft20260908!=='function')return{ok:false,erreur:'Garde métier R0 absente.'};
        return auditerGardeRecettesCanoniquesBudgetSoft20260908(projectionEtendue);
      });
      if(!gardeRecettesCanoniques||gardeRecettesCanoniques.ok!==true)erreurs.push({module:'gardeRecettesCanoniques',erreur:'Invariant métier R0 non satisfait',diagnostic:gardeRecettesCanoniques||null});

      const gardeCbMultiCycle=prendre('gardeCbMultiCycle',()=>{
        if(typeof verifierGardeCbMultiCycleDepuisProjectionBudgetSoft20260910_!=='function')return{ok:false,erreur:'Garde CB multi-cycle sur projection précalculée absente.'};
        return verifierGardeCbMultiCycleDepuisProjectionBudgetSoft20260910_(projectionCalculUnique,finSuivant);
      });
      if(!gardeCbMultiCycle||gardeCbMultiCycle.ok!==true)erreurs.push({module:'gardeCbMultiCycle',erreur:'Invariant CB multi-cycle non satisfait',diagnostic:gardeCbMultiCycle||null});

      const cerbere=prendre('cerbere',()=>{
        if(cerbereBase&&cerbereBase.ok!==false)return composerCerbereCockpitDepuisBaseSnapshotBudgetSoft20260910_(cerbereBase);
        return typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;
      });
      perf.cerbere=Number(perf.cerbere||0)+cerbereBaseMs;
      const soldeReelUnifie=Number(projectionEtendue&&projectionEtendue.soldeReel);
      if(cerbere&&Number.isFinite(soldeReelUnifie)){
        cerbere.reel=cerbere.reel||{};
        cerbere.reel.soldeBancaire=soldeReelUnifie;
        cerbere.reel.sourceSoldeBancaire='projectionEtendue.soldeReel';
      }

      const cerbereExpress=prendre('cerbereExpress',()=>{
        if(typeof composerCerbereExpressDepuisCockpit20260910_!=='function')return{ok:false,erreur:'Compositeur Express depuis Cerbère précalculé absent.'};
        return composerCerbereExpressDepuisCockpit20260910_(cerbere);
      });
      const dashboard=prendre('dashboard',()=>composerDashboardSyntheseBudgetSoft20260907_({sources:sources,comptes:comptes,credits:credits,tresorerieComptable:tresorerieComptable,projectionEtendue:projectionEtendue,cerbere:cerbere,cerbereExpress:cerbereExpress}));
      const transversales=prendre('transversales',()=>typeof construireTransversalesBudgetSoft20260906_==='function'?construireTransversalesBudgetSoft20260906_(Object.assign({sources:sources},modules)):{});
      if(tresorerieComptable&&transversales&&transversales.tresorerie)transversales.tresorerie={version:tresorerieComptable.version||'',soldeReel:Number(tresorerieComptable.soldeReel),variationComptableCertaine:Number(tresorerieComptable.variationComptableCertaine),soldePrevisionnel:Number(tresorerieComptable.soldePrevisionnel),dateCible:tresorerieComptable.dateCible||'',nombreOperationsFutures:Number(tresorerieComptable.nombreOperationsFutures||0)};

      const unite=typeof auditerUniteModulesTresorerieBudgetSoft20260907_==='function'?auditerUniteModulesTresorerieBudgetSoft20260907_(modules):{ok:false,erreur:'Garde unité trésorerie absente'};
      modules.uniteTresorerie=unite;
      if(!unite.ok)erreurs.push({module:'uniteTresorerie',erreur:'Divergence inter-modules ou propriétaire canonique non conforme',diagnostic:unite});

      const contrat=projectionEtendue&&projectionEtendue.decompositionCanonique||null;
      if(!contrat||contrat.ok!==true)erreurs.push({module:'contratTresorerieCanonique',erreur:'Décomposition canonique absente ou non réconciliée',diagnostic:contrat});

      modules.optimisationProjectionUnique={version:'2026-09-10.1',active:true,ciblePublication:cibleSuivante,cibleCalculUnique:cibleCalculUnique,sousVueSansRecalculMetier:!!(projectionEtendue&&projectionEtendue.optimisationSnapshot&&projectionEtendue.optimisationSnapshot.sansRecalculMetier),gardeCbSansRecalculMetier:!!(gardeCbMultiCycle&&gardeCbMultiCycle.sansRecalculMetier)};
      modules.optimisationExpressDepuisCerbere={version:'2026-09-10.1',active:true,sansRecalculCerbere:true,source:'cerbere déjà calculé par le snapshot'};
      modules.optimisationCerberePartage={version:'2026-09-10.1',active:!!(cerbereBase&&cerbereBase.ok!==false),uneSeuleBaseCerbere:true,projectionDepuisBasePrecalculee:!!(projectionCalculUnique&&projectionCalculUnique.diagnostic20260831&&projectionCalculUnique.diagnostic20260831.cerberePrechargeProjection),cockpitDepuisMemeBase:!!(cerbereBase&&cerbereBase.ok!==false),dureeBaseCerbereMs:cerbereBaseMs};
      modules.optimisationCerbereDonneesPartagees={version:'2026-09-11.1',active:cerberePartageDonnees,source:'chargerToutesLesDonnees',chargeursAutonomesInchanges:true,reutilisation:cerbereTablesReutilisees,dureeBaseCerbereMs:cerbereBaseMs};
      const provisoire={modules:modules,erreurs:erreurs,transversales:transversales},coherence=typeof auditerCoherenceRevisionBudgetSoft20260906_==='function'?auditerCoherenceRevisionBudgetSoft20260906_(provisoire):{ok:true,version:'absent',erreurs:[],avertissements:[]},revision=empreinteRevisionGlobaleBudgetSoft20260906_(genereLe,modules);
      return serialiserEtatGlobalBudgetSoft20260906_({ok:erreurs.length===0&&coherence.ok===true&&unite.ok===true&&contrat&&contrat.ok===true&&gardeRecettesCanoniques&&gardeRecettesCanoniques.ok===true&&gardeCbMultiCycle&&gardeCbMultiCycle.ok===true,publie:false,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,versionConstructeur:BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION,versionDoctrine:'2026-09-06',versionDoctrineTresorerie:'2026-09-07-canonique',revisionBudgetSoft:revision,genereLe:genereLe,origine:String(origine||'manuel_synthese'),erreurs:erreurs,coherence:coherence,uniteTresorerie:unite,transversales:transversales,modules:modules,performance:{dureeMs:Date.now()-t0,modules:perf}});
    };
    const etat=typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('budgetsoft-global-snapshot',construire):construire();
    if(!etat||!etat.revisionBudgetSoft)throw new Error('Etat global BudgetSoft synthèse invalide.');
    if(etat.ok!==true){etat.publie=false;etat.message='Nouvelle révision non publiée : doctrine/unité/contrat/gardes R0 et CB multi-cycle non garantis ; ancienne révision conservée.';console.log('[SNAPSHOT Synthese] '+JSON.stringify({ok:false,dureeMs:Date.now()-t0,performance:perf,erreurs:etat.erreurs,coherence:etat.coherence,uniteTresorerie:etat.uniteTresorerie,contratTresorerie:etat.modules&&etat.modules.projectionEtendue&&etat.modules.projectionEtendue.decompositionCanonique||null,gardeRecettesCanoniques:etat.modules&&etat.modules.gardeRecettesCanoniques||null,gardeCbMultiCycle:etat.modules&&etat.modules.gardeCbMultiCycle||null}));return etat;}
    etat.publie=true;ecrireSnapshotGlobalBudgetSoft20260906_(etat);archiverEtatBudgetSoftSiNecessaire20260906_(etat,String(origine||'manuel_synthese'));
    const dash=etat.modules&&etat.modules.dashboard||{},proj=etat.modules&&etat.modules.projectionEtendue||{};console.log('[SNAPSHOT Synthese] '+JSON.stringify({ok:true,revisionBudgetSoft:etat.revisionBudgetSoft,dureeMs:Date.now()-t0,performance:perf,dashboardVersion:dash.version||'',projectionVersion:proj.version||'',projectionOwner:proj.proprietaireBudgetSoft||'',contratVersion:proj.versionContratCanonique||'',optimisationProjectionUnique:etat.modules&&etat.modules.optimisationProjectionUnique||null,optimisationExpressDepuisCerbere:etat.modules&&etat.modules.optimisationExpressDepuisCerbere||null,optimisationCerberePartage:etat.modules&&etat.modules.optimisationCerberePartage||null,optimisationCerbereDonneesPartagees:etat.modules&&etat.modules.optimisationCerbereDonneesPartagees||null,gardeRecettesCanoniques:etat.modules&&etat.modules.gardeRecettesCanoniques||null,gardeCbMultiCycle:etat.modules&&etat.modules.gardeCbMultiCycle||null,uniteTresorerie:etat.uniteTresorerie,sourceBruteStockee:!!(etat.modules&&etat.modules.sources)}));return etat;
  }finally{lock.releaseLock();}
}
function actualiserBudgetSoftSyntheseMaintenant20260907(){return reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('manuel_force_synthese');}
function auditerSnapshotDashboardSynthesePublie20260907(){const s=chargerSnapshotGlobalBudgetSoft20260906(),e=s&&s.disponible&&s.etat,m=e&&e.modules||{},d=m.dashboard||{},p=m.projectionEtendue||{},contrat=p.decompositionCanonique||null,g=m.gardeRecettesCanoniques||null,gcb=m.gardeCbMultiCycle||null;const r={ok:!!(e&&e.ok&&e.uniteTresorerie&&e.uniteTresorerie.ok&&contrat&&contrat.ok&&g&&g.ok&&gcb&&gcb.ok&&d.version===BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION&&!m.sources),revisionBudgetSoft:e&&e.revisionBudgetSoft||'',dashboardVersion:d.version||'',versionCorrection:d.versionCorrection||'',projectionVersion:p.version||'',projectionOwner:p.proprietaireBudgetSoft||'',contratVersion:p.versionContratCanonique||'',versionDoctrineTresorerie:e&&e.versionDoctrineTresorerie||'',gardeRecettesCanoniques:g,gardeCbMultiCycle:gcb,optimisationProjectionUnique:m.optimisationProjectionUnique||null,optimisationExpressDepuisCerbere:m.optimisationExpressDepuisCerbere||null,optimisationCerberePartage:m.optimisationCerberePartage||null,optimisationCerbereDonneesPartagees:m.optimisationCerbereDonneesPartagees||null,uniteTresorerie:e&&e.uniteTresorerie||null,contratTresorerie:contrat,solde:d.courtTerme&&d.courtTerme.soldeBancaire,pilotable:d.courtTerme&&d.courtTerme.pilotableDisponible,progression:d.courtTerme&&d.courtTerme.progression,sourceBruteStockee:!!m.sources,performance:e&&e.performance||null};console.log(JSON.stringify(r));return r;}