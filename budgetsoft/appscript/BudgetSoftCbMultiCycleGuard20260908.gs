const BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION='2026-09-08.2';

function arrGardeCbMultiCycleBudgetSoft20260908_(n){return Math.round((Number(n)||0)*100)/100;}
function isoJourGardeCbMultiCycleBudgetSoft20260908_(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function finMoisGardeCbMultiCycleBudgetSoft20260908_(d){return new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59,999);}

/**
 * Garde permanente anti-régression des débits CB multi-cycle.
 *
 * Version 2026-09-08.2 : la garde ne recalcule plus chaque estimation via Cerbère.
 * Elle construit UNE trajectoire jusqu'à la fin du mois du cycle suivant, détermine
 * indépendamment les dates bancaires attendues avec prochaineDateDebitCb..., puis
 * vérifie que chaque date attendue possède exactement un debit_cb_estime publié.
 * Elle contrôle aussi, ligne par ligne, la formule montant = partCerbere + partFinMois.
 *
 * Cette séparation suffit à détecter la régression « premier débit seulement » sans
 * doubler les appels lourds à Cerbère et sans comparer le moteur à lui-même.
 */
function auditerGardeCbMultiCycleBudgetSoft20260908(dateFinCycleSuivant){
  const erreurs=[];
  if(typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907!=='function')return{ok:false,version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,erreurs:[{code:'CB_OWNER_ABSENT',message:'Propriétaire canonique de trésorerie absent.'}]};
  if(typeof prochaineDateDebitCbTresorerie20260901_!=='function')return{ok:false,version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,erreurs:[{code:'CB_DATE_PRIMITIVE_ABSENTE',message:'Primitive de détermination des dates de débit CB absente.'}]};

  const finCycle=dateFinCycleSuivant instanceof Date?new Date(dateFinCycleSuivant):new Date(dateFinCycleSuivant||new Date());
  const cible=finMoisGardeCbMultiCycleBudgetSoft20260908_(finCycle);
  const cibleTexte=Utilities.formatDate(cible,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const r=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cibleTexte);
  if(!r||r.ok===false)return{ok:false,version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,dateCible:cible.toISOString(),erreurs:[{code:'CB_PROJECTION_INVALIDE',message:String(r&&r.erreur||'Projection canonique invalide.')}],projection:r||null};

  const reference=new Date(r.dateReference||new Date());
  const publiees=(r.lignes||[]).filter(x=>x.source==='debit_cb_estime');

  // Les dates attendues sont calculées sans appeler le calcul de montant CB.
  const datesAttendues=[];
  let ref=new Date(reference),garde=0;
  while(ref<cible&&garde++<12){
    const debit=prochaineDateDebitCbTresorerie20260901_(ref);
    if(!debit||isNaN(debit)||debit>cible)break;
    const j=isoJourGardeCbMultiCycleBudgetSoft20260908_(debit);
    if(!datesAttendues.includes(j))datesAttendues.push(j);
    ref=new Date(debit.getTime()+1);
  }

  const parDate={};
  publiees.forEach(x=>{
    const j=isoJourGardeCbMultiCycleBudgetSoft20260908_(x.date);
    (parDate[j]=parDate[j]||[]).push(x);
  });

  Object.keys(parDate).forEach(j=>{
    if(parDate[j].length>1)erreurs.push({code:'CB_DEBIT_DUPLIQUE',message:'Plusieurs compléments CB estimés sont publiés pour la même date bancaire.',date:j,nombre:parDate[j].length});
  });

  datesAttendues.forEach(j=>{
    const ls=parDate[j]||[];
    if(ls.length===0)erreurs.push({code:'CB_DEBIT_CYCLE_ABSENT',message:'Un débit CB attendu dans l’horizon n’est pas publié.',date:j});
  });

  publiees.forEach(x=>{
    const montant=Math.abs(arrGardeCbMultiCycleBudgetSoft20260908_(x.montantSigne));
    const partCerbere=Math.max(0,arrGardeCbMultiCycleBudgetSoft20260908_(x.partCerbere));
    const partFinMois=Math.max(0,arrGardeCbMultiCycleBudgetSoft20260908_(x.partFinMois));
    const somme=arrGardeCbMultiCycleBudgetSoft20260908_(partCerbere+partFinMois);
    if(Math.abs(montant-somme)>.01)erreurs.push({code:'CB_DEBIT_FORMULE_DIVERGENTE',message:'Le complément CB publié ne correspond pas à partCerbere + partFinMois.',date:isoJourGardeCbMultiCycleBudgetSoft20260908_(x.date),montantPublie:montant,partCerbere:partCerbere,partFinMois:partFinMois,sommeAttendue:somme});
  });

  // Pour une garde multi-cycle, si l'horizon contient au moins deux dates bancaires,
  // il doit effectivement y avoir au moins deux cycles publiés.
  if(datesAttendues.length>=2&&publiees.length<2)erreurs.push({code:'CB_MULTICYCLE_INCOMPLET',message:'La trajectoire franchit plusieurs débits CB mais moins de deux compléments sont publiés.',datesAttendues:datesAttendues.slice(),nombrePublie:publiees.length});

  const out={
    ok:erreurs.length===0,
    version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,
    dateReference:r.dateReference||'',
    dateCible:r.dateCible||cible.toISOString(),
    datesAttendues:datesAttendues,
    publiees:publiees.map(x=>({date:x.date,montant:arrGardeCbMultiCycleBudgetSoft20260908_(x.montantSigne),partCerbere:arrGardeCbMultiCycleBudgetSoft20260908_(x.partCerbere),partFinMois:arrGardeCbMultiCycleBudgetSoft20260908_(x.partFinMois),moteurCerbere:x.moteurCerbere||''})),
    controles:{nombreCyclesAttendus:datesAttendues.length,nombreCyclesPublies:publiees.length,tousCyclesAttendusPublies:datesAttendues.every(j=>(parDate[j]||[]).length===1),aucunDebitDuplique:Object.keys(parDate).every(j=>parDate[j].length===1),formulesOk:erreurs.filter(e=>e.code==='CB_DEBIT_FORMULE_DIVERGENTE').length===0},
    erreurs:erreurs
  };
  return out;
}

function auditerGardeCbMultiCycle27102026BudgetSoft20260908(){
  console.log('[AUDIT Garde CB multi-cycle] démarrage');
  const out=auditerGardeCbMultiCycleBudgetSoft20260908(new Date(2026,9,27,12,0,0,0));
  console.log('[AUDIT Garde CB multi-cycle] '+JSON.stringify(out));
  return out;
}
