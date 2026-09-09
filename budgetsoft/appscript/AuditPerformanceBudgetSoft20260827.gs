const AUDIT_PERF_BUDGETSOFT_20260827_VERSION='2026-08-27.1';

/**
 * Audit de non-régression ciblé sur Cerbère Express.
 * Compare le résultat historique (sans mémoïsation) au résultat optimisé.
 * Aucun écrit dans le classeur.
 */
function auditerNonRegressionPerfCerbereExpress20260827(){
  const t0=Date.now();
  const avant=chargerVueCerbereExpressSansContexte20260827_();
  const dureeAvant=Date.now()-t0;

  const t1=Date.now();
  const apres=chargerVueCerbereExpress20260827();
  const dureeApres=Date.now()-t1;

  const a=signaturePerfCerbereExpress20260827_(avant);
  const b=signaturePerfCerbereExpress20260827_(apres);
  const identique=JSON.stringify(a)===JSON.stringify(b);
  const stats=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)
    ? BUDGETSOFT_READ_CONTEXT_LAST_STATS_
    : null;

  const out={
    ok:identique,
    version:AUDIT_PERF_BUDGETSOFT_20260827_VERSION,
    nonRegression:identique,
    dureeAvantMs:dureeAvant,
    dureeApresMs:dureeApres,
    gainPct:dureeAvant>0?Math.round((1-dureeApres/dureeAvant)*1000)/10:null,
    lectures:stats,
    signatureAvant:a,
    signatureApres:b
  };
  console.log(JSON.stringify(out));
  return out;
}

function signaturePerfCerbereExpress20260827_(v){
  if(!v||v.ok===false)return{ok:false,erreur:String(v&&v.erreur||'')};
  return{
    ok:true,
    cycle:v.cycle||null,
    meteo:v.meteo||null,
    consigneSaillante:v.consigneSaillante||null,
    pilotable:{
      allocation:Number(v.pilotable&&v.pilotable.allocation||0),
      consomme:Number(v.pilotable&&v.pilotable.consomme||0),
      reste:Number(v.pilotable&&v.pilotable.reste||0),
      lignes:(v.pilotable&&v.pilotable.lignes||[]).map(x=>({
        categorie:x.categorie,
        allocation:Number(x.allocation||0),
        consomme:Number(x.consomme||0),
        reste:Number(x.reste||0),
        niveau:x.niveau||''
      }))
    },
    pluxee:v.pluxee||null,
    contexte:v.contexte||null
  };
}

/**
 * Audit lecture seule du coût du snapshot global publié.
 *
 * Règle de sécurité : aucune optimisation n'est appliquée ici. On photographie
 * d'abord les performances ET les invariants métier de la révision publiée.
 * Toute optimisation ultérieure devra reproduire cette signature au centime et
 * laisser toutes les gardes vertes avant d'être conservée.
 */
function auditerPerformanceSnapshotGlobalBudgetSoft20260909(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat;
  if(!e)return{ok:false,version:'2026-09-09.1',erreur:'Snapshot global publié indisponible.'};
  const m=e.modules||{},p=e.performance||{},pm=p.modules||{};
  const arr=function(n){return Math.round(Number(n||0)*100)/100;};
  const durees=Object.keys(pm).map(function(k){return{module:k,dureeMs:Number(pm[k]||0)};}).sort(function(a,b){return b.dureeMs-a.dureeMs;});
  const totalModules=durees.reduce(function(x,y){return x+Number(y.dureeMs||0);},0);
  const top=durees.slice(0,10).map(function(x){return{module:x.module,dureeMs:x.dureeMs,partPct:totalModules>0?Math.round(x.dureeMs/totalModules*1000)/10:null};});
  const proj=m.projectionEtendue||{},dash=m.dashboard||{},cer=m.cerbere||{},ce=m.cerbereExpress||{},unite=e.uniteTresorerie||m.uniteTresorerie||{};
  const signature={
    revisionBudgetSoft:String(e.revisionBudgetSoft||''),
    versionConstructeur:String(e.versionConstructeur||''),
    projectionVersion:String(proj.version||''),
    projectionOwner:String(proj.proprietaireBudgetSoft||''),
    contratVersion:String(proj.versionContratCanonique||''),
    soldeReel:arr(Number(proj.soldeReel)),
    soldeDashboard:arr(Number(dash&&dash.courtTerme&&dash.courtTerme.soldeBancaire)),
    pilotableDashboard:arr(Number(dash&&dash.courtTerme&&dash.courtTerme.pilotableDisponible)),
    cerbereP1:arr(Number(cer&&cer.p1&&cer.p1.budget||cer&&cer.p1||0)),
    cerbereReste:arr(Number(cer&&cer.pilotable&&cer.pilotable.reste||cer&&cer.reste||0)),
    expressAllocation:arr(Number(ce&&ce.pilotable&&ce.pilotable.allocation||0)),
    expressConsomme:arr(Number(ce&&ce.pilotable&&ce.pilotable.consomme||0)),
    expressReste:arr(Number(ce&&ce.pilotable&&ce.pilotable.reste||0))
  };
  const gardes={
    snapshotOk:e.ok===true,
    coherence:!!(e.coherence&&e.coherence.ok===true),
    uniteTresorerie:!!(unite&&unite.ok===true),
    contratCanonique:!!(proj&&proj.decompositionCanonique&&proj.decompositionCanonique.ok===true),
    gardeR0:!!(m.gardeRecettesCanoniques&&m.gardeRecettesCanoniques.ok===true),
    gardeCbMultiCycle:!!(m.gardeCbMultiCycle&&m.gardeCbMultiCycle.ok===true)
  };
  const toutesVertes=Object.keys(gardes).every(function(k){return gardes[k]===true;});
  const out={
    ok:toutesVertes,
    version:'2026-09-09.1',
    lectureSeule:true,
    aucuneModification:true,
    revisionBudgetSoft:String(e.revisionBudgetSoft||''),
    dureeSnapshotMs:Number(p.dureeMs||0),
    totalDureesModulesMs:totalModules,
    topCouts:top,
    tousModules:durees,
    gardes:gardes,
    signatureReference:signature,
    doctrineOptimisation:'Ne modifier aucun calcul métier. Une optimisation candidate n’est acceptable que si toutes les gardes restent vertes et si la signature de référence est identique au centime.'
  };
  console.log('[AUDIT PERF snapshot global] '+JSON.stringify(out));
  return out;
}
