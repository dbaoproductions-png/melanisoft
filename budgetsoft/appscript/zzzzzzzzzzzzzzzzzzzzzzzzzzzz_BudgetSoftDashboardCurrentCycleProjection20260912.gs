const BUDGETSOFT_DASHBOARD_CURRENT_CYCLE_PROJECTION_20260912_VERSION='2026-09-13.3';

/*
 * Adaptateur Dashboard intermodule.
 *
 * IMPORTANT : il consomme exclusivement le contexte de construction de la même
 * révision globale (ctx.cerbere + ctx.projectionEtendue). Il ne relit jamais un
 * snapshot précédent pendant la composition. Ainsi EP, P et les soldes projetés
 * appartiennent tous à la même photographie BudgetSoft.
 */
var composerDashboardAvantProjectionCourante20260912_=composerDashboardSyntheseBudgetSoft20260907_;
composerDashboardSyntheseBudgetSoft20260907_=function(ctx){
  const r=composerDashboardAvantProjectionCourante20260912_(ctx);
  if(!r||r.ok===false)return r;
  ctx=ctx||{};
  const proj=ctx.projectionEtendue||{},cer=ctx.cerbere||{},ps=Array.isArray(cer.periodes)?cer.periodes:[];
  if(typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')try{enrichirEnvelopePilotableBudgetSoft20260913_(cer);}catch(e){}

  const arr=n=>Math.round(Number(n||0)*100)/100;
  const joursRestants=fin=>{const d=new Date(fin||0),n=new Date();if(isNaN(d.getTime()))return 1;return Math.max(1,Math.ceil((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(n.getFullYear(),n.getMonth(),n.getDate()))/86400000)+1);};
  const publierDecision=function(cible,p,index){
    if(!cible||!p)return;
    const v=p.v37||{},c=v.cockpit20260902||{},ep=p.enveloppePilotable||(typeof calculerEnvelopePilotableBudgetSoft20260913_==='function'?calculerEnvelopePilotableBudgetSoft20260913_(p):null);
    if(!ep)return;
    const soutenable=Number(c.pSoutenable!=null?c.pSoutenable:(c.p1Total||0)),pDisponible=Number(c.pDisponible!=null?c.pDisponible:(soutenable-Number(ep.consomme||0)));
    cible.ep=Number(ep.total||0);cible.epDisponible=Number(ep.reste||0);cible.epConsomme=Number(ep.consomme||0);cible.epSource=String(ep.source||'');
    cible.pSoutenable=soutenable;cible.pDisponible=pDisponible;cible.ecartEpP=arr(Number(ep.total||0)-soutenable);
    cible.proprietaireEp=String(typeof BUDGETSOFT_EP_OWNER_20260913!=='undefined'?BUDGETSOFT_EP_OWNER_20260913:'');cible.proprietaireP='Cerbère · P soutenable';
    cible.pilotableDisponible=Number(ep.reste||0);cible.pilotableParJour=arr(Number(ep.reste||0)/joursRestants(p.periode&&p.periode.fin));cible.pilotableSemantique='alias EP disponible';
    if(index===1){cible.epPrevisionnel=Number(ep.total||0);cible.p2Previsionnel=soutenable;cible.ecartEpP2=cible.ecartEpP;cible.cbDejaEngagee=Number(c.cbDejaEngagee||0);cible.cbEpEstimee=Number(c.cbEpEstimee||0);cible.reportCbCycle=Number(c.reportCbCycle||0);}
  };
  publierDecision(r.courtTerme||{},ps[0],0);publierDecision(r.cycleSuivant||{},ps[1],1);

  const jour=v=>{if(v==null||v==='')return'';const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d.getTime())?'':Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');};
  const appliquerProjection=function(cible,avecPrelevements){
    if(!cible||!cible.debut||!cible.fin||!proj||proj.ok===false||typeof pointProjectionTresorerieUnifiee20260907_!=='function')return;
    const a=new Date(String(cible.debut)+'T12:00:00'),b=new Date(String(cible.fin)+'T12:00:00');if(isNaN(a.getTime())||isNaN(b.getTime()))return;
    const mi=Utilities.formatDate(new Date(a.getTime()+Math.floor((b.getTime()-a.getTime())/2)),Session.getScriptTimeZone(),'yyyy-MM-dd');
    cible.soldeMiCycle=Number(pointProjectionTresorerieUnifiee20260907_(proj,mi));cible.soldeFinCycle=Number(pointProjectionTresorerieUnifiee20260907_(proj,cible.fin));
    if(cible!==r.courtTerme)cible.soldeJ1=Number(pointProjectionTresorerieUnifiee20260907_(proj,cible.debut));
    cible.sourceSoldesPrevisionnels='projectionEtendue canonique';cible.proprietaireSoldesPrevisionnels='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907';cible.versionAlignementSoldes=BUDGETSOFT_DASHBOARD_CURRENT_CYCLE_PROJECTION_20260912_VERSION;
    if(typeof resumePeriodeTresorerieUnifiee20260907_==='function'&&cible!==r.courtTerme){const rs=resumePeriodeTresorerieUnifiee20260907_(proj,cible.debut,cible.fin);cible.revenusPrevisionnels=rs.recettes;cible.depensesPrevisionnelles=rs.depenses;cible.nombreLignesProjectionCycle=rs.nombreLignes;cible.projectionTresorerieDisponible=true;cible.sourceProjection='tresorerie_unifiee_contexte';}
    if(avecPrelevements){const ref=String(cible.dateReference||jour(proj.dateReference)),xs=(Array.isArray(proj.lignes)?proj.lignes:[]).filter(l=>{const j=jour(l&&l.date),m=Number(l&&l.montantSigne);return String(l&&l.source||'')==='charge_fixe'&&j&&(!ref||j>ref)&&j<=String(cible.fin||'')&&Number.isFinite(m)&&m<0;});cible.prelevements=arr(xs.reduce((s,l)=>s+Math.abs(Number(l.montantSigne||0)),0));cible.nombrePrelevements=xs.length;cible.sourcePrelevements='projectionEtendue · charges fixes futures';}
  };
  appliquerProjection(r.courtTerme||{},true);appliquerProjection(r.cycleSuivant||{},false);

  r.provenance=r.provenance||{};r.provenance.enveloppePilotable='ctx.cerbere · BudgetSoftEnvelopePilotable20260913';r.provenance.soutenabilite='ctx.cerbere · P lecture seule';r.provenance.soldesPrevisionnels='ctx.projectionEtendue canonique · même révision';r.versionEp=typeof BUDGETSOFT_EP_20260913_VERSION!=='undefined'?BUDGETSOFT_EP_20260913_VERSION:'';
  return r;
};

function auditerSoldesPrevisionnelsDashboardBudgetSoft20260912(){
  const snap=chargerSnapshotGlobalBudgetSoft20260906(),etat=snap&&snap.disponible&&snap.etat,m=etat&&etat.modules||{},d=m.dashboard||{},c=d.courtTerme||{},s=d.cycleSuivant||{},p=m.projectionEtendue||{},cer=m.cerbere||{},ps=Array.isArray(cer.periodes)?cer.periodes:[],ep=ps[0]&&ps[0].enveloppePilotable||{},ep2=ps[1]&&ps[1].enveloppePilotable||{};
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const canonFin=c.fin&&typeof pointProjectionTresorerieUnifiee20260907_==='function'?pointProjectionTresorerieUnifiee20260907_(p,c.fin):null,canonJ2=s.debut&&typeof pointProjectionTresorerieUnifiee20260907_==='function'?pointProjectionTresorerieUnifiee20260907_(p,s.debut):null;
  const out={ok:!!(etat&&etat.ok===true),version:BUDGETSOFT_DASHBOARD_CURRENT_CYCLE_PROJECTION_20260912_VERSION,revisionBudgetSoft:etat&&etat.revisionBudgetSoft||'',courant:{ep:arr(c.ep),epOwner:arr(ep.total),p:arr(c.pSoutenable),soldeFin:arr(c.soldeFinCycle),soldeFinCanon:Number.isFinite(Number(canonFin))?arr(canonFin):null},suivant:{ep:arr(s.ep),epOwner:arr(ep2.total),p:arr(s.pSoutenable),soldeJ1:arr(s.soldeJ1),soldeJ1Canon:Number.isFinite(Number(canonJ2))?arr(canonJ2):null},provenance:d&&d.provenance||{}};
  out.ok=out.ok&&Math.abs(out.courant.ep-out.courant.epOwner)<=.01&&Math.abs(out.suivant.ep-out.suivant.epOwner)<=.01&&(out.courant.soldeFinCanon==null||Math.abs(out.courant.soldeFin-out.courant.soldeFinCanon)<=.01)&&(out.suivant.soldeJ1Canon==null||Math.abs(out.suivant.soldeJ1-out.suivant.soldeJ1Canon)<=.01);
  console.log('[AUDIT Dashboard projection + EP/P] '+JSON.stringify(out));return out;
}
