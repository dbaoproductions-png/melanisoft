/**
 * Override terminal de sécurité.
 * Apps Script autorise plusieurs définitions globales ; cette fonction est placée
 * en fin de chargement pour empêcher une ancienne implémentation historique de
 * reprendre la main. Tous les appels hérités passent ainsi par la primitive V3.
 */
function dedoublonnerOperationsCartesBudgetSoft_(operations){
  return dedoublonnerOperationsCartesCanonique20260906V3_(operations);
}
