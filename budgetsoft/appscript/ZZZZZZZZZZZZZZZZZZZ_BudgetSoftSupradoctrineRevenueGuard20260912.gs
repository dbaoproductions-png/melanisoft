const BUDGETSOFT_SUPRADOCTRINE_REVENUS_20260912_VERSION='2026-09-12.1';

/**
 * SUPRADOCTRINE BUDGETSOFT — RECETTES / PREVISIONNEL
 *
 * Invariants non négociables :
 * 1. Toute lecture fonctionnelle appartient à une revisionBudgetSoft globale unique.
 * 2. Le Réel au jour J provient uniquement des Operations canoniques déjà réalisées.
 * 3. Le Prévisionnel ne contient que des flux encore dus et non réalisés/rapprochés.
 * 4. Recettes attendues = recettes réelles constatées + recettes futures restantes.
 * 5. Lorsqu'un flux prévu devient réel, le Réel remplace la prévision : jamais Réel + Prévision pour le même mouvement.
 * 6. Une recette inattendue importée augmente le Réel et donc les recettes attendues ; aucune prévision fictive n'est créée automatiquement.
 * 7. Un Événement standard futur Prévu ou Effective reste au prévisionnel tant qu'il n'est ni réalisé, rapproché ni annulé.
 * 8. Un Événement standard Effective dont la date prévue est dépassée reste dû jusqu'au rapprochement ; sa date prévue d'origine est conservée.
 * 9. Les Actions Plan gardent leur doctrine propre : elles n'entrent dans la trésorerie que selon leur règle de confirmation/effectivité.
 */
const BUDGETSOFT_SUPRADOCTRINE_REVENUS_20260912={
  version:BUDGETSOFT_SUPRADOCTRINE_REVENUS_20260912_VERSION,
  equation:'recettesAttendues = recettesConstatees + recettesFuturesRestantes',
  remplacement:'un flux devenu réel remplace sa prévision ; aucun double comptage Réel + Prévision',
  evenementEnRetard:'un événement Effective non rapproché reste dû même après sa date prévue',
  recetteInattendue:'une recette inattendue importée augmente le Réel et les recettes attendues sans créer de prévision artificielle'
};

function arrSupradoctrineRecettesBudgetSoft20260912_(n){return Math.round(Number(n||0)*100)/100;}
function dateSupradoctrineRecettesBudgetSoft20260912_(v){
  const d=v instanceof Date?new Date(v):new Date(v||0);if(isNaN(d))return null;d.setHours(0,0,0,0);return d;
}
function statutNormSupradoctrineRecettesBudgetSoft20260912_(v){
  return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function statutFinalSupradoctrineRecettesBudgetSoft20260912_(v){
  return ['realise','realisee','realises','realisees','rapproche','rapprochee','annule','annulee','abandonne','abandonnee'].includes(statutNormSupradoctrineRecettesBudgetSoft20260912_(v));
}
function statutEffectiveSupradoctrineRecettesBudgetSoft20260912_(v){
  return ['effectif','effective','effectifs','effectives'].includes(statutNormSupradoctrineRecettesBudgetSoft20260912_(v));
}

function verifierSupradoctrineRecettesBudgetSoft20260912_(etat){
  const erreurs=[],avertissements=[],m=etat&&etat.modules||{},dash=m.dashboard||{},ct=dash.courtTerme||{},proj=m.projectionEtendue||{};
  const reference=dateSupradoctrineRecettesBudgetSoft20260912_(ct.dateReference),fin=dateSupradoctrineRecettesBudgetSoft20260912_(ct.fin);
  const lignes=Array.isArray(proj.lignes)?proj.lignes:[];
  if(!reference||!fin){
    erreurs.push({code:'SUPRA_RECETTES_FRONTIERE_ABSENTE',message:'Impossible de contrôler les recettes : frontières du cycle absentes.',detail:{dateReference:ct.dateReference||'',fin:ct.fin||''}});
    return{ok:false,version:BUDGETSOFT_SUPRADOCTRINE_REVENUS_20260912_VERSION,erreurs,alertes:avertissements,doctrine:BUDGETSOFT_SUPRADOCTRINE_REVENUS_20260912};
  }

  const recettesFutures=lignes.filter(function(l){
    const d=dateSupradoctrineRecettesBudgetSoft20260912_(l&&l.date),x=Number(l&&l.montantSigne||0);
    return d&&d>reference&&d<=fin&&Number.isFinite(x)&&x>0;
  });
  const totalFutur=arrSupradoctrineRecettesBudgetSoft20260912_(recettesFutures.reduce(function(s,l){return s+Number(l.montantSigne||0);},0));
  const constate=arrSupradoctrineRecettesBudgetSoft20260912_(ct.revenusConstates);
  const publie=arrSupradoctrineRecettesBudgetSoft20260912_(ct.revenusAttendus);
  const calcule=arrSupradoctrineRecettesBudgetSoft20260912_(constate+totalFutur);
  if(Math.abs(publie-calcule)>0.01){
    erreurs.push({code:'SUPRA_RECETTES_ATTENDUES_FORMULE',message:'Recettes attendues différentes de Réel + Prévisionnel restant.',detail:{revenusConstates:constate,recettesFuturesRestantes:totalFutur,revenusAttendusCalcules:calcule,revenusAttendusPublies:publie}});
  }

  let evenements=[];
  try{evenements=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):[];}catch(e){
    erreurs.push({code:'SUPRA_EVENEMENTS_LECTURE',message:'Impossible de contrôler les événements du Plan.',detail:String(e&&e.message||e)});
  }
  const controles=[];
  (evenements||[]).forEach(function(ev){
    const type=String(ev&&ev.type||'').trim().toLowerCase();
    if(type!=='recette'&&type!=='depense')return;
    if(statutFinalSupradoctrineRecettesBudgetSoft20260912_(ev.statut))return;
    if(String(ev.operation_reelle_id||'').trim())return;
    const rapprochement=statutNormSupradoctrineRecettesBudgetSoft20260912_(ev.rapprochement_statut||'');
    if(['rapproche','rapprochee','realise','realisee'].includes(rapprochement))return;
    let dr=null;try{dr=typeof datePlanTresorerie_==='function'?datePlanTresorerie_(ev,reference,false):null;}catch(e){}
    const origine=dr&&dr.date?dateSupradoctrineRecettesBudgetSoft20260912_(dr.date):null;
    if(!origine||origine>fin)return;
    const effective=statutEffectiveSupradoctrineRecettesBudgetSoft20260912_(ev.statut);
    if(origine<=reference&&!effective)return;

    const eventLines=lignes.filter(function(l){return String(l&&l.source||'')==='evenement'&&String(l&&l.sourceId||'')===String(ev.id||'');});
    let couvert=eventLines.length>0,mode=couvert?'evenement':'';
    if(!couvert&&typeof ressemblentTresorerie20260831_==='function'){
      const report=new Date(reference);report.setDate(report.getDate()+1);
      const cibleDate=origine<=reference?report:origine;
      const candidat={source:'evenement',sourceId:ev.id||'',date:cibleDate.toISOString(),libelle:ev.libelle||'',categorie:ev.categorie||'',montantSigne:(type==='recette'?1:-1)*Math.abs(Number(ev.montant||0))};
      couvert=lignes.some(function(l){try{return ressemblentTresorerie20260831_(candidat,l);}catch(e){return false;}});
      if(couvert)mode='flux_couvrant';
    }
    const c={id:String(ev.id||''),libelle:String(ev.libelle||''),type:type,statut:String(ev.statut||''),datePrevue:Utilities.formatDate(origine,Session.getScriptTimeZone(),'yyyy-MM-dd'),enRetard:origine<=reference,montant:Math.abs(Number(ev.montant||0)),couvert:couvert,mode:mode};
    controles.push(c);
    if(!couvert)erreurs.push({code:'SUPRA_EVENEMENT_DU_DISPARU',message:'Un événement encore dû a disparu de la trajectoire prévisionnelle.',detail:c});
  });

  return{
    ok:erreurs.length===0,
    version:BUDGETSOFT_SUPRADOCTRINE_REVENUS_20260912_VERSION,
    doctrine:BUDGETSOFT_SUPRADOCTRINE_REVENUS_20260912,
    equation:{revenusConstates:constate,recettesFuturesRestantes:totalFutur,revenusAttendusCalcules:calcule,revenusAttendusPublies:publie},
    evenementsDus:controles,
    erreurs:erreurs,
    avertissements:avertissements
  };
}

var auditerCoherenceRevisionBudgetSoftAvantSupradoctrine20260912_=auditerCoherenceRevisionBudgetSoft20260906_;
auditerCoherenceRevisionBudgetSoft20260906_=function(etat){
  const base=auditerCoherenceRevisionBudgetSoftAvantSupradoctrine20260912_(etat)||{ok:true,erreurs:[],avertissements:[]};
  const supra=verifierSupradoctrineRecettesBudgetSoft20260912_(etat);
  return Object.assign({},base,{
    ok:base.ok===true&&supra.ok===true,
    versionSupradoctrine:BUDGETSOFT_SUPRADOCTRINE_REVENUS_20260912_VERSION,
    supradoctrineRecettes:supra,
    erreurs:(base.erreurs||[]).concat(supra.erreurs||[]),
    avertissements:(base.avertissements||[]).concat(supra.avertissements||[])
  });
};

function auditerSupradoctrineRecettesBudgetSoft20260912(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  if(!s||!s.disponible){const r={ok:false,version:BUDGETSOFT_SUPRADOCTRINE_REVENUS_20260912_VERSION,erreur:'Snapshot global indisponible.'};console.log('[AUDIT supradoctrine recettes] '+JSON.stringify(r));return r;}
  const r=verifierSupradoctrineRecettesBudgetSoft20260912_(s.etat);
  r.revisionBudgetSoft=s.revisionBudgetSoft||s.etat&&s.etat.revisionBudgetSoft||'';
  console.log('[AUDIT supradoctrine recettes] '+JSON.stringify(r));
  return r;
}
