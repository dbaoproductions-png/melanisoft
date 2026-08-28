const OPERATIONS_LAZY_20260828_VERSION='2026-08-28.1';

function chargerOperationsLeger20260828(){
  const t0=Date.now();
  verifierInitialisation_();
  const t1=Date.now();
  const operations=lireTable_('Operations');
  const t2=Date.now();
  const comptes=lireTable_('Comptes');
  const t3=Date.now();
  const categories=lireTable_('Categories');
  const t4=Date.now();
  return {
    meta:{version:OPERATIONS_LAZY_20260828_VERSION,source:'operations-light'},
    Operations:operations,
    Comptes:comptes,
    Categories:categories,
    Charges_fixes:[],
    _performance:{
      totalMs:t4-t0,
      initialisationMs:t1-t0,
      operationsMs:t2-t1,
      comptesMs:t3-t2,
      categoriesMs:t4-t3,
      operations:operations.length
    }
  };
}
