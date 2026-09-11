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

function estChampVolatilProfilCerbere20260911_(cle,chemin){
  const k=String(cle||'').toLowerCase(),p=String(chemin||'').toLowerCase();
  if(['duree_ms','dureems','serializationms','generele','generatedat','timestamp','horodatage'].includes(k))return true;
  if(/(^|\.)(timings?|performance|performancepost35)(\.|$)/.test(p))return true;
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

/**
 * Profiler V374 corrigé : compare le payload métier après retrait strict des seuls
 * champs volatils de performance/horodatage. Les valeurs métier, audits de calcul,
 * périodes et enveloppes restent intégralement comparées.
 */
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
  const out={
    ok:identique&&!!(instrumente&&instrumente.ok!==false),version:'2026-09-11.2',lectureSeule:true,aucuneModification:true,
    perimetre:{compare:'chargerCerbereV374() courant vs reconstruction instrumentée couche par couche',sourceVerite:'chargerCerbereV374 / CerberePilotageV374.gs',moteurAttendu:'3.7.24',comparaison:'payload complet hors seuls champs volatils performance/horodatage'},
    comparaison:{identiqueMetierStable:identique,differences:diffs,versionBaseline:String(baseline&&baseline.version||''),versionInstrumentee:String(instrumente&&instrumente.version||''),nombrePeriodesBaseline:(baseline&&baseline.periodes||[]).length,nombrePeriodesInstrumentee:(instrumente&&instrumente.periodes||[]).length},
    temps:{baselineMs:baselineMs,reconstructionEtapesMs:total,dureeTotaleMs:Date.now()-tGlobal},etapes:etapes,classement:classement,lectures:{baseline:statsBaseline,etapes:statsEtapes},signatureMetier:{periodes:periodes},
    decision:identique?'PROFIL_CERBERE_VALIDE_POUR_CHOISIR_LEVIER':'PROFIL_CERBERE_INVALIDE_NE_RIEN_OPTIMISER',
    doctrine:'Profil uniquement. Aucun calcul métier modifié. Les champs ignorés sont limités aux métriques de performance/horodatage ; toute optimisation devra ensuite passer un A/B strict puis les gardes du snapshot.'
  };
  console.log('[AUDIT PERF profil interne Cerbère V374 stable] '+JSON.stringify(out));return out;
}
