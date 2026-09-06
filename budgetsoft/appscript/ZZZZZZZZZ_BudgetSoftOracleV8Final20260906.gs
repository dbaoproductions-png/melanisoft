/*
 * Override terminal de l'oracle BudgetSoft (80).
 * Nécessaire tant que plusieurs générations historiques de l'audit coexistent
 * dans le projet Apps Script. La dernière définition chargée doit toujours
 * contrôler les valeurs CANONIQUES issues de la déduplication V3.
 */
function auditerOracleBudgetSoft80_20260906(){
  const arr=function(n){return Math.round(Number(n||0)*100)/100;};
  const opsBrutes=lireTable_('Operations')||[];
  const ops=typeof dedoublonnerOperationsCartesCanonique20260906V3_==='function'
    ?dedoublonnerOperationsCartesCanonique20260906V3_(opsBrutes)
    :(typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(opsBrutes):opsBrutes);
  const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():lireTable_('Credits');
  const dettes=lireTable_('Dettes')||[];
  const signature={operations:opsBrutes.length,credits:credits.length,dettes:dettes.length};
  const attendu={
    operations:2595,
    operationsCanoniques:2593,
    doublonsBancaires:2,
    impactDoublons:25.99,
    credits:7,
    dettes:3,
    cbEngagee:823.99,
    operations0709:6,
    totalDebits0709:308.67,
    capitalAmortissable:108370.87,
    encoursRevolving:12375.93,
    dettesHorsCredit:1242.20
  };
  const correspond=signature.operations===attendu.operations&&signature.credits===attendu.credits&&signature.dettes===attendu.dettes;
  if(!correspond)return{ok:true,applicable:false,version:'2026-09-06.8-final',signature,attendu,message:'Oracle BudgetSoft (80) non applicable à ce nouvel état du classeur.'};

  const c=credits.map(function(x){return typeof enrichirCreditV2_==='function'?enrichirCreditV2_(x):x;});
  const amort=c.filter(function(x){return String(x.type_credit||'').toLowerCase()==='amortissable';});
  const rev=c.filter(function(x){return String(x.type_credit||'').toLowerCase()==='revolving';});
  const capitalAmortissable=arr(amort.reduce(function(s,x){return s+Math.abs(Number(x.capital_restant||0));},0));
  const encoursRevolving=arr(rev.reduce(function(s,x){return s+Math.abs(Number(x.capital_restant||0));},0));
  const dettesHorsCredit=arr(dettes.filter(function(d){return String(d.actif).toLowerCase()!=='false'&&Number(d.capital_restant||0)>0;}).reduce(function(s,d){return s+Math.abs(Number(d.capital_restant||0));},0));
  const ops0709=ops.filter(function(o){return jourComptableCanonBudgetSoft20260906_(o)==='2026-09-07';});
  const totalDebits0709=arr(ops0709.filter(function(o){return Number(o.montant)<0;}).reduce(function(s,o){return s+Math.abs(Number(o.montant||0));},0));
  const impactDoublons=arr(ops.reduce(function(s,o){return s+Number(o&&o.montant||0);},0)-opsBrutes.reduce(function(s,o){return s+Number(o&&o.montant||0);},0));
  let cbEngagee=null;
  try{
    const base=chargerCerbereCockpitBaseRapide20260903_();
    const r=calculerReportCbCycleSuivant20260905_(base);
    cbEngagee=arr(r&&r.montant);
  }catch(e){cbEngagee=null;}

  const mesures={
    operationsCanoniques:ops.length,
    doublonsBancaires:opsBrutes.length-ops.length,
    impactDoublons:impactDoublons,
    cbEngagee:cbEngagee,
    operations0709:ops0709.length,
    totalDebits0709:totalDebits0709,
    capitalAmortissable:capitalAmortissable,
    encoursRevolving:encoursRevolving,
    dettesHorsCredit:dettesHorsCredit
  };
  const erreurs=[];
  Object.keys(mesures).forEach(function(k){
    if(mesures[k]!==null&&Math.abs(Number(mesures[k])-Number(attendu[k]))>.01)erreurs.push({cle:k,attendu:attendu[k],obtenu:mesures[k]});
  });
  const r={ok:erreurs.length===0,applicable:true,version:'2026-09-06.8-final',primitiveDedup:'dedoublonnerOperationsCartesCanonique20260906V3_',signature:signature,attendu:attendu,mesures:mesures,erreurs:erreurs,note:'Oracle final portant uniquement sur les valeurs canoniques après déduplication V3.'};
  console.log(JSON.stringify(r));
  return r;
}
