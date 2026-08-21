const CONTROLES_RELEVES_SHEET = 'Controles_releves';
const CONTROLES_RELEVES_HEADERS = [
  'id','controle_le','source','compte',
  'date_ouverture','solde_ouverture','total_debits','total_credits',
  'date_cloture','solde_cloture','solde_calcule','ecart_arithmetique',
  'date_cloture_precedente','solde_cloture_precedent','ecart_continuite',
  'totaux_operations_ok','arithmetique_ok','continuite_ok','ok','message'
];

function arrondirControleReleve_(valeur) { return Math.round(Number(valeur || 0) * 100) / 100; }
function nombreControleReleve_(valeur) { if (valeur === null || valeur === undefined || valeur === '') return null; const n = Number(String(valeur).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; }
function dateControleReleve_(valeur) { if (!valeur) return null; const d = valeur instanceof Date ? new Date(valeur.getTime()) : new Date(valeur); return isNaN(d.getTime()) ? null : d; }
function isoControleReleve_(valeur) { const d = dateControleReleve_(valeur); return d ? d.toISOString() : null; }
function jourControleReleve_(valeur) { const d=dateControleReleve_(valeur); return d ? Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd') : ''; }

function referencesPrecedentesControleReleve_(compte,dateOuverture){
  const ouverture=dateControleReleve_(dateOuverture); if(!compte||!ouverture)return[];
  const refs=[];
  const historique=typeof lireHistoriqueReleves_==='function'?lireHistoriqueReleves_(compte):[];
  (historique||[]).forEach(function(r){
    const d=dateControleReleve_(r&&r.dateCloture),s=nombreControleReleve_(r&&r.soldeCloture);
    if(d&&d.getTime()<=ouverture.getTime()&&s!==null)refs.push({dateCloture:d,soldeCloture:s,source:'historique_applicatif',brut:r});
  });
  if(typeof RELEVES_CERTIFIES_BUDGETSOFT_!=='undefined'&&Array.isArray(RELEVES_CERTIFIES_BUDGETSOFT_)){
    RELEVES_CERTIFIES_BUDGETSOFT_.forEach(function(r){
      const d=dateControleReleve_(r&&r.fin),s=nombreControleReleve_(r&&r.cloture);
      if(d&&d.getTime()<=ouverture.getTime()&&s!==null)refs.push({dateCloture:d,soldeCloture:s,source:'chaine_certifiee',brut:r});
    });
  }
  return refs.sort(function(a,b){
    const da=dateControleReleve_(a.dateCloture),db=dateControleReleve_(b.dateCloture);
    if(db-da)return db-da;
    if(a.source===b.source)return 0;
    return a.source==='chaine_certifiee'?-1:1;
  });
}

function precedentControleReleve_(compte, dateOuverture) {
  if (!compte || !dateOuverture) return null;
  const ouverture = dateControleReleve_(dateOuverture);
  if (!ouverture) return null;
  const jourOuverture=jourControleReleve_(ouverture),refs=referencesPrecedentesControleReleve_(compte,ouverture);
  const certifieExact=refs.find(function(r){return r.source==='chaine_certifiee'&&jourControleReleve_(r.dateCloture)===jourOuverture;});
  const choisi=certifieExact||refs[0]||null;
  return choisi?{dateCloture:choisi.dateCloture,soldeCloture:choisi.soldeCloture,sourceReference:choisi.source,brut:choisi.brut}:null;
}

function diagnostiquerContinuiteReleve(compte,dateOuverture,soldeOuverture){
  verifierInitialisation_();
  const ouverture=dateControleReleve_(dateOuverture),solde=nombreControleReleve_(soldeOuverture);
  if(!compte)throw new Error('Choisissez un compte.');
  if(!ouverture)throw new Error('Date d’ouverture invalide.');
  if(solde===null)throw new Error('Solde d’ouverture invalide.');
  const refs=referencesPrecedentesControleReleve_(compte,ouverture).map(function(r){return{source:r.source,dateCloture:isoControleReleve_(r.dateCloture),soldeCloture:arrondirControleReleve_(r.soldeCloture),ecart:arrondirControleReleve_(solde-r.soldeCloture)};});
  const p=precedentControleReleve_(compte,ouverture),attendu=p?nombreControleReleve_(p.soldeCloture):null;
  const r={version:'2026-08-21.2',compte:String(compte),dateOuverture:isoControleReleve_(ouverture),soldeOuverture:arrondirControleReleve_(solde),referenceRetenue:p?{source:p.sourceReference||'',dateCloture:isoControleReleve_(p.dateCloture),soldeCloture:arrondirControleReleve_(attendu)}:null,ecartRetenu:attendu===null?null:arrondirControleReleve_(solde-attendu),continuiteOk:attendu===null?null:Math.abs(solde-attendu)<0.01,referencesCandidates:refs};
  console.log(JSON.stringify(r));return r;
}

function diagnostiquerContinuiteHelloBankJuilletAout2026(){
  return diagnostiquerContinuiteReleve('Compte joint','2026-07-15',121.82);
}

function controlerReleveAvantImport(meta, compte) {
  const m = meta || {};
  const ouverture = nombreControleReleve_(m.soldeOuverture), cloture = nombreControleReleve_(m.soldeCloture), debits = nombreControleReleve_(m.totalDebits), credits = nombreControleReleve_(m.totalCredits);
  const dateOuverture = isoControleReleve_(m.dateOuverture), dateCloture = isoControleReleve_(m.dateCloture), controleTotaux = m.controle || {}, manquants = [];
  if (!compte) manquants.push('compte'); if (!dateOuverture) manquants.push('date d’ouverture'); if (ouverture === null) manquants.push('solde d’ouverture'); if (debits === null) manquants.push('total des débits'); if (credits === null) manquants.push('total des crédits'); if (!dateCloture) manquants.push('date de clôture'); if (cloture === null) manquants.push('solde de clôture');
  if (manquants.length) return {ok:false,bloquant:true,compte:String(compte || ''),message:'Import bloqué : contrôle du relevé impossible (' + manquants.join(', ') + ' manquant(s)).'};
  const soldeCalcule = arrondirControleReleve_(ouverture - debits + credits), ecartArithmetique = arrondirControleReleve_(soldeCalcule - cloture), arithmetiqueOk = Math.abs(ecartArithmetique) < 0.01;
  const totauxOperationsOk = controleTotaux.verifiable === true ? controleTotaux.conforme === true : false;
  const precedent = precedentControleReleve_(compte, dateOuverture), soldePrecedent = precedent ? nombreControleReleve_(precedent.soldeCloture) : null, datePrecedente = precedent ? isoControleReleve_(precedent.dateCloture) : null;
  const ecartContinuite = soldePrecedent === null ? null : arrondirControleReleve_(ouverture - soldePrecedent), continuiteOk = ecartContinuite === null ? null : Math.abs(ecartContinuite) < 0.01;
  const ok = totauxOperationsOk && arithmetiqueOk && continuiteOk !== false, motifs = [];
  if (!totauxOperationsOk) motifs.push('les totaux des opérations extraites ne sont pas certifiés conformes au PDF'); if (!arithmetiqueOk) motifs.push('ouverture − débits + crédits ne retombe pas sur le solde de clôture'); if (continuiteOk === false) motifs.push('le solde d’ouverture ne correspond pas au solde de clôture du relevé précédent');
  return {id:Utilities.getUuid(),controle_le:new Date().toISOString(),source:'HELLOBANK_PDF',compte:String(compte),date_ouverture:dateOuverture,solde_ouverture:arrondirControleReleve_(ouverture),total_debits:arrondirControleReleve_(debits),total_credits:arrondirControleReleve_(credits),date_cloture:dateCloture,solde_cloture:arrondirControleReleve_(cloture),solde_calcule:soldeCalcule,ecart_arithmetique:ecartArithmetique,date_cloture_precedente:datePrecedente,solde_cloture_precedent:soldePrecedent === null ? null : arrondirControleReleve_(soldePrecedent),reference_precedente_source:precedent?String(precedent.sourceReference||''):'',ecart_continuite:ecartContinuite,totaux_operations_ok:totauxOperationsOk,arithmetique_ok:arithmetiqueOk,continuite_ok:continuiteOk,ok:ok,equilibre_ok:ok,statut:ok?'OK':'BLOQUE',bloquant:!ok,message:ok?'Relevé contrôlé : totaux, arithmétique et continuité conformes.':'Import bloqué : ' + motifs.join(' ; ') + '.'};
}

function normaliserEnteteControleReleve_(texte) { return String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
function initialiserControlesReleves_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); let feuille = ss.getSheetByName(CONTROLES_RELEVES_SHEET); if (!feuille) feuille = ss.insertSheet(CONTROLES_RELEVES_SHEET);
  if (feuille.getLastRow() === 0) { feuille.getRange(1, 1, 1, CONTROLES_RELEVES_HEADERS.length).setValues([CONTROLES_RELEVES_HEADERS]); feuille.setFrozenRows(1); feuille.getRange(1, 1, 1, CONTROLES_RELEVES_HEADERS.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff'); }
  return feuille;
}

function enregistrerControleReleve(controle, source) {
  if (!controle || controle.ok !== true) throw new Error('Un contrôle de relevé non conforme ne peut pas être enregistré comme réussi.');
  const feuille = initialiserControlesReleves_(), derniereColonne = Math.max(1, feuille.getLastColumn()), entetesBrutes = feuille.getRange(1, 1, 1, derniereColonne).getValues()[0], entetes = entetesBrutes.map(normaliserEnteteControleReleve_);
  const contexte = source && typeof source === 'object' ? source : {}, sourceTexte = typeof source === 'string' ? source : String(contexte.source || contexte.type || controle.source || 'HELLOBANK_PDF');
  const donnees = Object.assign({}, controle, {source:sourceTexte,controle_le:controle.controle_le || new Date().toISOString()});
  if (donnees.equilibre_ok === undefined || donnees.equilibre_ok === null || donnees.equilibre_ok === '') donnees.equilibre_ok = donnees.ok === true;
  if (!donnees.statut) donnees.statut = donnees.ok === true ? 'OK' : 'BLOQUE';
  const alias = {dateouverture:'date_ouverture', soldeouverture:'solde_ouverture',totaldebits:'total_debits', totalcredits:'total_credits',datecloture:'date_cloture', soldecloture:'solde_cloture',soldecalcule:'solde_calcule', ecartarithmetique:'ecart_arithmetique',ecartcontinuite:'ecart_continuite', continuiteok:'continuite_ok',arithmetiqueok:'arithmetique_ok', totauxoperationsok:'totaux_operations_ok',equilibreok:'equilibre_ok',controlele:'controle_le'};
  const ligne = entetes.map(function(entete) { const cleCompacte = entete.replace(/_/g, ''); const cle = Object.prototype.hasOwnProperty.call(donnees, entete) ? entete : (alias[cleCompacte] || entete); const valeur = donnees[cle]; return valeur === null || valeur === undefined ? '' : valeur; });
  feuille.getRange(feuille.getLastRow() + 1, 1, 1, ligne.length).setValues([ligne]);

  // Après un import réussi, on recalcule immédiatement la référence depuis
  // l'ensemble des relevés connus. Ainsi un relevé historique ne peut pas
  // rester comme référence du tableau de bord, même si un autre chemin de code
  // a temporairement écrit son solde/date dans Parametres pendant l'import.
  if (controle.compte && typeof synchroniserReferenceReleveCompte_ === 'function') {
    donnees.reference_releve = synchroniserReferenceReleveCompte_(String(controle.compte));
  }
  return donnees;
}
