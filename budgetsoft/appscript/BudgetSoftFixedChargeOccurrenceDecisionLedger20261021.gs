/**
 * Registre explicite des decisions sur occurrences glissantes.
 * Schema futur (NON initialise par les audits):
 * charge_fixe_id, date_origine, decision, montant, operation_id,
 * reference_preuve, commentaire, actif, cree_le, modifie_le.
 * Une decision ne peut pas inventer un paiement bancaire.
 */
const BUDGETSOFT_CF_OCCURRENCE_DECISIONS_20261021_HEADERS=[
 'charge_fixe_id','date_origine','decision','montant','operation_id',
 'reference_preuve','commentaire','actif','cree_le','modifie_le'
];

/** Lecture pure : ne cree jamais d'onglet si absent. */
function lireDecisionsOccurrencesCfBudgetSoft20261021_(){
 const ss=SpreadsheetApp.getActiveSpreadsheet();
 const f=ss.getSheetByName('Decisions_occurrences_charges_fixes');
 if(!f||f.getLastRow()<2)return[];
 const values=f.getDataRange().getValues(),headers=values.shift().map(x=>String(x||'').trim());
 return values.filter(row=>row.some(v=>v!==''&&v!==null)).map(row=>{
  const x={};BUDGETSOFT_CF_OCCURRENCE_DECISIONS_20261021_HEADERS.forEach(k=>{
   const i=headers.indexOf(k);x[k]=i>=0?row[i]:null;
  });return x;
 });
}

/** Validation de forme : aucune ecriture et aucun rapprochement automatique. */
function validerDecisionOccurrenceCfBudgetSoft20261021_(x){
 x=x||{};const id=String(x.charge_fixe_id||'').trim(),date=String(x.date_origine||'').slice(0,10);
 const decision=String(x.decision||'').trim(),reference=String(x.reference_preuve||'').trim();
 const valide=/^\d{4}-\d{2}-\d{2}$/.test(date);
 const mont=Number(x.montant);
 const errors=[];
 if(!id)errors.push('charge_fixe_id_manquant');
 if(!valide||!Number.isFinite(Date.parse(date+'T12:00:00'))||
  new Date(date+'T12:00:00').toISOString().slice(0,10)!==date)errors.push('date_origine_invalide');
 if(!['impaye_confirme','annulee','paiement_confirme'].includes(decision))errors.push('decision_invalide');
 if(!reference)errors.push('reference_preuve_manquante');
 if(decision==='paiement_confirme'&&!String(x.operation_id||'').trim())errors.push('operation_id_manquant');
 if(decision==='paiement_confirme'&&(!Number.isFinite(mont)||mont<=0))errors.push('montant_paiement_invalide');
 return{ok:errors.length===0,errors,chargeId:id,origine:date,decision,
  preuve:reference,operationId:String(x.operation_id||'').trim(),montant:mont};
}

/** Transforme exclusivement des decisions valides en faits utilisables par le registre.
 * Une ligne 'paiement_confirme' est une decision documentee, pas une operation creee.
 */
function projeterDecisionsOccurrencesCfBudgetSoft20261021_(lignes){
 const confirmations=[],paiements=[],anomalies=[],cles=new Set();
 (lignes||[]).forEach((x,i)=>{
  if(x.actif===false||String(x.actif||'').toLowerCase()==='false')return;
  const v=validerDecisionOccurrenceCfBudgetSoft20261021_(x);
  if(!v.ok){anomalies.push({ligne:i+2,motifs:v.errors});return;}
  const cle=v.chargeId+'|'+v.origine+'|'+v.decision+'|'+v.operationId;
  if(cles.has(cle)){anomalies.push({ligne:i+2,motifs:['decision_dupliquee']});return;}
  cles.add(cle);
  if(v.decision==='impaye_confirme')confirmations.push({chargeId:v.chargeId,origine:v.origine,statut:'impaye_confirme',reference:v.preuve});
  if(v.decision==='paiement_confirme')paiements.push({chargeId:v.chargeId,origine:v.origine,statut:'valide',operationId:v.operationId,montant:v.montant});
  if(v.decision==='annulee')anomalies.push({ligne:i+2,motifs:['annulation_a_raccorder_a_l_occurrence_source']});
 });
 return{ok:anomalies.length===0,lectureSeule:true,confirmations,paiements,anomalies};
}
function testerRegistreDecisionsCfBudgetSoft20261021(){
 const base={charge_fixe_id:'COPRO',date_origine:'2026-10-15',reference_preuve:'attestation utilisateur'};
 const a=projeterDecisionsOccurrencesCfBudgetSoft20261021_([
  Object.assign({},base,{decision:'impaye_confirme'})
 ]);
 const b=projeterDecisionsOccurrencesCfBudgetSoft20261021_([
  Object.assign({},base,{decision:'paiement_confirme',operation_id:'OP1',montant:550})
 ]);
 const c=projeterDecisionsOccurrencesCfBudgetSoft20261021_([
  Object.assign({},base,{decision:'paiement_confirme',montant:550})
 ]);
 const d=projeterDecisionsOccurrencesCfBudgetSoft20261021_([
  Object.assign({},base,{decision:'impaye_confirme'}),Object.assign({},base,{decision:'impaye_confirme'})
 ]);
 const t={confirmationExplicite:a.ok&&a.confirmations.length===1,
  paiementAvecOperation:b.ok&&b.paiements.length===1,
  paiementSansOperationRejete:!c.ok,
  doublonRejete:!d.ok};
 const out={ok:Object.values(t).every(Boolean),lectureSeule:true,tests:t};
 console.log('[TEST REGISTRE DECISIONS CF] '+JSON.stringify(out));return out;
}
function auditerDecisionsOccurrencesCfBudgetSoft20261021(){
 const donnees=lireDecisionsOccurrencesCfBudgetSoft20261021_();
 const r=projeterDecisionsOccurrencesCfBudgetSoft20261021_(donnees);
 const out={ok:r.ok,lectureSeule:true,tablePresente:!!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Decisions_occurrences_charges_fixes'),
  lignes:donnees.length,confirmations:r.confirmations.length,paiements:r.paiements.length,anomalies:r.anomalies.slice(0,10),
  publicationActive:false};
 console.log('[AUDIT DECISIONS OCCURRENCES CF] '+JSON.stringify(out));return out;
}
