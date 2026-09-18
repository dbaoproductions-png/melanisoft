const BUDGETSOFT_DASHBOARD_CANONICAL_OWNER_20260918_VERSION='2026-09-18.1';

function arrDashboardCanonicalOwner20260918_(n){return Math.round(Number(n||0)*100)/100;}
function jourDashboardCanonicalOwner20260918_(v){
  if(v==null||v==='')return'';
  const d=v instanceof Date?new Date(v):new Date(v);
  return isNaN(d.getTime())?'':Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function joursRestantsDashboardCanonicalOwner20260918_(fin){
  const d=new Date(fin||0),n=new Date();
  if(isNaN(d.getTime()))return 1;
  return Math.max(1,Math.ceil((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(n.getFullYear(),n.getMonth(),n.getDate()))/86400000)+1);
}

/**
 * Propriétaire unique de la composition Dashboard.
 * Le moteur source 20260907 compose la structure ; cette façade ne recalcule
 * aucune vérité métier et publie uniquement les valeurs détenues par Cerbère
 * et la projection de trésorerie canonique de la même révision.
 */
function composerDashboardSyntheseBudgetSoft20260907_(ctx){
  const r=composerDashboardSyntheseSourceBudgetSoft20260907_(ctx);
  if(!r||r.ok===false)return r;
  ctx=ctx||{};
  const proj=ctx.projectionEtendue||{},cer=ctx.cerbere||{},ps=Array.isArray(cer.periodes)?cer.periodes:[];

  // Recettes attendues : Rt1 Cerbère est l'unique propriétaire.
  const p0=ps[0]||null,v0=p0&&p0.v37||{},rt1=Number(v0.rt1);
  if(r.courtTerme&&Number.isFinite(rt1)){
    r.courtTerme.revenusAttendus=arrDashboardCanonicalOwner20260918_(rt1);
    r.courtTerme.revenusPrevisionnelsRestants=arrDashboardCanonicalOwner20260918_(rt1-Number(r.courtTerme.revenusConstates||0));
    r.provenance=r.provenance||{};
    r.provenance.revenusAttendus='cerbere.periodes[0].v37.rt1';
    r.provenance.revenusPrevisionnels='projectionEtendue canonique ; aucun recalcul local dans Dashboard';
  }

  // EP/P : publication en lecture seule des propriétaires Cerbère.
  if(typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')try{enrichirEnvelopePilotableBudgetSoft20260913_(cer);}catch(e){}
  const publierDecision=function(cible,p,index){
    if(!cible||!p)return;
    const v=p.v37||{},c=v.cockpit20260902||{};
    const ep=p.enveloppePilotable||(typeof calculerEnvelopePilotableBudgetSoft20260913_==='function'?calculerEnvelopePilotableBudgetSoft20260913_(p):null);
    if(!ep)return;
    const soutenable=Number(c.pSoutenable!=null?c.pSoutenable:(c.p1Total||0));
    const pDisponible=Number(c.pDisponible!=null?c.pDisponible:(soutenable-Number(ep.consomme||0)));
    cible.ep=Number(ep.total||0);
    cible.epDisponible=Number(ep.reste||0);
    cible.epConsomme=Number(ep.consomme||0);
    cible.epSource=String(ep.source||'');
    cible.pSoutenable=soutenable;
    cible.pDisponible=pDisponible;
    cible.ecartEpP=arrDashboardCanonicalOwner20260918_(Number(ep.total||0)-soutenable);
    cible.proprietaireEp=String(typeof BUDGETSOFT_EP_OWNER_20260913!=='undefined'?BUDGETSOFT_EP_OWNER_20260913:'');
    cible.proprietaireP='Cerbère · P soutenable';
    cible.pilotableDisponible=Number(ep.reste||0);
    cible.pilotableParJour=arrDashboardCanonicalOwner20260918_(Number(ep.reste||0)/joursRestantsDashboardCanonicalOwner20260918_(p.periode&&p.periode.fin));
    cible.pilotableSemantique='alias EP disponible';
    if(index===1){
      cible.epPrevisionnel=Number(ep.total||0);
      cible.p2Previsionnel=soutenable;
      cible.ecartEpP2=cible.ecartEpP;
      cible.cbDejaEngagee=Number(c.cbDejaEngagee||0);
      cible.cbEpEstimee=Number(c.cbEpEstimee||0);
      cible.reportCbCycle=Number(c.reportCbCycle||0);
    }
  };
  publierDecision(r.courtTerme||{},ps[0],0);
  publierDecision(r.cycleSuivant||{},ps[1],1);

  // Soldes prévisionnels : projection canonique de la même révision uniquement.
  const appliquerProjection=function(cible,avecPrelevements){
    if(!cible||!cible.debut||!cible.fin||!proj||proj.ok===false||typeof pointProjectionTresorerieUnifiee20260907_!=='function')return;
    const a=new Date(String(cible.debut)+'T12:00:00'),b=new Date(String(cible.fin)+'T12:00:00');
    if(isNaN(a.getTime())||isNaN(b.getTime()))return;
    const mi=Utilities.formatDate(new Date(a.getTime()+Math.floor((b.getTime()-a.getTime())/2)),Session.getScriptTimeZone(),'yyyy-MM-dd');
    cible.soldeMiCycle=Number(pointProjectionTresorerieUnifiee20260907_(proj,mi));
    cible.soldeFinCycle=Number(pointProjectionTresorerieUnifiee20260907_(proj,cible.fin));
    if(cible!==r.courtTerme)cible.soldeJ1=Number(pointProjectionTresorerieUnifiee20260907_(proj,cible.debut));
    cible.sourceSoldesPrevisionnels='projectionEtendue canonique';
    cible.proprietaireSoldesPrevisionnels='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907';
    cible.versionAlignementSoldes='2026-09-13.3';
    if(typeof resumePeriodeTresorerieUnifiee20260907_==='function'&&cible!==r.courtTerme){
      const rs=resumePeriodeTresorerieUnifiee20260907_(proj,cible.debut,cible.fin);
      cible.revenusPrevisionnels=rs.recettes;
      cible.depensesPrevisionnelles=rs.depenses;
      cible.nombreLignesProjectionCycle=rs.nombreLignes;
      cible.projectionTresorerieDisponible=true;
      cible.sourceProjection='tresorerie_unifiee_contexte';
    }
    if(avecPrelevements){
      const ref=String(cible.dateReference||jourDashboardCanonicalOwner20260918_(proj.dateReference));
      const xs=(Array.isArray(proj.lignes)?proj.lignes:[]).filter(function(l){
        const j=jourDashboardCanonicalOwner20260918_(l&&l.date),m=Number(l&&l.montantSigne);
        return String(l&&l.source||'')==='charge_fixe'&&j&&(!ref||j>ref)&&j<=String(cible.fin||'')&&Number.isFinite(m)&&m<0;
      });
      cible.prelevements=arrDashboardCanonicalOwner20260918_(xs.reduce(function(s,l){return s+Math.abs(Number(l.montantSigne||0));},0));
      cible.nombrePrelevements=xs.length;
      cible.sourcePrelevements='projectionEtendue · charges fixes futures';
    }
  };
  appliquerProjection(r.courtTerme||{},true);
  appliquerProjection(r.cycleSuivant||{},false);

  r.provenance=r.provenance||{};
  r.provenance.enveloppePilotable='ctx.cerbere · BudgetSoftEnvelopePilotable20260913';
  r.provenance.soutenabilite='ctx.cerbere · P lecture seule';
  r.provenance.soldesPrevisionnels='ctx.projectionEtendue canonique · même révision';
  r.versionEp=typeof BUDGETSOFT_EP_20260913_VERSION!=='undefined'?BUDGETSOFT_EP_20260913_VERSION:'';
  r.versionDashboardCanonicalOwner=BUDGETSOFT_DASHBOARD_CANONICAL_OWNER_20260918_VERSION;
  return r;
}
