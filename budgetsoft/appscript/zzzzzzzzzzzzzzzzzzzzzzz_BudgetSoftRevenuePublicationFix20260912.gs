const BUDGETSOFT_REVENUE_PUBLICATION_FIX_20260912_VERSION='2026-09-12.7';

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
    if(!['effective','effectif','effectives','effectifs','realise a rapprocher','realisee a rapprocher'].includes(st))return false;
    let d=null;try{const dr=datePlanTresorerie_(ev,ref,false);d=dr&&dr.date?dateRevenuePublicationFix20260912_(dr.date):null;}catch(e){}
    if(!d)d=dateRevenuePublicationFix20260912_(ev.date_effet||ev.date_prevue);
    return !!(d&&d<=fin);
  });
}

// Projection bancaire : responsabilité transférée à BudgetSoftTreasuryCanonical20260907.gs.

verifierSupradoctrineRecettesBudgetSoft20260912_=function(etat){
  const erreurs=[],m=etat&&etat.modules||{},dash=m.dashboard||{},ct=dash.courtTerme||{},cer=m.cerbere||{},proj=m.projectionEtendue||{},p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},periode=p&&(p.periode||p)||{};
  const revision=String(etat&&etat.revisionBudgetSoft||''),rt1=Number(v.rt1),pub=Number(ct.revenusAttendus);
  if(!Number.isFinite(rt1))erreurs.push({code:'SUPRA_RECETTES_RT1_ABSENT'});
  if(Number.isFinite(rt1)&&(!Number.isFinite(pub)||Math.abs(arrRevenuePublicationFix20260912_(rt1)-arrRevenuePublicationFix20260912_(pub))>.01))erreurs.push({code:'SUPRA_RECETTES_DASHBOARD_RT1',detail:{revisionBudgetSoft:revision||'(candidate)',cerbereRt1:arrRevenuePublicationFix20260912_(rt1),dashboard:arrRevenuePublicationFix20260912_(pub)}});
  const owner=String(proj&&proj.proprietaireBudgetSoft||proj&&proj.proprietaire||'');if(owner&&owner!=='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907')erreurs.push({code:'SUPRA_RECETTES_PROJECTION_OWNER',detail:{proprietaire:owner}});
  const reference=dateRevenuePublicationFix20260912_(proj.dateReference||ct.dateReference||new Date()),debut=dateRevenuePublicationFix20260912_(periode.debut),fin=dateRevenuePublicationFix20260912_(ct.fin||periode.fin||proj.dateCible),lignes=Array.isArray(proj.lignes)?proj.lignes:[],dus=evenementsRecettesCertainesDuesRevenuePublicationFix20260912_(reference,debut,fin),controles=[];
  dus.forEach(function(ev){const id=String(ev.id||''),couvert=lignes.some(function(l){const d=dateRevenuePublicationFix20260912_(l&&l.date);return String(l&&l.source||'')==='evenement'&&String(l&&l.sourceId||'')===id&&d&&d>reference&&(!fin||d<=fin)&&Number(l&&l.montantSigne||0)>0;});const c={id:id,libelle:String(ev.libelle||''),montant:Math.abs(Number(ev.montant||0)),statut:String(ev.statut||''),couvertFutur:couvert};controles.push(c);if(!couvert)erreurs.push({code:'SUPRA_EVENEMENT_CERTAIN_DU_DISPARU',detail:c});});
  return{ok:erreurs.length===0,version:BUDGETSOFT_REVENUE_PUBLICATION_FIX_20260912_VERSION,prepublication:!revision,doctrine:{proprietaireRecettesAttendues:'cerbere.periodes[0].v37.rt1',dashboard:'lecture stricte Rt1',comptes:'projectionEtendue canonique',preuveRealisation:'operation_reelle_id ou rapprochement confirme ; jamais date/statut seuls',principe:'une donnee, un proprietaire, un calcul, plusieurs consommateurs'},intermodule:{revisionBudgetSoft:revision||null,cerbereRt1:Number.isFinite(rt1)?arrRevenuePublicationFix20260912_(rt1):null,dashboardRevenusAttendus:Number.isFinite(pub)?arrRevenuePublicationFix20260912_(pub):null,projectionOwner:owner||null,projectionDateReference:reference?isoRevenuePublicationFix20260912_(reference):null},evenementsCertainsDus:controles,erreurs:erreurs,avertissements:[]};
};
