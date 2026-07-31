const OBJECTIFS_VERSION = '1.4';

function chargerObjectifs() {
  verifierInitialisation_();
  const objectifs = lireTable_('Objectifs').map(objectif => enrichirObjectif_(objectif));
  const actifs = objectifs.filter(o => o.statut !== 'Terminé');
  return {
    version: OBJECTIFS_VERSION,
    objectifs,
    totaux: {
      cible: objectifs.reduce((s, o) => s + o.montant_cible, 0),
      actuel: objectifs.reduce((s, o) => s + o.montant_actuel, 0),
      restant: objectifs.reduce((s, o) => s + o.restant, 0),
      effortMensuel: actifs.reduce((s, o) => s + o.effort_mensuel, 0)
    }
  };
}

function enregistrerObjectif(donnees) {
  verifierInitialisation_();
  const objectif = Object.assign({}, donnees || {});
  objectif.nom = String(objectif.nom || '').trim();
  if (!objectif.nom) throw new Error('Le nom de l’objectif est obligatoire.');
  objectif.montant_cible = Math.max(0, convertirNombre_(objectif.montant_cible || 0));
  objectif.montant_actuel = Math.max(0, convertirNombre_(objectif.montant_actuel || 0));
  if (objectif.montant_cible <= 0) throw new Error('Le montant cible doit être supérieur à zéro.');
  objectif.date_cible = objectif.date_cible ? new Date(objectif.date_cible) : '';
  if (objectif.date_cible instanceof Date && isNaN(objectif.date_cible.getTime())) throw new Error('La date cible est invalide.');
  objectif.statut = objectif.montant_actuel >= objectif.montant_cible
    ? 'Terminé'
    : String(objectif.statut || 'En cours');
  enregistrerLigne('Objectifs', objectif);
  return chargerObjectifs();
}

function supprimerObjectif(id) {
  verifierInitialisation_();
  if (!id) throw new Error('Objectif introuvable.');
  supprimerLigne('Objectifs', id);
  return chargerObjectifs();
}

function verserSurObjectif(id, montant) {
  verifierInitialisation_();
  const valeur = convertirNombre_(montant || 0);
  if (valeur <= 0) throw new Error('Le versement doit être supérieur à zéro.');
  const objectif = lireTable_('Objectifs').find(o => String(o.id) === String(id));
  if (!objectif) throw new Error('Objectif introuvable.');
  objectif.montant_actuel = Math.min(
    Number(objectif.montant_cible || 0),
    Number(objectif.montant_actuel || 0) + valeur
  );
  objectif.statut = objectif.montant_actuel >= Number(objectif.montant_cible || 0) ? 'Terminé' : 'En cours';
  enregistrerLigne('Objectifs', objectif);
  return chargerObjectifs();
}

function enrichirObjectif_(objectif) {
  const cible = Math.max(0, Number(objectif.montant_cible || 0));
  const actuel = Math.max(0, Number(objectif.montant_actuel || 0));
  const restant = Math.max(0, cible - actuel);
  const dateCible = objectif.date_cible ? new Date(objectif.date_cible) : null;
  const maintenant = debutJour_(new Date());
  let moisRestants = 0;
  if (dateCible && !isNaN(dateCible.getTime()) && dateCible > maintenant) {
    moisRestants = Math.max(1,
      (dateCible.getFullYear() - maintenant.getFullYear()) * 12 +
      dateCible.getMonth() - maintenant.getMonth() +
      (dateCible.getDate() >= maintenant.getDate() ? 1 : 0)
    );
  }
  const progression = cible > 0 ? Math.min(100, Math.round(actuel / cible * 100)) : 0;
  return Object.assign({}, objectif, {
    montant_cible: cible,
    montant_actuel: actuel,
    restant,
    progression,
    mois_restants: moisRestants,
    effort_mensuel: moisRestants > 0 ? restant / moisRestants : restant,
    en_retard: restant > 0 && dateCible && !isNaN(dateCible.getTime()) && dateCible < maintenant
  });
}
