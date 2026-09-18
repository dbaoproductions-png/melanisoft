const BUDGETSOFT_DASHBOARD_SEMANTICS_FINAL_VERSION='2026-09-13.3';

/*
 * Couche sémantique finale du Dashboard.
 *
 * Les valeurs EP/P/projection sont désormais injectées par le compositeur avec
 * le contexte de la même révision globale. Cette couche ne relit aucun snapshot
 * et ne recalcule aucune vérité métier : elle normalise seulement les alias de
 * présentation historiques.
 */
function corrigerSemantiqueDashboardBudgetSoft20260907_(d){
  if(!d||typeof d!=='object')return d;
  let r=d;try{r=JSON.parse(JSON.stringify(d));}catch(e){}
  const c=r.courtTerme||{},s=r.cycleSuivant||{};
  if(c.epDisponible!=null){c.pilotableDisponible=Number(c.epDisponible);c.pilotableSemantique='alias EP disponible';}
  if(s.ep!=null){s.epPrevisionnel=Number(s.ep);s.pilotablePrevisionnel=Number(s.ep);s.pilotableSemantique='alias EP du cycle suivant';}
  r.courtTerme=c;r.cycleSuivant=s;r.versionSemantique=BUDGETSOFT_DASHBOARD_SEMANTICS_FINAL_VERSION;
  r.provenance=r.provenance||{};
  r.provenance.semantiqueEpP='aucun recalcul · données déjà injectées depuis le contexte de la même révision';
  if(s.sourceProjection&&s.soldeJ1!=null&&s.soldeMiCycle!=null&&s.soldeFinCycle!=null)r.provenance.previsionsCycleSuivant='projectionEtendue canonique · soldes C2 publiés par le propriétaire de trésorerie de la même révision';
  return r;
}

function chargerDashboardSyntheseV3BudgetSoft20260907(){return corrigerSemantiqueDashboardBudgetSoft20260907_(chargerDashboardSyntheseBudgetSoft20260907());}

function auditerSemantiqueDashboardBudgetSoft20260907(){
  const d=chargerDashboardSyntheseV3BudgetSoft20260907(),c=d&&d.courtTerme||{},s=d&&d.cycleSuivant||{};
  const out={ok:!!(d&&d.ok!==false),version:d&&d.version||'',versionSemantique:d&&d.versionSemantique||'',courant:{ep:c.ep,epDisponible:c.epDisponible,p1:c.pSoutenable,p1Disponible:c.pDisponible,ecartEpP1:c.ecartEpP,pilotableAlias:c.pilotableDisponible},cycleSuivant:{ep:s.ep,p2:s.pSoutenable,ecartEpP2:s.ecartEpP,cbDejaEngagee:s.cbDejaEngagee,cbEpEstimee:s.cbEpEstimee,reportCbCycle:s.reportCbCycle,sourceProjection:s.sourceProjection||'',soldeJ1:s.soldeJ1,soldeMiCycle:s.soldeMiCycle,soldeFinCycle:s.soldeFinCycle},provenance:d&&d.provenance||{}};
  out.ok=out.ok&&c.ep!=null&&c.pSoutenable!=null&&Math.abs(Number(c.pilotableDisponible||0)-Number(c.epDisponible||0))<=.01&&s.ep!=null&&s.pSoutenable!=null;
  console.log('[AUDIT Dashboard sémantique EP/P] '+JSON.stringify(out));return out;
}

function auditerFrontiereHistoriqueDashboardBudgetSoft20260909(){
  const d=chargerDashboardSyntheseBudgetSoft20260907(),p=d&&d.cyclePrecedent||{},debut=String(p.debut||'');let sources=null;try{sources=chargerToutesLesDonnees();}catch(e){sources=null;}let ops=sources&&Array.isArray(sources.Operations)?sources.Operations:[];if(typeof dedoublonnerOperationsCartesBudgetSoft_==='function')try{ops=dedoublonnerOperationsCartesBudgetSoft_(ops);}catch(e){}
  const snap=typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():null,etat=snap&&snap.disponible&&snap.etat,tres=etat&&etat.modules&&etat.modules.tresorerieComptable,cles=new Set();(tres&&tres.comptes||[]).forEach(c=>{cles.add(String(c.id||''));cles.add(String(c.nom||''));});
  let netJourDebut=0,nombre=0;const details=[];ops.forEach(o=>{if(typeof operationReelleCanoniqueBudgetSoft20260906_==='function'&&!operationReelleCanoniqueBudgetSoft20260906_(o))return;if(cles.size&&!cles.has(String(o&&o.compte||'')))return;let jour='';try{const dt=typeof dateComptableCanonBudgetSoft20260906_==='function'?dateComptableCanonBudgetSoft20260906_(o):null;jour=dt?Utilities.formatDate(dt,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';}catch(e){jour='';}if(jour!==debut)return;const m=typeof montantSigneCanoniqueBudgetSoft20260906_==='function'?Number(montantSigneCanoniqueBudgetSoft20260906_(o)||0):Number(o&&o.montant||0);if(!Number.isFinite(m)||Math.abs(m)<.000001)return;netJourDebut+=m;nombre++;details.push({id:String(o&&o.id||''),libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),montant:Math.round(m*100)/100});});
  netJourDebut=Math.round(netJourDebut*100)/100;const ecart=Math.round(Number(p.ecartReconciliation||0)*100)/100,frontiereExpliqueEcart=Math.abs(Math.round((ecart+netJourDebut)*100)/100)<=.01,out={ok:frontiereExpliqueEcart,debut,fin:String(p.fin||''),soldeJ1:p.soldeJ1,soldeFinCycle:p.soldeFinCycle,netOperations:p.netOperations,ecartReconciliation:ecart,netJourDebut,nombreOperationsJourDebut:nombre,frontiereExpliqueEcart,details};console.log('[AUDIT Dashboard frontière historique] '+JSON.stringify(out));return out;
}
