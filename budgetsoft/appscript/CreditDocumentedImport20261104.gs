/**
 * Import ponctuel de références documentaires des crédits.
 * Les données personnelles restent dans le JSON fourni à l'exécution,
 * jamais dans le dépôt public. Aucun débit bancaire n'est créé ou modifié.
 * Toujours auditer avant d'appliquer (jeton de contrôle de l'état des soldes).
 */
const CREDIT_DOCUMENT_IMPORT_20261104_VERSION = '2026-11-04.1';
const CREDIT_DOCUMENT_IMPORT_20261104_SCHEMA = 'staging/budgetsoft-credit-reference/v1';
const CREDIT_DOCUMENT_IMPORT_20261104_BACKUP = 'Backup_Credits_20261104';
const CREDIT_DOCUMENT_IMPORT_20261104_COLUMNS = [
  'date_reference_documentaire','capital_reference_documentaire',
  'source_reference_documentaire','taux_nominal','libelle_taux',
  'date_dernier_paiement_confirme','taux_programme','date_effet_taux_programme','statut_documentaire'
];

function cleDocumentCredit20261104_(nom) {
  const t=String(nom||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  if(t.includes('CASDEN'))return 'CASDEN';
  if(t.includes('CREATIS'))return 'CREATIS';
  if(t.includes('ACCESSIO'))return 'ACCESSIO';
  if(t.includes('CARREFOUR'))return 'CARREFOUR';
  if(t.includes('FLOA')||t.includes('CDISCOUNT'))return 'FLOA';
  if(t.includes('ONEY')||t.includes('CARTE B+'))return 'ONEY';
  if(t.includes('COFIDIS'))return 'COFIDIS_PERSONNEL';
  return '';
}
function arrDocumentCredit20261104_(n){return Math.round(Number(n)*100)/100;}
function nombreDocumentCredit20261104_(n,libelle){
  if(n===null||n===undefined||n==='')throw new Error(libelle+' : montant absent.');
  const v=Number(n);if(!Number.isFinite(v)||v<0)throw new Error(libelle+' : montant invalide.');
  return arrDocumentCredit20261104_(v);
}
function dateDocumentCredit20261104_(s,libelle){
  const t=String(s||'');
  const valide=/^\d{4}-\d{2}-\d{2}$/.test(t);
  const date=valide?new Date(t+'T12:00:00Z'):null;
  if(!valide||!date||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==t){
    throw new Error(libelle+' : date ISO requise.');
  }
  return t;
}
function lireDocumentCredits20261104_(json){
  if(typeof json!=='string'||json.length>350000)throw new Error('Fichier JSON absent ou trop volumineux.');
  let d;try{d=JSON.parse(json);}catch(e){throw new Error('JSON illisible : '+String(e.message||e));}
  if(d.schema!==CREDIT_DOCUMENT_IMPORT_20261104_SCHEMA||d.created_as_of!=='2026-11-04')
    throw new Error('Ce fichier ne correspond pas au référentiel documentaire du 04/11/2026.');
  if(!Array.isArray(d.credits)||d.credits.length!==7)throw new Error('Le fichier doit contenir exactement sept crédits.');
  const vus=new Set();
  d.credits.forEach(c=>{
    const cle=cleDocumentCredit20261104_(c.credit_name);
    if(!cle||vus.has(cle))throw new Error('Crédit inconnu ou en double : '+String(c.credit_name));
    vus.add(cle);
    nombreDocumentCredit20261104_(c.balance_previous_budgetsoft_eur,cle+' ancienne référence');
    nombreDocumentCredit20261104_(c.next_payment_eur,cle+' mensualité');
    if(c.import_status==='pending_revised_schedule'){
      if(cle!=='CREATIS'||c.credit_kind!=='amortissable'||c.balance_documented_eur!=null||
          (c.amortization_schedule||[]).length)
        throw new Error('Seul Créatis peut être en attente du nouveau tableau, sans capital ni échéancier.');
      return;
    }
    if(cle==='CREATIS'){
      const emis=String(c.post_deferral_schedule_issued_on||'');
      if(c.post_deferral_schedule_verified!==true||emis<='2026-08-31'||
          !Array.isArray(c.amortization_schedule)||c.amortization_schedule.length===0){
        throw new Error('Créatis : tableau révisé postérieur au report d’août 2026 exigé. Ancien échéancier interdit.');
      }
      dateDocumentCredit20261104_(emis,'Créatis : émission du nouvel échéancier');
    }
    nombreDocumentCredit20261104_(c.balance_documented_eur,cle);
    dateDocumentCredit20261104_(c.balance_reference_date,cle+' date de référence');
    dateDocumentCredit20261104_(c.next_payment_date,cle+' prochaine échéance');
    if(c.credit_kind!==(c.amortization_schedule&&c.amortization_schedule.length?'amortissable':'renouvelable')){
      if(!(c.credit_kind==='amortissable'&&Array.isArray(c.amortization_schedule)))throw new Error(cle+' : type incohérent.');
    }
  });
  const enAttente=d.credits.filter(c=>c.import_status==='pending_revised_schedule');
  if(enAttente.length>1)throw new Error('Un seul crédit peut être laissé en attente.');
  const total=arrDocumentCredit20261104_(d.credits.filter(c=>c.import_status!=='pending_revised_schedule')
    .reduce((s,c)=>s+Number(c.balance_documented_eur),0));
  if(!Number.isFinite(Number(d.total_documented_balances_eur))||
     Math.abs(total-Number(d.total_documented_balances_eur))>.01)
    throw new Error('Le total déclaré ne correspond pas aux crédits importables.');
  const mensualites=arrDocumentCredit20261104_(d.credits.reduce((s,c)=>s+Number(c.next_payment_eur),0));
  if(!Number.isFinite(Number(d.total_corrected_monthly_payment_eur))||
     Math.abs(mensualites-Number(d.total_corrected_monthly_payment_eur))>.01)
    throw new Error('Le total déclaré des mensualités ne correspond pas aux sept crédits.');
  return d;
}
function journalDepuisReferenceDocument20261104_(creditId,dateRef){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sh=ss.getSheetByName('Amortissements_credits');if(!sh||sh.getLastRow()<2)return[];
  const values=sh.getDataRange().getValues(),headers=values.shift().map(String);
  const pos=k=>headers.indexOf(k),ic=pos('credit_id'),idate=pos('date_operation'),istatus=pos('statut'),iop=pos('operation_id');
  if(ic<0||idate<0||istatus<0)return[{raison:'journal_sans_colonnes_attendues'}];
  return values.filter(r=>{
    if(String(r[ic])!==String(creditId)||String(r[istatus])!=='applique')return false;
    if(iop>=0&&String(r[iop]).startsWith('SOURCE|'))return false;
    const raw=r[idate],date=raw instanceof Date?Utilities.formatDate(raw,Session.getScriptTimeZone(),'yyyy-MM-dd'):String(raw||'').slice(0,10);
    return date>dateRef;
  }).map(r=>({operation_id:iop>=0?String(r[iop]):'',date:String(r[idate])}));
}
function correspondancesDocumentCredits20261104_(doc,credits){
  return doc.credits.map(d=>{
    const cle=cleDocumentCredit20261104_(d.credit_name);
    const candidats=credits.filter(c=>cleDocumentCredit20261104_(c.nom)===cle);
    const c=candidats.length===1?candidats[0]:null;
    const ancien=nombreDocumentCredit20261104_(d.balance_previous_budgetsoft_eur,'ancien');
    const enAttente=d.import_status==='pending_revised_schedule';
    const cible=enAttente?null:nombreDocumentCredit20261104_(d.balance_documented_eur,'nouveau');
    const actuel=c?arrDocumentCredit20261104_(Number(c.capital_restant||0)):null;
    const typeAttendu=d.credit_kind==='amortissable'?'amortissable':'revolving';
    const numeroDoc=String(d.contract_number||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
    const numeroActuel=c?String(c.numero_pret||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase():'';
    const suffixe=numeroDoc.slice(-4);
    const numeroCompatible=!!(c&&suffixe&&numeroActuel.endsWith(suffixe));
    const typeCompatible=!!(c&&String(c.type_credit||typeAttendu).toLowerCase()===typeAttendu);
    const dejaMarque=!!(c&&String(c.source_reference_documentaire||'')==='import_doc_20261104'&&
      String(c.date_reference_documentaire||'').slice(0,10)===d.balance_reference_date);
    const etat=!c?'introuvable':(enAttente?'en_attente_echeancier':
      (Math.abs(actuel-cible)<.01?(dejaMarque?'deja_documente':'pret_meta'):(Math.abs(actuel-ancien)<.01?'pret':'conflit_solde')));
    // Un report d'août signalé sur Créatis invaliderait l'usage mécanique du
    // calendrier de mai 2025. Aucune correction silencieuse dans ce cas.
    const reportCreatis=!!(c&&cle==='CREATIS'&&
      /(?:report|suspend)[^.;]{0,100}(?:31\/08\/2026|ao[uû]t\s*2026)|(?:31\/08\/2026|ao[uû]t\s*2026)[^.;]{0,100}(?:report|suspend)/i
      .test(String(c.commentaire||'')));
    const nouvellesOps=c&&!enAttente?journalDepuisReferenceDocument20261104_(c.id,d.balance_reference_date):[];
    const erreur=!c?'credit_introuvable_ou_ambigu':(!numeroCompatible?'numero_contrat_incompatible':
      (!typeCompatible?'type_incompatible':(enAttente?'':(nouvellesOps.length?'journal_apres_reference':
      (reportCreatis&&!d.post_deferral_schedule_verified?'report_creatis_aout_2026_a_verifier':(etat==='conflit_solde'?'solde_inattendu':''))))));
    return {cle,credit:d.credit_name,credit_id:c?String(c.id):'',etat,erreur,en_attente:enAttente,numero_compatible:numeroCompatible,
      solde_actuel:actuel,solde_attendu_avant:ancien,solde_documente:cible,date_reference:d.balance_reference_date,
      mensualite:Number(d.next_payment_eur),prochaine_echeance:d.next_payment_date,operations_journal_apres_reference:nouvellesOps.length};
  });
}
function empreinteDocumentCredits20261104_(doc,lignes){
  const payload=JSON.stringify({version:CREDIT_DOCUMENT_IMPORT_20261104_VERSION,
    date:doc.created_as_of,document:doc,credits:lignes.map(x=>[x.cle,x.credit_id,x.solde_actuel,x.solde_documente,x.etat,x.erreur])});
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,payload).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');
}
function auditerImportCreditsDocumentes20261104(json){
  verifierInitialisation_();
  const doc=lireDocumentCredits20261104_(json),credits=lireCreditsEtendusV2_();
  const lignes=correspondancesDocumentCredits20261104_(doc,credits),erreurs=lignes.filter(x=>x.erreur);
  const nombreEcheances=lignesEcheancierDocumente20261104_(doc,lignes).length;
  const calendrierExiste=!!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CREDIT_DOC_SCHEDULE_SHEET_20261104);
  const totalActuel=arrDocumentCredit20261104_(lignes.reduce((s,x)=>s+Number(x.solde_actuel||0),0));
  return {ok:erreurs.length===0&&(!calendrierExiste||lignes.filter(x=>!x.en_attente).every(x=>x.etat==='deja_documente')),lectureSeule:true,version:CREDIT_DOCUMENT_IMPORT_20261104_VERSION,
    nombreEcheances,calendrierExiste,
    date:'2026-11-04',nombreCredits:lignes.length,
    nombreCreditsImportables:lignes.filter(x=>!x.en_attente).length,
    nombreCreditsEnAttente:lignes.filter(x=>x.en_attente).length,
    creditsEnConflit:erreurs.length,
    sommeActuelle:totalActuel,sommeDocumentee:Number(doc.total_documented_balances_eur),
    mensualitesDocumentees:Number(doc.total_corrected_monthly_payment_eur),
    empreinte:empreinteDocumentCredits20261104_(doc,lignes),lignes};
}
function assurerColonnesDocumentCredits20261104_(){
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Credits');
  if(!sh)throw new Error('La feuille Credits est introuvable.');
  const cols=Math.max(1,sh.getLastColumn()),headers=sh.getRange(1,1,1,cols).getValues()[0].map(v=>String(v||'').trim());
  const missing=CREDIT_DOCUMENT_IMPORT_20261104_COLUMNS.filter(x=>!headers.includes(x));
  if(missing.length)sh.getRange(1,cols+1,1,missing.length).setValues([missing]);
}
function prochaineDateCredit20261104_(s){return new Date(s+'T12:00:00');}
function creditDepuisDocument20261104_(c,d){
  const futur=(d.amortization_schedule||[]).filter(x=>x.date>=d.next_payment_date);
  const coutFutur=futur.length?Math.max(0,arrDocumentCredit20261104_(futur.reduce((s,x)=>s+Number(x.payment_eur||0),0)-Number(d.balance_documented_eur))):null;
  const renouvelable=d.credit_kind!=='amortissable',vent=d.next_payment_breakdown_indicative||{};
  const mensualites=renouvelable?Number(d.remaining_months_indicative||0):futur.length;
  const cout=coutFutur===null?Math.max(0,arrDocumentCredit20261104_(mensualites*Number(d.next_payment_eur)-Number(d.balance_documented_eur))):coutFutur;
  const dernier=String(d.last_paid_date_confirmed||'');
  const labelTaux=d.credit_name==='CASDEN'?'TEG':'TAEG';
  const source='Source documentaire '+String(d.source||'référence importée')+' ; solde arrêté au '+d.balance_reference_date+'.';
  const maj=Object.assign({},c,{
    capital_restant:Number(d.balance_documented_eur),mensualite:Number(d.next_payment_eur),
    prochaine_echeance:prochaineDateCredit20261104_(d.next_payment_date),
    taux:Math.round(Number(d.taeg_or_teg_annual_rate||0)*10000)/100,
    taux_nominal:d.nominal_annual_rate==null?'':Math.round(Number(d.nominal_annual_rate)*10000)/100,
    libelle_taux:labelTaux,type_credit:renouvelable?'revolving':'amortissable',
    taux_programme:d.rate_change?Math.round(Number(d.rate_change.taeg_annual_rate||0)*10000)/100:'',
    date_effet_taux_programme:d.rate_change?dateDocumentCredit20261104_(d.rate_change.effective_date,'date de changement de taux'):'',
    echeances_restantes:mensualites,cout_restant:cout,
    cout_restant_precision:renouvelable?'Indicatif : échéances restantes du dernier relevé, sans nouvelle utilisation ni évolution de taux.':'Somme des échéances futures du tableau officiel moins le capital documenté.',
    assurance_mensuelle:Number(vent.insurance_eur||(!renouvelable&&d.credit_name==='Cofidis personnel'?21:0)),
    date_reference_documentaire:d.balance_reference_date,
    capital_reference_documentaire:Number(d.balance_documented_eur),
    source_reference_documentaire:'import_doc_20261104',
    date_dernier_paiement_confirme:dernier,
    commentaire:source+' '+String(d.comment||'')
  });
  if(renouvelable){
    maj.plafond_credit=Number(d.credit_limit_eur||c.plafond_credit||0);
    if(d.available_credit_eur!=null)maj.disponible_credit=Number(d.available_credit_eur);
    maj.date_fin='';
  }else if(d.final_payment_date){maj.date_fin=prochaineDateCredit20261104_(d.final_payment_date);}
  return maj;
}
function appliquerImportCreditsDocumentes20261104(json,empreintePrevue){
  verifierInitialisation_();
  const lock=LockService.getDocumentLock()||LockService.getScriptLock();
  lock.waitLock(30000);
  let result;
  try{
    const doc=lireDocumentCredits20261104_(json),audit=auditerImportCreditsDocumentes20261104(json);
    if(!audit.ok||audit.empreinte!==String(empreintePrevue||''))throw new Error('Audit invalide ou données modifiées depuis l’analyse. Réexécuter le contrôle.');
    const deja=audit.lignes.filter(x=>!x.en_attente).every(x=>x.etat==='deja_documente');
    if(deja)return {ok:true,applique:false,dejaAJour:true,total:Number(doc.total_documented_balances_eur)};
    const ss=SpreadsheetApp.getActiveSpreadsheet(),source=ss.getSheetByName('Credits');
    if(!source)throw new Error('La feuille Credits est introuvable.');
    if(ss.getSheetByName(CREDIT_DOCUMENT_IMPORT_20261104_BACKUP))throw new Error('Sauvegarde déjà présente. Vérifier une précédente importation avant toute nouvelle écriture.');
    if(ss.getSheetByName(CREDIT_DOC_SCHEDULE_SHEET_20261104))throw new Error('Echéanciers déjà présents. Audit manuel nécessaire.');
    // Préparer toutes les nouvelles lignes AVANT de toucher au classeur.
    // Une date, un calendrier ou une correspondance erronés ne doivent pas laisser un import partiel.
    const credits=lireCreditsEtendusV2_();
    const preparations=audit.lignes.map(ligne=>{
      const d=doc.credits.find(x=>cleDocumentCredit20261104_(x.credit_name)===ligne.cle);
      const credit=credits.find(x=>String(x.id)===ligne.credit_id);
      if(!d||!credit)throw new Error('Correspondance crédit introuvable avant écriture : '+ligne.cle);
      return {ligne,d,credit,prochain:ligne.en_attente?null:creditDepuisDocument20261104_(credit,d)};
    });
    if(!lignesEcheancierDocumente20261104_(doc,audit.lignes).length)
      throw new Error('Aucune échéance documentaire exploitable : import bloqué.');
    const sauvegarde=source.copyTo(ss);
    sauvegarde.setName(CREDIT_DOCUMENT_IMPORT_20261104_BACKUP);
    sauvegarde.hideSheet();
    assurerColonnesDocumentCredits20261104_();
    const nombreEcheances=enregistrerEcheanciersDocumentes20261104_(doc,audit.lignes);
    const modifies=[];
    for(const {ligne,d,credit,prochain} of preparations){
      if(ligne.en_attente){
        // Ne pas écraser une référence Créatis plus récente, confirmée depuis
        // l'espace client : le JSON historique du 04/11 reste en attente
        // uniquement pour son échéancier OFFICIEL, pas pour son capital.
        if(String(credit.statut_documentaire||'')==='solde_confirme_echeancier_simule')continue;
        // Aucun capital, taux, échéance ni échéancier Créatis recalculé :
        // on marque seulement la nécessité d'un document actualisé.
        enregistrerCreditEtendu_(Object.assign({},credit,{
          statut_documentaire:'echeancier_revision_attendu',
          commentaire:String(credit.commentaire||'').replace(/\s+$/,'')+
            ' | Report d\'août 2026 confirmé : ancien échéancier de mai 2025 non utilisable comme capital actuel.'
        }));
        continue;
      }
      prochain.statut_documentaire='documente';
      enregistrerCreditEtendu_(prochain);
      modifies.push({credit:d.credit_name,solde:Number(d.balance_documented_eur),date:d.balance_reference_date});
    }
    result={ok:true,applique:true,version:CREDIT_DOCUMENT_IMPORT_20261104_VERSION,
      sauvegarde:CREDIT_DOCUMENT_IMPORT_20261104_BACKUP,nombreEcheances,modifies,
      creancesEnAttente:audit.lignes.filter(x=>x.en_attente).map(x=>x.credit),
      totalDocumenteHorsAttente:Number(doc.total_documented_balances_eur)};
  }finally{lock.releaseLock();}
  if(result&&result.applique&&typeof reconstruireSnapshotGlobalSyntheseBudgetSoft20260907==='function'){
    try{const s=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('import_credits_documentes_20261104');
      result.snapshot={ok:!!(s&&s.ok),revisionBudgetSoft:String(s&&s.revisionBudgetSoft||''),message:String(s&&s.message||'')};}
    catch(e){result.snapshot={ok:false,erreur:String(e.message||e)};}
  }
  return result;
}
function ouvrirImportCreditsDocumentes20261104(){
  // Compatibilite avec les appels depuis l'editeur Apps Script TEST autonome.
  // La modale est affichee uniquement dans la page web BudgetSoft / Financements.
  const message='Ouvrez BudgetSoft TEST, rubrique Financements, puis cliquez sur « Auditer références ». Cette fonction ne peut pas ouvrir de fenêtre depuis l’éditeur Apps Script autonome.';
  console.log(message);
  return {ok:true,mode:'interface_web',message};
}