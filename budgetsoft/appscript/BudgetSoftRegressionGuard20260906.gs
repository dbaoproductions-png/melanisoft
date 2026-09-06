const BUDGETSOFT_REGRESSION_GUARD_VERSION='2026-09-06.7';

function arrRegressionBudgetSoft20260906_(n){return Math.round(Number(n||0)*100)/100;}
function ecartRegressionBudgetSoft20260906_(a,b){return arrRegressionBudgetSoft20260906_(Number(a||0)-Number(b||0));}

function auditerCoherenceRevisionBudgetSoft20260906_(etat){
  const erreurs=[],avertissements=[],m=etat&&etat.modules||{},t=etat&&etat.transversales||{};
  function err(code,message,detail){erreurs.push({code,message,detail:detail||null});}
  function warn(code,message,detail){avertissements.push({code,message,detail:detail||null});}
  function proche(a,b,tol){const x=tol==null?0.01:Number(tol);return Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=x;}
  const cred=m.credits||{},pat=m.patrimoine||{},comptes=m.comptes||{},tres=m.tresorerieComptable||{},cerb=m.cerbere||{},express=m.cerbereExpress||{},transTres=t.tresorerie||{},transOps=t.operations||{},sourceMeta=m.sourceMeta||{};

  if(Array.isArray(cred.amortissables)&&Array.isArray(cred.renouvelables)){
    const amort=arrRegressionBudgetSoft20260906_(cred.amortissables.reduce((s,c)=>s+Math.abs(Number(c&&c.capital_restant||0)),0));
    const revolv=arrRegressionBudgetSoft20260906_(cred.renouvelables.reduce((s,c)=>s+Math.abs(Number(c&&c.capital_restant||0)),0));
    const total=arrRegressionBudgetSoft20260906_(amort+revolv);
    if(!proche(revolv,cred.capitalRenouvelable))err('CREDITS_REVOLVING','Encours revolving incohérent entre détail et agrégat.',{detail:revolv,agregat:cred.capitalRenouvelable});
    if(!proche(total,cred.capitalCredits))err('CREDITS_TOTAL','Capital crédits incohérent entre détail et agrégat.',{detail:total,agregat:cred.capitalCredits});
  }

  if(pat&&Object.keys(pat).length&&cred&&Object.keys(cred).length){
    if(Number.isFinite(Number(pat.totalCredits))&&Number.isFinite(Number(cred.capitalCredits))&&!proche(pat.totalCredits,cred.capitalCredits))err('PATRIMOINE_CREDITS','Patrimoine et Crédits ne publient pas le même total de crédits.',{patrimoine:pat.totalCredits,credits:cred.capitalCredits});
    if(Number.isFinite(Number(pat.totalDettesHorsCredit))&&Number.isFinite(Number(cred.dettesHorsCredit))&&!proche(pat.totalDettesHorsCredit,cred.dettesHorsCredit))err('PATRIMOINE_DETTES','Patrimoine et Crédits ne publient pas le même total de dettes hors crédit.',{patrimoine:pat.totalDettesHorsCredit,credits:cred.dettesHorsCredit});
  }

  const dispo=comptes&&comptes.synthese&&Number(comptes.synthese.disponible);
  if(Number.isFinite(dispo)&&Number.isFinite(Number(tres.soldeReel))&&!proche(dispo,tres.soldeReel))err('SOLDE_REEL','Comptes et Trésorerie comptable canonique ne publient pas le même solde réel disponible.',{comptes:dispo,tresorerie:tres.soldeReel,ecart:ecartRegressionBudgetSoft20260906_(dispo,tres.soldeReel)});
  if(Number.isFinite(Number(tres.soldeReel))&&Number.isFinite(Number(tres.variationComptableCertaine))&&Number.isFinite(Number(tres.soldePrevisionnel))&&!proche(Number(tres.soldeReel)+Number(tres.variationComptableCertaine),tres.soldePrevisionnel))err('SOLDE_PREVISIONNEL_FORMULE','Le solde prévisionnel canonique ne respecte pas solde réel + flux futurs comptables.',{soldeReel:tres.soldeReel,variation:tres.variationComptableCertaine,soldePrevisionnel:tres.soldePrevisionnel});
  if(transTres&&Object.keys(transTres).length){
    if(Number.isFinite(Number(tres.soldeReel))&&!proche(tres.soldeReel,transTres.soldeReel))err('TRANSVERSE_SOLDE_REEL','Le bloc transversal diverge du moteur de trésorerie canonique.',{module:tres.soldeReel,transversal:transTres.soldeReel});
    if(Number.isFinite(Number(tres.soldePrevisionnel))&&!proche(tres.soldePrevisionnel,transTres.soldePrevisionnel))err('TRANSVERSE_SOLDE_PREVISIONNEL','Le bloc transversal diverge du moteur de trésorerie canonique.',{module:tres.soldePrevisionnel,transversal:transTres.soldePrevisionnel});
  }

  if(transOps&&Object.keys(transOps).length){
    const source=Number(sourceMeta&&sourceMeta.tables&&sourceMeta.tables.Operations);
    const realisees=Number(transOps.realisees&&transOps.realisees.nombre||0),futures=Number(transOps.futures&&transOps.futures.nombre||0),indatees=Number(transOps.indatees&&transOps.indatees.nombre||0);
    if(Number.isFinite(source)&&source!==realisees+futures+indatees)err('OPERATIONS_PARTITION','La partition canonique des opérations ne couvre pas exactement la table Operations.',{source,realisees,futures,indatees,totalClasse:realisees+futures+indatees});
    if(indatees>0)warn('OPERATIONS_INDATEES','Des opérations ne possèdent aucune date comptable exploitable ; elles sont exclues du Réel et du Futur jusqu’à correction.',{indatees});
  }

  const ps=Array.isArray(cerb&&cerb.periodes)?cerb.periodes:[];
  const c1=ps[0]&&ps[0].v37&&ps[0].v37.cockpit20260902||{};
  const c2=ps[1]&&ps[1].v37&&ps[1].v37.cockpit20260902||{};
  if(express&&express.ok&&ps.length){
    if(Number.isFinite(Number(c1.p1Total))&&Number.isFinite(Number(express.pilotable&&express.pilotable.allocation))&&!proche(c1.p1Total,express.pilotable&&express.pilotable.allocation))err('CERBERE_EXPRESS_P1','Cerbère Express diverge du P1 de Cerbère.',{cerbere:c1.p1Total,express:express.pilotable&&express.pilotable.allocation});
    if(Number.isFinite(Number(c2.reportCbCycle))&&Number.isFinite(Number(express.contexte&&express.contexte.cbDejaEngageeM1))&&!proche(c2.reportCbCycle,express.contexte&&express.contexte.cbDejaEngageeM1))err('CERBERE_EXPRESS_CB','Cerbère Express diverge de l’engagement CB publié par Cerbère.',{cerbere:c2.reportCbCycle,express:express.contexte&&express.contexte.cbDejaEngageeM1});
  }

  if(etat&&Array.isArray(etat.erreurs)&&etat.erreurs.length)warn('MODULES_EN_ERREUR','Un ou plusieurs modules ont échoué pendant la reconstruction.',etat.erreurs);
  return {ok:erreurs.length===0,version:BUDGETSOFT_REGRESSION_GUARD_VERSION,erreurs,avertissements};
}

function auditerPartitionOperationsBudgetSoft20260906(){
  const ops=lireTable_('Operations')||[],p=partitionnerOperationsCanoniqueBudgetSoft20260906_(ops,new Date()),ref=p.dateReference,erreurs=[];
  const idsR=new Set(),idsF=new Set(),idsI=new Set();
  p.realisees.forEach(o=>{const id=String(o&&o.id||'');if(id)idsR.add(id);const j=jourComptableCanonBudgetSoft20260906_(o);if(!j||j>ref)erreurs.push({code:'REALISEE_HORS_FRONTIERE',id,jour:j,reference:ref});});
  p.futures.forEach(o=>{const id=String(o&&o.id||'');if(id)idsF.add(id);const j=jourComptableCanonBudgetSoft20260906_(o);if(!j||j<=ref)erreurs.push({code:'FUTURE_HORS_FRONTIERE',id,jour:j,reference:ref});});
  p.indatees.forEach(o=>{const id=String(o&&o.id||'');if(id)idsI.add(id);if(jourComptableCanonBudgetSoft20260906_(o))erreurs.push({code:'INDATEE_AVEC_DATE',id});});
  idsR.forEach(id=>{if(idsF.has(id)||idsI.has(id))erreurs.push({code:'ID_DOUBLE_CLASSE',id});});idsF.forEach(id=>{if(idsI.has(id))erreurs.push({code:'ID_DOUBLE_CLASSE',id});});
  if(p.realisees.length+p.futures.length+p.indatees.length!==ops.length)erreurs.push({code:'TOTAL_PARTITION',source:ops.length,classe:p.realisees.length+p.futures.length+p.indatees.length});
  const r={ok:erreurs.length===0,version:BUDGETSOFT_REGRESSION_GUARD_VERSION,dateReference:ref,source:ops.length,realisees:p.realisees.length,futures:p.futures.length,indatees:p.indatees.length,erreurs};console.log(JSON.stringify(r));return r;
}

/**
 * Oracle de développement du classeur BudgetSoft (80) reçu le 06/09/2026.
 * Les valeurs du 07/09 sont désormais celles du flux CANONIQUE après neutralisation
 * des doublons bancaires stricts. Les valeurs brutes historiques ne sont pas des
 * résultats attendus de l'application.
 */
function auditerOracleBudgetSoft80_20260906(){
  const opsBrutes=lireTable_('Operations')||[],ops=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(opsBrutes):opsBrutes;
  const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():lireTable_('Credits'),dettes=lireTable_('Dettes')||[];
  const signature={operations:opsBrutes.length,credits:credits.length,dettes:dettes.length};
  const attendu={operations:2595,credits:7,dettes:3,cbEngagee:823.99,operations0709:6,totalDebits0709:308.67,capitalAmortissable:108370.87,encoursRevolving:12375.93,dettesHorsCredit:1242.20};
  const correspond=signature.operations===attendu.operations&&signature.credits===attendu.credits&&signature.dettes===attendu.dettes;
  if(!correspond)return{ok:true,applicable:false,version:BUDGETSOFT_REGRESSION_GUARD_VERSION,signature,attendu,message:'Oracle BudgetSoft (80) non applicable à ce nouvel état du classeur.'};

  const c=credits.map(x=>typeof enrichirCreditV2_==='function'?enrichirCreditV2_(x):x),amort=c.filter(x=>String(x.type_credit||'').toLowerCase()==='amortissable'),rev=c.filter(x=>String(x.type_credit||'').toLowerCase()==='revolving');
  const capitalAmortissable=arrRegressionBudgetSoft20260906_(amort.reduce((s,x)=>s+Math.abs(Number(x.capital_restant||0)),0));
  const encoursRevolving=arrRegressionBudgetSoft20260906_(rev.reduce((s,x)=>s+Math.abs(Number(x.capital_restant||0)),0));
  const dettesHorsCredit=arrRegressionBudgetSoft20260906_(dettes.filter(d=>String(d.actif).toLowerCase()!=='false'&&Number(d.capital_restant||0)>0).reduce((s,d)=>s+Math.abs(Number(d.capital_restant||0)),0));
  const ops0709=ops.filter(o=>jourComptableCanonBudgetSoft20260906_(o)==='2026-09-07');
  const totalDebits0709=arrRegressionBudgetSoft20260906_(ops0709.filter(o=>Number(o.montant)<0).reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0));

  let cbEngagee=null;
  try{const base=chargerCerbereCockpitBaseRapide20260903_(),r=calculerReportCbCycleSuivant20260905_(base);cbEngagee=arrRegressionBudgetSoft20260906_(r&&r.montant);}catch(e){cbEngagee=null;}
  const mesures={cbEngagee,operations0709:ops0709.length,totalDebits0709,capitalAmortissable,encoursRevolving,dettesHorsCredit};
  const erreurs=[];Object.keys(mesures).forEach(k=>{if(mesures[k]!==null&&Math.abs(Number(mesures[k])-Number(attendu[k]))>.01)erreurs.push({cle:k,attendu:attendu[k],obtenu:mesures[k]});});
  return{ok:erreurs.length===0,applicable:true,version:BUDGETSOFT_REGRESSION_GUARD_VERSION,signature,attendu,mesures,erreurs,note:'Les contrôles du 07/09 portent sur le flux canonique dédoublonné.'};
}
