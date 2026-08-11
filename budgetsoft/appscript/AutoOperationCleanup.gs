function supprimerOperationBudgetSoft(id) {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const cible = operations.find(o => String(o.id) === String(id));
  if (!cible) return { supprimees: 0, mode: 'absente' };

  const marqueur = extraireMarqueur_(cible.commentaire);
  if (!marqueur) {
    return { supprimees: supprimerLigne('Operations', id) ? 1 : 0, mode: 'normale' };
  }

  const memes = operations.filter(o => extraireMarqueur_(o.commentaire) === marqueur);
  if (memes.length <= 1) {
    return { supprimees: 0, mode: 'unique_auto', message: 'Occurrence automatique unique : la supprimer ferait recréer la même échéance au prochain recalcul.' };
  }

  const aSupprimer = memes.slice(1);
  let supprimees = 0;
  aSupprimer.forEach(o => { if (supprimerLigne('Operations', o.id)) supprimees++; });
  return { supprimees, mode: 'doublons_auto', conserves: 1 };
}
