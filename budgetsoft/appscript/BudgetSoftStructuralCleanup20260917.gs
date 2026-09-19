const BUDGETSOFT_STRUCTURAL_CLEANUP_20260917_VERSION='2026-09-19.29.2';

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
  let aliasCerbere=null;
  try{aliasCerbere=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;}catch(e){aliasCerbere={ok:false,erreur:String(e&&e.message||e)};}
  const aliasCerbereCanonique=!!(aliasCerbere&&aliasCerbere.ok!==false&&(
    String(aliasCerbere.versionEndpointCanonique||'')===String(typeof CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION!=='undefined'?CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION:'2026-09-18.1')||
    String(aliasCerbere.sourceBudgetSoft||'').indexOf('endpoint_canonique_20260914')>=0
  ));
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
    {code:'CERBERE_ALIAS_HISTORIQUE_VERS_CANONIQUE',ok:typeof chargerCerbereCockpit20260902==='function'&&aliasCerbereCanonique,detail:'ancien nom public -> endpoint canonique 20260914 ; source='+String(aliasCerbere&&aliasCerbere.sourceBudgetSoft||'')+' ; versionEndpoint='+String(aliasCerbere&&aliasCerbere.versionEndpointCanonique||'')},
    {code:'CERBERE_CONSOLIDATION_LEGACY_INTERNALISE',ok:typeof chargerCerbereCockpitLegacyConsolidation20260902_==='function',detail:'ancien lecteur CerbereConsolidation internalisé'},
    {code:'CERBERE_SNAPSHOT_FIRST_ANCIEN_RETIRE',ok:typeof BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_VERSION==='undefined',detail:'premier override snapshot-first retiré du runtime'},
    {code:'CERBERE_CB_DOUBLE_ROLE_LEGACY_INTERNALISE',ok:typeof chargerCerbereCockpitLegacyCbDoubleRole20260905_==='function',detail:'ancien lecteur CB double rôle internalisé'},
    {code:'CERBERE_PLAN_DOCTRINE_LEGACY_INTERNALISE',ok:typeof chargerCerbereCockpitLegacyPlanDoctrineV374_==='function',detail:'ancien lecteur plan-doctrine internalisé'},
    {code:'CERBERE_CB_DOUBLE_ROLE_FINAL_LEGACY_INTERNALISE',ok:typeof chargerCerbereCockpitLegacyCbDoubleRoleFinal20260905_==='function',detail:'ancien lecteur final snapshot-first internalisé'},
    {code:'CERBERE_FIXED_CHARGE_OWNER_FINAL_LEGACY_INTERNALISE',ok:typeof chargerCerbereCockpitLegacyFixedChargeOwnerFinal20260914_==='function',detail:'ancien override terminal charges fixes internalisé'},
    {code:'PATRIMOINE_COMPOSITEUR_CANONIQUE_PRESENT',ok:typeof composerPatrimoineCanoniqueBudgetSoft20260906_==='function',detail:'snapshot global -> compositeur Patrimoine canonique'},
    {code:'PATRIMOINE_LECTEUR_PUBLIC_PRESENT',ok:typeof chargerPatrimoine==='function',detail:'lecteur Patrimoine public conservé avec fallback recalcul'},
    {code:'CREDITS_LECTEUR_V2_CANONIQUE_PRESENT',ok:typeof chargerCreditsEtDettesV2==='function',detail:'lecteur Crédits V2 canonique présent'},
    {code:'CREDITS_LECTEUR_BASE_LEGACY_INTERNALISE',ok:typeof chargerCreditsEtDettesLegacyBase_==='function',detail:'ancien lecteur Crédits de base internalisé'},
    {code:'CREDITS_SCHEMA_COMPAT_LEGACY_INTERNALISE',ok:typeof chargerCreditsEtDettesLegacySchemaCompat_==='function',detail:'ancien lecteur Crédits schema-compat internalisé'},
    {code:'ANALYSES_ENDPOINT_V23_PRESENT',ok:typeof chargerAnalysesBudgetairesV23==='function',detail:'endpoint Analyses V23 présent'},
    {code:'ANALYSES_SNAPSHOT_ADAPTATEUR_PRESENT',ok:typeof servirAnalysesDepuisSnapshotBudgetSoft20260912_==='function'&&typeof construireModuleAnalysesSnapshotBudgetSoft20260912_==='function',detail:'adaptateur snapshot Analyses 3/6/12 présent'},
    {code:'ANALYSES_MOTEUR_HISTORIQUE_INTERNALISE',ok:typeof chargerAnalysesBudgetairesLegacyV23Base_==='function',detail:'ancien moteur Analyses public internalisé'},
    {code:'ANALYSES_TRANSPORT_HISTORIQUE_INTERNALISE',ok:typeof chargerAnalysesBudgetairesSerialisableLegacy19082026_==='function',detail:'ancien wrapper transport Analyses internalisé'},
    {code:'BUDGET_SNAPSHOT_ADAPTATEUR_PRESENT',ok:typeof servirBudgetDepuisSnapshotBudgetSoft20260918_==='function'&&typeof chargerBudgetPeriodeSource20260918_==='function',detail:'Budget courant snapshot-first ; moteur source conservé'},
    {code:'PLUXEE_SNAPSHOT_ADAPTATEUR_PRESENT',ok:typeof servirPluxeeDepuisSnapshotBudgetSoft20260918_==='function'&&typeof chargerPluxeeSource20260918_==='function',detail:'Pluxee snapshot-first ; moteur source conservé'},
    {code:'BUDGET_PLUXEE_AUDIT_PRESENT',ok:typeof auditerBudgetPluxeeSnapshotBudgetSoft20260918==='function',detail:'audit de parité de révision Budget/Pluxee présent'},
    {code:'SNAPSHOT_PUBLIC_ENDPOINT_SANS_OVERRIDE_Z',ok:typeof reconstruireSnapshotGlobalBudgetSoft20260906==='function'&&String(reconstruireSnapshotGlobalBudgetSoft20260906).indexOf('reconstruireSnapshotGlobalSyntheseBudgetSoft20260907')>=0&&typeof actualiserBudgetSoftToutesLes30MinutesLegacy20260906_==='function'&&typeof actualiserBudgetSoftMaintenantLegacy20260906_==='function'&&typeof initialiserArchitectureSnapshotLegacyBudgetSoft20260906_==='function',detail:'façade publique snapshot séparée ; anciens helpers 20260906 internalisés'},
    {code:'BUDGET_PLUXEE_ENDPOINTS_SANS_CAPTURE_TARDIVE',ok:typeof chargerBudgetPeriode==='function'&&typeof chargerBudgetPeriodeSource20260918_==='function'&&typeof chargerPluxee==='function'&&typeof chargerPluxeeSource20260918_==='function',detail:'endpoints publics séparés des moteurs sources ; plus de capture terminale par ordre lexical'},
    {code:'ANALYSES_ENDPOINT_SANS_OVERRIDE_Z',ok:typeof chargerAnalysesBudgetairesV23==='function'&&typeof chargerAnalysesBudgetairesV23Source20260912_==='function'&&typeof construireModuleAnalysesSnapshotBudgetSoft20260912_==='function',detail:'endpoint Analyses explicite ; moteur source séparé ; ancien fichier Z supprimé'},
    {code:'ENGAGEMENTS_ENDPOINT_SANS_OVERRIDE_Z',ok:typeof chargerEngagementsBancairesFuturs==='function'&&typeof chargerEngagementsBancairesFutursSource20260912_==='function'&&typeof construireModuleEngagementsBancairesSnapshotBudgetSoft20260912_==='function',detail:'endpoint Engagements explicite ; Dashboard injecté sans monkey-patch ; ancien fichier Z supprimé'},
    {code:'SNAPSHOT_WRITER_UNIQUE_RESTAURE',ok:typeof ecrireSnapshotGlobalBudgetSoft20260906_==='function'&&String(ecrireSnapshotGlobalBudgetSoft20260906_).indexOf('construireModuleAnalysesSnapshotBudgetSoft20260912_')<0,detail:'writer global unique ; Analyses/Engagements construits avant écriture'},
    {code:'TRESORERIE_UNIFIEE_HORS_FICHIER_Z',ok:typeof chargerTresorerieUnifieeBudgetSoft20260907==='function'&&typeof auditerUniteModulesTresorerieBudgetSoft20260907_==='function',detail:'module Trésorerie unifiée conservé sous fichier canonique sans préfixe Z'},
    {code:'DASHBOARD_SEMANTIQUE_HORS_FICHIER_Z',ok:typeof chargerDashboardSyntheseV3BudgetSoft20260907==='function'&&typeof corrigerSemantiqueDashboardBudgetSoft20260907_==='function',detail:'module sémantique Dashboard conservé sous fichier canonique sans préfixe Z'},
    {code:'RECETTES_CANONIQUES_ARREARS_SANS_DOUBLON_Z',ok:typeof revenusCanoniquesTresorerie20260831_==='function'&&typeof revenusCanoniquesTresorerieLegacy20260831_==='function',detail:'version RevenueArrears publique unique ; ancien calcul 20260831 internalisé'},
    {code:'DASHBOARD_COMPOSITEUR_UNIQUE_CANONIQUE',ok:typeof composerDashboardSyntheseBudgetSoft20260907_==='function'&&typeof composerDashboardSyntheseSourceBudgetSoft20260907_==='function'&&String(composerDashboardSyntheseBudgetSoft20260907_).indexOf('versionDashboardCanonicalOwner')>=0,detail:'compositeur public unique -> propriétaire canonique 20260918 ; moteur source 20260907 internalisé'},
    {code:'TRESORERIE_TRAJECTOIRE_PROPRIETAIRE_UNIQUE_CANONIQUE',ok:typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function'&&String(construireTrajectoireTresorerieCanoniqueBudgetSoft20260907).indexOf('evenementsCertainsDusInjectes')>=0&&String(construireTrajectoireTresorerieCanoniqueBudgetSoft20260907).indexOf('BUDGETSOFT_TREASURY_CANONICAL_OWNER')>=0,detail:'constructeur canonique intègre PublicationFix ; overrides RevenueFinal/PublicationFix retirés'},
    {code:'SUPRADOCTRINE_RECETTES_GARDE_UNIQUE_CANONIQUE',ok:typeof verifierSupradoctrineRecettesBudgetSoft20260912_==='function'&&String(verifierSupradoctrineRecettesBudgetSoft20260912_).indexOf('BUDGETSOFT_REVENUE_SUPRADOCTRINE_CANONICAL_20260918_VERSION')>=0,detail:'garde Recettes publique unique sous propriétaire canonique 20260918'},
    {code:'COHERENCE_REVISION_BASE_INTERNALISEE',ok:typeof auditerCoherenceRevisionBaseBudgetSoft20260906_==='function'&&typeof auditerCoherenceRevisionBudgetSoft20260906_==='function'&&String(auditerCoherenceRevisionBudgetSoft20260906_).indexOf('auditerCoherenceRevisionBaseBudgetSoft20260906_')>=0,detail:'garde de base 20260906 internalisée ; intégration supradoctrine explicite'},
    {code:'REVENUE_PUBLICATION_FIX_HORS_FICHIER_Z',ok:typeof evenementsRecettesCertainesDuesRevenuePublicationFix20260912_==='function'&&typeof arrRevenuePublicationFix20260912_==='function',detail:'helpers PublicationFix conservés sous fichier canonique sans override public'},
    {code:'EVENEMENTS_PLAN_FORECAST_DANS_MOTEUR_20260831',ok:typeof completerEvenementsEffectifsTresorerie20260831_==='function'&&typeof evenementEffectifTresorerie20260831_==='function'&&String(completerEvenementsEffectifsTresorerie20260831_).indexOf('evenementProuveClosPlanForecast20260912_')>=0&&String(completerEvenementsEffectifsTresorerie20260831_).indexOf(':retard')>=0&&String(evenementEffectifTresorerie20260831_).indexOf('evenementStandardPlanForecast20260912_')>=0,detail:'PlanEventForecastFix terminal intégré au propriétaire TreasuryForecastCorrections20260831'},
    {code:'SOUS_VUE_TRESORERIE_DUEFIX_CANONIQUE',ok:typeof sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_==='function'&&String(sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_).indexOf('evenementsCertainsDusInjectesSousVue')>=0,detail:'sous-vue DueFix intégrée au propriétaire BudgetSoftTreasuryCanonical20260907'},
    {code:'PROJECTION_SUBVIEW_DUEFIX_HORS_OVERRIDE_Z',ok:typeof auditerChaineProjectionSnapshotEvenementCertainBudgetSoft20260912==='function'&&typeof auditerEvenementCertainRetardeTresorerieBudgetSoft20260912==='function',detail:'ancien fichier Z converti en fichier d’audits uniquement'},
    {code:'PLAN_EVENT_FORECAST_HORS_OVERRIDE_Z',ok:typeof auditerEvenementsPrevusTresorerieBudgetSoft20260912==='function'&&typeof evenementProuveClosPlanForecast20260912_==='function',detail:'ancien PlanEventForecastFix Z converti en audit ; logique active chez propriétaire 20260831'},
    {code:'CERBERE_RT1_RECETTES_DUES_OWNER_EXPLICITE',ok:typeof enrichirCerbereRecettesCertainesDues20260919_==='function'&&String(enrichirCerbereRecettesCertainesDues20260919_).indexOf('revenueDueOwner20260919')>=0,detail:'enrichisseur Rt1 idempotent explicite partagé par snapshot et recalcul frais'},
    {code:'CERBERE_LECTEUR_HISTORIQUE_SANS_OVERRIDE_REVENUE_FINAL',ok:typeof chargerCerbereCockpit20260902==='function'&&String(chargerCerbereCockpit20260902).indexOf('versionRevenueIntermodule')<0,detail:'RevenueIntermoduleFinal ne redéfinit plus chargerCerbereCockpit20260902'},
    {code:'CERBERE_PROPRIETAIRE_MODERNE_HORS_FICHIER_Z',ok:typeof chargerCerbereCockpitProprietaire20260917_==='function'&&String(chargerCerbereCockpitProprietaire20260917_).indexOf('enrichirCerbereRecettesCertainesDues20260919_')>=0,detail:'propriétaire moderne Cerbère promu dans CerbereFreshHealthParity20260917.gs sans préfixe Z'},
    {code:'AUDITS_REVENUE_INTERMODULE_SANS_COLLISION_Z',ok:typeof auditerRecettesIntermodulesBudgetSoft20260912==='function'&&typeof auditerRecettesIntermodulesLegacyOwnerBudgetSoft20260912==='function'&&String(auditerRecettesIntermodulesBudgetSoft20260912)!==String(auditerRecettesIntermodulesLegacyOwnerBudgetSoft20260912),detail:'audit Final public conservé ; ancien Owner renommé legacy ; deux fichiers hors Z'},
    {code:'AUDITS_EP_P1_SS1_HET_HORS_FICHIER_Z',ok:typeof auditerCoeurEpBudgetSoft20260913==='function'&&typeof auditerMigrationEpIntermoduleBudgetSoft20260913==='function'&&typeof auditerP1DoctrineComptableGuideVieCompact20260912==='function'&&typeof auditerSS1EtHEt1Cerbere20260912==='function',detail:'audits EP, P1 compact et SS1/HEt1 promus hors préfixe Z'},
    {code:'CERBERE_CARDOWNER_VERSIONS_INTERMEDIAIRES_INTERNALISEES',ok:typeof appliquerReportCbCycleSuivantLegacyCardOwner20260912_==='function'&&typeof estSnapshotCerbereP1FraisValideLegacyCardOwner20260912_==='function',detail:'versions intermédiaires CardOwner renommées legacy ; noms canoniques libérés'},
    {code:'CERBERE_SNAPSHOT_C2_FRESHNESS_HORS_FICHIER_Z',ok:typeof auditerFraicheurSnapshotC2Cerbere20260913==='function'&&typeof estSnapshotCerbereP1FraisValideLegacyC2Freshness20260913_==='function',detail:'audit fraîcheur C2 promu hors Z ; garde C2 intermédiaire internalisée'},
    {code:'SCENARIO_STOCKAGE_20260916_INTERNALISE',ok:typeof capturerEtatControleLegacyBudgetSoft20260916_==='function'&&typeof lireEtatControleLegacyBudgetSoft20260916_==='function'&&typeof reinitialiserScenarioLegacyBudgetSoft20260916_==='function',detail:'anciens propriétaires DocumentProperties 20260916 conservés en legacy uniquement'},
    {code:'SCENARIO_STOCKAGE_DURABLE_HORS_FICHIER_Z',ok:typeof capturerEtatControleBudgetSoft20260916==='function'&&typeof lireEtatControleBudgetSoft20260916_==='function'&&typeof reinitialiserScenarioBudgetSoft20260916==='function'&&typeof auditerStockageScenarioBudgetSoft20260917==='function',detail:'stockage durable 20260917 devient propriétaire unique hors Z'},
    {code:'SCENARIO_TRANSITION_GUARD_HORS_FICHIER_Z',ok:typeof auditerTransitionImportFuturBudgetSoft20260917==='function',detail:'garde de transition scénario 20260917 promue hors Z'},
    {code:'SNAPSHOT_AUDIT_LOG_HORS_FICHIER_Z',ok:typeof auditerSnapshotGlobalBudgetSoft20260906==='function',detail:'audit snapshot global promu hors Z'},
    {code:'ORACLE_REGRESSION_LEGACY_SANS_COLLISION_Z',ok:typeof auditerOracleLegacyBudgetSoft80_20260906_==='function'&&typeof auditerOracleBudgetSoft80_20260906==='function'&&String(auditerOracleBudgetSoft80_20260906).indexOf('2026-09-06.8-final')>=0,detail:'oracle 20260906.7 internalisé legacy ; oracle 8-final reste seul public'},
    {code:'PLUXEE_DEDUPE_LEGACY_HORS_FICHIER_Z',ok:typeof clePluxeeLegacyDedupeFix_==='function'&&typeof clePluxee_==='function',detail:'ancienne clé dedupe Pluxee internalisée legacy ; propriétaire actif clePluxee_ conservé'},
    {code:'PLUXEE_BASE_OVERRIDES_INTERNALISES',ok:typeof initialiserPluxeeLegacyBase_==='function'&&typeof analyserLotPluxeeLegacyBase_==='function'&&typeof normaliserOperationPluxeeLegacyBase_==='function'&&typeof categoriePluxeeLegacyBase_==='function'&&typeof nettoyerLigneCollerPluxeeLegacyBase_==='function'&&typeof clePluxeeLegacyBase_==='function'&&typeof analyserLotPluxeeLegacyBatchPerformance_==='function',detail:'implémentations de base et analyse Batch intermédiaire conservées uniquement en legacy'},
    {code:'PLUXEE_PROPRIETAIRES_ACTIFS_HORS_FICHIER_Z',ok:typeof initialiserPluxee==='function'&&typeof analyserLotPluxee_==='function'&&typeof normaliserOperationPluxee_==='function'&&typeof categoriePluxee_==='function'&&typeof nettoyerLigneCollerPluxee_==='function'&&typeof clePluxee_==='function'&&typeof auditerPluxeeReview20260828==='function'&&typeof auditerDedupeRechargementsPluxee20260827==='function',detail:'Review, RechargeDedupe, ManualCategory, BatchPerformance et PasteIndent promus hors Z'},
    {code:'BANQUE_DEDUPE_V3_OVERRIDE_Z_RETIRE',ok:typeof dedoublonnerOperationsCartesCanonique20260906V3_==='function'&&typeof dedoublonnerOperationsCartesBudgetSoft_==='function'&&String(dedoublonnerOperationsCartesBudgetSoft_).indexOf('dedoublonnerOperationsCartesCanonique20260906V3_')>=0,detail:'façade historique dedupe V3 portée uniquement par BudgetSoftCanonicalBankDedup20260906'},
    {code:'BANQUE_DEDUPE_VENTILATION_LEGACY_INTERNALISE',ok:typeof dedoublonnerOperationsCartesLegacyVentilationBudgetSoft_==='function',detail:'ancienne déduplication OperationsVentilation internalisée ; ne concurrence plus la façade canonique V3'},
    {code:'BANQUE_ENRICHISSEMENT_BASE_INTERNALISE',ok:typeof normaliserEntreeBancaireLegacyIntegrity_==='function'&&typeof marchandCarteBudgetSoftLegacyEnrichment1_==='function'&&typeof categorieImportBudgetSoftLegacyEnrichment1_==='function',detail:'normalisation Integrity et helpers Enrichment1 dépassés conservés uniquement en legacy'},
    {code:'BANQUE_ENRICHISSEMENT_ACTIF_HORS_FICHIER_Z',ok:typeof normaliserEntreeBancaire_==='function'&&typeof marchandCarteBudgetSoft_==='function'&&typeof categorieImportBudgetSoft_==='function'&&typeof meilleureCorrespondanceCategorieImport_==='function',detail:'EnrichmentFix et EnrichmentFix2 promus hors Z sans collision'},
    {code:'BANQUE_SAFETY_PLANIFICATEUR_BASE_INTERNALISE',ok:typeof planifierSnapshotLegacySafetyV2V23_==='function',detail:'ancien planificateur SafetyV2 conservé en legacy uniquement'},
    {code:'BANQUE_SAFETY_IMPORT_PARTIEL_HORS_FICHIER_Z',ok:typeof planifierSnapshotV23_==='function'&&String(planifierSnapshotV23_).indexOf('const orphelines=[]')>=0,detail:'planificateur actif protège les imports partiels et est promu hors Z'},
    {code:'CERBERE_UI_TRESORERIE_CANONIQUE_HORS_FICHIER_Z',ok:typeof chargerTrajectoireBanqueCerbereRapide20260903==='function'&&typeof auditerTrajectoireCerbereUiCanonique20260913==='function'&&String(chargerTrajectoireBanqueCerbereRapide20260903).indexOf('chargerTresorerieUnifieeBudgetSoft20260907')>=0&&typeof chargerTrajectoireBanqueCerbereRapideLegacyPerformance20260903_==='function',detail:'ancienne façade TreasuryForecastPerformance internalisée ; adaptateur canonique UI Cerbère seul public hors Z'},
    {code:'SNAPSHOT_GLOBAL_CONSTRUCTEUR_PUBLIC_PROMU',ok:typeof reconstruireSnapshotGlobalBudgetSoft20260906==='function'&&String(reconstruireSnapshotGlobalBudgetSoft20260906).indexOf('reconstruireSnapshotGlobalSyntheseBudgetSoft20260907')>=0&&typeof reconstruireSnapshotGlobalLegacyBudgetSoft20260906_==='function',detail:'nom public -> constructeur synthèse ; ancien constructeur internalisé'}
  ];
  const out={ok:controles.every(c=>c.ok),version:BUDGETSOFT_STRUCTURAL_CLEANUP_20260917_VERSION,lectureSeule:true,dureeMs:Date.now()-t0,controles,clesLocales:{comptes:clesComptes,operations:clesOperations},architecture:{endpointEcriture:'sauvegarderPilotageCerberePublic20260917',aliasEcriture:'sauvegarderPilotageCerbere20260903',ownerLecture:'chargerCerbereCockpitProprietaire20260917_',endpointLecture:'chargerCerbereCockpitCanonique20260914',legacyEpInterne:'sauvegarderPilotageCerbereLegacyEp20260912_',legacyDashboardInterne:'lirePilotableParJourDashboardLegacy20260912_'}};
  const echecs=controles.filter(function(c){return !c.ok;}).map(function(c){return{code:c.code,detail:c.detail};});
  console.log('[AUDIT NETTOYAGE STRUCTUREL ECHECS 20260917] '+JSON.stringify({ok:echecs.length===0,version:BUDGETSOFT_STRUCTURAL_CLEANUP_20260917_VERSION,nombre:echecs.length,echecs:echecs}));
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
