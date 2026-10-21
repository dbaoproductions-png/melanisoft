/**
 * Simulation d'inscription d'une decision d'occurrence, sans ecriture.
 * Le prototype ne dispose d'aucune preuve d'impaye pour octobre : la seule
 * absence de paiement ne vaut jamais confirmation.
 */
function simulerDecisionOccurrenceCfBudgetSoft20261021_(demande){
 const d=demande||{},v=validerDecisionOccurrenceCfBudgetSoft20261021_(d);
 const erreurs=v.errors.slice(),avertissements=[];
 const charges=lireTable_('Charges_fixes')||[],ops=lireTable_('Operations')||[];
 const c=charges.find(x=>String(x.id||'')===v.chargeId);
 if(!c)erreurs.push('charge_fixe_introuvable');
 const decisionExistante=lireDecisionsOccurrencesCfBudgetSoft20261021_().filter(x=>
  String(x.charge_fixe_id||'')===v.chargeId&&
  String(x.date_origine||'').slice(0,10)===v.origine&&
  String(x.actif||'').toLowerCase()!=='false');
 if(decisionExistante.length)erreurs.push('occurrence_deja_documentee');
 if(v.decision==='paiement_confirme'){
  const op=ops.find(x=>String(x.id||'')===v.operationId);
  if(!op)erreurs.push('operation_bancaire_introuvable');
  else{
   const liee=String(op.charge_fixe_id||'').trim();
   if(liee&&liee!==v.chargeId)erreurs.push('operation_liee_a_une_autre_charge');
   if(Number(op.montant||0)>=0)erreurs.push('operation_non_debitrice');
   const montant=Math.abs(Number(op.montant||0));
   if(Number.isFinite(montant)&&v.montant>montant+.01)erreurs.push('montant_superieur_au_debit');
  }
 }
 if(v.decision==='impaye_confirme'){
  // Une attestation distincte est obligatoire : ni le CFT1 ni un simple
  // rapprochement absent ne peuvent faire foi d'un impaye mensuel.
  if(v.preuve.length<8)erreurs.push('justificatif_impaye_insuffisant');
  const dejaPaye=ops.filter(o=>String(o.charge_fixe_id||'')===v.chargeId&&Number(o.montant||0)<0&&
   String(o.date_comptable||o.date||'').slice(0,10)>=v.origine);
  if(dejaPaye.length)avertissements.push('paiement_lie_a_la_charge_post_origine_a_examiner');
 }
 const resultat={ok:erreurs.length===0&&avertissements.length===0,lectureSeule:true,
  version:'2026-10-21.1',decision:v.decision,chargeId:v.chargeId,dateOrigine:v.origine,
  erreurs,avertissements,decisionExistante:decisionExistante.length,
  inscriptionEffectuee:false,
  garde:'Aucune ecriture de feuille; ne confirme pas automatiquement un impaye a partir de la date theorique ou de CFT1.'};
 return resultat;
}
function auditerSimulationPremiereDecisionCopro20261021(){
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const res=simulerDecisionOccurrenceCfBudgetSoft20261021_({
  charge_fixe_id:id,date_origine:'2026-10-15',
  decision:'impaye_confirme',reference_preuve:'',
  montant:550,operation_id:''
 });
 const sortie={ok:res.erreurs.includes('reference_preuve_manquante')&&res.inscriptionEffectuee===false,
  lectureSeule:true,simulation:res,
  note:'Le 15 octobre n est pas une echeance certaine et aucun impaye ne doit etre inscrit sans justification datee et identite d occurrence.'};
 console.log('[AUDIT SIMULATION PREMIERE DECISION COPRO] '+JSON.stringify(sortie));return sortie;
}
