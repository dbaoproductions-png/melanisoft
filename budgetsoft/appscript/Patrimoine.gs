function chargerPatrimoine() {
  verifierInitialisation_();
  const actifs = lireTable_('Actifs');
  const comptes = lireTable_('Comptes').filter(c => convertirBooleen_(c.actif));
  const operations = lireTable_('Operations');
  const credits = lireTable_('Credits').filter(c => Math.max(0, convertirNombre_(c.capital_restant || 0)) > 0);
  const dettes = lireTable_('Dettes').filter(d => {
    const actif = d.actif === '' || d.actif === null || d.actif === undefined ? true : convertirBooleen_(d.actif);
    return actif && Math.max(0, convertirNombre_(d.capital_restant || 0)) > 0;
  });

  // Un seul parcours des opérations : auparavant chaque compte rescannait toute la table.
  const compteCanonique = {};
  comptes.forEach(c => {
    const id = String(c.id || '').trim();
    const nom = String(c.nom || '').trim();
    if(id) compteCanonique[id] = id;
    if(nom) compteCanonique[nom] = id || nom;
  });
  const mouvementsParCompte = {};
  operations.forEach(o => {
    const cle = compteCanonique[String(o.compte || '').trim()];
    if(!cle) return;
    mouvementsParCompte[cle] = (mouvementsParCompte[cle] || 0) + convertirNombre_(o.montant || 0);
  });

  const financiers = comptes.map(c => {
    const cle = String(c.id || '').trim() || String(c.nom || '').trim();
    const solde = Math.round((convertirNombre_(c.solde_initial || 0) + Number(mouvementsParCompte[cle] || 0)) * 100) / 100;
    return {id:c.id, nom:c.nom, type:String(c.type || '').toLowerCase(), solde};
  });
  const livrets = financiers.filter(c => c.type === 'epargne');
  const placements = financiers.filter(c => c.type === 'placement');

  const totalActifsPatrimoniaux = actifs.reduce((s,a) => s + Math.max(0, convertirNombre_(a.valeur || 0)), 0);
  const totalLivrets = livrets.reduce((s,c) => s + Math.max(0, Number(c.solde || 0)), 0);
  const totalPlacements = placements.reduce((s,c) => s + Math.max(0, Number(c.solde || 0)), 0);
  const totalFinancier = totalLivrets + totalPlacements;
  const totalActifs = totalActifsPatrimoniaux + totalFinancier;
  const totalCredits = credits.reduce((s,c) => s + Math.max(0, convertirNombre_(c.capital_restant || 0)), 0);
  const totalDettesHorsCredit = dettes.reduce((s,d) => s + Math.max(0, convertirNombre_(d.capital_restant || 0)), 0);
  const totalDettes = totalCredits + totalDettesHorsCredit;
  const patrimoineNet = totalActifs - totalDettes;
  const r = n => Math.round(Number(n || 0) * 100) / 100;

  return {
    actifs,
    livrets,
    placements,
    credits,
    dettes,
    totalActifsPatrimoniaux:r(totalActifsPatrimoniaux),
    totalLivrets:r(totalLivrets),
    totalPlacements:r(totalPlacements),
    totalFinancier:r(totalFinancier),
    totalActifs:r(totalActifs),
    totalCredits:r(totalCredits),
    totalDettesHorsCredit:r(totalDettesHorsCredit),
    totalDettes:r(totalDettes),
    patrimoineNet:r(patrimoineNet)
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