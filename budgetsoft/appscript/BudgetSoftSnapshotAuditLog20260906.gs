function auditerSnapshotGlobalBudgetSoft20260906(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  let r;
  if(!s.disponible){
    r=s;
  }else{
    const e=s.etat,m=e.modules||{};
    r={
      ok:e.ok,
      version:e.version,
      revisionBudgetSoft:e.revisionBudgetSoft,
      genereLe:e.genereLe,
      coherence:e.coherence,
      transversales:e.transversales,
      erreurs:e.erreurs||[],
      clesModules:Object.keys(m),
      credits:m.credits?{
        capitalCredits:m.credits.capitalCredits,
        capitalRenouvelable:m.credits.capitalRenouvelable,
        amortissables:(m.credits.amortissables||[]).length,
        renouvelables:(m.credits.renouvelables||[]).length
      }:null,
      tresorerieComptable:m.tresorerieComptable?{
        soldeReel:m.tresorerieComptable.soldeReel,
        variationComptableCertaine:m.tresorerieComptable.variationComptableCertaine,
        soldePrevisionnel:m.tresorerieComptable.soldePrevisionnel,
        dateCible:m.tresorerieComptable.dateCible,
        nombreOperationsFutures:m.tresorerieComptable.nombreOperationsFutures
      }:null,
      projectionEtendue:m.projectionEtendue?{
        soldeReel:m.projectionEtendue.soldeReel,
        soldePrevisionnel:m.projectionEtendue.soldePrevisionnel,
        dateCible:m.projectionEtendue.dateCible
      }:null,
      cerbereExpress:m.cerbereExpress?{
        contexte:m.cerbereExpress.contexte,
        pilotable:m.cerbereExpress.pilotable
      }:null,
      patrimoine:m.patrimoine?{
        patrimoineNet:m.patrimoine.patrimoineNet,
        totalDettes:m.patrimoine.totalDettes
      }:null
    };
  }
  console.log(JSON.stringify(r));
  return r;
}
