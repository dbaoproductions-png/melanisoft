/*
 * Garde terminale Cerbère — P soutenable / EP décidé — 2026-09-13.
 *
 * Cette couche clôt la migration de l'ancienne sémantique « P1 piloté par les
 * molettes ». P reste désormais une sortie du moteur comptable ; EP est la
 * décision portée par BudgetSoftEnvelopePilotable20260913.
 *
 * Une donnée, un propriétaire, un calcul, plusieurs consommateurs.
 */
const CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION='2026-09-13.3';

/* Compatibilité historique : l'ancien ajustement manuel de P est neutralisé. */
function lireAjustementP1Cerbere20260903_(cle){return 0;}
function lireCibleP1Cerbere20260903_(cle,pilotableActualise){return Math.max(0,arrCockpit20260902_(Number(pilotableActualise||0)));}
function memoriserCibleP1Cerbere20260903_(cle,montant,pilotableActualise){
  try{PropertiesService.getDocumentProperties().deleteProperty(cleAjustementP1Cerbere20260903_(cle));}catch(e){}
  const base=Math.max(0,arrCockpit20260902_(Number(pilotableActualise||0)));
  return{cible:base,ajustement:0,deprecie:true};
}

/**
 * Override autoritaire P1 : aucune donnée issue des molettes n'entre dans P1.
 * Les allocations ne servent ici qu'à publier l'écart de décision EP-P1.
 */
function appliquerDoctrineP1ComptableGuideVieCerbere20260912_(base){
  const ps=Array.isArray(base&&base.periodes)?base.periodes:[];
  if(!ps.length)return base;
  const p=ps[0],v=p&&p.v37||(p.v37={}),c=v.cockpit20260902||(v.cockpit20260902={}),env=Array.isArray(p&&p.enveloppes)?p.enveloppes:[];
  const arr=arrCockpit20260902_;
  const p0=arr(c.p0Total!=null?c.p0Total:env.reduce((s,x)=>s+Math.max(0,Number(x&&x.canon||0)),0));
  const allocation=arr(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)),0));
  const consomme=arr(c.consommePilotable!=null?c.consommePilotable:env.reduce((s,x)=>s+Math.max(0,Number(x&&x.reelNetPrevisionnel||0)),0));
  const rt1=arr(Number(v.rt1||0));
  const cfReconstruite=reconstruireChargesFixesReevalueesP1Cerbere20260912_(p,v);
  const cft1=arr(cfReconstruite&&cfReconstruite.ok?cfReconstruite.total:Number(v.cft1||0));
  const het1=arr(Math.max(0,Number(v.het1!=null?v.het1:(v.horsPilotableAControler||0))));
  const ss1=arr(Number(v.ss1||0));
  const herite=calculerCbHeriteesP1Cerbere20260912_(p);
  const avantHeritage=arr(ss1+rt1-cft1-het1);
  const p1=arr(Math.max(0,avantHeritage-Number(herite.montant||0)));
  const resteP1=arr(p1-consomme),ecartEpP1=arr(allocation-p1);

  v.cft1=cft1;v.chargesFixesTotal=cft1;v.cft1Audit20260912=cfReconstruite;
  c.p0Total=p0;c.p1Total=p1;c.p1Cible=p1;c.ajustementP1=0;
  c.budgetPilotableActualise=p1;c.budgetPilotableAvantReportCb=avantHeritage;c.capacitePilotable=p1;
  c.cbHeriteesCycle=arr(herite.montant);c.cbHeriteesNombre=herite.nombre;c.cbHeriteesExcluesCf=arr(herite.excluesCf);
  c.surplusVsP0=arr(p1-p0);c.budgetRepartiMolettes=allocation;
  c.margeARepartir=0;c.aRepartirDansPostes=0;c.surplusCapaciteVsAllocation=arr(p1-allocation);
  c.consommePilotable=consomme;c.ret1=resteP1;c.pSoutenable=p1;c.pDisponible=resteP1;c.ecartEpP=ecartEpP1;
  c.detailActualise=Object.assign({},c.detailActualise||{}, {soldeAvantSalaireSS1:ss1,recettesReevaluees:rt1,chargesFixesReevaluees:cft1,chargesFixesAudit:cfReconstruite,horsPilotableEtImprevus:het1,cbHeriteesCycle:arr(herite.montant),cbHeriteesNombre:herite.nombre,cbHeriteesExcluesCf:arr(herite.excluesCf)});
  c.formuleActualisee='P1 = SS1 avant salaire + Rt1 - CFt1 explicable - HEt1 - CB héritées de M-1 non déjà provisionnées';
  c.formuleVentilation='EP est indépendant de P1 : EP = somme des molettes ; écart de décision = EP - P1.';
  c.datePilotable='dépense pilotable : date d’achat/engagement ; trésorerie : date bancaire ; le règlement CB technique ne recompte jamais la dépense';
  v.ret1=resteP1;v.disponibleEnveloppes=resteP1;v.capaciteAvantPilotable=p1;v.cbHeriteesCycle=arr(herite.montant);
  p.resteBudgetPilotable=resteP1;p.budgetReparti=allocation;

  base.diagnostic=base.diagnostic||{};
  base.diagnostic.p1Doctrine20260912={version:CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION,periode:p&&p.periode||null,ss1:ss1,rt1:rt1,cft1:cft1,cft1Audit:cfReconstruite,het1:het1,cbHeritees:arr(herite.montant),cbHeriteesNombre:herite.nombre,cbHeriteesExcluesCf:arr(herite.excluesCf),capacite:p1,ajustement:0,p1:p1,p0:p0,consommePilotable:consomme,restePilotable:resteP1,allocations:allocation,surplusDeficitVsP0:arr(p1-p0),surplusDeficitAVentiler:arr(p1-allocation),ecartEpP1:ecartEpP1,doctrine:'P1 est un indicateur comptable dynamique indépendant des molettes. Les molettes appartiennent exclusivement à EP.'};
  if(typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')enrichirEnvelopePilotableBudgetSoft20260913_(base);
  return base;
}

/**
 * C2 : P2 est reconstruit avec la même formule comptable que P1 :
 * SS2 avant salaire + Rt2 - CFt2 - HEt2 - report CB C1.
 * Le report CB = CB déjà engagées de C1 + part EP1 différée estimée.
 */
function appliquerReportCbCycleSuivant20260905_(base){
  const ps=Array.isArray(base&&base.periodes)?base.periodes:[];if(ps.length<2)return base;
  const calc=calculerReportCbCycleSuivant20260905_(base),reel=Math.max(0,Number(calc.montant||0)),p1=ps[0],p2=ps[1],v=p2.v37||(p2.v37={}),c=v.cockpit20260902||(v.cockpit20260902={}),arr=arrCockpit20260902_;
  let impactEp={differe:0,immediat:0,resteAEngager:0,tauxDifferePct:0,profil:null};
  try{if(typeof calculerImpactPrevisionnelEpBudgetSoft20260913_==='function')impactEp=calculerImpactPrevisionnelEpBudgetSoft20260913_(p1,lireTable_('Operations')||[],new Date())||impactEp;}catch(e){}
  const estime=Math.max(0,Number(impactEp.differe||0)),report=arr(reel+estime);

  const cfReconstruite=typeof reconstruireChargesFixesReevalueesP1Cerbere20260912_==='function'?reconstruireChargesFixesReevalueesP1Cerbere20260912_(p2,v):null;
  const ss2=arr(Number(v.ss1||0));
  const rt2=arr(Number(v.rt1||0));
  const cft2=arr(cfReconstruite&&cfReconstruite.ok?cfReconstruite.total:Number(v.cft1||0));
  const het2=arr(Math.max(0,Number(v.het1!=null?v.het1:(v.horsPilotableAControler||0))));
  const avant=arr(ss2+rt2-cft2-het2);
  const apres=Math.max(0,arr(avant-report));
  const cons=Math.max(0,Number(c.consommePilotable||0)),p0=Math.max(0,Number(c.p0Total||0));

  v.cft1=cft2;v.chargesFixesTotal=cft2;v.cft1Audit20260912=cfReconstruite;
  v.reportCbCycle=report;v.cbDejaEngagee=arr(reel);v.cbEpEstimee=arr(estime);v.p1AvantReportCb=avant;v.p1ApresReportCb=apres;
  c.p1AvantReportCb=avant;c.reportCbCycle=report;c.cbDejaEngagee=arr(reel);c.cbEpEstimee=arr(estime);
  c.p1Total=apres;c.p1Cible=apres;c.ajustementP1=0;c.pSoutenable=apres;c.budgetPilotableActualise=apres;c.ret1=arr(apres-cons);c.pDisponible=c.ret1;c.surplusVsP0=arr(apres-p0);c.margeARepartir=0;c.aRepartirDansPostes=0;
  c.soldeInitialReference=ss2;c.soldeInitialSource=String(v.ss1Statut||'frontière Cerbère · avant salaire');
  c.detailActualise=Object.assign({},c.detailActualise||{},{soldeAvantSalaireSS1:ss2,recettesReevaluees:rt2,chargesFixesReevaluees:cft2,chargesFixesAudit:cfReconstruite,horsPilotableEtImprevus:het2,reportCbCycle:report,cbDejaEngagee:arr(reel),cbEpEstimee:arr(estime)});
  c.formuleActualisee='P2 = SS2 avant salaire + Rt2 - CFt2 explicable - HEt2 - report CB C1';
  c.doctrineCb='C2 : CB déjà engagées de C1 + estimation de la seule part CB différée de l’EP1 restant ; aucune double imputation par catégorie.';
  p2.resteBudgetPilotable=c.ret1;

  base.diagnostic=base.diagnostic||{};
  base.diagnostic.p2Doctrine20260913={version:CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION,periode:p2&&p2.periode||null,ss2:ss2,rt2:rt2,cft2:cft2,cft2Audit:cfReconstruite,het2:het2,reportCb:report,cbDejaEngagee:arr(reel),cbEpEstimee:arr(estime),p2AvantReport:avant,p2:apres,formule:'SS2 + Rt2 - CFt2 - HEt2 - report CB C1'};
  base.diagnostic.cbDoubleRole={version:'2026-09-13.ep-2',montant:report,connu:arr(reel),epDiffereEstime:arr(estime),epImmediatEstime:arr(impactEp.immediat||0),epResteAEngager:arr(impactEp.resteAEngager||0),tauxDifferePct:Number(impactEp.tauxDifferePct||0),nombre:calc.lignes.length,debutFenetre:calc.debutFenetre,dateImpact:calc.dateImpact,selection:calc.diagnostic||{},lignes:calc.lignes.slice(0,50),p2Avant:avant,p2Apres:apres,doctrine:'P2 = SS2 + Rt2 - CFt2 - HEt2 - (CB C1 connues + part différée estimée de l’EP1 non consommé)'};
  if(typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')enrichirEnvelopePilotableBudgetSoft20260913_(base);
  return base;
}

/** Les molettes sauvegardent EP seulement. Les anciens paramètres P1 sont ignorés. */
function sauvegarderPilotageCerbere20260903(d){
  d=d||{};const cle=String(d.cle||'').trim(),postes=Array.isArray(d.postes)?d.postes:[];
  if(!cle)throw new Error('Cycle Cerbère manquant.');
  sauvegarderBudgetPeriodeCerbereV33({cle:cle,postes:postes});
  try{PropertiesService.getDocumentProperties().deleteProperty(cleAjustementP1Cerbere20260903_(cle));}catch(e){}
  const ep=arrCockpit20260902_(postes.reduce((s,x)=>s+Math.max(0,Number(x&&x.montant||0)),0));
  invaliderProjectionBudgetSoft_('cerbere-pilotage-ep');
  return{ok:true,cle:cle,epTotal:ep,proprietaire:BUDGETSOFT_EP_OWNER_20260913,p1Modifie:false};
}

function estSnapshotCerbereP1FraisValide20260912_(s){
  if(!s||s.ok===false)return false;
  const p=Array.isArray(s.periodes)&&s.periodes.length?s.periodes[0]:null,d=s&&s.diagnostic&&s.diagnostic.p1Doctrine20260912||null,ep=s&&s.diagnostic&&s.diagnostic.enveloppePilotable20260913||null,due=s&&s.diagnostic&&s.diagnostic.rt1EvenementsCertainsDus20260912||null,p2=s&&s.diagnostic&&s.diagnostic.p2Doctrine20260913||null;
  if(!p||!d||!due||!ep||!p2)return false;
  if(String(due.version||'')!==String(typeof CERBERE_P1_INPUTS_FIX_20260912_VERSION!=='undefined'?CERBERE_P1_INPUTS_FIX_20260912_VERSION:''))return false;
  if(String(p2.version||'')!==CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION)return false;
  const n=x=>Number(x||0),arr=x=>Math.round(n(x)*100)/100,attendu=arr(n(d.ss1)+n(d.rt1)-n(d.cft1)-n(d.het1)-n(d.cbHeritees)),attenduP2=Math.max(0,arr(n(p2.ss2)+n(p2.rt2)-n(p2.cft2)-n(p2.het2)-n(p2.reportCb)));
  return Math.abs(attendu-n(d.p1))<0.011&&Math.abs(n(ep.ep)-n(d.allocations))<0.011&&Math.abs(attenduP2-n(p2.p2))<0.011;
}

function publierValeursCartesDepuisOwnerP120260912_(base){
  if(!base||base.ok===false)return base;
  if(typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')enrichirEnvelopePilotableBudgetSoft20260913_(base);
  const p=Array.isArray(base.periodes)&&base.periodes.length?base.periodes[0]:null,v=p&&p.v37||(p?p.v37={}:{}),c=v&&v.cockpit20260902||(v?v.cockpit20260902={}:{}),d=base&&base.diagnostic&&base.diagnostic.p1Doctrine20260912||null;
  if(!p||!d)return base;
  c.p0Total=Number(d.p0||0);c.p1Total=Number(d.p1||0);c.p1Cible=Number(d.p1||0);c.pSoutenable=Number(d.p1||0);c.consommePilotable=Number(d.consommePilotable||0);c.ret1=Number(d.restePilotable||0);c.pDisponible=Number(d.restePilotable||0);c.surplusVsP0=Number(d.surplusDeficitVsP0||0);c.ajustementP1=0;
  v.ret1=Number(d.restePilotable||0);v.rt1=Number(d.rt1||0);v.cft1=Number(d.cft1||0);v.chargesFixesTotal=Number(d.cft1||0);v.het1Reel=Number(d.het1||0);
  base.diagnostic=base.diagnostic||{};base.diagnostic.publicationCartesP120260912={version:CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION,sourceP:'diagnostic.p1Doctrine20260912',sourceEp:'BudgetSoftEnvelopePilotable20260913',sansRecalculMetier:true};
  return base;
}

/* Entrée UI/snapshot : snapshot obsolète refusé, sinon propriétaires republiés. */
function chargerCerbereCockpit20260902(){
  try{if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function'){const snapshot=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();if(snapshot&&snapshot.ok!==false&&snapshot.source==='snapshot_global'&&estSnapshotCerbereP1FraisValide20260912_(snapshot)){snapshot.sourceBudgetSoft='snapshot_global';snapshot.versionSnapshotFirst=CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION;return publierValeursCartesDepuisOwnerP120260912_(snapshot);}}}catch(e){}
  return publierValeursCartesDepuisOwnerP120260912_(recalculerCerbereCockpitP1Frais20260912_());
}

/** Même source EP pour Dashboard et Express : aucun calcul P dans ce raccourci. */
function lirePilotableParJourDashboardSnapshotBudgetSoft20260909(){
  const x=chargerEtatEnvelopePilotableBudgetSoft20260913(),c=x&&x.courant;if(!c)return{disponible:false};
  const cockpit=chargerCerbereCockpit20260902(),p=cockpit&&Array.isArray(cockpit.periodes)?cockpit.periodes[0]:null,fin=dateCockpit20260902_(p&&p.periode&&p.periode.fin),maintenant=new Date();
  const jours=fin?Math.max(1,Math.ceil((new Date(fin.getFullYear(),fin.getMonth(),fin.getDate()).getTime()-new Date(maintenant.getFullYear(),maintenant.getMonth(),maintenant.getDate()).getTime())/86400000)+1):1;
  return{disponible:true,version:BUDGETSOFT_EP_20260913_VERSION,source:'EP',ep:Number(c.ep||0),epDisponible:Number(c.epDisponible||0),joursRestants:jours,pilotableParJour:arrCockpit20260902_(Number(c.epDisponible||0)/jours)};
}

function auditerValeursCartesCerbereOwner20260912(){
  const x=chargerCerbereCockpit20260902(),p=x&&Array.isArray(x.periodes)?x.periodes[0]:null,v=p&&p.v37||{},c=v.cockpit20260902||{},d=x&&x.diagnostic&&x.diagnostic.p1Doctrine20260912||{},e=x&&x.diagnostic&&x.diagnostic.enveloppePilotable20260913||{};
  const out={ok:!!p,version:CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION,source:x&&x.sourceBudgetSoft||'',p:{carte:Number(c.p1Total||0),disponible:Number(c.ret1||0),owner:Number(d.p1||0),ownerDisponible:Number(d.restePilotable||0)},ep:{carte:Number(c.epTotal||0),disponible:Number(c.epDisponible||0),owner:Number(e.ep||0),ownerDisponible:Number(e.epDisponible||0),source:String(c.epSource||'')},construction:{rt1:Number(v.rt1||0),cft1:Number(v.cft1||0),het1:Number(v.het1Reel||0)},sansRecalculMetier:true};
  out.ok=out.ok&&Math.abs(out.p.carte-out.p.owner)<.011&&Math.abs(out.p.disponible-out.p.ownerDisponible)<.011&&Math.abs(out.ep.carte-out.ep.owner)<.011&&Math.abs(out.ep.disponible-out.ep.ownerDisponible)<.011;
  console.log('[AUDIT CARTES CERBERE OWNER 20260913] '+JSON.stringify(out));return out;
}

function auditerCycleSuivantCerbere20260913(){
  const x=recalculerCerbereCockpitP1Frais20260912_(),p=x&&Array.isArray(x.periodes)?x.periodes[1]:null,v=p&&p.v37||{},c=v.cockpit20260902||{},d=x&&x.diagnostic&&x.diagnostic.p2Doctrine20260913||{},cf=d.cft2Audit||{};
  const attendu=Math.max(0,arrCockpit20260902_(Number(d.ss2||0)+Number(d.rt2||0)-Number(d.cft2||0)-Number(d.het2||0)-Number(d.reportCb||0)));
  const out={ok:!!p&&Math.abs(attendu-Number(d.p2||0))<.011,version:CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION,source:x&&x.sourceBudgetSoft||'',periode:p&&p.periode||null,ss2:Number(d.ss2||0),ss2Statut:String(v.ss1Statut||''),rt2:Number(d.rt2||0),cft2:Number(d.cft2||0),cft2Brut:Number(cf.brutAvantSuspensions||0),suspensions:Number(cf.suspensions||0),het2:Number(d.het2||0),reportCb:Number(d.reportCb||0),cbDejaEngagee:Number(d.cbDejaEngagee||0),cbEpEstimee:Number(d.cbEpEstimee||0),p2AvantReport:Number(d.p2AvantReport||0),p2:Number(d.p2||0),p2Carte:Number(c.pSoutenable!=null?c.pSoutenable:c.p1Total||0),attendu:attendu,formule:'SS2 + Rt2 - CFt2 - HEt2 - report CB'};
  out.ok=out.ok&&Math.abs(out.p2-out.p2Carte)<.011;
  console.log('[AUDIT CYCLE SUIVANT CERBERE 20260913] '+JSON.stringify(out));return out;
}
