const BUDGETSOFT_DASHBOARD_DEEP_PROFILE_VERSION='2026-09-07.1';

/**
 * Profil fin du calcul propriétaire Dashboard, sans publication de snapshot.
 * Le label budgetsoft-global-snapshot force le chemin de recalcul et non la lecture
 * du snapshot déjà publié. Toutes les fonctions instrumentées sont restaurées.
 */
function profilerDashboardBudgetSoft20260907(){
  const mesures={},restaurations=[];
  const tGlobal=Date.now();

  function envelopper(nom,getter,setter){
    let original;
    try{original=getter();}catch(e){return;}
    if(typeof original!=='function')return;
    mesures[nom]={appels:0,dureeMs:0,maxMs:0};
    const wrapped=function(){
      const t=Date.now();
      try{return original.apply(this,arguments);}
      finally{const dt=Date.now()-t,m=mesures[nom];m.appels++;m.dureeMs+=dt;if(dt>m.maxMs)m.maxMs=dt;}
    };
    setter(wrapped);
    restaurations.push(function(){setter(original);});
  }

  // Grandes briques V2.
  envelopper('chargerDashboardReel',()=>chargerDashboardReel,v=>chargerDashboardReel=v);
  envelopper('projectionChargesFixesCycle2026_',()=>projectionChargesFixesCycle2026_,v=>projectionChargesFixesCycle2026_=v);
  envelopper('statsEconomiquesDashboard2026_',()=>statsEconomiquesDashboard2026_,v=>statsEconomiquesDashboard2026_=v);
  envelopper('salaireMoyenNetBancaire2026_',()=>salaireMoyenNetBancaire2026_,v=>salaireMoyenNetBancaire2026_=v);

  // Helpers susceptibles d'expliquer le coût de DashboardData.
  if(typeof detecterSalairePrincipal_==='function')envelopper('detecterSalairePrincipal_',()=>detecterSalairePrincipal_,v=>detecterSalairePrincipal_=v);
  if(typeof calculerCycleDepuisSalaire_==='function')envelopper('calculerCycleDepuisSalaire_',()=>calculerCycleDepuisSalaire_,v=>calculerCycleDepuisSalaire_=v);
  if(typeof calculerEcheancesChargeFixeAjustees_==='function')envelopper('calculerEcheancesChargeFixeAjustees_',()=>calculerEcheancesChargeFixeAjustees_,v=>calculerEcheancesChargeFixeAjustees_=v);
  if(typeof calculerEcheancesJusqua_==='function')envelopper('calculerEcheancesJusqua_',()=>calculerEcheancesJusqua_,v=>calculerEcheancesJusqua_=v);
  if(typeof enrichirDepuisCommentaireBanque_==='function')envelopper('enrichirDepuisCommentaireBanque_',()=>enrichirDepuisCommentaireBanque_,v=>enrichirDepuisCommentaireBanque_=v);
  if(typeof dateJourCycle_==='function')envelopper('dateJourCycle_',()=>dateJourCycle_,v=>dateJourCycle_=v);
  if(typeof dateLocaleBudgetSoft_==='function')envelopper('dateLocaleBudgetSoft_',()=>dateLocaleBudgetSoft_,v=>dateLocaleBudgetSoft_=v);
  if(typeof cleMoisMetier2026_==='function')envelopper('cleMoisMetier2026_',()=>cleMoisMetier2026_,v=>cleMoisMetier2026_=v);

  let dashboard=null,erreur='';
  try{
    const calcul=function(){return chargerDashboardReelV2();};
    dashboard=typeof avecContexteLectureBudgetSoft20260827_==='function'
      ?avecContexteLectureBudgetSoft20260827_('budgetsoft-global-snapshot',calcul)
      :calcul();
  }catch(e){erreur=String(e&&e.stack||e&&e.message||e);}
  finally{for(let i=restaurations.length-1;i>=0;i--){try{restaurations[i]();}catch(e){}}}

  const ordre=Object.keys(mesures).map(k=>({fonction:k,appels:mesures[k].appels,dureeMs:mesures[k].dureeMs,maxMs:mesures[k].maxMs}))
    .sort((a,b)=>b.dureeMs-a.dureeMs);
  const r={ok:!erreur,version:BUDGETSOFT_DASHBOARD_DEEP_PROFILE_VERSION,dureeTotaleMs:Date.now()-tGlobal,ordre:ordre,erreur:erreur,
    resultat:dashboard&&dashboard.courtTerme?{soldeBancaire:dashboard.courtTerme.soldeBancaire,versionCorrection:dashboard.versionCorrection||''}:null};
  console.log('[PROFILE Dashboard BudgetSoft] '+JSON.stringify(r));
  return r;
}

/**
 * Profil final lecture seule de la base Cerbère 3.7.24.
 * Périmètre explicite : reproduit, dans le même ordre, les étapes internes de
 * chargerCerbereV374(), depuis chargerCerbereV37() jusqu'à stabiliserCerbereV3717_.
 * Référence temporelle : instant exact de l'exécution ; horizon : les 6 périodes
 * retournées par Cerbère. Source de vérité : la chaîne métier V374 elle-même.
 * Aucun snapshot n'est publié et aucune donnée n'est écrite.
 */
function auditerProfilFinalBaseCerbereBudgetSoft20260910(){
  const tGlobal=Date.now(),temps={},referenceAudit=new Date().toISOString();
  const executer=function(){
    let x,t;
    function etape(nom,fn){t=Date.now();x=fn(x);temps[nom]=Date.now()-t;return x;}

    t=Date.now();
    x=chargerCerbereV37();
    temps.chargerCerbereV37=Date.now()-t;
    if(!x||x.ok===false)return{ok:false,version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,referenceAudit:referenceAudit,erreur:'Socle chargerCerbereV37 invalide.',temps:temps};

    etape('appliquerResteReellementPilotableV374',function(v){return appliquerResteReellementPilotableV374_(v);});
    etape('appliquerAuditCerbereV377',function(v){return typeof appliquerAuditCerbereV377_==='function'?appliquerAuditCerbereV377_(v):v;});
    etape('appliquerHistoriqueR0V378',function(v){return typeof appliquerHistoriqueR0V378_==='function'?appliquerHistoriqueR0V378_(v):v;});
    etape('appliquerRapprochementCerbereV3711',function(v){return typeof appliquerRapprochementCerbereV3711_==='function'?appliquerRapprochementCerbereV3711_(v):v;});
    etape('appliquerDoctrineCycleV3712',function(v){return typeof appliquerDoctrineCycleV3712_==='function'?appliquerDoctrineCycleV3712_(v):v;});
    etape('appliquerConventionSalaireTousCyclesV3712',function(v){return typeof appliquerConventionSalaireTousCyclesV3712_==='function'?appliquerConventionSalaireTousCyclesV3712_(v):v;});
    etape('appliquerProjectionFrontiereV3713',function(v){return typeof appliquerProjectionFrontiereV3713_==='function'?appliquerProjectionFrontiereV3713_(v):v;});
    etape('corrigerProjectionFrontiereV3713b',function(v){return typeof corrigerProjectionFrontiereV3713b_==='function'?corrigerProjectionFrontiereV3713b_(v):v;});
    etape('corrigerEffetsFinanciersActionsV3713',function(v){return typeof corrigerEffetsFinanciersActionsV3713_==='function'?corrigerEffetsFinanciersActionsV3713_(v):v;});
    etape('stabiliserCerbereV3716',function(v){return stabiliserCerbereV3716_(v);});
    etape('stabiliserCerbereV3717',function(v){return stabiliserCerbereV3717_(v);});

    if(x&&typeof x==='object')x.version=typeof CERBERE_PILOTAGE_V374_VERSION!=='undefined'?CERBERE_PILOTAGE_V374_VERSION:String(x.version||'');
    t=Date.now();const final=serialiserCerberePourClient_(x);temps.serialisationFinale=Date.now()-t;
    const totalEtapes=Object.keys(temps).reduce(function(s,k){return s+Number(temps[k]||0);},0);
    const classement=Object.keys(temps).map(function(k){return{etape:k,dureeMs:temps[k],partPct:totalEtapes?Math.round(temps[k]/totalEtapes*1000)/10:0};}).sort(function(a,b){return b.dureeMs-a.dureeMs;});
    const periodes=Array.isArray(final&&final.periodes)?final.periodes:[];
    const p1=periodes[0]||{},v1=p1.v37||{},env1=Array.isArray(p1.enveloppes)?p1.enveloppes:[];
    const allocation=env1.reduce(function(s,e){return s+Math.max(0,Number(e&&e.prevu||0));},0);
    const consomme=env1.reduce(function(s,e){return s+Math.max(0,Number(e&&e.reelNetPrevisionnel!=null?e.reelNetPrevisionnel:e&&e.reelImpute||0));},0);
    const reste=env1.reduce(function(s,e){return s+Number(e&&e.resteV37!=null?e.resteV37:0);},0);
    return{
      ok:!!(final&&final.ok!==false&&periodes.length===6),version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,
      perimetre:{observe:'chaîne interne actuelle de chargerCerbereV374()',referenceTemporelle:referenceAudit,horizon:'6 périodes Cerbère P1-P6',sourceDeVerite:'fonctions métier V374 actuelles, rejouées dans leur ordre de production'},
      temps:temps,totalEtapesMs:totalEtapes,classement:classement,
      signature:{moteur:String(final&&final.version||''),nombrePeriodes:periodes.length,p1Cle:String(p1&&p1.clePilotage||''),p1BudgetDisponible:Number(p1&&p1.budgetDisponible||0),p1Allocation:Math.round(allocation*100)/100,p1Consomme:Math.round(consomme*100)/100,p1Reste:Math.round(reste*100)/100,p1Rt1:Math.round(Number(v1.rt1||0)*100)/100,p1Cft1:Math.round(Number(v1.cft1||0)*100)/100,p1Het1:Math.round(Number(v1.het1||0)*100)/100},
      diagnosticDecision:'Si une étape isolée dépasse environ 2 s et correspond à un recalcul ou une relecture évitable, construire ensuite un A/B strict. Sinon arrêter l’optimisation profonde.',
      doctrine:'Profilage uniquement : aucun changement métier ni optimisation appliquée.'
    };
  };
  let out;
  try{out=typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('audit-profil-final-base-cerbere-20260910',executer):executer();}
  catch(e){out={ok:false,version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,referenceAudit:referenceAudit,erreur:String(e&&e.stack||e&&e.message||e),temps:temps};}
  out.dureeTotaleMs=Date.now()-tGlobal;
  console.log('[AUDIT PERF final base Cerbère] '+JSON.stringify(out));
  return out;
}
