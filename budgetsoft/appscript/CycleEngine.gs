function dateEffectiveOperationCycle_(operation) {
  const commentaire = String(operation && operation.commentaire || '');
  const match = commentaire.match(/\[CARTE_DIFFEREE:(\d{4}-\d{2}-\d{2})\]/);
  if (match && !estOperationCarte_(operation)) {
    const parties = match[1].split('-').map(Number);
    const d = new Date(parties[0], parties[1] - 1, parties[2], 12, 0, 0, 0);
    if (!isNaN(d)) return d;
  }
  return new Date(operation && operation.date);
}

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
    const d = dateEffectiveOperationCycle_(o);
    return !isNaN(d) && d >= debut && d <= fin;
  });
  const revenus = operationsCycle.filter(o => String(o.type || '').toLowerCase() === 'revenu').reduce((s,o)=>s+Math.abs(Number(o.montant || 0)),0);
  const depenses = operationsCycle.filter(o => String(o.type || '').toLowerCase() === 'depense').reduce((s,o)=>s+Math.abs(Number(o.montant || 0)),0);

  const cartes = operationsCycle.filter(o => /\[CARTE_DIFFEREE:/.test(String(o.commentaire || '')) && estOperationCarte_(o));
  const cartesEnAttente = cartes.filter(o => dateEffectiveOperationCycle_(o) > new Date());
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
        const mouvementsApres = operations.filter(o => {
          const d = dateEffectiveOperationCycle_(o);
          return String(o.compte) === String(c.id) && dateConnu && !isNaN(d) && d > dateConnu && d <= new Date();
        });
        soldeBancaire += mouvementsApres.reduce((s,o)=>s + (String(o.type).toLowerCase()==='depense' ? -Math.abs(Number(o.montant||0)) : Math.abs(Number(o.montant||0))),0);
      }
    }
  });

  if (!soldeFiable) {
    soldeBancaire = comptes.reduce((s,c)=>s+Number(c.solde_initial || 0),0) + operations.filter(o=>dateEffectiveOperationCycle_(o)<=new Date()).reduce((s,o)=>s + (String(o.type).toLowerCase()==='depense' ? -Math.abs(Number(o.montant||0)) : Math.abs(Number(o.montant||0))),0);
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
  const couvertureCycle = !!(dernierReleve && dernierReleve >= fin);
  const alertes = [];
  if (!salaire) alertes.push('Salaire principal non détecté : le jour de référence est utilisé.');
  if (!soldeFiable) alertes.push('Aucun solde de clôture de relevé n’est encore mémorisé : le solde affiché est calculé et peut être inexact.');
  if (dernierReleve && !couvertureCycle) alertes.push('Les relevés importés s’arrêtent au ' + Utilities.formatDate(dernierReleve, Session.getScriptTimeZone(), 'dd/MM/yyyy') + ' : le cycle ' + periode.libelle + ' n’est couvert que partiellement (jusqu’au ' + Utilities.formatDate(fin, Session.getScriptTimeZone(), 'dd/MM/yyyy') + ').');
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
  copie.details = [copie.details || copie.libelle || '', 'Date d’achat : ' + Utilities.formatDate(dateAchat, Session.getScriptTimeZone(), 'dd/MM/yyyy'), copie.commentaire_cycle].filter(Boolean).join(' ');
  return copie;
}

function importerOperationsHelloBankCycle(operations, compte, meta) {
  const controleReleve = controlerReleveAvantImport(meta, compte);
  if (!controleReleve || controleReleve.ok !== true) {
    throw new Error(controleReleve && controleReleve.message
      ? controleReleve.message
      : 'Import bloqué : le contrôle du relevé bancaire a échoué.');
  }

  const transformees = (operations || []).map(appliquerDateDebitDiffere);
  const resultat = importerOperationsHelloBank(transformees, compte);
  resultat.controleReleve = controleReleve;

  const erreursImport = Array.isArray(resultat.erreurs) ? resultat.erreurs : [];
  if (erreursImport.length) {
    const apercu = erreursImport.slice(0, 8).join(' | ');
    const suite = erreursImport.length > 8 ? ' | … +' + (erreursImport.length - 8) + ' autre(s)' : '';
    throw new Error(
      'Import PDF partiel : ' + erreursImport.length + ' ligne(s) rejetée(s). ' +
      'Les lignes valides ont pu être écrites, mais le relevé n’a pas été certifié et son solde n’a pas été mémorisé. ' +
      'Détail : ' + apercu + suite
    );
  }

  if (meta) {
    const historique = lireHistoriqueReleves_(compte);
    const releve = {
      dateOuverture: meta.dateOuverture || null,
      soldeOuverture: Number.isFinite(Number(meta.soldeOuverture)) ? Number(meta.soldeOuverture) : null,
      dateCloture: meta.dateCloture || null,
      soldeCloture: Number.isFinite(Number(meta.soldeCloture)) ? Number(meta.soldeCloture) : null,
      importeLe: new Date().toISOString()
    };

    // Un import historique ne doit jamais faire reculer le point de référence
    // du tableau de bord. solde_releve/date_solde_releve représentent toujours
    // le relevé LE PLUS RÉCENT connu pour le compte.
    if (releve.dateCloture && releve.soldeCloture !== null) {
      const parametres = Object.fromEntries(lireTable_('Parametres').map(p => [String(p.cle), p.valeur]));
      const cleSolde = 'solde_releve_' + String(compte);
      const cleDate = 'date_solde_releve_' + String(compte);
      const dateActuelle = parametres[cleDate] ? new Date(parametres[cleDate]) : null;
      const dateNouvelle = new Date(releve.dateCloture);
      const doitMettreAJour = !dateActuelle || isNaN(dateActuelle) || (!isNaN(dateNouvelle) && dateNouvelle >= dateActuelle);
      if (doitMettreAJour) {
        enregistrerParametreBudgetaire_(cleSolde, releve.soldeCloture);
        enregistrerParametreBudgetaire_(cleDate, releve.dateCloture);
      }
      resultat.soldeReferenceMisAJour = doitMettreAJour;
      resultat.soldeCloture = releve.soldeCloture;
      resultat.dateCloture = releve.dateCloture;
    }

    // À l'inverse, la base d'ouverture doit représenter le relevé LE PLUS
    // ANCIEN connu. L'import d'archives peut donc la faire reculer.
    const historiqueAvecNouveau = historique.concat([releve]).filter(r => r && (r.dateOuverture || r.dateCloture));
    historiqueAvecNouveau.sort((a,b)=>new Date(a.dateOuverture || a.dateCloture || 0)-new Date(b.dateOuverture || b.dateCloture || 0));
    const premier = historiqueAvecNouveau[0] || releve;
    if (premier.dateOuverture && premier.soldeOuverture !== null && premier.soldeOuverture !== undefined) {
      enregistrerParametreBudgetaire_('solde_ouverture_premier_releve_' + String(compte), premier.soldeOuverture);
      enregistrerParametreBudgetaire_('date_ouverture_premier_releve_' + String(compte), premier.dateOuverture);
    }
    if (releve.dateOuverture && releve.soldeOuverture !== null) {
      resultat.soldeOuverture = releve.soldeOuverture;
      resultat.dateOuverture = releve.dateOuverture;
    }

    let precedent = null;
    if (releve.dateOuverture) {
      const dateOuverture = new Date(releve.dateOuverture);
      precedent = historique.filter(r => r.dateCloture && new Date(r.dateCloture) <= dateOuverture).sort((a,b)=>new Date(b.dateCloture)-new Date(a.dateCloture))[0] || null;
    }
    if (precedent && precedent.soldeCloture != null && releve.soldeOuverture != null) {
      const ecart = arrondirCycle_(Number(releve.soldeOuverture) - Number(precedent.soldeCloture));
      resultat.continuite = Math.abs(ecart) < 0.01;
      resultat.ecartContinuite = ecart;
    } else resultat.continuite = null;

    historique.push(releve);
    historique.sort((a,b)=>new Date(a.dateOuverture || a.dateCloture || 0)-new Date(b.dateOuverture || b.dateCloture || 0));
    enregistrerHistoriqueReleves_(compte, historique);
  }

  enregistrerControleReleve(controleReleve, {
    source:'HELLOBANK_PDF',
    importees:Number(resultat.importees || 0),
    doublons:Number(resultat.doublons || 0),
    rapprochees:Number(resultat.rapprochees || 0)
  });
  resultat.controleReleveEnregistre = true;
  return resultat;
}

function lireHistoriqueReleves_(compte) {
  const parametres = Object.fromEntries(lireTable_('Parametres').map(p => [String(p.cle), p.valeur]));
  const brut = parametres['historique_releves_' + String(compte)];
  if (!brut) return [];
  try { const parsed = JSON.parse(String(brut)); return Array.isArray(parsed) ? parsed : []; } catch (e) { return []; }
}
function enregistrerHistoriqueReleves_(compte, historique) { enregistrerParametreBudgetaire_('historique_releves_' + String(compte), JSON.stringify(historique || [])); }
