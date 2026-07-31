const CREDITS_VERSION = '1.3';

function chargerCreditsEtDettes() {
  verifierInitialisation_();
  const credits = lireTable_('Credits');
  const dettes = lireTable_('Dettes');
  const tous = [
    ...credits.map(c => Object.assign({ table: 'Credits', nature: 'Crédit' }, c)),
    ...dettes.map(d => Object.assign({ table: 'Dettes', nature: 'Dette' }, d))
  ].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));

  const capitalRestant = tous.reduce((s, ligne) => s + Math.abs(Number(ligne.capital_restant || 0)), 0);
  const mensualites = tous.reduce((s, ligne) => s + Math.abs(Number(ligne.mensualite || 0)), 0);
  const tauxPondere = capitalRestant
    ? tous.reduce((s, ligne) => s + Math.abs(Number(ligne.capital_restant || 0)) * Math.abs(Number(ligne.taux || 0)), 0) / capitalRestant
    : 0;

  return { version: CREDITS_VERSION, lignes: tous, capitalRestant, mensualites, tauxPondere };
}

function enregistrerCreditOuDette(donnees) {
  verifierInitialisation_();
  if (!donnees || typeof donnees !== 'object') throw new Error('Données invalides.');
  const table = String(donnees.table || 'Credits') === 'Dettes' ? 'Dettes' : 'Credits';
  const nom = String(donnees.nom || '').trim();
  if (!nom) throw new Error('Le nom est obligatoire.');

  const ligne = {
    id: donnees.id || '',
    nom,
    capital_restant: Math.max(0, convertirNombre_(donnees.capital_restant || 0)),
    mensualite: Math.max(0, convertirNombre_(donnees.mensualite || 0)),
    taux: Math.max(0, convertirNombre_(donnees.taux || 0)),
    date_fin: donnees.date_fin ? new Date(donnees.date_fin) : ''
  };
  if (table === 'Credits') ligne.date_debut = donnees.date_debut ? new Date(donnees.date_debut) : '';
  enregistrerLigne(table, ligne);
  return chargerCreditsEtDettes();
}

function supprimerCreditOuDette(table, id) {
  const nomTable = String(table) === 'Dettes' ? 'Dettes' : 'Credits';
  supprimerLigne(nomTable, id);
  return chargerCreditsEtDettes();
}
