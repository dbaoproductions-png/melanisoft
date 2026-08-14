function enregistrerOperationAvecChargeFixe(operation, charge) {
  verifierInitialisation_();
  const op = enregistrerLigne('Operations', operation);
  const cf = enregistrerLigne('Charges_fixes', charge);
  const retro = rattacherChargeFixeRetrospectif_(cf, op);
  return { operation: op, charge: cf, retrospectif: retro };
}

/**
 * Une charge fixe est un référentiel prévisionnel : on peut rechercher les
 * opérations historiques qui lui ressemblent, mais on ne modifie jamais ces
 * opérations et on ne fabrique aucune opération à partir de la charge.
 */
function rattacherChargeFixeRetrospectif_(charge, operationReference) {
  const operations = lireTable_('Operations');
  const compte = String(charge.compte || operationReference.compte || '');
  const type = String(charge.type || 'depense').toLowerCase();
  const libelleBanque = String(charge.libelle_bancaire || operationReference.libelle_bancaire || operationReference.libelle || '').trim();
  const motif = typeof extraireMotifStableBanque_ === 'function'
    ? extraireMotifStableBanque_(libelleBanque)
    : normaliserTexteBanque_(libelleBanque);
  if (!motif) return { trouvees: 0, rattachees: 0, motif: '', mode: 'lecture_seule' };

  let trouvees = 0;
  operations.forEach(o => {
    if (String(o.compte || '') !== compte) return;
    if (String(o.type || '').toLowerCase() !== type) return;
    const brut = String(o.libelle_bancaire || o.libelle || '');
    const motifOp = typeof extraireMotifStableBanque_ === 'function'
      ? extraireMotifStableBanque_(brut)
      : normaliserTexteBanque_(brut);
    if (motifOp && motifOp === motif) trouvees++;
  });

  // La charge peut servir de règle de reconnaissance pour les prochains
  // imports, sans altérer les opérations existantes.
  if (typeof enregistrerCorrespondanceBancaire === 'function' && motif) {
    const correspondances = typeof lireCorrespondancesBancaires === 'function' ? lireCorrespondancesBancaires() : [];
    const existante = correspondances.find(c => normaliserTexteBanque_(c.motif_bancaire) === motif && (!c.compte || String(c.compte) === compte));
    enregistrerCorrespondanceBancaire({
      id:existante && existante.id,
      motif_bancaire:motif,
      libelle_normalise:charge.libelle || operationReference.libelle || libelleBanque,
      categorie:charge.categorie || operationReference.categorie || '',
      type:type,
      compte:compte,
      actif:true,
      utilisations:Number(existante && existante.utilisations || 0),
      cree_le:existante && existante.cree_le || ''
    });
  }
  return { trouvees: trouvees, rattachees: 0, motif: motif, mode: 'lecture_seule' };
}
