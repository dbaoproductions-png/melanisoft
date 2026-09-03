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
    importee.commentaire || '',
    manuelle.commentaire || '',
    '[VALIDATION_RAPPROCHEMENT:' + rapprochement.id + ']'
  ].filter(Boolean).join(' ');

  const fusion = Object.assign({}, importee, {
    id: importee.id,
    libelle: manuelle.libelle || importee.libelle,
    categorie: manuelle.categorie || importee.categorie,
    commentaire,
    cree_le: importee.cree_le || manuelle.cree_le || ''
  });

  enregistrerLigne('Operations', fusion);
  supprimerLigne('Operations', manuelle.id);
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

/**
 * Point d'entrée UNIQUE des rapprochements prévisionnel ↔ réel.
 * Les interfaces Cerbère et Plan délèguent ici ; elles ne modifient pas elles-mêmes
 * les liens métier. Le rapprochement bancaire manuel/import ci-dessus reste un autre
 * domaine : il dédoublonne deux lignes réelles et ne rapproche pas un prévu d'un réel.
 */
function rapprocherPrevisionnelReelBudgetSoft(d) {
  d = d || {};
  const type = String(d.type || '').trim().toLowerCase();
  if (type === 'evenement') return rapprocherEvenementBudgetSoft_(d.previsionnel_id || d.event_id, d.operation_id);
  if (type === 'imprevu_categorie') return reclasserOperationRapprochementBudgetSoft_(d.operation_id, d.categorie);
  throw new Error('Type de rapprochement prévisionnel/réel inconnu : ' + type);
}

function listerCandidatsRapprochementBudgetSoft(d) {
  d = d || {};
  const type = String(d.type || '').trim().toLowerCase();
  if (type !== 'evenement') return serialiserCerberePourClient_([]);
  assurerPlanActionsV4_();
  const eventId = String(d.previsionnel_id || d.event_id || '').trim();
  const ev = lireFeuilleDynamiquePlan_('Plan_Evenements').find(x => String(x.id) === eventId);
  if (!ev) throw new Error('Événement introuvable.');

  const montant = Math.abs(Number(ev.montant || 0));
  const date = ev.date_effet ? new Date(ev.date_effet) : null;
  const cat = String(ev.categorie || '');
  const nature = String(ev.type || '').trim().toLowerCase();
  let ops = lireTable_('Operations').filter(o => {
    const m = Number(o.montant || 0);
    if (nature === 'recette') return m > 0;
    if (nature === 'depense' || nature === 'dépense') return m < 0;
    return m !== 0;
  });
  ops = ops.map(o => {
    const om = Math.abs(Number(o.montant || 0));
    const od = new Date(o.date_comptable || o.date || o.date_operation || 0);
    const jours = date && !isNaN(date) && !isNaN(od) ? Math.abs(od - date) / 86400000 : 99;
    const score = Math.abs(om - montant) + (jours * 2) + (cat && String(o.categorie || '') !== cat ? 50 : 0);
    return {id:o.id||'',libelle:o.libelle||o.libelle_bancaire||'',montant:Number(o.montant||0),date:o.date_comptable||o.date||o.date_operation||'',categorie:o.categorie||'',score};
  }).sort((a,b) => a.score - b.score).slice(0, 15);
  return serialiserCerberePourClient_(ops);
}

function rapprocherEvenementBudgetSoft_(eventId, operationId) {
  assurerPlanActionsV4_();
  const ev = lireFeuilleDynamiquePlan_('Plan_Evenements').find(x => String(x.id) === String(eventId));
  if (!ev) throw new Error('Événement introuvable.');
  const op = lireTable_('Operations').find(x => String(x.id) === String(operationId));
  if (!op) throw new Error('Opération introuvable.');
  ev.operation_reelle_id = operationId;
  ev.montant_reel = Math.abs(Number(op.montant || 0));
  ev.date_realisation = op.date_comptable || op.date || op.date_operation || '';
  ev.rapprochement_statut = 'Rapproché';
  ev.statut = 'Rapproché';
  upsertDynamiquePlanV4_('Plan_Evenements', ev);
  recalculerPlanBudgetSoft_('rapprochement_evenement');
  return {ok:true,type:'evenement',previsionnel_id:String(eventId),operation_id:String(operationId)};
}

function reclasserOperationRapprochementBudgetSoft_(operationId, nouvelleCategorie) {
  const id = String(operationId || '').trim(), cat = String(nouvelleCategorie || '').trim();
  if (!id || !cat) throw new Error('Opération ou catégorie manquante.');
  const sh = SpreadsheetApp.getActive().getSheetByName('Operations');
  if (!sh) throw new Error('Feuille Operations introuvable.');
  const values = sh.getDataRange().getValues();
  if (!values.length) throw new Error('Feuille Operations vide.');
  const headers = values[0].map(x => String(x || '').trim()), idCol = headers.indexOf('id'), catCol = headers.indexOf('categorie');
  if (idCol < 0 || catCol < 0) throw new Error('Colonnes id/categorie introuvables.');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol] || '').trim() !== id) continue;
    sh.getRange(i + 1, catCol + 1).setValue(cat);
    if (typeof invaliderProjectionBudgetSoft_ === 'function') invaliderProjectionBudgetSoft_('rapprochement-imprevu-categorie');
    return {ok:true,type:'imprevu_categorie',operation_id:id,categorie:cat};
  }
  throw new Error('Opération introuvable : ' + id);
}
