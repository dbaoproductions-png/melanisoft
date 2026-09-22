const BUDGETSOFT_REVENUE_SUPRADOCTRINE_CANONICAL_20260918_VERSION='2026-09-22.1';

function verifierSupradoctrineRecettesBudgetSoft20260912_(etat){
  const erreurs=[],m=etat&&etat.modules||{},dash=m.dashboard||{},ct=dash.courtTerme||{},cer=m.cerbere||{},proj=m.projectionEtendue||{},p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},periode=p&&(p.periode||p)||{};
  const revision=String(etat&&etat.revisionBudgetSoft||''),rt1=Number(v.rt1),pub=Number(ct.revenusAttendus),constates=Number(ct.revenusConstates);
  if(!Number.isFinite(rt1))erreurs.push({code:'SUPRA_RECETTES_RT1_ABSENT'});
  if(Number.isFinite(rt1)&&(!Number.isFinite(pub)||Math.abs(arrRevenuePublicationFix20260912_(rt1)-arrRevenuePublicationFix20260912_(pub))>.01)){
    erreurs.push({code:'SUPRA_RECETTES_DASHBOARD_RT1',detail:{revisionBudgetSoft:revision||'(candidate)',cerbereRt1:arrRevenuePublicationFix20260912_(rt1),dashboard:arrRevenuePublicationFix20260912_(pub)}});
  }
  const owner=String(proj&&proj.proprietaireBudgetSoft||proj&&proj.proprietaire||'');
  if(owner&&owner!=='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907')erreurs.push({code:'SUPRA_RECETTES_PROJECTION_OWNER',detail:{proprietaire:owner}});
  const reference=dateRevenuePublicationFix20260912_(proj.dateReference||ct.dateReference||new Date()),debut=dateRevenuePublicationFix20260912_(periode.debut),fin=dateRevenuePublicationFix20260912_(ct.fin||periode.fin||proj.dateCible);
  const lignes=Array.isArray(proj.lignes)?proj.lignes:[];
  const dus=typeof occurrencesRecettesCertainesDuesRevenuePublicationFix20260922_==='function'?occurrencesRecettesCertainesDuesRevenuePublicationFix20260922_(reference,debut,fin):[];
  const totalDu=arrRevenuePublicationFix20260912_(dus.reduce(function(s,o){return s+Math.abs(Number(o&&o.montant||0));},0));
  let reelSource=null;
  try{reelSource=typeof revenusConstatesCycleCerbereRevenueDueOwner20260922_==='function'?revenusConstatesCycleCerbereRevenueDueOwner20260922_(dateRevenuePublicationFix20260912_(periode.debut),dateRevenuePublicationFix20260912_(periode.fin)):null;}catch(e){}
  const reel=Number(reelSource&&reelSource.total);
  const attendu=Number.isFinite(reel)?arrRevenuePublicationFix20260912_(reel+totalDu):(Number.isFinite(constates)?arrRevenuePublicationFix20260912_(constates+totalDu):null);
  if(attendu!==null&&Number.isFinite(rt1)&&Math.abs(arrRevenuePublicationFix20260912_(rt1)-attendu)>.01)erreurs.push({code:'SUPRA_RT1_FORMULE_REEL_PLUS_DU',detail:{rt1:arrRevenuePublicationFix20260912_(rt1),reel:Number.isFinite(reel)?arrRevenuePublicationFix20260912_(reel):null,totalDu:totalDu,attendu:attendu}});
  if(Number.isFinite(pub)&&Number.isFinite(constates)&&Math.abs(arrRevenuePublicationFix20260912_(pub-constates)-totalDu)>.01)erreurs.push({code:'SUPRA_DASHBOARD_RESTE_EGAL_DU',detail:{revenusAttendus:arrRevenuePublicationFix20260912_(pub),revenusConstates:arrRevenuePublicationFix20260912_(constates),reste:arrRevenuePublicationFix20260912_(pub-constates),totalDu:totalDu}});
  const r0Courant=lignes.filter(function(l){const d=dateRevenuePublicationFix20260912_(l&&l.date);return String(l&&l.source||'')==='revenu_recurrent'&&d&&reference&&fin&&d>reference&&d<=fin;});
  if(r0Courant.length)erreurs.push({code:'SUPRA_R0_IMPLICITE_CYCLE_COURANT',detail:r0Courant.map(function(l){return{sourceId:l.sourceId,date:l.date,montant:l.montantSigne};})});
  const controles=[];
  dus.forEach(function(o){
    const id=String(o&&o.eventId||o&&o.id||''),idx=Number(o&&o.occurrence||1),montant=Math.abs(Number(o&&o.montant||0));
    const couvert=lignes.some(function(l){
      const d=dateRevenuePublicationFix20260912_(l&&l.date);
      if(String(l&&l.source||'')!=='evenement'||String(l&&l.sourceId||'')!==id||!d||d<=reference||(!fin?false:d>fin)||Number(l&&l.montantSigne||0)<=0)return false;
      if(Number(l&&l.occurrence||0)===idx)return Math.abs(Number(l&&l.montantSigne||0)-montant)<.011;
      return Math.abs(Number(l&&l.montantSigne||0)-montant)<.011;
    });
    const x={id:id,occurrence:idx,occurrences:Number(o&&o.occurrences||1),libelle:String(o&&o.libelle||''),montant:arrRevenuePublicationFix20260912_(montant),datePrevue:isoRevenuePublicationFix20260912_(o&&o.date_effet||o&&o.date_prevue),couvertFutur:couvert};controles.push(x);
    if(!couvert)erreurs.push({code:'SUPRA_OCCURRENCE_RECETTE_DUE_DISPARUE',detail:x});
  });
  return{
    ok:erreurs.length===0,version:BUDGETSOFT_REVENUE_SUPRADOCTRINE_CANONICAL_20260918_VERSION,
    versionReglePublication:typeof BUDGETSOFT_REVENUE_PUBLICATION_FIX_20260912_VERSION!=='undefined'?BUDGETSOFT_REVENUE_PUBLICATION_FIX_20260912_VERSION:'',
    prepublication:!revision,
    doctrine:{proprietaireRecettesAttendues:'cerbere.periodes[0].v37.rt1',formuleCycleCourant:'Réel économique constaté + occurrences Plan explicitement encore dues',dashboard:'lecture stricte Rt1',comptes:'projectionEtendue canonique',preuveRealisation:'rapprochement par occurrence ou événement simple ; jamais date seule',principe:'une donnée, un propriétaire, un calcul, plusieurs consommateurs'},
    intermodule:{revisionBudgetSoft:revision||null,cerbereRt1:Number.isFinite(rt1)?arrRevenuePublicationFix20260912_(rt1):null,dashboardRevenusConstates:Number.isFinite(constates)?arrRevenuePublicationFix20260912_(constates):null,dashboardRevenusAttendus:Number.isFinite(pub)?arrRevenuePublicationFix20260912_(pub):null,reelSource:Number.isFinite(reel)?arrRevenuePublicationFix20260912_(reel):null,totalOccurrencesDues:totalDu,projectionOwner:owner||null,projectionDateReference:reference?isoRevenuePublicationFix20260912_(reference):null},
    occurrencesCertainesDues:controles,erreurs:erreurs,avertissements:[]
  };
}

function auditerCoherenceRevisionBudgetSoft20260906_(etat){
  const base=auditerCoherenceRevisionBaseBudgetSoft20260906_(etat)||{ok:true,erreurs:[],avertissements:[]};
  const supra=verifierSupradoctrineRecettesBudgetSoft20260912_(etat);
  return Object.assign({},base,{
    ok:base.ok===true&&supra.ok===true,
    versionSupradoctrine:BUDGETSOFT_REVENUE_SUPRADOCTRINE_CANONICAL_20260918_VERSION,
    supradoctrineRecettes:supra,
    erreurs:(base.erreurs||[]).concat(supra.erreurs||[]),
    avertissements:(base.avertissements||[]).concat(supra.avertissements||[])
  });
}
