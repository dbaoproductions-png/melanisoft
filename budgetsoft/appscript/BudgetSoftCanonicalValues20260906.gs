const BUDGETSOFT_CANONICAL_VALUES_VERSION='2026-09-06.3';

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
 * Frontière temporelle commune à tout BudgetSoft hors exception Cerbère : date_comptable.
 * On compare des jours civils dans le fuseau du script afin d'éviter le piège UTC de
 * new Date('YYYY-MM-DD'). La colonne historique `date` n'est qu'un secours de migration.
 */
function jourCanonBudgetSoft20260906_(v){
  if(v==null||v==='')return null;
  if(v instanceof Date&&!isNaN(v.getTime()))return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const s=String(v).trim();
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if(m)return m[1]+'-'+m[2]+'-'+m[3];
  const f=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(f)return f[3]+'-'+String(f[2]).padStart(2,'0')+'-'+String(f[1]).padStart(2,'0');
  const d=new Date(v);
  return isNaN(d.getTime())?null:Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function jourComptableCanonBudgetSoft20260906_(o){return jourCanonBudgetSoft20260906_(o&&(o.date_comptable||o.date));}
function dateComptableCanonBudgetSoft20260906_(o){
  const j=jourComptableCanonBudgetSoft20260906_(o);if(!j)return null;
  const p=j.split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);
}
function jourReferenceCanonBudgetSoft20260906_(dateReference){return jourCanonBudgetSoft20260906_(dateReference||new Date())||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');}

/**
 * Arbitre canonique des Opérations. Tous les écrans/services hors Cerbère doivent
 * consommer cette partition au lieu de réimplémenter leur propre filtre de dates.
 */
function partitionnerOperationsCanoniqueBudgetSoft20260906_(operations,dateReference){
  const ref=jourReferenceCanonBudgetSoft20260906_(dateReference),realisees=[],futures=[],indatees=[];
  (operations||[]).forEach(o=>{
    const j=jourComptableCanonBudgetSoft20260906_(o);
    if(!j){indatees.push(o);return;}
    (j<=ref?realisees:futures).push(o);
  });
  return {version:BUDGETSOFT_CANONICAL_VALUES_VERSION,dateReference:ref,realisees,futures,indatees};
}
function construireResumeOperationsCanoniqueBudgetSoft20260906_(operations,dateReference){
  const p=partitionnerOperationsCanoniqueBudgetSoft20260906_(operations,dateReference);
  const somme=xs=>arrCanonBudgetSoft20260906_(xs.reduce((s,o)=>s+Number(o&&o.montant||0),0));
  return {version:BUDGETSOFT_CANONICAL_VALUES_VERSION,dateReference:p.dateReference,realisees:{nombre:p.realisees.length,net:somme(p.realisees)},futures:{nombre:p.futures.length,net:somme(p.futures)},indatees:{nombre:p.indatees.length,net:somme(p.indatees)}};
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

function dateFinCycleCanonBudgetSoft20260906_(reference){const d=reference instanceof Date?new Date(reference):new Date(reference||new Date());if(isNaN(d.getTime()))return new Date();return d.getDate()<=27?new Date(d.getFullYear(),d.getMonth(),27):new Date(d.getFullYear(),d.getMonth()+1,27);}

function construireTransversalesBudgetSoft20260906_(modules){
  const m=modules||{},sources=m.sources||{},comptes=m.comptes||{},credits=m.credits||{},express=m.cerbereExpress||{};
  const cible=dateFinCycleCanonBudgetSoft20260906_(new Date());
  const tres=typeof construireTresorerieComptableCanoniqueBudgetSoft20260906_==='function'
    ?construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,cible,new Date())
    :(m.tresorerieComptable||m.tresorerieFinCycle||{});
  return {
    version:BUDGETSOFT_CANONICAL_VALUES_VERSION,
    operations:construireResumeOperationsCanoniqueBudgetSoft20260906_(sources.Operations||[],new Date()),
    comptes:{disponible:arrCanonBudgetSoft20260906_(comptes.synthese&&comptes.synthese.disponible),epargne:arrCanonBudgetSoft20260906_(comptes.synthese&&comptes.synthese.epargne),placements:arrCanonBudgetSoft20260906_(comptes.synthese&&comptes.synthese.placements),pluxee:comptes.synthese&&comptes.synthese.pluxee},
    credits:construireAgregatsCreditsCanonBudgetSoft20260906_(credits),
    tresorerie:{version:tres.version||'',soldeReel:Number(tres.soldeReel),variationComptableCertaine:Number(tres.variationComptableCertaine!=null?tres.variationComptableCertaine:tres.variationPrevue),soldePrevisionnel:Number(tres.soldePrevisionnel),dateCible:tres.dateCible||'',nombreOperationsFutures:Number(tres.nombreOperationsFutures||0)},
    cerbere:{cbDejaEngagee:Number(express.contexte&&express.contexte.cbDejaEngageeM1||0),p1:Number(express.contexte&&express.contexte.p1||0),restePilotable:Number(express.pilotable&&express.pilotable.reste||0)}
  };
}
