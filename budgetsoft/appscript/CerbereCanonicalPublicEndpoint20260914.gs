/*
 * Cerbère — entrée publique canonique unique — 2026-09-14.
 *
 * Cette fonction est volontairement dotée d'un nom inédit : l'UI ne dépend plus
 * des nombreuses redéfinitions historiques de chargerCerbereCockpit20260902().
 * Le calcul métier reste propriétaire des moteurs Cerbère / Charges_fixes ; cette
 * entrée ne fait que servir la révision globale cohérente déjà construite.
 */
const CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION='2026-09-14.2';

function chargerCerbereCockpitCanonique20260914(){
  const t0=Date.now();
  const attendu=typeof BUDGETSOFT_CERBERE_CF_SNAPSHOT_BUILD_20260914_VERSION!=='undefined'
    ?String(BUDGETSOFT_CERBERE_CF_SNAPSHOT_BUILD_20260914_VERSION)
    :'2026-09-14.4';

  if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906!=='function'){
    return{
      ok:false,
      version:CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION,
      erreur:'Adaptateur du snapshot global Cerbère indisponible.'
    };
  }

  let r;
  try{
    r=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();
  }catch(e){
    return{
      ok:false,
      version:CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION,
      erreur:'Lecture du snapshot Cerbère impossible : '+String(e&&e.message||e)
    };
  }

  if(!r||r.ok===false){
    return Object.assign({},r||{}, {
      ok:false,
      versionEndpointCanonique:CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION,
      erreur:String(r&&r.erreur||r&&r.message||'Snapshot Cerbère indisponible.')
    });
  }

  const build=String(r&&r.diagnostic&&r.diagnostic.cfSnapshotBuild20260914&&r.diagnostic.cfSnapshotBuild20260914.version||'');
  if(build!==attendu){
    return{
      ok:false,
      versionEndpointCanonique:CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION,
      sourceBudgetSoft:String(r.sourceBudgetSoft||r.source||''),
      revisionBudgetSoft:String(r.revisionBudgetSoft||''),
      cfSnapshotBuildVersion:build,
      cfSnapshotBuildAttendue:attendu,
      erreur:'Le snapshot Cerbère n’est pas encore construit avec le propriétaire canonique Charges_fixes ('+attendu+').'
    };
  }

  r.ok=true;
  r.sourceBudgetSoft='snapshot_global_endpoint_canonique_20260914';
  r.versionEndpointCanonique=CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION;
  r.cfSnapshotBuildVersion=build;
  r.dureeEndpointCanoniqueMs=Date.now()-t0;
  return r;
}

function auditerEndpointCanoniqueCerbere20260914(){
  const r=chargerCerbereCockpitCanonique20260914();
  const p2=r&&r.diagnostic&&r.diagnostic.p2Doctrine20260913||{};
  const a2=p2&&p2.cft2Audit||{};
  const out={
    ok:!!(r&&r.ok!==false),
    version:CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION,
    source:r&&r.sourceBudgetSoft||'',
    revisionBudgetSoft:r&&r.revisionBudgetSoft||'',
    cfSnapshotBuildVersion:r&&r.cfSnapshotBuildVersion||'',
    cf2:Number(p2.cft2||0),
    p2:Number(p2.p2||0),
    ownerVersion:String(a2.ownerVersion||''),
    erreur:r&&r.erreur||''
  };
  console.log('[AUDIT ENDPOINT CANONIQUE CERBERE 20260914] '+JSON.stringify(out));
  return out;
}
