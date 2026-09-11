const AUDIT_PERF_BUDGETSOFT_20260827_VERSION='2026-08-27.1';

/**
 * Audit de non-régression ciblé sur Cerbère Express.
 * Compare le résultat historique (sans mémoïsation) au résultat optimisé.
 * Aucun écrit dans le classeur.
 */
function auditerNonRegressionPerfCerbereExpress20260827(){
  const t0=Date.now();
  const avant=chargerVueCerbereExpressSansContexte20260827_();
  const dureeAvant=Date.now()-t0;

  const t1=Date.now();
  const apres=chargerVueCerbereExpress20260827();
  const dureeApres=Date.now()-t1;

  const a=signaturePerfCerbereExpress20260827_(avant);
  const b=signaturePerfCerbereExpress20260827_(apres);
  const identique=JSON.stringify(a)===JSON.stringify(b);
  const stats=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)
    ? BUDGETSOFT_READ_CONTEXT_LAST_STATS_
    : null;

  const out={
    ok:identique,
    version:AUDIT_PERF_BUDGETSOFT_20260827_VERSION,
    nonRegression:identique,
    dureeAvantMs:dureeAvant,
    dureeApresMs:dureeApres,
    gainPct:dureeAvant>0?Math.round((1-dureeApres/dureeAvant)*1000)/10:null,
    lectures:stats,
    signatureAvant:a,
    signatureApres:b
  };
  console.log(JSON.stringify(out));
  return out;
}

function signaturePerfCerbereExpress20260827_(v){
  if(!v||v.ok===false)return{ok:false,erreur:String(v&&v.erreur||'')};
  return{
    ok:true,
    cycle:v.cycle||null,
    meteo:v.meteo||null,
    consigneSaillante:v.consigneSaillante||null,
    pilotable:{
      allocation:Number(v.pilotable&&v.pilotable.allocation||0),
      consomme:Number(v.pilotable&&v.pilotable.consomme||0),
      reste:Number(v.pilotable&&v.pilotable.reste||0),
      lignes:(v.pilotable&&v.pilotable.lignes||[]).map(x=>({
        categorie:x.categorie,
        allocation:Number(x.allocation||0),
        consomme:Number(x.consomme||0),
        reste:Number(x.reste||0),
        niveau:x.niveau||''
      }))
    },
    pluxee:v.pluxee||null,
    contexte:v.contexte||null
  };
}

/**
 * Audit lecture seule du coût du snapshot global publié.
 */
function auditerPerformanceSnapshotGlobalBudgetSoft20260909(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat;
  if(!e)return{ok:false,version:'2026-09-09.1',erreur:'Snapshot global publié indisponible.'};
  const m=e.modules||{},p=e.performance||{},pm=p.modules||{};
  const arr=function(n){return Math.round(Number(n||0)*100)/100;};
  const durees=Object.keys(pm).map(function(k){return{module:k,dureeMs:Number(pm[k]||0)};}).sort(function(a,b){return b.dureeMs-a.dureeMs;});
  const totalModules=durees.reduce(function(x,y){return x+Number(y.dureeMs||0);},0);
  const top=durees.slice(0,10).map(function(x){return{module:x.module,dureeMs:x.dureeMs,partPct:totalModules>0?Math.round(x.dureeMs/totalModules*1000)/10:null};});
  const proj=m.projectionEtendue||{},dash=m.dashboard||{},cer=m.cerbere||{},ce=m.cerbereExpress||{},unite=e.uniteTresorerie||m.uniteTresorerie||{};
  const signature={revisionBudgetSoft:String(e.revisionBudgetSoft||''),versionConstructeur:String(e.versionConstructeur||''),projectionVersion:String(proj.version||''),projectionOwner:String(proj.proprietaireBudgetSoft||''),contratVersion:String(proj.versionContratCanonique||''),soldeReel:arr(Number(proj.soldeReel)),soldeDashboard:arr(Number(dash&&dash.courtTerme&&dash.courtTerme.soldeBancaire)),pilotableDashboard:arr(Number(dash&&dash.courtTerme&&dash.courtTerme.pilotableDisponible)),cerbereP1:arr(Number(cer&&cer.p1&&cer.p1.budget||cer&&cer.p1||0)),cerbereReste:arr(Number(cer&&cer.pilotable&&cer.pilotable.reste||cer&&cer.reste||0)),expressAllocation:arr(Number(ce&&ce.pilotable&&ce.pilotable.allocation||0)),expressConsomme:arr(Number(ce&&ce.pilotable&&ce.pilotable.consomme||0)),expressReste:arr(Number(ce&&ce.pilotable&&ce.pilotable.reste||0))};
  const gardes={snapshotOk:e.ok===true,coherence:!!(e.coherence&&e.coherence.ok===true),uniteTresorerie:!!(unite&&unite.ok===true),contratCanonique:!!(proj&&proj.decompositionCanonique&&proj.decompositionCanonique.ok===true),gardeR0:!!(m.gardeRecettesCanoniques&&m.gardeRecettesCanoniques.ok===true),gardeCbMultiCycle:!!(m.gardeCbMultiCycle&&m.gardeCbMultiCycle.ok===true)};
  const toutesVertes=Object.keys(gardes).every(function(k){return gardes[k]===true;});
  const out={ok:toutesVertes,version:'2026-09-09.1',lectureSeule:true,aucuneModification:true,revisionBudgetSoft:String(e.revisionBudgetSoft||''),dureeSnapshotMs:Number(p.dureeMs||0),totalDureesModulesMs:totalModules,topCouts:top,tousModules:durees,gardes:gardes,signatureReference:signature,doctrineOptimisation:'Ne modifier aucun calcul métier. Une optimisation candidate n’est acceptable que si toutes les gardes restent vertes et si la signature de référence est identique au centime.'};
  console.log('[AUDIT PERF snapshot global] '+JSON.stringify(out));return out;
}

function jourAuditPerfTresorerie20260910_(v){const d=v instanceof Date?new Date(v):new Date(v);return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');}
function arrAuditPerfTresorerie20260910_(n){return Math.round(Number(n||0)*100)/100;}
function cleLigneAuditPerfTresorerie20260910_(l){return[jourAuditPerfTresorerie20260910_(l&&l.date),String(l&&l.source||''),String(l&&l.sourceId||''),arrAuditPerfTresorerie20260910_(Number(l&&l.montantSigne||0))].join('|');}
function signatureProjectionAuditPerfTresorerie20260910_(r,cible){const j=String(cible||''),lignes=(r&&r.lignes||[]).filter(function(l){return jourAuditPerfTresorerie20260910_(l&&l.date)<=j;}),cles=lignes.map(cleLigneAuditPerfTresorerie20260910_).sort(),net=arrAuditPerfTresorerie20260910_(lignes.reduce(function(s,l){return s+Number(l&&l.montantSigne||0);},0));return{ok:!!(r&&r.ok),version:String(r&&r.version||''),proprietaire:String(r&&r.proprietaireBudgetSoft||''),contratVersion:String(r&&r.versionContratCanonique||''),dateReference:String(r&&r.dateReference||''),cible:j,soldeReel:arrAuditPerfTresorerie20260910_(Number(r&&r.soldeReel||0)),nombreLignes:lignes.length,net:net,soldeCible:arrAuditPerfTresorerie20260910_(Number(r&&r.soldeReel||0)+net),cles:cles};}

function construireSocleMinimalTresorerie20260831Audit20260910_(){const synthese=chargerSyntheseComptes20260828(),comptes=(synthese&&synthese.comptes||[]).filter(function(c){return actifComptes20260828_(c.actif);}),courants=comptes.filter(estCompteCourantTresorerie_),comptesBase=courants.length?courants:comptes.filter(function(c){return !estEpargneTresorerie_(c);});return{ok:true,soldeReel:arrondiTresorerie_(comptesBase.reduce(function(s,c){return s+Number(c&&c.soldeReel||0);},0)),comptes:comptesBase.map(function(c){return{id:c.id,nom:c.nom,soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde};})};}

function signatureCanoniqueCompleteAuditPerf20260910_(r){const lignes=(r&&r.lignes||[]).map(function(x){return{id:String(x&&x.id||''),source:String(x&&x.source||''),sourceId:String(x&&x.sourceId||''),date:String(x&&x.date||''),libelle:String(x&&x.libelle||''),categorie:String(x&&x.categorie||''),compte:String(x&&x.compte||''),montantSigne:arrAuditPerfTresorerie20260910_(x&&x.montantSigne),certitude:String(x&&x.certitude||''),preuve:String(x&&x.preuve||''),dateConventionnelle:!!(x&&x.dateConventionnelle),partCerbere:x&&x.partCerbere!=null?arrAuditPerfTresorerie20260910_(x.partCerbere):null,partFinMois:x&&x.partFinMois!=null?arrAuditPerfTresorerie20260910_(x.partFinMois):null,moteurCerbere:String(x&&x.moteurCerbere||'')};});return{ok:!!(r&&r.ok),version:String(r&&r.version||''),proprietaire:String(r&&r.proprietaireBudgetSoft||''),contratVersion:String(r&&r.versionContratCanonique||''),dateReference:String(r&&r.dateReference||''),dateCible:String(r&&r.dateCible||''),soldeReel:arrAuditPerfTresorerie20260910_(r&&r.soldeReel),variationPrevue:arrAuditPerfTresorerie20260910_(r&&r.variationPrevue),soldePrevisionnel:arrAuditPerfTresorerie20260910_(r&&r.soldePrevisionnel),fourchette:r&&r.fourchette||null,resume:r&&r.resume||null,confiance:r&&r.confiance||null,lignes:lignes};}

/** Profil courant de la projection étendue telle qu'elle est réellement calculée par le snapshot 2026-09-10.3. */
function auditerProfilProjectionEtendueCouranteBudgetSoft20260911(){
  const cible='2026-10-31',tGlobal=Date.now(),temps={},chargeurCerbere=typeof chargerCerbereV374==='function'?chargerCerbereV374:(typeof chargerCerbereV37==='function'?chargerCerbereV37:null);let cerbere=null,t=Date.now();try{if(chargeurCerbere)cerbere=chargeurCerbere();}catch(e){cerbere=null;}temps.cerberePrecharge=Date.now()-t;if(!cerbere||cerbere.ok===false){const ko={ok:false,version:'2026-09-11.1',lectureSeule:true,aucuneModification:true,erreur:'Cerbère préchargé indisponible.',temps:temps};console.log('[AUDIT PERF profil projection courante] '+JSON.stringify(ko));return ko;}
  t=Date.now();const baseline=avecContexteLectureBudgetSoft20260827_('audit-profil-projection-courante-baseline-20260911',function(){return construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible,cerbere);});temps.baselineCanonique=Date.now()-t;const statsBaseline=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const etapes={};const reconstruit=avecContexteLectureBudgetSoft20260827_('audit-profil-projection-courante-etapes-20260911',function(){let ts=Date.now();const r=chargerSocleTresorerie20260831SansDebitCbLegacy20260910_(cible);etapes.socle20260831SansCbLegacy=Date.now()-ts;if(!r||!r.ok)return r;const reference=new Date(r.dateReference||new Date()),dateCible=new Date(r.dateCible||new Date());ts=Date.now();const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');etapes.lectureEvenements=Date.now()-ts;ts=Date.now();const actions=lireFeuilleDynamiquePlan_('Plan_Actions');etapes.lectureActions=Date.now()-ts;ts=Date.now();const ops=lireTable_('Operations');etapes.lectureOperations=Date.now()-ts;ts=Date.now();const hard=(r.lignes||[]).filter(function(x){return x.source==='operation_future';});etapes.extractionOperationsFutures=Date.now()-ts;ts=Date.now();let lignes=recalerFluxPlanCarteTresorerie20260901_(r.lignes||[],evenements,actions,hard,reference,dateCible);etapes.recalagePlanCb=Date.now()-ts;ts=Date.now();lignes=filtrerActionsPlanEffectivesTresorerie20260908_(lignes,actions);etapes.filtreActionsPlan=Date.now()-ts;ts=Date.now();lignes=lignes.filter(function(x){return x.source!=='debit_cb_estime';});etapes.retraitAnciennesEstimationsCb=Date.now()-ts;ts=Date.now();const debitsCb=estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,dateCible,cerbere);etapes.cbMultiCycleDepuisCerberePrecharge=Date.now()-ts;if(debitsCb.length)lignes.push.apply(lignes,debitsCb);ts=Date.now();lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);etapes.dedoublonnage=Date.now()-ts;ts=Date.now();lignes.sort(function(a,b){return new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude);});etapes.tri=Date.now()-ts;ts=Date.now();const final=recalculerSortieTresorerie20260901_(r,lignes,reference,dateCible);etapes.recalculSortie=Date.now()-ts;final.diagnostic20260831=final.diagnostic20260831||{};final.diagnostic20260831.cerberePrechargeProjection=true;ts=Date.now();const decomposition=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(final);etapes.decompositionCanonique=Date.now()-ts;final.proprietaireBudgetSoft=BUDGETSOFT_TREASURY_CANONICAL_OWNER;final.moteurSousJacent='chargerTresoreriePrevisionnelle20260901';final.versionContratCanonique=BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION;final.decompositionCanonique=decomposition;if(!decomposition.ok){final.ok=false;final.erreur='Contrat canonique de trésorerie non satisfait.';final.erreursContrat=decomposition.erreurs.slice();}return final;});const statsEtapes=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const sigA=signatureCanoniqueCompleteAuditPerf20260910_(baseline),sigB=signatureCanoniqueCompleteAuditPerf20260910_(reconstruit),identique=JSON.stringify(sigA)===JSON.stringify(sigB),totalEtapes=Object.keys(etapes).reduce(function(s,k){return s+Number(etapes[k]||0);},0),classement=Object.keys(etapes).map(function(k){return{etape:k,dureeMs:Number(etapes[k]||0),partPct:totalEtapes?Math.round(Number(etapes[k]||0)/totalEtapes*1000)/10:null};}).sort(function(a,b){return b.dureeMs-a.dureeMs;}),cb=(reconstruit&&reconstruit.lignes||[]).filter(function(x){return String(x&&x.source||'')==='debit_cb_estime';}).map(function(x){return{date:jourAuditPerfTresorerie20260910_(x.date),montant:arrAuditPerfTresorerie20260910_(x.montantSigne),partCerbere:arrAuditPerfTresorerie20260910_(x.partCerbere),partFinMois:arrAuditPerfTresorerie20260910_(x.partFinMois),moteurCerbere:String(x&&x.moteurCerbere||'')};});
  const out={ok:identique&&!!(baseline&&baseline.ok)&&!!(reconstruit&&reconstruit.ok),version:'2026-09-11.1',lectureSeule:true,aucuneModification:true,perimetre:{compare:'projection canonique courante avec Cerbère préchargé vs reconstruction instrumentée des mêmes étapes',dateReference:String(reconstruit&&reconstruit.dateReference||''),horizon:cible,sourceVerite:'construireTrajectoireTresorerieCanoniqueBudgetSoft20260907 / chargerTresoreriePrevisionnelle20260901',configurationSnapshot:'Cerbère préchargé puis transmis au moteur canonique (2026-09-10.3)'},comparaison:{identiqueAuCentimeEtLigneParLigne:identique,baseline:{version:sigA.version,soldeReel:sigA.soldeReel,variationPrevue:sigA.variationPrevue,soldePrevisionnel:sigA.soldePrevisionnel,nombreLignes:sigA.lignes.length},reconstruction:{version:sigB.version,soldeReel:sigB.soldeReel,variationPrevue:sigB.variationPrevue,soldePrevisionnel:sigB.soldePrevisionnel,nombreLignes:sigB.lignes.length}},temps:{cerberePrecharge:temps.cerberePrecharge,baselineCanonique:temps.baselineCanonique,reconstructionEtapes:totalEtapes,dureeTotale:Date.now()-tGlobal},etapes:etapes,classement:classement,lectures:{baseline:statsBaseline,etapes:statsEtapes},debitsCb:cb,decision:identique?'PROFIL_VALIDE_POUR_CHOISIR_LE_PROCHAIN_LEVIER':'PROFIL_INVALIDE_NE_RIEN_OPTIMISER',doctrine:'Profil uniquement. Ne modifier aucun calcul métier sur cette seule mesure ; le prochain candidat devra passer un A/B strict puis les gardes du snapshot.'};console.log('[AUDIT PERF profil projection courante] '+JSON.stringify(out));return out;
}

/** Profil strictement lecture seule des couches constituant chargerCerbereV374(). */
function auditerProfilInterneCerbereV374BudgetSoft20260911(){
  const etapes={},tGlobal=Date.now();
  function chrono(nom,fn){const t=Date.now(),v=fn();etapes[nom]=Date.now()-t;return v;}
  const tA=Date.now();const baseline=avecContexteLectureBudgetSoft20260827_('audit-profil-cerbere-v374-baseline-20260911',function(){return chargerCerbereV374();});const baselineMs=Date.now()-tA;const statsBaseline=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const instrumente=avecContexteLectureBudgetSoft20260827_('audit-profil-cerbere-v374-etapes-20260911',function(){
    let base=chrono('chargerCerbereV37',function(){return chargerCerbereV37();});
    base=chrono('resteReellementPilotableV374',function(){return appliquerResteReellementPilotableV374_(base);});
    base=chrono('auditCerbereV377',function(){return typeof appliquerAuditCerbereV377_==='function'?appliquerAuditCerbereV377_(base):base;});
    base=chrono('historiqueR0V378',function(){return typeof appliquerHistoriqueR0V378_==='function'?appliquerHistoriqueR0V378_(base):base;});
    base=chrono('rapprochementV3711',function(){return typeof appliquerRapprochementCerbereV3711_==='function'?appliquerRapprochementCerbereV3711_(base):base;});
    base=chrono('doctrineCycleV3712',function(){return typeof appliquerDoctrineCycleV3712_==='function'?appliquerDoctrineCycleV3712_(base):base;});
    base=chrono('conventionSalaireV3712',function(){return typeof appliquerConventionSalaireTousCyclesV3712_==='function'?appliquerConventionSalaireTousCyclesV3712_(base):base;});
    base=chrono('projectionFrontiereV3713',function(){return typeof appliquerProjectionFrontiereV3713_==='function'?appliquerProjectionFrontiereV3713_(base):base;});
    base=chrono('correctionFrontiereV3713b',function(){return typeof corrigerProjectionFrontiereV3713b_==='function'?corrigerProjectionFrontiereV3713b_(base):base;});
    base=chrono('effetsFinanciersActionsV3713',function(){return typeof corrigerEffetsFinanciersActionsV3713_==='function'?corrigerEffetsFinanciersActionsV3713_(base):base;});
    base=chrono('stabilisationV3716',function(){return stabiliserCerbereV3716_(base);});
    base=chrono('stabilisationV3724',function(){return stabiliserCerbereV3717_(base);});
    if(base&&typeof base==='object')base.version=CERBERE_PILOTAGE_V374_VERSION;
    return chrono('serialisationClient',function(){return serialiserCerberePourClient_(base);});
  });
  const statsEtapes=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  const a=JSON.stringify(baseline),b=JSON.stringify(instrumente),identique=a===b,total=Object.keys(etapes).reduce(function(s,k){return s+Number(etapes[k]||0);},0),classement=Object.keys(etapes).map(function(k){return{etape:k,dureeMs:Number(etapes[k]||0),partPct:total?Math.round(Number(etapes[k]||0)/total*1000)/10:null};}).sort(function(x,y){return y.dureeMs-x.dureeMs;});
  const periodes=(instrumente&&instrumente.periodes||[]).map(function(p){const v=p&&p.v37||{};return{cle:String(p&&p.periode&&p.periode.cle||p&&p.periode&&p.periode.debut||''),ret1:arrAuditPerfTresorerie20260910_(v.ret1),sct1:arrAuditPerfTresorerie20260910_(v.sct1),restePilotable:arrAuditPerfTresorerie20260910_(p&&p.resteBudgetPilotable)};});
  const out={ok:identique&&!!(instrumente&&instrumente.ok!==false),version:'2026-09-11.1',lectureSeule:true,aucuneModification:true,perimetre:{compare:'chargerCerbereV374() courant vs reconstruction instrumentée couche par couche',sourceVerite:'chargerCerbereV374 / CerberePilotageV374.gs',moteurAttendu:'3.7.24'},comparaison:{identiqueObjetSerialise:identique,versionBaseline:String(baseline&&baseline.version||''),versionInstrumentee:String(instrumente&&instrumente.version||''),nombrePeriodesBaseline:(baseline&&baseline.periodes||[]).length,nombrePeriodesInstrumentee:(instrumente&&instrumente.periodes||[]).length},temps:{baselineMs:baselineMs,reconstructionEtapesMs:total,dureeTotaleMs:Date.now()-tGlobal},etapes:etapes,classement:classement,lectures:{baseline:statsBaseline,etapes:statsEtapes},signatureMetier:{periodes:periodes},decision:identique?'PROFIL_CERBERE_VALIDE_POUR_CHOISIR_LEVIER':'PROFIL_CERBERE_INVALIDE_NE_RIEN_OPTIMISER',doctrine:'Profil uniquement. Aucun calcul métier modifié. Toute optimisation ultérieure doit d’abord passer un A/B strict puis les gardes du snapshot.'};
  console.log('[AUDIT PERF profil interne Cerbère V374] '+JSON.stringify(out));return out;
}
