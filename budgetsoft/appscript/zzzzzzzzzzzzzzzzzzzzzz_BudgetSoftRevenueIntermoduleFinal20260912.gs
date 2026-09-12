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

/* PROPRIETAIRE METIER : Cerbere Rt1. Une date ou un statut declaratif ne prouve jamais l'encaissement. */
var chargerCerbereCockpitAvantRevenueFinal20260912_=chargerCerbereCockpit20260902;
chargerCerbereCockpit20260902=function(){
  const base=chargerCerbereCockpitAvantRevenueFinal20260912_();if(!base||base.ok===false)return base;
  const periodes=Array.isArray(base.periodes)?base.periodes:[],reference=new Date();
  periodes.forEach(function(p,i){
    if(!p||typeof p!=='object')return;const v=p.v37||(p.v37={}),periode=p.periode||p;
    const dus=evenementsCertainsDusCycleRevenueFinal20260912_(periode,reference);
    const deja=new Set((Array.isArray(v.actionsEvenementsCycle)?v.actionsEvenementsCycle:[]).filter(function(x){return x&&x.realise===false&&String(x.source||'')==='Événement'&&Number(x.montantSigne||0)>0;}).map(function(x){return String(x.id||'');}));
    const ajoutes=dus.filter(function(ev){return !deja.has(String(ev.id||''));});
    const delta=arrRevenueFinal20260912_(ajoutes.reduce(function(s,ev){return s+Math.abs(Number(ev.montant||0));},0));
    if(delta>0){
      v.rt1=arrRevenueFinal20260912_(Number(v.rt1||0)+delta);
      v.rt1Audit=v.rt1Audit&&typeof v.rt1Audit==='object'?v.rt1Audit:{};
      v.rt1Audit.evenementsCertainsDusSansPreuve=arrRevenueFinal20260912_(Number(v.rt1Audit.evenementsCertainsDusSansPreuve||0)+delta);
      v.rt1Audit.evenementsCertainsDusSansPreuveDetail=ajoutes.map(function(ev){return{id:String(ev.id||''),libelle:String(ev.libelle||''),montant:Math.abs(Number(ev.montant||0)),datePrevue:isoRevenueFinal20260912_(dateEvenementRevenueFinal20260912_(ev,reference)),statut:String(ev.statut||'')};});
      const dt1=Number(v.dt1||0);v.sct1=arrRevenueFinal20260912_(Number(v.ss1||0)+Number(v.rt1||0)-dt1);v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
      p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
      try{if(typeof enrichirCycleCockpitCerbere20260902_==='function')enrichirCycleCockpitCerbere20260902_(p,i);}catch(e){}
    }
  });
  base.versionRevenueIntermodule=BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION;
  return base;
};

/* PROPRIETAIRE BANCAIRE : projectionEtendue canonique. Injecte le meme flux encore du si absent du futur. */
var construireTrajectoireAvantRevenueFinal20260912_=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907;
construireTrajectoireTresorerieCanoniqueBudgetSoft20260907=function(cible){
  const r=construireTrajectoireAvantRevenueFinal20260912_(cible);if(!r||r.ok===false)return r;
  const reference=dateRevenueFinal20260912_(r.dateReference||new Date()),fin=dateRevenueFinal20260912_(cible||r.dateCible);if(!reference||!fin)return r;
  const periode={debut:typeof dateDebutCycleCanonBudgetSoft20260906_==='function'?dateDebutCycleCanonBudgetSoft20260906_(reference):new Date(reference.getFullYear(),reference.getMonth(),28),fin:typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(reference):fin};
  const dus=evenementsCertainsDusCycleRevenueFinal20260912_(periode,reference),lignes=Array.isArray(r.lignes)?r.lignes:[];
  const report=new Date(reference);report.setDate(report.getDate()+1);report.setHours(12,0,0,0);
  dus.forEach(function(ev){
    const id=String(ev.id||''),montant=Math.abs(Number(ev.montant||0));if(!montant)return;
    const dejaFutur=lignes.some(function(l){const d=dateRevenueFinal20260912_(l&&l.date);return String(l&&l.source||'')==='evenement'&&String(l&&l.sourceId||'')===id&&d&&d>reference&&d<=fin&&Number(l&&l.montantSigne||0)>0;});
    if(dejaFutur)return;
    const origine=dateEvenementRevenueFinal20260912_(ev,reference),d=origine&&origine>reference?origine:report;if(d>fin)return;
    lignes.push({id:'event:'+id+':du-sans-preuve',source:'evenement',sourceId:id,date:new Date(d).toISOString(),libelle:String(ev.libelle||'Événement'),categorie:String(ev.categorie||''),compte:String(ev.compte||''),montantSigne:arrRevenueFinal20260912_(montant),certitude:'certaine',preuve:'Événement certain encore dû · aucune opération réelle/rapprochement · date prévue '+isoRevenueFinal20260912_(origine),enRetard:!!(origine&&origine<=reference),datePrevueOrigine:isoRevenueFinal20260912_(origine)});
  });
  r.lignes=lignes;r.proprietaireBudgetSoft='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907';r.versionRevenueIntermodule=BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION;
  if(Number.isFinite(Number(r.soldeReel))){const net=lignes.filter(function(l){const d=dateRevenueFinal20260912_(l&&l.date);return d&&d>reference&&d<=fin;}).reduce(function(s,l){return s+Number(l&&l.montantSigne||0);},0);r.soldePrevisionnel=arrRevenueFinal20260912_(Number(r.soldeReel)+net);}
  return r;
};

/* DASHBOARD : consommateur strict du Rt1, jamais recalculateur concurrent. */
var composerDashboardAvantRevenueFinal20260912_=composerDashboardSyntheseBudgetSoft20260907_;
composerDashboardSyntheseBudgetSoft20260907_=function(ctx){
  const r=composerDashboardAvantRevenueFinal20260912_(ctx),cer=ctx&&ctx.cerbere||{},p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},rt1=Number(v.rt1);
  if(r&&r.courtTerme&&Number.isFinite(rt1)){r.courtTerme.revenusAttendus=arrRevenueFinal20260912_(rt1);r.courtTerme.revenusPrevisionnelsRestants=arrRevenueFinal20260912_(rt1-Number(r.courtTerme.revenusConstates||0));r.provenance=r.provenance||{};r.provenance.revenusAttendus='cerbere.periodes[0].v37.rt1';r.versionRevenueIntermodule=BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION;}
  return r;
};

/* GARDE BLOQUANT : meme revision, Dashboard=Rt1, projection canonique, aucun evenement certain du disparu. */
verifierSupradoctrineRecettesBudgetSoft20260912_=function(etat){
  const erreurs=[],m=etat&&etat.modules||{},dash=m.dashboard||{},ct=dash.courtTerme||{},cer=m.cerbere||{},proj=m.projectionEtendue||{},p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},periode=p&&(p.periode||p)||{};
  const revision=String(etat&&etat.revisionBudgetSoft||''),rt1=Number(v.rt1),pub=Number(ct.revenusAttendus);
  if(!revision)erreurs.push({code:'SUPRA_RECETTES_REVISION_ABSENTE'});
  if(!Number.isFinite(rt1))erreurs.push({code:'SUPRA_RECETTES_RT1_ABSENT'});
  if(Number.isFinite(rt1)&&(!Number.isFinite(pub)||Math.abs(arrRevenueFinal20260912_(rt1)-arrRevenueFinal20260912_(pub))>.01))erreurs.push({code:'SUPRA_RECETTES_DASHBOARD_RT1',detail:{revisionBudgetSoft:revision,cerbereRt1:arrRevenueFinal20260912_(rt1),dashboard:arrRevenueFinal20260912_(pub)}});
  const owner=String(proj&&proj.proprietaireBudgetSoft||proj&&proj.proprietaire||'');if(owner&&owner!=='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907')erreurs.push({code:'SUPRA_RECETTES_PROJECTION_OWNER',detail:{proprietaire:owner}});
  const reference=dateRevenueFinal20260912_(ct.dateReference||new Date()),fin=dateRevenueFinal20260912_(ct.fin||periode.fin),lignes=Array.isArray(proj.lignes)?proj.lignes:[],dus=evenementsCertainsDusCycleRevenueFinal20260912_(periode,reference),controles=[];
  dus.forEach(function(ev){const id=String(ev.id||''),couvert=lignes.some(function(l){const d=dateRevenueFinal20260912_(l&&l.date);return String(l&&l.source||'')==='evenement'&&String(l&&l.sourceId||'')===id&&d&&d>reference&&(!fin||d<=fin)&&Number(l&&l.montantSigne||0)>0;});const c={id:id,libelle:String(ev.libelle||''),montant:Math.abs(Number(ev.montant||0)),statut:String(ev.statut||''),couvertFutur:couvert};controles.push(c);if(!couvert)erreurs.push({code:'SUPRA_EVENEMENT_CERTAIN_DU_DISPARU',detail:c});});
  return{ok:erreurs.length===0,version:BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION,doctrine:{proprietaireRecettesAttendues:'cerbere.periodes[0].v37.rt1',dashboard:'lecture stricte Rt1',comptes:'projectionEtendue canonique',preuveRealisation:'operation_reelle_id ou rapprochement confirme ; jamais date/statut seuls',principe:'une donnee, un proprietaire, un calcul, plusieurs consommateurs'},intermodule:{revisionBudgetSoft:revision,cerbereRt1:Number.isFinite(rt1)?arrRevenueFinal20260912_(rt1):null,dashboardRevenusAttendus:Number.isFinite(pub)?arrRevenueFinal20260912_(pub):null,projectionOwner:owner||null},evenementsCertainsDus:controles,erreurs:erreurs,avertissements:[]};
};

function auditerRecettesIntermodulesBudgetSoft20260912(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();if(!s||!s.disponible){const x={ok:false,version:BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION,erreur:'Snapshot global indisponible.'};console.log('[AUDIT recettes intermodules] '+JSON.stringify(x));return x;}
  const etat=s.etat||{},m=etat.modules||{},cer=m.cerbere||{},p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},periode=p&&(p.periode||p)||{},garde=verifierSupradoctrineRecettesBudgetSoft20260912_(etat),cible=periode.fin||new Date();
  let unite={ok:false};try{const comptes=chargerTresorerieUnifieeBudgetSoft20260907(cible),banque=chargerTrajectoireBanqueCerbereRapide20260903(cible,cer),ref=dateRevenueFinal20260912_(comptes&&comptes.dateReference||new Date()),fin=dateRevenueFinal20260912_(cible);const filtrer=function(xs){return(xs||[]).filter(function(l){const d=dateRevenueFinal20260912_(l&&l.date);return d&&d>ref&&d<=fin;});};const sig=function(xs){return filtrer(xs).map(function(l){return[isoRevenueFinal20260912_(l&&l.date),String(l&&l.source||''),String(l&&l.sourceId||''),arrRevenueFinal20260912_(l&&l.montantSigne)].join('|');}).sort();};const a=sig(comptes&&comptes.lignes),b=sig(banque&&banque.lignes);unite={ok:String(comptes&&comptes.revisionBudgetSoft||'')===String(etat.revisionBudgetSoft||'')&&String(banque&&banque.revisionBudgetSoft||'')===String(etat.revisionBudgetSoft||'')&&JSON.stringify(a)===JSON.stringify(b),revisionComptes:String(comptes&&comptes.revisionBudgetSoft||''),revisionCerbere:String(banque&&banque.revisionBudgetSoft||''),nombreLignesComptes:a.length,nombreLignesCerbere:b.length,proprietaireComptes:String(comptes&&comptes.proprietaireBudgetSoft||''),sourceCerbere:String(banque&&banque.sourceBudgetSoft||'')};}catch(e){unite={ok:false,erreur:String(e&&e.message||e)};}
  const out={ok:garde.ok===true&&unite.ok===true,version:BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION,revisionBudgetSoft:String(etat.revisionBudgetSoft||''),cerbereRt1:arrRevenueFinal20260912_(v.rt1),dashboardRevenusAttendus:arrRevenueFinal20260912_(m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.revenusAttendus),gardePublication:garde,uniteProjectionComptesCerbere:unite};console.log('[AUDIT recettes intermodules] '+JSON.stringify(out));return out;
}
