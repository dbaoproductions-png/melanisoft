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
 *
 * Règle de sécurité : aucune optimisation n'est appliquée ici. On photographie
 * d'abord les performances ET les invariants métier de la révision publiée.
 * Toute optimisation ultérieure devra reproduire cette signature au centime et
 * laisser toutes les gardes vertes avant d'être conservée.
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
  const signature={
    revisionBudgetSoft:String(e.revisionBudgetSoft||''),
    versionConstructeur:String(e.versionConstructeur||''),
    projectionVersion:String(proj.version||''),
    projectionOwner:String(proj.proprietaireBudgetSoft||''),
    contratVersion:String(proj.versionContratCanonique||''),
    soldeReel:arr(Number(proj.soldeReel)),
    soldeDashboard:arr(Number(dash&&dash.courtTerme&&dash.courtTerme.soldeBancaire)),
    pilotableDashboard:arr(Number(dash&&dash.courtTerme&&dash.courtTerme.pilotableDisponible)),
    cerbereP1:arr(Number(cer&&cer.p1&&cer.p1.budget||cer&&cer.p1||0)),
    cerbereReste:arr(Number(cer&&cer.pilotable&&cer.pilotable.reste||cer&&cer.reste||0)),
    expressAllocation:arr(Number(ce&&ce.pilotable&&ce.pilotable.allocation||0)),
    expressConsomme:arr(Number(ce&&ce.pilotable&&ce.pilotable.consomme||0)),
    expressReste:arr(Number(ce&&ce.pilotable&&ce.pilotable.reste||0))
  };
  const gardes={
    snapshotOk:e.ok===true,
    coherence:!!(e.coherence&&e.coherence.ok===true),
    uniteTresorerie:!!(unite&&unite.ok===true),
    contratCanonique:!!(proj&&proj.decompositionCanonique&&proj.decompositionCanonique.ok===true),
    gardeR0:!!(m.gardeRecettesCanoniques&&m.gardeRecettesCanoniques.ok===true),
    gardeCbMultiCycle:!!(m.gardeCbMultiCycle&&m.gardeCbMultiCycle.ok===true)
  };
  const toutesVertes=Object.keys(gardes).every(function(k){return gardes[k]===true;});
  const out={
    ok:toutesVertes,
    version:'2026-09-09.1',
    lectureSeule:true,
    aucuneModification:true,
    revisionBudgetSoft:String(e.revisionBudgetSoft||''),
    dureeSnapshotMs:Number(p.dureeMs||0),
    totalDureesModulesMs:totalModules,
    topCouts:top,
    tousModules:durees,
    gardes:gardes,
    signatureReference:signature,
    doctrineOptimisation:'Ne modifier aucun calcul métier. Une optimisation candidate n’est acceptable que si toutes les gardes restent vertes et si la signature de référence est identique au centime.'
  };
  console.log('[AUDIT PERF snapshot global] '+JSON.stringify(out));
  return out;
}

function jourAuditPerfTresorerie20260910_(v){
  const d=v instanceof Date?new Date(v):new Date(v);
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function arrAuditPerfTresorerie20260910_(n){return Math.round(Number(n||0)*100)/100;}
function cleLigneAuditPerfTresorerie20260910_(l){
  return [jourAuditPerfTresorerie20260910_(l&&l.date),String(l&&l.source||''),String(l&&l.sourceId||''),arrAuditPerfTresorerie20260910_(Number(l&&l.montantSigne||0))].join('|');
}
function signatureProjectionAuditPerfTresorerie20260910_(r,cible){
  const j=String(cible||'');
  const lignes=(r&&r.lignes||[]).filter(function(l){return jourAuditPerfTresorerie20260910_(l&&l.date)<=j;});
  const cles=lignes.map(cleLigneAuditPerfTresorerie20260910_).sort();
  const net=arrAuditPerfTresorerie20260910_(lignes.reduce(function(s,l){return s+Number(l&&l.montantSigne||0);},0));
  return{
    ok:!!(r&&r.ok),
    version:String(r&&r.version||''),
    proprietaire:String(r&&r.proprietaireBudgetSoft||''),
    contratVersion:String(r&&r.versionContratCanonique||''),
    dateReference:String(r&&r.dateReference||''),
    cible:j,
    soldeReel:arrAuditPerfTresorerie20260910_(Number(r&&r.soldeReel||0)),
    nombreLignes:lignes.length,
    net:net,
    soldeCible:arrAuditPerfTresorerie20260910_(Number(r&&r.soldeReel||0)+net),
    cles:cles
  };
}

/**
 * Candidat A/B sans écriture : peut-on calculer UNE trajectoire canonique jusqu'à
 * la fin bancaire du cycle suivant, puis réutiliser sa sous-vue jusqu'au 27,
 * au lieu de recalculer une seconde fois toute la projection pour la garde CB ?
 *
 * Aucune modification du snapshot. L'optimisation ne sera envisagée que si les
 * signatures métier jusqu'au 27 sont strictement identiques, ligne par ligne.
 */
function auditerCandidatProjectionUniqueSnapshotBudgetSoft20260910(){
  const maintenant=new Date();
  const finCourant=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(maintenant):new Date(maintenant.getFullYear(),maintenant.getMonth(),27,12,0,0,0);
  const finSuivant=new Date(finCourant.getFullYear(),finCourant.getMonth()+1,finCourant.getDate(),12,0,0,0);
  const finBancaire=new Date(finSuivant.getFullYear(),finSuivant.getMonth()+1,0,23,59,59,999);
  const cible27=jourAuditPerfTresorerie20260910_(finSuivant);
  const cibleFinMois=jourAuditPerfTresorerie20260910_(finBancaire);

  const tA=Date.now();
  const baseline=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible27);
  const dureeBaselineMs=Date.now()-tA;

  const tB=Date.now();
  const etendue=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cibleFinMois);
  const dureeEtendueMs=Date.now()-tB;

  const a=signatureProjectionAuditPerfTresorerie20260910_(baseline,cible27);
  const b=signatureProjectionAuditPerfTresorerie20260910_(etendue,cible27);
  const mapA={};a.cles.forEach(function(k){mapA[k]=(mapA[k]||0)+1;});
  const mapB={};b.cles.forEach(function(k){mapB[k]=(mapB[k]||0)+1;});
  const toutes=Array.from(new Set(a.cles.concat(b.cles))).sort();
  const differences=toutes.filter(function(k){return Number(mapA[k]||0)!==Number(mapB[k]||0);}).slice(0,50).map(function(k){return{cle:k,baseline:Number(mapA[k]||0),candidate:Number(mapB[k]||0)};});
  const metaIdentique=a.ok===b.ok&&a.version===b.version&&a.proprietaire===b.proprietaire&&a.contratVersion===b.contratVersion&&a.dateReference===b.dateReference&&a.soldeReel===b.soldeReel&&a.nombreLignes===b.nombreLignes&&a.net===b.net&&a.soldeCible===b.soldeCible;
  const identique=metaIdentique&&differences.length===0;

  let gardeCandidate=null;
  if(etendue&&etendue.ok!==false&&typeof prochaineDateDebitCbTresorerie20260901_==='function'){
    const publiees=(etendue.lignes||[]).filter(function(x){return String(x&&x.source||'')==='debit_cb_estime';});
    const attendues=[];let ref=new Date(etendue.dateReference||maintenant),g=0;
    while(ref<finBancaire&&g++<12){const d=prochaineDateDebitCbTresorerie20260901_(ref);if(!d||isNaN(d)||d>finBancaire)break;const j=jourAuditPerfTresorerie20260910_(d);if(attendues.indexOf(j)<0)attendues.push(j);ref=new Date(d.getTime()+1);}
    const parDate={};publiees.forEach(function(x){const j=jourAuditPerfTresorerie20260910_(x.date);(parDate[j]=parDate[j]||[]).push(x);});
    const formulesOk=publiees.every(function(x){return Math.abs(Math.abs(arrAuditPerfTresorerie20260910_(x.montantSigne))-arrAuditPerfTresorerie20260910_(Math.max(0,Number(x.partCerbere||0))+Math.max(0,Number(x.partFinMois||0))))<=.01;});
    gardeCandidate={ok:attendues.every(function(j){return(parDate[j]||[]).length===1;})&&Object.keys(parDate).every(function(j){return parDate[j].length===1;})&&formulesOk,datesAttendues:attendues,publiees:publiees.map(function(x){return{date:jourAuditPerfTresorerie20260910_(x.date),montant:arrAuditPerfTresorerie20260910_(x.montantSigne),partCerbere:arrAuditPerfTresorerie20260910_(x.partCerbere),partFinMois:arrAuditPerfTresorerie20260910_(x.partFinMois)};}),formulesOk:formulesOk};
  }

  const gainTheoriqueMs=dureeBaselineMs;
  const out={
    ok:identique&&!!(gardeCandidate&&gardeCandidate.ok),
    version:'2026-09-10.1',
    lectureSeule:true,
    aucuneModification:true,
    ciblePublication:cible27,
    cibleCalculUnique:cibleFinMois,
    durees:{projectionBaseline27Ms:dureeBaselineMs,projectionEtendueFinMoisMs:dureeEtendueMs,gainTheoriqueSnapshotMs:gainTheoriqueMs},
    comparaison:{identiqueAuCentimeEtLigneParLigne:identique,metaIdentique:metaIdentique,differences: differences,baseline:{version:a.version,proprietaire:a.proprietaire,contratVersion:a.contratVersion,dateReference:a.dateReference,soldeReel:a.soldeReel,nombreLignes:a.nombreLignes,net:a.net,soldeCible:a.soldeCible},candidateSousVue:{version:b.version,proprietaire:b.proprietaire,contratVersion:b.contratVersion,dateReference:b.dateReference,soldeReel:b.soldeReel,nombreLignes:b.nombreLignes,net:b.net,soldeCible:b.soldeCible}},
    gardeCbCandidate:gardeCandidate,
    decision:identique&&gardeCandidate&&gardeCandidate.ok?'CANDIDAT_AUTORISE_POUR_ETAPE_SUIVANTE':'REJETER_CANDIDAT',
    doctrine:'Aucune optimisation appliquée. Le candidat ne peut être intégré au builder que si cette sortie est verte.'
  };
  console.log('[AUDIT PERF candidat projection unique] '+JSON.stringify(out));
  return out;
}

function construireSocleMinimalTresorerie20260831Audit20260910_(){
  const synthese=chargerSyntheseComptes20260828();
  const comptes=(synthese&&synthese.comptes||[]).filter(function(c){return actifComptes20260828_(c.actif);});
  const courants=comptes.filter(estCompteCourantTresorerie_);
  const comptesBase=courants.length?courants:comptes.filter(function(c){return !estEpargneTresorerie_(c);});
  return{
    ok:true,
    soldeReel:arrondiTresorerie_(comptesBase.reduce(function(s,c){return s+Number(c&&c.soldeReel||0);},0)),
    comptes:comptesBase.map(function(c){return{id:c.id,nom:c.nom,soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde};})
  };
}

function construireCandidatTresorerie20260831SocleMinimalAudit20260910_(dateCible){
  return avecContexteLectureBudgetSoft20260827_('audit-candidat-socle-minimal-20260831-20260910',function(){
    const socle=construireSocleMinimalTresorerie20260831Audit20260910_();
    const ops=lireTable_('Operations');
    const charges=lireTable_('Charges_fixes');
    const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
    const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
    const comptes=Array.isArray(socle.comptes)?socle.comptes:[];
    const reference=dateReferenceBancaireTresorerie20260901_(socle,ops);
    const cible=normaliserDateCibleTresorerie_(dateCible,reference);
    const hard=operationsFuturesTresorerie_(ops,reference,cible,comptes);
    let lignes=hard.slice();
    let cfs=occurrencesChargesTresorerie_(charges,hard,actions,reference,cible,comptes);
    cfs=recalerChargesFixesCarteTresorerie20260901_(cfs,charges,ops,hard,reference,cible);
    lignes=lignes.concat(cfs);
    const evs=occurrencesEvenementsTresorerie_(evenements,hard,reference,cible,comptes).filter(function(x){return evenementEffectifTresorerie20260831_(x.sourceId,evenements);});
    lignes=lignes.concat(evs);
    lignes=completerEvenementsEffectifsTresorerie20260831_(lignes,evenements,reference,cible);
    const acts=normaliserMontantsActionsTresorerie20260831_(occurrencesActionsTresorerie_(actions,hard,reference,cible,comptes),actions);
    lignes=lignes.concat(acts);
    lignes=appliquerSuppressionsTemporairesTresorerie20260831_(lignes,evenements);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);
    const revenusCanon=revenusCanoniquesTresorerie20260831_(ops,lignes,reference,cible);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes.concat(revenusCanon));
    lignes=lignes.filter(function(x){return x.source!=='pilotable';});
    const debitCb=estimationDebitCbDiffereTresorerie20260901_(ops,reference,cible);
    if(debitCb)lignes.push(debitCb);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);
    lignes.sort(function(a,b){return new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude);});
    const variation=arrondiTresorerie_(lignes.reduce(function(s,x){return s+Number(x.montantSigne||0);},0));
    const certain=arrondiTresorerie_(lignes.filter(function(x){return x.certitude==='certain';}).reduce(function(s,x){return s+Number(x.montantSigne||0);},0));
    const tresProbable=arrondiTresorerie_(lignes.filter(function(x){return ['certain','tres_probable'].includes(x.certitude);}).reduce(function(s,x){return s+Number(x.montantSigne||0);},0));
    socle.version=TREASURY_FORECAST_CORRECTIONS_20260831_VERSION;
    socle.dateReference=reference.toISOString();
    socle.dateCible=cible.toISOString();
    socle.lignes=lignes;
    socle.variationPrevue=variation;
    socle.soldePrevisionnel=arrondiTresorerie_(Number(socle.soldeReel||0)+variation);
    socle.fourchette={certain:arrondiTresorerie_(Number(socle.soldeReel||0)+certain),tresProbable:arrondiTresorerie_(Number(socle.soldeReel||0)+tresProbable),toutesHypotheses:socle.soldePrevisionnel};
    socle.resume=resumeTresorerie20260831_(lignes);
    socle.confiance=confianceTresorerie_(reference,cible,lignes);
    socle.pilotable=null;
    socle.debitCbEstime=debitCb||null;
    socle.diagnostic20260831={doctrine:'solde bancaire réel + seuls flux non encore incorporés',hierarchie:'estimation -> engagement connu -> opération réelle -> solde réel',dateReferenceBancaire:reference.toISOString(),revenusCanoniquesAjoutes:revenusCanon.length,lignesFinales:lignes.length,evenementsEffectifs:(evenements||[]).filter(function(e){return statutEffectifTresorerie20260831_(e.statut);}).length,suspensionsEffectives:(evenements||[]).filter(function(e){return statutEffectifTresorerie20260831_(e.statut)&&estSuspensionTemporaireTresorerie20260831_(e);}).length,debitCbEstimeAjoute:!!debitCb,debitCbDate:debitCb?debitCb.date:null,debitCbPartCerbere:debitCb?debitCb.partCerbere:0,debitCbPartFinMois:debitCb?debitCb.partFinMois:0};
    return socle;
  });
}

function signatureSocle20260831Audit20260910_(r){
  const lignes=(r&&r.lignes||[]).map(function(x){return{
    id:String(x&&x.id||''),source:String(x&&x.source||''),sourceId:String(x&&x.sourceId||''),date:String(x&&x.date||''),libelle:String(x&&x.libelle||''),categorie:String(x&&x.categorie||''),compte:String(x&&x.compte||''),montantSigne:arrAuditPerfTresorerie20260910_(x&&x.montantSigne),certitude:String(x&&x.certitude||''),preuve:String(x&&x.preuve||''),dateConventionnelle:!!(x&&x.dateConventionnelle),partCerbere:x&&x.partCerbere!=null?arrAuditPerfTresorerie20260910_(x.partCerbere):null,partFinMois:x&&x.partFinMois!=null?arrAuditPerfTresorerie20260910_(x.partFinMois):null,moteurCerbere:String(x&&x.moteurCerbere||'')};});
  return{
    ok:!!(r&&r.ok),version:String(r&&r.version||''),dateReference:String(r&&r.dateReference||''),dateCible:String(r&&r.dateCible||''),soldeReel:arrAuditPerfTresorerie20260910_(r&&r.soldeReel),variationPrevue:arrAuditPerfTresorerie20260910_(r&&r.variationPrevue),soldePrevisionnel:arrAuditPerfTresorerie20260910_(r&&r.soldePrevisionnel),fourchette:r&&r.fourchette||null,resume:r&&r.resume||null,confiance:r&&r.confiance||null,pilotable:r&&r.pilotable||null,debitCbEstime:r&&r.debitCbEstime?{date:String(r.debitCbEstime.date||''),montant:arrAuditPerfTresorerie20260910_(r.debitCbEstime.montantSigne),partCerbere:arrAuditPerfTresorerie20260910_(r.debitCbEstime.partCerbere),partFinMois:arrAuditPerfTresorerie20260910_(r.debitCbEstime.partFinMois),moteurCerbere:String(r.debitCbEstime.moteurCerbere||'')}:null,comptes:(r&&r.comptes||[]).map(function(c){return{id:String(c&&c.id||''),nom:String(c&&c.nom||''),soldeReel:arrAuditPerfTresorerie20260910_(c&&c.soldeReel),dateSolde:String(c&&c.dateSolde||''),sourceSolde:String(c&&c.sourceSolde||'')};}),diagnostic:r&&r.diagnostic20260831||null,lignes:lignes
  };
}

/**
 * A/B lecture seule : le socle 20260830 est aujourd'hui utilisé par 20260831 alors
 * que 20260831 reconstruit ensuite toutes les lignes. Le candidat ne conserve du
 * socle que ce qui est effectivement consommé : comptes et solde réel.
 */
function auditerCandidatSocleMinimalTresorerie20260831BudgetSoft20260910(){
  const cible='2026-10-31';
  const tA=Date.now();
  const baseline=chargerTresoreriePrevisionnelle20260831(cible);
  const baselineMs=Date.now()-tA;
  const tB=Date.now();
  const candidat=construireCandidatTresorerie20260831SocleMinimalAudit20260910_(cible);
  const candidatMs=Date.now()-tB;
  const a=signatureSocle20260831Audit20260910_(baseline),b=signatureSocle20260831Audit20260910_(candidat);
  const identique=JSON.stringify(a)===JSON.stringify(b);
  const out={ok:identique,version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,cible:cible,comparaison:{identiqueAuCentimeEtLigneParLigne:identique,baseline:{soldeReel:a.soldeReel,variationPrevue:a.variationPrevue,soldePrevisionnel:a.soldePrevisionnel,nombreLignes:a.lignes.length,debitCb:a.debitCbEstime},candidat:{soldeReel:b.soldeReel,variationPrevue:b.variationPrevue,soldePrevisionnel:b.soldePrevisionnel,nombreLignes:b.lignes.length,debitCb:b.debitCbEstime}},durees:{baselineMs:baselineMs,candidatMs:candidatMs,gainPct:baselineMs>0?Math.round((1-candidatMs/baselineMs)*1000)/10:null},decision:identique?'CANDIDAT_AUTORISE_POUR_ETAPE_SUIVANTE':'REJETER_CANDIDAT',doctrine:'Aucune optimisation appliquée. Le candidat supprime seulement le calcul 20260830 inutilisé par 20260831 ; intégration interdite si la sortie métier diffère.'};
  console.log('[AUDIT PERF A/B socle minimal 20260831] '+JSON.stringify(out));
  return out;
}

function signatureCanoniqueCompleteAuditPerf20260910_(r){
  const lignes=(r&&r.lignes||[]).map(function(x){return{
    id:String(x&&x.id||''),source:String(x&&x.source||''),sourceId:String(x&&x.sourceId||''),date:String(x&&x.date||''),libelle:String(x&&x.libelle||''),categorie:String(x&&x.categorie||''),compte:String(x&&x.compte||''),montantSigne:arrAuditPerfTresorerie20260910_(x&&x.montantSigne),certitude:String(x&&x.certitude||''),preuve:String(x&&x.preuve||''),dateConventionnelle:!!(x&&x.dateConventionnelle),partCerbere:x&&x.partCerbere!=null?arrAuditPerfTresorerie20260910_(x.partCerbere):null,partFinMois:x&&x.partFinMois!=null?arrAuditPerfTresorerie20260910_(x.partFinMois):null,moteurCerbere:String(x&&x.moteurCerbere||'')};});
  return{
    ok:!!(r&&r.ok),version:String(r&&r.version||''),proprietaire:String(r&&r.proprietaireBudgetSoft||''),contratVersion:String(r&&r.versionContratCanonique||''),dateReference:String(r&&r.dateReference||''),dateCible:String(r&&r.dateCible||''),soldeReel:arrAuditPerfTresorerie20260910_(r&&r.soldeReel),variationPrevue:arrAuditPerfTresorerie20260910_(r&&r.variationPrevue),soldePrevisionnel:arrAuditPerfTresorerie20260910_(r&&r.soldePrevisionnel),fourchette:r&&r.fourchette||null,resume:r&&r.resume||null,confiance:r&&r.confiance||null,lignes:lignes
  };
}

/**
 * A/B lecture seule : la passe 20260831 calcule encore un debit_cb_estime legacy,
 * puis la passe terminale 20260901 supprime toutes ces lignes et reconstruit les
 * débits CB multi-cycle avec la logique canonique moderne. Le candidat neutralise
 * uniquement cet appel legacy pendant un calcul canonique, puis restaure la fonction.
 */
function auditerCandidatSuppressionDebitCbLegacy20260831BudgetSoft20260910(){
  const cible='2026-10-31';
  const tA=Date.now();
  const baseline=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible);
  const baselineMs=Date.now()-tA;

  const original=estimationDebitCbDiffereTresorerie20260901_;
  let candidat=null,erreur=null,candidatMs=0;
  try{
    estimationDebitCbDiffereTresorerie20260901_=function(){return null;};
    const tB=Date.now();
    candidat=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible);
    candidatMs=Date.now()-tB;
  }catch(e){
    erreur=String(e&&e.stack||e&&e.message||e);
  }finally{
    estimationDebitCbDiffereTresorerie20260901_=original;
  }

  const a=signatureCanoniqueCompleteAuditPerf20260910_(baseline),b=signatureCanoniqueCompleteAuditPerf20260910_(candidat);
  const identique=!erreur&&JSON.stringify(a)===JSON.stringify(b);
  const cbA=(baseline&&baseline.lignes||[]).filter(function(x){return String(x&&x.source||'')==='debit_cb_estime';}).map(function(x){return{date:jourAuditPerfTresorerie20260910_(x.date),montant:arrAuditPerfTresorerie20260910_(x.montantSigne),partCerbere:arrAuditPerfTresorerie20260910_(x.partCerbere),partFinMois:arrAuditPerfTresorerie20260910_(x.partFinMois),moteurCerbere:String(x&&x.moteurCerbere||'')};});
  const cbB=(candidat&&candidat.lignes||[]).filter(function(x){return String(x&&x.source||'')==='debit_cb_estime';}).map(function(x){return{date:jourAuditPerfTresorerie20260910_(x.date),montant:arrAuditPerfTresorerie20260910_(x.montantSigne),partCerbere:arrAuditPerfTresorerie20260910_(x.partCerbere),partFinMois:arrAuditPerfTresorerie20260910_(x.partFinMois),moteurCerbere:String(x&&x.moteurCerbere||'')};});
  const cbIdentiques=JSON.stringify(cbA)===JSON.stringify(cbB);
  const out={
    ok:identique&&cbIdentiques,
    version:'2026-09-10.1',
    lectureSeule:true,
    aucuneModification:true,
    cible:cible,
    comparaison:{identiqueAuCentimeEtLigneParLigne:identique,cbMultiCycleIdentique:cbIdentiques,baseline:{soldeReel:a.soldeReel,variationPrevue:a.variationPrevue,soldePrevisionnel:a.soldePrevisionnel,nombreLignes:a.lignes.length,debitsCb:cbA},candidat:{soldeReel:b.soldeReel,variationPrevue:b.variationPrevue,soldePrevisionnel:b.soldePrevisionnel,nombreLignes:b.lignes.length,debitsCb:cbB}},
    durees:{baselineMs:baselineMs,candidatMs:candidatMs,gainPct:baselineMs>0?Math.round((1-candidatMs/baselineMs)*1000)/10:null},
    erreur:erreur,
    decision:identique&&cbIdentiques?'CANDIDAT_AUTORISE_POUR_ETAPE_SUIVANTE':'REJETER_CANDIDAT',
    doctrine:'Aucune optimisation appliquée. Le calcul CB legacy 20260831 ne pourra être supprimé du chemin canonique que si la trajectoire complète et tous les débits CB multi-cycle restent strictement identiques.'
  };
  console.log('[AUDIT PERF A/B suppression CB legacy 20260831] '+JSON.stringify(out));
  return out;
}

/**
 * Profil courant de la projection étendue telle qu'elle est réellement calculée
 * par le snapshot 2026-09-10.3 : Cerbère est préchargé une fois puis transmis au
 * moteur canonique. Audit strictement lecture seule, avec périmètre explicite.
 */
function auditerProfilProjectionEtendueCouranteBudgetSoft20260911(){
  const cible='2026-10-31';
  const tGlobal=Date.now();
  const temps={};
  const chargeurCerbere=typeof chargerCerbereV374==='function'?chargerCerbereV374:(typeof chargerCerbereV37==='function'?chargerCerbereV37:null);
  let cerbere=null;
  let t=Date.now();
  try{if(chargeurCerbere)cerbere=chargeurCerbere();}catch(e){cerbere=null;}
  temps.cerberePrecharge=Date.now()-t;
  if(!cerbere||cerbere.ok===false){
    const ko={ok:false,version:'2026-09-11.1',lectureSeule:true,aucuneModification:true,perimetre:{compare:'projection canonique courante avec Cerbère préchargé vs reconstruction instrumentée des mêmes étapes',dateReference:'date de référence bancaire calculée par le moteur',horizon:cible,sourceVerite:'construireTrajectoireTresorerieCanoniqueBudgetSoft20260907 / chargerTresoreriePrevisionnelle20260901'},erreur:'Cerbère préchargé indisponible.',temps:temps};
    console.log('[AUDIT PERF profil projection courante] '+JSON.stringify(ko));return ko;
  }

  t=Date.now();
  const baseline=avecContexteLectureBudgetSoft20260827_('audit-profil-projection-courante-baseline-20260911',function(){
    return construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible,cerbere);
  });
  temps.baselineCanonique=Date.now()-t;
  const statsBaseline=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;

  const etapes={};
  const reconstruit=avecContexteLectureBudgetSoft20260827_('audit-profil-projection-courante-etapes-20260911',function(){
    let ts=Date.now();
    const r=chargerSocleTresorerie20260831SansDebitCbLegacy20260910_(cible);
    etapes.socle20260831SansCbLegacy=Date.now()-ts;
    if(!r||!r.ok)return r;
    const reference=new Date(r.dateReference||new Date()),dateCible=new Date(r.dateCible||new Date());

    ts=Date.now();const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');etapes.lectureEvenements=Date.now()-ts;
    ts=Date.now();const actions=lireFeuilleDynamiquePlan_('Plan_Actions');etapes.lectureActions=Date.now()-ts;
    ts=Date.now();const ops=lireTable_('Operations');etapes.lectureOperations=Date.now()-ts;
    ts=Date.now();const hard=(r.lignes||[]).filter(function(x){return x.source==='operation_future';});etapes.extractionOperationsFutures=Date.now()-ts;
    ts=Date.now();let lignes=recalerFluxPlanCarteTresorerie20260901_(r.lignes||[],evenements,actions,hard,reference,dateCible);etapes.recalagePlanCb=Date.now()-ts;
    ts=Date.now();lignes=filtrerActionsPlanEffectivesTresorerie20260908_(lignes,actions);etapes.filtreActionsPlan=Date.now()-ts;
    ts=Date.now();lignes=lignes.filter(function(x){return x.source!=='debit_cb_estime';});etapes.retraitAnciennesEstimationsCb=Date.now()-ts;
    ts=Date.now();const debitsCb=estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,dateCible,cerbere);etapes.cbMultiCycleDepuisCerberePrecharge=Date.now()-ts;
    if(debitsCb.length)lignes.push.apply(lignes,debitsCb);
    ts=Date.now();lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);etapes.dedoublonnage=Date.now()-ts;
    ts=Date.now();lignes.sort(function(a,b){return new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude);});etapes.tri=Date.now()-ts;
    ts=Date.now();const final=recalculerSortieTresorerie20260901_(r,lignes,reference,dateCible);etapes.recalculSortie=Date.now()-ts;
    final.diagnostic20260831=final.diagnostic20260831||{};
    final.diagnostic20260831.cerberePrechargeProjection=true;
    ts=Date.now();const decomposition=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(final);etapes.decompositionCanonique=Date.now()-ts;
    final.proprietaireBudgetSoft=BUDGETSOFT_TREASURY_CANONICAL_OWNER;
    final.moteurSousJacent='chargerTresoreriePrevisionnelle20260901';
    final.versionContratCanonique=BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION;
    final.decompositionCanonique=decomposition;
    if(!decomposition.ok){final.ok=false;final.erreur='Contrat canonique de trésorerie non satisfait.';final.erreursContrat=decomposition.erreurs.slice();}
    return final;
  });
  const statsEtapes=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;

  const sigA=signatureCanoniqueCompleteAuditPerf20260910_(baseline);
  const sigB=signatureCanoniqueCompleteAuditPerf20260910_(reconstruit);
  const identique=JSON.stringify(sigA)===JSON.stringify(sigB);
  const totalEtapes=Object.keys(etapes).reduce(function(s,k){return s+Number(etapes[k]||0);},0);
  const classement=Object.keys(etapes).map(function(k){return{etape:k,dureeMs:Number(etapes[k]||0),partPct:totalEtapes?Math.round(Number(etapes[k]||0)/totalEtapes*1000)/10:null};}).sort(function(a,b){return b.dureeMs-a.dureeMs;});
  const cb=(reconstruit&&reconstruit.lignes||[]).filter(function(x){return String(x&&x.source||'')==='debit_cb_estime';}).map(function(x){return{date:jourAuditPerfTresorerie20260910_(x.date),montant:arrAuditPerfTresorerie20260910_(x.montantSigne),partCerbere:arrAuditPerfTresorerie20260910_(x.partCerbere),partFinMois:arrAuditPerfTresorerie20260910_(x.partFinMois),moteurCerbere:String(x&&x.moteurCerbere||'')};});
  const out={
    ok:identique&&!!(baseline&&baseline.ok)&&!!(reconstruit&&reconstruit.ok),
    version:'2026-09-11.1',
    lectureSeule:true,
    aucuneModification:true,
    perimetre:{
      compare:'projection canonique courante avec Cerbère préchargé vs reconstruction instrumentée des mêmes étapes',
      dateReference:String(reconstruit&&reconstruit.dateReference||''),
      horizon:cible,
      sourceVerite:'construireTrajectoireTresorerieCanoniqueBudgetSoft20260907 / chargerTresoreriePrevisionnelle20260901',
      configurationSnapshot:'Cerbère préchargé puis transmis au moteur canonique (2026-09-10.3)'
    },
    comparaison:{identiqueAuCentimeEtLigneParLigne:identique,baseline:{version:sigA.version,soldeReel:sigA.soldeReel,variationPrevue:sigA.variationPrevue,soldePrevisionnel:sigA.soldePrevisionnel,nombreLignes:sigA.lignes.length},reconstruction:{version:sigB.version,soldeReel:sigB.soldeReel,variationPrevue:sigB.variationPrevue,soldePrevisionnel:sigB.soldePrevisionnel,nombreLignes:sigB.lignes.length}},
    temps:{cerberePrecharge:temps.cerberePrecharge,baselineCanonique:temps.baselineCanonique,reconstructionEtapes:totalEtapes,dureeTotale:Date.now()-tGlobal},
    etapes:etapes,
    classement:classement,
    lectures:{baseline:statsBaseline,etapes:statsEtapes},
    debitsCb:cb,
    decision:identique?'PROFIL_VALIDE_POUR_CHOISIR_LE_PROCHAIN_LEVIER':'PROFIL_INVALIDE_NE_RIEN_OPTIMISER',
    doctrine:'Profil uniquement. Ne modifier aucun calcul métier sur cette seule mesure ; le prochain candidat devra passer un A/B strict puis les gardes du snapshot.'
  };
  console.log('[AUDIT PERF profil projection courante] '+JSON.stringify(out));
  return out;
}
