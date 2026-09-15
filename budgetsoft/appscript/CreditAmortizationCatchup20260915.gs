const CREDIT_AMORTIZATION_CATCHUP_20260915_VERSION='2026-09-15.6';

function dateFrRattrapageCredit20260915_(s){
  const m=String(s||'').match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);if(!m)return null;
  const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12);return isNaN(d)?null:d;
}

function dateIsoRattrapageCredit20260915_(s){
  const m=String(s||'').match(/^(20\d{2})-(\d{2})-(\d{2})$/);if(!m)return null;
  const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);return isNaN(d)?null:d;
}

function referenceContractuelleCreditRattrapage20260915_(credit){
  if(typeof estCreditCasdenEcheancier20260915_==='function'&&estCreditCasdenEcheancier20260915_(credit))return{date:dateIsoRattrapageCredit20260915_('2026-08-04'),capital:40562.30,source:'echeancier_exact_CASDEN'};
  if(typeof estCreditAccessio20260915_==='function'&&estCreditAccessio20260915_(credit))return{date:dateIsoRattrapageCredit20260915_('2026-08-21'),capital:800.00,source:'releve_exact_ACCESSIO'};
  if(typeof referenceSiteCofidis20260915_==='function'){const c=referenceSiteCofidis20260915_(credit);if(c)return{date:dateIsoRattrapageCredit20260915_(c.date),capital:Number(c.capital),source:c.source};}
  if(typeof referenceReleveCarrefourPass20260915_==='function'){const c=referenceReleveCarrefourPass20260915_(credit);if(c)return{date:dateIsoRattrapageCredit20260915_(c.date),capital:Number(c.capital),source:c.source};}
  return null;
}

function dateReferenceCreditRattrapage20260915_(credit){
  const contractuelle=referenceContractuelleCreditRattrapage20260915_(credit);if(contractuelle&&contractuelle.date)return contractuelle.date;
  const t=String(credit&&credit.commentaire||'');
  const motifs=[/capital\s+restant\s+d[uû].{0,40}apr[eè]s\s+l['’]?[ée]ch[ée]ance\s+du\s+(\d{1,2}\/\d{1,2}\/20\d{2})/i,/relev[ée].{0,24}arr[êe]t[ée]\s+au\s+(\d{1,2}\/\d{1,2}\/20\d{2})/i,/situation\s+communiqu[ée]e\s+le\s+(\d{1,2}\/\d{1,2}\/20\d{2})/i,/encours\s+utilis[ée]\s+au\s+(\d{1,2}\/\d{1,2}\/20\d{2})/i,/au\s+(\d{1,2}\/\d{1,2}\/20\d{2})/i];
  for(const r of motifs){const m=t.match(r);if(m){const d=dateFrRattrapageCredit20260915_(m[1]);if(d)return d;}}return null;
}

function capitalReferenceCreditRattrapage20260915_(credit){
  const contractuelle=referenceContractuelleCreditRattrapage20260915_(credit);if(contractuelle&&contractuelle.capital!=null)return contractuelle.capital;
  const t=String(credit&&credit.commentaire||'');
  const motifs=[/capital\s+restant\s+d[uû][^:;]{0,80}:\s*([\d\s]+(?:[,.]\d+)?)\s*€/i,/encours\s+utilis[ée][^:;]{0,80}:\s*([\d\s]+(?:[,.]\d+)?)\s*€/i,/encours\s+restant\s+d[uû][^:;]{0,80}:\s*([\d\s]+(?:[,.]\d+)?)\s*€/i];
  for(const r of motifs){const m=t.match(r);if(m)return Math.round(nombreCreditAmort20260915_(m[1])*100)/100;}return null;
}

function sourceReferenceCreditRattrapage20260915_(credit){const c=referenceContractuelleCreditRattrapage20260915_(credit);return c?c.source:'commentaire_credit';}

function datesSuspenduesCreditRattrapage20260915_(credit){
  const t=String(credit&&credit.commentaire||''),dates=[];
  const segments=t.split(/[.;]/).filter(s=>/suspend|report/i.test(s));
  segments.forEach(s=>{const re=/(\d{1,2}\/\d{1,2}\/20\d{2})/g;let m;while((m=re.exec(s))){const d=dateFrRattrapageCredit20260915_(m[1]);if(d)dates.push(d);}});
  return dates;
}
function operationSurDateSuspendueCreditRattrapage20260915_(credit,date){return datesSuspenduesCreditRattrapage20260915_(credit).some(d=>d.getFullYear()===date.getFullYear()&&d.getMonth()===date.getMonth()&&d.getDate()===date.getDate());}
function montantCompatibleEcheanceCreditRattrapage20260915_(credit,operation){
  const mens=Math.abs(Number(credit&&credit.mensualite||0)),montant=Math.abs(Number(operation&&operation.montant||0));if(!mens||!montant)return true;
  const tolerance=Math.max(10,mens*.15);return Math.abs(montant-mens)<=tolerance;
}
function methodeDocumenteeRattrapage20260915_(methode){return /^(echeancier_exact_|releve_exact_|ventilation_explicite_commentaire_datee|contrat_COFIDIS_)/.test(String(methode||''));}

function rapprochementsCreditsValidesRattrapage20260915_(){
  const ops=lireTable_('Operations'),opsParId=new Map(ops.map(o=>[String(o.id||''),o])),charges=lireTable_('Charges_fixes'),chargesParId=new Map(charges.map(c=>[String(c.id||''),c]));
  const journal=typeof lireJournalAmortissementsCredits20260915_==='function'?lireJournalAmortissementsCredits20260915_():[],deja=new Set(journal.filter(x=>String(x.statut)==='applique').map(x=>String(x.operation_id||''))),vus=new Set(),out=[];
  const pousser=(chargeId,operationId,source)=>{const cid=String(chargeId||''),oid=String(operationId||'');if(!cid||!oid||vus.has(oid)||deja.has(oid))return;const charge=chargesParId.get(cid),operation=opsParId.get(oid);if(!charge||!operation)return;const d=new Date(operation.date_comptable||operation.date||operation.date_operation||0);if(isNaN(d))return;vus.add(oid);out.push({charge,operation,date:d,source});};
  if(typeof lireRapprochementsChargesFixes==='function')(lireRapprochementsChargesFixes()||[]).filter(r=>['validé','valide'].includes(String(r.statut||'').toLowerCase())).forEach(r=>pousser(r.charge_fixe_id,r.operation_id,'Rapprochements_charges_fixes'));
  ops.forEach(o=>{const cid=String(o.charge_fixe_id||'').trim();if(cid)pousser(cid,o.id,'Operations.charge_fixe_id');});return out.sort((a,b)=>a.date-b.date);
}

function simulerRattrapageAmortissementsCredits20260915(){
  verifierInitialisation_();
  const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[],rappros=rapprochementsCreditsValidesRattrapage20260915_(),lignes=[];
  credits.forEach(credit=>{
    const refDate=dateReferenceCreditRattrapage20260915_(credit),refCapital=capitalReferenceCreditRattrapage20260915_(credit),sourceReference=sourceReferenceCreditRattrapage20260915_(credit),capitalActuel=Math.round(Math.max(0,Number(credit.capital_restant||0))*100)/100;
    let confiance='insuffisante',raison='date_reference_absente',resynchronisationSource=false,ajustementDirectSource=0;
    if(refDate){
      if(refCapital==null){confiance='moyenne';raison='date_reference_trouvee_sans_capital_reference_dans_commentaire';}
      else if(Math.abs(refCapital-capitalActuel)<=.01){confiance='haute';raison=sourceReference==='commentaire_credit'?'date_et_capital_reference_concordent_avec_capital_actuel':'reference_documentaire_exacte_concordante';}
      else if(sourceReference==='site_COFIDIS_2026-09-15'){confiance='haute';raison='reference_site_plus_recente_a_resynchroniser';resynchronisationSource=true;ajustementDirectSource=Math.round((capitalActuel-refCapital)*100)/100;}
      else{confiance='conflit';raison='capital_actuel_differe_du_capital_reference';}
    }
    const virtuel=Object.assign({},credit),operations=[],exclues=[];
    if(confiance==='haute'&&refCapital!=null)virtuel.capital_restant=refCapital;
    const candidates=rappros.filter(r=>{const liaison=trouverCreditPourChargeFixe20260915_(r.charge,credits);return liaison.ok&&String(liaison.credit.id)===String(credit.id)&&refDate&&r.date>refDate;});
    candidates.forEach(r=>{
      if(operationSurDateSuspendueCreditRattrapage20260915_(credit,r.date)){exclues.push({operation_id:String(r.operation.id||''),date:r.date.toISOString(),montant:Math.abs(Number(r.operation.montant||0)),raison:'date_suspendue_ou_reportee'});return;}
      if(!montantCompatibleEcheanceCreditRattrapage20260915_(credit,r.operation)){exclues.push({operation_id:String(r.operation.id||''),date:r.date.toISOString(),montant:Math.abs(Number(r.operation.montant||0)),raison:'montant_incompatible_avec_mensualite'});return;}
      const avant=Math.round(Math.max(0,Number(virtuel.capital_restant||0))*100)/100,calc=calculerAmortissementCredit20260915_(virtuel,r.operation),documentee=methodeDocumenteeRattrapage20260915_(calc.methode);virtuel.capital_restant=calc.capitalApres;
      operations.push({operation_id:String(r.operation.id||''),charge_fixe_id:String(r.charge.id||''),date:r.date.toISOString(),montant:calc.montant,capital_avant:avant,part_capital:calc.partCapital,part_interets:calc.partInterets,part_assurance:calc.partAssurance,capital_apres:calc.capitalApres,methode:calc.methode,ventilation_documentee:documentee,source_rapprochement:r.source});
    });
    const operationsDocumentees=operations.filter(x=>x.ventilation_documentee),operationsEstimees=operations.filter(x=>!x.ventilation_documentee),capitalDocumente=Math.round(operationsDocumentees.reduce((s,x)=>s+Number(x.part_capital||0),0)*100)/100;
    const applicationAutorisee=confiance==='haute'&&exclues.length===0&&operationsEstimees.length===0;
    const capitalOperations=Math.round(operations.reduce((s,x)=>s+Number(x.part_capital||0),0)*100)/100;
    lignes.push({credit_id:String(credit.id||''),credit:String(credit.nom||''),capital_actuel:capitalActuel,date_reference:refDate?Utilities.formatDate(refDate,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',capital_reference:refCapital,source_reference:sourceReference,confiance,raison,resynchronisation_source:resynchronisationSource,ajustement_direct_source:ajustementDirectSource,operations_a_rattraper:operations.length,operations_documentees:operationsDocumentees.length,operations_estimees:operationsEstimees.length,operations_exclues:exclues.length,capital_a_deduire:capitalOperations,capital_documente_a_deduire:capitalDocumente,capital_simule_apres:Math.round(Number(virtuel.capital_restant||0)*100)/100,application_automatique_autorisable:applicationAutorisee,operations,exclues});
  });
  const autorisables=lignes.filter(x=>x.application_automatique_autorisable),out={ok:true,version:CREDIT_AMORTIZATION_CATCHUP_20260915_VERSION,lecture_seule:true,nombre_credits:lignes.length,nombre_operations:lignes.reduce((s,x)=>s+x.operations_a_rattraper,0),nombre_operations_documentees:lignes.reduce((s,x)=>s+x.operations_documentees,0),nombre_operations_estimees:lignes.reduce((s,x)=>s+x.operations_estimees,0),nombre_operations_exclues:lignes.reduce((s,x)=>s+x.operations_exclues,0),capital_total_a_deduire:Math.round(lignes.reduce((s,x)=>s+x.capital_a_deduire+Math.max(0,Number(x.ajustement_direct_source||0)),0)*100)/100,capital_total_documente:Math.round(lignes.reduce((s,x)=>s+x.capital_documente_a_deduire+Math.max(0,Number(x.ajustement_direct_source||0)),0)*100)/100,capital_total_autorisable:Math.round(autorisables.reduce((s,x)=>s+x.capital_a_deduire+Math.max(0,Number(x.ajustement_direct_source||0)),0)*100)/100,credits:lignes};
  console.log('[SIMULATION RATTRAPAGE AMORTISSEMENTS CREDITS 20260915] '+JSON.stringify(out));return out;
}
