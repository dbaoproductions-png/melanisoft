function chargerCycleFinancier() {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const comptes = lireTable_('Comptes').filter(c => convertirBooleen_(c.actif));
  const parametres = Object.fromEntries(lireTable_('Parametres').map(p => [String(p.cle), p.valeur]));
  const salaire = detecterSalairePrincipal_(operations, 12);
  const jourRepli = salaire ? salaire.jourMoyen : Number(parametres.jour_debut_mois || 28);
  const periode = calculerCycleDepuisSalairePrincipal_(new Date(), operations, salaire, jourRepli);
  const debut = new Date(periode.debut);
  const fin = new Date(periode.fin);

  const operationsCycle = operations.filter(o => {
    const d = new Date(o.date);
    return !isNaN(d) && d >= debut && d <= fin;
  });
  const revenus = operationsCycle.filter(o => String(o.type || '').toLowerCase() === 'revenu')
    .reduce((s,o)=>s+Math.abs(Number(o.montant || 0)),0);
  const depenses = operationsCycle.filter(o => String(o.type || '').toLowerCase() === 'depense')
    .reduce((s,o)=>s+Math.abs(Number(o.montant || 0)),0);

  const cartes = operationsCycle.filter(o => /\[CARTE_DIFFEREE:/.test(String(o.commentaire || '')));
  const cartesEnAttente = cartes.filter(o => new Date(o.date) > new Date());
  const cbEnAttente = cartesEnAttente.reduce((s,o)=>s+Math.abs(Number(o.montant || 0)),0);

  let soldeBancaire = 0;
  let soldeFiable = false;
  let dateSoldeBancaire = null;
  comptes.forEach(c => {
    const cleSolde = 'solde_releve_' + String(c.id);
    const cleDate = 'date_solde_releve_' + String(c.id);
    if (parametres[cleSolde] !== undefined && parametres[cleSolde] !== '') {
      const soldeConnu = Number(String(parametres[cleSolde]).replace(',', '.'));
      const dateConnu = parametres[cleDate] ? new Date(parametres[cleDate]) : null;
      if (Number.isFinite(soldeConnu)) {
        soldeBancaire += soldeConnu;
        soldeFiable = true;
        if (dateConnu && !isNaN(dateConnu) && (!dateSoldeBancaire || dateConnu > dateSoldeBancaire)) dateSoldeBancaire = dateConnu;
        const mouvementsApres = operations.filter(o => String(o.compte) === String(c.id) && dateConnu && new Date(o.date) > dateConnu && new Date(o.date) <= new Date());
        soldeBancaire += mouvementsApres.reduce((s,o)=>s + (String(o.type).toLowerCase()==='depense' ? -Math.abs(Number(o.montant||0)) : Math.abs(Number(o.montant||0))),0);
      }
    }
  });

  if (!soldeFiable) {
    soldeBancaire = comptes.reduce((s,c)=>s+Number(c.solde_initial || 0),0) + operations.filter(o=>new Date(o.date)<=new Date()).reduce((s,o)=>s + (String(o.type).toLowerCase()==='depense' ? -Math.abs(Number(o.montant||0)) : Math.abs(Number(o.montant||0))),0);
  }

  const soldeEngage = soldeBancaire - cbEnAttente;
  const chargesRestantes = lireTable_('Charges_fixes').filter(c => convertirBooleen_(c.actif)).reduce((s,c)=>{
    const jour = Number(c.jour_execution || 1);
    const maintenant = new Date();
    let echeance = new Date(maintenant.getFullYear(), maintenant.getMonth(), Math.min(31, jour));
    if (echeance <= maintenant) echeance = new Date(maintenant.getFullYear(), maintenant.getMonth()+1, Math.min(31, jour));
    return echeance <= fin ? s + Math.abs(Number(c.montant || 0)) : s;
  },0);
  const soldeProjete = soldeEngage - chargesRestantes;
  const epargneCycle = revenus - depenses;

  const dernierReleve = dateSoldeBancaire;
  const couvertureCycle = !!(dernierReleve && dernierReleve >= debut);
  const alertes = [];
  if (!salaire) alertes.push('Salaire principal non détecté : le jour de référence est utilisé.');
  if (!soldeFiable) alertes.push('Aucun solde de clôture de relevé n’est encore mémorisé : le solde affiché est calculé et peut être inexact.');
  if (dernierReleve && !couvertureCycle) alertes.push('Les relevés importés s’arrêtent au ' + Utilities.formatDate(dernierReleve, Session.getScriptTimeZone(), 'dd/MM/yyyy') + ' : le cycle ' + periode.libelle + ' n’est pas encore couvert.');
  if (cbEnAttente > 0) alertes.push(arrondirCycle_(cbEnAttente) + ' € de paiements CB restent à débiter.');
  if (soldeProjete < 0 && couvertureCycle) alertes.push('Le solde projeté de fin de cycle est négatif.');

  return creerModeleCycle_({
    periode,
    salaire,
    couverture: {
      completeCycle: couvertureCycle,
      dateDernierReleve: dernierReleve ? dernierReleve.toISOString() : null,
      soldeFiable: soldeFiable
    },
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

function importerOperationsHelloBankCycle(operations, compte, meta) {
  const transformees = (operations || []).map(appliquerDateDebitDiffere);
  const resultat = importerOperationsHelloBank(transformees, compte);
  if (meta && Number.isFinite(Number(meta.soldeCloture)) && meta.dateCloture) {
    enregistrerParametreBudgetaire_('solde_releve_' + String(compte), Number(meta.soldeCloture));
    enregistrerParametreBudgetaire_('date_solde_releve_' + String(compte), String(meta.dateCloture));
    resultat.soldeCloture = Number(meta.soldeCloture);
    resultat.dateCloture = String(meta.dateCloture);
  }
  return resultat;
}
