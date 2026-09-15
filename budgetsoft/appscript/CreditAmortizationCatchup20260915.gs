const CREDIT_AMORTIZATION_CATCHUP_20260915_VERSION='2026-09-15.1';

function dateFrRattrapageCredit20260915_(s){
  const m=String(s||'').match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);if(!m)return null;
  const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12);return isNaN(d)?null:d;
}

function dateReferenceCreditRattrapage20260915_(credit){
  const t=String(credit&&credit.commentaire||'');
  const motifs=[
    /capital\s+restant\s+d[uû].{0,40}apr[eè]s\s+l['’]?[ée]ch[ée]ance\s+du\s+(\d{1,2}\/\d{1,2}\/20\d{2})/i,
    /relev[ée].{0,24}arr[êe]t[ée]\s+au\s+(\d{1,2}\/\d{1,2}\/20\d{2})/i,
    /situation\s+communiqu[ée]e\s+le\s+(\d{1,2}\/\d{1,2}\/20\d{2})/i,
    /encours\s+utilis[ée]\s+au\s+(\d{1,2}\/\d{1,2}\/20\d{2})/i,
    /au\s+(\d{1,2}\/\d{1,2}\/20\d{2})/i
  ];
  for(const r of motifs){const m=t.match(r);if(m){const d=dateFrRattrapageCredit20260915_(m[1]);if(d)return d;}}
  return null;
}

function capitalReferenceCreditRattrapage20260915_(credit){
  const t=String(credit&&credit.commentaire||'');
  const motifs=[
    /capital\s+restant\s+d[uû][^:;]{0,80}:\s*([\d\s]+(?:[,.]\d+)?)\s*€/i,
    /encours\s+utilis[ée][^:;]{0,80}:\s*([\d\s]+(?:[,.]\d+)?)\s*€/i,
    /encours\s+restant\s+d[uû][^:;]{0,80}:\s*([\d\s]+(?:[,.]\d+)?)\s*€/i
  ];
  for(const r of motifs){const m=t.match(r);if(m)return Math.round(nombreCreditAmort20260915_(m[1])*100)/100;}
  return null;
}

function rapprochementsCreditsValidesRattrapage20260915_(){
  const ops=lireTable_('Operations'),opsParId=new Map(ops.map(o=>[String(o.id||''),o])),charges=lireTable_('Charges_fixes'),chargesParId=new Map(charges.map(c=>[String(c.id||''),c]));
  const journal=typeof lireJournalAmortissementsCredits20260915_==='function'?lireJournalAmortissementsCredits20260915_():[],deja=new Set(journal.filter(x=>String(x.statut)==='applique').map(x=>String(x.operation_id||'')));
  const vus=new Set(),out=[];
  const pousser=(chargeId,operationId,source)=>{
    const cid=String(chargeId||''),oid=String(operationId||'');if(!cid||!oid||vus.has(oid)||deja.has(oid))return;
    const charge=chargesParId.get(cid),operation=opsParId.get(oid);if(!charge||!operation)return;
    const d=new Date(operation.date_comptable||operation.date||operation.date_operation||0);if(isNaN(d))return;
    vus.add(oid);out.push({charge,operation,date:d,source});
  };
  if(typeof lireRapprochementsChargesFixes==='function'){
    (lireRapprochementsChargesFixes()||[]).filter(r=>String(r.statut||'').toLowerCase()==='validé'||String(r.statut||'').toLowerCase()==='valide').forEach(r=>pousser(r.charge_fixe_id,r.operation_id,'Rapprochements_charges_fixes'));
  }
  ops.forEach(o=>{const cid=String(o.charge_fixe_id||'').trim();if(cid)pousser(cid,o.id,'Operations.charge_fixe_id');});
  return out.sort((a,b)=>a.date-b.date);
}

function simulerRattrapageAmortissementsCredits20260915(){
  verifierInitialisation_();
  const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[],rappros=rapprochementsCreditsValidesRattrapage20260915_(),lignes=[];
  credits.forEach(credit=>{
    const refDate=dateReferenceCreditRattrapage20260915_(credit),refCapital=capitalReferenceCreditRattrapage20260915_(credit),capitalActuel=Math.round(Math.max(0,Number(credit.capital_restant||0))*100)/100;
    let confiance='insuffisante',raison='date_reference_absente';
    if(refDate){
      if(refCapital==null){confiance='moyenne';raison='date_reference_trouvee_sans_capital_reference_dans_commentaire';}
      else if(Math.abs(refCapital-capitalActuel)<=.01){confiance='haute';raison='date_et_capital_reference_concordent_avec_capital_actuel';}
      else{confiance='conflit';raison='capital_actuel_differe_du_capital_reference_commentaire';}
    }
    const virtuel=Object.assign({},credit),operations=[];
    const candidates=rappros.filter(r=>{
      const liaison=trouverCreditPourChargeFixe20260915_(r.charge,credits);return liaison.ok&&String(liaison.credit.id)===String(credit.id)&&refDate&&r.date>refDate;
    });
    candidates.forEach(r=>{
      const avant=Math.round(Math.max(0,Number(virtuel.capital_restant||0))*100)/100,calc=calculerAmortissementCredit20260915_(virtuel,r.operation);virtuel.capital_restant=calc.capitalApres;
      operations.push({operation_id:String(r.operation.id||''),charge_fixe_id:String(r.charge.id||''),date:r.date.toISOString(),montant:calc.montant,capital_avant:avant,part_capital:calc.partCapital,part_interets:calc.partInterets,part_assurance:calc.partAssurance,capital_apres:calc.capitalApres,methode:calc.methode,source_rapprochement:r.source});
    });
    lignes.push({credit_id:String(credit.id||''),credit:String(credit.nom||''),capital_actuel:capitalActuel,date_reference:refDate?Utilities.formatDate(refDate,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',capital_reference:refCapital,confiance,raison,operations_a_rattraper:operations.length,capital_a_deduire:Math.round(operations.reduce((s,x)=>s+Number(x.part_capital||0),0)*100)/100,capital_simule_apres:Math.round(Number(virtuel.capital_restant||0)*100)/100,application_automatique_autorisable:confiance==='haute',operations});
  });
  const out={ok:true,version:CREDIT_AMORTIZATION_CATCHUP_20260915_VERSION,lecture_seule:true,nombre_credits:lignes.length,nombre_operations:lignes.reduce((s,x)=>s+x.operations_a_rattraper,0),capital_total_a_deduire:Math.round(lignes.reduce((s,x)=>s+x.capital_a_deduire,0)*100)/100,credits:lignes};
  console.log('[SIMULATION RATTRAPAGE AMORTISSEMENTS CREDITS 20260915] '+JSON.stringify(out));return out;
}
