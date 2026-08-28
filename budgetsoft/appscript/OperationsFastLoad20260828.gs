const OPERATIONS_FAST_LOAD_20260828_VERSION='2026-08-28.2';

/**
 * Primitive de lecture dédiée à l'écran Opérations.
 * La fonction publique chargerOperationsLeger20260828() est définie une seule fois
 * dans OperationsLazy20260828.gs afin d'éviter les doubles définitions Apps Script.
 */
function lireOperationsLeger20260828_(){
  const debut=Date.now();
  verifierInitialisation_();
  const operations=lireTable_('Operations');
  const comptes=lireTable_('Comptes');
  const categories=lireTable_('Categories');
  return{
    ok:true,
    version:OPERATIONS_FAST_LOAD_20260828_VERSION,
    dureeMs:Date.now()-debut,
    Operations:operations,
    Comptes:comptes,
    Categories:categories,
    meta:{version:'0.8-lab',source:'operations_leger'}
  };
}
