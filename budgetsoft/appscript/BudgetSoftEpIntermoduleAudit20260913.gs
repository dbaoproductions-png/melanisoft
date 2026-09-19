/*
 * Audit maître migration P -> EP — 2026-09-13.
 * Lecture seule. Aucun correctif, aucune écriture métier.
 */
const BUDGETSOFT_EP_INTERMODULE_AUDIT_20260913_VERSION='2026-09-13.1';
function arrAuditEp20260913_(n){return Math.round(Number(n||0)*100)/100;}
function egalAuditEp20260913_(a,b){return Math.abs(arrAuditEp20260913_(a)-arrAuditEp20260913_(b))<=.011;}

/** Première barrière : propriétaires P/EP + C2 + trésorerie, sans exiger un snapshot global déjà reconstruit. */
function auditerCoeurEpBudgetSoft20260913(){
  const cer=chargerCerbereCockpit20260902();
  const ps=cer&&Array.isArray(cer.periodes)?cer.periodes:[],p1=ps[0]||null,p2=ps[1]||null,v1=p1&&p1.v37||{},c1=v1.cockpit20260902||{},v2=p2&&p2.v37||{},c2=v2.cockpit20260902||{};
  if(typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')enrichirEnvelopePilotableBudgetSoft20260913_(cer);
  const d=cer&&cer.diagnostic&&cer.diagnostic.p1Doctrine20260912||{},e=cer&&cer.diagnostic&&cer.diagnostic.enveloppePilotable20260913||{},cb=cer&&cer.diagnostic&&cer.diagnostic.cbDoubleRole||{};
  const sommeAlloc=(p1&&p1.enveloppes||[]).reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)),0),sommeP0=(p1&&p1.enveloppes||[]).reduce((s,x)=>s+Math.max(0,Number(x&&x.canon||0)),0),sommeReel=(p1&&p1.enveloppes||[]).reduce((s,x)=>s+Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0))),0);
  const pFormule=arrAuditEp20260913_(Number(d.ss1||0)+Number(d.rt1||0)-Number(d.cft1||0)-Number(d.het1||0)-Number(d.cbHeritees||0));
  const ep=arrAuditEp20260913_(sommeAlloc),epDisponible=arrAuditEp20260913_(ep-sommeReel);
  const impact=typeof calculerImpactPrevisionnelEpBudgetSoft20260913_==='function'&&p1?calculerImpactPrevisionnelEpBudgetSoft20260913_(p1,lireTable_('Operations')||[],new Date()):null;
  const fin2=p2&&p2.periode&&p2.periode.fin||null,proj=fin2&&typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function'?construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(fin2,cer):null,td=proj&&proj.diagnostic20260831&&proj.diagnostic20260831.enveloppePilotable20260913||{};
  const express=typeof composerCerbereExpressDepuisCockpit20260910_==='function'?composerCerbereExpressDepuisCockpit20260910_(cer):null;
  const checks={
    pFormule:egalAuditEp20260913_(d.p1,pFormule),
    pPublie:egalAuditEp20260913_(c1.p1Total,d.p1)&&egalAuditEp20260913_(c1.pSoutenable,d.p1),
    ancienAjustementPNeutralise:Math.abs(Number(d.ajustement||0))<=.001&&Math.abs(Number(c1.ajustementP1||0))<=.001,
    epSommeMolettes:egalAuditEp20260913_(e.ep,ep)&&egalAuditEp20260913_(c1.epTotal,ep),
    epDisponible:egalAuditEp20260913_(e.epDisponible,epDisponible)&&egalAuditEp20260913_(c1.epDisponible,epDisponible),
    epInitialiseP0:String(e.source||'')!=='P0'||egalAuditEp20260913_(ep,sommeP0),
    pIndependantEp:egalAuditEp20260913_(d.p1,pFormule),
    impactEpReconcilie:!!impact&&egalAuditEp20260913_(Number(impact.immediat||0)+Number(impact.differe||0),impact.resteAEngager),
    c2ReportReconcilie:egalAuditEp20260913_(c2.reportCbCycle,Number(c2.cbDejaEngagee||0)+Number(c2.cbEpEstimee||0)),
    tresorerieOwnerEp:!!(proj&&proj.ok!==false&&td&&td.ownerEp===true&&td.sourceCerbereFinal===true&&egalAuditEp20260913_(td.reconciliation,0)),
    expressEpOnly:!!(express&&express.ok!==false&&express.referenceEP&&!express.referenceP1&&express.contexteDecision&&!express.contexteFinancier&&egalAuditEp20260913_(express.pilotable&&express.pilotable.allocation,ep)&&egalAuditEp20260913_(express.pilotable&&express.pilotable.reste,epDisponible))
  };
  const out={ok:Object.keys(checks).every(k=>checks[k]===true),version:BUDGETSOFT_EP_INTERMODULE_AUDIT_20260913_VERSION,sourceCerbere:cer&&cer.sourceBudgetSoft||'',checks,verites:{p1:arrAuditEp20260913_(d.p1),p1Disponible:arrAuditEp20260913_(d.restePilotable),ep1:ep,ep1Disponible:epDisponible,epSource:String(e.source||''),consomme:arrAuditEp20260913_(sommeReel),p0:arrAuditEp20260913_(sommeP0)},impactC2:{connu:arrAuditEp20260913_(c2.cbDejaEngagee),epDiffereEstime:arrAuditEp20260913_(c2.cbEpEstimee),reportTotal:arrAuditEp20260913_(c2.reportCbCycle),p2Avant:arrAuditEp20260913_(c2.p1AvantReportCb),p2Apres:arrAuditEp20260913_(c2.p1Total),tauxDifferePct:Number(impact&&impact.tauxDifferePct||0)},tresorerie:{ok:!!(proj&&proj.ok!==false),version:proj&&proj.version||'',ownerEp:!!td.ownerEp,reconciliation:Number(td.reconciliation||0),sourceCerbereFinal:!!td.sourceCerbereFinal},express:{version:express&&express.version||'',ep:express&&express.pilotable&&express.pilotable.allocation,reste:express&&express.pilotable&&express.pilotable.reste,epOnly:checks.expressEpOnly}};
  console.log('[AUDIT COEUR EP 20260913] '+JSON.stringify(out));return out;
}

/** Seconde barrière après reconstruction du snapshot global : tous les consommateurs doivent lire la même révision. */
function auditerMigrationEpIntermoduleBudgetSoft20260913(){
  const coeur=auditerCoeurEpBudgetSoft20260913(),snap=chargerSnapshotGlobalBudgetSoft20260906(),etat=snap&&snap.disponible&&snap.etat,m=etat&&etat.modules||{},cer=m.cerbere||{},exp=m.cerbereExpress||{},dash=m.dashboard||{},proj=m.projectionEtendue||{};
  const ps=Array.isArray(cer.periodes)?cer.periodes:[],p1=ps[0]||{},p2=ps[1]||{},e1=p1.enveloppePilotable||{},e2=p2.enveloppePilotable||{},c1=p1.v37&&p1.v37.cockpit20260902||{},c2=p2.v37&&p2.v37.cockpit20260902||{},dc=dash.courtTerme||{},ds=dash.cycleSuivant||{},td=proj&&proj.diagnostic20260831&&proj.diagnostic20260831.enveloppePilotable20260913||{};
  const checks={
    snapshotValide:!!(etat&&etat.ok===true),
    coeurValide:!!coeur.ok,
    cerbereEp:egalAuditEp20260913_(e1.total,c1.epTotal)&&egalAuditEp20260913_(e1.reste,c1.epDisponible),
    dashboardCourant:egalAuditEp20260913_(dc.ep,e1.total)&&egalAuditEp20260913_(dc.epDisponible,e1.reste)&&egalAuditEp20260913_(dc.pSoutenable,c1.pSoutenable),
    dashboardSuivant:egalAuditEp20260913_(ds.ep,e2.total)&&egalAuditEp20260913_(ds.pSoutenable,c2.pSoutenable),
    expressDecideSeulement:!!(exp&&exp.ok!==false&&exp.referenceEP&&!exp.referenceP1&&exp.contexteDecision&&!exp.contexteFinancier&&egalAuditEp20260913_(exp.pilotable&&exp.pilotable.allocation,e1.total)&&egalAuditEp20260913_(exp.pilotable&&exp.pilotable.reste,e1.reste)),
    projectionEp:!!(td&&td.ownerEp===true&&td.sourceCerbereFinal===true&&egalAuditEp20260913_(td.ep,e1.total)&&egalAuditEp20260913_(td.reconciliation,0)),
    c2Report:egalAuditEp20260913_(c2.reportCbCycle,Number(c2.cbDejaEngagee||0)+Number(c2.cbEpEstimee||0)),
    memeRevisionDashboard:String(dash&&dash.revisionBudgetSoft||etat&&etat.revisionBudgetSoft||'')===String(etat&&etat.revisionBudgetSoft||'')||!dash.revisionBudgetSoft,
    aucuneValeurPExpress:!Object.prototype.hasOwnProperty.call(exp||{},'referenceP1')&&!Object.prototype.hasOwnProperty.call(exp||{},'contexteFinancier')
  };
  const out={ok:Object.keys(checks).every(k=>checks[k]===true),version:BUDGETSOFT_EP_INTERMODULE_AUDIT_20260913_VERSION,revisionBudgetSoft:etat&&etat.revisionBudgetSoft||'',checks,coeur:coeur.verites,cerbere:{ep1:arrAuditEp20260913_(e1.total),ep1Disponible:arrAuditEp20260913_(e1.reste),p1:arrAuditEp20260913_(c1.pSoutenable),ep2:arrAuditEp20260913_(e2.total),p2:arrAuditEp20260913_(c2.pSoutenable),cbConnuC2:arrAuditEp20260913_(c2.cbDejaEngagee),cbEpEstimeeC2:arrAuditEp20260913_(c2.cbEpEstimee)},dashboard:{ep1:dc.ep,ep1Disponible:dc.epDisponible,p1:dc.pSoutenable,ep2:ds.ep,p2:ds.pSoutenable,soldeFinC1:dc.soldeFinCycle,soldeJ1C2:ds.soldeJ1},express:{ep:exp&&exp.pilotable&&exp.pilotable.allocation,reste:exp&&exp.pilotable&&exp.pilotable.reste,doctrine:exp&&exp.doctrine||''},projection:{version:proj&&proj.version||'',ep:td.ep,resteAEngager:td.resteAEngager,immediat:td.immediat,differe:td.differe,tauxDifferePct:td.tauxDifferePct,reconciliation:td.reconciliation}};
  console.log('[AUDIT MIGRATION EP INTERMODULE 20260913] '+JSON.stringify(out));return out;
}
