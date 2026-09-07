/*
 * Trésorerie unifiée BudgetSoft — lecture seule.
 *
 * Un seul propriétaire métier du prévisionnel bancaire :
 * construireTrajectoireTresorerieCanoniqueBudgetSoft20260907() publié dans
 * modules.projectionEtendue. Le moteur 20260901 reste son implémentation métier.
 * Dashboard, Comptes et Cerbère lisent la même trajectoire et la même révision.
 */
const BUDGETSOFT_UNIFIED_TREASURY_VERSION='2026-09-07.5';

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
  const versionMoteur=String(p&&p.version||''),proprietaire=String(p&&p.proprietaireBudgetSoft||''),moteurSousJacent=String(p&&p.moteurSousJacent||'');
  const moteurDoctrinal=proprietaire==='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907'&&moteurSousJacent==='chargerTresoreriePrevisionnelle20260901'&&!!(p&&p.decompositionCanonique&&p.decompositionCanonique.ok===true);
  return{ok:presentes.length>=4&&ecart!=null&&Math.abs(ecart)<=.01&&moteurDoctrinal,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,valeurs,ecartSoldeReel:ecart,versionMoteur,proprietaire,moteurSousJacent,moteurDoctrinal,composants:presentes.map(([k])=>k),contratCanonique:p&&p.decompositionCanonique||null};
}

function chargerTresorerieUnifieeBudgetSoft20260907(dateCible){
  const s=chargerSnapshotGlobalBudgetSoft20260906(),e=s&&s.disponible&&s.etat,m=e&&e.modules||{},p=m.projectionEtendue||{},c=m.comptes||{},d=m.dashboard||{};
  if(!e||e.ok!==true||!p||p.ok===false)return{ok:false,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,erreur:'Snapshot global ou moteur prévisionnel indisponible.'};
  const ref=jourTresorerieUnifiee20260907_(p.dateReference);
  const cibleDemandee=jourTresorerieUnifiee20260907_(dateCible);
  const cible=cibleDemandee||jourTresorerieUnifiee20260907_(finCycleTresorerieUnifiee20260907_(p.dateReference));
  const soldeComptes=Number(c&&c.synthese&&c.synthese.disponible),soldeMoteur=Number(p.soldeReel),soldeDashboard=Number(d&&d.courtTerme&&d.courtTerme.soldeBancaire);
  return{ok:true,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:e.revisionBudgetSoft||'',genereLe:e.genereLe||'',versionMoteur:p.version||'',proprietaireBudgetSoft:p.proprietaireBudgetSoft||'',moteurSousJacent:p.moteurSousJacent||'',versionContratCanonique:p.versionContratCanonique||'',dateReference:ref,dateCible:cible,soldeReel:Number.isFinite(soldeMoteur)?soldeMoteur:null,soldePrevisionnel:pointProjectionTresorerieUnifiee20260907_(p,cible),soldesSources:{comptes:Number.isFinite(soldeComptes)?soldeComptes:null,moteur:Number.isFinite(soldeMoteur)?soldeMoteur:null,dashboard:Number.isFinite(soldeDashboard)?soldeDashboard:null},lignes:Array.isArray(p.lignes)?p.lignes:[],decompositionCanonique:p.decompositionCanonique||null,confiance:p.confiance||null,doctrine:'Une révision, un solde réel, un propriétaire canonique. R0 + CF0 + opérations futures + Plan confirmé + CB engagées/résiduelles ; jamais de recalcul local.'};
}

function chargerTrajectoireBanqueCerbereRapide20260903(dateCible,partCerbere){const r=chargerTresorerieUnifieeBudgetSoft20260907(dateCible);if(!r.ok)return r;const cible=String(r.dateCible||'');return{ok:true,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:r.revisionBudgetSoft,dateReference:r.dateReference,dateCible:cible,soldeReel:r.soldeReel,lignes:(r.lignes||[]).filter(l=>jourTresorerieUnifiee20260907_(l&&l.date)<=cible),decompositionCanonique:r.decompositionCanonique,confiance:r.confiance,sourceBudgetSoft:'snapshot_global_projection_canonique',partCerbereIgnoree:true};}

function auditerUniteTresorerieBudgetSoft20260907(){
  const s=chargerSnapshotGlobalBudgetSoft20260906(),e=s&&s.disponible&&s.etat,m=e&&e.modules||{},g=auditerUniteModulesTresorerieBudgetSoft20260907_(m),r=chargerTresorerieUnifieeBudgetSoft20260907();
  const out={ok:!!(r.ok&&g.ok),version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:e&&e.revisionBudgetSoft||'',versionMoteur:g.versionMoteur,proprietaire:g.proprietaire,moteurSousJacent:g.moteurSousJacent,dateReference:r.dateReference,dateCible:r.dateCible,soldeReel:r.soldeReel,soldePrevisionnel:r.soldePrevisionnel,soldesSources:g.valeurs,ecartSoldeReel:g.ecartSoldeReel,moteurDoctrinal:g.moteurDoctrinal,contratCanonique:g.contratCanonique};
  console.log('[AUDIT Unité trésorerie] '+JSON.stringify(out));return out;
}

function auditerProjectionTresorerieJusqua20260927BudgetSoft20260907(){
  const cible='2026-09-27',r=chargerTresorerieUnifieeBudgetSoft20260907(cible);
  if(!r||!r.ok){const e={ok:false,erreur:r&&r.erreur||'Trésorerie unifiée indisponible'};console.log('[AUDIT Projection 27-09] '+JSON.stringify(e));return e;}
  const lignes=(r.lignes||[]).map(l=>({jour:jourTresorerieUnifiee20260907_(l&&l.date),source:String(l&&l.source||''),sourceId:String(l&&l.sourceId||''),libelle:String(l&&l.libelle||''),categorie:String(l&&l.categorie||''),montant:arrTresorerieUnifiee20260907_(Number(l&&l.montantSigne||0)),certitude:String(l&&l.certitude||''),preuve:String(l&&l.preuve||''),dateConventionnelle:!!(l&&l.dateConventionnelle)})).filter(x=>x.jour&&x.jour>r.dateReference&&x.jour<=cible);
  lignes.sort((a,b)=>a.jour.localeCompare(b.jour)||a.source.localeCompare(b.source)||a.montant-b.montant);
  const parSource={};let variation=0;
  lignes.forEach(x=>{variation+=x.montant;const k=x.source||'sans_source';if(!parSource[k])parSource[k]={nombre:0,net:0,recettes:0,depenses:0};const p=parSource[k];p.nombre++;p.net+=x.montant;if(x.montant>=0)p.recettes+=x.montant;else p.depenses+=Math.abs(x.montant);});
  Object.keys(parSource).forEach(k=>{const p=parSource[k];p.net=arrTresorerieUnifiee20260907_(p.net);p.recettes=arrTresorerieUnifiee20260907_(p.recettes);p.depenses=arrTresorerieUnifiee20260907_(p.depenses);});
  variation=arrTresorerieUnifiee20260907_(variation);
  const soldeReconstitue=arrTresorerieUnifiee20260907_(Number(r.soldeReel||0)+variation),ecart=arrTresorerieUnifiee20260907_(soldeReconstitue-Number(r.soldePrevisionnel||0));
  const out={ok:Math.abs(ecart)<=.01,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:r.revisionBudgetSoft,proprietaire:r.proprietaireBudgetSoft,moteurSousJacent:r.moteurSousJacent,dateReference:r.dateReference,dateCible:cible,soldeReel:r.soldeReel,variationPrevue:variation,soldePrevisionnel:r.soldePrevisionnel,soldeReconstitue,ecartReconciliation:ecart,parSource,decompositionCanonique:r.decompositionCanonique,lignes};
  console.log('[AUDIT Projection 27-09] '+JSON.stringify(out));return out;
}
