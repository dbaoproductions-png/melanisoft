const BUDGETSOFT_STRUCTURAL_CLEANUP_20260917_VERSION='2026-09-18.4';

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
    {code:'CLES_SNAPSHOT_LOCAL_OPERATIONS_ABSENTES',ok:clesOperations===0,detail:String(clesOperations)+' clé(s) résiduelle(s)'},
    {code:'CERBERE_ECRITURE_ALIAS_VERS_ENDPOINT_UNIQUE',ok:typeof sauvegarderPilotageCerbere20260903==='function'&&typeof sauvegarderPilotageCerberePublic20260917==='function'&&String(sauvegarderPilotageCerbere20260903).indexOf('sauvegarderPilotageCerberePublic20260917')>=0,detail:'alias historique -> endpoint public 20260917'},
    {code:'CERBERE_ANCIEN_MOTEUR_EP_INTERNALISE',ok:typeof sauvegarderPilotageCerbereLegacyEp20260912_==='function',detail:'sauvegarderPilotageCerbereLegacyEp20260912_ interne'},
    {code:'CERBERE_LECTURE_CANONIQUE_PRESENTE',ok:typeof chargerCerbereCockpitCanonique20260914==='function'&&typeof chargerCerbereCockpitProprietaire20260917_==='function',detail:'endpoint canonique -> propriétaire moderne'},
    {code:'DASHBOARD_PILOTABLE_LEGACY_INTERNALISE',ok:typeof lirePilotableParJourDashboardLegacy20260912_==='function'&&typeof lirePilotableParJourDashboardSnapshotBudgetSoft20260909==='function',detail:'ancien raccourci internalisé ; endpoint Dashboard conservé'},
    {code:'FICHIER_SNAPSHOT_LOCAL_COMPTES_RETIRE',ok:typeof chargerSnapshotComptes20260828==='undefined'&&typeof rafraichirSnapshotComptes20260828==='undefined'&&typeof invaliderSnapshotComptes20260828==='undefined',detail:'fonctions locales Comptes absentes du runtime'},
    {code:'FICHIER_SNAPSHOT_LOCAL_OPERATIONS_RETIRE',ok:typeof chargerSnapshotOperations20260828==='undefined'&&typeof rafraichirSnapshotOperations20260828==='undefined'&&typeof invaliderSnapshotOperations20260828==='undefined',detail:'fonctions locales Operations absentes du runtime'},
    {code:'CERBERE_ALIAS_HISTORIQUE_VERS_CANONIQUE',ok:typeof chargerCerbereCockpit20260902==='function'&&String(chargerCerbereCockpit20260902).indexOf('chargerCerbereCockpitCanonique20260914')>=0,detail:'ancien nom public -> endpoint canonique 20260914'},
    {code:'CERBERE_CONSOLIDATION_LEGACY_INTERNALISE',ok:typeof chargerCerbereCockpitLegacyConsolidation20260902_==='function',detail:'ancien lecteur CerbereConsolidation internalisé'},
    {code:'CERBERE_SNAPSHOT_FIRST_ANCIEN_RETIRE',ok:typeof BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_VERSION==='undefined',detail:'premier override snapshot-first retiré du runtime'},
    {code:'SNAPSHOT_GLOBAL_CONSTRUCTEUR_PUBLIC_PROMU',ok:typeof reconstruireSnapshotGlobalBudgetSoft20260906==='function'&&String(reconstruireSnapshotGlobalBudgetSoft20260906).indexOf('reconstruireSnapshotGlobalSyntheseBudgetSoft20260907')>=0&&typeof reconstruireSnapshotGlobalLegacyBudgetSoft20260906_==='function',detail:'nom public -> constructeur synthèse ; ancien constructeur internalisé'}
  ];
  const out={ok:controles.every(c=>c.ok),version:BUDGETSOFT_STRUCTURAL_CLEANUP_20260917_VERSION,lectureSeule:true,dureeMs:Date.now()-t0,controles,clesLocales:{comptes:clesComptes,operations:clesOperations},architecture:{endpointEcriture:'sauvegarderPilotageCerberePublic20260917',aliasEcriture:'sauvegarderPilotageCerbere20260903',ownerLecture:'chargerCerbereCockpitProprietaire20260917_',endpointLecture:'chargerCerbereCockpitCanonique20260914',legacyEpInterne:'sauvegarderPilotageCerbereLegacyEp20260912_',legacyDashboardInterne:'lirePilotableParJourDashboardLegacy20260912_'}};
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
  const props=PropertiesService.getDocumentProperties();
  Object.keys(props.getProperties()||{}).forEach(function(k){
    if(String(k).indexOf('COMPTES_SNAPSHOT_20260828_')===0||String(k).indexOf('OPERATIONS_SNAPSHOT_20260828_')===0)props.deleteProperty(k);
  });
  const apres={
    comptes:compterClesParPrefixeBudgetSoft20260917_('COMPTES_SNAPSHOT_20260828_'),
    operations:compterClesParPrefixeBudgetSoft20260917_('OPERATIONS_SNAPSHOT_20260828_')
  };
  const out={ok:apres.comptes===0&&apres.operations===0,version:BUDGETSOFT_STRUCTURAL_CLEANUP_20260917_VERSION,avant,apres,portee:'caches_locaux_uniquement'};
  console.log('[PURGE SNAPSHOTS LOCAUX BUDGETSOFT 20260917] '+JSON.stringify(out));
  return out;
}
