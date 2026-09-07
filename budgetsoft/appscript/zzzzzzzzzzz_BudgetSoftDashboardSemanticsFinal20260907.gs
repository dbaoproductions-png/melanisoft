const BUDGETSOFT_DASHBOARD_SEMANTICS_FINAL_VERSION='2026-09-07.2';

function jourLocalDashboardProjection20260907_(v){
  const d=v instanceof Date?new Date(v):new Date(v||0);
  if(isNaN(d.getTime()))return '';
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function dateLocaleDashboardProjection20260907_(jour){
  const m=String(jour||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0):null;
}
function milieuJourDashboardProjection20260907_(debut,fin){
  const a=dateLocaleDashboardProjection20260907_(debut),b=dateLocaleDashboardProjection20260907_(fin);
  if(!a||!b)return '';
  const d=new Date(a.getTime()+Math.floor((b.getTime()-a.getTime())/2));
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function arrDashboardProjection20260907_(n){return Math.round(Number(n||0)*100)/100;}

function appliquerProjectionTresorerieCycleSuivantDashboard20260907_(r){
  const s=r&&r.cycleSuivant;
  if(!s||!s.debut||!s.fin||typeof chargerSnapshotGlobalBudgetSoft20260906!=='function')return r;
  let snap=null;
  try{snap=chargerSnapshotGlobalBudgetSoft20260906();}catch(e){return r;}
  const etat=snap&&snap.disponible&&snap.etat,proj=etat&&etat.modules&&etat.modules.projectionEtendue;
  if(!proj||proj.ok===false||!Array.isArray(proj.lignes))return r;

  const debut=String(s.debut),fin=String(s.fin),mi=milieuJourDashboardProjection20260907_(debut,fin),ref=jourLocalDashboardProjection20260907_(proj.dateReference);
  const soldeBase=Number(proj.soldeReel);
  if(!Number.isFinite(soldeBase)||!ref)return r;

  const lignes=proj.lignes.map(l=>({ligne:l,jour:jourLocalDashboardProjection20260907_(l&&l.date),montant:Number(l&&l.montantSigne)})).filter(x=>x.jour&&Number.isFinite(x.montant));
  function variationJusqua(jour){return lignes.reduce((sum,x)=>sum+(x.jour>ref&&x.jour<=jour?x.montant:0),0);}
  function soldeAu(jour){return arrDashboardProjection20260907_(soldeBase+variationJusqua(jour));}

  let recettes=0,depenses=0,n=0;
  lignes.forEach(x=>{
    if(x.jour<debut||x.jour>fin)return;
    n++;
    if(x.montant>=0)recettes+=x.montant;else depenses+=Math.abs(x.montant);
  });

  s.soldeJ1=soldeAu(debut);
  s.soldeMiCycle=soldeAu(mi);
  s.soldeFinCycle=soldeAu(fin);
  s.revenusPrevisionnels=arrDashboardProjection20260907_(recettes);
  s.depensesPrevisionnelles=arrDashboardProjection20260907_(depenses);
  delete s.depensesBudgetees;
  s.projectionTresorerieDisponible=true;
  s.sourceProjection='moteur_tresorerie_previsionnelle';
  s.versionProjection=proj.version||'';
  s.nombreLignesProjectionCycle=n;
  s.doctrineDepenses='Prévision bancaire issue du moteur de trésorerie : opérations futures, charges fixes, Plan, recettes régulières et autres lignes prévisionnelles du cycle.';
  r.provenance=r.provenance||{};
  r.provenance.previsionsCycleSuivant='projectionEtendue / moteur de trésorerie prévisionnelle';
  return r;
}

function corrigerSemantiqueDashboardBudgetSoft20260907_(d){
  if(!d||typeof d!=='object')return d;
  let r=d;
  try{r=JSON.parse(JSON.stringify(d));}catch(e){}

  // Le cycle suivant est désormais alimenté par le propriétaire métier naturel :
  // le moteur de trésorerie prévisionnelle, enrichi des recettes régulières.
  r=appliquerProjectionTresorerieCycleSuivantDashboard20260907_(r);

  const p=r.cyclePrecedent||(r.cyclePrecedent={});
  // Historique : "Solde à J1" = solde d'ouverture, avant les mouvements du premier jour.
  const fin=Number(p.soldeFinCycle),net=Number(p.netOperations);
  if(Number.isFinite(fin)&&Number.isFinite(net)){
    const ancien=Number(p.soldeJ1);
    p.soldeJ1Original=Number.isFinite(ancien)?ancien:null;
    p.soldeJ1=arrDashboardProjection20260907_(fin-net);
    p.soldeJ1Nature='ouverture_avant_mouvements_J1';
    p.ecartReconciliationOriginal=p.ecartReconciliation;
    p.ecartReconciliation=arrDashboardProjection20260907_(fin-p.soldeJ1-net);
  }

  r.versionSemantique=BUDGETSOFT_DASHBOARD_SEMANTICS_FINAL_VERSION;
  return r;
}

function chargerDashboardSyntheseV3BudgetSoft20260907(){
  return corrigerSemantiqueDashboardBudgetSoft20260907_(chargerDashboardSyntheseBudgetSoft20260907());
}

function auditerSemantiqueDashboardBudgetSoft20260907(){
  const d=chargerDashboardSyntheseV3BudgetSoft20260907(),s=d&&d.cycleSuivant||{},p=d&&d.cyclePrecedent||{};
  const r={ok:!!(d&&d.ok!==false),version:d&&d.version||'',versionCorrection:d&&d.versionCorrection||'',versionSemantique:d&&d.versionSemantique||'',cycleSuivant:{sourceProjection:s.sourceProjection||'',versionProjection:s.versionProjection||'',revenusPrevisionnels:s.revenusPrevisionnels,depensesPrevisionnelles:s.depensesPrevisionnelles,soldeJ1:s.soldeJ1,soldeMiCycle:s.soldeMiCycle,soldeFinCycle:s.soldeFinCycle,pilotablePrevisionnel:s.pilotablePrevisionnel,cbDifferees:s.cbDifferees,nombreLignesProjectionCycle:s.nombreLignesProjectionCycle},cyclePrecedent:{soldeJ1:p.soldeJ1,soldeJ1Original:p.soldeJ1Original,soldeFinCycle:p.soldeFinCycle,netOperations:p.netOperations,ecartReconciliation:p.ecartReconciliation,ecartReconciliationOriginal:p.ecartReconciliationOriginal}};
  console.log('[AUDIT Dashboard semantique] '+JSON.stringify(r));return r;
}
