const CERBERE_ROLLING_VERSION='3.6.3';

/** Cerbère roulant 3.6.3 : le détail/tirettes ne porte que sur le pilotable P0. */
function chargerCerbereRoulant(){
  const base=chargerCerbereV33();
  if(!base||base.ok===false)return base;
  const operations=lireTable_('Operations'),categories=lireTable_('Categories'),charges=lireTable_('Charges_fixes'),periodes=base.periodes||[];
  const ventilation=construireVentilationOperationsBudgetSoft_(operations,categories,periodes);
  const r0Cats=new Set((base.recettesCanon&&base.recettesCanon.postes||[]).map(x=>String(x.categorie||'').trim()).filter(Boolean));
  const p0Cats=new Set((base.p0&&base.p0.postes||[]).map(x=>String(x.categorie||'').trim()).filter(Boolean));p0Cats.add('Divers');

  periodes.forEach((p,i)=>{
    const b=ventilation.buckets[i]||{};assurerDiversDansPeriodeCerbere363_(p);
    if((p.enveloppes||[]).some(x=>String(x.categorie||'').trim()==='Épargne'))p.budgetDisponible=arrondirCerbereV3_(Number(p.budgetDisponible||0)+Number(p.epargne||0));
    const revenusHorsR0=Object.keys(b.revenusReels||{}).reduce((s,cat)=>s+(r0Cats.has(cat)?0:Number(b.revenusReels[cat]||0)),0);
    const ajustementReel=arrondirCerbereV3_(revenusHorsR0+Number(b.tresorerieNette||0));
    p.budgetDisponible=arrondirCerbereV3_(Number(p.budgetDisponible||0)-Number(p.renfortsTresorerie||0)+ajustementReel);p.ajustementLiquiditeReel=ajustementReel;

    p.enveloppes=(p.enveloppes||[]).filter(x=>p0Cats.has(String(x.categorie||'').trim())||String(x.nature||'')==='projet_planifie');
    const horsNonCb={},horsCb={};
    Object.keys(b.nonCbParCategorie||{}).forEach(cat=>{if(!p0Cats.has(cat))horsNonCb[cat]=Number(b.nonCbParCategorie[cat]||0);});
    Object.keys(b.cbParCategorie||{}).forEach(cat=>{if(!p0Cats.has(cat))horsCb[cat]=Number(b.cbParCategorie[cat]||0);});
    const horsNonCbTotal=sommeObjetCerbere363_(horsNonCb),horsCbTotal=sommeObjetCerbere363_(horsCb);

    let pilotNonCb=0,pilotCb=0,planPilotable=0,budgetPilotable=0;
    (p.enveloppes||[]).forEach(x=>{const cat=String(x.categorie||'').trim(),n=Number((b.nonCbParCategorie||{})[cat]||0),c=Number((b.cbParCategorie||{})[cat]||0),pl=Number(x.planifie||0),bu=Number(x.prevu||0);x.reelNonCb=arrondirCerbereV3_(n);x.cbHeritee=arrondirCerbereV3_(c);x.reelImpute=arrondirCerbereV3_(n+c);x.resteBudget=arrondirCerbereV3_(bu-n-c-pl);pilotNonCb+=n;pilotCb+=c;planPilotable+=pl;budgetPilotable+=bu;});

    p.budgetReparti=arrondirCerbereV3_(budgetPilotable);p.planDansEnveloppes=arrondirCerbereV3_(planPilotable);
    p.resteBudgetAlloue=arrondirCerbereV3_(budgetPilotable-pilotNonCb-pilotCb-planPilotable);p.resteBudgetPilotable=p.resteBudgetAlloue;
    p.margeNonAffectee=arrondirCerbereV3_(Number(p.budgetDisponible||0)-budgetPilotable);
    p.restePilotable=p.resteBudgetAlloue;
    p.capaciteTresorerie=arrondirCerbereV3_(Number(p.budgetDisponible||0)-pilotNonCb-pilotCb-horsNonCbTotal-horsCbTotal-planPilotable);
    p.capacitePilotable=p.capaciteTresorerie;p.resteAVentiler=p.margeNonAffectee;

    const next=ventilation.buckets[i+1]||{};
    const nextCbPilotable=Object.keys(next.cbParCategorie||{}).reduce((s,cat)=>s+(p0Cats.has(cat)?Number(next.cbParCategorie[cat]||0):0),0);
    const nextCbHors=Object.keys(next.cbParCategorie||{}).reduce((s,cat)=>s+(p0Cats.has(cat)?0:Number(next.cbParCategorie[cat]||0)),0);
    p.roulant={reelNonCb:arrondirCerbereV3_(pilotNonCb),cbHeritee:arrondirCerbereV3_(pilotCb),reelPilotable:arrondirCerbereV3_(pilotNonCb+pilotCb),cbEngageePourSuivant:arrondirCerbereV3_(nextCbPilotable),cbEngageePourSuivantHorsP0:arrondirCerbereV3_(nextCbHors),cbParCategorie:b.cbParCategorie||{},nonCbParCategorie:b.nonCbParCategorie||{},horsPilotable:{nonCb:arrondirCerbereV3_(horsNonCbTotal),cb:arrondirCerbereV3_(horsCbTotal),total:arrondirCerbereV3_(horsNonCbTotal+horsCbTotal),nonCbParCategorie:horsNonCb,cbParCategorie:horsCb},tresorerieNette:arrondirCerbereV3_(Number(b.tresorerieNette||0)),tresoreriePositive:arrondirCerbereV3_(Number(b.tresoreriePositive||0)),tresorerieNegative:arrondirCerbereV3_(Number(b.tresorerieNegative||0)),revenusHorsR0:arrondirCerbereV3_(revenusHorsR0),chargesFixesReelles:arrondirCerbereV3_(Number(b.chargesFixesReelles||0)),nombreChargesFixesReelles:Number(b.nombreChargesFixesReelles||0),orphelines:b.orphelines||{},sante:{net:arrondirCerbereV3_(Number(b.santeNette||0)),remboursements:arrondirCerbereV3_(Number(b.santeRemboursements||0))},reconciliation:{reelIndexe:arrondirCerbereV3_(Number(b.nonCbTotal||0)+Number(b.cbTotal||0)),reelVentile:arrondirCerbereV3_(pilotNonCb+pilotCb+horsNonCbTotal+horsCbTotal),ecart:arrondirCerbereV3_(Number(b.nonCbTotal||0)+Number(b.cbTotal||0)-pilotNonCb-pilotCb-horsNonCbTotal-horsCbTotal)},moteurVentilation:ventilation.version};
  });

  base.cf0=construireCf0Cerbere363_(charges,periodes);base.fenetreRoulante=construireFenetreRoulanteCerbere363_(periodes,ventilation.stats);base.version=CERBERE_ROLLING_VERSION;
  base.principe='Cerbère M/M+1 : détail réservé au pilotable P0 ; CF0 et hors-P0 restent synthétiques mais pèsent sur la trésorerie globale.';
  base.diagnostic=base.diagnostic||{};base.diagnostic.moteur_roulant=CERBERE_ROLLING_VERSION;base.diagnostic.ventilation=ventilation.stats;base.diagnostic.reconciliation_ok=periodes.every(p=>Math.abs(Number(p.roulant&&p.roulant.reconciliation&&p.roulant.reconciliation.ecart||0))<.01);
  return serialiserCerberePourClient_(base);
}

function construireCf0Cerbere363_(charges,periodes){const actives=(charges||[]).filter(c=>String(c.actif).toLowerCase()!=='false'),p0=periodes&&periodes[0];return{nombreActives:actives.length,totalCourant:arrondirCerbereV3_(Number(p0&&p0.fixesBrutes||0)),totalPondereCourant:arrondirCerbereV3_(Number(p0&&p0.fixesPonderees||0)),principe:'CF0 synthétique dans Cerbère.'};}
function construireFenetreRoulanteCerbere363_(periodes,stats){const m=periodes[0],n=periodes[1];if(!m||!n)return null;const tresM=Number(m.capaciteTresorerie||0),tresN=Number(n.capaciteTresorerie||0),budM=Number(m.resteBudgetPilotable||0),budN=Number(n.resteBudgetPilotable||0),recOk=[m,n].every(p=>Math.abs(Number(p.roulant&&p.roulant.reconciliation&&p.roulant.reconciliation.ecart||0))<.01),orp=Object.keys((m.roulant&&m.roulant.orphelines)||{}).length+Object.keys((n.roulant&&n.roulant.orphelines)||{}).length;let niveau='vert',titre='Trajectoire pilotable saine sur deux mois';if(!recOk){niveau='rouge';titre='Calcul incomplet : ventilation non réconciliée';}else if(tresM<-.009||tresN<-.009){niveau='rouge';titre='Risque de trésorerie sur la fenêtre roulante';}else if(budM<-.009||budN<-.009||orp>0){niveau='orange';titre='Vigilance sur les enveloppes pilotables';}else if(Number(n.roulant&&n.roulant.cbHeritee||0)>Number(n.budgetReparti||0)*.6){niveau='orange';titre='Vigilance : M+1 est déjà fortement engagé';}const raisons=[];if(budM<-.009)raisons.push('M dépasse ses enveloppes pilotables de '+arrondirCerbereV3_(Math.abs(budM))+' €');if(budN<-.009)raisons.push('M+1 dépasse déjà ses enveloppes pilotables de '+arrondirCerbereV3_(Math.abs(budN))+' €');if(tresM<-.009)raisons.push('trésorerie globale M négative de '+arrondirCerbereV3_(Math.abs(tresM))+' €');if(tresN<-.009)raisons.push('trésorerie globale M+1 négative de '+arrondirCerbereV3_(Math.abs(tresN))+' €');if(Number(n.roulant&&n.roulant.cbHeritee||0)>0)raisons.push(arrondirCerbereV3_(n.roulant.cbHeritee)+' € de CB pilotables déjà imputés à M+1');if(Number(n.roulant&&n.roulant.horsPilotable&&n.roulant.horsPilotable.total||0)>0)raisons.push(arrondirCerbereV3_(n.roulant.horsPilotable.total)+' € hors enveloppes pèsent aussi sur M+1');if(Number(n.engagementsPlanifies||0)>0)raisons.push(arrondirCerbereV3_(n.engagementsPlanifies)+' € de Plan à venir sur M+1');if(orp>0)raisons.push(orp+' catégorie(s) orpheline(s) à classer');if(Number(stats&&stats.doublonsCbRetires||0)>0)raisons.push(stats.doublonsCbRetires+' doublon(s) CB neutralisé(s)');if(!raisons.length)raisons.push('enveloppes pilotables et trésorerie globale restent soutenables sur M et M+1');return{niveau,titre,raisons,resteM:arrondirCerbereV3_(budM),resteM1:arrondirCerbereV3_(budN),tresorerieM:arrondirCerbereV3_(tresM),tresorerieM1:arrondirCerbereV3_(tresN)};}
function assurerDiversDansPeriodeCerbere363_(p){const e=p.enveloppes||(p.enveloppes=[]);if(e.some(x=>String(x.categorie||'').trim()==='Divers'))return;const i=e.findIndex(x=>String(x.categorie||'').trim()==='Épargne'),l={categorie:'Divers',canon:0,monetaire:0,pluxee:0,nature:'ajustable',prevu:0,planifie:0};if(i>=0)e.splice(i,0,l);else e.push(l);}
function sommeObjetCerbere363_(o){return Object.keys(o||{}).reduce((s,k)=>s+Number(o[k]||0),0);}

/**
 * Profil ciblé du moteur roulant. Lecture seule : le second passage enveloppe
 * temporairement les dépendances directes de chargerCerbereRoulant(), puis restaure
 * strictement les fonctions originales. Aucune logique métier n'est modifiée.
 */
function auditerProfilInterneCerbereRoulantBudgetSoft20260911(){
  const tGlobal=Date.now();
  const t0=Date.now();
  const baseline=avecContexteLectureBudgetSoft20260827_('audit-profil-cerbere-roulant-baseline-20260911',function(){return chargerCerbereRoulant();});
  const baselineMs=Date.now()-t0;
  const statsBaseline=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const mesures={};
  function ajouter(nom,ms){const x=mesures[nom]||(mesures[nom]={appels:0,dureeMs:0});x.appels++;x.dureeMs+=ms;}
  const originaux={
    v33:chargerCerbereV33,
    lireTable:lireTable_,
    ventilation:construireVentilationOperationsBudgetSoft_,
    cf0:construireCf0Cerbere363_,
    fenetre:construireFenetreRoulanteCerbere363_,
    serialiser:serialiserCerberePourClient_
  };
  let instrumente=null,erreur=null,instrumenteMs=0;
  try{
    chargerCerbereV33=function(){const t=Date.now();try{return originaux.v33.apply(this,arguments);}finally{ajouter('chargerCerbereV33',Date.now()-t);}};
    lireTable_=function(nom){const t=Date.now();try{return originaux.lireTable.apply(this,arguments);}finally{ajouter('lireTable:'+String(nom||''),Date.now()-t);}};
    construireVentilationOperationsBudgetSoft_=function(){const t=Date.now();try{return originaux.ventilation.apply(this,arguments);}finally{ajouter('construireVentilationOperations',Date.now()-t);}};
    construireCf0Cerbere363_=function(){const t=Date.now();try{return originaux.cf0.apply(this,arguments);}finally{ajouter('construireCf0',Date.now()-t);}};
    construireFenetreRoulanteCerbere363_=function(){const t=Date.now();try{return originaux.fenetre.apply(this,arguments);}finally{ajouter('construireFenetreRoulante',Date.now()-t);}};
    serialiserCerberePourClient_=function(){const t=Date.now();try{return originaux.serialiser.apply(this,arguments);}finally{ajouter('serialisationClient',Date.now()-t);}};
    const t1=Date.now();
    instrumente=avecContexteLectureBudgetSoft20260827_('audit-profil-cerbere-roulant-instrumente-20260911',function(){return chargerCerbereRoulant();});
    instrumenteMs=Date.now()-t1;
  }catch(e){
    erreur=String(e&&e.stack||e&&e.message||e);
  }finally{
    chargerCerbereV33=originaux.v33;
    lireTable_=originaux.lireTable;
    construireVentilationOperationsBudgetSoft_=originaux.ventilation;
    construireCf0Cerbere363_=originaux.cf0;
    construireFenetreRoulanteCerbere363_=originaux.fenetre;
    serialiserCerberePourClient_=originaux.serialiser;
  }
  const statsInstrumente=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const normaliser=typeof normaliserObjetProfilCerbere20260911_==='function'?normaliserObjetProfilCerbere20260911_:function(v){return v;};
  const differ=typeof premieresDifferencesProfilCerbere20260911_==='function'?premieresDifferencesProfilCerbere20260911_:function(){return[];};
  const a=normaliser(baseline,''),b=normaliser(instrumente,'');
  const identique=!erreur&&JSON.stringify(a)===JSON.stringify(b);
  const diffs=identique?[]:differ(a,b,20);
  const v33Ms=Number(mesures.chargerCerbereV33&&mesures.chargerCerbereV33.dureeMs||0);
  const ventilationMs=Number(mesures.construireVentilationOperations&&mesures.construireVentilationOperations.dureeMs||0);
  const details=Object.keys(mesures).map(function(k){return{etape:k,appels:mesures[k].appels,dureeMs:mesures[k].dureeMs,partPct:instrumenteMs?Math.round(mesures[k].dureeMs/instrumenteMs*1000)/10:null};}).sort(function(x,y){return y.dureeMs-x.dureeMs;});
  const out={
    ok:identique&&!!(instrumente&&instrumente.ok!==false),version:'2026-09-11.5',lectureSeule:true,aucuneModification:true,
    perimetre:{compare:'chargerCerbereRoulant() courant vs le même chargeur avec enveloppes chronométriques temporaires',sourceVerite:'chargerCerbereRoulant / CerbereRolling.gs',objectif:'séparer coût V33, lectures et ventilation sans toucher au métier'},
    comparaison:{identiqueMetierStable:identique,differences:diffs,versionBaseline:String(baseline&&baseline.version||''),versionInstrumentee:String(instrumente&&instrumente.version||'')},
    temps:{baselineMs:baselineMs,instrumenteMs:instrumenteMs,v33InclusifMs:v33Ms,ventilationMs:ventilationMs,horsV33ApproxMs:Math.max(0,instrumenteMs-v33Ms),dureeTotaleMs:Date.now()-tGlobal},
    details:details,
    lectures:{baseline:statsBaseline,instrumente:statsInstrumente},
    erreur:erreur,
    decision:identique?'PROFIL_ROULANT_VALIDE_POUR_CHOISIR_LEVIER':'PROFIL_ROULANT_INVALIDE_NE_RIEN_OPTIMISER',
    doctrine:'Profil uniquement. Aucune optimisation de production appliquée ; tout candidat devra passer un A/B strict puis les gardes du snapshot.'
  };
  console.log('[AUDIT PERF profil interne Cerbère roulant] '+JSON.stringify(out));return out;
}

/** Profil ciblé de chargerCerbereV33() : lecture seule, instrumentation temporaire. */
function auditerProfilInterneCerbereV33BudgetSoft20260911(){
  const tGlobal=Date.now(),t0=Date.now();
  const baseline=avecContexteLectureBudgetSoft20260827_('audit-profil-cerbere-v33-baseline-20260911',function(){return chargerCerbereV33();});
  const baselineMs=Date.now()-t0;
  const statsBaseline=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const mesures={};
  function ajouter(nom,ms){const x=mesures[nom]||(mesures[nom]={appels:0,dureeMs:0});x.appels++;x.dureeMs+=ms;}
  const originaux={canonDep:chargerCanonCerbereV1,heritage:construireHeritageP0CerbereV3_,canonRec:chargerCanonRecettesCerbereV1,lireTable:lireTable_,lirePlanTable:lireTablePlanCerbere_,lirePlanDyn:lireFeuilleDynamiqueCerbereV3_,periodes:construirePeriodesCerbereV2_,indexer:indexerDonneesCerbereV35_,reel:construireReelLegerCerbereV3_,ajust:lireAjustementsCerbereV33_,calcul:calculerPeriodeCerbereV35_,enrichir:enrichirPeriodePilotableV35_,serialiser:serialiserCerberePourClient_};
  let instrumente=null,erreur=null,instrumenteMs=0;
  try{
    chargerCanonCerbereV1=function(){const t=Date.now();try{return originaux.canonDep.apply(this,arguments);}finally{ajouter('chargerCanonDepenses',Date.now()-t);}};
    construireHeritageP0CerbereV3_=function(){const t=Date.now();try{return originaux.heritage.apply(this,arguments);}finally{ajouter('construireHeritageP0',Date.now()-t);}};
    chargerCanonRecettesCerbereV1=function(){const t=Date.now();try{return originaux.canonRec.apply(this,arguments);}finally{ajouter('chargerCanonRecettes',Date.now()-t);}};
    lireTable_=function(nom){const t=Date.now();try{return originaux.lireTable.apply(this,arguments);}finally{ajouter('lireTable:'+String(nom||''),Date.now()-t);}};
    lireTablePlanCerbere_=function(nom){const t=Date.now();try{return originaux.lirePlanTable.apply(this,arguments);}finally{ajouter('lirePlanTable:'+String(nom||''),Date.now()-t);}};
    lireFeuilleDynamiqueCerbereV3_=function(nom){const t=Date.now();try{return originaux.lirePlanDyn.apply(this,arguments);}finally{ajouter('lirePlanDyn:'+String(nom||''),Date.now()-t);}};
    construirePeriodesCerbereV2_=function(){const t=Date.now();try{return originaux.periodes.apply(this,arguments);}finally{ajouter('construirePeriodes',Date.now()-t);}};
    indexerDonneesCerbereV35_=function(){const t=Date.now();try{return originaux.indexer.apply(this,arguments);}finally{ajouter('indexerDonneesV35',Date.now()-t);}};
    construireReelLegerCerbereV3_=function(){const t=Date.now();try{return originaux.reel.apply(this,arguments);}finally{ajouter('construireReelLeger',Date.now()-t);}};
    lireAjustementsCerbereV33_=function(){const t=Date.now();try{return originaux.ajust.apply(this,arguments);}finally{ajouter('lireAjustementsV33',Date.now()-t);}};
    calculerPeriodeCerbereV35_=function(){const t=Date.now();try{return originaux.calcul.apply(this,arguments);}finally{ajouter('calculerPeriodeV35',Date.now()-t);}};
    enrichirPeriodePilotableV35_=function(){const t=Date.now();try{return originaux.enrichir.apply(this,arguments);}finally{ajouter('enrichirPeriodePilotableV35',Date.now()-t);}};
    serialiserCerberePourClient_=function(){const t=Date.now();try{return originaux.serialiser.apply(this,arguments);}finally{ajouter('serialisationClient',Date.now()-t);}};
    const t1=Date.now();instrumente=avecContexteLectureBudgetSoft20260827_('audit-profil-cerbere-v33-instrumente-20260911',function(){return chargerCerbereV33();});instrumenteMs=Date.now()-t1;
  }catch(e){erreur=String(e&&e.stack||e&&e.message||e);}finally{
    chargerCanonCerbereV1=originaux.canonDep;construireHeritageP0CerbereV3_=originaux.heritage;chargerCanonRecettesCerbereV1=originaux.canonRec;lireTable_=originaux.lireTable;lireTablePlanCerbere_=originaux.lirePlanTable;lireFeuilleDynamiqueCerbereV3_=originaux.lirePlanDyn;construirePeriodesCerbereV2_=originaux.periodes;indexerDonneesCerbereV35_=originaux.indexer;construireReelLegerCerbereV3_=originaux.reel;lireAjustementsCerbereV33_=originaux.ajust;calculerPeriodeCerbereV35_=originaux.calcul;enrichirPeriodePilotableV35_=originaux.enrichir;serialiserCerberePourClient_=originaux.serialiser;
  }
  const statsInstrumente=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const normaliser=typeof normaliserObjetProfilCerbere20260911_==='function'?normaliserObjetProfilCerbere20260911_:function(v){return v;},differ=typeof premieresDifferencesProfilCerbere20260911_==='function'?premieresDifferencesProfilCerbere20260911_:function(){return[];};
  const a=normaliser(baseline,''),b=normaliser(instrumente,''),identique=!erreur&&JSON.stringify(a)===JSON.stringify(b),diffs=identique?[]:differ(a,b,20);
  const details=Object.keys(mesures).map(function(k){return{etape:k,appels:mesures[k].appels,dureeMs:mesures[k].dureeMs,partPct:instrumenteMs?Math.round(mesures[k].dureeMs/instrumenteMs*1000)/10:null};}).sort(function(x,y){return y.dureeMs-x.dureeMs;});
  const out={ok:identique&&!!(instrumente&&instrumente.ok!==false),version:'2026-09-11.6',lectureSeule:true,aucuneModification:true,perimetre:{compare:'chargerCerbereV33() courant vs le même chargeur instrumenté',sourceVerite:'chargerCerbereV33 / CerbereV33.gs',objectif:'séparer canons, lectures, indexation, réel léger et construction P1-P6'},comparaison:{identiqueMetierStable:identique,differences:diffs,versionBaseline:String(baseline&&baseline.version||''),versionInstrumentee:String(instrumente&&instrumente.version||'')},temps:{baselineMs:baselineMs,instrumenteMs:instrumenteMs,dureeTotaleMs:Date.now()-tGlobal},details:details,timingsV33Existants:instrumente&&instrumente.diagnostic&&instrumente.diagnostic.timings||null,lectures:{baseline:statsBaseline,instrumente:statsInstrumente},erreur:erreur,decision:identique?'PROFIL_V33_VALIDE_POUR_CHOISIR_LEVIER':'PROFIL_V33_INVALIDE_NE_RIEN_OPTIMISER',doctrine:'Profil uniquement. Aucune optimisation de production appliquée ; tout candidat devra passer un A/B strict puis les gardes du snapshot.'};
  console.log('[AUDIT PERF profil interne Cerbère V33] '+JSON.stringify(out));return out;
}
