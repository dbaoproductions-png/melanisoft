const AUDIT_PERF_BUDGETSOFT_20260827_VERSION='2026-08-27.1';

/**
 * Audit de non-régression ciblé sur Cerbère Express.
 * Compare le résultat historique (sans mémoïsation) au résultat optimisé.
 * Aucun écrit dans le classeur.
 */
function auditerNonRegressionPerfCerbereExpress20260827(){
  const t0=Date.now();
  const avant=chargerVueCerbereExpressSansContexte20260827_();
  const dureeAvant=Date.now()-t0;

  const t1=Date.now();
  const apres=chargerVueCerbereExpress20260827();
  const dureeApres=Date.now()-t1;

  const a=signaturePerfCerbereExpress20260827_(avant);
  const b=signaturePerfCerbereExpress20260827_(apres);
  const identique=JSON.stringify(a)===JSON.stringify(b);
  const stats=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)
    ? BUDGETSOFT_READ_CONTEXT_LAST_STATS_
    : null;

  const out={
    ok:identique,
    version:AUDIT_PERF_BUDGETSOFT_20260827_VERSION,
    nonRegression:identique,
    dureeAvantMs:dureeAvant,
    dureeApresMs:dureeApres,
    gainPct:dureeAvant>0?Math.round((1-dureeApres/dureeAvant)*1000)/10:null,
    lectures:stats,
    signatureAvant:a,
    signatureApres:b
  };
  console.log(JSON.stringify(out));
  return out;
}

function signaturePerfCerbereExpress20260827_(v){
  if(!v||v.ok===false)return{ok:false,erreur:String(v&&v.erreur||'')};
  return{
    ok:true,
    cycle:v.cycle||null,
    meteo:v.meteo||null,
    consigneSaillante:v.consigneSaillante||null,
    pilotable:{
      allocation:Number(v.pilotable&&v.pilotable.allocation||0),
      consomme:Number(v.pilotable&&v.pilotable.consomme||0),
      reste:Number(v.pilotable&&v.pilotable.reste||0),
      lignes:(v.pilotable&&v.pilotable.lignes||[]).map(x=>({
        categorie:x.categorie,
        allocation:Number(x.allocation||0),
        consomme:Number(x.consomme||0),
        reste:Number(x.reste||0),
        niveau:x.niveau||''
      }))
    },
    pluxee:v.pluxee||null,
    contexte:v.contexte||null
  };
}
