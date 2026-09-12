const BUDGETSOFT_DASHBOARD_CURRENT_CYCLE_PROJECTION_20260912_VERSION='2026-09-12.1';

/*
 * Adaptateur de présentation du Dashboard — cycle courant.
 *
 * Doctrine : aucun calcul bancaire local. Les soldes prévisionnels du Dashboard
 * sont des points de la même projectionEtendue canonique que Comptes et Cerbère.
 * Propriétaire : construireTrajectoireTresorerieCanoniqueBudgetSoft20260907().
 */
var composerDashboardAvantProjectionCourante20260912_=composerDashboardSyntheseBudgetSoft20260907_;
composerDashboardSyntheseBudgetSoft20260907_=function(ctx){
  const r=composerDashboardAvantProjectionCourante20260912_(ctx);
  if(!r||r.ok===false)return r;
  const courant=r.courtTerme||{},proj=ctx&&ctx.projectionEtendue||{};
  if(!proj||proj.ok===false||typeof pointProjectionTresorerieUnifiee20260907_!=='function')return r;

  const debut=String(courant.debut||''),fin=String(courant.fin||'');
  if(!debut||!fin)return r;
  const dDebut=new Date(debut+'T12:00:00'),dFin=new Date(fin+'T12:00:00');
  if(isNaN(dDebut.getTime())||isNaN(dFin.getTime()))return r;
  const dMilieu=new Date(dDebut.getTime()+Math.floor((dFin.getTime()-dDebut.getTime())/2));
  const milieu=Utilities.formatDate(dMilieu,Session.getScriptTimeZone(),'yyyy-MM-dd');

  const soldeMi=pointProjectionTresorerieUnifiee20260907_(proj,milieu);
  const soldeFin=pointProjectionTresorerieUnifiee20260907_(proj,fin);
  if(Number.isFinite(Number(soldeMi)))courant.soldeMiCycle=Number(soldeMi);
  if(Number.isFinite(Number(soldeFin)))courant.soldeFinCycle=Number(soldeFin);
  courant.sourceSoldesPrevisionnels='projectionEtendue canonique';
  courant.proprietaireSoldesPrevisionnels='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907';
  courant.dateReferenceProjection=String(proj.dateReference||'');
  courant.cibleMiCycle=milieu;
  courant.cibleFinCycle=fin;
  courant.versionAlignementSoldes=BUDGETSOFT_DASHBOARD_CURRENT_CYCLE_PROJECTION_20260912_VERSION;

  r.courtTerme=courant;
  r.provenance=r.provenance||{};
  r.provenance.soldesPrevisionnelsCourant='projectionEtendue canonique · mêmes points que Comptes et Cerbère';
  return r;
};

function auditerSoldesPrevisionnelsDashboardBudgetSoft20260912(){
  const snap=chargerSnapshotGlobalBudgetSoft20260906(),etat=snap&&snap.disponible&&snap.etat,m=etat&&etat.modules||{},d=m.dashboard||{},c=d.courtTerme||{},p=m.projectionEtendue||{};
  const debut=String(c.debut||''),fin=String(c.fin||'');
  let milieu='';
  if(debut&&fin){
    const a=new Date(debut+'T12:00:00'),b=new Date(fin+'T12:00:00');
    if(!isNaN(a.getTime())&&!isNaN(b.getTime()))milieu=Utilities.formatDate(new Date(a.getTime()+Math.floor((b.getTime()-a.getTime())/2)),Session.getScriptTimeZone(),'yyyy-MM-dd');
  }
  const canonMi=milieu&&typeof pointProjectionTresorerieUnifiee20260907_==='function'?pointProjectionTresorerieUnifiee20260907_(p,milieu):null;
  const canonFin=fin&&typeof pointProjectionTresorerieUnifiee20260907_==='function'?pointProjectionTresorerieUnifiee20260907_(p,fin):null;
  const dashMi=Number(c.soldeMiCycle),dashFin=Number(c.soldeFinCycle);
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const ecartMi=Number.isFinite(dashMi)&&Number.isFinite(Number(canonMi))?arr(dashMi-Number(canonMi)):null;
  const ecartFin=Number.isFinite(dashFin)&&Number.isFinite(Number(canonFin))?arr(dashFin-Number(canonFin)):null;
  const out={
    ok:!!(etat&&etat.ok===true&&ecartMi!=null&&ecartFin!=null&&Math.abs(ecartMi)<=.01&&Math.abs(ecartFin)<=.01),
    version:BUDGETSOFT_DASHBOARD_CURRENT_CYCLE_PROJECTION_20260912_VERSION,
    revisionBudgetSoft:etat&&etat.revisionBudgetSoft||'',
    proprietaire:p&&p.proprietaireBudgetSoft||'',
    dateReferenceProjection:p&&p.dateReference||'',
    milieu:{date:milieu,dashboard:Number.isFinite(dashMi)?arr(dashMi):null,canon:Number.isFinite(Number(canonMi))?arr(canonMi):null,ecart:ecartMi},
    fin:{date:fin,dashboard:Number.isFinite(dashFin)?arr(dashFin):null,canon:Number.isFinite(Number(canonFin))?arr(canonFin):null,ecart:ecartFin}
  };
  console.log('[AUDIT soldes prévisionnels Dashboard] '+JSON.stringify(out));
  return out;
}
