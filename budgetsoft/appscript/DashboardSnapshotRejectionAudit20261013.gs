function auditerRejetSnapshotDashboard20261013(){
  const t=Date.now();
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&((s.disponible&&s.etat)||s.etatPerime)||null;
  const f=s&&s.fraicheur||{};
  const resultat={
    ok:true,lectureSeule:true,version:'2026-10-13.1',
    disponible:!!(s&&s.disponible),perime:!!(s&&s.perime),
    corrompu:!!(s&&s.corrompu),revision:String(s&&s.revisionBudgetSoft||''),
    genereLe:String(s&&s.genereLe||''),
    raisons:f.raisons||[],dirtyAt:f.dirtyAt||'',dirtyOrigin:f.dirtyOrigin||'',
    planDernier:f.planDernier||'',planOrigine:f.planOrigine||'',
    etatOk:!!(e&&e.ok===true),etatPublie:!!(e&&e.publie===true),
    dashboardPresent:!!(e&&e.modules&&e.modules.dashboard),
    dashboardVersion:String(e&&e.modules&&e.modules.dashboard&&e.modules.dashboard.version||''),
    versionAttendue:String(BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION),
    dureeMs:Date.now()-t
  };
  console.log('[AUDIT REJET SNAPSHOT DASHBOARD 20261013] '+JSON.stringify(resultat));
  return resultat;
}
