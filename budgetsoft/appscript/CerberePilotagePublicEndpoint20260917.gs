/*
 * Cerbère — endpoint public unique d'écriture du pilotage — 2026-09-17.
 *
 * Contrat : l'UI conserve le nom historique sauvegarderPilotageCerbere20260903,
 * mais une seule définition publique subsiste. Elle délègue à la couche de
 * fraîcheur, qui appelle le moteur métier puis invalide le snapshot global.
 */
const CERBERE_PILOTAGE_PUBLIC_ENDPOINT_20260917_VERSION='2026-09-17.2';
const CERBERE_PILOTAGE_TRACE_AT_20260917='CERBERE_PILOTAGE_ENDPOINT_LAST_CALL_AT';
const CERBERE_PILOTAGE_TRACE_RESULT_20260917='CERBERE_PILOTAGE_ENDPOINT_LAST_RESULT';

function sauvegarderPilotageCerbere20260903(d){
  const p=PropertiesService.getDocumentProperties(),appeleLe=new Date().toISOString();
  p.setProperty(CERBERE_PILOTAGE_TRACE_AT_20260917,appeleLe);
  if(typeof sauvegarderPilotageCerbereAvecFraicheur20260917_!=='function'){
    p.setProperty(CERBERE_PILOTAGE_TRACE_RESULT_20260917,'proprietaire_indisponible');
    throw new Error('Propriétaire de sauvegarde Cerbère indisponible.');
  }
  try{
    const r=sauvegarderPilotageCerbereAvecFraicheur20260917_(d);
    p.setProperty(CERBERE_PILOTAGE_TRACE_RESULT_20260917,'ok');
    if(r&&typeof r==='object'){
      r.versionEndpointEcritureCerbere=CERBERE_PILOTAGE_PUBLIC_ENDPOINT_20260917_VERSION;
      r.sourceEcritureCerbere='endpoint_public_unique_20260917';
      r.endpointAppeleLe=appeleLe;
    }
    return r;
  }catch(e){
    p.setProperty(CERBERE_PILOTAGE_TRACE_RESULT_20260917,'erreur:'+String(e&&e.message||e));
    throw e;
  }
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
    derniereInvocation:{
      appeleeLe:p.getProperty(CERBERE_PILOTAGE_TRACE_AT_20260917)||'',
      resultat:p.getProperty(CERBERE_PILOTAGE_TRACE_RESULT_20260917)||''
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
