function supprimerOperationBudgetSoft(id) {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const cible = operations.find(o => String(o.id) === String(id));
  if (!cible) return { supprimees: 0, mode: 'absente' };
  return { supprimees: supprimerLigne('Operations', id) ? 1 : 0, mode: 'normale' };
}

/**
 * Migration explicite des anciennes lignes créées par l'ancien moteur de
 * récurrence. À lancer volontairement après sauvegarde du classeur.
 */
function purgerAnciennesOperationsRecurrence() {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const synthetiques = operations.filter(o => /\[RECURRENCE:[^\]]+\]/.test(String(o.commentaire || '')));
  let supprimees = 0;
  synthetiques.forEach(o => { if (supprimerLigne('Operations', o.id)) supprimees++; });
  return { detectees: synthetiques.length, supprimees, mode: 'migration_expresse' };
}
