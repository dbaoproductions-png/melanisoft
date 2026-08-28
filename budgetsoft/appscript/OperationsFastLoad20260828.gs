const OPERATIONS_FAST_LOAD_20260828_VERSION='2026-08-28.1';

/**
 * Charge uniquement ce dont l'écran Opérations a besoin.
 * Le chargement global de BudgetSoft peut continuer en arrière-plan sans bloquer
 * l'affichage des mouvements, comptes et catégories.
 */
function chargerOperationsLeger20260828(){
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
