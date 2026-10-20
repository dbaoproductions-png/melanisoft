/**
 * Pont en lecture seule entre rapprochements historiques et occurrences.
 * Demarrage controle : ne jamais reconstruire des dettes sur l'historique.
 * L'identite d'une occurrence ne peut etre inferee du seul mois de paiement
 * que s'il existe UNE candidate et UNE operation valide, non reutilisee.
 */
function auditerAttributionOccurrencesChargesFixes20261020(){
 const dateDepart='2026-10-20',dateFin='2026-11-27';
 const charges=(lireTable_('Charges_fixes')||[]).filter(c=>convertirBooleen_(c.actif));
 const operations=lireTable_('Operations')||[];
 const rappro=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes()||[]:[];
 const ajustements=typeof lireAjustementsChargesFixes==='function'?lireAjustementsChargesFixes()||[]:[];
 const opMap={};operations.forEach(o=>{opMap[String(o.id||'')]=o;});
 const valider=r=>String(r.statut||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='valide';
 const fmt=d=>Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
 const jour=x=>{const d=typeof dateLocaleBudgetSoft_==='function'?dateLocaleBudgetSoft_(x):new Date(x);return d instanceof Date&&!isNaN(d.getTime())?fmt(d):'';};
 const preuveDateOp=o=>jour(o&&(o.date_comptable||o.date));
 const ligneSortie=[],anomalies=[],stats={chargesActives:charges.length,
   rapprochementsValides:rappro.filter(valider).length,
   candidates:0,associationsCertaines:0,ambigues:0,sansPreuve:0,preuvesSansDateOccurrence:0};
 const rapproValides=rappro.filter(valider);
 const cleOpUtilisee=new Set();
 const idChargeUnique=new Set();
 charges.forEach(charge=>{
  const id=String(charge.id||'');
  if(!id||idChargeUnique.has(id)){anomalies.push({chargeId:id,motif:'charge_id_invalide_ou_duplique'});return;}
  idChargeUnique.add(id);
  const dDebut=new Date(dateDepart+'T12:00:00'),dFin=new Date(dateFin+'T12:00:00');
  const bornes=charge.date_debut?dateLocaleBudgetSoft_(charge.date_debut):dDebut;
  const start=new Date(Math.max(dDebut.getTime(),bornes.getTime()));
  let echeances=[];
  try{echeances=calculerEcheancesChargeFixeAjustees_(charge,start,charge.date_fin?dateLocaleBudgetSoft_(charge.date_fin):null,dFin,ajustements)||[];}
  catch(e){anomalies.push({chargeId:id,motif:'generation_impossible',detail:String(e)});return;}
  const liens=rapproValides.filter(r=>String(r.charge_fixe_id||'')===id)
    .map(r=>({rappro:r,op:opMap[String(r.operation_id||'')]}))
    .filter(z=>z.op&&preuveDateOp(z.op)>=dateDepart&&preuveDateOp(z.op)<=dateFin);
  echeances.forEach(e=>{
   const origine=jour(e.date),montant=Math.abs(Number(e.montant||0));
   if(!origine||!(montant>0))return;
   stats.candidates++;
   // Une echeance ne correspond qu'a un paiement date de +/- 7 jours ;
   // ceci est une candidature, jamais une preuve suffisante en soi.
   const correspondants=liens.filter(z=>{
    const d=preuveDateOp(z.op);if(!d||Math.abs((new Date(d+'T12:00:00')-new Date(origine+'T12:00:00'))/86400000)>7)return false;
    const m=Math.abs(Number(z.op.montant||0)),tol=Math.max(1,montant*.05);
    return Math.abs(m-montant)<=tol;
   });
   let decision='sans_preuve',operationId='';
   if(correspondants.length===1){
     const candidate=correspondants[0],opId=String(candidate.op.id||'');
     const voisins=echeances.filter(autre=>Math.abs((new Date(jour(autre.date)+'T12:00:00')-new Date(preuveDateOp(candidate.op)+'T12:00:00'))/86400000)<=7&&Math.abs(Math.abs(Number(autre.montant||0))-Math.abs(Number(candidate.op.montant||0)))<=Math.max(1,Math.abs(Number(autre.montant||0))*.05));
     if(voisins.length===1&&!cleOpUtilisee.has(opId)){decision='candidat_unique_a_confirmer';operationId=opId;cleOpUtilisee.add(opId);stats.associationsCertaines++;}
     else decision='ambigue';
   }else if(correspondants.length>1)decision='ambigue';
   if(decision==='ambigue')stats.ambigues++;
   if(decision==='sans_preuve')stats.sansPreuve++;
   ligneSortie.push({chargeId:id,libelle:String(charge.libelle||''),origine,montant,
     decision,operationId,candidats:correspondants.length});
  });
 });
 stats.preuvesSansDateOccurrence=rapproValides.filter(r=>!r.occurrence_date&&!r.date_echeance_origine).length;
 const exemple=ligneSortie.filter(x=>x.decision!=='sans_preuve').slice(0,12);
 const copro=ligneSortie.filter(x=>x.chargeId==='d476505c-189d-48a3-9eb1-51467df7fbc1');
 const r={ok:anomalies.length===0,lectureSeule:true,version:'2026-10-20.2',
  fenetre:{debut:dateDepart,fin:dateFin},stats,anomalies:anomalies.slice(0,10),copro,
  exemples:exemple,
  garde:'Candidat unique n est PAS un paiement confirme. Aucune ligne sans preuve n est automatiquement declaree impayee. Aucun historique anterieur a la date de depart n est reporte.'};
 console.log('[AUDIT ATTRIBUTION OCCURRENCES CF] '+JSON.stringify(r));return r;
}
