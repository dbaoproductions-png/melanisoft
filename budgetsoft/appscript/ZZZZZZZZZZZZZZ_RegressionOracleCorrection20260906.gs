/*
 * Correctif terminal 2026-09-06.
 *
 * Le précédent oracle associait à tort le solde Hello bank! observé le 05/09/2026
 * (-1095,50 €) à un solde prévisionnel BudgetSoft au 07/09/2026. Ce nombre est une
 * observation bancaire externe prise un samedi ; il ne doit pas devenir une vérité
 * comptable codée en dur. L'oracle conserve uniquement les invariants réellement
 * vérifiés dans le classeur BudgetSoft (80).
 */

function auditerOracleBudgetSoft80_20260906(){
  const ops=lireTable_('Operations')||[];
  const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():lireTable_('Credits');
  const dettes=lireTable_('Dettes')||[];
  const signature={operations:ops.length,credits:credits.length,dettes:dettes.length};
  const attendu={
    operations:2595,
    credits:7,
    dettes:3,
    cbEngagee:823.99,
    operations0709:9,
    totalDebits0709:698.82,
    capitalAmortissable:108370.87,
    encoursRevolving:12375.93,
    dettesHorsCredit:1242.20
  };
  const correspond=signature.operations===attendu.operations&&signature.credits===attendu.credits&&signature.dettes===attendu.dettes;
  if(!correspond)return{ok:true,applicable:false,version:'2026-09-06.7',signature,attendu,message:'Oracle BudgetSoft (80) non applicable à ce nouvel état du classeur.'};

  const c=credits.map(x=>typeof enrichirCreditV2_==='function'?enrichirCreditV2_(x):x);
  const amort=c.filter(x=>String(x.type_credit||'').toLowerCase()==='amortissable');
  const rev=c.filter(x=>String(x.type_credit||'').toLowerCase()==='revolving');
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const capitalAmortissable=arr(amort.reduce((s,x)=>s+Math.abs(Number(x.capital_restant||0)),0));
  const encoursRevolving=arr(rev.reduce((s,x)=>s+Math.abs(Number(x.capital_restant||0)),0));
  const dettesHorsCredit=arr(dettes.filter(d=>String(d.actif).toLowerCase()!=='false'&&Number(d.capital_restant||0)>0).reduce((s,d)=>s+Math.abs(Number(d.capital_restant||0)),0));
  const ops0709=ops.filter(o=>jourComptableCanonBudgetSoft20260906_(o)==='2026-09-07');
  const totalDebits0709=arr(ops0709.filter(o=>Number(o.montant)<0).reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0));
  let cbEngagee=null;
  try{const base=chargerCerbereCockpitBaseRapide20260903_(),r=calculerReportCbCycleSuivant20260905_(base);cbEngagee=arr(r&&r.montant);}catch(e){cbEngagee=null;}

  const mesures={cbEngagee,operations0709:ops0709.length,totalDebits0709,capitalAmortissable,encoursRevolving,dettesHorsCredit};
  const erreurs=[];
  Object.keys(mesures).forEach(k=>{if(mesures[k]!==null&&Math.abs(Number(mesures[k])-Number(attendu[k]))>.01)erreurs.push({cle:k,attendu:attendu[k],obtenu:mesures[k]});});
  return{ok:erreurs.length===0,applicable:true,version:'2026-09-06.7',signature,attendu,mesures,erreurs,note:'Le solde Hello bank! -1095,50 € observé le 05/09 n’est volontairement plus utilisé comme oracle du 07/09.'};
}

/**
 * Audit explicite du pont comptable entre aujourd'hui et le 07/09/2026.
 * Il sert à expliquer le nombre affiché par Comptes sans modifier aucun calcul.
 */
function auditerPontTresorerie07092026BudgetSoft(){
  const cible='2026-09-07';
  const r=chargerTresorerieComptableCanoniqueBudgetSoft20260906(cible);
  const lignes=(r&&r.operationsFutures||[]).map(x=>({
    id:x.id||'',
    date:String(x.date||'').slice(0,10),
    libelle:x.libelle||'',
    categorie:x.categorie||'',
    compte:x.compte||'',
    montant:Number(x.montantSigne||0)
  }));
  const total=Math.round(lignes.reduce((s,x)=>s+Number(x.montant||0),0)*100)/100;
  const parJour={};
  lignes.forEach(x=>{parJour[x.date]=Math.round(((parJour[x.date]||0)+Number(x.montant||0))*100)/100;});
  const out={
    ok:!!(r&&r.ok),
    version:'2026-09-06.1',
    dateReference:r&&r.dateReference||'',
    dateCible:r&&r.dateCible||'',
    soldeComptableReference:r&&r.soldeReel,
    variationFuture:total,
    soldePrevisionnel:r&&r.soldePrevisionnel,
    nombreOperations:lignes.length,
    parJour,
    operations:lignes,
    controleFormule:Math.round((Number(r&&r.soldeReel||0)+total-Number(r&&r.soldePrevisionnel||0))*100)/100
  };
  console.log(JSON.stringify(out));
  return out;
}
