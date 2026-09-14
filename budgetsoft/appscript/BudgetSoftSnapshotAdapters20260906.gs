const BUDGETSOFT_SNAPSHOT_ADAPTERS_VERSION='2026-09-14.2';

function chargerDashboardDepuisSnapshotGlobalBudgetSoft20260906(){
  const t0=Date.now();
  const m=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'?lireModuleSnapshotGlobalBudgetSoft20260906_('dashboard'):null;
  if(!m)return{ok:false,version:BUDGETSOFT_SNAPSHOT_ADAPTERS_VERSION,source:'absent',dureeMs:Date.now()-t0,message:'Dashboard absent du snapshot global.'};
  m.ok=m.ok!==false;
  m.source='snapshot_global';
  m.dureeLectureSnapshotMs=Date.now()-t0;
  return m;
}

function chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906(){
  const t0=Date.now();
  let m=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'?lireModuleSnapshotGlobalBudgetSoft20260906_('cerbere'):null;
  if(!m)return{ok:false,version:BUDGETSOFT_SNAPSHOT_ADAPTERS_VERSION,source:'absent',dureeMs:Date.now()-t0,message:'Cerbère absent du snapshot global.'};

  /*
   * Compatibilité 2026-09-14 : les snapshots Cerbère produits avant l'unification
   * des charges fixes peuvent encore porter un CF2 périmé. L'adaptateur orchestre
   * alors une remise à niveau via le propriétaire Charges_fixes ; il ne possède
   * aucun calcul métier et ne modifie pas la révision persistée.
   */
  if(typeof corrigerCerbereChargesFixesSnapshot20260914_==='function'){
    try{m=corrigerCerbereChargesFixesSnapshot20260914_(m)||m;}catch(e){
      m=Object.assign({},m,{diagnostic:Object.assign({},m.diagnostic||{},{cfSnapshotBridge20260914:{ok:false,erreur:String(e&&e.message||e)}})});
    }
  }

  m.ok=m.ok!==false;
  m.source='snapshot_global';
  m.sourceBudgetSoft=String(m.sourceBudgetSoft||'snapshot_global')+(m&&m.diagnostic&&m.diagnostic.cfSnapshotBridge20260914&&m.diagnostic.cfSnapshotBridge20260914.applique?'_cf_canonique':'');
  m.dureeLectureSnapshotMs=Date.now()-t0;
  return m;
}

function auditerAdaptateursSnapshotDashboardCerbere20260906(){
  const d0=Date.now(),dashboard=chargerDashboardDepuisSnapshotGlobalBudgetSoft20260906(),d1=Date.now(),cerbere=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906(),d2=Date.now();
  const revisionAttendue=dashboard&&dashboard.revisionBudgetSoft||cerbere&&cerbere.revisionBudgetSoft||'';
  const erreurs=[];
  if(!dashboard||dashboard.ok===false||dashboard.source!=='snapshot_global')erreurs.push({module:'dashboard',code:'SOURCE'});
  if(!cerbere||cerbere.ok===false||cerbere.source!=='snapshot_global')erreurs.push({module:'cerbere',code:'SOURCE'});
  if(revisionAttendue&&dashboard&&dashboard.revisionBudgetSoft!==revisionAttendue)erreurs.push({module:'dashboard',code:'REVISION'});
  if(revisionAttendue&&cerbere&&cerbere.revisionBudgetSoft!==revisionAttendue)erreurs.push({module:'cerbere',code:'REVISION'});
  const pont=cerbere&&cerbere.diagnostic&&cerbere.diagnostic.cfSnapshotBridge20260914||null;
  const r={ok:erreurs.length===0,version:BUDGETSOFT_SNAPSHOT_ADAPTERS_VERSION,revisionBudgetSoft:revisionAttendue,resultats:{dashboard:{ok:!!(dashboard&&dashboard.ok!==false),source:dashboard&&dashboard.source||'',revisionBudgetSoft:dashboard&&dashboard.revisionBudgetSoft||'',dureeMs:d1-d0},cerbere:{ok:!!(cerbere&&cerbere.ok!==false),source:cerbere&&cerbere.source||'',sourceBudgetSoft:cerbere&&cerbere.sourceBudgetSoft||'',revisionBudgetSoft:cerbere&&cerbere.revisionBudgetSoft||'',dureeMs:d2-d1,pontChargesFixes:pont}},erreurs};
  console.log(JSON.stringify(r));return r;
}
