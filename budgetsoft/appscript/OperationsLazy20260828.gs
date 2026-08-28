const OPERATIONS_LAZY_20260828_VERSION='2026-08-28.2';

function chargerOperationsLeger20260828(){
  const t0=Date.now();
  const data=typeof lireOperationsLeger20260828_==='function'
    ?lireOperationsLeger20260828_()
    :{Operations:lireTable_('Operations'),Comptes:lireTable_('Comptes'),Categories:lireTable_('Categories')};
  const t1=Date.now();
  let snapshot=null;
  try{
    if(typeof memoriserSnapshotOperations20260828==='function')snapshot=memoriserSnapshotOperations20260828(data.Operations||[],data.Comptes||[],data.Categories||[]);
  }catch(e){snapshot={ok:false,erreur:String(e&&e.message||e)};}
  const t2=Date.now();
  return {
    ok:true,
    meta:{version:OPERATIONS_LAZY_20260828_VERSION,source:'operations-light'},
    Operations:data.Operations||[],
    Comptes:data.Comptes||[],
    Categories:data.Categories||[],
    Charges_fixes:[],
    _performance:{
      totalMs:t2-t0,
      lectureMs:t1-t0,
      snapshotMs:t2-t1,
      operations:(data.Operations||[]).length,
      snapshotOk:!!(snapshot&&snapshot.ok)
    }
  };
}
