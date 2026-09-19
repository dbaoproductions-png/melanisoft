const BUDGETSOFT_REVENUE_SUPRADOCTRINE_CANONICAL_20260918_VERSION='2026-09-18.1';

function verifierSupradoctrineRecettesBudgetSoft20260912_(etat){
  const erreurs=[],m=etat&&etat.modules||{},dash=m.dashboard||{},ct=dash.courtTerme||{},cer=m.cerbere||{},proj=m.projectionEtendue||{},p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},periode=p&&(p.periode||p)||{};
  const revision=String(etat&&etat.revisionBudgetSoft||''),rt1=Number(v.rt1),pub=Number(ct.revenusAttendus);
  if(!Number.isFinite(rt1))erreurs.push({code:'SUPRA_RECETTES_RT1_ABSENT'});
  if(Number.isFinite(rt1)&&(!Number.isFinite(pub)||Math.abs(arrRevenuePublicationFix20260912_(rt1)-arrRevenuePublicationFix20260912_(pub))>.01)){
    erreurs.push({code:'SUPRA_RECETTES_DASHBOARD_RT1',detail:{revisionBudgetSoft:revision||'(candidate)',cerbereRt1:arrRevenuePublicationFix20260912_(rt1),dashboard:arrRevenuePublicationFix20260912_(pub)}});
  }
  const owner=String(proj&&proj.proprietaireBudgetSoft||proj&&proj.proprietaire||'');
  if(owner&&owner!=='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907'){
    erreurs.push({code:'SUPRA_RECETTES_PROJECTION_OWNER',detail:{proprietaire:owner}});
  }
  const reference=dateRevenuePublicationFix20260912_(proj.dateReference||ct.dateReference||new Date());
  const debut=dateRevenuePublicationFix20260912_(periode.debut);
  const fin=dateRevenuePublicationFix20260912_(ct.fin||periode.fin||proj.dateCible);
  const lignes=Array.isArray(proj.lignes)?proj.lignes:[];
  const dus=evenementsRecettesCertainesDuesRevenuePublicationFix20260912_(reference,debut,fin),controles=[];
  dus.forEach(function(ev){
    const id=String(ev.id||'');
    const couvert=lignes.some(function(l){
      const d=dateRevenuePublicationFix20260912_(l&&l.date);
      return String(l&&l.source||'')==='evenement'&&String(l&&l.sourceId||'')===id&&d&&d>reference&&(!fin||d<=fin)&&Number(l&&l.montantSigne||0)>0;
    });
    const c={id:id,libelle:String(ev.libelle||''),montant:Math.abs(Number(ev.montant||0)),statut:String(ev.statut||''),couvertFutur:couvert};
    controles.push(c);
    if(!couvert)erreurs.push({code:'SUPRA_EVENEMENT_CERTAIN_DU_DISPARU',detail:c});
  });
  return{
    ok:erreurs.length===0,
    version:BUDGETSOFT_REVENUE_SUPRADOCTRINE_CANONICAL_20260918_VERSION,
    versionReglePublication:typeof BUDGETSOFT_REVENUE_PUBLICATION_FIX_20260912_VERSION!=='undefined'?BUDGETSOFT_REVENUE_PUBLICATION_FIX_20260912_VERSION:'',
    prepublication:!revision,
    doctrine:{proprietaireRecettesAttendues:'cerbere.periodes[0].v37.rt1',dashboard:'lecture stricte Rt1',comptes:'projectionEtendue canonique',preuveRealisation:'operation_reelle_id ou rapprochement confirme ; jamais date/statut seuls',principe:'une donnee, un proprietaire, un calcul, plusieurs consommateurs'},
    intermodule:{revisionBudgetSoft:revision||null,cerbereRt1:Number.isFinite(rt1)?arrRevenuePublicationFix20260912_(rt1):null,dashboardRevenusAttendus:Number.isFinite(pub)?arrRevenuePublicationFix20260912_(pub):null,projectionOwner:owner||null,projectionDateReference:reference?isoRevenuePublicationFix20260912_(reference):null},
    evenementsCertainsDus:controles,erreurs:erreurs,avertissements:[]
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
