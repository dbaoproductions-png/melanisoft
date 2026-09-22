const BUDGETSOFT_REVENUE_PUBLICATION_FIX_20260912_VERSION='2026-09-22.2';

function arrRevenuePublicationFix20260912_(n){return Math.round(Number(n||0)*100)/100;}
function normRevenuePublicationFix20260912_(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function dateRevenuePublicationFix20260912_(v){const d=v instanceof Date?new Date(v):new Date(v||0);if(isNaN(d))return null;d.setHours(0,0,0,0);return d;}
function isoRevenuePublicationFix20260912_(v){const d=dateRevenuePublicationFix20260912_(v);return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';}
function evenementClosProuveRevenuePublicationFix20260912_(ev){
  if(!ev)return false;
  const s=normRevenuePublicationFix20260912_(ev.statut);
  if(['annule','annulee','abandonne','abandonnee'].includes(s))return true;
  if(String(ev.operation_reelle_id||'').trim())return true;
  const r=normRevenuePublicationFix20260912_(ev.rapprochement_statut||'');
  return ['rapproche','rapprochee','realise','realisee'].includes(r);
}
function occurrencesRecettesCertainesDuesRevenuePublicationFix20260922_(reference,debutCycle,finCycle){
  let evs=[];try{evs=lireFeuilleDynamiquePlan_('Plan_Evenements')||[];}catch(e){return[];}
  const ref=dateRevenuePublicationFix20260912_(reference||new Date()),fin=dateRevenuePublicationFix20260912_(finCycle);if(!ref||!fin)return[];
  const out=[];
  evs.forEach(function(ev){
    if(String(ev&&ev.type||'').trim().toLowerCase()!=='recette')return;
    if(evenementClosProuveRevenuePublicationFix20260912_(ev))return;
    const st=normRevenuePublicationFix20260912_(ev.statut);
    if(['annule','annulee','abandonne','abandonnee','rapproche','rapprochee'].includes(st))return;
    const cert=normRevenuePublicationFix20260912_(ev.certitude||'certaine');
    if(['incertaine','incertain','hypothetique'].includes(cert))return;
    let occ=[];
    try{occ=typeof occurrencesEvenementEtatBudgetSoft20260922_==='function'?occurrencesEvenementEtatBudgetSoft20260922_(ev):occurrencesEvenementV4_(ev).map(function(o){return Object.assign({},o,{rapprochee:false});});}catch(e){occ=[];}
    if(!occ.length){let d=null;try{const dr=datePlanTresorerie_(ev,ref,false);d=dr&&dr.date?dr.date:null;}catch(e){};if(!d)d=ev.date_effet||ev.date_prevue;occ=[{index:1,total:1,montant:Math.abs(Number(ev.montant||0)),date:d,rapprochee:false}];}
    occ.forEach(function(o){
      if(o&&o.rapprochee)return;
      const d=dateRevenuePublicationFix20260912_(o&&o.date);if(!d||d>fin)return;
      out.push({id:String(ev.id||''),eventId:String(ev.id||''),libelle:String(ev.libelle||''),categorie:String(ev.categorie||''),compte:String(ev.compte||''),statut:String(ev.statut||''),certitude:String(ev.certitude||''),occurrence:Number(o.index||1),occurrences:Number(o.total||1),montant:Math.abs(Number(o.montant||0)),date_effet:d,date_prevue:d});
    });
  });
  return out;
}

function evenementsRecettesCertainesDuesRevenuePublicationFix20260912_(reference,debutCycle,finCycle){
  const occ=occurrencesRecettesCertainesDuesRevenuePublicationFix20260922_(reference,debutCycle,finCycle),ids=new Set(),out=[];
  let evs=[];try{evs=lireFeuilleDynamiquePlan_('Plan_Evenements')||[];}catch(e){evs=[];}
  occ.forEach(function(o){const id=String(o&&o.eventId||'');if(!id||ids.has(id))return;ids.add(id);const ev=evs.find(function(x){return String(x&&x.id||'')===id;});if(ev)out.push(ev);});
  return out;
}

// Projection bancaire : responsabilité transférée à BudgetSoftTreasuryCanonical20260907.gs.

// Garde publique transférée à BudgetSoftRevenueSupradoctrineCanonicalGuard20260918.gs.
