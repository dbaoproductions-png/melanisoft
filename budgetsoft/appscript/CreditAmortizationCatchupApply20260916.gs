const CREDIT_AMORTIZATION_CATCHUP_APPLY_20260916_VERSION='2026-09-16.1';

function operationIdSourceRattrapageCredit20260916_(ligne){
  return ['SOURCE',ligne.credit_id||'',ligne.date_reference||'',ligne.source_reference||''].join('|');
}

function ajouterJournalRattrapageCredit20260916_(row){
  const sh=assurerJournalAmortissementsCredits20260915_();
  sh.getRange(sh.getLastRow()+1,1,1,CREDIT_AMORTIZATION_HEADERS_20260915.length).setValues([CREDIT_AMORTIZATION_HEADERS_20260915.map(h=>row[h]??'')]);
}

function journaliserSourceRattrapageCredit20260916_(ligne,credit){
  if(!ligne.resynchronisation_source)return null;
  const operationId=operationIdSourceRattrapageCredit20260916_(ligne),journal=lireJournalAmortissementsCredits20260915_(),deja=journal.find(x=>String(x.operation_id||'')===operationId&&String(x.statut||'')==='source_sync');
  if(deja)return{ok:true,duplique:true,operation_id:operationId};
  const row={
    id:Utilities.getUuid(),credit_id:ligne.credit_id,credit_nom:ligne.credit,charge_fixe_id:'',operation_id:operationId,
    date_operation:ligne.date_reference||'',montant_echeance:0,part_capital:Number(ligne.ajustement_direct_source||0),part_interets:0,part_assurance:0,
    capital_avant:Number(ligne.capital_actuel||0),capital_apres:Number(ligne.capital_reference_apres_journal!=null?ligne.capital_reference_apres_journal:ligne.capital_reference||0),
    echeances_avant:Number(credit.echeances_restantes||0),echeances_apres:Number(credit.echeances_restantes||0),
    prochaine_echeance_avant:credit.prochaine_echeance||'',prochaine_echeance_apres:credit.prochaine_echeance||'',
    methode:'resynchronisation_source_'+String(ligne.source_reference||''),statut:'source_sync',version:CREDIT_AMORTIZATION_CATCHUP_APPLY_20260916_VERSION,date_traitement:new Date().toISOString()
  };
  ajouterJournalRattrapageCredit20260916_(row);return{ok:true,duplique:false,operation_id:operationId};
}

function journaliserOperationRattrapageCredit20260916_(ligne,operation,credit){
  const oid=String(operation.operation_id||''),journal=lireJournalAmortissementsCredits20260915_(),deja=journal.find(x=>String(x.operation_id||'')===oid&&String(x.statut||'')==='applique');
  if(deja)return{ok:true,duplique:true,operation_id:oid};
  const row={
    id:Utilities.getUuid(),credit_id:ligne.credit_id,credit_nom:ligne.credit,charge_fixe_id:String(operation.charge_fixe_id||''),operation_id:oid,
    date_operation:operation.date||'',montant_echeance:Number(operation.montant||0),part_capital:Number(operation.part_capital||0),part_interets:Number(operation.part_interets||0),part_assurance:Number(operation.part_assurance||0),
    capital_avant:Number(operation.capital_avant||0),capital_apres:Number(operation.capital_apres||0),echeances_avant:Number(credit.echeances_restantes||0),echeances_apres:Number(credit.echeances_restantes||0),
    prochaine_echeance_avant:credit.prochaine_echeance||'',prochaine_echeance_apres:credit.prochaine_echeance||'',methode:String(operation.methode||'')+'_rattrapage',statut:'applique',version:CREDIT_AMORTIZATION_CATCHUP_APPLY_20260916_VERSION,date_traitement:new Date().toISOString()
  };
  ajouterJournalRattrapageCredit20260916_(row);return{ok:true,duplique:false,operation_id:oid};
}

function auditerApplicationRattrapageAmortissementsCredits20260916(){
  const sim=simulerRattrapageAmortissementsCredits20260915(),cibles=(sim.credits||[]).filter(x=>x.application_automatique_autorisable&&Math.abs(Number(x.variation_nette_capital||0))>.009);
  const out={ok:true,version:CREDIT_AMORTIZATION_CATCHUP_APPLY_20260916_VERSION,lecture_seule:true,nombre:cibles.length,variation_nette_totale:Math.round(cibles.reduce((s,x)=>s+Number(x.variation_nette_capital||0),0)*100)/100,cibles:cibles.map(x=>({credit:x.credit,credit_id:x.credit_id,capital_actuel:x.capital_actuel,capital_final:x.capital_simule_apres,variation_nette_capital:x.variation_nette_capital,resynchronisation_source:x.resynchronisation_source,operations:x.operations_a_rattraper,source_reference:x.source_reference}))};
  console.log('[AUDIT APPLICATION RATTRAPAGE CREDITS 20260916] '+JSON.stringify(out));return out;
}

function appliquerRattrapageAmortissementsCredits20260916(){
  verifierInitialisation_();
  const lock=LockService.getDocumentLock();lock.waitLock(15000);let out;
  try{
    const sim=simulerRattrapageAmortissementsCredits20260915(),cibles=(sim.credits||[]).filter(x=>x.application_automatique_autorisable&&Math.abs(Number(x.variation_nette_capital||0))>.009),credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[],resultats=[];
    for(const ligne of cibles){
      const credit=credits.find(c=>String(c.id||'')===String(ligne.credit_id||''));
      if(!credit){resultats.push({credit:ligne.credit,ok:false,raison:'credit_introuvable'});continue;}
      const capitalLu=Math.round(Number(credit.capital_restant||0)*100)/100;
      if(Math.abs(capitalLu-Number(ligne.capital_actuel||0))>.01){resultats.push({credit:ligne.credit,ok:false,raison:'capital_modifie_depuis_simulation',capital_lu:capitalLu,capital_simulation:ligne.capital_actuel});continue;}
      const cible=Object.assign({},credit,{capital_restant:Number(ligne.capital_simule_apres||0)});
      if(typeof enregistrerCreditEtendu_==='function')enregistrerCreditEtendu_(cible);else enregistrerLigne('Credits',cible);
      const source=journaliserSourceRattrapageCredit20260916_(ligne,credit),ops=[];
      (ligne.operations||[]).forEach(op=>ops.push(journaliserOperationRattrapageCredit20260916_(ligne,op,credit)));
      resultats.push({credit:ligne.credit,ok:true,capital_avant:capitalLu,capital_apres:Number(ligne.capital_simule_apres||0),variation_nette_capital:Number(ligne.variation_nette_capital||0),source,operations:ops});
    }
    out={ok:resultats.every(x=>x.ok),version:CREDIT_AMORTIZATION_CATCHUP_APPLY_20260916_VERSION,nombre_cibles:cibles.length,nombre_appliquees:resultats.filter(x=>x.ok).length,variation_nette_totale:Math.round(resultats.filter(x=>x.ok).reduce((s,x)=>s+Number(x.variation_nette_capital||0),0)*100)/100,resultats};
  }finally{lock.releaseLock();}
  if(out&&out.nombre_appliquees&&typeof reconstruireSnapshotGlobalSyntheseBudgetSoft20260907==='function'){
    try{const s=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('rattrapage_credits_documente');out.snapshot={ok:!!(s&&s.ok),revisionBudgetSoft:String(s&&s.revisionBudgetSoft||''),message:String(s&&s.message||'')};}catch(e){out.snapshot={ok:false,erreur:String(e&&e.message||e)};}
  }
  console.log('[APPLICATION RATTRAPAGE CREDITS 20260916] '+JSON.stringify(out));return out;
}
