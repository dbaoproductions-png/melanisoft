/*
 * Compatibilité Cerbère historique — 2026-09-18.
 *
 * L'ancien nom public reste disponible pour les consommateurs historiques,
 * mais il ne possède plus aucun moteur ni aucune logique snapshot-first.
 * Toute lecture converge vers l'endpoint canonique moderne.
 */
const BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_FINAL_VERSION='2026-09-18.1';

function chargerCerbereCockpit20260902(){
  if(typeof chargerCerbereCockpitCanonique20260914!=='function'){
    return{ok:false,version:BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_FINAL_VERSION,erreur:'Endpoint canonique Cerbère indisponible.'};
  }
  return chargerCerbereCockpitCanonique20260914();
}

function auditerEntreePubliqueCerbereSnapshotFirst20260906(){
  const t0=Date.now(),r=chargerCerbereCockpit20260902();
  const source=String(r&&r.sourceBudgetSoft||r&&r.source||'');
  const out={
    ok:!!(r&&r.ok!==false&&typeof chargerCerbereCockpitCanonique20260914==='function'),
    version:BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_FINAL_VERSION,
    aliasHistorique:true,
    proprietaire:'chargerCerbereCockpitCanonique20260914',
    source:source,
    revisionBudgetSoft:String(r&&r.revisionBudgetSoft||''),
    dureeMs:Date.now()-t0,
    periodes:Array.isArray(r&&r.periodes)?r.periodes.length:0
  };
  console.log('[AUDIT ALIAS CERBERE HISTORIQUE 20260918] '+JSON.stringify(out));
  return out;
}
