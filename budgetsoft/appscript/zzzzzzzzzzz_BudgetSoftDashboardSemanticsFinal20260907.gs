const BUDGETSOFT_DASHBOARD_SEMANTICS_FINAL_VERSION='2026-09-07.3';

function milieuJourDashboardProjection20260907_(debut,fin){
  const a=new Date(String(debut||'')+'T12:00:00'),b=new Date(String(fin||'')+'T12:00:00');
  if(isNaN(a.getTime())||isNaN(b.getTime()))return '';
  const d=new Date(a.getTime()+Math.floor((b.getTime()-a.getTime())/2));
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}

/**
 * Adaptateur de présentation uniquement.
 * Il ne possède aucune formule de trésorerie : il lit le moteur prévisionnel publié
 * dans la même révision globale que Comptes et Cerbère.
 */
function appliquerProjectionTresorerieCycleSuivantDashboard20260907_(r){
  const s=r&&r.cycleSuivant;
  if(!s||!s.debut||!s.fin||typeof chargerSnapshotGlobalBudgetSoft20260906!=='function')return r;
  let snap=null;try{snap=chargerSnapshotGlobalBudgetSoft20260906();}catch(e){return r;}
  const etat=snap&&snap.disponible&&snap.etat,proj=etat&&etat.modules&&etat.modules.projectionEtendue;
  if(!etat||etat.ok!==true||!proj||proj.ok===false)return r;
  if(typeof pointProjectionTresorerieUnifiee20260907_!=='function'||typeof resumePeriodeTresorerieUnifiee20260907_!=='function')return r;

  const mi=milieuJourDashboardProjection20260907_(s.debut,s.fin),resume=resumePeriodeTresorerieUnifiee20260907_(proj,s.debut,s.fin);
  s.soldeJ1=pointProjectionTresorerieUnifiee20260907_(proj,s.debut);
  s.soldeMiCycle=pointProjectionTresorerieUnifiee20260907_(proj,mi);
  s.soldeFinCycle=pointProjectionTresorerieUnifiee20260907_(proj,s.fin);
  s.revenusPrevisionnels=resume.recettes;
  s.depensesPrevisionnelles=resume.depenses;
  delete s.depensesBudgetees;
  s.projectionTresorerieDisponible=true;
  s.sourceProjection='tresorerie_unifiee_snapshot';
  s.versionProjection=proj.version||'';
  s.revisionProjection=etat.revisionBudgetSoft||'';
  s.nombreLignesProjectionCycle=resume.nombreLignes;
  r.provenance=r.provenance||{};
  r.provenance.previsionsCycleSuivant='même projectionEtendue publiée que Comptes et Cerbère';
  return r;
}

function corrigerSemantiqueDashboardBudgetSoft20260907_(d){
  if(!d||typeof d!=='object')return d;
  let r=d;try{r=JSON.parse(JSON.stringify(d));}catch(e){}
  r=appliquerProjectionTresorerieCycleSuivantDashboard20260907_(r);
  // Aucun recalcul ni réécriture de l'historique ici : les valeurs du cycle précédent
  // restent celles du compositeur canonique et seront auditées séparément.
  r.versionSemantique=BUDGETSOFT_DASHBOARD_SEMANTICS_FINAL_VERSION;
  return r;
}

function chargerDashboardSyntheseV3BudgetSoft20260907(){return corrigerSemantiqueDashboardBudgetSoft20260907_(chargerDashboardSyntheseBudgetSoft20260907());}

function auditerSemantiqueDashboardBudgetSoft20260907(){
  const d=chargerDashboardSyntheseV3BudgetSoft20260907(),s=d&&d.cycleSuivant||{},p=d&&d.cyclePrecedent||{};
  const r={ok:!!(d&&d.ok!==false),version:d&&d.version||'',versionCorrection:d&&d.versionCorrection||'',versionSemantique:d&&d.versionSemantique||'',cycleSuivant:{sourceProjection:s.sourceProjection||'',versionProjection:s.versionProjection||'',revisionProjection:s.revisionProjection||'',revenusPrevisionnels:s.revenusPrevisionnels,depensesPrevisionnelles:s.depensesPrevisionnelles,soldeJ1:s.soldeJ1,soldeMiCycle:s.soldeMiCycle,soldeFinCycle:s.soldeFinCycle,pilotablePrevisionnel:s.pilotablePrevisionnel,cbDifferees:s.cbDifferees,nombreLignesProjectionCycle:s.nombreLignesProjectionCycle},cyclePrecedent:{soldeJ1:p.soldeJ1,soldeFinCycle:p.soldeFinCycle,netOperations:p.netOperations,ecartReconciliation:p.ecartReconciliation}};
  console.log('[AUDIT Dashboard semantique] '+JSON.stringify(r));return r;
}
