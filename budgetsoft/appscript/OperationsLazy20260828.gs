const OPERATIONS_LAZY_20260828_VERSION='2026-09-06.3';

function chargerOperationsLeger20260828(){
  const t0=Date.now();
  const data=typeof lireOperationsLeger20260828_==='function'
    ?lireOperationsLeger20260828_()
    :{Operations:lireTable_('Operations'),Operations_futures:[],Operations_indatees:[],Comptes:lireTable_('Comptes'),Categories:lireTable_('Categories')};
  const t1=Date.now();
  let snapshot=null;
  try{
    if(typeof memoriserSnapshotOperations20260828==='function'){
      const toutes=(data.Operations||[]).concat(data.Operations_futures||[],data.Operations_indatees||[]);
      snapshot=memoriserSnapshotOperations20260828(toutes,data.Comptes||[],data.Categories||[]);
    }
  }catch(e){snapshot={ok:false,erreur:String(e&&e.message||e)};}
  const t2=Date.now();
  return {
    ok:true,
    meta:Object.assign({version:OPERATIONS_LAZY_20260828_VERSION,source:'operations-light-canonique'},data.meta||{}),
    // Contrat UI : Operations = uniquement le Réel à date_comptable atteinte.
    Operations:data.Operations||[],
    Operations_futures:data.Operations_futures||[],
    Operations_indatees:data.Operations_indatees||[],
    Comptes:data.Comptes||[],
    Categories:data.Categories||[],
    Charges_fixes:[],
    _performance:{
      totalMs:t2-t0,
      lectureMs:t1-t0,
      snapshotMs:t2-t1,
      operations:(data.Operations||[]).length,
      futures:(data.Operations_futures||[]).length,
      indatées:(data.Operations_indatees||[]).length,
      snapshotOk:!!(snapshot&&snapshot.ok)
    }
  };
}
