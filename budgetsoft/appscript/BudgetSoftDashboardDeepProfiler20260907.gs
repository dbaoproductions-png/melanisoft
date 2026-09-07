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
