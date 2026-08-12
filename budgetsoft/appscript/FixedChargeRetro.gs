function enregistrerOperationAvecChargeFixe(operation, charge) {
  verifierInitialisation_();
  const op = enregistrerLigne('Operations', operation);
  const cf = enregistrerLigne('Charges_fixes', charge);
  const retro = rattacherChargeFixeRetrospectif_(cf, op);
  return { operation: op, charge: cf, retrospectif: retro };
}

function rattacherChargeFixeRetrospectif_(charge, operationReference) {
  const operations = lireTable_('Operations');
  const compte = String(charge.compte || operationReference.compte || '');
  const type = String(charge.type || 'depense').toLowerCase();
  const libelleBanque = String(charge.libelle_bancaire || operationReference.libelle || '').trim();
  const motif = typeof extraireMotifStableBanque_ === 'function'
    ? extraireMotifStableBanque_(libelleBanque)
    : normaliserTexteBanque_(libelleBanque);
  if (!motif) return { trouvees: 0, rattachees: 0, motif: '' };

  let trouvees = 0, rattachees = 0;
  operations.forEach(o => {
    if (String(o.compte || '') !== compte) return;
    if (String(o.type || '').toLowerCase() !== type) return;
    if (/\[RECURRENCE:/.test(String(o.commentaire || ''))) return;
    const brut = typeof brutAudit_ === 'function' ? brutAudit_(o) : String(o.libelle || '');
    const motifOp = typeof extraireMotifStableBanque_ === 'function'
      ? extraireMotifStableBanque_(brut)
      : normaliserTexteBanque_(brut);
    if (!motifOp || motifOp !== motif) return;
    trouvees++;
    const marqueur='[CHARGE_FIXE_HISTO:'+String(charge.id)+']';
    const commentaire=String(o.commentaire||'');
    enregistrerLigne('Operations', {
      id:o.id,
      date:o.date,
      libelle:charge.libelle || o.libelle,
      categorie:charge.categorie || o.categorie,
      compte:o.compte,
      montant:Math.abs(Number(o.montant||0)),
      type:o.type,
      commentaire:commentaire.includes(marqueur)?commentaire:[commentaire,marqueur].filter(Boolean).join(' '),
      cree_le:o.cree_le||''
    });
    rattachees++;
  });

  // La charge fixe devient aussi une règle d'apprentissage pour les prochains imports.
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
      utilisations:Number(existante && existante.utilisations || 0)+rattachees,
      cree_le:existante && existante.cree_le || ''
    });
  }
  return { trouvees: trouvees, rattachees: rattachees, motif: motif };
}
