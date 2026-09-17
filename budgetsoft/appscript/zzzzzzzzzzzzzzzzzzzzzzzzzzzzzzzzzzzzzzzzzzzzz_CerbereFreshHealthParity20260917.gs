/*
 * BudgetSoft — parité Cerbère frais / snapshot — 2026-09-17.
 *
 * Le moteur frais historique publiait encore la consommation Santé brute/ancienne
 * avant la normalisation Santé appliquée par le snapshot synthèse. Cette couche
 * terminale applique la même doctrine Santé au fallback frais de l'endpoint
 * public Cerbère, et resynchronise les agrégats APRÈS la publication des cartes :
 * publierValeursCartesDepuisOwnerP120260912_ republie en effet des valeurs issues
 * du diagnostic P1 antérieur à la normalisation Santé.
 */
const CERBERE_FRESH_HEALTH_PARITY_20260917_VERSION='2026-09-17.2';

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
    doctrine:'Le fallback frais public applique la même normalisation Santé que le snapshot synthèse avant publication des cartes, puis resynchronise les agrégats après publication.'
  };
  return out;
}

function publierPuisResynchroniserCerbereSante20260917_(base){
  if(!base||base.ok===false)return base;
  let out=base;
  if(typeof publierValeursCartesDepuisOwnerP120260912_==='function'){
    out=publierValeursCartesDepuisOwnerP120260912_(out)||out;
  }
  /*
   * Important : publierValeursCartesDepuisOwnerP120260912_ remet notamment
   * consommePilotable / pDisponible depuis diagnostic.p1Doctrine20260912,
   * diagnostic calculé avant la normalisation Santé. On réapplique donc le
   * propriétaire Santé des agrégats en dernier.
   */
  if(typeof synchroniserAgregatsApresSante20260915_==='function'){
    out=synchroniserAgregatsApresSante20260915_(out)||out;
  }
  return out;
}

/*
 * Override terminal de l'endpoint public. Snapshot valide et fallback frais
 * convergent vers le même ordre de publication : doctrine Santé -> cartes ->
 * resynchronisation finale des agrégats Santé/EP/P disponible.
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
        return publierPuisResynchroniserCerbereSante20260917_(snapshot);
      }
    }
  }catch(e){}

  const frais=typeof recalculerCerbereCockpitP1Frais20260912_==='function'
    ?recalculerCerbereCockpitP1Frais20260912_()
    :null;
  const normalise=normaliserCerbereFraisPublic20260917_(frais);
  return publierPuisResynchroniserCerbereSante20260917_(normalise);
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
    const ep=p&&p.enveloppePilotable||{};
    return{
      index:index+1,
      cle:String(p&&p.clePilotage||''),
      santeNet:Number(s.reelNetPrevisionnel||0),
      santeBrut:Number(s.reelSanteBrut20260915||0),
      remboursements:Number(s.remboursementsSanteEncaisses20260915||0),
      consommePilotable:Number(c.consommePilotable||0),
      epConsomme:Number(c.epConsomme!=null?c.epConsomme:ep.consomme||0),
      epDisponible:Number(c.epDisponible!=null?c.epDisponible:ep.reste||0),
      pSoutenable:Number(c.pSoutenable!=null?c.pSoutenable:c.p1Total||0),
      pDisponible:Number(c.pDisponible!=null?c.pDisponible:c.ret1||0)
    };
  });
  const incoherences=[];
  cycles.forEach(function(c){
    const arr=function(n){return Math.round((Number(n)||0)*100)/100;};
    if(Math.abs(arr(c.consommePilotable)-arr(c.epConsomme))>0.01){
      incoherences.push({index:c.index,code:'CONSOMME_EP_DIFFERENT',consommePilotable:c.consommePilotable,epConsomme:c.epConsomme});
    }
    if(Math.abs(arr(c.pDisponible)-arr(c.pSoutenable-c.consommePilotable))>0.01){
      incoherences.push({index:c.index,code:'P_DISPONIBLE_INCOHERENT',pSoutenable:c.pSoutenable,consommePilotable:c.consommePilotable,pDisponible:c.pDisponible});
    }
  });
  const out={
    ok:!!(x&&x.ok!==false)&&cycles.length>=2&&incoherences.length===0,
    version:CERBERE_FRESH_HEALTH_PARITY_20260917_VERSION,
    source:String(x&&x.source||x&&x.sourceBudgetSoft||''),
    revisionBudgetSoft:String(x&&x.revisionBudgetSoft||''),
    pariteDiagnostic:x&&x.diagnostic&&x.diagnostic.pariteCerbereFraisSante20260917||null,
    cycles:cycles,
    incoherences:incoherences
  };
  console.log('[AUDIT PARITE ENDPOINT CERBERE SANTE 20260917] '+JSON.stringify(out));
  return out;
}
