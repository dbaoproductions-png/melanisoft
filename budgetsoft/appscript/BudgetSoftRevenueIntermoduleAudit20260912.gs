const BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION='2026-09-12.2';

function arrRevenueFinal20260912_(n){return Math.round(Number(n||0)*100)/100;}
function normRevenueFinal20260912_(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function dateRevenueFinal20260912_(v){const d=v instanceof Date?new Date(v):new Date(v||0);if(isNaN(d))return null;d.setHours(0,0,0,0);return d;}
function isoRevenueFinal20260912_(v){const d=dateRevenueFinal20260912_(v);return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';}
function evenementClosProuveRevenueFinal20260912_(ev){
  if(!ev)return false;
  const statut=normRevenueFinal20260912_(ev.statut);
  if(['annule','annulee','abandonne','abandonnee'].includes(statut))return true;
  if(String(ev.operation_reelle_id||'').trim())return true;
  const rap=normRevenueFinal20260912_(ev.rapprochement_statut||'');
  return ['rapproche','rapprochee','realise','realisee'].includes(rap);
}
function evenementCertainEncoreDuRevenueFinal20260912_(ev){
  if(!ev||String(ev.type||'').trim().toLowerCase()!=='recette'||evenementClosProuveRevenueFinal20260912_(ev))return false;
  const s=normRevenueFinal20260912_(ev.statut);
  return ['effectif','effective','effectifs','effectives','realise a rapprocher','realisee a rapprocher'].includes(s);
}
function dateEvenementRevenueFinal20260912_(ev,reference){
  try{const dr=typeof datePlanTresorerie_==='function'?datePlanTresorerie_(ev,reference||new Date(),false):null;if(dr&&dr.date)return dateRevenueFinal20260912_(dr.date);}catch(e){}
  return dateRevenueFinal20260912_(ev&&(ev.date_effet||ev.date_prevue));
}
function evenementsCertainsDusCycleRevenueFinal20260912_(periode,reference){
  const debut=dateRevenueFinal20260912_(periode&&periode.debut),fin=dateRevenueFinal20260912_(periode&&periode.fin);if(!debut||!fin)return[];
  let evs=[];try{evs=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):[];}catch(e){return[];}
  return (evs||[]).filter(function(ev){if(!evenementCertainEncoreDuRevenueFinal20260912_(ev))return false;const d=dateEvenementRevenueFinal20260912_(ev,reference);return d&&d>=debut&&d<=fin;});
}

/* Propriété Rt1 transférée à CerbereRevenueDueOwner20260919.gs ; aucun override du lecteur historique. */

/* Projection bancaire : responsabilité transférée à BudgetSoftTreasuryCanonical20260907.gs. */

/* Dashboard : responsabilité transférée à BudgetSoftDashboardCanonicalOwner20260918.gs. */

/* Garde recettes transférée à BudgetSoftRevenueSupradoctrineCanonicalGuard20260918.gs. */

function auditerRecettesIntermodulesBudgetSoft20260912(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();if(!s||!s.disponible){const x={ok:false,version:BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION,erreur:'Snapshot global indisponible.'};console.log('[AUDIT recettes intermodules] '+JSON.stringify(x));return x;}
  const etat=s.etat||{},m=etat.modules||{},cer=m.cerbere||{},p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},periode=p&&(p.periode||p)||{},garde=verifierSupradoctrineRecettesBudgetSoft20260912_(etat),cible=periode.fin||new Date();
  let unite={ok:false};try{const comptes=chargerTresorerieUnifieeBudgetSoft20260907(cible),banque=chargerTrajectoireBanqueCerbereRapide20260903(cible,cer),ref=dateRevenueFinal20260912_(comptes&&comptes.dateReference||new Date()),fin=dateRevenueFinal20260912_(cible);const filtrer=function(xs){return(xs||[]).filter(function(l){const d=dateRevenueFinal20260912_(l&&l.date);return d&&d>ref&&d<=fin;});};const sig=function(xs){return filtrer(xs).map(function(l){return[isoRevenueFinal20260912_(l&&l.date),String(l&&l.source||''),String(l&&l.sourceId||''),arrRevenueFinal20260912_(l&&l.montantSigne)].join('|');}).sort();};const a=sig(comptes&&comptes.lignes),b=sig(banque&&banque.lignes);unite={ok:String(comptes&&comptes.revisionBudgetSoft||'')===String(etat.revisionBudgetSoft||'')&&String(banque&&banque.revisionBudgetSoft||'')===String(etat.revisionBudgetSoft||'')&&JSON.stringify(a)===JSON.stringify(b),revisionComptes:String(comptes&&comptes.revisionBudgetSoft||''),revisionCerbere:String(banque&&banque.revisionBudgetSoft||''),nombreLignesComptes:a.length,nombreLignesCerbere:b.length,proprietaireComptes:String(comptes&&comptes.proprietaireBudgetSoft||''),sourceCerbere:String(banque&&banque.sourceBudgetSoft||'')};}catch(e){unite={ok:false,erreur:String(e&&e.message||e)};}
  const out={ok:garde.ok===true&&unite.ok===true,version:BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION,revisionBudgetSoft:String(etat.revisionBudgetSoft||''),cerbereRt1:arrRevenueFinal20260912_(v.rt1),dashboardRevenusAttendus:arrRevenueFinal20260912_(m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.revenusAttendus),gardePublication:garde,uniteProjectionComptesCerbere:unite};console.log('[AUDIT recettes intermodules] '+JSON.stringify(out));return out;
}
