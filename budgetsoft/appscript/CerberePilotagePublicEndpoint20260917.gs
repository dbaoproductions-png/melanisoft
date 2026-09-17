/*
 * Cerbère — endpoint public unique d'écriture du pilotage — 2026-09-17.
 *
 * Contrat : l'UI conserve le nom historique sauvegarderPilotageCerbere20260903,
 * mais une seule définition publique subsiste. Elle délègue à la couche de
 * fraîcheur, qui appelle le moteur métier puis invalide le snapshot global.
 */
const CERBERE_PILOTAGE_PUBLIC_ENDPOINT_20260917_VERSION='2026-09-17.1';

function sauvegarderPilotageCerbere20260903(d){
  if(typeof sauvegarderPilotageCerbereAvecFraicheur20260917_!=='function'){
    throw new Error('Propriétaire de sauvegarde Cerbère indisponible.');
  }
  const r=sauvegarderPilotageCerbereAvecFraicheur20260917_(d);
  if(r&&typeof r==='object'){
    r.versionEndpointEcritureCerbere=CERBERE_PILOTAGE_PUBLIC_ENDPOINT_20260917_VERSION;
    r.sourceEcritureCerbere='endpoint_public_unique_20260917';
  }
  return r;
}

function auditerEndpointEcritureCerbere20260917(){
  const p=PropertiesService.getDocumentProperties();
  const out={
    ok:typeof sauvegarderPilotageCerbere20260903==='function'&&
       typeof sauvegarderPilotageCerbereAvecFraicheur20260917_==='function'&&
       typeof sauvegarderPilotageCerbereMoteur20260903_==='function'&&
       typeof marquerSnapshotGlobalBudgetSoftObsolete20260916_==='function',
    version:CERBERE_PILOTAGE_PUBLIC_ENDPOINT_20260917_VERSION,
    lectureSeule:true,
    fonctions:{
      endpointPublic:typeof sauvegarderPilotageCerbere20260903==='function',
      proprietaireFraicheur:typeof sauvegarderPilotageCerbereAvecFraicheur20260917_==='function',
      moteurMetier:typeof sauvegarderPilotageCerbereMoteur20260903_==='function',
      invalidationSnapshot:typeof marquerSnapshotGlobalBudgetSoftObsolete20260916_==='function'
    },
    etatAvantMutation:{
      projectionDirty:p.getProperty('BUDGETSOFT_PROJECTION_DIRTY')==='true',
      snapshotDirtyLe:p.getProperty('BUDGETSOFT_GLOBAL_SNAPSHOT_DIRTY_LE')||'',
      snapshotDirtyOrigine:p.getProperty('BUDGETSOFT_GLOBAL_SNAPSHOT_DIRTY_ORIGINE')||''
    },
    doctrine:'endpoint public unique -> propriétaire fraîcheur -> moteur métier -> invalidation snapshot global'
  };
  console.log('[AUDIT ENDPOINT ECRITURE CERBERE 20260917] '+JSON.stringify(out));
  return out;
}
