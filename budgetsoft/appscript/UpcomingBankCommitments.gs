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
  function dateComptable_(o) { return new Date(o.date_comptable || o.date); }
  function montant_(o) { return Math.abs(Number(o && o.montant || 0)); }
  function compteCompatible_(charge, op) {
    const a=String(charge && charge.compte || '').trim(), b=String(op && op.compte || '').trim();
    return !a || !b || a===b;
  }
  function scoreCouverture_(charge, op) {
    if (!compteCompatible_(charge, op)) return -1;
    const mc=montant_(charge), mo=montant_(op);
    if (!Number.isFinite(mc)||!Number.isFinite(mo)||mc<=0||mo<=0) return -1;
    const tolerance=Math.max(Number(charge.tolerance||0.5),Math.max(1,mc*0.05));
    const ecart=Math.abs(mc-mo);
    if (ecart>tolerance) return -1;
    const d=dateComptable_(op);
    if (isNaN(d)) return -1;
    const jour=Number(charge.jour_execution||charge.jour||charge.jour_echeance||d.getDate());
    const ecartJours=Math.abs(d.getDate()-Math.max(1,Math.min(31,jour)));
    const texteCharge=normaliserTexteChargeFixe_([charge.libelle,charge.libelle_bancaire].join(' '));
    const brut=typeof brutAudit_==='function'?brutAudit_(op):[op.libelle_bancaire,op.libelle,op.commentaire].filter(Boolean).join(' ');
    const texteOp=normaliserTexteChargeFixe_(brut);
    const motifCharge=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(charge.libelle_bancaire||charge.libelle):texteCharge;
    const motifOp=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(brut):texteOp;
    let scoreLibelle=0;
    if(motifCharge&&motifOp&&motifCharge===motifOp)scoreLibelle=25;
    else if(motifCharge&&texteOp.includes(motifCharge))scoreLibelle=22;
    else if(texteCharge&&texteOp&&(texteOp.includes(texteCharge)||texteCharge.includes(texteOp)))scoreLibelle=20;
    else scoreLibelle=similariteMotsChargeFixe_(texteCharge,texteOp)*20;

    // Pour une charge fixe déjà connue, montant + compte + échéance constituent la preuve principale.
    // Les libellés du flux Hello bank! peuvent être fortement tronqués (ex. « impo », « audiens sante p »).
    const scoreMontant=ecart<=Math.max(0.01,Number(charge.tolerance||0.5))?50:35;
    const scoreDate=ecartJours<=3?25:ecartJours<=7?15:ecartJours<=12?5:0;
    return Math.round(Math.min(100,scoreLibelle+scoreMontant+scoreDate));
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
  const rapprochements=[];

  charges.forEach(charge => {
    let meilleur = null;
    prelevements.forEach(op => {
      if (operationsUtilisees.has(String(op.id))) return;
      const score=scoreCouverture_(charge,op);
      if(score>=75&&(!meilleur||score>meilleur.score))meilleur={operation:op,score:score};
    });
    if (meilleur) {
      chargesCouvertes.add(String(charge.id));
      operationsUtilisees.add(String(meilleur.operation.id));
      rapprochements.push({chargeId:String(charge.id),operationId:String(meilleur.operation.id),score:meilleur.score,montant:montant_(meilleur.operation),libelle:String(meilleur.operation.libelle_bancaire||meilleur.operation.libelle||'')});
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
    rapprochements:rapprochements,
    detailPrelevements: prelevements.slice().sort((a,b)=>dateComptable_(a)-dateComptable_(b)).map(o => ({
      id:String(o.id || ''),
      date:dateComptable_(o).toISOString(),
      libelle:String(o.libelle_bancaire || o.libelle || 'Prélèvement à venir'),
      montant:Math.abs(Number(o.montant || 0))
    }))
  };
}
