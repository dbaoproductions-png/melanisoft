/**
 * Créatis — capital vérifié depuis l'espace client, projection non contractuelle.
 * Aucune donnée personnelle ou solde chiffré n'est conservé dans ce dépôt.
 * Le calendrier de simulation est distinct des échéanciers bancaires OFFICIELS.
 */
const CREATIS_PROJECTION_VERSION_20261107='2026-11-07.1';
const CREATIS_PROJECTION_SHEET_20261107='Projection_Creatis_20261107';
const CREATIS_PROJECTION_BACKUP_20261107='Backup_Creatis_20261107';
const CREATIS_PROJECTION_COLS_20261107=[
  'credit_id','numero_echeance','date_echeance','montant_estime',
  'interets_estimes','capital_amorti_estime','capital_avant_estime',
  'capital_apres_estime','statut','source_hypotheses'
];

function arrCreatisProjection20261107_(n){
  return Math.round((Number(n)+Number.EPSILON)*100)/100;
}
function dateCreatisProjection20261107_(s,champ){
  const t=String(s||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(t))throw new Error(champ+' : date AAAA-MM-JJ requise.');
  const d=new Date(t+'T12:00:00Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==t)
    throw new Error(champ+' : date impossible.');
  return t;
}
function entreeCreatisProjection20261107_(donnees){
  const d=donnees||{};
  const n=(nom,max)=>{const v=d[nom];const x=Number(v);if(v==null||v===''||!Number.isFinite(x)||x<=0||x>max)throw new Error(nom+' : valeur invalide.');return arrCreatisProjection20261107_(x);};
  const solde=n('capital_verifie',500000);
  const mensualite=n('mensualite',20000),taux=n('taux_nominal_annuel_pct',30);
  const dateReference=dateCreatisProjection20261107_(d.date_reference,'Date du solde vérifié');
  const premiere=dateCreatisProjection20261107_(d.premiere_echeance_prevue,'Première échéance supposée');
  if(premiere<=dateReference)throw new Error('La première échéance simulée doit suivre la date du capital confirmé.');
  if(mensualite<=arrCreatisProjection20261107_(solde*taux/1200))
    throw new Error('Mensualité trop faible pour amortir le capital aux conditions indiquées.');
  return {capital_verifie:solde,mensualite,taux_nominal_annuel_pct:taux,date_reference:dateReference,premiere_echeance_prevue:premiere};
}
function simulerEcheancierCreatis20261107_(donnees){
  const d=entreeCreatisProjection20261107_(donnees);
  const debut=new Date(d.premiere_echeance_prevue+'T12:00:00Z');
  if(debut.getUTCDate()!==new Date(Date.UTC(debut.getUTCFullYear(),debut.getUTCMonth()+1,0)).getUTCDate())
    throw new Error('Projection disponible pour des échéances en fin de mois uniquement.');
  const lignes=[];
  let solde=d.capital_verifie,interetsTotal=0,paiementsTotal=0;
  for(let i=0;i<240&&solde>.001;i++){
    const avant=solde,interets=arrCreatisProjection20261107_(avant*d.taux_nominal_annuel_pct/1200);
    let capital=arrCreatisProjection20261107_(Math.min(avant,d.mensualite-interets));
    if(capital<=0)throw new Error('La mensualité ne couvre pas les intérêts.');
    let paiement=d.mensualite,apres=arrCreatisProjection20261107_(avant-capital);
    // Dernier paiement : solder l'arrondi résiduel (p. ex. 0,36 EUR).
    if(apres>0&&apres<=.5){
      capital=avant;paiement=arrCreatisProjection20261107_(capital+interets);apres=0;
    }
    const date=new Date(Date.UTC(debut.getUTCFullYear(),debut.getUTCMonth()+i+1,0)).toISOString().slice(0,10);
    lignes.push({numero:i+1,date,montant:paiement,interets,capital,capitalAvant:avant,capitalApres:apres});
    interetsTotal=arrCreatisProjection20261107_(interetsTotal+interets);
    paiementsTotal=arrCreatisProjection20261107_(paiementsTotal+paiement);
    solde=apres;
  }
  if(solde>.001||!lignes.length)throw new Error('Projection incomplète : capital non amorti en 240 mois.');
  if(Math.abs(paiementsTotal-interetsTotal-d.capital_verifie)>.01)
    throw new Error('Erreur de réconciliation de la projection.');
  return {parametres:d,lignes,nombreEcheances:lignes.length,finPrevue:lignes[lignes.length-1].date,
    capitalFinal:solde,totalInterets:interetsTotal,totalPaiements:paiementsTotal,
    statut:'SIMULATION_NON_CONTRACTUELLE'};
}
function creditCreatisUniqueProjection20261107_(){
  const credits=lireCreditsEtendusV2_();
  const matches=credits.filter(c=>cleDocumentCredit20261104_(c.nom)==='CREATIS');
  if(matches.length!==1)throw new Error('Crédit Créatis absent ou présent en double : intervention manuelle requise.');
  return matches[0];
}
function auditCreatisBalanceProjection20261107(donnees){
  verifierInitialisation_();
  const projection=simulerEcheancierCreatis20261107_(donnees);
  const credit=creditCreatisUniqueProjection20261107_();
  if(String(credit.type_credit||'amortissable').toLowerCase()!=='amortissable')
    throw new Error('Créatis : le crédit doit être de type amortissable.');
  const journal=journalDepuisReferenceDocument20261104_(credit.id,projection.parametres.date_reference);
  if(journal.length)throw new Error('Des écritures d’amortissement existent après la date de référence : rapprocher avant toute modification.');
  const capitalActuel=arrCreatisProjection20261107_(Number(credit.capital_restant||0));
  if(capitalActuel+.01<projection.parametres.capital_verifie)
    throw new Error('Le solde actuel est inférieur au capital déclaré : vérifier le décompte et les remboursements postérieurs.');
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const calendrierExiste=!!ss.getSheetByName(CREATIS_PROJECTION_SHEET_20261107);
  const dejaAJour=Math.abs(capitalActuel-projection.parametres.capital_verifie)<.01&&
    String(credit.statut_documentaire)==='solde_confirme_echeancier_simule'&&calendrierExiste;
  if(calendrierExiste&&!dejaAJour)
    throw new Error('Une projection Créatis existe déjà et doit être auditée avant remplacement.');
  if(ss.getSheetByName(CREATIS_PROJECTION_BACKUP_20261107)&&!dejaAJour)
    throw new Error('Sauvegarde Créatis existante : vérifier une précédente mise à jour.');
  const entree={version:CREATIS_PROJECTION_VERSION_20261107,credit_id:String(credit.id),
    numero:credit.numero_pret||'',ancien:capitalActuel,source:credit.source_reference_documentaire||'',
    creditModifie:String(credit.commentaire||''),parametres:projection.parametres};
  const empreinte=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(entree))
    .map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');
  return {ok:true,lectureSeule:true,dejaAJour,empreinte,
    credit_id:String(credit.id),nom:String(credit.nom),capitalActuel,
    capitalVerifie:projection.parametres.capital_verifie,
    variation:arrCreatisProjection20261107_(projection.parametres.capital_verifie-capitalActuel),
    nombreEcheances:projection.nombreEcheances,totalPaiements:projection.totalPaiements,
    interetsSimules:projection.totalInterets,derniereEcheancePrevue:projection.finPrevue,
    dateReference:projection.parametres.date_reference,
    premiereEcheancePrevue:projection.parametres.premiere_echeance_prevue,
    statut:projection.statut};
}
function appliquerCreatisBalanceProjection20261107(donnees,empreintePrevue){
  verifierInitialisation_();
  const lock=LockService.getDocumentLock()||LockService.getScriptLock();
  lock.waitLock(30000);
  let resultat;
  try{
    const audit=auditCreatisBalanceProjection20261107(donnees);
    if(!audit.ok||audit.empreinte!==String(empreintePrevue||''))
      throw new Error('Références modifiées depuis l’audit. Recommencer le contrôle en lecture seule.');
    if(audit.dejaAJour)return {ok:true,applique:false,dejaAJour:true};
    const projection=simulerEcheancierCreatis20261107_(donnees);
    const ss=SpreadsheetApp.getActiveSpreadsheet(),source=ss.getSheetByName('Credits');
    if(!source)throw new Error('Feuille Credits introuvable.');
    if(ss.getSheetByName(CREATIS_PROJECTION_BACKUP_20261107)||ss.getSheetByName(CREATIS_PROJECTION_SHEET_20261107))
      throw new Error('Une sauvegarde/projection existe déjà : écriture refusée.');
    const credit=creditCreatisUniqueProjection20261107_();
    const sauvegarde=source.copyTo(ss);
    sauvegarde.setName(CREATIS_PROJECTION_BACKUP_20261107);
    sauvegarde.hideSheet();
    const sim=ss.insertSheet(CREATIS_PROJECTION_SHEET_20261107);
    sim.getRange(1,1,1,CREATIS_PROJECTION_COLS_20261107.length)
      .setValues([CREATIS_PROJECTION_COLS_20261107]);
    const lignes=projection.lignes.map(x=>[
      String(credit.id),x.numero,x.date,x.montant,x.interets,x.capital,
      x.capitalAvant,x.capitalApres,'SIMULATION_NON_CONTRACTUELLE',
      'Capital confirmé par espace client ; intérêts au taux nominal ; dates supposées'
    ]);
    sim.getRange(2,1,lignes.length,CREATIS_PROJECTION_COLS_20261107.length).setValues(lignes);
    sim.setFrozenRows(1);
    assurerColonnesDocumentCredits20261104_();
    const d=projection.parametres;
    const commentaire=String(credit.commentaire||'').trim();
    const label='Capital vérifié sur espace client au '+d.date_reference+
      ' ; échéancier SIMULÉ,  taux nominal '+d.taux_nominal_annuel_pct+
      ' %, reprise supposée le '+d.premiere_echeance_prevue+
      ' ; échéances et intérêts non contractuels.';
    const maj=Object.assign({},credit,{
      capital_restant:d.capital_verifie,
      mensualite:d.mensualite,
      taux_nominal:d.taux_nominal_annuel_pct,
      prochaine_echeance:new Date(d.premiere_echeance_prevue+'T12:00:00Z'),
      date_fin:new Date(projection.finPrevue+'T12:00:00Z'),
      echeances_restantes:projection.nombreEcheances,
      cout_restant:projection.totalInterets,
      cout_restant_precision:'SIMULATION au taux nominal, frais/report inconnus et calendrier contractuel non confirmé.',
      date_reference_documentaire:d.date_reference,
      capital_reference_documentaire:d.capital_verifie,
      source_reference_documentaire:'espace_client_capital_confirme_20261107',
      statut_documentaire:'solde_confirme_echeancier_simule',
      commentaire:(commentaire?commentaire+' | ':'')+label
    });
    enregistrerCreditEtendu_(maj);
    resultat={ok:true,applique:true,sauvegarde:CREATIS_PROJECTION_BACKUP_20261107,
      projection:CREATIS_PROJECTION_SHEET_20261107,ancienSolde:audit.capitalActuel,
      nouveauSolde:d.capital_verifie,echeances:projection.nombreEcheances,
      interetsSimules:projection.totalInterets,derniereEcheancePrevue:projection.finPrevue,
      statut:'SIMULATION_NON_CONTRACTUELLE'};
  }finally{lock.releaseLock();}
  if(resultat&&resultat.applique){
    if(typeof marquerSnapshotGlobalBudgetSoftObsolete20260916_==='function')
      marquerSnapshotGlobalBudgetSoftObsolete20260916_('solde_creatis_verifie_20261107');
    if(typeof reconstruireSnapshotGlobalSyntheseBudgetSoft20260907==='function'){
      try{const s=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('solde_creatis_confirme_20261107');
        resultat.snapshot={ok:!!(s&&s.ok),revisionBudgetSoft:s&&s.revisionBudgetSoft||'',message:s&&s.message||''};}
      catch(e){resultat.snapshot={ok:false,erreur:String(e&&e.message||e)};}
    }
  }
  return resultat;
}
