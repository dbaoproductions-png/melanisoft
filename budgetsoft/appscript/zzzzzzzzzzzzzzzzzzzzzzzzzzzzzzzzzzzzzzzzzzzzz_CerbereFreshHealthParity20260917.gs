/*
 * BudgetSoft — parité Cerbère frais / snapshot — 2026-09-17.
 *
 * Le moteur frais historique publiait encore la consommation Santé brute/ancienne
 * avant la normalisation Santé appliquée par le snapshot synthèse. Cette couche
 * terminale applique la même doctrine Santé au fallback frais de l'endpoint
 * public Cerbère, afin qu'un snapshot périmé ne fasse plus varier les cartes.
 */
const CERBERE_FRESH_HEALTH_PARITY_20260917_VERSION='2026-09-17.1';

function normaliserCerbereFraisPublic20260917_(base){
  if(!base||base.ok===false)return base;
  let out=base;
  if(typeof normaliserCerbereSantePourSnapshot20260915_==='function'){
    out=normaliserCerbereSantePourSnapshot20260915_(out)||out;
  }
  if(typeof synchroniserAgregatsApresSante20260915_==='function'){
    out=synchroniserAgregatsApresSante20260915_(out)||out;
  }
  out.diagnostic=out.diagnostic||{};
  out.diagnostic.pariteCerbereFraisSante20260917={
    ok:true,
    version:CERBERE_FRESH_HEALTH_PARITY_20260917_VERSION,
    doctrine:'Le fallback frais public applique la même normalisation Santé que le snapshot synthèse avant publication des cartes.'
  };
  return out;
}

/*
 * Override terminal de l'endpoint public. Le chemin snapshot valide reste inchangé.
 * Seul le fallback frais est normalisé avant publication.
 */
function chargerCerbereCockpit20260902(){
  try{
    if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function'){
      const snapshot=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();
      if(snapshot&&snapshot.ok!==false&&snapshot.source==='snapshot_global'&&
         typeof estSnapshotCerbereP1FraisValide20260912_==='function'&&
         estSnapshotCerbereP1FraisValide20260912_(snapshot)){
        snapshot.sourceBudgetSoft='snapshot_global';
        snapshot.versionSnapshotFirst=typeof CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION!=='undefined'
          ?CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION
          :'';
        return typeof publierValeursCartesDepuisOwnerP120260912_==='function'
          ?publierValeursCartesDepuisOwnerP120260912_(snapshot)
          :snapshot;
      }
    }
  }catch(e){}

  const frais=typeof recalculerCerbereCockpitP1Frais20260912_==='function'
    ?recalculerCerbereCockpitP1Frais20260912_()
    :null;
  const normalise=normaliserCerbereFraisPublic20260917_(frais);
  if(typeof publierValeursCartesDepuisOwnerP120260912_==='function'){
    return publierValeursCartesDepuisOwnerP120260912_(normalise);
  }
  return normalise;
}

function auditerPariteEndpointCerbereSante20260917(){
  const x=chargerCerbereCockpit20260902();
  const ps=Array.isArray(x&&x.periodes)?x.periodes.slice(0,2):[];
  const cycles=ps.map(function(p,index){
    const env=Array.isArray(p&&p.enveloppes)?p.enveloppes:[];
    const s=env.find(function(e){
      return typeof estCategorieSante20260915_==='function'
        ?estCategorieSante20260915_(e&&e.categorie)
        :String(e&&e.categorie||'').toLowerCase()==='santé';
    })||{};
    const c=p&&p.v37&&p.v37.cockpit20260902||{};
    return{
      index:index+1,
      cle:String(p&&p.clePilotage||''),
      santeNet:Number(s.reelNetPrevisionnel||0),
      santeBrut:Number(s.reelSanteBrut20260915||0),
      remboursements:Number(s.remboursementsSanteEncaisses20260915||0),
      consommePilotable:Number(c.consommePilotable||0),
      epDisponible:Number(c.epDisponible||0),
      pDisponible:Number(c.pDisponible!=null?c.pDisponible:c.ret1||0)
    };
  });
  const out={
    ok:!!(x&&x.ok!==false)&&cycles.length>=2,
    version:CERBERE_FRESH_HEALTH_PARITY_20260917_VERSION,
    source:String(x&&x.source||x&&x.sourceBudgetSoft||''),
    revisionBudgetSoft:String(x&&x.revisionBudgetSoft||''),
    pariteDiagnostic:x&&x.diagnostic&&x.diagnostic.pariteCerbereFraisSante20260917||null,
    cycles:cycles
  };
  console.log('[AUDIT PARITE ENDPOINT CERBERE SANTE 20260917] '+JSON.stringify(out));
  return out;
}
