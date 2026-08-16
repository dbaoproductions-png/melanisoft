// Engagements bancaires futurs du cycle courant.
// Sépare les CB différées des prélèvements/virements déjà annoncés par la banque
// et évite de recompter une charge fixe lorsqu'une opération bancaire future la couvre.
function chargerEngagementsBancairesFuturs() {
  verifierInitialisation_();
  const dash = chargerDashboardReel();
  const c = dash && dash.courtTerme ? dash.courtTerme : {};
  const reference = c.dateReference ? new Date(c.dateReference) : new Date();
  const fin = c.fin ? new Date(c.fin) : reference;
  const operations = lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_);

  function estCarte_(o) {
    return !!String(o.carte_fin || '').trim() || /\b(?:paiement\s+)?cb\b/i.test(String(o.libelle_bancaire || o.libelle || ''));
  }
  function dateComptable_(o) {
    return new Date(o.date_comptable || o.date);
  }

  const futurs = operations.filter(o => {
    const d = dateComptable_(o);
    return !isNaN(d) && d > reference && d <= fin && String(o.type || '').toLowerCase() === 'depense';
  });
  const cartes = futurs.filter(estCarte_);
  const prelevements = futurs.filter(o => !estCarte_(o));

  const charges = lireTable_('Charges_fixes').filter(x => convertirBooleen_(x.actif));
  const chargesCouvertes = new Set();
  const operationsUtilisees = new Set();

  // Une opération future annoncée par la banque remplace la prévision de charge fixe
  // si le moteur de rapprochement lui attribue un score suffisamment sûr.
  charges.forEach(charge => {
    let meilleur = null;
    prelevements.forEach(op => {
      if (operationsUtilisees.has(String(op.id))) return;
      let r = null;
      try { r = evaluerRapprochementChargeFixe_(charge, op); } catch (e) { r = null; }
      if (r && Number(r.score) >= 75 && (!meilleur || Number(r.score) > Number(meilleur.score))) meilleur = Object.assign({operation:op}, r);
    });
    if (meilleur) {
      chargesCouvertes.add(String(charge.id));
      operationsUtilisees.add(String(meilleur.operation.id));
    }
  });

  const chargesRestantes = charges.filter(charge => {
    if (chargesCouvertes.has(String(charge.id))) return false;
    const jour = Number(charge.jour_execution || charge.jour || charge.jour_echeance || 1);
    let echeance = new Date(reference.getFullYear(), reference.getMonth(), Math.min(31, Math.max(1, jour)), 12);
    if (echeance <= reference) echeance = new Date(reference.getFullYear(), reference.getMonth() + 1, Math.min(31, Math.max(1, jour)), 12);
    return echeance <= fin;
  });

  const somme = xs => arrondirCycle_(xs.reduce((s,o) => s + Math.abs(Number(o.montant || 0)), 0));
  const sommeCharges = arrondirCycle_(chargesRestantes.reduce((s,x) => s + Math.abs(Number(x.montant || 0)), 0));

  return {
    prelevements: somme(prelevements),
    nombrePrelevements: prelevements.length,
    cbDifferees: somme(cartes),
    nombreCb: cartes.length,
    chargesFixesRestantes: sommeCharges,
    nombreChargesFixesRestantes: chargesRestantes.length,
    chargesFixesCouvertes: chargesCouvertes.size,
    detailPrelevements: prelevements.slice().sort((a,b)=>dateComptable_(a)-dateComptable_(b)).map(o => ({
      id:String(o.id || ''),
      date:dateComptable_(o).toISOString(),
      libelle:String(o.libelle_bancaire || o.libelle || 'Prélèvement à venir'),
      montant:Math.abs(Number(o.montant || 0))
    }))
  };
}
