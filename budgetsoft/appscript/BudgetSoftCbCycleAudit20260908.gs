const BUDGETSOFT_CB_CYCLE_AUDIT_20260908_VERSION='2026-09-08.2';

function arrAuditCbCycleBudgetSoft20260908_(n){return Math.round((Number(n)||0)*100)/100;}
function dateIsoJourAuditCbCycleBudgetSoft20260908_(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function sommeAuditCbCycleBudgetSoft20260908_(lignes){return arrAuditCbCycleBudgetSoft20260908_((lignes||[]).reduce((s,x)=>s+Number(x&&x.montantSigne||0),0));}
function resumeLignesAuditCbCycleBudgetSoft20260908_(lignes){return (lignes||[]).map(x=>({source:x.source||'',sourceId:x.sourceId||'',date:x.date||'',libelle:x.libelle||'',categorie:x.categorie||'',montant:arrAuditCbCycleBudgetSoft20260908_(x.montantSigne),preuve:x.preuve||'',charge_fixe_id:x.charge_fixe_id||''}));}

/** Audit strict du cycle Cerbère finissant le 27/10 et de son débit bancaire du 31/10. */
function auditerCycleCbSuivant27102026BudgetSoft20260908(){
  const dateFinCycle='2026-10-27',dateDebit='2026-10-31';
  const r=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateDebit);
  const lignes=Array.isArray(r&&r.lignes)?r.lignes:[],erreurs=[];
  const estCb=x=>typeof estCbTresorerieCanonique20260907_==='function'&&estCbTresorerieCanonique20260907_(x);
  const auDebit=x=>dateIsoJourAuditCbCycleBudgetSoft20260908_(x.date)===dateDebit;
  const cbCertaines=lignes.filter(x=>x.source==='operation_future'&&estCb(x)&&auDebit(x));
  const chargesFixesCb=lignes.filter(x=>x.source==='charge_fixe'&&estCb(x)&&auDebit(x));
  const estimations=lignes.filter(x=>x.source==='debit_cb_estime');
  const estimationCycle=estimations.find(auDebit)||null;
  const estimationsAutres=estimations.filter(x=>!auDebit(x));
  if(!estimationCycle)erreurs.push({code:'CB_ESTIMATION_CYCLE_ABSENTE',message:'Aucun complément CB estimé n’est publié à la date bancaire du 31/10.',estimationsDisponibles:estimations.map(x=>({date:x.date,montant:x.montantSigne,partCerbere:x.partCerbere,partFinMois:x.partFinMois}))});
  const partCerbere=arrAuditCbCycleBudgetSoft20260908_(estimationCycle&&estimationCycle.partCerbere||0);
  const partFinMois=arrAuditCbCycleBudgetSoft20260908_(estimationCycle&&estimationCycle.partFinMois||0);
  const complementEstime=arrAuditCbCycleBudgetSoft20260908_(Math.abs(Number(estimationCycle&&estimationCycle.montantSigne||0)));
  if(estimationCycle&&Math.abs(complementEstime-arrAuditCbCycleBudgetSoft20260908_(partCerbere+partFinMois))>.01)erreurs.push({code:'CB_RESIDUEL_FORMULE',message:'Le complément CB estimé ne correspond pas à partCerbere + partFinMois.',complementEstime,partCerbere,partFinMois});
  const doublonsChargeFixe=[];
  chargesFixesCb.forEach(cf=>cbCertaines.forEach(op=>{const idCf=String(cf.sourceId||cf.charge_fixe_id||''),idOp=String(op.charge_fixe_id||'');if(idCf&&idOp&&idCf===idOp)doublonsChargeFixe.push({chargeFixeId:idCf,chargeFixe:cf.libelle||'',operation:op.libelle||'',montantChargeFixe:cf.montantSigne,montantOperation:op.montantSigne});}));
  if(doublonsChargeFixe.length)erreurs.push({code:'CB_DOUBLE_COMPTE_CF_OPERATION',message:'Une charge fixe CB du 31/10 est aussi présente comme opération future certaine.',doublons:doublonsChargeFixe});
  const totalCertainEngage=arrAuditCbCycleBudgetSoft20260908_(Math.abs(sommeAuditCbCycleBudgetSoft20260908_(cbCertaines)));
  const totalChargesFixesCb=arrAuditCbCycleBudgetSoft20260908_(Math.abs(sommeAuditCbCycleBudgetSoft20260908_(chargesFixesCb)));
  const totalCbExplique=arrAuditCbCycleBudgetSoft20260908_(totalCertainEngage+totalChargesFixesCb+partCerbere+partFinMois);
  const out={ok:!!(r&&r.ok)&&erreurs.length===0,version:BUDGETSOFT_CB_CYCLE_AUDIT_20260908_VERSION,proprietaire:r&&r.proprietaireBudgetSoft||'',dateReference:r&&r.dateReference||'',dateFinCycle,dateDebit,soldeReel:r&&r.soldeReel,soldePrevisionnelAuDebit:r&&r.soldePrevisionnel,blocs:{operationsCbCertaines:{montant:totalCertainEngage,nombre:cbCertaines.length,lignes:resumeLignesAuditCbCycleBudgetSoft20260908_(cbCertaines)},chargesFixesCb:{montant:totalChargesFixesCb,nombre:chargesFixesCb.length,lignes:resumeLignesAuditCbCycleBudgetSoft20260908_(chargesFixesCb)},resteCerbere:{montant:partCerbere,moteur:estimationCycle&&estimationCycle.moteurCerbere||''},queue28FinMois:{montant:partFinMois},complementCbEstime:{montant:complementEstime,date:estimationCycle&&estimationCycle.date||'',preuve:estimationCycle&&estimationCycle.preuve||''}},estimationsCbHorsCycle:resumeLignesAuditCbCycleBudgetSoft20260908_(estimationsAutres),totalCbExplique,controles:{estimationCyclePresente:!!estimationCycle,formuleComplementOk:!!estimationCycle&&Math.abs(complementEstime-arrAuditCbCycleBudgetSoft20260908_(partCerbere+partFinMois))<=.01,doublonsChargeFixeOperation:doublonsChargeFixe.length,aucunDoubleCompteChargeFixe:doublonsChargeFixe.length===0},erreurs};
  console.log('[AUDIT Cycle CB suivant 27-10 STRICT] '+JSON.stringify(out));return out;
}

const BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION='2026-09-08.2';
function arrGardeCbMultiCycleBudgetSoft20260908_(n){return Math.round((Number(n)||0)*100)/100;}
function isoJourGardeCbMultiCycleBudgetSoft20260908_(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function finMoisGardeCbMultiCycleBudgetSoft20260908_(d){return new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59,999);}

function verifierGardeCbMultiCycleDepuisProjectionBudgetSoft20260910_(r,dateFinCycleSuivant){
  const erreurs=[];
  if(typeof prochaineDateDebitCbTresorerie20260901_!=='function')return{ok:false,version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,sourceProjection:'precalculee',erreurs:[{code:'CB_DATE_PRIMITIVE_ABSENTE',message:'Primitive de détermination des dates de débit CB absente.'}]};
  const finCycle=dateFinCycleSuivant instanceof Date?new Date(dateFinCycleSuivant):new Date(dateFinCycleSuivant||new Date());
  const cible=finMoisGardeCbMultiCycleBudgetSoft20260908_(finCycle);
  if(!r||r.ok===false)return{ok:false,version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,sourceProjection:'precalculee',dateCible:cible.toISOString(),erreurs:[{code:'CB_PROJECTION_INVALIDE',message:String(r&&r.erreur||'Projection canonique invalide.')}],projection:r||null};
  const reference=new Date(r.dateReference||new Date());
  const publiees=(r.lignes||[]).filter(x=>x.source==='debit_cb_estime');
  const datesAttendues=[];let ref=new Date(reference),garde=0;
  while(ref<cible&&garde++<12){const debit=prochaineDateDebitCbTresorerie20260901_(ref);if(!debit||isNaN(debit)||debit>cible)break;const j=isoJourGardeCbMultiCycleBudgetSoft20260908_(debit);if(!datesAttendues.includes(j))datesAttendues.push(j);ref=new Date(debit.getTime()+1);}
  const parDate={};publiees.forEach(x=>{const j=isoJourGardeCbMultiCycleBudgetSoft20260908_(x.date);(parDate[j]=parDate[j]||[]).push(x);});
  Object.keys(parDate).forEach(j=>{if(parDate[j].length>1)erreurs.push({code:'CB_DEBIT_DUPLIQUE',message:'Plusieurs compléments CB estimés sont publiés pour la même date bancaire.',date:j,nombre:parDate[j].length});});
  datesAttendues.forEach(j=>{if((parDate[j]||[]).length===0)erreurs.push({code:'CB_DEBIT_CYCLE_ABSENT',message:'Un débit CB attendu dans l’horizon n’est pas publié.',date:j});});
  publiees.forEach(x=>{const montant=Math.abs(arrGardeCbMultiCycleBudgetSoft20260908_(x.montantSigne)),partCerbere=Math.max(0,arrGardeCbMultiCycleBudgetSoft20260908_(x.partCerbere)),partFinMois=Math.max(0,arrGardeCbMultiCycleBudgetSoft20260908_(x.partFinMois)),somme=arrGardeCbMultiCycleBudgetSoft20260908_(partCerbere+partFinMois);if(Math.abs(montant-somme)>.01)erreurs.push({code:'CB_DEBIT_FORMULE_DIVERGENTE',message:'Le complément CB publié ne correspond pas à partCerbere + partFinMois.',date:isoJourGardeCbMultiCycleBudgetSoft20260908_(x.date),montantPublie:montant,partCerbere,partFinMois,sommeAttendue:somme});});
  if(datesAttendues.length>=2&&publiees.length<2)erreurs.push({code:'CB_MULTICYCLE_INCOMPLET',message:'La trajectoire franchit plusieurs débits CB mais moins de deux compléments sont publiés.',datesAttendues:datesAttendues.slice(),nombrePublie:publiees.length});
  return{ok:erreurs.length===0,version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,sourceProjection:'precalculee',sansRecalculMetier:true,dateReference:r.dateReference||'',dateCible:r.dateCible||cible.toISOString(),datesAttendues,publiees:publiees.map(x=>({date:x.date,montant:arrGardeCbMultiCycleBudgetSoft20260908_(x.montantSigne),partCerbere:arrGardeCbMultiCycleBudgetSoft20260908_(x.partCerbere),partFinMois:arrGardeCbMultiCycleBudgetSoft20260908_(x.partFinMois),moteurCerbere:x.moteurCerbere||''})),controles:{nombreCyclesAttendus:datesAttendues.length,nombreCyclesPublies:publiees.length,tousCyclesAttendusPublies:datesAttendues.every(j=>(parDate[j]||[]).length===1),aucunDebitDuplique:Object.keys(parDate).every(j=>parDate[j].length===1),formulesOk:erreurs.filter(e=>e.code==='CB_DEBIT_FORMULE_DIVERGENTE').length===0},erreurs};
}

function auditerGardeCbMultiCycleBudgetSoft20260908(dateFinCycleSuivant){
  if(typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907!=='function')return{ok:false,version:BUDGETSOFT_CB_MULTICYCLE_GUARD_20260908_VERSION,erreurs:[{code:'CB_OWNER_ABSENT',message:'Propriétaire canonique de trésorerie absent.'}]};
  const finCycle=dateFinCycleSuivant instanceof Date?new Date(dateFinCycleSuivant):new Date(dateFinCycleSuivant||new Date());
  const cible=finMoisGardeCbMultiCycleBudgetSoft20260908_(finCycle);
  const cibleTexte=Utilities.formatDate(cible,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const r=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cibleTexte);
  const out=verifierGardeCbMultiCycleDepuisProjectionBudgetSoft20260910_(r,finCycle);
  out.sourceProjection='recalculee';out.sansRecalculMetier=false;
  return out;
}

function auditerGardeCbMultiCycle27102026BudgetSoft20260908(){
  console.log('[AUDIT Garde CB multi-cycle] démarrage');
  const out=auditerGardeCbMultiCycleBudgetSoft20260908(new Date(2026,9,27,12,0,0,0));
  console.log('[AUDIT Garde CB multi-cycle] '+JSON.stringify(out));
  return out;
}

/**
 * Produit les mêmes lignes CB multi-cycle que le moteur courant, mais à partir
 * d'un Cerbère fourni par l'appelant. Aucun recalcul Cerbère n'est effectué ici.
 */
function estimationsDebitsCbDepuisCerberePrechargeAuditBudgetSoft20260910_(ops,reference,cible,cerbere){
  const out=[],vus={};let ref=new Date(reference),garde=0;
  while(ref<cible&&garde++<12){
    const debit=prochaineDateDebitCbTresorerie20260901_(ref);
    if(!debit||isNaN(debit)||debit>cible)break;
    const cle=String(debit.getTime());if(vus[cle])break;vus[cle]=true;
    const ligne=estimationDebitCbDiffereTresorerie20260901V2_(ops,ref,cible,cerbere);
    if(ligne)out.push(ligne);
    ref=new Date(debit.getTime()+1);
  }
  return out;
}

/** Candidat strict : même trajectoire 20260901, seul Cerbère est fourni d'avance. */
function construireTrajectoireDepuisCerberePrechargeAuditBudgetSoft20260910_(dateCible,cerbere){
  return avecContexteLectureBudgetSoft20260827_('audit-candidat-projection-cerbere-precharge-20260910',function(){
    const r=typeof chargerSocleTresorerie20260831SansDebitCbLegacy20260910_==='function'
      ?chargerSocleTresorerie20260831SansDebitCbLegacy20260910_(dateCible)
      :chargerTresoreriePrevisionnelle20260831(dateCible);
    if(!r||!r.ok)return r;
    const reference=new Date(r.dateReference||new Date()),cible=new Date(r.dateCible||new Date());
    const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
    const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
    const ops=lireTable_('Operations');
    const hard=(r.lignes||[]).filter(function(x){return x.source==='operation_future';});
    let lignes=recalerFluxPlanCarteTresorerie20260901_(r.lignes||[],evenements,actions,hard,reference,cible);
    lignes=filtrerActionsPlanEffectivesTresorerie20260908_(lignes,actions);
    lignes=lignes.filter(function(x){return x.source!=='debit_cb_estime';});
    const debitsCb=estimationsDebitsCbDepuisCerberePrechargeAuditBudgetSoft20260910_(ops,reference,cible,cerbere);
    if(debitsCb.length)lignes.push.apply(lignes,debitsCb);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);
    lignes.sort(function(a,b){return new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude);});
    const final=recalculerSortieTresorerie20260901_(r,lignes,reference,cible);
    const decomposition=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(final);
    final.proprietaireBudgetSoft=BUDGETSOFT_TREASURY_CANONICAL_OWNER;
    final.moteurSousJacent='chargerTresoreriePrevisionnelle20260901';
    final.versionContratCanonique=BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION;
    final.decompositionCanonique=decomposition;
    if(!decomposition.ok){final.ok=false;final.erreur='Contrat canonique de trésorerie non satisfait.';final.erreursContrat=decomposition.erreurs.slice();}
    return final;
  });
}

function signatureProjectionCerberePrechargeAuditBudgetSoft20260910_(r){
  const lignes=(r&&r.lignes||[]).map(function(x){return{
    id:String(x&&x.id||''),source:String(x&&x.source||''),sourceId:String(x&&x.sourceId||''),date:String(x&&x.date||''),
    libelle:String(x&&x.libelle||''),categorie:String(x&&x.categorie||''),compte:String(x&&x.compte||''),
    montantSigne:arrAuditCbCycleBudgetSoft20260908_(x&&x.montantSigne),certitude:String(x&&x.certitude||''),
    preuve:String(x&&x.preuve||''),dateConventionnelle:!!(x&&x.dateConventionnelle),
    partCerbere:x&&x.partCerbere!=null?arrAuditCbCycleBudgetSoft20260908_(x.partCerbere):null,
    partFinMois:x&&x.partFinMois!=null?arrAuditCbCycleBudgetSoft20260908_(x.partFinMois):null,
    moteurCerbere:String(x&&x.moteurCerbere||'')
  };});
  return{
    ok:!!(r&&r.ok),version:String(r&&r.version||''),proprietaire:String(r&&r.proprietaireBudgetSoft||''),
    contratVersion:String(r&&r.versionContratCanonique||''),dateReference:String(r&&r.dateReference||''),dateCible:String(r&&r.dateCible||''),
    soldeReel:arrAuditCbCycleBudgetSoft20260908_(r&&r.soldeReel),variationPrevue:arrAuditCbCycleBudgetSoft20260908_(r&&r.variationPrevue),
    soldePrevisionnel:arrAuditCbCycleBudgetSoft20260908_(r&&r.soldePrevisionnel),nombreLignes:lignes.length,lignes:lignes,
    decompositionOk:!!(r&&r.decompositionCanonique&&r.decompositionCanonique.ok)
  };
}

/**
 * Dernier A/B lecture seule avant éventuelle intégration snapshot :
 * baseline = projection canonique actuelle, qui recharge Cerbère ;
 * candidat = même projection avec un Cerbère préchargé une seule fois.
 * Le coût de préchargement est publié séparément car le snapshot calcule déjà
 * Cerbère pour son propre module : l'objectif est d'éviter le second calcul.
 */
function auditerCandidatReutilisationCerbereProjectionBudgetSoft20260910(){
  const cible='2026-10-31';
  const tA=Date.now();
  const baseline=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible);
  const baselineMs=Date.now()-tA;

  const chargeur=typeof chargerCerbereV374==='function'?chargerCerbereV374:(typeof chargerCerbereV37==='function'?chargerCerbereV37:null);
  const tC=Date.now();
  const cerbere=chargeur?chargeur():null;
  const cerberePrechargeMs=Date.now()-tC;

  const tB=Date.now();
  const candidat=construireTrajectoireDepuisCerberePrechargeAuditBudgetSoft20260910_(cible,cerbere);
  const candidatProjectionMs=Date.now()-tB;

  const a=signatureProjectionCerberePrechargeAuditBudgetSoft20260910_(baseline);
  const b=signatureProjectionCerberePrechargeAuditBudgetSoft20260910_(candidat);
  const identique=JSON.stringify(a)===JSON.stringify(b);
  const cbA=(baseline&&baseline.lignes||[]).filter(function(x){return x.source==='debit_cb_estime';}).map(function(x){return{date:dateIsoJourAuditCbCycleBudgetSoft20260908_(x.date),montant:arrAuditCbCycleBudgetSoft20260908_(x.montantSigne),partCerbere:arrAuditCbCycleBudgetSoft20260908_(x.partCerbere),partFinMois:arrAuditCbCycleBudgetSoft20260908_(x.partFinMois),moteurCerbere:String(x.moteurCerbere||'')};});
  const cbB=(candidat&&candidat.lignes||[]).filter(function(x){return x.source==='debit_cb_estime';}).map(function(x){return{date:dateIsoJourAuditCbCycleBudgetSoft20260908_(x.date),montant:arrAuditCbCycleBudgetSoft20260908_(x.montantSigne),partCerbere:arrAuditCbCycleBudgetSoft20260908_(x.partCerbere),partFinMois:arrAuditCbCycleBudgetSoft20260908_(x.partFinMois),moteurCerbere:String(x.moteurCerbere||'')};});
  const cbIdentique=JSON.stringify(cbA)===JSON.stringify(cbB);
  const gainProjectionPct=baselineMs>0?Math.round((1-candidatProjectionMs/baselineMs)*1000)/10:null;
  const economieProjectionMs=baselineMs-candidatProjectionMs;
  const decision=identique&&cbIdentique&&economieProjectionMs>=2000?'CANDIDAT_AUTORISE_POUR_INTEGRATION_SNAPSHOT':(identique&&cbIdentique?'IDENTIQUE_MAIS_GAIN_INSUFFISANT_ARRETER':'REJETER_CANDIDAT');
  const out={
    ok:identique&&cbIdentique,version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,cible:cible,
    comparaison:{identiqueAuCentimeEtLigneParLigne:identique,cbMultiCycleIdentique:cbIdentique,baseline:{soldeReel:a.soldeReel,variationPrevue:a.variationPrevue,soldePrevisionnel:a.soldePrevisionnel,nombreLignes:a.nombreLignes,debitsCb:cbA},candidat:{soldeReel:b.soldeReel,variationPrevue:b.variationPrevue,soldePrevisionnel:b.soldePrevisionnel,nombreLignes:b.nombreLignes,debitsCb:cbB}},
    durees:{baselineProjectionMs:baselineMs,cerberePrechargeMs:cerberePrechargeMs,candidatProjectionCerbereDejaDisponibleMs:candidatProjectionMs,economieProjectionMs:economieProjectionMs,gainProjectionPct:gainProjectionPct},
    decision:decision,
    doctrine:'Aucune optimisation appliquée. Le candidat n’est intégrable au snapshot que si la trajectoire complète et les deux débits CB sont strictement identiques, avec un gain de projection d’au moins 2 s. Le coût Cerbère préchargé est séparé car le snapshot calcule déjà Cerbère pour son module propre.'
  };
  console.log('[AUDIT PERF A/B réutilisation Cerbère projection] '+JSON.stringify(out));
  return out;
}
