/*
 * Cerbère — entrée publique canonique unique — 2026-09-14.
 *
 * Stabilisation 2026-09-17 : l'UI garde cet endpoint stable. Le snapshot global
 * est servi lorsqu'il est compatible ; sinon l'endpoint délègue au propriétaire
 * interne moderne chargerCerbereCockpitProprietaire20260917_().
 */
const CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION='2026-09-21.1';

function harmoniserSoldeReelCerbereCanonique20260918_(r){
  if(!r||r.ok===false)return r;
  try{
    const tres=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'
      ?lireModuleSnapshotGlobalBudgetSoft20260906_('tresorerieComptable')
      :null;
    const solde=Number(tres&&tres.soldeReel);
    if(Number.isFinite(solde)){
      r.reel=r.reel||{};
      r.reel.soldeBancaire=Math.round(solde*100)/100;
      r.reel.dateReference=String(tres.dateReference||'');
      r.reel.sourceSoldeBancaire='snapshot_global.tresorerieComptable.soldeReel';
      r.diagnostic=r.diagnostic||{};
      r.diagnostic.soldeReelCanonique20260918={
        ok:true,
        version:'2026-09-21.1',
        solde:r.reel.soldeBancaire,
        dateReference:r.reel.dateReference,
        revisionBudgetSoft:String(tres.revisionBudgetSoft||r.revisionBudgetSoft||''),
        source:'tresorerieComptable du snapshot global',
        doctrine:'Une valeur transversale, un propriétaire : Cerbère affiche le solde réel canonique de la même révision BudgetSoft, sans recalcul local.'
      };
    }
  }catch(e){
    r.diagnostic=r.diagnostic||{};
    r.diagnostic.soldeReelCanonique20260918={ok:false,version:'2026-09-21.1',erreur:String(e&&e.message||e)};
  }
  return r;
}

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
    harmoniserSoldeReelCerbereCanonique20260918_(snapshot);
    snapshot.dureeEndpointCanoniqueMs=Date.now()-t0;
    return snapshot;
  }

  // Lecture publique snapshot-only : le moteur Cerbère frais reste propriétaire
  // de construction/diagnostic, mais l'UI ne doit jamais lancer un second calcul
  // métier quand la révision globale est absente ou incompatible.


  return{
    ok:false,
    versionEndpointCanonique:CERBERE_CANONICAL_PUBLIC_ENDPOINT_20260914_VERSION,
    sourceBudgetSoft:String(snapshot&&snapshot.sourceBudgetSoft||snapshot&&snapshot.source||''),
    revisionBudgetSoft:String(snapshot&&snapshot.revisionBudgetSoft||''),
    cfSnapshotBuildVersion:build,
    cfSnapshotBuildAttendue:attendu,
    erreur:erreurSnapshot||String(snapshot&&snapshot.erreur||snapshot&&snapshot.message||'Snapshot Cerbère indisponible et propriétaire moderne indisponible.')
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
