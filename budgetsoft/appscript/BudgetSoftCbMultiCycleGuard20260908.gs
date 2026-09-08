const BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION='2026-09-08.1';

function arrGardeCbMultiCycleBudgetSoft20260908_(n){return Math.round((Number(n)||0)*100)/100;}
function isoJourGardeCbMultiCycleBudgetSoft20260908_(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function finMoisGardeCbMultiCycleBudgetSoft20260908_(d){return new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59,999);}

/**
 * Garde permanente anti-régression des débits CB multi-cycle.
 * Elle compare la trajectoire publiée jusqu'au débit bancaire du cycle suivant
 * avec les estimations unitaires V2 calculées cycle par cycle. Un futur retour au
 * comportement « premier débit seulement » bloque ainsi la publication globale.
 */
function auditerGardeCbMultiCycleBudgetSoft20260908(dateFinCycleSuivant){
  const erreurs=[];
  if(typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907!=='function')return{ok:false,version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,erreurs:[{code:'CB_OWNER_ABSENT',message:'Propriétaire canonique de trésorerie absent.'}]};
  if(typeof estimationDebitCbDiffereTresorerie20260901V2_!=='function'||typeof prochaineDateDebitCbTresorerie20260901_!=='function')return{ok:false,version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,erreurs:[{code:'CB_PRIMITIVE_ABSENTE',message:'Primitive canonique de calcul du débit CB absente.'}]};

  const finCycle=dateFinCycleSuivant instanceof Date?new Date(dateFinCycleSuivant):new Date(dateFinCycleSuivant||new Date());
  const cible=finMoisGardeCbMultiCycleBudgetSoft20260908_(finCycle);
  const r=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(Utilities.formatDate(cible,Session.getScriptTimeZone(),'yyyy-MM-dd'));
  if(!r||r.ok===false)return{ok:false,version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,dateCible:cible.toISOString(),erreurs:[{code:'CB_PROJECTION_INVALIDE',message:String(r&&r.erreur||'Projection canonique invalide.')}],projection:r||null};

  const reference=new Date(r.dateReference||new Date()),ops=lireTable_('Operations');
  const publiees=(r.lignes||[]).filter(x=>x.source==='debit_cb_estime');
  const attendues=[];
  let ref=new Date(reference),garde=0;
  while(ref<cible&&garde++<12){
    const debit=prochaineDateDebitCbTresorerie20260901_(ref);
    if(!debit||isNaN(debit)||debit>cible)break;
    const ligne=estimationDebitCbDiffereTresorerie20260901V2_(ops,ref,cible);
    if(ligne)attendues.push(ligne);
    ref=new Date(debit.getTime()+1);
  }

  const vues={};
  publiees.forEach(x=>{
    const j=isoJourGardeCbMultiCycleBudgetSoft20260908_(x.date);
    vues[j]=(vues[j]||0)+1;
    if(vues[j]>1)erreurs.push({code:'CB_DEBIT_DUPLIQUE',message:'Plusieurs compléments CB estimés sont publiés pour la même date bancaire.',date:j});
  });

  attendues.forEach(a=>{
    const j=isoJourGardeCbMultiCycleBudgetSoft20260908_(a.date),p=publiees.find(x=>isoJourGardeCbMultiCycleBudgetSoft20260908_(x.date)===j);
    if(!p){erreurs.push({code:'CB_DEBIT_CYCLE_ABSENT',message:'Un débit CB attendu dans l’horizon n’est pas publié.',date:j,montantAttendu:arrGardeCbMultiCycleBudgetSoft20260908_(a.montantSigne)});return;}
    if(Math.abs(arrGardeCbMultiCycleBudgetSoft20260908_(p.montantSigne)-arrGardeCbMultiCycleBudgetSoft20260908_(a.montantSigne))>.01)erreurs.push({code:'CB_DEBIT_MONTANT_DIVERGENT',message:'Le débit CB publié diffère de l’estimation canonique du cycle.',date:j,montantPublie:arrGardeCbMultiCycleBudgetSoft20260908_(p.montantSigne),montantAttendu:arrGardeCbMultiCycleBudgetSoft20260908_(a.montantSigne)});
  });

  const out={
    ok:erreurs.length===0,
    version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,
    dateReference:r.dateReference||'',
    dateCible:r.dateCible||cible.toISOString(),
    attendues:attendues.map(x=>({date:x.date,montant:arrGardeCbMultiCycleBudgetSoft20260908_(x.montantSigne),partCerbere:arrGardeCbMultiCycleBudgetSoft20260908_(x.partCerbere),partFinMois:arrGardeCbMultiCycleBudgetSoft20260908_(x.partFinMois)})),
    publiees:publiees.map(x=>({date:x.date,montant:arrGardeCbMultiCycleBudgetSoft20260908_(x.montantSigne),partCerbere:arrGardeCbMultiCycleBudgetSoft20260908_(x.partCerbere),partFinMois:arrGardeCbMultiCycleBudgetSoft20260908_(x.partFinMois)})),
    controles:{nombreCyclesAttendus:attendues.length,nombreCyclesPublies:publiees.length,tousCyclesAttendusPublies:erreurs.filter(e=>e.code==='CB_DEBIT_CYCLE_ABSENT').length===0,aucunDebitDuplique:erreurs.filter(e=>e.code==='CB_DEBIT_DUPLIQUE').length===0},
    erreurs:erreurs
  };
  return out;
}

function auditerGardeCbMultiCycle27102026BudgetSoft20260908(){
  const out=auditerGardeCbMultiCycleBudgetSoft20260908(new Date(2026,9,27,12,0,0,0));
  console.log('[AUDIT Garde CB multi-cycle] '+JSON.stringify(out));
  return out;
}
