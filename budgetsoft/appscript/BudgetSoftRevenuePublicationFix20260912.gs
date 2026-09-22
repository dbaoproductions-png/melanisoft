const BUDGETSOFT_REVENUE_PUBLICATION_FIX_20260912_VERSION='2026-09-22.1';

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
function evenementsRecettesCertainesDuesRevenuePublicationFix20260912_(reference,debutCycle,finCycle){
  let evs=[];try{evs=lireFeuilleDynamiquePlan_('Plan_Evenements')||[];}catch(e){return[];}
  const ref=dateRevenuePublicationFix20260912_(reference||new Date()),fin=dateRevenuePublicationFix20260912_(finCycle);if(!ref||!fin)return[];
  return evs.filter(function(ev){
    if(String(ev&&ev.type||'').trim().toLowerCase()!=='recette')return false;
    if(evenementClosProuveRevenuePublicationFix20260912_(ev))return false;
    const st=normRevenuePublicationFix20260912_(ev.statut);
    if(['annule','annulee','abandonne','abandonnee','rapproche','rapprochee'].includes(st))return false;
    const cert=normRevenuePublicationFix20260912_(ev.certitude||'certaine');
    if(['incertaine','incertain','hypothetique'].includes(cert))return false;
    let d=null;try{const dr=datePlanTresorerie_(ev,ref,false);d=dr&&dr.date?dateRevenuePublicationFix20260912_(dr.date):null;}catch(e){}
    if(!d)d=dateRevenuePublicationFix20260912_(ev.date_effet||ev.date_prevue);
    return !!(d&&d<=fin);
  });
}

// Projection bancaire : responsabilité transférée à BudgetSoftTreasuryCanonical20260907.gs.

// Garde publique transférée à BudgetSoftRevenueSupradoctrineCanonicalGuard20260918.gs.
