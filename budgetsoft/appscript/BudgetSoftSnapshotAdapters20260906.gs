const BUDGETSOFT_SNAPSHOT_ADAPTERS_VERSION='2026-09-14.4';

function chargerDashboardDepuisSnapshotGlobalBudgetSoft20260906(){
  const t0=Date.now();
  const m=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'?lireModuleSnapshotGlobalBudgetSoft20260906_('dashboard'):null;
  if(!m)return{ok:false,version:BUDGETSOFT_SNAPSHOT_ADAPTERS_VERSION,source:'absent',dureeMs:Date.now()-t0,message:'Dashboard absent du snapshot global.'};
  m.ok=m.ok!==false;
  m.source='snapshot_global';
  m.dureeLectureSnapshotMs=Date.now()-t0;
  return m;
}

function snapshotCerbereCfBuildFrais20260914_(m){
  const d=m&&m.diagnostic||{},b=d.cfSnapshotBuild20260914||{};
  const attendu=typeof BUDGETSOFT_CERBERE_CF_SNAPSHOT_BUILD_20260914_VERSION!=='undefined'
    ?String(BUDGETSOFT_CERBERE_CF_SNAPSHOT_BUILD_20260914_VERSION)
    :'2026-09-14.4';
  return String(b.version||'')===attendu;
}

function chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906(){
  const t0=Date.now();
  let m=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'?lireModuleSnapshotGlobalBudgetSoft20260906_('cerbere'):null;

  // Auto-rattrapage unique : si le snapshot précède la doctrine CF de construction,
  // on reconstruit une seule fois. Pendant une reconstruction globale le document
  // est déjà verrouillé : le probe échoue alors immédiatement et évite toute récursion.
  if(m&&!snapshotCerbereCfBuildFrais20260914_(m)&&typeof reconstruireSnapshotGlobalBudgetSoft20260906==='function'){
    const probe=LockService.getDocumentLock();
    let libre=false;
    try{libre=probe.tryLock(1);}catch(e){libre=false;}
    if(libre){
      try{
        probe.releaseLock();
        const r=reconstruireSnapshotGlobalBudgetSoft20260906('auto_rattrapage_cf_cerbere_20260914');
        if(r&&r.ok===true&&typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function')m=lireModuleSnapshotGlobalBudgetSoft20260906_('cerbere');
      }catch(e){
        console.log('[CERBERE SNAPSHOT AUTO-RATTRAPAGE] '+String(e&&e.message||e));
      }
    }
  }

  if(!m)return{ok:false,version:BUDGETSOFT_SNAPSHOT_ADAPTERS_VERSION,source:'absent',dureeMs:Date.now()-t0,message:'Cerbère absent du snapshot global.'};
  m.ok=m.ok!==false;
  m.source='snapshot_global';
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
  if(cerbere&&!snapshotCerbereCfBuildFrais20260914_(cerbere))erreurs.push({module:'cerbere',code:'CF_SNAPSHOT_BUILD_STALE'});
  const r={ok:erreurs.length===0,version:BUDGETSOFT_SNAPSHOT_ADAPTERS_VERSION,revisionBudgetSoft:revisionAttendue,resultats:{dashboard:{ok:!!(dashboard&&dashboard.ok!==false),source:dashboard&&dashboard.source||'',revisionBudgetSoft:dashboard&&dashboard.revisionBudgetSoft||'',dureeMs:d1-d0},cerbere:{ok:!!(cerbere&&cerbere.ok!==false),source:cerbere&&cerbere.source||'',revisionBudgetSoft:cerbere&&cerbere.revisionBudgetSoft||'',cfBuildFrais:snapshotCerbereCfBuildFrais20260914_(cerbere),dureeMs:d2-d1}},erreurs};
  console.log(JSON.stringify(r));return r;
}
