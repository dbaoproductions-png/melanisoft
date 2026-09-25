/*
 * Trésorerie unifiée BudgetSoft — lecture seule.
 *
 * Un seul propriétaire métier du prévisionnel bancaire :
 * construireTrajectoireTresorerieCanoniqueBudgetSoft20260907() publié dans
 * modules.projectionEtendue. Le moteur 20260901 reste son implémentation métier.
 * Dashboard, Comptes et Cerbère lisent la même trajectoire et la même révision.
 */
const BUDGETSOFT_UNIFIED_TREASURY_VERSION='2026-09-21.1';

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
function lignesProjectionJusquaTresorerieUnifiee20260907_(projection,cible){const ref=jourTresorerieUnifiee20260907_(projection&&projection.dateReference),b=jourTresorerieUnifiee20260907_(cible);return (projection&&projection.lignes||[]).filter(l=>{const j=jourTresorerieUnifiee20260907_(l&&l.date);return j&&ref&&b&&j>ref&&j<=b;});}
function decompositionCibleTresorerieUnifiee20260907_(projection,cible,soldePrevisionnel){
  if(typeof decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_!=='function')return null;
  const copie=Object.assign({},projection||{}, {lignes:lignesProjectionJusquaTresorerieUnifiee20260907_(projection,cible),soldePrevisionnel:soldePrevisionnel});
  return decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(copie);
}
function resumerContratCanoniqueTresorerieUnifiee20260907_(d){
  if(!d)return null;const g=d.groupes||{},groupes={};
  Object.keys(g).forEach(k=>{groupes[k]={montant:Number(g[k]&&g[k].montant||0),nombre:Number(g[k]&&g[k].nombre||0)};});
  return{ok:!!d.ok,version:d.version||'',soldeReel:d.soldeReel,variationPrevue:d.variationPrevue,soldePrevisionnel:d.soldePrevisionnel,groupes:groupes,controles:d.controles||null,erreurs:d.erreurs||[]};
}

function auditerUniteModulesTresorerieBudgetSoft20260907_(modules){
  modules=modules||{};const c=modules.comptes||{},p=modules.projectionEtendue||{},d=modules.dashboard||{},cer=modules.cerbere||{};
  const valeurs={comptes:Number(c&&c.synthese&&c.synthese.disponible),moteur:Number(p&&p.soldeReel),dashboard:Number(d&&d.courtTerme&&d.courtTerme.soldeBancaire),cerbere:Number(cer&&cer.reel&&cer.reel.soldeBancaire)};
  const presentes=Object.entries(valeurs).filter(([,v])=>Number.isFinite(v));
  const nums=presentes.map(([,v])=>v),ecart=nums.length?arrTresorerieUnifiee20260907_(Math.max.apply(null,nums)-Math.min.apply(null,nums)):null;
  const versionMoteur=String(p&&p.version||''),proprietaire=String(p&&p.proprietaireBudgetSoft||''),moteurSousJacent=String(p&&p.moteurSousJacent||'');
  const moteurDoctrinal=proprietaire==='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907'&&moteurSousJacent==='chargerTresoreriePrevisionnelle20260901'&&!!(p&&p.decompositionCanonique&&p.decompositionCanonique.ok===true);
  return{ok:presentes.length>=4&&ecart!=null&&Math.abs(ecart)<=.01&&moteurDoctrinal,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,valeurs,ecartSoldeReel:ecart,versionMoteur,proprietaire,moteurSousJacent,moteurDoctrinal,composants:presentes.map(([k])=>k),contratCanoniqueSnapshot:p&&p.decompositionCanonique||null};
}

function chargerTresorerieUnifieeBudgetSoft20260907(dateCible){
  const e=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
  const m=e&&e.modules||{};
  const p=m.projectionEtendue||{},c=m.comptes||{},d=m.dashboard||{};
  const sourceBudgetSoft='snapshot_global_projection_canonique',revisionBudgetSoft=e&&e.revisionBudgetSoft||'',genereLe=e&&e.genereLe||'';
  if(!e||e.ok!==true||!p||p.ok===false){
    return{ok:false,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,sourceBudgetSoft:'snapshot_global_indisponible',revisionBudgetSoft:revisionBudgetSoft,erreur:'Révision BudgetSoft globale indisponible : la trésorerie unifiée ne lance pas de recalcul métier depuis une interface.'};
  }
  const ref=jourTresorerieUnifiee20260907_(p.dateReference);
  const cibleDemandee=jourTresorerieUnifiee20260907_(dateCible);
  const cible=cibleDemandee||jourTresorerieUnifiee20260907_(finCycleTresorerieUnifiee20260907_(p.dateReference));
  const soldeComptes=Number(c&&c.synthese&&c.synthese.disponible),soldeMoteur=Number(p.soldeReel),soldeDashboard=Number(d&&d.courtTerme&&d.courtTerme.soldeBancaire),soldeCible=pointProjectionTresorerieUnifiee20260907_(p,cible);
  const decompositionCible=decompositionCibleTresorerieUnifiee20260907_(p,cible,soldeCible);
  return{ok:true,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,sourceBudgetSoft:sourceBudgetSoft,revisionBudgetSoft:revisionBudgetSoft,genereLe:genereLe,versionMoteur:p.version||'',proprietaireBudgetSoft:p.proprietaireBudgetSoft||'',moteurSousJacent:p.moteurSousJacent||'',versionContratCanonique:p.versionContratCanonique||'',dateReference:ref,dateCible:cible,soldeReel:Number.isFinite(soldeMoteur)?soldeMoteur:null,soldePrevisionnel:soldeCible,soldesSources:{comptes:Number.isFinite(soldeComptes)?soldeComptes:null,moteur:Number.isFinite(soldeMoteur)?soldeMoteur:null,dashboard:Number.isFinite(soldeDashboard)?soldeDashboard:null},lignes:Array.isArray(p.lignes)?p.lignes:[],decompositionCanonique:decompositionCible,confiance:p.confiance||null,doctrine:'Une révision, un solde réel, un propriétaire canonique. Snapshot frais sinon recalcul du même propriétaire canonique ; jamais de moteur local concurrent.'};
}

function chargerTrajectoireBanqueCerbereRapideLegacyUnified20260903_(dateCible,partCerbere){const r=chargerTresorerieUnifieeBudgetSoft20260907(dateCible);if(!r.ok)return r;const cible=String(r.dateCible||'');return{ok:true,version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:r.revisionBudgetSoft,dateReference:r.dateReference,dateCible:cible,soldeReel:r.soldeReel,lignes:(r.lignes||[]).filter(l=>jourTresorerieUnifiee20260907_(l&&l.date)<=cible),decompositionCanonique:r.decompositionCanonique,confiance:r.confiance,sourceBudgetSoft:r.sourceBudgetSoft||'recalcul_secours_canonique',partCerbereIgnoree:true};}

function auditerUniteTresorerieBudgetSoft20260907(){
  const s=chargerSnapshotGlobalBudgetSoft20260906(),e=s&&s.disponible&&s.etat,m=e&&e.modules||{},g=auditerUniteModulesTresorerieBudgetSoft20260907_(m),r=chargerTresorerieUnifieeBudgetSoft20260907();
  const out={ok:!!(r.ok&&r.decompositionCanonique&&r.decompositionCanonique.ok&&(e?g.ok:true)),version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,sourceBudgetSoft:r&&r.sourceBudgetSoft||'',revisionBudgetSoft:e&&e.revisionBudgetSoft||'',versionMoteur:r&&r.versionMoteur||g.versionMoteur,proprietaire:r&&r.proprietaireBudgetSoft||g.proprietaire,moteurSousJacent:r&&r.moteurSousJacent||g.moteurSousJacent,dateReference:r.dateReference,dateCible:r.dateCible,soldeReel:r.soldeReel,soldePrevisionnel:r.soldePrevisionnel,soldesSources:e?g.valeurs:r.soldesSources,ecartSoldeReel:e?g.ecartSoldeReel:null,moteurDoctrinal:e?g.moteurDoctrinal:(r.proprietaireBudgetSoft==='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907'&&r.moteurSousJacent==='chargerTresoreriePrevisionnelle20260901'),contratCanoniqueCible:resumerContratCanoniqueTresorerieUnifiee20260907_(r.decompositionCanonique)};
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
  const out={ok:Math.abs(ecart)<=.01&&!!(r.decompositionCanonique&&r.decompositionCanonique.ok),version:BUDGETSOFT_UNIFIED_TREASURY_VERSION,revisionBudgetSoft:r.revisionBudgetSoft,proprietaire:r.proprietaireBudgetSoft,moteurSousJacent:r.moteurSousJacent,dateReference:r.dateReference,dateCible:cible,soldeReel:r.soldeReel,variationPrevue:variation,soldePrevisionnel:r.soldePrevisionnel,soldeReconstitue,ecartReconciliation:ecart,parSource,decompositionCanonique:resumerContratCanoniqueTresorerieUnifiee20260907_(r.decompositionCanonique),lignes};
  console.log('[AUDIT Projection 27-09] '+JSON.stringify(out));return out;
}

/**
 * Audit des consommateurs de l'interface TreasuryForecast.
 * Périmètre obligatoire : consommateurs comparés, date de référence et source de vérité.
 * Une cible au-delà de l'horizon publié du snapshot n'est comparée au canon que jusqu'à
 * cet horizon ; les flux postérieurs sont signalés comme hors horizon, pas comme écarts.
 */
function auditerConsommateursTreasuryForecast20260909(){
  const cibles=['2026-10-27','2026-10-31'];
  const essais=[];
  const cle=function(l){return [jourTresorerieUnifiee20260907_(l&&l.date),String(l&&l.source||''),String(l&&l.sourceId||''),arrTresorerieUnifiee20260907_(Number(l&&l.montantSigne||0))].join('|');};
  const resumer=function(xs,ref,cible){
    const lignes=(xs||[]).filter(l=>{const j=jourTresorerieUnifiee20260907_(l&&l.date);return j&&j>ref&&j<=cible&&String(l&&l.source||'')!=='pilotable';});
    const map={};lignes.forEach(l=>map[cle(l)]=l);
    return{lignes:lignes,map:map,net:arrTresorerieUnifiee20260907_(lignes.reduce((s,l)=>s+Number(l&&l.montantSigne||0),0))};
  };
  const apres=function(xs,horizon,cible){return (xs||[]).filter(l=>{const j=jourTresorerieUnifiee20260907_(l&&l.date);return j&&j>horizon&&j<=cible&&String(l&&l.source||'')!=='pilotable';}).map(cle);};
  cibles.forEach(cible=>{
    const canon=chargerTresorerieUnifieeBudgetSoft20260907(cible);
    const ref=String(canon&&canon.dateReference||'');
    const joursCanon=(canon&&canon.lignes||[]).map(l=>jourTresorerieUnifiee20260907_(l&&l.date)).filter(j=>j&&j>ref).sort();
    const horizonSnapshot=joursCanon.length?joursCanon[joursCanon.length-1]:ref;
    const cibleComparee=cible<horizonSnapshot?cible:horizonSnapshot;
    const c=resumer(canon&&canon.lignes||[],ref,cibleComparee);
    let explicite=null,rapide=null,erreurExplicite='',erreurRapide='';
    try{explicite=typeof listerMouvementsFutursTresorerieSansCerbere20260902==='function'?listerMouvementsFutursTresorerieSansCerbere20260902(cible):null;}catch(e){erreurExplicite=String(e&&e.message||e);}
    try{rapide=typeof listerMouvementsFutursTresorerieRapide20260901==='function'?listerMouvementsFutursTresorerieRapide20260901(cible):null;}catch(e){erreurRapide=String(e&&e.message||e);}
    const e=resumer(explicite&&explicite.lignes||[],ref,cibleComparee),r=resumer(rapide&&rapide.lignes||[],ref,cibleComparee);
    const extrasExplicites=Object.keys(e.map).filter(k=>!c.map[k]);
    const extrasRapides=Object.keys(r.map).filter(k=>!c.map[k]);
    const manquantsRapides=Object.keys(c.map).filter(k=>!r.map[k]);
    const actionsNonCanoniques=(e.lignes.concat(r.lignes)).filter(l=>String(l&&l.source||'')==='action'&&!c.map[cle(l)]).map(l=>({date:jourTresorerieUnifiee20260907_(l.date),sourceId:String(l.sourceId||''),libelle:String(l.libelle||''),montant:arrTresorerieUnifiee20260907_(Number(l.montantSigne||0))}));
    const horsHorizonExplicite=apres(explicite&&explicite.lignes||[],horizonSnapshot,cible);
    const horsHorizonRapide=apres(rapide&&rapide.lignes||[],horizonSnapshot,cible);
    essais.push({
      cible:cible,
      perimetre:{compare:'carte solde + point Cerbère + liste explicite + liste rapide',dateReference:ref,sourceVerite:String(canon&&canon.sourceBudgetSoft||'projection canonique'),horizonSnapshot:horizonSnapshot,cibleComparee:cibleComparee},
      revisionBudgetSoft:canon&&canon.revisionBudgetSoft||'',
      carteSolde:{source:'chargerTresorerieUnifieeBudgetSoft20260907',solde:canon&&canon.soldePrevisionnel},
      cerbereRapide:{source:'chargerTresorerieUnifieeBudgetSoft20260907',overrideTerminal:true},
      canon:{nombre:c.lignes.length,net:c.net},
      listeExplicite:{disponible:!!(explicite&&explicite.ok),version:explicite&&explicite.version||'',nombre:e.lignes.length,net:e.net,extras:extrasExplicites.slice(0,20),horsHorizon:horsHorizonExplicite.slice(0,20),erreur:erreurExplicite},
      listeRapide:{disponible:!!(rapide&&rapide.ok),version:rapide&&rapide.version||'',nombre:r.lignes.length,net:r.net,extras:extrasRapides.slice(0,20),manquants:manquantsRapides.slice(0,20),horsHorizon:horsHorizonRapide.slice(0,20),erreur:erreurRapide},
      actionsNonCanoniques:actionsNonCanoniques,
      controles:{carteEtCerbereSurSnapshot:!!(canon&&canon.ok),expliciteSousVueCanonique:extrasExplicites.length===0,rapideAligneCanonique:extrasRapides.length===0&&manquantsRapides.length===0,aucuneActionNonCanonique:actionsNonCanoniques.length===0,horizonRespecte:true}
    });
  });
  const ok=essais.every(x=>x.controles.carteEtCerbereSurSnapshot&&x.controles.expliciteSousVueCanonique&&x.controles.rapideAligneCanonique&&x.controles.aucuneActionNonCanonique&&x.controles.horizonRespecte);
  const out={ok:ok,version:'2026-09-09.2',essais:essais,note:'Comparaison canonique limitée à l’horizon effectivement publié du snapshot ; les flux ultérieurs restent informatifs et ne constituent pas une divergence.'};
  console.log('[AUDIT consommateurs TreasuryForecast] '+JSON.stringify(out));
  return out;
}

/**
 * Audit lecture seule d'une cible de trésorerie unifiée.
 * Journalise la décomposition complète afin d'expliquer le solde prévisionnel affiché.
 */
function auditerProjectionTresorerieCibleBudgetSoft20260925(dateCible){
  const cible=String(dateCible||'').trim()||'2026-10-27';
  const r=chargerTresorerieUnifieeBudgetSoft20260907(cible);
  if(!r||!r.ok){
    const e={ok:false,lectureSeule:true,version:'2026-09-25.2',dateCible:cible,erreur:r&&r.erreur||'Trésorerie unifiée indisponible'};
    console.log('[AUDIT PROJECTION TRESORERIE CIBLE 20260925] '+JSON.stringify(e));
    return e;
  }
  const lignes=(r.lignes||[]).map(function(l){
    return{
      jour:jourTresorerieUnifiee20260907_(l&&l.date),
      source:String(l&&l.source||''),
      sourceId:String(l&&l.sourceId||''),
      libelle:String(l&&l.libelle||''),
      categorie:String(l&&l.categorie||''),
      montant:arrTresorerieUnifiee20260907_(Number(l&&l.montantSigne||0)),
      certitude:String(l&&l.certitude||''),
      preuve:String(l&&l.preuve||''),
      dateConventionnelle:!!(l&&l.dateConventionnelle)
    };
  }).filter(function(x){return x.jour&&x.jour>r.dateReference&&x.jour<=cible;});
  lignes.sort(function(a,b){return a.jour.localeCompare(b.jour)||a.source.localeCompare(b.source)||a.montant-b.montant;});
  const parSource={};let variation=0;
  lignes.forEach(function(x){
    variation+=x.montant;
    const k=x.source||'sans_source';
    if(!parSource[k])parSource[k]={nombre:0,net:0,recettes:0,depenses:0};
    const p=parSource[k];p.nombre++;p.net+=x.montant;
    if(x.montant>=0)p.recettes+=x.montant;else p.depenses+=Math.abs(x.montant);
  });
  Object.keys(parSource).forEach(function(k){
    const p=parSource[k];
    p.net=arrTresorerieUnifiee20260907_(p.net);
    p.recettes=arrTresorerieUnifiee20260907_(p.recettes);
    p.depenses=arrTresorerieUnifiee20260907_(p.depenses);
  });
  variation=arrTresorerieUnifiee20260907_(variation);
  const soldeReconstitue=arrTresorerieUnifiee20260907_(Number(r.soldeReel||0)+variation);
  const ecart=arrTresorerieUnifiee20260907_(soldeReconstitue-Number(r.soldePrevisionnel||0));
  const out={
    ok:Math.abs(ecart)<=.01,
    lectureSeule:true,
    version:'2026-09-25.1',
    revisionBudgetSoft:r.revisionBudgetSoft||'',
    proprietaire:r.proprietaireBudgetSoft||'',
    moteurSousJacent:r.moteurSousJacent||'',
    dateReference:r.dateReference||'',
    dateCible:cible,
    soldeReel:Number(r.soldeReel||0),
    variationPrevue:variation,
    soldePrevisionnel:Number(r.soldePrevisionnel||0),
    soldeReconstitue:soldeReconstitue,
    ecartReconciliation:ecart,
    parSource:parSource,
    decompositionCanonique:resumerContratCanoniqueTresorerieUnifiee20260907_(r.decompositionCanonique),
    lignes:lignes
  };
  console.log('[AUDIT PROJECTION TRESORERIE CIBLE 20260925] '+JSON.stringify(out));
  return out;
}


function auditerPostesProjectionTresorerie20260925(dateCible){
  const cible=String(dateCible||'2026-10-27');
  const r=chargerTresorerieUnifieeBudgetSoft20260907(cible);
  if(!r||!r.ok){
    const e={ok:false,lectureSeule:true,version:'2026-09-25.2',dateCible:cible,erreur:r&&r.erreur||'indisponible'};
    console.log('[AUDIT POSTES PROJECTION 20260925] '+JSON.stringify(e));
    return e;
  }

  const ref=String(r.dateReference||'');
  const lignes=(r.lignes||[]).filter(function(l){
    const j=jourTresorerieUnifiee20260907_(l&&l.date);
    return j&&j>ref&&j<=cible;
  });

  const cf=lignes.filter(function(l){return String(l&&l.source||'')==='charge_fixe';}).map(function(l){
    return {
      date:jourTresorerieUnifiee20260907_(l.date),
      sourceId:String(l.sourceId||''),
      libelle:String(l.libelle||''),
      categorie:String(l.categorie||''),
      montant:arrTresorerieUnifiee20260907_(Number(l.montantSigne||0)),
      preuve:String(l.preuve||'')
    };
  });

  const cb=lignes.filter(function(l){return String(l&&l.source||'')==='debit_cb_estime';}).map(function(l){
    return {
      date:jourTresorerieUnifiee20260907_(l.date),
      montant:arrTresorerieUnifiee20260907_(Number(l.montantSigne||0)),
      partCerbere:arrTresorerieUnifiee20260907_(Number(l.partCerbere||0)),
      partFinMois:arrTresorerieUnifiee20260907_(Number(l.partFinMois||0)),
      moteurCerbere:String(l.moteurCerbere||''),
      preuve:String(l.preuve||'')
    };
  });

  const rev=lignes.filter(function(l){return String(l&&l.source||'')==='revenu_recurrent';}).map(function(l){
    return {
      date:jourTresorerieUnifiee20260907_(l.date),
      sourceId:String(l.sourceId||''),
      libelle:String(l.libelle||''),
      categorie:String(l.categorie||''),
      montant:arrTresorerieUnifiee20260907_(Number(l.montantSigne||0)),
      certitude:String(l.certitude||''),
      preuve:String(l.preuve||'')
    };
  });

  const canon=typeof lireCanonRecettesTresorerie20260831_==='function'?lireCanonRecettesTresorerie20260831_():[];
  const canonResume=(canon||[]).map(function(x){
    return {
      categorie:String(x&&x.categorie||''),
      nature:String(x&&x.nature||''),
      actif:x&&x.actif,
      montant:arrTresorerieUnifiee20260907_(Math.abs(Number(x&&x.montant||0))),
      montantPrecedent:arrTresorerieUnifiee20260907_(Math.abs(Number(x&&x.montant_precedent||0))),
      dateEffet:String(x&&x.date_effet||'')
    };
  });

  const total=function(xs){
    return arrTresorerieUnifiee20260907_(xs.reduce(function(s,x){return s+Number(x.montant||0);},0));
  };

  const out={
    ok:true,
    lectureSeule:true,
    version:'2026-09-25.2',
    revisionBudgetSoft:r.revisionBudgetSoft||'',
    dateReference:ref,
    dateCible:cible,
    soldeReel:r.soldeReel,
    soldePrevisionnel:r.soldePrevisionnel,
    chargesFixes:{nombre:cf.length,total:total(cf),casden:cf.filter(function(x){return /casden/i.test(x.libelle+' '+x.categorie);}),lignes:cf},
    debitCbEstime:{nombre:cb.length,total:total(cb),lignes:cb},
    recettesRecurrentes:{nombre:rev.length,total:total(rev),lignes:rev},
    recettesCanon:{nombre:canonResume.length,total:arrTresorerieUnifiee20260907_(canonResume.reduce(function(s,x){return s+Number(x.montant||0);},0)),lignes:canonResume}
  };
  console.log('[AUDIT POSTES PROJECTION 20260925] '+JSON.stringify(out));
  return out;
}


function auditerHistoriqueRecettesEtQueueCb20260925(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat,m=e&&e.modules||{},p=m.projectionEtendue||{};
  const ref=new Date(String(p.dateReference||new Date()));
  const ops=typeof lireTable_==='function'?lireTable_('Operations'):[];
  const canon=typeof lireCanonRecettesTresorerie20260831_==='function'?lireCanonRecettesTresorerie20260831_():[];

  const mois=[];
  for(let k=6;k>=1;k--){
    const d=new Date(ref.getFullYear(),ref.getMonth()-k,1,12,0,0,0);
    mois.push(Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM'));
  }

  const recettesParMois={};
  mois.forEach(function(x){recettesParMois[x]={total:0,parCategorie:{},lignes:0};});
  (ops||[]).forEach(function(o){
    const d=typeof dateOpTresorerie_==='function'?dateOpTresorerie_(o):new Date(o&&o.date_comptable||o&&o.date||0);
    if(!d||isNaN(d))return;
    const mk=Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM');
    if(!recettesParMois[mk])return;
    const mt=typeof montantSigneOperationRevenuBudgetSoft20260908_==='function'
      ?Number(montantSigneOperationRevenuBudgetSoft20260908_(o)||0)
      :Number(o&&o.montant||0);
    if(!(mt>0))return;
    const cat=String(o&&o.categorie||'(sans catégorie)').trim()||'(sans catégorie)';
    recettesParMois[mk].total+=mt;
    recettesParMois[mk].parCategorie[cat]=(recettesParMois[mk].parCategorie[cat]||0)+mt;
    recettesParMois[mk].lignes++;
  });
  Object.keys(recettesParMois).forEach(function(k){
    const x=recettesParMois[k];x.total=Math.round(x.total*100)/100;
    Object.keys(x.parCategorie).forEach(function(cat){x.parCategorie[cat]=Math.round(x.parCategorie[cat]*100)/100;});
  });

  const vals=mois.map(function(x){return Number(recettesParMois[x].total||0);});
  const valsTriees=vals.slice().sort(function(a,b){return a-b;});
  const moyenne=vals.length?vals.reduce(function(a,b){return a+b;},0)/vals.length:0;
  const mediane=valsTriees.length?(valsTriees.length%2?valsTriees[(valsTriees.length-1)/2]:(valsTriees[valsTriees.length/2-1]+valsTriees[valsTriees.length/2])/2):0;

  const canonResume=(canon||[]).map(function(x){
    return {categorie:String(x&&x.categorie||''),nature:String(x&&x.nature||''),actif:x&&x.actif,montant:Math.round(Math.abs(Number(x&&x.montant||0))*100)/100};
  });

  const queueCb=[];
  for(let k=1;k<=4;k++){
    const d0=new Date(ref.getFullYear(),ref.getMonth()-k,1),y=d0.getFullYear(),mo=d0.getMonth();
    const dernier=new Date(y,mo+1,0).getDate();
    let total=0,nombre=0;
    const detail=[];
    (ops||[]).forEach(function(o){
      if(typeof estOperationCarteTresorerie20260901_==='function'&&!estOperationCarteTresorerie20260901_(o))return;
      if(o&&o.charge_fixe_id)return;
      const mt=Number(o&&o.montant||0);if(!(mt<0))return;
      const da=typeof dateAchatCarteTresorerie20260901_==='function'?dateAchatCarteTresorerie20260901_(o):new Date(o&&o.date_achat||o&&o.date||0);
      if(!da||isNaN(da)||da.getFullYear()!==y||da.getMonth()!==mo||da.getDate()<28)return;
      total+=Math.abs(mt);nombre++;
      detail.push({date:Utilities.formatDate(da,Session.getScriptTimeZone(),'yyyy-MM-dd'),libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),montant:Math.round(Math.abs(mt)*100)/100});
    });
    queueCb.push({mois:Utilities.formatDate(d0,Session.getScriptTimeZone(),'yyyy-MM'),jours28Fin:dernier-27,nombre:nombre,total:Math.round(total*100)/100,moyenneJour:Math.round((total/Math.max(1,dernier-27))*100)/100,detail:detail});
  }

  const out={
    ok:true,lectureSeule:true,version:'2026-09-25.1',
    revisionBudgetSoft:e&&e.revisionBudgetSoft||'',dateReference:String(p.dateReference||''),
    recettesHistoriques:{mois:mois,parMois:recettesParMois,moyenne6M:Math.round(moyenne*100)/100,mediane6M:Math.round(mediane*100)/100},
    recettesCanon:{nombre:canonResume.length,lignes:canonResume},
    queueCbHistorique4M:queueCb
  };
  console.log('[AUDIT HISTORIQUE RECETTES ET QUEUE CB 20260925] '+JSON.stringify(out));
  return out;
}


function auditerDoctrinePrevisionIntermodule20260925(){
  const cible='2026-10-27';
  const r0=typeof chargerCanonRecettesCerbereV1==='function'?chargerCanonRecettesCerbereV1():null;
  const t=chargerTresorerieUnifieeBudgetSoft20260907(cible);
  const cer=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;
  const postes=Array.isArray(r0&&r0.postes)?r0.postes:[];
  const parCat={};postes.forEach(function(x){parCat[String(x&&x.categorie||'')]=x;});
  const lignes=Array.isArray(t&&t.lignes)?t.lignes:[];

  const casden=lignes.filter(function(x){
    return String(x&&x.source||'')==='charge_fixe' &&
      /casden/i.test(String(x&&x.libelle||'')+' '+String(x&&x.categorie||'')) &&
      jourTresorerieUnifiee20260907_(x&&x.date)==='2026-10-04';
  });

  const cbEst=lignes.filter(function(x){return String(x&&x.source||'')==='debit_cb_estime';});
  const cbSept=cbEst.find(function(x){return jourTresorerieUnifiee20260907_(x&&x.date)==='2026-09-30';})||null;
  const rev=lignes.filter(function(x){return String(x&&x.source||'')==='revenu_recurrent';});
  const revCats={};rev.forEach(function(x){
    const cat=String(x&&x.categorie||'');
    if(!revCats[cat])revCats[cat]={total:0,lignes:[]};
    revCats[cat].total+=Number(x&&x.montantSigne||0);revCats[cat].lignes.push(x);
  });
  Object.keys(revCats).forEach(function(k){revCats[k].total=Math.round(revCats[k].total*100)/100;});

  const p2=cer&&Array.isArray(cer.periodes)?cer.periodes[1]:null,v2=p2&&p2.v37||{},audit2=v2.rt1Audit||{};
  const socleP2=Number(audit2.socleCanonTerminal3723!=null?audit2.socleCanonTerminal3723:audit2.socleCanonTerminal3716);

  const controles={
    salaire2567:Math.abs(Number(parCat.Salaires&&parCat.Salaires.montant||0)-2567)<.011,
    foncier780:Math.abs(Number(parCat['Revenus fonciers']&&parCat['Revenus fonciers'].montant||0)-780)<.011,
    franceTravailGlissant:String(parCat['France Travail']&&parCat['France Travail'].mode_prevision||'').indexOf('moyenne_glissante')===0,
    coursGlissant:String(parCat.Cours&&parCat.Cours.mode_prevision||'').indexOf('moyenne_glissante')===0,
    concertsGlissant:String(parCat.Concerts&&parCat.Concerts.mode_prevision||'').indexOf('moyenne_glissante')===0,
    casden0410Absent:casden.length===0,
    cbDepuisEpRestant90:!!cbSept&&String(cbSept.ownerCb||'')==='ep_restant_90pct_20260925'&&Math.abs(Number(cbSept.tauxCbPilotablePct||0)-90)<.011,
    cbPartEpCoherente:!!cbSept&&Math.abs(Number(cbSept.partEp||0)-Number(cbSept.residuelCb||0))<.011,
    cbEtalon1950DiagnosticSeulement:!!cbSept&&Math.abs(Number(cbSept.calibrationCb||0)-1950)<.011,
    coursRapprochementAgrege:!!(revCats.Cours&&revCats.Cours.lignes.some(function(x){return String(x&&x.modeRapprochementReel||'')==='cible_mensuelle_agregee';})),
    concertsRapprochementAgrege:!!(revCats.Concerts&&revCats.Concerts.lignes.some(function(x){return String(x&&x.modeRapprochementReel||'')==='cible_mensuelle_agregee';})),
    p2SocleR0Commun:Number.isFinite(socleP2)?Math.abs(socleP2-Number(r0&&r0.total||0))<.011:null,
    memeRevision:!!(t&&cer&&t.revisionBudgetSoft&&cer.revisionBudgetSoft&&String(t.revisionBudgetSoft)===String(cer.revisionBudgetSoft))
  };
  const valeurs={};
  Object.keys(parCat).forEach(function(k){valeurs[k]={montant:Number(parCat[k].montant||0),mode:String(parCat[k].mode_prevision||''),source:String(parCat[k].source_prevision||'')};});
  const ok=Object.keys(controles).every(function(k){return controles[k]!==false;});
  const out={
    ok:ok,lectureSeule:true,version:'2026-09-25.1',
    revisionBudgetSoft:String(t&&t.revisionBudgetSoft||''),
    recettesEffectives:{total:Number(r0&&r0.total||0),postes:valeurs},
    tresorerie:{soldeReel:t&&t.soldeReel,soldePrevisionnel:t&&t.soldePrevisionnel,recettesProjetees:revCats,casden0410:casden,cbSeptembre:cbSept},
    cerbere:{version:cer&&cer.version||'',p2Rt1:Number(v2.rt1||0),p2SocleCanon:Number.isFinite(socleP2)?socleP2:null},
    controles:controles,
    doctrine:{
      recettes:'R0 effectif partagé ; courant Cerbère conservateur, futur/statistique bancaire par cible mensuelle et remplacement/consommation par le Réel',
      cb:'pilotage EP par date d’achat ; trésorerie bancaire par date de débit : achats réels déjà connus + 90 % de l’EP restant ; charges fixes CB séparées ; 1 950 € = étalon de contrôle seulement',
      chargesFixes:'générateur canonique ajusté partagé, y compris échéances ignorées/reportées'
    }
  };
  console.log('[AUDIT DOCTRINE PREVISION INTERMODULE 20260925] '+JSON.stringify(out));return out;
}


function auditerCasdenEtR0Live20260925(){
  const charges=typeof lireTable_==='function'?(lireTable_('Charges_fixes')||[]):[];
  const casden=charges.find(function(x){return /casden/i.test(String(x&&x.libelle||'')+' '+String(x&&x.libelle_bancaire||''));})||null;
  let ajustements=[];try{ajustements=typeof lireAjustementsChargesFixes==='function'?(lireAjustementsChargesFixes()||[]):[];}catch(e){}
  const ajCasden=casden?ajustements.filter(function(a){return String(a&&a.charge_fixe_id||'')===String(casden.id||'');}):[];
  const debut=new Date(2026,8,25,12,0,0,0),fin=new Date(2026,9,27,23,59,59,999);
  let echeances=[];try{if(casden&&typeof calculerEcheancesChargeFixeAjustees_==='function')echeances=calculerEcheancesChargeFixeAjustees_(casden,debut,fin,fin,ajustements)||[];}catch(e){echeances=[{erreur:String(e&&e.message||e)}];}
  const r0=typeof chargerCanonRecettesCerbereV1==='function'?chargerCanonRecettesCerbereV1():null;
  const cer=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;
  const p2=cer&&Array.isArray(cer.periodes)?cer.periodes[1]:null,v2=p2&&p2.v37||{},audit2=v2.rt1Audit||{};
  const projection=typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function'?construireTrajectoireTresorerieCanoniqueBudgetSoft20260907('2026-10-27',cer):null;
  const casdenProj=(projection&&projection.lignes||[]).filter(function(x){return String(x&&x.source||'')==='charge_fixe'&&/casden/i.test(String(x&&x.libelle||''));});
  const out={
    ok:true,lectureSeule:true,version:'2026-09-25.1',
    casden:{
      charge:casden?{id:String(casden.id||''),libelle:String(casden.libelle||''),montant:Number(casden.montant||0),jour:Number(casden.jour||0)}:null,
      ajustements:ajCasden,
      echeancesAjustees:echeances.map(function(e){return{date:e&&e.date?Utilities.formatDate(new Date(e.date),Session.getScriptTimeZone(),'yyyy-MM-dd'):'',montant:Number(e&&e.montant||0),ajustement:String(e&&e.ajustement||''),erreur:e&&e.erreur||''};}),
      lignesProjectionLive:casdenProj.map(function(x){return{date:jourTresorerieUnifiee20260907_(x.date),montant:Number(x.montantSigne||0),preuve:String(x.preuve||''),ajustementId:String(x.ajustementId||'')};})
    },
    recettes:{
      r0Total:Number(r0&&r0.total||0),
      r0Postes:(r0&&r0.postes||[]).map(function(x){return{categorie:String(x.categorie||''),montant:Number(x.montant||0),mode:String(x.mode_prevision||'')};}),
      cerbereP2Rt1:Number(v2.rt1||0),
      cerbereP2SocleCanon:Number(audit2.socleCanonTerminal3723!=null?audit2.socleCanonTerminal3723:audit2.socleCanonTerminal3716||0)
    },
    projectionLive:{
      ok:!!(projection&&projection.ok!==false),
      version:projection&&projection.version||'',
      soldeReel:projection&&projection.soldeReel,
      soldePrevisionnel:projection&&projection.soldePrevisionnel,
      cb:(projection&&projection.lignes||[]).filter(function(x){return String(x&&x.source||'')==='debit_cb_estime';}).map(function(x){return{date:jourTresorerieUnifiee20260907_(x.date),montant:Number(x.montantSigne||0),ownerCb:String(x.ownerCb||''),ep:Number(x.ep||0),epConsomme:Number(x.epConsomme||0),epRestant:Number(x.epRestant||0),taux:Number(x.tauxCbPilotablePct||0),etalon:Number(x.calibrationCb||0)};})
    }
  };
  out.ok=!!(casden&&out.casden.echeancesAjustees.every(function(x){return x.date!=='2026-10-04';})&&out.casden.lignesProjectionLive.every(function(x){return x.date!=='2026-10-04';})&&Math.abs(out.recettes.r0Total-5176.19)<.02);
  console.log('[AUDIT CASDEN R0 LIVE 20260925] '+JSON.stringify(out));return out;
}
