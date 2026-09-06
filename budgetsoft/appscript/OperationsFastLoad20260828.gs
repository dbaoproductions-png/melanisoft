const OPERATIONS_FAST_LOAD_20260828_VERSION='2026-09-06.4';

/**
 * Primitive de lecture dédiée à l'écran Opérations.
 * Doctrine BudgetSoft : l'écran courant ne reçoit que les opérations dont la
 * date_comptable est atteinte. Les futures restent séparées et ne peuvent donc
 * plus apparaître prématurément dans la liste normale.
 */
function lireOperationsLeger20260828_(){
  const debut=Date.now();
  verifierInitialisation_();
  const toutesSource=lireTable_('Operations');
  const toutes=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(toutesSource):toutesSource;
  const comptes=lireTable_('Comptes');
  const categories=lireTable_('Categories');
  const partition=typeof partitionnerOperationsCanoniqueBudgetSoft20260906_==='function'
    ?partitionnerOperationsCanoniqueBudgetSoft20260906_(toutes,new Date())
    :{realisees:toutes,futures:[],indatees:[]};
  return{
    ok:true,
    version:OPERATIONS_FAST_LOAD_20260828_VERSION,
    dureeMs:Date.now()-debut,
    Operations:partition.realisees,
    Operations_futures:partition.futures,
    Operations_indatees:partition.indatees,
    Comptes:comptes,
    Categories:categories,
    meta:{
      version:'0.8-lab',source:'operations_leger_canonique',
      dateReference:partition.dateReference||'',
      totalSource:toutesSource.length,
      totalCanonique:toutes.length,
      doublonsBancairesExclus:Math.max(0,toutesSource.length-toutes.length),
      realisees:partition.realisees.length,
      futures:partition.futures.length,
      indatées:partition.indatees.length
    }
  };
}
