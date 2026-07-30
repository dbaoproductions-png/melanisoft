function deciderRapprochementBancaire(id, decision) {
  verifierInitialisation_();
  initialiserRapprochementsAValider_();

  const choix = String(decision || '').trim().toLowerCase();
  if (!['fusionner', 'conserver', 'ignorer'].includes(choix)) {
    throw new Error('Décision de rapprochement inconnue.');
  }

  const rapprochement = trouverRapprochementParId_(id);
  if (!rapprochement) throw new Error('Proposition de rapprochement introuvable.');
  if (String(rapprochement.statut || '') !== 'À valider') {
    throw new Error('Cette proposition a déjà été traitée.');
  }

  if (choix === 'fusionner') {
    fusionnerOperationsRapprochement_(rapprochement);
    mettreAJourRapprochement_(rapprochement.id, {
      statut: 'Traité',
      decision: 'Fusionné'
    });
  } else if (choix === 'conserver') {
    mettreAJourRapprochement_(rapprochement.id, {
      statut: 'Traité',
      decision: 'Conserver les deux'
    });
  } else {
    mettreAJourRapprochement_(rapprochement.id, {
      statut: 'Ignoré',
      decision: 'Proposition ignorée'
    });
  }

  return {
    ok: true,
    id: rapprochement.id,
    decision: choix,
    restant: lireRapprochementsAValider().filter(r => String(r.statut) === 'À valider').length
  };
}

function fusionnerOperationsRapprochement_(rapprochement) {
  const operations = lireTable_('Operations');
  const manuelle = operations.find(o => String(o.id) === String(rapprochement.operation_manuelle_id));
  const importee = operations.find(o => String(o.id) === String(rapprochement.operation_importee_id));

  if (!manuelle) throw new Error('La saisie manuelle à fusionner n’existe plus.');
  if (!importee) throw new Error('L’opération bancaire à fusionner n’existe plus.');

  const commentaire = [
    manuelle.commentaire || '',
    importee.commentaire || '',
    '[VALIDATION_RAPPROCHEMENT:' + rapprochement.id + ']'
  ].filter(Boolean).join(' ');

  enregistrerLigne('Operations', {
    id: manuelle.id,
    date: importee.date || manuelle.date,
    libelle: manuelle.libelle || importee.libelle,
    categorie: manuelle.categorie || importee.categorie,
    compte: manuelle.compte || importee.compte,
    montant: Math.abs(Number(importee.montant || manuelle.montant || 0)),
    type: importee.type || manuelle.type,
    commentaire,
    cree_le: manuelle.cree_le || ''
  });

  supprimerLigne('Operations', importee.id);
}

function trouverRapprochementParId_(id) {
  return lireRapprochementsAValider().find(r => String(r.id) === String(id)) || null;
}

function mettreAJourRapprochement_(id, modifications) {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RAPPROCHEMENTS_SHEET);
  if (!feuille || feuille.getLastRow() < 2) throw new Error('Aucune proposition de rapprochement disponible.');

  const idIndex = RAPPROCHEMENTS_HEADERS.indexOf('id');
  const ids = feuille.getRange(2, idIndex + 1, feuille.getLastRow() - 1, 1).getValues().flat();
  const position = ids.findIndex(v => String(v) === String(id));
  if (position < 0) throw new Error('Proposition de rapprochement introuvable.');

  const numeroLigne = position + 2;
  const valeurs = feuille.getRange(numeroLigne, 1, 1, RAPPROCHEMENTS_HEADERS.length).getValues()[0];
  const objet = Object.fromEntries(RAPPROCHEMENTS_HEADERS.map((h, i) => [h, valeurs[i]]));
  Object.assign(objet, modifications || {}, { modifie_le: new Date().toISOString() });
  feuille.getRange(numeroLigne, 1, 1, RAPPROCHEMENTS_HEADERS.length)
    .setValues([RAPPROCHEMENTS_HEADERS.map(h => objet[h] == null ? '' : objet[h])]);
  return objet;
}
