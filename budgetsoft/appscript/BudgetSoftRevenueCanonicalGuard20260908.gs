const BUDGETSOFT_REVENUE_CANONICAL_GUARD_20260908_VERSION='2026-09-08.1';

function normaliserCategorieGardeRecetteBudgetSoft20260908_(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function jourHabituelRecetteCanonGardeBudgetSoft20260908_(ops,reference,categorie,montant){
  const cat=String(categorie||'').trim(),base=Math.abs(Number(montant||0));
  const hist=(ops||[]).map(o=>({o:o,d:dateOpTresorerie_(o),m:Math.abs(typeof montantSigneOperationRevenuBudgetSoft20260908_==='function'?montantSigneOperationRevenuBudgetSoft20260908_(o):Number(o&&o.montant||0))}))
    .filter(x=>x.d&&x.d<=reference&&x.d>=new Date(reference.getFullYear(),reference.getMonth()-6,1)
      &&(typeof montantSigneOperationRevenuBudgetSoft20260908_==='function'?montantSigneOperationRevenuBudgetSoft20260908_(x.o)>0:Number(x.o&&x.o.montant||0)>0)
      &&normaliserCategorieGardeRecetteBudgetSoft20260908_(x.o&&x.o.categorie||'')===normaliserCategorieGardeRecetteBudgetSoft20260908_(cat));
  const significatifs=hist.filter(x=>x.m>=Math.max(20,base*.35));
  const jours=(significatifs.length?significatifs:hist).map(x=>x.d.getDate()).sort((a,b)=>a-b);
  return Math.max(1,Math.min(28,jours.length?jours[Math.floor(jours.length/2)]:15));
}

/**
 * Garde métier R0 indépendante de la simple réconciliation arithmétique.
 *
 * Invariants :
 *  - une recette structurelle échue et non remplacée par le Réel reste projetée ;
 *  - une recette structurelle déjà encaissée dans le mois ne reste pas projetée
 *    une seconde fois pour le même mois ;
 *  - le montant canonique reste une estimation. Pour une recette déclarée variable
 *    (France Travail), il ne participe pas au rapprochement avec le Réel.
 */
function auditerGardeRecettesCanoniquesBudgetSoft20260908(projection){
  const erreurs=[],details=[];
  function err(code,message,detail){erreurs.push({code:code,message:message,detail:detail||null});}

  if(typeof revenuCanonMoisDejaEncaisseBudgetSoft20260908_!=='function'){
    return {ok:false,version:BUDGETSOFT_REVENUE_CANONICAL_GUARD_20260908_VERSION,erreurs:[{code:'R0_RAPPROCHEMENT_ABSENT',message:'Le moteur de rapprochement canonique des recettes est absent.'}],details:[]};
  }

  const p=projection&&typeof projection==='object'?projection:null;
  if(!p||!Array.isArray(p.lignes)){
    return {ok:false,version:BUDGETSOFT_REVENUE_CANONICAL_GUARD_20260908_VERSION,erreurs:[{code:'R0_PROJECTION_ABSENTE',message:'La trajectoire canonique est absente ou sans lignes.'}],details:[]};
  }

  const reference=new Date(p.dateReference||0),cible=new Date(p.dateCible||0);
  if(isNaN(reference)||isNaN(cible)){
    return {ok:false,version:BUDGETSOFT_REVENUE_CANONICAL_GUARD_20260908_VERSION,erreurs:[{code:'R0_DATES_INVALIDES',message:'Les dates de référence/cible de la trajectoire sont invalides.'}],details:[]};
  }

  const ops=lireTable_('Operations')||[],canon=lireCanonRecettesTresorerie20260831_()||[];
  canon.forEach(c=>{
    if(!actifTresorerie_(c.actif)||String(c.nature||'').toLowerCase()!=='structurelle')return;
    const categorie=String(c.categorie||'').trim();if(!categorie)return;
    const montant=Math.abs(Number(c.montant||0));if(!(montant>0))return;
    const jour=jourHabituelRecetteCanonGardeBudgetSoft20260908_(ops,reference,categorie,montant);
    const echeance=new Date(reference.getFullYear(),reference.getMonth(),jour,12,0,0,0);
    const echue=echeance<=reference;
    const dejaEncaisse=revenuCanonMoisDejaEncaisseBudgetSoft20260908_(ops,reference,categorie,montant);
    const sourceId='canon:'+categorie;
    const lignesMois=(p.lignes||[]).filter(x=>x&&x.source==='revenu_recurrent'&&String(x.sourceId||'')===sourceId).filter(x=>{
      const d=new Date(x.date||0);return !isNaN(d)&&d.getFullYear()===reference.getFullYear()&&d.getMonth()===reference.getMonth();
    });
    const detail={categorie:categorie,montantCanon:montant,jourHabituel:jour,echue:echue,dejaEncaisse:dejaEncaisse,lignesProjeteesMois:lignesMois.map(x=>({date:x.date,montant:x.montantSigne,preuve:x.preuve,echeanceDepassee:!!x.echeanceDepassee}))};
    details.push(detail);

    if(echue&&!dejaEncaisse&&cible>=reference&&lignesMois.length===0){
      err('R0_ECHUE_ABSENTE','Une recette canonique structurelle échue, non encaissée, a disparu de la trajectoire.',detail);
    }
    if(dejaEncaisse&&lignesMois.length>0){
      err('R0_REEL_DOUBLON','Une recette canonique déjà encaissée reste projetée une seconde fois dans le même mois.',detail);
    }
  });

  return {ok:erreurs.length===0,version:BUDGETSOFT_REVENUE_CANONICAL_GUARD_20260908_VERSION,dateReference:p.dateReference||'',dateCible:p.dateCible||'',erreurs:erreurs,details:details};
}

function auditerGardeRecettesCanoniques30092026BudgetSoft20260908(){
  const p=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907('2026-09-30');
  const r=auditerGardeRecettesCanoniquesBudgetSoft20260908(p);
  console.log('[AUDIT Garde R0] '+JSON.stringify(r));
  return r;
}
