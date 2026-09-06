const BUDGETSOFT_CANONICAL_VALUES_VERSION='2026-09-06.1';

function arrCanonBudgetSoft20260906_(n){return Math.round(Number(n||0)*100)/100;}
function actifCanonBudgetSoft20260906_(v){return v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0';}

/**
 * Compose le patrimoine à partir de valeurs déjà calculées par leurs propriétaires.
 * Aucun rescan d'Operations, Credits ou Dettes n'est autorisé ici.
 */
function composerPatrimoineCanoniqueBudgetSoft20260906_(sources,comptes,credits){
  const actifs=Array.isArray(sources&&sources.Actifs)?sources.Actifs:[];
  const lignesComptes=Array.isArray(comptes&&comptes.comptes)?comptes.comptes.filter(c=>actifCanonBudgetSoft20260906_(c.actif)):[];
  const livrets=lignesComptes.filter(c=>String(c.type||'').toLowerCase()==='epargne');
  const placements=lignesComptes.filter(c=>String(c.type||'').toLowerCase()==='placement');
  const totalActifsPatrimoniaux=arrCanonBudgetSoft20260906_(actifs.reduce((s,a)=>s+Math.max(0,Number(a&&a.valeur||0)),0));
  const totalLivrets=arrCanonBudgetSoft20260906_(livrets.reduce((s,c)=>s+Math.max(0,Number(c&&c.soldeReel||0)),0));
  const totalPlacements=arrCanonBudgetSoft20260906_(placements.reduce((s,c)=>s+Math.max(0,Number(c&&c.soldeReel||0)),0));
  const totalFinancier=arrCanonBudgetSoft20260906_(totalLivrets+totalPlacements);
  const totalActifs=arrCanonBudgetSoft20260906_(totalActifsPatrimoniaux+totalFinancier);
  const totalCredits=arrCanonBudgetSoft20260906_(Number(credits&&credits.capitalCredits||0));
  const totalDettesHorsCredit=arrCanonBudgetSoft20260906_(Number(credits&&credits.dettesHorsCredit||0));
  const totalDettes=arrCanonBudgetSoft20260906_(totalCredits+totalDettesHorsCredit);
  return {
    ok:true,version:BUDGETSOFT_CANONICAL_VALUES_VERSION,source:'composition canonique Comptes + Crédits + Actifs',
    actifs,livrets,placements,
    totalActifsPatrimoniaux,totalLivrets,totalPlacements,totalFinancier,totalActifs,
    totalCredits,totalDettesHorsCredit,totalDettes,patrimoineNet:arrCanonBudgetSoft20260906_(totalActifs-totalDettes)
  };
}

/**
 * Frontière temporelle commune : date_comptable, avec date seulement en secours
 * pour les anciennes lignes qui n'en possèdent pas encore.
 */
function dateComptableCanonBudgetSoft20260906_(o){
  const v=o&&(o.date_comptable||o.date);if(!v)return null;const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d.getTime())?null:d;
}
function construireResumeOperationsCanoniqueBudgetSoft20260906_(operations,dateReference){
  const ref=dateReference instanceof Date?new Date(dateReference):new Date(dateReference||new Date());ref.setHours(23,59,59,999);
  const realisees=[],futures=[];
  (operations||[]).forEach(o=>{const d=dateComptableCanonBudgetSoft20260906_(o);if(!d)return;(d<=ref?realisees:futures).push(o);});
  const somme=xs=>arrCanonBudgetSoft20260906_(xs.reduce((s,o)=>s+Number(o&&o.montant||0),0));
  return {version:BUDGETSOFT_CANONICAL_VALUES_VERSION,dateReference:ref.toISOString(),realisees:{nombre:realisees.length,net:somme(realisees)},futures:{nombre:futures.length,net:somme(futures)}};
}

/** Agrégats Crédits publiés une seule fois pour UI, Patrimoine et Analyse. */
function construireAgregatsCreditsCanonBudgetSoft20260906_(credits){
  const amort=Array.isArray(credits&&credits.amortissables)?credits.amortissables:[],rev=Array.isArray(credits&&credits.renouvelables)?credits.renouvelables:[];
  return {
    version:BUDGETSOFT_CANONICAL_VALUES_VERSION,
    capitalAmortissable:arrCanonBudgetSoft20260906_(amort.reduce((s,c)=>s+Math.abs(Number(c&&c.capital_restant||0)),0)),
    encoursRevolving:arrCanonBudgetSoft20260906_(rev.reduce((s,c)=>s+Math.abs(Number(c&&c.capital_restant||0)),0)),
    capitalCredits:arrCanonBudgetSoft20260906_(Number(credits&&credits.capitalCredits||0)),
    dettesHorsCredit:arrCanonBudgetSoft20260906_(Number(credits&&credits.dettesHorsCredit||0)),
    endettementTotal:arrCanonBudgetSoft20260906_(Number(credits&&credits.endettementTotal||0))
  };
}

function construireTransversalesBudgetSoft20260906_(modules){
  const m=modules||{},sources=m.sources||{},comptes=m.comptes||{},credits=m.credits||{},tres=m.tresorerieFinCycle||{},express=m.cerbereExpress||{};
  return {
    version:BUDGETSOFT_CANONICAL_VALUES_VERSION,
    operations:construireResumeOperationsCanoniqueBudgetSoft20260906_(sources.Operations||[],new Date()),
    comptes:{disponible:arrCanonBudgetSoft20260906_(comptes.synthese&&comptes.synthese.disponible),epargne:arrCanonBudgetSoft20260906_(comptes.synthese&&comptes.synthese.epargne),placements:arrCanonBudgetSoft20260906_(comptes.synthese&&comptes.synthese.placements),pluxee:comptes.synthese&&comptes.synthese.pluxee},
    credits:construireAgregatsCreditsCanonBudgetSoft20260906_(credits),
    tresorerie:{soldeReel:Number(tres.soldeReel),soldePrevisionnel:Number(tres.soldePrevisionnel),dateCible:tres.dateCible||''},
    cerbere:{cbDejaEngagee:Number(express.contexte&&express.contexte.cbDejaEngageeM1||0),p1:Number(express.contexte&&express.contexte.p1||0),restePilotable:Number(express.pilotable&&express.pilotable.reste||0)}
  };
}
