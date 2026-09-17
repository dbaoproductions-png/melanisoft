/*
 * Cerbère — endpoint public unique d'écriture du pilotage — 2026-09-17.
 *
 * Contrat : l'UI historique peut encore appeler sauvegarderPilotageCerbere20260903,
 * mais le propriétaire public explicite est désormais sauvegarderPilotageCerberePublic20260917.
 * Les deux routes convergent vers la même couche de fraîcheur, puis le même moteur métier.
 */
const CERBERE_PILOTAGE_PUBLIC_ENDPOINT_20260917_VERSION='2026-09-17.3';
const CERBERE_PILOTAGE_TRACE_AT_20260917='CERBERE_PILOTAGE_ENDPOINT_LAST_CALL_AT';
const CERBERE_PILOTAGE_TRACE_RESULT_20260917='CERBERE_PILOTAGE_ENDPOINT_LAST_RESULT';

function sauvegarderPilotageCerberePublic20260917(d){
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

/** Alias de compatibilité pour les anciens consommateurs UI. */
function sauvegarderPilotageCerbere20260903(d){
  return sauvegarderPilotageCerberePublic20260917(d);
}

/**
 * Sonde contrôlée : réenregistre exactement les valeurs actuellement publiées
 * pour le cycle courant. Elle ne change ni EP ni molettes, mais doit invalider
 * la révision globale comme toute vraie écriture Cerbère.
 */
function testerEcritureCerbereSansChangement20260917(){
  const b=chargerCerbereCockpitCanonique20260914();
  const p=b&&Array.isArray(b.periodes)?b.periodes[0]:null;
  if(!p)throw new Error('Cycle Cerbère courant indisponible.');
  const c=p.v37&&p.v37.cockpit20260902||{};
  const d={
    cle:String(p.clePilotage||''),
    p1Cible:Number(c.p1Total!=null?c.p1Total:c.p1Cible||0),
    pilotableActualise:Number(c.budgetPilotableActualise||0),
    postes:(Array.isArray(p.enveloppes)?p.enveloppes:[]).map(x=>({categorie:String(x&&x.categorie||''),montant:Number(x&&x.prevu||0)}))
  };
  if(!d.cle)throw new Error('Clé de cycle Cerbère manquante.');
  const r=sauvegarderPilotageCerberePublic20260917(d);
  const out={ok:!!(r&&r.ok),version:CERBERE_PILOTAGE_PUBLIC_ENDPOINT_20260917_VERSION,mutationControlee:true,cle:d.cle,p1Cible:d.p1Cible,postes:d.postes.length,resultat:r};
  console.log('[TEST ECRITURE CERBERE SANS CHANGEMENT 20260917] '+JSON.stringify(out));
  return out;
}

function auditerEndpointEcritureCerbere20260917(){
  const p=PropertiesService.getDocumentProperties();
  const out={
    ok:typeof sauvegarderPilotageCerberePublic20260917==='function'&&
       typeof sauvegarderPilotageCerbere20260903==='function'&&
       typeof sauvegarderPilotageCerbereAvecFraicheur20260917_==='function'&&
       typeof sauvegarderPilotageCerbereMoteur20260903_==='function'&&
       typeof marquerSnapshotGlobalBudgetSoftObsolete20260916_==='function',
    version:CERBERE_PILOTAGE_PUBLIC_ENDPOINT_20260917_VERSION,
    lectureSeule:true,
    fonctions:{
      endpointPublicUnique:typeof sauvegarderPilotageCerberePublic20260917==='function',
      aliasHistorique:typeof sauvegarderPilotageCerbere20260903==='function',
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
    doctrine:'endpoint public explicite -> propriétaire fraîcheur -> moteur métier -> invalidation snapshot global; alias historique conservé temporairement'
  };
  console.log('[AUDIT ENDPOINT ECRITURE CERBERE 20260917] '+JSON.stringify(out));
  return out;
}
