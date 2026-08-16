const IMPORT_PDF_CONTROLE_V2 = 'bank-statement-control-v2';

function importerOperationsHelloBankControleV2(operations, compte, meta) {
  const controle = controlerReleveAvantImport(meta, compte);
  if (!controle || controle.ok !== true) {
    throw new Error(controle && controle.message ? controle.message : 'Import bloqué : contrôle du relevé bancaire impossible.');
  }

  const transformees = (operations || []).map(appliquerDateDebitDiffere);
  const resultat = importerOperationsHelloBank(transformees, compte);
  const erreurs = Array.isArray(resultat.erreurs) ? resultat.erreurs : [];
  if (erreurs.length) {
    throw new Error('Import PDF partiel : ' + erreurs.length + ' ligne(s) rejetée(s). ' + erreurs.slice(0, 8).join(' | '));
  }

  const historique = lireHistoriqueReleves_(compte);
  const releve = {
    dateOuverture: meta && meta.dateOuverture || null,
    soldeOuverture: meta && Number.isFinite(Number(meta.soldeOuverture)) ? Number(meta.soldeOuverture) : null,
    dateCloture: meta && meta.dateCloture || null,
    soldeCloture: meta && Number.isFinite(Number(meta.soldeCloture)) ? Number(meta.soldeCloture) : null,
    importeLe: new Date().toISOString()
  };

  if (!releve.dateCloture || releve.soldeCloture === null) {
    throw new Error('Import non certifiable : solde ou date de clôture absent du relevé.');
  }

  enregistrerParametreBudgetaire_('solde_releve_' + String(compte), releve.soldeCloture);
  enregistrerParametreBudgetaire_('date_solde_releve_' + String(compte), releve.dateCloture);

  if (releve.dateOuverture && releve.soldeOuverture !== null) {
    const premier = historique.length ? historique[0] : releve;
    enregistrerParametreBudgetaire_('solde_ouverture_premier_releve_' + String(compte), premier.soldeOuverture);
    enregistrerParametreBudgetaire_('date_ouverture_premier_releve_' + String(compte), premier.dateOuverture);
  }

  let precedent = null;
  if (releve.dateOuverture) {
    const d = new Date(releve.dateOuverture);
    precedent = historique
      .filter(r => r.dateCloture && new Date(r.dateCloture) <= d)
      .sort((a,b) => new Date(b.dateCloture) - new Date(a.dateCloture))[0] || null;
  }

  if (precedent && precedent.soldeCloture != null && releve.soldeOuverture != null) {
    const ecart = arrondirCycle_(Number(releve.soldeOuverture) - Number(precedent.soldeCloture));
    resultat.continuite = Math.abs(ecart) < 0.01;
    resultat.ecartContinuite = ecart;
  } else {
    resultat.continuite = null;
  }

  const deja = historique.some(r =>
    String(r.dateOuverture || '') === String(releve.dateOuverture || '') &&
    String(r.dateCloture || '') === String(releve.dateCloture || '') &&
    Math.abs(Number(r.soldeCloture) - Number(releve.soldeCloture)) < 0.005
  );
  if (!deja) {
    historique.push(releve);
    historique.sort((a,b) => new Date(a.dateOuverture || a.dateCloture || 0) - new Date(b.dateOuverture || b.dateCloture || 0));
    enregistrerHistoriqueReleves_(compte, historique);
  }

  const feuilleControle = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Controles_releves');
  const lignesAvant = feuilleControle ? feuilleControle.getLastRow() : 0;
  enregistrerControleReleve(controle, {
    source:'HELLOBANK_PDF',
    importees:Number(resultat.importees || 0),
    doublons:Number(resultat.doublons || 0),
    rapprochees:Number(resultat.rapprochees || 0)
  });

  // Relecture immédiate : aucun faux succès possible.
  const parametres = Object.fromEntries(lireTable_('Parametres').map(p => [String(p.cle), p.valeur]));
  const cleSolde = 'solde_releve_' + String(compte);
  const cleDate = 'date_solde_releve_' + String(compte);
  const soldeRelu = Number(String(parametres[cleSolde]).replace(',', '.'));
  const dateRelue = String(parametres[cleDate] || '');
  const feuilleApres = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Controles_releves');
  const lignesApres = feuilleApres ? feuilleApres.getLastRow() : 0;

  if (!Number.isFinite(soldeRelu) || Math.abs(soldeRelu - releve.soldeCloture) >= 0.005) {
    throw new Error('Import effectué mais contrôle final impossible : le solde de clôture n’a pas été relu correctement dans Parametres.');
  }
  if (!dateRelue) {
    throw new Error('Import effectué mais contrôle final impossible : la date du solde de clôture est absente de Parametres.');
  }
  if (lignesApres <= lignesAvant) {
    throw new Error('Import effectué mais contrôle final impossible : aucune ligne n’a été ajoutée dans Controles_releves.');
  }

  resultat.controleReleve = controle;
  resultat.controleReleveEnregistre = true;
  resultat.controleReleveLigne = lignesApres;
  resultat.soldeCloture = releve.soldeCloture;
  resultat.dateCloture = releve.dateCloture;
  resultat.moteurImport = IMPORT_PDF_CONTROLE_V2;
  return resultat;
}
