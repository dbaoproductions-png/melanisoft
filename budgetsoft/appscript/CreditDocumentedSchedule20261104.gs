/**
 * Echéanciers officiels fournis par l'utilisateur, sauvegardés dans la feuille
 * privée du classeur Google Sheets lors de l'import (pas dans GitHub).
 */
const CREDIT_DOC_SCHEDULE_SHEET_20261104='Echeanciers_credits_documentes';
const CREDIT_DOC_SCHEDULE_HEADERS_20261104=[
  'credit_id','credit_nom','numero_echeance','date_echeance','montant_echeance',
  'part_capital','part_interets','part_assurance','capital_avant','capital_apres','source'
];
function lignesEcheancierDocumente20261104_(doc,lignes){
  const correspondances=new Map(lignes.map(x=>[x.cle,x.credit_id])),out=[];
  (doc.credits||[]).forEach(c=>{
    if(c.import_status==='pending_revised_schedule')return;
    if(c.credit_kind!=='amortissable')return;
    const cle=cleDocumentCredit20261104_(c.credit_name),id=correspondances.get(cle);
    if(!id)throw new Error('Échéancier sans crédit identifié : '+cle);
    (c.amortization_schedule||[]).forEach(l=>{
      const date=dateDocumentCredit20261104_(l.date,'date échéancier '+cle);
      const mont=nombreDocumentCredit20261104_(l.payment_eur,'mensualité '+cle);
      const cap=nombreDocumentCredit20261104_(l.principal_paid_eur,'capital '+cle);
      const inter=nombreDocumentCredit20261104_(l.interest_eur,'intérêts '+cle);
      const ass=nombreDocumentCredit20261104_(l.insurance_eur||0,'assurance '+cle);
      const avant=nombreDocumentCredit20261104_(l.balance_before_eur,'capital avant '+cle);
      const apres=nombreDocumentCredit20261104_(l.balance_after_eur,'capital après '+cle);
      if(Math.abs(mont-cap-inter-ass)>.02||Math.abs((avant-cap)-apres)>.02)
        throw new Error('Échéancier incohérent '+cle+' au '+date);
      out.push([id,String(c.credit_name),Number(l.installment_no),date,mont,cap,inter,ass,avant,apres,
        String(c.source||'tableau officiel')]);
    });
  });
  return out;
}
function enregistrerEcheanciersDocumentes20261104_(doc,lignes){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(ss.getSheetByName(CREDIT_DOC_SCHEDULE_SHEET_20261104))
    throw new Error('Échéancier documentaire déjà présent : import manuel nécessaire après audit.');
  const rows=lignesEcheancierDocumente20261104_(doc,lignes);
  if(!rows.length)throw new Error('Aucune ligne d’échéancier à enregistrer.');
  const sh=ss.insertSheet(CREDIT_DOC_SCHEDULE_SHEET_20261104);
  sh.getRange(1,1,1,CREDIT_DOC_SCHEDULE_HEADERS_20261104.length).setValues([CREDIT_DOC_SCHEDULE_HEADERS_20261104]);
  sh.getRange(2,1,rows.length,CREDIT_DOC_SCHEDULE_HEADERS_20261104.length).setValues(rows);
  sh.setFrozenRows(1);
  return rows.length;
}
function ventilationEcheancierDocumente20261104_(credit,operation){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sh=ss.getSheetByName(CREDIT_DOC_SCHEDULE_SHEET_20261104);
  if(!sh||sh.getLastRow()<2)return null;
  const dateOp=dateOperationCredit20260915_(operation);
  if(!dateOp)return null;
  const opDate=Utilities.formatDate(dateOp,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const id=String(credit&&credit.id||''),mont=Math.abs(Number(operation&&operation.montant||0));
  if(!id||!mont)return null;
  // Un virement peut être comptabilisé J +/- 2 (week-end/jour ouvré).
  const jourOp=Date.parse(opDate+'T12:00:00'),values=sh.getRange(2,1,sh.getLastRow()-1,CREDIT_DOC_SCHEDULE_HEADERS_20261104.length).getValues();
  const candidats=values.filter(r=>{
    const date=String(r[3]).slice(0,10),jour=Date.parse(date+'T12:00:00');
    return String(r[0])===id&&Number.isFinite(jour)&&Math.abs((jourOp-jour)/86400000)<=2&&Math.abs(Number(r[4])-mont)<.02;
  });
  if(candidats.length!==1)return null;
  const r=candidats[0],actuel=Math.round(Number(credit.capital_restant||0)*100)/100;
  if(Math.abs(actuel-Number(r[8]))>.02){
    // Ne JAMAIS estimer un amortissement en présence d'une échéance
    // contractuelle dont le capital précédent est incohérent.
    return {conflit:true,raison:'capital_avant_echeancier_incoherent',capitalAttendu:Number(r[8]),capitalObserve:actuel};
  }
  return {partCapital:Number(r[5]),partInterets:Number(r[6]),partAssurance:Number(r[7]),
    capitalApresTheorique:Number(r[9]),methode:'echeancier_officiel_prive_20261104'};
}