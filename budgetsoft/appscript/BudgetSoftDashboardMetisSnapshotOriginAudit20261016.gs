/** Audit de lecture seule de la priorite snapshot du Dashboard. */
function auditerOrigineSoldeDashboardMetis20261016(){
  const arr=n=>Number.isFinite(Number(n))?Math.round(Number(n)*100)/100:null;
  const c=construireSyntheseComptes20260828_();
  const canon=arr(c&&c.synthese&&c.synthese.disponible);
  let snap=null,snapErreur='',moduleSolde=null,moduleSource='';
  try{
    if(typeof chargerDashboardDepuisSnapshotGlobalBudgetSoft20260906==='function'){
      snap=chargerDashboardDepuisSnapshotGlobalBudgetSoft20260906();
      moduleSolde=arr(snap&&snap.courtTerme&&snap.courtTerme.soldeBancaire);
      moduleSource=String(snap&&snap.source||'');
    }else snapErreur='Chargeur snapshot dashboard absent';
  }catch(e){snapErreur=String(e&&e.message||e);}
  const d=chargerDashboardReelV2();
  const dashboard=arr(d&&d.courtTerme&&d.courtTerme.soldeBancaire);
  const out={ok:!!c&&c.ok===true,lectureSeule:true,version:'2026-10-16.1',
    soldeComptesCanonique:canon,soldeSnapshotDashboard:moduleSolde,
    snapshotSource:moduleSource,snapshotOk:snap&&snap.ok!==false,
    snapshotErreur:snapErreur,soldeDashboardReelV2:dashboard,
    sourceDashboard:String(d&&d.source||''),sourceBudgetSoft:String(d&&d.sourceBudgetSoft||''),
    ecartSnapshotCanon:moduleSolde===null?null:arr(canon-moduleSolde),
    ecartDashboardCanon:dashboard===null?null:arr(canon-dashboard),
    snapshotPrioritaire:!!(snap&&snap.ok!==false&&snap.source==='snapshot_global'),
    note:'Lecture seule; ne force aucune reconstruction de snapshot.'};
  console.log('[AUDIT ORIGINE SOLDE DASHBOARD METIS] '+JSON.stringify(out));return out;
}
