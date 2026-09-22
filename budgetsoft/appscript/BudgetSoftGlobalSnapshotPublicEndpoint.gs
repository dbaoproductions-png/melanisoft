/*
 * Façade publique canonique du snapshot global BudgetSoft.
 *
 * Les anciens helpers publics ont été internalisés dans le fichier historique
 * 20260906 : ce fichier ne dépend donc plus d'un chargement lexical tardif.
 * Les noms publics historiques sont conservés pour compatibilité UI/déclencheurs,
 * et délèguent tous au constructeur synthèse autoritaire 20260907.
 */
const BUDGETSOFT_SNAPSHOT_SYNTHESE_PROMOTION_VERSION='2026-09-22.1';

function reconstruireSnapshotGlobalAvecHistoriqueAnalyses20260922_(origine){
  const r=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907(String(origine||'standard_synthese'));
  if(r&&r.ok===true&&r.publie===true&&typeof enregistrerHistoriqueStructurelAnalysesBudgetSoft20260922_==='function'){
    try{
      const s=typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():null;
      const etat=s&&s.disponible&&s.etat?s.etat:null;
      r.historisationAnalyses=enregistrerHistoriqueStructurelAnalysesBudgetSoft20260922_(etat);
    }catch(e){r.historisationAnalyses={ok:false,erreur:String(e&&e.message||e)};}
  }
  return r;
}

function reconstruireSnapshotGlobalBudgetSoft20260906(origine){
  return reconstruireSnapshotGlobalAvecHistoriqueAnalyses20260922_(String(origine||'standard_synthese'));
}

function actualiserBudgetSoftToutesLes30Minutes20260906(){
  return reconstruireSnapshotGlobalAvecHistoriqueAnalyses20260922_('planifie_30min');
}

function actualiserBudgetSoftMaintenant20260906(){
  return reconstruireSnapshotGlobalAvecHistoriqueAnalyses20260922_('manuel_force');
}

function initialiserArchitectureSnapshotBudgetSoft20260906(){
  const installation=installerActualisationGlobaleBudgetSoft20260906();
  const etat=reconstruireSnapshotGlobalAvecHistoriqueAnalyses20260922_('initialisation');
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
