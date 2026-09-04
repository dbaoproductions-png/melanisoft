function chargerPatrimoine() {
  verifierInitialisation_();
  const actifs = lireTable_('Actifs');
  const comptes = lireTable_('Comptes').filter(c => convertirBooleen_(c.actif));
  const operations = lireTable_('Operations');

  const soldeCompte = c => {
    const id = String(c.id || '');
    const nom = String(c.nom || '');
    return Math.round((convertirNombre_(c.solde_initial || 0) + operations
      .filter(o => String(o.compte || '') === id || String(o.compte || '') === nom)
      .reduce((s,o) => s + convertirNombre_(o.montant || 0), 0)) * 100) / 100;
  };

  const financiers = comptes.map(c => ({
    id: c.id,
    nom: c.nom,
    type: String(c.type || '').toLowerCase(),
    solde: soldeCompte(c)
  }));
  const livrets = financiers.filter(c => c.type === 'epargne');
  const placements = financiers.filter(c => c.type === 'placement');

  const totalActifsPatrimoniaux = actifs.reduce((s,a) => s + Math.max(0, convertirNombre_(a.valeur || 0)), 0);
  const totalLivrets = livrets.reduce((s,c) => s + Math.max(0, Number(c.solde || 0)), 0);
  const totalPlacements = placements.reduce((s,c) => s + Math.max(0, Number(c.solde || 0)), 0);
  const totalFinancier = totalLivrets + totalPlacements;

  return {
    actifs,
    livrets,
    placements,
    totalActifsPatrimoniaux: Math.round(totalActifsPatrimoniaux * 100) / 100,
    totalLivrets: Math.round(totalLivrets * 100) / 100,
    totalPlacements: Math.round(totalPlacements * 100) / 100,
    totalFinancier: Math.round(totalFinancier * 100) / 100,
    totalActifs: Math.round((totalActifsPatrimoniaux + totalFinancier) * 100) / 100
  };
}

function enregistrerActifPatrimonial(donnee) {
  return enregistrerLigne('Actifs', {
    id: donnee.id || '', nom: String(donnee.nom || '').trim(), type: String(donnee.type || 'Autre').trim(),
    valeur: Math.max(0, convertirNombre_(donnee.valeur || 0)), date_valeur: donnee.date_valeur ? new Date(donnee.date_valeur) : new Date()
  });
}

function enregistrerDettePatrimoniale(donnee) {
  const table = donnee.table === 'Credits' ? 'Credits' : 'Dettes';
  const ligne = { id: donnee.id || '', nom: String(donnee.nom || '').trim(), capital_restant: Math.max(0, convertirNombre_(donnee.capital_restant || 0)), mensualite: Math.max(0, convertirNombre_(donnee.mensualite || 0)), taux: Math.max(0, convertirNombre_(donnee.taux || 0)), date_fin: donnee.date_fin ? new Date(donnee.date_fin) : '' };
  if (table === 'Credits') ligne.date_debut = donnee.date_debut ? new Date(donnee.date_debut) : '';
  return enregistrerLigne(table, ligne);
}