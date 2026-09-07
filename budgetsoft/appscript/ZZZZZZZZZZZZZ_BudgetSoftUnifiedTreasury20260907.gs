/*
 * Trésorerie unifiée BudgetSoft — lecture seule.
 *
 * Un seul propriétaire métier du prévisionnel bancaire :
 * chargerTresoreriePrevisionnelle20260901() publié dans modules.projectionEtendue.
 * Dashboard, Comptes et Cerbère ne recalculent pas une autre vérité : ils lisent
 * cette même trajectoire et la même révision globale.
 */
const BUDGETSOFT_UNIFIED_TREASURY_VERSION='2026-09-07.1';

function jourTresorerieUnifiee20260907_(v){
  const d=v instanceof Date?new Date(v):new Date(v||0);
  if(isNaN(d.getTime()))return '';
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function arrTresorerieUnifiee20260907_(n){return Math.round(Number(n||0)*100)/100;}
function finCycleTresorerieUnifiee20260907_(reference){
  const d=reference instanceof Date?new Date(reference):new Date(reference||new Date());
  const x=isNaN(d.getTime())?new Date():d;
  return x.getDate()<=27?new Date(x.getFullYear(),x.getMonth(),27,12,0,0,0):new Date(x.getFullYear(),x.getMonth()+1,27,12,0,0,0);
}
function pointProjectionTresorerieUnifiee20260907_(projection,dateCible){
  if(!projection||projection.ok===false)return null;
  const cible=jourTresorerieUnifiee20260907_(dateCible),ref=jourTresorerieUnifiee20260907_(projection.dateReference),base=Number(projection.soldeReel);
  if(!cible||!ref||!Number.isFinite(base))return null;
  let delta=0;
  (projection.lignes||[]).forEach(l=>{
    const j=jourTresorerieUnifiee20260907_(l&&l.date),m=Number(l&&l.montantSigne);
    if(j&&j>ref&&j<=cible&&Number.isFinite(m))delta+=m;
  });
  return arrTresorerieUnifiee20260907_(base+delta);
}
function resumePeriodeTresorerieUnifiee20260907_(projection,debut,fin){
  const a=jourTresorerieUnifiee20260907_(debut),b=jourTresorerieUnifiee20260907_(fin);let recettes=0,depenses=0,n=0;
  if(!a||!b)return{recettes:null,depenses:null,nombreLignes:0};
  (projection&&projection.lignes||[]).forEach(l=>{
    const j=jourTresorerieUnifiee20260907_(l&&l.date),m=Number(l&&l.montantSigne);
    if(!j||j<a||j>b||!Number.isFinite(m))return;n++;if(m>=0)recettes+=m;else depenses+=Math.abs(m);
  });
  return{recettes:arrTresorerieUnifiee20260907_(recettes),depenses:arrTresorerieUnifiee20260907_(depenses),nombreLignes:n};
}

function chargerTresorerieUnifieeBudgetSoft20260907(dateCible){
  const s=chargerSnapshotGlobalBudgetSoft20260906(),e=s&&s.disponible&&s.etat,m=e&&e.modules||{},p=m.projectionEtendue||{},c=m.comptes||{},d=m.dashboard||{};
  if(!e||e.ok!==true||!p||p.ok===false)return{ok:false,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,erreur:'Snapshot global ou moteur prévisionnel indisponible.'};
  const ref=jourTresorerieUnifiee20260907_(p.dateReference),cible=jourTresorerieUnifiee20260907_(dateCible)||jourTresorerieUnifiee20260907_(finCycleTresorerieUnifiee20260907_(p.dateReference));
  const soldeComptes=Number(c&&c.synthese&&c.synthese.disponible),soldeMoteur=Number(p.soldeReel),soldeDashboard=Number(d&&d.courtTerme&&d.courtTerme.soldeBancaire);
  return{
    ok:true,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:e.revisionBudgetSoft||'',genereLe:e.genereLe||'',
    versionMoteur:p.version||'',dateReference:ref,dateCible:cible,
    soldeReel:Number.isFinite(soldeMoteur)?soldeMoteur:null,
    soldePrevisionnel:pointProjectionTresorerieUnifiee20260907_(p,cible),
    soldesSources:{comptes:Number.isFinite(soldeComptes)?soldeComptes:null,moteur:Number.isFinite(soldeMoteur)?soldeMoteur:null,dashboard:Number.isFinite(soldeDashboard)?soldeDashboard:null},
    lignes:Array.isArray(p.lignes)?p.lignes:[],confiance:p.confiance||null,
    doctrine:'Une révision, un solde réel, un moteur prévisionnel bancaire. Cerbère n’ajoute que ses hypothèses CB dans le moteur propriétaire.'
  };
}

/* Pont de compatibilité Cerbère : son UI lit exactement la trajectoire BudgetSoft publiée. */
function chargerTrajectoireBanqueCerbereRapide20260903(dateCible,partCerbere){
  const r=chargerTresorerieUnifieeBudgetSoft20260907(dateCible);
  if(!r.ok)return r;
  const cible=String(r.dateCible||'');
  return{ok:true,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:r.revisionBudgetSoft,dateReference:r.dateReference,dateCible:cible,soldeReel:r.soldeReel,lignes:(r.lignes||[]).filter(l=>jourTresorerieUnifiee20260907_(l&&l.date)<=cible),confiance:r.confiance,sourceBudgetSoft:'snapshot_global_projection_unifiee',partCerbereIgnoree:true};
}

function auditerUniteTresorerieBudgetSoft20260907(){
  const r=chargerTresorerieUnifieeBudgetSoft20260907(),x=r.soldesSources||{},vals=[x.comptes,x.moteur,x.dashboard].filter(v=>Number.isFinite(Number(v))).map(Number),min=vals.length?Math.min.apply(null,vals):null,max=vals.length?Math.max.apply(null,vals):null,ecart=min==null?null:arrTresorerieUnifiee20260907_(max-min);
  const out={ok:!!(r.ok&&ecart!=null&&Math.abs(ecart)<=.01),version:r.version,revisionBudgetSoft:r.revisionBudgetSoft,versionMoteur:r.versionMoteur,dateReference:r.dateReference,dateCible:r.dateCible,soldeReel:r.soldeReel,soldePrevisionnel:r.soldePrevisionnel,soldesSources:x,ecartSoldeReel:ecart};
  console.log('[AUDIT Unité trésorerie] '+JSON.stringify(out));return out;
}
