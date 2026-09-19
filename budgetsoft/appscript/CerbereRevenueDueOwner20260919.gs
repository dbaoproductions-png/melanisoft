const CERBERE_REVENUE_DUE_OWNER_20260919_VERSION='2026-09-19.1';

function arrCerbereRevenueDueOwner20260919_(n){return Math.round(Number(n||0)*100)/100;}
function normCerbereRevenueDueOwner20260919_(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function dateCerbereRevenueDueOwner20260919_(v){const d=v instanceof Date?new Date(v):new Date(v||0);if(isNaN(d))return null;d.setHours(0,0,0,0);return d;}
function isoCerbereRevenueDueOwner20260919_(v){const d=dateCerbereRevenueDueOwner20260919_(v);return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';}

function evenementClosProuveCerbereRevenueDueOwner20260919_(ev){
  if(!ev)return false;
  if(typeof evenementClosProuveRevenuePublicationFix20260912_==='function')return evenementClosProuveRevenuePublicationFix20260912_(ev);
  const statut=normCerbereRevenueDueOwner20260919_(ev.statut);
  if(['annule','annulee','abandonne','abandonnee'].includes(statut))return true;
  if(String(ev.operation_reelle_id||'').trim())return true;
  const rap=normCerbereRevenueDueOwner20260919_(ev.rapprochement_statut||'');
  return ['rapproche','rapprochee','realise','realisee'].includes(rap);
}

function evenementCertainEncoreDuCerbereRevenueDueOwner20260919_(ev){
  if(!ev||String(ev.type||'').trim().toLowerCase()!=='recette'||evenementClosProuveCerbereRevenueDueOwner20260919_(ev))return false;
  const s=normCerbereRevenueDueOwner20260919_(ev.statut);
  return ['effectif','effective','effectifs','effectives','realise a rapprocher','realisee a rapprocher'].includes(s);
}

function dateEvenementCerbereRevenueDueOwner20260919_(ev,reference){
  try{
    const dr=typeof datePlanTresorerie_==='function'?datePlanTresorerie_(ev,reference||new Date(),false):null;
    if(dr&&dr.date)return dateCerbereRevenueDueOwner20260919_(dr.date);
  }catch(e){}
  return dateCerbereRevenueDueOwner20260919_(ev&&(ev.date_effet||ev.date_prevue));
}

function enrichirCerbereRecettesCertainesDues20260919_(base){
  if(!base||base.ok===false)return base;
  const periodes=Array.isArray(base.periodes)?base.periodes:[],reference=new Date();
  let evs=[];
  try{evs=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements')||[]:[];}catch(e){evs=[];}

  const diagnostic=[];
  periodes.forEach(function(p,i){
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;
    const debut=dateCerbereRevenueDueOwner20260919_(periode.debut),fin=dateCerbereRevenueDueOwner20260919_(periode.fin);
    if(!debut||!fin)return;

    const dus=evs.filter(function(ev){
      if(!evenementCertainEncoreDuCerbereRevenueDueOwner20260919_(ev))return false;
      const d=dateEvenementCerbereRevenueDueOwner20260919_(ev,reference);
      return d&&d>=debut&&d<=fin;
    });

    const dejaActions=new Set((Array.isArray(v.actionsEvenementsCycle)?v.actionsEvenementsCycle:[])
      .filter(function(x){return x&&x.realise===false&&String(x.source||'')==='Événement'&&Number(x.montantSigne||0)>0;})
      .map(function(x){return String(x.id||'');}));

    const dejaInjectes=new Set();
    const anciens=v.rt1Audit&&Array.isArray(v.rt1Audit.evenementsCertainsDusSansPreuveDetail)
      ?v.rt1Audit.evenementsCertainsDusSansPreuveDetail:[];
    anciens.forEach(function(x){if(x&&x.id!=null)dejaInjectes.add(String(x.id));});
    const diagBase=base.diagnostic&&base.diagnostic.revenueDueOwner20260919;
    if(diagBase&&Array.isArray(diagBase.cycles)){
      const c=diagBase.cycles.find(function(x){return Number(x.index)===i+1;});
      (c&&Array.isArray(c.detail)?c.detail:[]).forEach(function(x){if(x&&x.id!=null)dejaInjectes.add(String(x.id));});
    }

    const ajoutes=dus.filter(function(ev){
      const id=String(ev.id||'');
      return !dejaActions.has(id)&&!dejaInjectes.has(id);
    });
    const delta=arrCerbereRevenueDueOwner20260919_(ajoutes.reduce(function(s,ev){return s+Math.abs(Number(ev.montant||0));},0));

    if(delta>0){
      v.rt1=arrCerbereRevenueDueOwner20260919_(Number(v.rt1||0)+delta);
      v.rt1Audit=v.rt1Audit&&typeof v.rt1Audit==='object'?v.rt1Audit:{};
      v.rt1Audit.evenementsCertainsDusSansPreuve=arrCerbereRevenueDueOwner20260919_(Number(v.rt1Audit.evenementsCertainsDusSansPreuve||0)+delta);
      const nouveauDetail=ajoutes.map(function(ev){return{id:String(ev.id||''),libelle:String(ev.libelle||''),montant:Math.abs(Number(ev.montant||0)),datePrevue:isoCerbereRevenueDueOwner20260919_(dateEvenementCerbereRevenueDueOwner20260919_(ev,reference)),statut:String(ev.statut||'')};});
      v.rt1Audit.evenementsCertainsDusSansPreuveDetail=anciens.concat(nouveauDetail);
      const dt1=Number(v.dt1||0);
      v.sct1=arrCerbereRevenueDueOwner20260919_(Number(v.ss1||0)+Number(v.rt1||0)-dt1);
      v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
      p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
      try{if(typeof enrichirCycleCockpitCerbere20260902_==='function')enrichirCycleCockpitCerbere20260902_(p,i);}catch(e){}
    }

    diagnostic.push({
      index:i+1,
      delta:delta,
      dejaActions:dejaActions.size,
      dejaInjectes:dejaInjectes.size,
      detail:ajoutes.map(function(ev){return{id:String(ev.id||''),libelle:String(ev.libelle||''),montant:Math.abs(Number(ev.montant||0))};})
    });
  });

  base.diagnostic=base.diagnostic||{};
  base.diagnostic.revenueDueOwner20260919={
    ok:true,
    version:CERBERE_REVENUE_DUE_OWNER_20260919_VERSION,
    cycles:diagnostic,
    doctrine:'Rt1 Cerbère conserve toute recette certaine encore due sans preuve bancaire ; enrichissement idempotent partagé par snapshot et recalcul frais.'
  };
  base.versionRevenueIntermodule=typeof BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION!=='undefined'
    ?BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION
    :CERBERE_REVENUE_DUE_OWNER_20260919_VERSION;
  return base;
}
