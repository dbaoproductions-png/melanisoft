const BUDGETSOFT_CYCLE_TURNOVER_AUDIT_20260928_VERSION='2026-09-28.1';

function auditerBasculeCycleOctobreBudgetSoft20260928(){
  const cer=recalculerCerbereCockpitP1Frais20260912_();
  const p=cer&&Array.isArray(cer.periodes)?cer.periodes[0]:null;
  const v=p&&p.v37||{},c=v.cockpit20260902||{},d=cer&&cer.diagnostic&&cer.diagnostic.p1Doctrine20260912||{};
  const dash=chargerDashboardSyntheseV3BudgetSoft20260907();
  const ct=dash&&dash.courtTerme||{};
  let snap=null,mods={};
  try{
    snap=chargerSnapshotGlobalBudgetSoft20260906();
    mods=snap&&snap.disponible&&snap.etat&&snap.etat.modules||{};
  }catch(e){}
  const proj=mods.projectionEtendue||{};
  const out={
    ok:true,
    version:BUDGETSOFT_CYCLE_TURNOVER_AUDIT_20260928_VERSION,
    cerbere:{
      periode:p&&p.periode||null,
      ss1:Number(d.ss1||0),
      rt1:Number(d.rt1||0),
      cft1:Number(d.cft1||0),
      het1:Number(d.het1||0),
      cbHeritees:Number(d.cbHeritees||0),
      p1:Number(d.p1||0),
      p1Carte:Number(c.pSoutenable!=null?c.pSoutenable:c.p1Total||0)
    },
    dashboard:{
      revision:String(dash&&dash.revisionBudgetSoft||''),
      source:String(dash&&dash.sourceBudgetSoft||dash&&dash.source||''),
      periode:{debut:String(ct.debut||''),fin:String(ct.fin||''),dateReference:String(ct.dateReference||'')},
      soldeBancaire:Number(ct.soldeBancaire||0),
      revenusConstates:Number(ct.revenusConstates||0),
      revenusAttendus:Number(ct.revenusAttendus||0),
      depensesConstatees:Number(ct.depensesConstatees||0),
      depensesAttendues:Number(ct.depensesAttendues||0),
      pSoutenable:Number(ct.pSoutenable||0),
      pDisponible:Number(ct.pDisponible||0),
      ep:Number(ct.ep||0),
      epDisponible:Number(ct.epDisponible||0),
      soldeMiCycle:Number(ct.soldeMiCycle||0),
      soldeFinCycle:Number(ct.soldeFinCycle||0),
      prelevements:Number(ct.prelevements||0),
      chargesFixes:Number(ct.chargesFixes||0)
    },
    projection:{
      revision:String(proj&&proj.revisionBudgetSoft||''),
      dateReference:String(proj&&proj.dateReference||''),
      lignes:Array.isArray(proj&&proj.lignes)?proj.lignes.length:0,
      decomposition:proj&&proj.decompositionCanonique||null
    },
    controles:{
      rt1DashboardAligne:Math.abs(Number(ct.revenusAttendus||0)-Number(d.rt1||0))<0.011,
      p1DashboardAligne:Math.abs(Number(ct.pSoutenable||0)-Number(d.p1||0))<0.011,
      periodeAlignee:String(ct.debut||'').slice(0,10)===String(p&&p.periode&&p.periode.debut||'').slice(0,10)
    }
  };
  console.log('[AUDIT BASCULE CYCLE OCTOBRE 20260928] '+JSON.stringify(out));
  return out;
}
