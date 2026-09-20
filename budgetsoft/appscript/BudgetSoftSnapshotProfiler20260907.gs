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
    const comptes=mesurer('comptes',()=>typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828());
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

function estChampVolatilProfilCerbere20260911_(cle,chemin){
  const k=String(cle||'').toLowerCase(),p=String(chemin||'').toLowerCase();
  if(['duree_ms','dureems','serializationms','generele','generatedat','timestamp','horodatage'].includes(k))return true;
  if(/(^|\.)(timings?|performance|performancepost35|performancev37)(\.|$)/.test(p))return true;
  return false;
}

function normaliserObjetProfilCerbere20260911_(v,chemin){
  if(v===null||v===undefined)return v;
  if(v instanceof Date)return v.toISOString();
  if(Array.isArray(v))return v.map(function(x,i){return normaliserObjetProfilCerbere20260911_(x,(chemin||'')+'['+i+']');});
  if(typeof v!=='object')return v;
  const out={};
  Object.keys(v).sort().forEach(function(k){
    const p=(chemin?chemin+'.':'')+k;
    if(estChampVolatilProfilCerbere20260911_(k,p))return;
    out[k]=normaliserObjetProfilCerbere20260911_(v[k],p);
  });
  return out;
}

function premieresDifferencesProfilCerbere20260911_(a,b,limite){
  const diffs=[],max=Number(limite||20);
  function walk(x,y,path){
    if(diffs.length>=max)return;
    if(x===y)return;
    const ax=Array.isArray(x),ay=Array.isArray(y);
    if(ax!==ay){diffs.push({chemin:path,typeA:typeof x,typeB:typeof y});return;}
    if(ax){
      if(x.length!==y.length)diffs.push({chemin:path+'.length',a:x.length,b:y.length});
      for(let i=0;i<Math.min(x.length,y.length)&&diffs.length<max;i++)walk(x[i],y[i],path+'['+i+']');
      return;
    }
    const ox=x&&typeof x==='object',oy=y&&typeof y==='object';
    if(ox!==oy){diffs.push({chemin:path,typeA:typeof x,typeB:typeof y});return;}
    if(ox){
      const ks=Array.from(new Set(Object.keys(x).concat(Object.keys(y)))).sort();
      ks.forEach(function(k){if(diffs.length<max){if(!Object.prototype.hasOwnProperty.call(x,k)||!Object.prototype.hasOwnProperty.call(y,k))diffs.push({chemin:path+'.'+k,presentA:Object.prototype.hasOwnProperty.call(x,k),presentB:Object.prototype.hasOwnProperty.call(y,k)});else walk(x[k],y[k],path?path+'.'+k:k);}});
      return;
    }
    diffs.push({chemin:path,a:x,b:y});
  }
  walk(a,b,'');
  return diffs;
}

function auditerProfilInterneCerbereV374StableBudgetSoft20260911(){
  const etapes={},tGlobal=Date.now();
  function chrono(nom,fn){const t=Date.now(),v=fn();etapes[nom]=Date.now()-t;return v;}
  const tA=Date.now();
  const baseline=avecContexteLectureBudgetSoft20260827_('audit-profil-cerbere-v374-stable-baseline-20260911',function(){return chargerCerbereV374();});
  const baselineMs=Date.now()-tA;
  const statsBaseline=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const instrumente=avecContexteLectureBudgetSoft20260827_('audit-profil-cerbere-v374-stable-etapes-20260911',function(){
    let base=chrono('chargerCerbereV37',function(){return chargerCerbereV37();});
    base=chrono('resteReellementPilotableV374',function(){return appliquerResteReellementPilotableV374_(base);});
    base=chrono('auditCerbereV377',function(){return typeof appliquerAuditCerbereV377_==='function'?appliquerAuditCerbereV377_(base):base;});
    base=chrono('historiqueR0V378',function(){return typeof appliquerHistoriqueR0V378_==='function'?appliquerHistoriqueR0V378_(base):base;});
    base=chrono('rapprochementV3711',function(){return typeof appliquerRapprochementCerbereV3711_==='function'?appliquerRapprochementCerbereV3711_(base):base;});
    base=chrono('doctrineCycleV3712',function(){return typeof appliquerDoctrineCycleV3712_==='function'?appliquerDoctrineCycleV3712_(base):base;});
    base=chrono('conventionSalaireV3712',function(){return typeof appliquerConventionSalaireTousCyclesV3712_==='function'?appliquerConventionSalaireTousCyclesV3712_(base):base;});
    base=chrono('projectionFrontiereV3713',function(){return typeof appliquerProjectionFrontiereV3713_==='function'?appliquerProjectionFrontiereV3713_(base):base;});
    base=chrono('correctionFrontiereV3713b',function(){return typeof corrigerProjectionFrontiereV3713b_==='function'?corrigerProjectionFrontiereV3713b_(base):base;});
    base=chrono('effetsFinanciersActionsV3713',function(){return typeof corrigerEffetsFinanciersActionsV3713_==='function'?corrigerEffetsFinanciersActionsV3713_(base):base;});
    base=chrono('stabilisationV3716',function(){return stabiliserCerbereV3716_(base);});
    base=chrono('stabilisationV3724',function(){return stabiliserCerbereV3717_(base);});
    if(base&&typeof base==='object')base.version=CERBERE_PILOTAGE_V374_VERSION;
    return chrono('serialisationClient',function(){return serialiserCerberePourClient_(base);});
  });
  const statsEtapes=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const a=normaliserObjetProfilCerbere20260911_(baseline,''),b=normaliserObjetProfilCerbere20260911_(instrumente,'');
  const identique=JSON.stringify(a)===JSON.stringify(b),diffs=identique?[]:premieresDifferencesProfilCerbere20260911_(a,b,20);
  const total=Object.keys(etapes).reduce(function(s,k){return s+Number(etapes[k]||0);},0);
  const classement=Object.keys(etapes).map(function(k){return{etape:k,dureeMs:Number(etapes[k]||0),partPct:total?Math.round(Number(etapes[k]||0)/total*1000)/10:null};}).sort(function(x,y){return y.dureeMs-x.dureeMs;});
  const periodes=(instrumente&&instrumente.periodes||[]).map(function(p){const v=p&&p.v37||{};return{cle:String(p&&p.periode&&p.periode.cle||p&&p.periode&&p.periode.debut||''),ret1:Math.round(Number(v.ret1||0)*100)/100,sct1:Math.round(Number(v.sct1||0)*100)/100,restePilotable:Math.round(Number(p&&p.resteBudgetPilotable||0)*100)/100};});
  const out={ok:identique&&!!(instrumente&&instrumente.ok!==false),version:'2026-09-11.3',lectureSeule:true,aucuneModification:true,perimetre:{compare:'chargerCerbereV374() courant vs reconstruction instrumentée couche par couche',sourceVerite:'chargerCerbereV374 / CerberePilotageV374.gs',moteurAttendu:'3.7.24',comparaison:'payload complet hors seuls champs volatils performance/horodatage, dont diagnostic.performanceV37'},comparaison:{identiqueMetierStable:identique,differences:diffs,versionBaseline:String(baseline&&baseline.version||''),versionInstrumentee:String(instrumente&&instrumente.version||''),nombrePeriodesBaseline:(baseline&&baseline.periodes||[]).length,nombrePeriodesInstrumentee:(instrumente&&instrumente.periodes||[]).length},temps:{baselineMs:baselineMs,reconstructionEtapesMs:total,dureeTotaleMs:Date.now()-tGlobal},etapes:etapes,classement:classement,lectures:{baseline:statsBaseline,etapes:statsEtapes},signatureMetier:{periodes:periodes},decision:identique?'PROFIL_CERBERE_VALIDE_POUR_CHOISIR_LEVIER':'PROFIL_CERBERE_INVALIDE_NE_RIEN_OPTIMISER',doctrine:'Profil uniquement. Aucun calcul métier modifié. Les champs ignorés sont limités aux métriques de performance/horodatage ; toute optimisation devra ensuite passer un A/B strict puis les gardes du snapshot.'};
  console.log('[AUDIT PERF profil interne Cerbère V374 stable] '+JSON.stringify(out));return out;
}

function auditerProfilInterneCerbereV37BudgetSoft20260911(){
  const tGlobal=Date.now();
  const t0=Date.now();
  const baseline=avecContexteLectureBudgetSoft20260827_('audit-profil-cerbere-v37-baseline-20260911',function(){return chargerCerbereV37();});
  const baselineMs=Date.now()-t0;
  const statsBaseline=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const mesures={};
  function ajouter(nom,ms){const x=mesures[nom]||(mesures[nom]={appels:0,dureeMs:0});x.appels++;x.dureeMs+=ms;}
  const originaux={roulant:chargerCerbereRoulant,lireTable:lireTable_,lirePlan:typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_:null,dedup:typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_:null,previsions:previsionsEvenementsV371_,serialiser:serialiserCerberePourClient_};
  let instrumente=null,erreur=null,instrumenteMs=0;
  try{
    chargerCerbereRoulant=function(){const t=Date.now();try{return originaux.roulant.apply(this,arguments);}finally{ajouter('chargerCerbereRoulant',Date.now()-t);}};
    lireTable_=function(nom){const t=Date.now();try{return originaux.lireTable.apply(this,arguments);}finally{ajouter('lireTable:'+String(nom||''),Date.now()-t);}};
    if(originaux.lirePlan)lireFeuilleDynamiquePlan_=function(nom){const t=Date.now();try{return originaux.lirePlan.apply(this,arguments);}finally{ajouter('lirePlan:'+String(nom||''),Date.now()-t);}};
    if(originaux.dedup)dedoublonnerOperationsCartesBudgetSoft_=function(){const t=Date.now();try{return originaux.dedup.apply(this,arguments);}finally{ajouter('dedoublonnageOperations',Date.now()-t);}};
    previsionsEvenementsV371_=function(){const t=Date.now();try{return originaux.previsions.apply(this,arguments);}finally{ajouter('previsionsEvenementsV371',Date.now()-t);}};
    serialiserCerberePourClient_=function(){const t=Date.now();try{return originaux.serialiser.apply(this,arguments);}finally{ajouter('serialisationClient',Date.now()-t);}};
    const t1=Date.now();
    instrumente=avecContexteLectureBudgetSoft20260827_('audit-profil-cerbere-v37-instrumente-20260911',function(){return chargerCerbereV37();});
    instrumenteMs=Date.now()-t1;
  }catch(e){erreur=String(e&&e.stack||e&&e.message||e);}finally{
    chargerCerbereRoulant=originaux.roulant;lireTable_=originaux.lireTable;if(originaux.lirePlan)lireFeuilleDynamiquePlan_=originaux.lirePlan;if(originaux.dedup)dedoublonnerOperationsCartesBudgetSoft_=originaux.dedup;previsionsEvenementsV371_=originaux.previsions;serialiserCerberePourClient_=originaux.serialiser;
  }
  const statsInstrumente=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const a=normaliserObjetProfilCerbere20260911_(baseline,''),b=normaliserObjetProfilCerbere20260911_(instrumente,'');
  const identique=!erreur&&JSON.stringify(a)===JSON.stringify(b);
  const diffs=identique?[]:premieresDifferencesProfilCerbere20260911_(a,b,20);
  const roulantMs=Number(mesures.chargerCerbereRoulant&&mesures.chargerCerbereRoulant.dureeMs||0);
  const details=Object.keys(mesures).map(function(k){return{etape:k,appels:mesures[k].appels,dureeMs:mesures[k].dureeMs,partPct:instrumenteMs?Math.round(mesures[k].dureeMs/instrumenteMs*1000)/10:null};}).sort(function(x,y){return y.dureeMs-x.dureeMs;});
  const perfInterne=instrumente&&instrumente.diagnostic&&instrumente.diagnostic.performanceV37||null;
  const out={ok:identique&&!!(instrumente&&instrumente.ok!==false),version:'2026-09-11.4',lectureSeule:true,aucuneModification:true,perimetre:{compare:'chargerCerbereV37() courant vs le même chargeur avec enveloppes chronométriques temporaires',sourceVerite:'chargerCerbereV37 / CerbereV37.gs',objectif:'localiser le coût sans modifier les calculs métier'},comparaison:{identiqueMetierStable:identique,differences:diffs,versionBaseline:String(baseline&&baseline.version||''),versionInstrumentee:String(instrumente&&instrumente.version||'')},temps:{baselineMs:baselineMs,instrumenteMs:instrumenteMs,roulantInclusifMs:roulantMs,horsRoulantApproxMs:Math.max(0,instrumenteMs-roulantMs),dureeTotaleMs:Date.now()-tGlobal},details:details,performanceV37Existante:perfInterne,lectures:{baseline:statsBaseline,instrumente:statsInstrumente},erreur:erreur,decision:identique?'PROFIL_V37_VALIDE_POUR_CHOISIR_LEVIER':'PROFIL_V37_INVALIDE_NE_RIEN_OPTIMISER',doctrine:'Profil uniquement. Aucune optimisation de production appliquée ; tout candidat devra passer un A/B strict puis les gardes du snapshot.'};
  console.log('[AUDIT PERF profil interne Cerbère V37] '+JSON.stringify(out));return out;
}

function trouverTableSnapshotCerbereLegacyProfiler20260911_(sources,nom){
  if(!sources||typeof sources!=='object')return null;
  const cible=String(nom||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const cles=Object.keys(sources);
  for(let i=0;i<cles.length;i++){
    const k=cles[i],nk=String(k).toLowerCase().replace(/[^a-z0-9]/g,'');
    if(nk===cible&&Array.isArray(sources[k]))return{cle:k,valeur:sources[k]};
  }
  return null;
}

/**
 * A/B au périmètre réel du snapshot : après chargerToutesLesDonnees(), compare
 * le V374 actuel au même V374 qui réutilise directement les tableaux déjà présents
 * dans sources, plus un préchargement unique du Plan. Aucun chemin de production
 * n'est modifié. Les lecteurs sont restaurés en finally.
 */
function auditerCandidatCerbereSnapshotDonneesPartageesBudgetSoft20260911(){
  const tGlobal=Date.now();
  function executer(mode){
    return avecContexteLectureBudgetSoft20260827_('audit-ab-cerbere-snapshot-'+mode+'-20260911',function(){
      const tSources=Date.now(),sources=chargerToutesLesDonnees(),sourcesMs=Date.now()-tSources;
      if(mode==='baseline'){
        const t=Date.now(),base=chargerCerbereV374(),cerbereMs=Date.now()-t;
        return{sources:sources,base:base,sourcesMs:sourcesMs,cerbereMs:cerbereMs,stats:(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null),reutilisees:[]};
      }
      const prechargePlan={
        objectifs:lireTablePlanCerbere_('Plan_Objectifs'),
        actions:lireFeuilleDynamiqueCerbereV3_('Plan_Actions'),
        evenements:lireTablePlanCerbere_('Plan_Evenements'),
        ajustements:lireAjustementsCerbereV33_()
      };
      const originaux={lireTable:lireTable_,lirePlanTable:lireTablePlanCerbere_,lirePlanDyn:lireFeuilleDynamiqueCerbereV3_,lireAjust:lireAjustementsCerbereV33_};
      const map={},reutilisees=[];
      ['Operations','Charges_fixes','Comptes','Parametres','Categories'].forEach(function(n){const x=trouverTableSnapshotCerbere20260911_(sources,n);if(x){map[n]=x.valeur;reutilisees.push({table:n,source:x.cle,lignes:x.valeur.length});}});
      const empreinteAvant=JSON.stringify(map);
      let base=null,erreur=null,cerbereMs=0;
      try{
        lireTable_=function(nom){const n=String(nom||'');return Object.prototype.hasOwnProperty.call(map,n)?map[n]:originaux.lireTable.apply(this,arguments);};
        lireTablePlanCerbere_=function(nom){const n=String(nom||'');if(n==='Plan_Objectifs')return prechargePlan.objectifs;if(n==='Plan_Evenements')return prechargePlan.evenements;return originaux.lirePlanTable.apply(this,arguments);};
        lireFeuilleDynamiqueCerbereV3_=function(nom){if(String(nom||'')==='Plan_Actions')return prechargePlan.actions;return originaux.lirePlanDyn.apply(this,arguments);};
        lireAjustementsCerbereV33_=function(){return prechargePlan.ajustements;};
        const t=Date.now();base=chargerCerbereV374();cerbereMs=Date.now()-t;
      }catch(e){erreur=String(e&&e.stack||e&&e.message||e);}finally{
        lireTable_=originaux.lireTable;lireTablePlanCerbere_=originaux.lirePlanTable;lireFeuilleDynamiqueCerbereV3_=originaux.lirePlanDyn;lireAjustementsCerbereV33_=originaux.lireAjust;
      }
      const empreinteApres=JSON.stringify(map);
      return{sources:sources,base:base,sourcesMs:sourcesMs,cerbereMs:cerbereMs,stats:(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null),reutilisees:reutilisees,sourcesMutées:empreinteAvant!==empreinteApres,erreur:erreur};
    });
  }
  const baseline=executer('baseline'),candidat=executer('candidat');
  const a=normaliserObjetProfilCerbere20260911_(baseline.base,''),b=normaliserObjetProfilCerbere20260911_(candidat.base,'');
  const identique=!candidat.erreur&&JSON.stringify(a)===JSON.stringify(b),diffs=identique?[]:premieresDifferencesProfilCerbere20260911_(a,b,20);
  const gainMs=Number(baseline.cerbereMs||0)-Number(candidat.cerbereMs||0),gainPct=baseline.cerbereMs?Math.round(gainMs/baseline.cerbereMs*1000)/10:null;
  const out={
    ok:identique&&!candidat.sourcesMutées&&!!(candidat.base&&candidat.base.ok!==false),version:'2026-09-11.8',lectureSeule:true,aucuneModification:true,
    perimetre:{compare:'chemin snapshot courant après chargerToutesLesDonnees() vs V374 réutilisant directement les données déjà disponibles',reference:'même classeur, deux contextes de lecture indépendants',sourceVerite:'chargerCerbereV374 / snapshot actuel 2026-09-10.3',integrationCible:'snapshot uniquement ; V33/V374 autonomes inchangés'},
    comparaison:{identiqueMetierStable:identique,differences:diffs,sourcesMutées:!!candidat.sourcesMutées,versionBaseline:String(baseline.base&&baseline.base.version||''),versionCandidat:String(candidat.base&&candidat.base.version||'')},
    temps:{baselineSourcesMs:baseline.sourcesMs,baselineCerbereMs:baseline.cerbereMs,candidatSourcesMs:candidat.sourcesMs,candidatCerbereMs:candidat.cerbereMs,gainCerbereMs:gainMs,gainCerberePct:gainPct,dureeTotaleMs:Date.now()-tGlobal},
    reutilisationSnapshot:candidat.reutilisees,
    lectures:{baseline:baseline.stats,candidat:candidat.stats},
    erreur:candidat.erreur||null,
    decision:identique&&!candidat.sourcesMutées?'CANDIDAT_PARTAGE_SNAPSHOT_VALIDE_A_PASSER_AUX_GARDES':'CANDIDAT_PARTAGE_SNAPSHOT_REFUSE',
    doctrine:'A/B snapshot en lecture seule. Ne pas intégrer avant identité V374 stricte, absence de mutation des sources et validation des gardes du snapshot.'
  };
  console.log('[AUDIT A/B Cerbère données partagées snapshot] '+JSON.stringify(out));return out;
}


/**
 * Profil lecture seule du chemin Cerbère exact utilisé par le snapshot après
 * préchargement du socle V374. Aucun endpoint public snapshot-first n'est appelé :
 * on mesure séparément chaque couche métier du fallback frais.
 */
function auditerProfilCerberePostSocleSnapshotBudgetSoft20260920(){
  const tGlobal=Date.now(),temps={},erreurs=[];
  function chrono(nom,fn){
    const t=Date.now();
    try{
      const v=fn();
      temps[nom]=Date.now()-t;
      return v;
    }catch(e){
      temps[nom]=Date.now()-t;
      erreurs.push({etape:nom,erreur:String(e&&e.stack||e&&e.message||e)});
      return null;
    }
  }

  const sources=chrono('sources',function(){return chargerToutesLesDonnees();});
  if(!sources)return{ok:false,version:'2026-09-20.1',lectureSeule:true,erreurs:erreurs,temps:temps};

  const charge=chrono('cerbereBasePartagee',function(){
    return chargerCerbereBaseDepuisSourcesSnapshotBudgetSoft20260911_(sources);
  });
  const base=charge&&charge.base||null;
  if(!base||base.ok===false){
    const ko={ok:false,version:'2026-09-20.1',lectureSeule:true,aucuneModification:true,temps:temps,erreurs:erreurs.concat([{etape:'cerbereBasePartagee',erreur:'Base Cerbère indisponible'}])};
    console.log('[AUDIT PERF Cerbère post-socle snapshot 20260920] '+JSON.stringify(ko));
    return ko;
  }

  const original=chargerCerbereV374;
  let frais=null,normaliseSante=null,enrichi=null,publie=null,normaliseCf=null;
  try{
    chargerCerbereV374=function(){return base;};
    frais=chrono('cockpitP1FraisDepuisBase',function(){
      return recalculerCerbereCockpitP1Frais20260912_({contexteExterne:true});
    });
  }finally{
    chargerCerbereV374=original;
  }

  if(frais&&frais.ok!==false){
    normaliseSante=chrono('normalisationSante',function(){
      return typeof normaliserCerbereFraisPublic20260917_==='function'
        ?normaliserCerbereFraisPublic20260917_(frais)
        :frais;
    });
  }

  if(normaliseSante&&normaliseSante.ok!==false){
    enrichi=chrono('recettesCertainesDues',function(){
      return typeof enrichirCerbereRecettesCertainesDues20260919_==='function'
        ?enrichirCerbereRecettesCertainesDues20260919_(normaliseSante)
        :normaliseSante;
    });
  }

  if(enrichi&&enrichi.ok!==false){
    publie=chrono('publicationCartesEtResynchroSante',function(){
      return typeof publierPuisResynchroniserCerbereSante20260917_==='function'
        ?publierPuisResynchroniserCerbereSante20260917_(enrichi)
        :enrichi;
    });
  }

  if(publie&&publie.ok!==false){
    normaliseCf=chrono('normalisationCfSnapshot',function(){
      return typeof normaliserCerbereCfPourSnapshot20260914_==='function'
        ?normaliserCerbereCfPourSnapshot20260914_(publie,sources)
        :publie;
    });
  }

  const final=normaliseCf||publie||enrichi||normaliseSante||frais||base;
  const p1=final&&final.periodes&&final.periodes[0]||{};
  const c1=p1&&p1.v37&&p1.v37.cockpit20260902||{};
  const ep1=p1&&p1.enveloppePilotable||{};
  const p2=final&&final.periodes&&final.periodes[1]||{};
  const c2=p2&&p2.v37&&p2.v37.cockpit20260902||{};
  const totalMesure=Object.keys(temps).reduce(function(a,k){return a+Number(temps[k]||0);},0);
  const classement=Object.keys(temps).map(function(k){
    return{etape:k,dureeMs:Number(temps[k]||0),partPct:totalMesure?Math.round(Number(temps[k]||0)/totalMesure*1000)/10:null};
  }).sort(function(a,b){return b.dureeMs-a.dureeMs;});

  const out={
    ok:erreurs.length===0&&!!(final&&final.ok!==false),
    version:'2026-09-20.1',
    lectureSeule:true,
    aucuneModification:true,
    perimetre:'chemin Cerbère snapshot après partage des sources, sans lecture du snapshot global publié',
    partage:!!(charge&&charge.partage),
    tablesReutilisees:charge&&charge.reutilisees||[],
    temps:temps,
    classement:classement,
    dureeTotaleMs:Date.now()-tGlobal,
    signature:{
      version:String(final&&final.version||''),
      ep:Number(c1.ep!=null?c1.ep:ep1.allocation||0),
      epConsomme:Number(c1.epConsomme!=null?c1.epConsomme:ep1.consomme||0),
      epDisponible:Number(c1.epDisponible!=null?c1.epDisponible:ep1.reste||0),
      p1:Number(c1.pSoutenable!=null?c1.pSoutenable:c1.p1Total||0),
      p1Disponible:Number(c1.pDisponible!=null?c1.pDisponible:c1.ret1||0),
      p2:Number(c2.pSoutenable!=null?c2.pSoutenable:c2.p1Total||0),
      p2Disponible:Number(c2.pDisponible!=null?c2.pDisponible:c2.ret1||0)
    },
    erreurs:erreurs,
    decision:erreurs.length?'PROFIL_INVALIDE':'PROFIL_VALIDE_LOCALISER_GOULET',
    doctrine:'Profil uniquement. Aucune optimisation n’est intégrée par cette fonction.'
  };
  console.log('[AUDIT PERF Cerbère post-socle snapshot 20260920] '+JSON.stringify(out));
  return out;
}


function calculerEcheancesChargeFixeAjusteesPrecharge20260920_(charge,debut,fin,limite,ajustementsTous){
  const base=calculerEcheancesJusqua_(charge,debut,fin,limite).map(function(d){
    return{date:new Date(d),montant:Math.abs(Number(charge.montant||0)),ajustement:''};
  });
  const ajustements=(Array.isArray(ajustementsTous)?ajustementsTous:[]).filter(function(a){
    return String(a&&a.charge_fixe_id)===String(charge&&charge.id)&&convertirBooleen_(a&&a.actif);
  });
  const moisExclus=new Set();
  ajustements.filter(function(a){return String(a&&a.action)==='exclure_mois';}).forEach(function(a){
    String(a&&a.mois||'').split(',').forEach(function(m){
      const n=parseInt(m,10);if(n>=1&&n<=12)moisExclus.add(n);
    });
  });
  let ev=base.filter(function(e){return !moisExclus.has(e.date.getMonth()+1);});
  ajustements.forEach(function(a){
    const action=String(a&&a.action||'');if(action==='exclure_mois')return;
    const cible=String(a&&a.date_cible||'');if(!cible)return;
    const idx=ev.findIndex(function(e){return cleDateAjustement_(e.date)===cible;});
    if(action==='ignorer'){if(idx>=0)ev.splice(idx,1);return;}
    if(action==='montant'){if(idx>=0){ev[idx].montant=Math.abs(Number(a&&a.nouveau_montant||ev[idx].montant));ev[idx].ajustement=a.id;}return;}
    if(action==='reporter'){
      if(idx>=0)ev.splice(idx,1);
      const nd=dateLocaleBudgetSoft_(a&&a.nouvelle_date);
      if(!isNaN(nd)&&nd>=debut&&nd<=limite&&(!fin||nd<=fin)){
        ev.push({date:nd,montant:Math.abs(Number(a&&a.nouveau_montant||charge.montant||0)),ajustement:a.id});
      }
    }
  });
  return ev.sort(function(a,b){return a.date-b.date;});
}

function construireCfCanoniquePrechargeProfil20260920_(p,v,sources,ajustementsTous){
  const periode=p&&p.periode||p||{},debut=dateCfSnapshotBuild20260914_(periode.debut),fin=dateCfSnapshotBuild20260914_(periode.fin);
  if(!debut||!fin)return{ok:false,erreur:'bornes période invalides',total:Number(v&&v.cft1||0)};
  const charges=Array.isArray(sources&&sources.Charges_fixes)?sources.Charges_fixes:[],
        ops0=Array.isArray(sources&&sources.Operations)?sources.Operations:[],
        operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0,
        rapprochements=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[],
        liens={};
  (rapprochements||[]).forEach(function(r){
    if(!rapprochementValideCfSnapshotBuild20260914_(r))return;
    const op=String(r&&r.operation_id||'').trim(),cf=String(r&&r.charge_fixe_id||'').trim();
    if(op&&cf)liens[op]=cf;
  });
  const reels={};
  (operations||[]).forEach(function(o){
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||m>=0)return;
    const d=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):dateCfSnapshotBuild20260914_(o&&(o.date_comptable||o.date));
    if(!d||jourCfSnapshotBuild20260914_(d)<jourCfSnapshotBuild20260914_(debut)||jourCfSnapshotBuild20260914_(d)>jourCfSnapshotBuild20260914_(fin))return;
    const opId=String(o&&o.id||'').trim(),cfId=String(o&&o.charge_fixe_id||'').trim()||(opId&&liens[opId]||'');
    if(!cfId)return;
    if(!reels[cfId])reels[cfId]={total:0,nombre:0};
    reels[cfId].total+=Math.abs(m);reels[cfId].nombre++;
  });
  let brut=0;const lignes=[],erreurs=[];
  (charges||[]).forEach(function(c){
    if(!actifCfSnapshotBuild20260914_(c&&c.actif))return;
    let occs=[];
    try{
      occs=(calculerEcheancesChargeFixeAjusteesPrecharge20260920_(c,debut,fin,fin,ajustementsTous)||[]).filter(function(e){
        const d=dateCfSnapshotBuild20260914_(e&&e.date);
        return d&&jourCfSnapshotBuild20260914_(d)>=jourCfSnapshotBuild20260914_(debut)&&jourCfSnapshotBuild20260914_(d)<=jourCfSnapshotBuild20260914_(fin);
      });
    }catch(e){erreurs.push({id:String(c&&c.id||''),erreur:String(e&&e.message||e)});return;}
    if(!occs.length)return;
    const id=String(c&&c.id||''),prevu=occs.reduce(function(x,e){return x+Math.abs(Number(e&&e.montant||0));},0),reel=reels[id]||null;
    let retenu=prevu,source='prévision canonique';
    if(reel){
      const couvert=Math.min(Math.max(0,Number(reel.nombre||0)),occs.length);
      const prevuCouvert=occs.slice(0,couvert).reduce(function(x,e){return x+Math.abs(Number(e&&e.montant||0));},0);
      retenu=Math.max(0,Number(reel.total||0)+Math.max(0,prevu-prevuCouvert));
      source='réel explicite + occurrences restantes';
    }
    brut+=retenu;
    lignes.push({id:id,libelle:String(c&&c.libelle||''),frequence:String(c&&c.frequence||'Mensuelle'),occurrences:occs.length,prevu:Math.round(prevu*100)/100,reel:reel?Math.round(reel.total*100)/100:null,retenu:Math.round(retenu*100)/100,source:source});
  });
  if(erreurs.length)return{ok:false,erreur:'échec générateur canonique',erreurs:erreurs,total:Number(v&&v.cft1||0)};
  const arr=function(n){return Math.round((Number(n)||0)*100)/100;};
  brut=arr(brut);
  const suspension=arr(Math.max(0,Number(v&&v.correctionSuspensions20260903||0))),total=arr(Math.max(0,brut-suspension));
  return{ok:true,total:total,brutAvantSuspensions:brut,suspensions:suspension,lignes:lignes};
}

function auditerCandidatCfAjustementsPrechargesBudgetSoft20260920(){
  const t0=Date.now(),snap=chargerSnapshotGlobalBudgetSoft20260906(),etat=snap&&snap.etat||{},sources=chargerToutesLesDonnees(),cer=etat&&etat.modules&&etat.modules.cerbere||null;
  if(!cer||!Array.isArray(cer.periodes)||cer.periodes.length<2){
    const ko={ok:false,version:'2026-09-20.1',erreur:'Cerbère snapshot indisponible pour A/B CF.'};
    console.log('[AUDIT A/B CF ajustements préchargés 20260920] '+JSON.stringify(ko));return ko;
  }
  const ps=cer.periodes.slice(0,2),baseline=[],candidat=[],temps={};
  let t=Date.now();
  ps.forEach(function(p){baseline.push(construireCfCanoniquePourSnapshot20260914_(p,p&&p.v37||{},sources));});
  temps.baselineMs=Date.now()-t;
  t=Date.now();const ajustements=lireAjustementsChargesFixes();temps.lectureAjustementsUniqueMs=Date.now()-t;
  t=Date.now();
  ps.forEach(function(p){candidat.push(construireCfCanoniquePrechargeProfil20260920_(p,p&&p.v37||{},sources,ajustements));});
  temps.candidatMs=Date.now()-t;
  function normaliser(x){
    return{xOk:!!(x&&x.ok),total:Number(x&&x.total||0),brut:Number(x&&x.brutAvantSuspensions||0),suspensions:Number(x&&x.suspensions||0),lignes:(x&&x.lignes||[]).map(function(l){return{id:String(l&&l.id||''),occurrences:Number(l&&l.occurrences||0),prevu:Number(l&&l.prevu||0),reel:l&&l.reel==null?null:Number(l.reel),retenu:Number(l&&l.retenu||0),source:String(l&&l.source||'')};})};
  }
  const sigA=baseline.map(normaliser),sigB=candidat.map(normaliser),identique=JSON.stringify(sigA)===JSON.stringify(sigB);
  const differences=[];
  const maxPeriodes=Math.max(sigA.length,sigB.length);
  for(let pi=0;pi<maxPeriodes;pi++){
    const a=sigA[pi]||{},b=sigB[pi]||{};
    for(const champ of ['xOk','total','brut','suspensions']){
      if(JSON.stringify(a[champ])!==JSON.stringify(b[champ])){
        differences.push({periode:pi+1,type:'entete',champ:champ,baseline:a[champ],candidat:b[champ]});
      }
    }
    const la=Array.isArray(a.lignes)?a.lignes:[],lb=Array.isArray(b.lignes)?b.lignes:[];
    const ids=new Set(la.concat(lb).map(function(x){return String(x&&x.id||'');}));
    ids.forEach(function(id){
      const xa=la.find(function(x){return String(x&&x.id||'')===id;})||null;
      const xb=lb.find(function(x){return String(x&&x.id||'')===id;})||null;
      if(!xa||!xb){
        differences.push({periode:pi+1,type:'presence',id:id,baseline:xa,candidat:xb});
        return;
      }
      for(const champ of ['occurrences','prevu','reel','retenu','source']){
        if(JSON.stringify(xa[champ])!==JSON.stringify(xb[champ])){
          differences.push({periode:pi+1,type:'ligne',id:id,champ:champ,baseline:xa[champ],candidat:xb[champ]});
        }
      }
    });
  }
  const gain=temps.baselineMs-(temps.lectureAjustementsUniqueMs+temps.candidatMs);
  const out={ok:identique&&baseline.every(function(x){return x&&x.ok;})&&candidat.every(function(x){return x&&x.ok;}),version:'2026-09-20.1',lectureSeule:true,aucuneModification:true,comparaison:{identiqueMetierStrict:identique,baseline:sigA,candidat:sigB},temps:temps,gainMs:gain,gainPct:temps.baselineMs?Math.round(gain/temps.baselineMs*1000)/10:null,nombreAjustements:Array.isArray(ajustements)?ajustements.length:0,dureeTotaleMs:Date.now()-t0,decision:identique?'CANDIDAT_CF_PRECHARGE_VALIDE_A_PASSER_AUX_GARDES':'CANDIDAT_CF_PRECHARGE_REFUSE'};
  console.log('[AUDIT A/B CF ajustements préchargés 20260920 RESUME] '+JSON.stringify({ok:out.ok,version:out.version,identiqueMetierStrict:out.comparaison&&out.comparaison.identiqueMetierStrict,temps:out.temps,gainMs:out.gainMs,gainPct:out.gainPct,nombreAjustements:out.nombreAjustements,dureeTotaleMs:out.dureeTotaleMs,decision:out.decision,totaux:{baseline:(out.comparaison&&out.comparaison.baseline||[]).map(function(x){return x.total;}),candidat:(out.comparaison&&out.comparaison.candidat||[]).map(function(x){return x.total;})},nombreDifferences:differences.length,premieresDifferences:differences.slice(0,20)}));return out;
}


function auditerCandidatEngagementsAjustementsPrechargesBudgetSoft20260920(){
  const t0=Date.now(),temps={},erreurs=[];
  if(typeof chargerEngagementsBancairesFutursSource20260912_!=='function'){
    const ko={ok:false,version:'2026-09-20.1',erreur:'Moteur Engagements bancaires futurs absent.'};
    console.log('[AUDIT A/B Engagements ajustements préchargés 20260920] '+JSON.stringify(ko));return ko;
  }
  const dash=typeof chargerDashboardReel==='function'?chargerDashboardReel():null;
  let baseline=null,candidat=null,ajustements=[];
  let t=Date.now();
  try{baseline=chargerEngagementsBancairesFutursSource20260912_(dash);}
  catch(e){erreurs.push({etape:'baseline',erreur:String(e&&e.stack||e&&e.message||e)});}
  temps.baselineMs=Date.now()-t;

  t=Date.now();
  try{ajustements=typeof lireAjustementsChargesFixes==='function'?lireAjustementsChargesFixes():[];}
  catch(e){erreurs.push({etape:'lectureAjustements',erreur:String(e&&e.stack||e&&e.message||e)});ajustements=[];}
  temps.lectureAjustementsUniqueMs=Date.now()-t;

  const original=typeof calculerEcheancesChargeFixeAjustees_==='function'?calculerEcheancesChargeFixeAjustees_:null;
  t=Date.now();
  try{
    if(original){
      calculerEcheancesChargeFixeAjustees_=function(charge,debut,fin,limite){
        return original(charge,debut,fin,limite,ajustements);
      };
    }
    candidat=chargerEngagementsBancairesFutursSource20260912_(dash);
  }catch(e){
    erreurs.push({etape:'candidat',erreur:String(e&&e.stack||e&&e.message||e)});
  }finally{
    if(original)calculerEcheancesChargeFixeAjustees_=original;
  }
  temps.candidatMs=Date.now()-t;

  function normaliser(x){
    x=x||{};
    return{
      prelevements:Number(x.prelevements||0),
      nombrePrelevements:Number(x.nombrePrelevements||0),
      cbDifferees:Number(x.cbDifferees||0),
      nombreCb:Number(x.nombreCb||0),
      chargesFixesRestantes:Number(x.chargesFixesRestantes||0),
      nombreChargesFixesRestantes:Number(x.nombreChargesFixesRestantes||0),
      chargesFixesCouvertes:Number(x.chargesFixesCouvertes||0),
      rapprochements:Array.isArray(x.rapprochements)?x.rapprochements:[],
      detailChargesFixes:Array.isArray(x.detailChargesFixes)?x.detailChargesFixes:[],
      detailPrelevements:Array.isArray(x.detailPrelevements)?x.detailPrelevements:[]
    };
  }

  const a=normaliser(baseline),b=normaliser(candidat),identique=JSON.stringify(a)===JSON.stringify(b);
  const gain=temps.baselineMs-(temps.lectureAjustementsUniqueMs+temps.candidatMs);
  const out={
    ok:erreurs.length===0&&identique,
    version:'2026-09-20.1',
    lectureSeule:true,
    aucuneModification:true,
    comparaison:{identiqueMetierStrict:identique},
    signature:{
      prelevements:a.prelevements,
      nombrePrelevements:a.nombrePrelevements,
      cbDifferees:a.cbDifferees,
      nombreCb:a.nombreCb,
      chargesFixesRestantes:a.chargesFixesRestantes,
      nombreChargesFixesRestantes:a.nombreChargesFixesRestantes,
      chargesFixesCouvertes:a.chargesFixesCouvertes
    },
    temps:temps,
    gainMs:gain,
    gainPct:temps.baselineMs?Math.round(gain/temps.baselineMs*1000)/10:null,
    nombreAjustements:Array.isArray(ajustements)?ajustements.length:0,
    dureeTotaleMs:Date.now()-t0,
    erreurs:erreurs,
    decision:erreurs.length?'PROFIL_INVALIDE':(identique?'CANDIDAT_ENGAGEMENTS_PRECHARGE_VALIDE_A_PASSER_AUX_GARDES':'CANDIDAT_ENGAGEMENTS_PRECHARGE_REFUSE')
  };
  console.log('[AUDIT A/B Engagements ajustements préchargés 20260920] '+JSON.stringify(out));
  return out;
}
