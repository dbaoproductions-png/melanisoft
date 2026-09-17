const BUDGETSOFT_CARDS_STABILITY_AUDIT_20260917_VERSION='2026-09-17.2';

function arrCardsStability20260917_(n){return Math.round((Number(n)||0)*100)/100;}
function safeCardsStability20260917_(nom,fn){const t0=Date.now();try{const v=fn();return{ok:!!(v&&v.ok!==false),nom,dureeMs:Date.now()-t0,valeur:v||null,erreur:''};}catch(e){return{ok:false,nom,dureeMs:Date.now()-t0,valeur:null,erreur:String(e&&e.message||e)};}}

function auditerCartesStabiliteBudgetSoft20260917(){
  const t0=Date.now();
  const operations=safeCardsStability20260917_('operations',()=>chargerOperationsLeger20260828());
  const comptes=safeCardsStability20260917_('comptes',()=>chargerSyntheseComptes20260828());
  const tresorerie=safeCardsStability20260917_('tresorerie',()=>chargerTresorerieUnifieeBudgetSoft20260907());
  const dashboard=safeCardsStability20260917_('dashboard',()=>chargerDashboardSyntheseV3BudgetSoft20260907());
  const cerbere=safeCardsStability20260917_('cerbere',()=>chargerCerbereCockpitCanonique20260914());
  const express=safeCardsStability20260917_('cerbereExpress',()=>chargerVueCerbereExpress20260827());
  const credits=safeCardsStability20260917_('credits',()=>chargerCreditsEtDettesV2());
  const patrimoine=safeCardsStability20260917_('patrimoine',()=>chargerCreditsPatrimoineIntegres20260915());
  const analyses=safeCardsStability20260917_('analyses',()=>chargerAnalysesBudgetairesV23());

  const ov=operations.valeur||{},cv=comptes.valeur||{},tv=tresorerie.valeur||{},dv=dashboard.valeur||{},cev=cerbere.valeur||{},xv=express.valeur||{},crv=credits.valeur||{},pv=patrimoine.valeur||{};
  const soldeComptes=Number(cv&&cv.synthese&&cv.synthese.disponible);
  const soldeTres=Number(tv&&tv.soldeReel);
  const soldeDash=Number(dv&&dv.courtTerme&&dv.courtTerme.soldeBancaire);
  const soldeCer=Number(cev&&cev.reel&&cev.reel.soldeBancaire);
  const soldes=[soldeComptes,soldeTres,soldeDash,soldeCer].filter(Number.isFinite);
  const ecartSolde=soldes.length?arrCardsStability20260917_(Math.max.apply(null,soldes)-Math.min.apply(null,soldes)):null;

  const epCer=Number(cev&&cev.periodes&&cev.periodes[0]&&cev.periodes[0].v37&&cev.periodes[0].v37.cockpit20260902&&cev.periodes[0].v37.cockpit20260902.budgetRepartiMolettes);
  const epExpress=Number(xv&&xv.pilotable&&xv.pilotable.allocation);
  const epDispoCer=Number(cev&&cev.periodes&&cev.periodes[0]&&cev.periodes[0].v37&&cev.periodes[0].v37.cockpit20260902&&cev.periodes[0].v37.cockpit20260902.epDisponible);
  const epDispoExpress=Number(xv&&xv.pilotable&&xv.pilotable.reste);

  const detteCredits=Number(crv&&crv.endettementTotal);
  const dettePatrimoine=Number(pv&&pv.coherence&&pv.coherence.totalDettesPatrimoine);
  const ecartDettePatrimoine=Number(pv&&pv.coherence&&pv.coherence.ecartDette);

  const modules=[operations,comptes,tresorerie,dashboard,cerbere,express,credits,patrimoine,analyses];
  const controles=[
    {code:'TOUS_ENDPOINTS_REPONDENT',ok:modules.every(x=>x.ok),detail:modules.filter(x=>!x.ok).map(x=>x.nom+': '+x.erreur).join(' | ')||'9/9 endpoints disponibles'},
    {code:'OPERATIONS_REEL_FUTUR_CONSERVES',ok:Array.isArray(ov.Operations)&&Array.isArray(ov.Operations_futures)&&Number(ov.Operations_futures.length)>0,detail:'affichables '+Number((ov.Operations||[]).length)+' ; futures '+Number((ov.Operations_futures||[]).length)},
    {code:'SOLDE_REEL_INTERMODULE',ok:soldes.length>=4&&ecartSolde!==null&&Math.abs(ecartSolde)<=.01,detail:'comptes='+soldeComptes+' ; tresorerie='+soldeTres+' ; dashboard='+soldeDash+' ; cerbere='+soldeCer+' ; ecart='+ecartSolde},
    {code:'CERBERE_EXPRESS_EP_COHERENT',ok:Number.isFinite(epCer)&&Number.isFinite(epExpress)&&Math.abs(arrCardsStability20260917_(epCer-epExpress))<=.01,detail:'Cerbère EP='+epCer+' ; Express EP='+epExpress},
    {code:'CERBERE_EXPRESS_RESTE_COHERENT',ok:(!Number.isFinite(epDispoCer)||!Number.isFinite(epDispoExpress))?true:Math.abs(arrCardsStability20260917_(epDispoCer-epDispoExpress))<=.01,detail:'Cerbère reste='+epDispoCer+' ; Express reste='+epDispoExpress},
    {code:'CREDITS_PATRIMOINE_DETTE_COHERENTE',ok:Number.isFinite(detteCredits)&&Number.isFinite(dettePatrimoine)&&Number.isFinite(ecartDettePatrimoine)&&Math.abs(ecartDettePatrimoine)<=.01&&Math.abs(arrCardsStability20260917_(detteCredits-dettePatrimoine))<=.01,detail:'crédits='+detteCredits+' ; patrimoine='+dettePatrimoine+' ; écart='+ecartDettePatrimoine},
    {code:'COMPTES_SANS_SNAPSHOT_LOCAL_ACTIF',ok:String(cv&&cv.performance&&cv.performance.source||'')!=='snapshot_local_secours',detail:'source='+String(cv&&cv.performance&&cv.performance.source||'')},
    {code:'OPERATIONS_LECTURE_SANS_ECRITURE',ok:Number(ov&&ov._performance&&ov._performance.snapshotMs||0)===0,detail:'snapshotMs='+Number(ov&&ov._performance&&ov._performance.snapshotMs||0)}
  ];

  const out={ok:controles.every(c=>c.ok),version:BUDGETSOFT_CARDS_STABILITY_AUDIT_20260917_VERSION,lectureSeule:true,dureeMs:Date.now()-t0,controles,sources:{operations:String(ov&&ov.meta&&ov.meta.source||''),comptes:String(cv&&cv.performance&&cv.performance.source||''),tresorerie:String(tv&&tv.proprietaireBudgetSoft||''),dashboard:String(dv&&dv.sourceBudgetSoft||dv&&dv.source||''),cerbere:String(cev&&cev.sourceBudgetSoft||''),cerbereExpress:String(xv&&xv.sourceBudgetSoft||''),credits:String(crv&&crv.sourceBudgetSoft||''),patrimoine:String(pv&&pv.sourceBudgetSoft||''),analyses:String(analyses.valeur&&analyses.valeur.sourceBudgetSoft||analyses.valeur&&analyses.valeur.source||'')},dureesMs:Object.fromEntries(modules.map(x=>[x.nom,x.dureeMs]))};
  console.log('[AUDIT CARTES STABILITE BUDGETSOFT 20260917] '+JSON.stringify(out));
  return out;
}
