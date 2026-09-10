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

function jourAuditPerfTresorerie20260910_(v){
  const d=v instanceof Date?new Date(v):new Date(v);
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function arrAuditPerfTresorerie20260910_(n){return Math.round(Number(n||0)*100)/100;}
function cleLigneAuditPerfTresorerie20260910_(l){
  return [jourAuditPerfTresorerie20260910_(l&&l.date),String(l&&l.source||''),String(l&&l.sourceId||''),arrAuditPerfTresorerie20260910_(Number(l&&l.montantSigne||0))].join('|');
}
function signatureProjectionAuditPerfTresorerie20260910_(r,cible){
  const j=String(cible||'');
  const lignes=(r&&r.lignes||[]).filter(function(l){return jourAuditPerfTresorerie20260910_(l&&l.date)<=j;});
  const cles=lignes.map(cleLigneAuditPerfTresorerie20260910_).sort();
  const net=arrAuditPerfTresorerie20260910_(lignes.reduce(function(s,l){return s+Number(l&&l.montantSigne||0);},0));
  return{
    ok:!!(r&&r.ok),
    version:String(r&&r.version||''),
    proprietaire:String(r&&r.proprietaireBudgetSoft||''),
    contratVersion:String(r&&r.versionContratCanonique||''),
    dateReference:String(r&&r.dateReference||''),
    cible:j,
    soldeReel:arrAuditPerfTresorerie20260910_(Number(r&&r.soldeReel||0)),
    nombreLignes:lignes.length,
    net:net,
    soldeCible:arrAuditPerfTresorerie20260910_(Number(r&&r.soldeReel||0)+net),
    cles:cles
  };
}

/**
 * Candidat A/B sans écriture : peut-on calculer UNE trajectoire canonique jusqu'à
 * la fin bancaire du cycle suivant, puis réutiliser sa sous-vue jusqu'au 27,
 * au lieu de recalculer une seconde fois toute la projection pour la garde CB ?
 *
 * Aucune modification du snapshot. L'optimisation ne sera envisagée que si les
 * signatures métier jusqu'au 27 sont strictement identiques, ligne par ligne.
 */
function auditerCandidatProjectionUniqueSnapshotBudgetSoft20260910(){
  const maintenant=new Date();
  const finCourant=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(maintenant):new Date(maintenant.getFullYear(),maintenant.getMonth(),27,12,0,0,0);
  const finSuivant=new Date(finCourant.getFullYear(),finCourant.getMonth()+1,finCourant.getDate(),12,0,0,0);
  const finBancaire=new Date(finSuivant.getFullYear(),finSuivant.getMonth()+1,0,23,59,59,999);
  const cible27=jourAuditPerfTresorerie20260910_(finSuivant);
  const cibleFinMois=jourAuditPerfTresorerie20260910_(finBancaire);

  const tA=Date.now();
  const baseline=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible27);
  const dureeBaselineMs=Date.now()-tA;

  const tB=Date.now();
  const etendue=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cibleFinMois);
  const dureeEtendueMs=Date.now()-tB;

  const a=signatureProjectionAuditPerfTresorerie20260910_(baseline,cible27);
  const b=signatureProjectionAuditPerfTresorerie20260910_(etendue,cible27);
  const mapA={};a.cles.forEach(function(k){mapA[k]=(mapA[k]||0)+1;});
  const mapB={};b.cles.forEach(function(k){mapB[k]=(mapB[k]||0)+1;});
  const toutes=Array.from(new Set(a.cles.concat(b.cles))).sort();
  const differences=toutes.filter(function(k){return Number(mapA[k]||0)!==Number(mapB[k]||0);}).slice(0,50).map(function(k){return{cle:k,baseline:Number(mapA[k]||0),candidate:Number(mapB[k]||0)};});
  const metaIdentique=a.ok===b.ok&&a.version===b.version&&a.proprietaire===b.proprietaire&&a.contratVersion===b.contratVersion&&a.dateReference===b.dateReference&&a.soldeReel===b.soldeReel&&a.nombreLignes===b.nombreLignes&&a.net===b.net&&a.soldeCible===b.soldeCible;
  const identique=metaIdentique&&differences.length===0;

  let gardeCandidate=null;
  if(etendue&&etendue.ok!==false&&typeof prochaineDateDebitCbTresorerie20260901_==='function'){
    const publiees=(etendue.lignes||[]).filter(function(x){return String(x&&x.source||'')==='debit_cb_estime';});
    const attendues=[];let ref=new Date(etendue.dateReference||maintenant),g=0;
    while(ref<finBancaire&&g++<12){const d=prochaineDateDebitCbTresorerie20260901_(ref);if(!d||isNaN(d)||d>finBancaire)break;const j=jourAuditPerfTresorerie20260910_(d);if(attendues.indexOf(j)<0)attendues.push(j);ref=new Date(d.getTime()+1);}
    const parDate={};publiees.forEach(function(x){const j=jourAuditPerfTresorerie20260910_(x.date);(parDate[j]=parDate[j]||[]).push(x);});
    const formulesOk=publiees.every(function(x){return Math.abs(Math.abs(arrAuditPerfTresorerie20260910_(x.montantSigne))-arrAuditPerfTresorerie20260910_(Math.max(0,Number(x.partCerbere||0))+Math.max(0,Number(x.partFinMois||0))))<=.01;});
    gardeCandidate={ok:attendues.every(function(j){return(parDate[j]||[]).length===1;})&&Object.keys(parDate).every(function(j){return parDate[j].length===1;})&&formulesOk,datesAttendues:attendues,publiees:publiees.map(function(x){return{date:jourAuditPerfTresorerie20260910_(x.date),montant:arrAuditPerfTresorerie20260910_(x.montantSigne),partCerbere:arrAuditPerfTresorerie20260910_(x.partCerbere),partFinMois:arrAuditPerfTresorerie20260910_(x.partFinMois)};}),formulesOk:formulesOk};
  }

  const gainTheoriqueMs=dureeBaselineMs;
  const out={
    ok:identique&&!!(gardeCandidate&&gardeCandidate.ok),
    version:'2026-09-10.1',
    lectureSeule:true,
    aucuneModification:true,
    ciblePublication:cible27,
    cibleCalculUnique:cibleFinMois,
    durees:{projectionBaseline27Ms:dureeBaselineMs,projectionEtendueFinMoisMs:dureeEtendueMs,gainTheoriqueSnapshotMs:gainTheoriqueMs},
    comparaison:{identiqueAuCentimeEtLigneParLigne:identique,metaIdentique:metaIdentique,differences: differences,baseline:{version:a.version,proprietaire:a.proprietaire,contratVersion:a.contratVersion,dateReference:a.dateReference,soldeReel:a.soldeReel,nombreLignes:a.nombreLignes,net:a.net,soldeCible:a.soldeCible},candidateSousVue:{version:b.version,proprietaire:b.proprietaire,contratVersion:b.contratVersion,dateReference:b.dateReference,soldeReel:b.soldeReel,nombreLignes:b.nombreLignes,net:b.net,soldeCible:b.soldeCible}},
    gardeCbCandidate:gardeCandidate,
    decision:identique&&gardeCandidate&&gardeCandidate.ok?'CANDIDAT_AUTORISE_POUR_ETAPE_SUIVANTE':'REJETER_CANDIDAT',
    doctrine:'Aucune optimisation appliquée. Le candidat ne peut être intégré au builder que si cette sortie est verte.'
  };
  console.log('[AUDIT PERF candidat projection unique] '+JSON.stringify(out));
  return out;
}
