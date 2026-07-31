function chargerPatrimoine() {
  verifierInitialisation_();
  const actifs = lireTable_('Actifs');
  const dettes = lireTable_('Dettes');
  const credits = lireTable_('Credits');
  const totalActifs = actifs.reduce((s, a) => s + Math.max(0, convertirNombre_(a.valeur || 0)), 0);
  const totalDettes = dettes.reduce((s, d) => s + Math.max(0, convertirNombre_(d.capital_restant || 0)), 0)
    + credits.reduce((s, c) => s + Math.max(0, convertirNombre_(c.capital_restant || 0)), 0);
  return { actifs, dettes, credits, totalActifs, totalDettes, patrimoineNet: totalActifs - totalDettes };
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