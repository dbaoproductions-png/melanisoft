const BUDGETSOFT_STRUCTURAL_CLEANUP_20260917_VERSION='2026-09-17.1';

function compterClesParPrefixeBudgetSoft20260917_(prefixe){
  const props=PropertiesService.getDocumentProperties().getProperties()||{};
  return Object.keys(props).filter(k=>String(k).indexOf(prefixe)===0).length;
}

function auditerNettoyageStructurelBudgetSoft20260917(){
  const t0=Date.now();
  const comptes=chargerSyntheseComptes20260828();
  const operations=chargerOperationsLeger20260828();
  const cartes=typeof auditerCartesStabiliteBudgetSoft20260917==='function'?auditerCartesStabiliteBudgetSoft20260917():null;
  const clesOperations=compterClesParPrefixeBudgetSoft20260917_('OPERATIONS_SNAPSHOT_20260828_');
  const clesComptes=compterClesParPrefixeBudgetSoft20260917_('COMPTES_SNAPSHOT_20260828_');
  const controles=[
    {code:'COMPTES_N_UTILISE_PLUS_SNAPSHOT_LOCAL',ok:String(comptes&&comptes.performance&&comptes.performance.source||'')!=='snapshot_local_secours',detail:'source='+String(comptes&&comptes.performance&&comptes.performance.source||'')},
    {code:'OPERATIONS_N_UTILISE_PLUS_SNAPSHOT_LOCAL',ok:Number(operations&&operations._performance&&operations._performance.snapshotMs||0)===0,detail:'snapshotMs='+Number(operations&&operations._performance&&operations._performance.snapshotMs||0)},
    {code:'RECETTE_GLOBALE_VERTE',ok:!!(cartes&&cartes.ok===true),detail:'version='+(cartes&&cartes.version||'indisponible')},
    {code:'CLES_SNAPSHOT_LOCAL_COMPTES_ABSENTES',ok:clesComptes===0,detail:String(clesComptes)+' clé(s) résiduelle(s)'},
    {code:'CLES_SNAPSHOT_LOCAL_OPERATIONS_ABSENTES',ok:clesOperations===0,detail:String(clesOperations)+' clé(s) résiduelle(s)'}
  ];
  const out={ok:controles.every(c=>c.ok),version:BUDGETSOFT_STRUCTURAL_CLEANUP_20260917_VERSION,lectureSeule:true,dureeMs:Date.now()-t0,controles,clesLocales:{comptes:clesComptes,operations:clesOperations}};
  console.log('[AUDIT NETTOYAGE STRUCTUREL BUDGETSOFT 20260917] '+JSON.stringify(out));
  return out;
}

/**
 * Purge uniquement les caches locaux historiques Comptes et Operations.
 * Ne touche ni aux tables métier, ni au snapshot global, ni aux snapshots d'autres modules.
 */
function purgerSnapshotsLocauxHistoriquesBudgetSoft20260917(){
  const avant={
    comptes:compterClesParPrefixeBudgetSoft20260917_('COMPTES_SNAPSHOT_20260828_'),
    operations:compterClesParPrefixeBudgetSoft20260917_('OPERATIONS_SNAPSHOT_20260828_')
  };
  if(typeof invaliderSnapshotComptes20260828==='function')invaliderSnapshotComptes20260828();
  if(typeof invaliderSnapshotOperations20260828==='function')invaliderSnapshotOperations20260828();
  const apres={
    comptes:compterClesParPrefixeBudgetSoft20260917_('COMPTES_SNAPSHOT_20260828_'),
    operations:compterClesParPrefixeBudgetSoft20260917_('OPERATIONS_SNAPSHOT_20260828_')
  };
  const out={ok:apres.comptes===0&&apres.operations===0,version:BUDGETSOFT_STRUCTURAL_CLEANUP_20260917_VERSION,avant,apres,portee:'caches_locaux_uniquement'};
  console.log('[PURGE SNAPSHOTS LOCAUX BUDGETSOFT 20260917] '+JSON.stringify(out));
  return out;
}
