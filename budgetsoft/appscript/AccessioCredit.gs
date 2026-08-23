// Intégration du crédit renouvelable Cofidis Accessio et de sa mensualité récurrente.
// Les données proviennent de la situation communiquée le 16/08/2026.

function ajouterRevolvingAccessio2026(){
  verifierInitialisation_();
  assurerColonnesCredits_();

  const credits=lireTable_('Credits');
  let credit=credits.find(c=>/accessio/i.test(String(c.nom||''))||String(c.numero_pret||'').includes('289.0'));
  credit=Object.assign({},credit||{}, {
    nom:'Cofidis Accessio — renouvelable',
    numero_pret:'289.0XX.XXX.805.98',
    type_credit:'revolving',
    capital_restant:800.00,
    mensualite:33.60,
    taux:23.16,
    date_debut:'2026-07-13',
    prochaine_echeance:'2026-09-05',
    // Estimation non contractuelle : sans nouvelle utilisation, mensualité constante
    // et TAEG inchangé, l'amortissement théorique est d'environ 32 mensualités.
    echeances_restantes:32,
    date_fin:'2029-04-05',
    plafond_credit:2500.00,
    disponible_credit:1700.00,
    assurance_mensuelle:0,
    cout_restant:244.14,
    cout_restant_precision:'Estimation instantanée par amortissement théorique de 800 € à 23,16 % TAEG avec une mensualité constante de 33,60 €. Environ 32 mensualités et 244,14 € de coût financier restant. Crédit renouvelable : toute nouvelle utilisation ou variation du TAEG ou de la mensualité modifiera cette estimation.',
    commentaire:'Situation communiquée le 16/08/2026. Capital restant dû : 800 €. Réserve : 2 500 €, disponible : 1 700 €. TAEG révisable : 23,16 %. Prochaine mensualité : 33,60 € le 05/09/2026. Souscrit le 13/07/2026. Pas d’assurance emprunteur.'
  });
  enregistrerLigne('Credits',credit);

  const chargeFixe=assurerChargeFixeAccessio2026_();
  return {ok:true,credit:enrichirCredit_(credit),chargeFixe:chargeFixe};
}

function assurerChargeFixeAccessio2026_(){
  const charges=lireTable_('Charges_fixes');
  let charge=charges.find(c=>/accessio/i.test(String(c.libelle||'')+' '+String(c.libelle_bancaire||'')));

  // On reprend compte et catégorie d'une autre mensualité de crédit déjà connue
  // afin de ne pas inventer un identifiant de compte propre au classeur.
  const reference=charges.find(c=>convertirBooleen_(c.actif)&&/(cofidis|floa|oney|casden|creatis)/i.test(String(c.libelle||'')+' '+String(c.libelle_bancaire||'')));

  charge=Object.assign({},charge||{}, {
    libelle:'Cofidis Accessio',
    montant:33.60,
    frequence:'Mensuelle',
    jour_execution:5,
    date_debut:'2026-09-05',
    date_fin:'',
    compte:(charge&&charge.compte)||reference?.compte||'',
    categorie:(charge&&charge.categorie)||reference?.categorie||'Crédit',
    actif:true,
    libelle_bancaire:'COFIDIS ACCESSIO'
  });
  enregistrerLigne('Charges_fixes',charge);
  return charge;
}
