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


function auditerDoctrineRecettesPlanIntermodule20260922(){
  const arr=function(n){return Math.round(Number(n||0)*100)/100;};
  const etat=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
  if(!etat||!etat.modules){
    const out={ok:false,version:'2026-09-22.1',lectureSeule:true,erreur:'Snapshot global indisponible.'};
    console.log('[AUDIT DOCTRINE RECETTES PLAN INTERMODULE 20260922] '+JSON.stringify(out));return out;
  }
  const m=etat.modules||{},dash=m.dashboard||{},ct=dash.courtTerme||{},cer=m.cerbere||{},proj=m.projectionEtendue||{},p0=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p0&&p0.v37||{},periode=p0&&(p0.periode||p0)||{};
  const debut=new Date(periode.debut||0),fin=new Date(periode.fin||0),reference=new Date(proj.dateReference||etat.genereLe||new Date());
  let evs=[];try{evs=lireFeuilleDynamiquePlan_('Plan_Evenements')||[];}catch(e){evs=[];}
  const detailDus=[];let totalDu=0;
  evs.forEach(function(ev){
    if(String(ev&&ev.type||'').trim().toLowerCase()!=='recette')return;
    if(typeof evenementClosProuveRevenuePublicationFix20260912_==='function'&&evenementClosProuveRevenuePublicationFix20260912_(ev))return;
    const cert=String(ev&&ev.certitude||'certaine').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(['incertaine','incertain','hypothetique'].includes(cert))return;
    let occs=[];
    try{occs=typeof occurrencesEvenementV4_==='function'?occurrencesEvenementV4_(ev):[];}catch(e){occs=[];}
    if(!occs.length){
      const d=new Date(ev&&ev.date_effet||ev&&ev.date_prevue||0);
      occs=[{index:1,total:1,montant:Math.abs(Number(ev&&ev.montant||0)),date:isNaN(d)?'':d}];
    }
    occs.forEach(function(o){
      const d=new Date(o&&o.date||0);if(isNaN(d)||isNaN(fin)||d>fin)return;
      const montant=Math.abs(Number(o&&o.montant||0));if(!(montant>0))return;
      totalDu+=montant;detailDus.push({eventId:String(ev.id||''),libelle:String(ev.libelle||''),occurrence:Number(o.index||1),montant:arr(montant),datePrevue:Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'),enRetard:!isNaN(reference)&&d<=reference});
    });
  });
  totalDu=arr(totalDu);

  const revenusConstates=arr(ct.revenusConstates),revenusAttendus=arr(ct.revenusAttendus),resteDashboard=arr(revenusAttendus-revenusConstates),rt1=arr(v.rt1);
  const lignes=Array.isArray(proj.lignes)?proj.lignes:[];
  const lignesR0Courant=lignes.filter(function(l){if(String(l&&l.source||'')!=='revenu_recurrent')return false;const d=new Date(l&&l.date||0);return !isNaN(d)&&!isNaN(reference)&&!isNaN(fin)&&d>reference&&d<=fin;});
  const lignesEvenementsCourant=lignes.filter(function(l){if(String(l&&l.source||'')!=='evenement'||Number(l&&l.montantSigne||0)<=0)return false;const d=new Date(l&&l.date||0);return !isNaN(d)&&!isNaN(reference)&&!isNaN(fin)&&d>reference&&d<=fin;});
  const totalEvenementsProjection=arr(lignesEvenementsCourant.reduce(function(s,l){return s+Number(l&&l.montantSigne||0);},0));

  const controles=[
    {code:'DASHBOARD_RESTE_EGAL_PLAN_DU',ok:Math.abs(resteDashboard-totalDu)<=0.01,detail:{revenusConstates:revenusConstates,revenusAttendus:revenusAttendus,resteDashboard:resteDashboard,totalPlanDu:totalDu}},
    {code:'RT1_EGAL_DASHBOARD',ok:Math.abs(rt1-revenusAttendus)<=0.01,detail:{rt1:rt1,dashboard:revenusAttendus}},
    {code:'AUCUN_R0_IMPLICITE_CYCLE_COURANT',ok:lignesR0Courant.length===0,detail:{nombre:lignesR0Courant.length,lignes:lignesR0Courant.map(function(x){return{sourceId:x.sourceId,date:x.date,montant:x.montantSigne};})}},
    {code:'PROJECTION_PLAN_DU_COHERENTE',ok:Math.abs(totalEvenementsProjection-totalDu)<=0.01,detail:{projectionEvenements:totalEvenementsProjection,totalPlanDu:totalDu,lignes:lignesEvenementsCourant.map(function(x){return{sourceId:x.sourceId,date:x.date,montant:x.montantSigne,enRetard:!!x.enRetard};})}}
  ];
  const out={ok:controles.every(function(x){return x.ok;}),version:'2026-09-22.1',lectureSeule:true,revisionBudgetSoft:String(etat.revisionBudgetSoft||''),genereLe:String(etat.genereLe||''),periode:{debut:periode.debut||'',fin:periode.fin||'',dateReference:proj.dateReference||''},recettes:{revenusConstates:revenusConstates,revenusAttendus:revenusAttendus,resteDashboard:resteDashboard,totalPlanDu:totalDu,detailDus:detailDus},controles:controles};
  console.log('[AUDIT DOCTRINE RECETTES PLAN INTERMODULE 20260922] '+JSON.stringify(out));return out;
}
