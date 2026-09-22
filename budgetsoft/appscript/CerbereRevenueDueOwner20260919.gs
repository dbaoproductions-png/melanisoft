const CERBERE_REVENUE_DUE_OWNER_20260919_VERSION='2026-09-22.2';

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
  if(['annule','annulee','abandonne','abandonnee','rapproche','rapprochee'].includes(s))return false;
  const cert=normCerbereRevenueDueOwner20260919_(ev.certitude||'certaine');
  return !['incertaine','incertain','hypothetique','hypothetique'].includes(cert);
}

function dateEvenementCerbereRevenueDueOwner20260919_(ev,reference){
  try{
    const dr=typeof datePlanTresorerie_==='function'?datePlanTresorerie_(ev,reference||new Date(),false):null;
    if(dr&&dr.date)return dateCerbereRevenueDueOwner20260919_(dr.date);
  }catch(e){}
  return dateCerbereRevenueDueOwner20260919_(ev&&(ev.date_effet||ev.date_prevue));
}

function revenusConstatesCycleCerbereRevenueDueOwner20260922_(debut,fin){
  let ops=[],cats=[];try{ops=lireTable_('Operations')||[];}catch(e){ops=[];}try{cats=lireTable_('Categories')||[];}catch(e){cats=[];}
  const types={};cats.forEach(function(x){types[String(x&&x.nom||'').trim()]=String(x&&x.type||'').trim().toLowerCase();});
  let total=0;const detail={};
  ops.forEach(function(o){
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||m<=0)return;
    const d=dateCerbereRevenueDueOwner20260919_(o&&(o.date_comptable||o.date||o.date_operation));if(!d||d<debut||d>fin)return;
    const cat=String(o&&o.categorie||'').trim(),type=types[cat]||String(o&&o.type||'').trim().toLowerCase();
    const revenuEconomique=type==='revenu';
    const remboursementSante=cat==='Remboursements santé';
    if(!revenuEconomique&&!remboursementSante)return;
    total+=m;detail[cat||'Sans catégorie']=arrCerbereRevenueDueOwner20260919_(Number(detail[cat||'Sans catégorie']||0)+m);
  });
  return{total:arrCerbereRevenueDueOwner20260919_(total),detail:detail};
}

function occurrencesDuesCycleCerbereRevenueDueOwner20260922_(ev,debut,fin,indexCycle,reference){
  if(!evenementCertainEncoreDuCerbereRevenueDueOwner20260919_(ev))return[];
  let occ=[];
  try{occ=typeof occurrencesEvenementEtatBudgetSoft20260922_==='function'?occurrencesEvenementEtatBudgetSoft20260922_(ev):occurrencesEvenementV4_(ev).map(function(o){return Object.assign({},o,{rapprochee:false});});}catch(e){occ=[];}
  if(!occ.length){
    const d=dateEvenementCerbereRevenueDueOwner20260919_(ev,reference);
    occ=[{index:1,total:1,montant:Math.abs(Number(ev&&ev.montant||0)),date:d,rapprochee:false}];
  }
  return occ.filter(function(o){
    if(o&&o.rapprochee)return false;
    const d=dateCerbereRevenueDueOwner20260919_(o&&o.date);
    if(!d)return indexCycle===0;
    if(indexCycle===0)return d<=fin;
    return d>=debut&&d<=fin;
  }).map(function(o){return Object.assign({},o,{eventId:String(ev&&ev.id||''),libelle:String(ev&&ev.libelle||''),categorie:String(ev&&ev.categorie||''),statut:String(ev&&ev.statut||'')});});
}

function enrichirCerbereRecettesCertainesDues20260919_(base){
  if(!base||base.ok===false)return base;
  const periodes=Array.isArray(base.periodes)?base.periodes:[],reference=dateCerbereRevenueDueOwner20260919_(new Date())||new Date();
  let evs=[];try{evs=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements')||[]:[];}catch(e){evs=[];}

  const diagnostic=[];
  periodes.forEach(function(p,i){
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;
    const debut=dateCerbereRevenueDueOwner20260919_(periode.debut),fin=dateCerbereRevenueDueOwner20260919_(periode.fin);
    if(!debut||!fin)return;

    const dus=[];
    evs.forEach(function(ev){occurrencesDuesCycleCerbereRevenueDueOwner20260922_(ev,debut,fin,i,reference).forEach(function(o){dus.push(o);});});
    const montantDu=arrCerbereRevenueDueOwner20260919_(dus.reduce(function(s,o){return s+Math.abs(Number(o&&o.montant||0));},0));

    if(i===0){
      const reel=revenusConstatesCycleCerbereRevenueDueOwner20260922_(debut,fin);
      const ancienRt1=arrCerbereRevenueDueOwner20260919_(Number(v.rt1||0));
      v.rt1=arrCerbereRevenueDueOwner20260919_(Number(reel.total||0)+montantDu);
      v.rt1Audit=v.rt1Audit&&typeof v.rt1Audit==='object'?v.rt1Audit:{};
      v.rt1Audit.modeCycleCourant='reel_constate_plus_evenements_explicitement_dus';
      v.rt1Audit.ancienRt1=ancienRt1;
      v.rt1Audit.revenusConstatesCycle=Number(reel.total||0);
      v.rt1Audit.revenusConstatesDetail=reel.detail||{};
      v.rt1Audit.evenementsDus=montantDu;
      v.rt1Audit.evenementsDusDetail=dus.map(function(o){const d=dateCerbereRevenueDueOwner20260919_(o&&o.date);return{
        id:String(o&&o.eventId||''),libelle:String(o&&o.libelle||''),occurrence:Number(o&&o.index||1),occurrences:Number(o&&o.total||1),montant:Math.abs(Number(o&&o.montant||0)),
        datePrevue:isoCerbereRevenueDueOwner20260919_(d),statut:String(o&&o.statut||''),enRetard:!!(d&&d<reference)
      };});
      v.rt1Audit.complementCanonR0Implicite=0;
      const dt1=Number(v.dt1||0);
      v.sct1=arrCerbereRevenueDueOwner20260919_(Number(v.ss1||0)+Number(v.rt1||0)-dt1);
      v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
      p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
      try{if(typeof enrichirCycleCockpitCerbere20260902_==='function')enrichirCycleCockpitCerbere20260902_(p,i);}catch(e){}
      diagnostic.push({index:i+1,mode:'cycle_courant',ancienRt1:ancienRt1,revenusConstates:Number(reel.total||0),evenementsDus:montantDu,nouveauRt1:v.rt1,detail:v.rt1Audit.evenementsDusDetail});
      return;
    }

    diagnostic.push({index:i+1,mode:'cycle_futur_canon_R0',rt1:Number(v.rt1||0),evenementsDusDetectes:montantDu,detail:dus.map(function(o){return{id:String(o&&o.eventId||''),libelle:String(o&&o.libelle||''),occurrence:Number(o&&o.index||1),montant:Math.abs(Number(o&&o.montant||0)),date:isoCerbereRevenueDueOwner20260919_(o&&o.date)};})});
  });

  base.diagnostic=base.diagnostic||{};
  base.diagnostic.revenueDueOwner20260919={
    ok:true,
    version:CERBERE_REVENUE_DUE_OWNER_20260919_VERSION,
    cycles:diagnostic,
    doctrine:'Cycle courant : Rt1 = Réel constaté + événements de recette explicitement encore dus ; aucun complément automatique vers R0. Cycle futur : R0 reste le canon prévisionnel. Une date Plan dépassée ne clôt jamais un événement ; elle marque son cycle d’origine et l’événement reste dû jusqu’à preuve de clôture.'
  };
  base.versionRevenueIntermodule=typeof BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION!=='undefined'
    ?BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION
    :CERBERE_REVENUE_DUE_OWNER_20260919_VERSION;
  return base;
}
