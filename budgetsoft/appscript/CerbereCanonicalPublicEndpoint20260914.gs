/*
 * Cerbère — entrée publique canonique unique — 2026-09-14.
 *
 * Stabilisation 2026-09-17 : l'UI garde cet endpoint stable, mais l'endpoint ne
 * dépend plus exclusivement du snapshot global. Si le snapshot est absent,
 * périmé ou incompatible, il délègue au propriétaire public Cerbère courant,
 * qui sait servir un snapshot valide ou recalculer frais.
 */
const CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION='2026-09-17.1';

function chargerCerbereCockpitCanonique20260914(){
  const t0=Date.now();
  const attendu=typeof BUDGETSOFT_CERBERE_CF_SNAPSHOT_BUILD_20260914_VERSION!=='undefined'
    ?String(BUDGETSOFT_CERBERE_CF_SNAPSHOT_BUILD_20260914_VERSION)
    :'2026-09-14.4';

  let snapshot=null;
  let erreurSnapshot='';
  if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function'){
    try{snapshot=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();}
    catch(e){erreurSnapshot=String(e&&e.message||e);}
  }else{
    erreurSnapshot='Adaptateur du snapshot global Cerbère indisponible.';
  }

  const build=String(snapshot&&snapshot.diagnostic&&snapshot.diagnostic.cfSnapshotBuild20260914&&snapshot.diagnostic.cfSnapshotBuild20260914.version||'');
  if(snapshot&&snapshot.ok!==false&&build===attendu){
    snapshot.ok=true;
    snapshot.sourceBudgetSoft='snapshot_global_endpoint_canonique_20260914';
    snapshot.versionEndpointCanonique=CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION;
    snapshot.cfSnapshotBuildVersion=build;
    snapshot.dureeEndpointCanoniqueMs=Date.now()-t0;
    return snapshot;
  }

  // Fallback obligatoire : l'absence/péremption d'un cache ne doit jamais rendre
  // Cerbère indisponible si son moteur métier peut recalculer la vue.
  if(typeof chargerCerbereCockpit20260902==='function'){
    try{
      const frais=chargerCerbereCockpit20260902();
      if(frais&&frais.ok!==false){
        frais.ok=true;
        frais.sourceBudgetSoft=String(frais.sourceBudgetSoft||frais.source||'recalcul_secours');
        frais.versionEndpointCanonique=CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION;
        frais.cfSnapshotBuildVersion=String(frais&&frais.diagnostic&&frais.diagnostic.cfSnapshotBuild20260914&&frais.diagnostic.cfSnapshotBuild20260914.version||'');
        frais.fallbackEndpointCanonique=true;
        frais.raisonFallbackEndpointCanonique=snapshot&&snapshot.ok!==false&&build!==attendu
          ?'snapshot_cf_build_incompatible'
          :(erreurSnapshot?'snapshot_erreur':'snapshot_indisponible');
        frais.dureeEndpointCanoniqueMs=Date.now()-t0;
        return frais;
      }
      return Object.assign({},frais||{}, {
        ok:false,
        versionEndpointCanonique:CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION,
        erreur:String(frais&&frais.erreur||frais&&frais.message||'Recalcul Cerbère indisponible.')
      });
    }catch(e){
      return{
        ok:false,
        versionEndpointCanonique:CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION,
        erreur:'Snapshot et recalcul Cerbère indisponibles : '+String(e&&e.message||e),
        erreurSnapshot:erreurSnapshot||''
      };
    }
  }

  return{
    ok:false,
    versionEndpointCanonique:CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION,
    sourceBudgetSoft:String(snapshot&&snapshot.sourceBudgetSoft||snapshot&&snapshot.source||''),
    revisionBudgetSoft:String(snapshot&&snapshot.revisionBudgetSoft||''),
    cfSnapshotBuildVersion:build,
    cfSnapshotBuildAttendue:attendu,
    erreur:erreurSnapshot||String(snapshot&&snapshot.erreur||snapshot&&snapshot.message||'Snapshot Cerbère indisponible et aucun fallback frais n’est disponible.')
  };
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
    fallback:!!(r&&r.fallbackEndpointCanonique),
    raisonFallback:r&&r.raisonFallbackEndpointCanonique||'',
    cf2:Number(p2.cft2||0),
    p2:Number(p2.p2||0),
    ownerVersion:String(a2.ownerVersion||''),
    erreur:r&&r.erreur||''
  };
  console.log('[AUDIT ENDPOINT CANONIQUE CERBERE 20260914] '+JSON.stringify(out));
  return out;
}
