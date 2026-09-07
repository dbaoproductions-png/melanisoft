/*
 * Trésorerie unifiée BudgetSoft — lecture seule.
 *
 * Un seul propriétaire métier du prévisionnel bancaire :
 * chargerTresoreriePrevisionnelle20260901() publié dans modules.projectionEtendue.
 * Dashboard, Comptes et Cerbère ne recalculent pas une autre vérité : ils lisent
 * cette même trajectoire et la même révision globale.
 */
const BUDGETSOFT_UNIFIED_TREASURY_VERSION='2026-09-07.3';

function jourTresorerieUnifiee20260907_(v){
  if(v===undefined||v===null||v==='')return '';
  const d=v instanceof Date?new Date(v):new Date(v);
  if(isNaN(d.getTime()))return '';
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function arrTresorerieUnifiee20260907_(n){return Math.round(Number(n||0)*100)/100;}
function finCycleTresorerieUnifiee20260907_(reference){const d=reference instanceof Date?new Date(reference):new Date(reference||new Date()),x=isNaN(d.getTime())?new Date():d;return x.getDate()<=27?new Date(x.getFullYear(),x.getMonth(),27,12,0,0,0):new Date(x.getFullYear(),x.getMonth()+1,27,12,0,0,0);}
function pointProjectionTresorerieUnifiee20260907_(projection,dateCible){if(!projection||projection.ok===false)return null;const cible=jourTresorerieUnifiee20260907_(dateCible),ref=jourTresorerieUnifiee20260907_(projection.dateReference),base=Number(projection.soldeReel);if(!cible||!ref||!Number.isFinite(base))return null;let delta=0;(projection.lignes||[]).forEach(l=>{const j=jourTresorerieUnifiee20260907_(l&&l.date),m=Number(l&&l.montantSigne);if(j&&j>ref&&j<=cible&&Number.isFinite(m))delta+=m;});return arrTresorerieUnifiee20260907_(base+delta);}
function resumePeriodeTresorerieUnifiee20260907_(projection,debut,fin){const a=jourTresorerieUnifiee20260907_(debut),b=jourTresorerieUnifiee20260907_(fin);let recettes=0,depenses=0,n=0;if(!a||!b)return{recettes:null,depenses:null,nombreLignes:0};(projection&&projection.lignes||[]).forEach(l=>{const j=jourTresorerieUnifiee20260907_(l&&l.date),m=Number(l&&l.montantSigne);if(!j||j<a||j>b||!Number.isFinite(m))return;n++;if(m>=0)recettes+=m;else depenses+=Math.abs(m);});return{recettes:arrTresorerieUnifiee20260907_(recettes),depenses:arrTresorerieUnifiee20260907_(depenses),nombreLignes:n};}

function auditerUniteModulesTresorerieBudgetSoft20260907_(modules){
  modules=modules||{};const c=modules.comptes||{},p=modules.projectionEtendue||{},d=modules.dashboard||{},cer=modules.cerbere||{};
  const valeurs={comptes:Number(c&&c.synthese&&c.synthese.disponible),moteur:Number(p&&p.soldeReel),dashboard:Number(d&&d.courtTerme&&d.courtTerme.soldeBancaire),cerbere:Number(cer&&cer.reel&&cer.reel.soldeBancaire)};
  const presentes=Object.entries(valeurs).filter(([,v])=>Number.isFinite(v));
  const nums=presentes.map(([,v])=>v),ecart=nums.length?arrTresorerieUnifiee20260907_(Math.max.apply(null,nums)-Math.min.apply(null,nums)):null;
  const versionMoteur=String(p&&p.version||''),proprietaire=String(p&&p.proprietaireBudgetSoft||'');
  const moteurDoctrinal=proprietaire==='chargerTresoreriePrevisionnelle20260901';
  return{ok:presentes.length>=3&&ecart!=null&&Math.abs(ecart)<=.01&&moteurDoctrinal,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,valeurs,ecartSoldeReel:ecart,versionMoteur,proprietaire,moteurDoctrinal,composants:presentes.map(([k])=>k)};
}

function chargerTresorerieUnifieeBudgetSoft20260907(dateCible){
  const s=chargerSnapshotGlobalBudgetSoft20260906(),e=s&&s.disponible&&s.etat,m=e&&e.modules||{},p=m.projectionEtendue||{},c=m.comptes||{},d=m.dashboard||{};
  if(!e||e.ok!==true||!p||p.ok===false)return{ok:false,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,erreur:'Snapshot global ou moteur prévisionnel indisponible.'};
  const ref=jourTresorerieUnifiee20260907_(p.dateReference);
  const cibleDemandee=jourTresorerieUnifiee20260907_(dateCible);
  const cible=cibleDemandee||jourTresorerieUnifiee20260907_(finCycleTresorerieUnifiee20260907_(p.dateReference));
  const soldeComptes=Number(c&&c.synthese&&c.synthese.disponible),soldeMoteur=Number(p.soldeReel),soldeDashboard=Number(d&&d.courtTerme&&d.courtTerme.soldeBancaire);
  return{ok:true,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:e.revisionBudgetSoft||'',genereLe:e.genereLe||'',versionMoteur:p.version||'',proprietaireBudgetSoft:p.proprietaireBudgetSoft||'',dateReference:ref,dateCible:cible,soldeReel:Number.isFinite(soldeMoteur)?soldeMoteur:null,soldePrevisionnel:pointProjectionTresorerieUnifiee20260907_(p,cible),soldesSources:{comptes:Number.isFinite(soldeComptes)?soldeComptes:null,moteur:Number.isFinite(soldeMoteur)?soldeMoteur:null,dashboard:Number.isFinite(soldeDashboard)?soldeDashboard:null},lignes:Array.isArray(p.lignes)?p.lignes:[],confiance:p.confiance||null,doctrine:'Une révision, un solde réel, un moteur prévisionnel bancaire. Cerbère n’ajoute que ses hypothèses CB dans le moteur propriétaire.'};
}

function chargerTrajectoireBanqueCerbereRapide20260903(dateCible,partCerbere){const r=chargerTresorerieUnifieeBudgetSoft20260907(dateCible);if(!r.ok)return r;const cible=String(r.dateCible||'');return{ok:true,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:r.revisionBudgetSoft,dateReference:r.dateReference,dateCible:cible,soldeReel:r.soldeReel,lignes:(r.lignes||[]).filter(l=>jourTresorerieUnifiee20260907_(l&&l.date)<=cible),confiance:r.confiance,sourceBudgetSoft:'snapshot_global_projection_unifiee',partCerbereIgnoree:true};}

function auditerUniteTresorerieBudgetSoft20260907(){
  const s=chargerSnapshotGlobalBudgetSoft20260906(),e=s&&s.disponible&&s.etat,m=e&&e.modules||{},g=auditerUniteModulesTresorerieBudgetSoft20260907_(m),r=chargerTresorerieUnifieeBudgetSoft20260907();
  const out={ok:!!(r.ok&&g.ok),version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:e&&e.revisionBudgetSoft||'',versionMoteur:g.versionMoteur,proprietaire:g.proprietaire,dateReference:r.dateReference,dateCible:r.dateCible,soldeReel:r.soldeReel,soldePrevisionnel:r.soldePrevisionnel,soldesSources:g.valeurs,ecartSoldeReel:g.ecartSoldeReel,moteurDoctrinal:g.moteurDoctrinal};
  console.log('[AUDIT Unité trésorerie] '+JSON.stringify(out));return out;
}
