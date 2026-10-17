/** Audit lecture seule du Rt1 lisse et de sa publication intermodules. */
function auditerPariteLissageConcertsARE20261017(){
  const arr=n=>Number.isFinite(Number(n))?Math.round(Number(n)*100)/100:null;
  const snap=chargerSnapshotGlobalBudgetSoft20260906(),etat=snap&&snap.disponible&&snap.etat;
  if(!etat)throw new Error('Snapshot indisponible');
  const modules=etat.modules||{},cer=modules.cerbere||{},p=(cer.periodes||[])[0]||{},
    v=p.v37||{},rt=arr(v.rt1),d=modules.dashboard&&modules.dashboard.courtTerme||{},
    dashboard=arr(d.revenusAttendus),compte=construireSyntheseComptes20260828_(),
    soldeCompte=arr(compte&&compte.synthese&&compte.synthese.disponible),
    soldeDashboard=arr(d.soldeBancaire);
  const source=JSON.parse(JSON.stringify({ok:true,periodes:[p]}));
  enrichirCerbereRecettesCertainesDues20260919_(source);
  const vv=source.periodes[0].v37||{},diag=vv.rt1Audit&&vv.rt1Audit.lissageConcertsARE20261017||{};
  const simule=arr(vv.rt1),attendu=simule;
  const cfAvant=arr(v.cft1),cfApres=arr(vv.cft1);
  const scAvant=arr(v.sct1),scApres=arr(vv.sct1);
  const provenance=modules.dashboard&&modules.dashboard.provenance||{};
  const out={
    ok:diag.applique===true&&soldeCompte===soldeDashboard&&cfAvant===cfApres&&
      simule!==null&&rt!==null&&dashboard!==null,
    lectureSeule:true,version:'2026-10-17.1',
    revisionBudgetSoft:String(etat.revisionBudgetSoft||''),
    rt1PublieCerbere:rt,rt1PublieDashboard:dashboard,
    rt1SimuleDepuisSnapshot:simule,ecartRt1PublieEntreModules:arr(rt-dashboard),
    resteAPropager:arr(simule-rt),
    compensation:diag.compensationAppliquee,
    franceTravailSimule:diag.franceTravailLisse,
    soldeCompteCanon:soldeCompte,soldeDashboard:soldeDashboard,
    cfCerbereAvant:cfAvant,cfCerbereApresSimulation:cfApres,
    sct1Publie:scAvant,sct1Simule:scApres,
    provenanceRecettes:String(provenance.revenusAttendus||''),
    lectureProjection:'La projection tresorerie publiee reste celle du snapshot et nest pas reconstruite par cet audit.',
    conditions:{compteDashboardIdentiques:soldeCompte===soldeDashboard,
      chargesFixesInchangees:cfAvant===cfApres,
      cerbereDashboardPubliesIdentiques:rt===dashboard,
      compensationAppliquee:diag.applique===true}};
  console.log('[AUDIT PARITE LISSAGE RT1] '+JSON.stringify(out));
  return out;
}
