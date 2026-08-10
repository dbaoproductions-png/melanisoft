function chargerCycleFinancier() {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const comptes = lireTable_('Comptes').filter(c => convertirBooleen_(c.actif));
  const parametres = Object.fromEntries(lireTable_('Parametres').map(p => [String(p.cle), p.valeur]));
  const salaire = detecterSalairePrincipal_(operations, 12);
  const jourRepli = salaire ? salaire.jourMoyen : Number(parametres.jour_debut_mois || 28);
  const periode = calculerCycleDepuisSalaire_(new Date(), operations, jourRepli, salaire);
  const debut = new Date(periode.debut);
  const fin = new Date(periode.fin);

  const operationsCycle = operations.filter(o => {
    const d = new Date(o.date);
    return !isNaN(d) && d >= debut && d <= fin;
  });
  const revenus = operationsCycle.filter(o => Number(o.montant || 0) > 0).reduce((s,o)=>s+Number(o.montant || 0),0);
  const depenses = operationsCycle.filter(o => Number(o.montant || 0) < 0).reduce((s,o)=>s+Math.abs(Number(o.montant || 0)),0);
  const cartes = operationsCycle.filter(o => /\[CARTE_DIFFEREE:/.test(String(o.commentaire || '')));
  const cartesEnAttente = cartes.filter(o => new Date(o.date) > new Date());
  const cbEnAttente = cartesEnAttente.reduce((s,o)=>s+Math.abs(Number(o.montant || 0)),0);
  const soldeBancaire = comptes.reduce((s,c)=>s+Number(c.solde_initial || 0),0) + operations.filter(o=>new Date(o.date)<=new Date()).reduce((s,o)=>s+Number(o.montant||0),0);
  const soldeEngage = soldeBancaire - cbEnAttente;
  const chargesRestantes = lireTable_('Charges_fixes').filter(c => convertirBooleen_(c.actif)).reduce((s,c)=>{
    const jour = Number(c.jour_execution || 1);
    const echeance = new Date(new Date().getFullYear(), new Date().getMonth(), Math.min(31, jour));
    return echeance > new Date() && echeance <= fin ? s + Math.abs(Number(c.montant || 0)) : s;
  },0);
  const soldeProjete = soldeEngage - chargesRestantes;
  const epargneCycle = revenus - depenses;

  const alertes = [];
  if (!salaire) alertes.push('Salaire principal non détecté : le jour de référence est utilisé.');
  if (cbEnAttente > 0) alertes.push(arrondirCycle_(cbEnAttente) + ' € de paiements CB restent à débiter.');
  if (soldeProjete < 0) alertes.push('Le solde projeté de fin de cycle est négatif.');

  return creerModeleCycle_({
    periode,
    salaire,
    indicateurs: {
      revenusCycle: arrondirCycle_(revenus),
      depensesCycle: arrondirCycle_(depenses),
      epargneCycle: arrondirCycle_(epargneCycle),
      cbEnAttente: arrondirCycle_(cbEnAttente),
      nombreCbEnAttente: cartesEnAttente.length,
      soldeBancaire: arrondirCycle_(soldeBancaire),
      soldeEngage: arrondirCycle_(soldeEngage),
      soldeProjete: arrondirCycle_(soldeProjete),
      chargesRestantes: arrondirCycle_(chargesRestantes),
      joursAvantFinCycle: periode.joursRestants
    },
    operations: { debitees: operationsCycle, engagees: cartesEnAttente },
    alertes
  });
}

function appliquerDateDebitDiffere(operation) {
  const copie = Object.assign({}, operation || {});
  const dateAchat = new Date(copie.date);
  if (!estOperationCarte_(copie) || isNaN(dateAchat)) return copie;
  const dateDebit = dateDebitCarte_(dateAchat);
  copie.date_achat = dateAchat.toISOString();
  copie.date = dateDebit.toISOString();
  copie.commentaire_cycle = '[CARTE_DIFFEREE:' + Utilities.formatDate(dateAchat, Session.getScriptTimeZone(), 'yyyy-MM-dd') + ']';
  copie.details = [
    copie.details || copie.libelle || '',
    'Date d’achat : ' + Utilities.formatDate(dateAchat, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
    copie.commentaire_cycle
  ].filter(Boolean).join(' ');
  return copie;
}

function importerOperationsHelloBankCycle(operations, compte) {
  const transformees = (operations || []).map(appliquerDateDebitDiffere);
  return importerOperationsHelloBank(transformees, compte);
}
