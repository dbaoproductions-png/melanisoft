/*
 * Cerbère — frontière canonique C2 avant salaire — 2026-09-13.
 *
 * Doctrine :
 * - SS2 n'est plus produit par l'ancienne projection interne SHBt1 + flux restants ;
 * - SS2 est le solde de trésorerie canonique à l'ouverture de C2, avant le salaire ;
 * - P2 reste ensuite reconstruit par la formule comptable symétrique de P1 ;
 * - aucune valeur CF n'est corrigée ici : CF2 reste sous l'autorité du propriétaire CF.
 *
 * Une donnée, un propriétaire, un calcul, plusieurs consommateurs.
 */
const CERBERE_C2_CANONICAL_OPENING_20260913_VERSION='2026-09-13.1';

function arrCerbereC2CanonicalOpening20260913_(n){return Math.round(Number(n||0)*100)/100;}
function dateCerbereC2CanonicalOpening20260913_(v){const d=v instanceof Date?new Date(v):new Date(v||0);return isNaN(d.getTime())?null:d;}
function jourCerbereC2CanonicalOpening20260913_(v){const d=dateCerbereC2CanonicalOpening20260913_(v);return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';}
function normCerbereC2CanonicalOpening20260913_(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}

/**
 * Lit la trajectoire bancaire canonique au premier jour de C2 et retire uniquement
 * le salaire d'ouverture déjà inclus dans cette trajectoire. Les autres flux du
 * jour (ex. prélèvement du 28) restent donc bien dans SS2.
 */
function calculerSs2TresorerieCanoniqueCerbere20260913_(base,p2,projectionTresoreriePrecalculee){
  const debut=dateCerbereC2CanonicalOpening20260913_(p2&&p2.periode&&p2.periode.debut);
  if(!debut)return{ok:false,raison:'projection canonique indisponible'};
  let projection=null,projectionPrecalculeeUtilisee=false;
  try{
    if(projectionTresoreriePrecalculee&&projectionTresoreriePrecalculee.ok!==false&&typeof sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_==='function'){
      projection=sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_(projectionTresoreriePrecalculee,debut);
      projectionPrecalculeeUtilisee=!!(projection&&projection.ok!==false);
    }
    if(!projectionPrecalculeeUtilisee){
      if(typeof chargerTresoreriePrevisionnelle20260901!=='function')return{ok:false,raison:'projection canonique indisponible'};
      projection=chargerTresoreriePrevisionnelle20260901(debut,base);
    }
  }catch(e){return{ok:false,raison:String(e&&e.message||e)};}
  if(!projection||projection.ok===false||!Number.isFinite(Number(projection.soldePrevisionnel)))return{ok:false,raison:'projection canonique invalide'};

  const j0=jourCerbereC2CanonicalOpening20260913_(debut);
  let salaire=0;const lignesSalaire=[];
  (projection.lignes||[]).forEach(l=>{
    const d=jourCerbereC2CanonicalOpening20260913_(l&&l.date),m=Number(l&&l.montantSigne),cat=normCerbereC2CanonicalOpening20260913_(l&&l.categorie),lib=normCerbereC2CanonicalOpening20260913_(l&&l.libelle);
    if(d!==j0||!Number.isFinite(m)||m<=0)return;
    if(cat!=='salaires'&&!/(salaire|traitement)/.test(lib))return;
    salaire+=m;
    lignesSalaire.push({date:d,montant:arrCerbereC2CanonicalOpening20260913_(m),categorie:String(l&&l.categorie||''),libelle:String(l&&l.libelle||''),source:String(l&&l.source||'')});
  });

  const soldeAvecSalaire=arrCerbereC2CanonicalOpening20260913_(Number(projection.soldePrevisionnel));
  const ss2=arrCerbereC2CanonicalOpening20260913_(soldeAvecSalaire-salaire);
  return{
    ok:true,
    version:CERBERE_C2_CANONICAL_OPENING_20260913_VERSION,
    proprietaire:projectionPrecalculeeUtilisee?'projectionCalculUnique+sousVue':'chargerTresoreriePrevisionnelle20260901',
    date:j0,
    soldeAvecSalaire:soldeAvecSalaire,
    salaireOuverture:arrCerbereC2CanonicalOpening20260913_(salaire),
    ss2:ss2,
    lignesSalaire:lignesSalaire,
    revisionBudgetSoft:String(projection.revisionBudgetSoft||''),
    doctrine:'solde bancaire canonique au premier jour C2 moins seul salaire d’ouverture ; tous les autres flux du jour sont conservés'
  };
}

/** Override terminal : même propriétaire P2/report CB que précédemment, SS2 canonique. */
function appliquerReportCbCycleSuivant20260905_(base,ajustementsCfPrecharges){
  const ps=Array.isArray(base&&base.periodes)?base.periodes:[];if(ps.length<2)return base;
  const p1=ps[0],p2=ps[1],v=p2.v37||(p2.v37={}),c=v.cockpit20260902||(v.cockpit20260902={}),arr=arrCockpit20260902_;
  const calc=calculerReportCbCycleSuivant20260905_(base),reel=Math.max(0,Number(calc.montant||0));
  let impactEp={differe:0,immediat:0,resteAEngager:0,tauxDifferePct:0,profil:null};
  try{if(typeof calculerImpactPrevisionnelEpBudgetSoft20260913_==='function')impactEp=calculerImpactPrevisionnelEpBudgetSoft20260913_(p1,lireTable_('Operations')||[],new Date())||impactEp;}catch(e){}
  const estime=Math.max(0,Number(impactEp.differe||0)),report=arr(reel+estime);

  const frontiere=calculerSs2TresorerieCanoniqueCerbere20260913_(base,p2);
  const ancienSs2=arr(Number(v.ss1||0));
  const ss2=frontiere&&frontiere.ok?arr(frontiere.ss2):ancienSs2;
  if(frontiere&&frontiere.ok){v.ss1=ss2;v.soldeOuverture=ss2;v.ss1Statut='trésorerie canonique à l’ouverture de C2 · avant salaire';v.ss1ProjectionCanonique20260913=frontiere;}

  const cfReconstruite=typeof reconstruireChargesFixesReevalueesP1Cerbere20260912_==='function'?reconstruireChargesFixesReevalueesP1Cerbere20260912_(p2,v,ajustementsCfPrecharges):null;
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
  c.soldeInitialReference=ss2;c.soldeInitialSource=String(v.ss1Statut||'trésorerie canonique · avant salaire');
  c.detailActualise=Object.assign({},c.detailActualise||{},{soldeAvantSalaireSS1:ss2,recettesReevaluees:rt2,chargesFixesReevaluees:cft2,chargesFixesAudit:cfReconstruite,horsPilotableEtImprevus:het2,reportCbCycle:report,cbDejaEngagee:arr(reel),cbEpEstimee:arr(estime)});
  c.formuleActualisee='P2 = SS2 canonique avant salaire + Rt2 - CFt2 explicable - HEt2 - report CB C1';
  c.doctrineCb='C2 : SS2 vient de la trésorerie canonique avant salaire ; report = CB C1 déjà engagées + seule part CB différée estimée de l’EP1 restant.';
  p2.resteBudgetPilotable=c.ret1;

  base.diagnostic=base.diagnostic||{};
  base.diagnostic.ss2Canonique20260913={version:CERBERE_C2_CANONICAL_OPENING_20260913_VERSION,ancienSs2:ancienSs2,frontiere:frontiere};
  base.diagnostic.p2Doctrine20260913={version:CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION,frontiereVersion:CERBERE_C2_CANONICAL_OPENING_20260913_VERSION,periode:p2&&p2.periode||null,ss2:ss2,rt2:rt2,cft2:cft2,cft2Audit:cfReconstruite,het2:het2,reportCb:report,cbDejaEngagee:arr(reel),cbEpEstimee:arr(estime),p2AvantReport:avant,p2:apres,formule:'SS2 canonique + Rt2 - CFt2 - HEt2 - report CB C1'};
  base.diagnostic.cbDoubleRole={version:'2026-09-13.ep-3',montant:report,connu:arr(reel),epDiffereEstime:arr(estime),epImmediatEstime:arr(impactEp.immediat||0),epResteAEngager:arr(impactEp.resteAEngager||0),tauxDifferePct:Number(impactEp.tauxDifferePct||0),nombre:calc.lignes.length,debutFenetre:calc.debutFenetre,dateImpact:calc.dateImpact,selection:calc.diagnostic||{},lignes:calc.lignes.slice(0,50),p2Avant:avant,p2Apres:apres,doctrine:'P2 = SS2 canonique + Rt2 - CFt2 - HEt2 - (CB C1 connues + part différée estimée de l’EP1 non consommé)'};
  if(typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')enrichirEnvelopePilotableBudgetSoft20260913_(base);
  return base;
}

function auditerFrontiereC2CanoniqueCerbere20260913(){
  const x=recalculerCerbereCockpitP1Frais20260912_(),p=x&&Array.isArray(x.periodes)?x.periodes[1]:null,v=p&&p.v37||{},c=v.cockpit20260902||{},d=x&&x.diagnostic&&x.diagnostic.p2Doctrine20260913||{},s=x&&x.diagnostic&&x.diagnostic.ss2Canonique20260913||{},f=s.frontiere||{};
  const attendu=Math.max(0,arrCerbereC2CanonicalOpening20260913_(Number(d.ss2||0)+Number(d.rt2||0)-Number(d.cft2||0)-Number(d.het2||0)-Number(d.reportCb||0)));
  const out={
    ok:!!(p&&f.ok&&Math.abs(attendu-Number(d.p2||0))<.011&&Math.abs(Number(c.soldeInitialReference||0)-Number(d.ss2||0))<.011),
    version:CERBERE_C2_CANONICAL_OPENING_20260913_VERSION,
    periode:p&&p.periode||null,
    frontiere:{ancienSs2:Number(s.ancienSs2||0),soldeAvecSalaire:Number(f.soldeAvecSalaire||0),salaireOuverture:Number(f.salaireOuverture||0),ss2:Number(f.ss2||0),proprietaire:String(f.proprietaire||''),date:String(f.date||''),revisionBudgetSoft:String(f.revisionBudgetSoft||'')},
    p2:{ss2:Number(d.ss2||0),rt2:Number(d.rt2||0),cft2:Number(d.cft2||0),het2:Number(d.het2||0),reportCb:Number(d.reportCb||0),avantReport:Number(d.p2AvantReport||0),p2:Number(d.p2||0),attendu:attendu},
    carte:{soldeInitialReference:Number(c.soldeInitialReference||0),p2:Number(c.pSoutenable!=null?c.pSoutenable:c.p1Total||0)},
    formule:'SS2 canonique avant salaire + Rt2 - CFt2 - HEt2 - report CB C1'
  };
  console.log('[AUDIT FRONTIERE C2 CANONIQUE 20260913] '+JSON.stringify(out));return out;
}
