/*
 * Promotion du constructeur global synthèse — 2026-09-07.
 *
 * Ce fichier est volontairement chargé après les sources historiques dans le
 * payload Apps Script (tri lexical). Il conserve les noms publics historiques
 * afin que les déclencheurs, boutons et appels existants utilisent désormais
 * le constructeur synthèse validé en TEST.
 *
 * L'ancien moteur reste présent dans le dépôt comme solution de repli documentaire,
 * mais n'est plus l'entrée publique autoritaire après chargement de ce fichier.
 */
const BUDGETSOFT_SNAPSHOT_SYNTHESE_PROMOTION_VERSION='2026-09-07.1';

function reconstruireSnapshotGlobalBudgetSoft20260906(origine){
  return reconstruireSnapshotGlobalSyntheseBudgetSoft20260907(String(origine||'standard_synthese'));
}

function actualiserBudgetSoftToutesLes30Minutes20260906(){
  return reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('planifie_30min');
}

function actualiserBudgetSoftMaintenant20260906(){
  return reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('manuel_force');
}

function initialiserArchitectureSnapshotBudgetSoft20260906(){
  const installation=installerActualisationGlobaleBudgetSoft20260906();
  const etat=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('initialisation');
  return{ok:!!(installation&&installation.ok&&etat&&etat.ok),versionPromotion:BUDGETSOFT_SNAPSHOT_SYNTHESE_PROMOTION_VERSION,installation:installation,etat:etat};
}

function auditerPromotionSnapshotSyntheseBudgetSoft20260907(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat;
  const d=e&&e.modules&&e.modules.dashboard;
  const r={
    ok:!!(e&&e.ok===true&&e.versionConstructeur===BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION&&d&&d.version===BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION),
    versionPromotion:BUDGETSOFT_SNAPSHOT_SYNTHESE_PROMOTION_VERSION,
    versionConstructeur:e&&e.versionConstructeur||'',
    revisionBudgetSoft:e&&e.revisionBudgetSoft||'',
    dashboardVersion:d&&d.version||'',
    versionCorrection:d&&d.versionCorrection||'',
    solde:d&&d.courtTerme&&d.courtTerme.soldeBancaire,
    pilotable:d&&d.courtTerme&&d.courtTerme.pilotableDisponible,
    performance:e&&e.performance||null
  };
  console.log('[PROMOTION Snapshot Synthese] '+JSON.stringify(r));
  return r;
}
