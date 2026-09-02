const CERBERE_CONSOLIDATION_VERSION='1.0.4';

/**
 * Couche de cohérence Cerbère ↔ Planification.
 * Elle ne remplace aucun moteur : elle fixe les invariants et fournit un
 * diagnostic unique pour éviter les régressions entre P0, R0, Plan et P1–P6.
 */
function invaliderProjectionBudgetSoft_(origine){
  const props=PropertiesService.getDocumentProperties();
  const maintenant=new Date().toISOString();
  props.setProperty('BUDGETSOFT_PROJECTION_DIRTY','true');
  props.setProperty('BUDGETSOFT_PROJECTION_DIRTY_LE',maintenant);
  props.setProperty('BUDGETSOFT_PROJECTION_DIRTY_ORIGINE',String(origine||'inconnue'));
  props.setProperty('PLAN_DERNIER_RECALCUL',maintenant);
  props.setProperty('PLAN_DERNIERE_ORIGINE',String(origine||'inconnue'));
  return {ok:true,invalidee:true,origine:String(origine||'inconnue'),date:maintenant};
}

function marquerProjectionBudgetSoftCalculee_(version){
  const props=PropertiesService.getDocumentProperties();
  props.setProperty('BUDGETSOFT_PROJECTION_DIRTY','false');
  props.setProperty('CERBERE_DERNIER_RECALCUL',new Date().toISOString());
  props.setProperty('CERBERE_DERNIERE_VERSION',String(version||''));
}

function etatProjectionBudgetSoft(){
  const p=PropertiesService.getDocumentProperties();
  return {
    dirty:p.getProperty('BUDGETSOFT_PROJECTION_DIRTY')==='true',
    dirty_le:p.getProperty('BUDGETSOFT_PROJECTION_DIRTY_LE')||'',
    origine:p.getProperty('BUDGETSOFT_PROJECTION_DIRTY_ORIGINE')||'',
    dernier_calcul:p.getProperty('CERBERE_DERNIER_RECALCUL')||'',
    version:p.getProperty('CERBERE_DERNIERE_VERSION')||''
  };
}

/** Diagnostic fonctionnel : aucune écriture dans les données métier. */
function diagnostiquerConsolidationCerbere(){
  const erreurs=[],avertissements=[];
  let p0,r0,cerbere,plan;
  try{p0=chargerCanonCerbereV1();}catch(e){erreurs.push('P0 illisible : '+(e.message||e));}
  try{r0=chargerCanonRecettesCerbereV1();}catch(e){erreurs.push('R0 illisible : '+(e.message||e));}
  try{plan=chargerPlanActionsV4();}catch(e){erreurs.push('Planification illisible : '+(e.message||e));}
  try{cerbere=chargerCerbereV33();}catch(e){erreurs.push('Cerbère illisible : '+(e.message||e));}

  if(p0){
    if(!(p0.postes||[]).length)erreurs.push('P0 ne contient aucun poste.');
    if(!Number.isFinite(Number(p0.totaux&&p0.totaux.monetaire)))erreurs.push('Total P0 invalide.');
  }
  if(r0){
    if(!(r0.postes||[]).length)erreurs.push('R0 ne contient aucune recette.');
    if(!(Number(r0.total)>0))avertissements.push('R0 est nul ou négatif.');
  }
  if(cerbere&&cerbere.ok){
    if((cerbere.periodes||[]).length!==6)erreurs.push('Cerbère ne produit pas exactement P1–P6.');
    (cerbere.periodes||[]).forEach((p,i)=>{
      if(!p.clePilotage)erreurs.push('P'+(i+1)+' n’a pas de clé de pilotage locale.');
      if(!Number.isFinite(Number(p.budgetDisponible)))erreurs.push('P'+(i+1)+' : budget disponible invalide.');
      if(!Number.isFinite(Number(p.budgetReparti)))erreurs.push('P'+(i+1)+' : budget réparti invalide.');
      const ev=(p.plan&&p.plan.evenements)||[];
      ev.forEach(e=>{if(['Réalisé','Annulé','Rapproché'].includes(String(e.statut||'')))erreurs.push('P'+(i+1)+' contient un événement sorti du prévisionnel : '+String(e.libelle||e.id||''));});
      const acts=(p.plan&&p.plan.actions)||[];
      acts.forEach(a=>{if(!(a.impact_confirme===true||String(a.impact_confirme)==='true'))erreurs.push('P'+(i+1)+' contient une action non confirmée : '+String(a.libelle||a.id||''));});
    });
  } else if(cerbere) erreurs.push('Cerbère a répondu en erreur : '+String(cerbere.erreur||cerbere.stage||'inconnue'));

  try{
    const sh=SpreadsheetApp.getActive().getSheetByName('Cerbere_Ajustements');
    if(sh&&sh.getLastRow()>1){
      const rows=sh.getRange(2,1,sh.getLastRow()-1,3).getValues();
      rows.forEach((r,n)=>{
        if(!/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/.test(String(r[0]||'')))erreurs.push('Ajustement Cerbère ligne '+(n+2)+' : période invalide.');
        if(!String(r[1]||'').trim())erreurs.push('Ajustement Cerbère ligne '+(n+2)+' : catégorie vide.');
      });
    }
  }catch(e){avertissements.push('Contrôle des ajustements impossible : '+(e.message||e));}

  return serialiserCerberePourClient_({
    ok:erreurs.length===0,
    version:CERBERE_CONSOLIDATION_VERSION,
    erreurs, avertissements,
    p0:p0?{version:p0.version,total:p0.totaux&&p0.totaux.monetaire,postes:(p0.postes||[]).length}:null,
    r0:r0?{version:r0.version,total:r0.total,postes:(r0.postes||[]).length}:null,
    plan:plan?{version:plan.version,objectifs:(plan.objectifs||[]).length,actions:(plan.actions||[]).length,evenements:(plan.evenements||[]).length}:null,
    cerbere:cerbere?{ok:cerbere.ok,version:cerbere.version,periodes:(cerbere.periodes||[]).length,duree_ms:cerbere.diagnostic&&cerbere.diagnostic.duree_ms}:null,
    projection:etatProjectionBudgetSoft()
  });
}

const CERBERE_COCKPIT_20260902_VERSION='2026-09-02.4';

function chargerCerbereCockpit20260902(){
  const executer=function(){
    const base=chargerCerbereV374();
    if(!base||base.ok===false)return base;
    corrigerReelPilotableDateAchat20260902_(base);
    const periodes=Array.isArray(base.periodes)?base.periodes:[];
    periodes.forEach(enrichirCycleCockpitCerbere20260902_);
    base.cockpit20260902={
      version:CERBERE_COCKPIT_20260902_VERSION,
      appreciation:appreciationCockpitCerbere20260902_(base),
      doctrine:'P1 retenu = somme des allocations du cycle, éventuellement complétée localement par le surplus disponible par rapport à P0. Pilotable à l’instant t = Rt1 - CFt1 - HEt1. Surplus P0 = pilotable à l’instant t - P0. Économies/surplus = pilotable à l’instant t - P1 retenu.'
    };
    return serialiserCerberePourClient_(base);
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'
    ?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-20260902',executer)
    :executer();
}

function corrigerReelPilotableDateAchat20260902_(base){
  const ops0=lireTable_('Operations')||[];
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  const charges=lireTable_('Charges_fixes')||[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  const liensCf=typeof construireLiensCfCertainsV377_==='function'?construireLiensCfCertainsV377_(operations,charges,rapprochements):{};
  const maintenant=new Date();
  (Array.isArray(base.periodes)?base.periodes:[]).forEach(p=>{
    if(!p||typeof p!=='object')return;
    const env=Array.isArray(p.enveloppes)?p.enveloppes:[],debut=dateCockpit20260902_(p.periode&&p.periode.debut),fin=dateCockpit20260902_(p.periode&&p.periode.fin);
    if(!debut||!fin)return;
    const cats=new Set(env.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean)),reelParCat={};
    operations.forEach(o=>{
      const montant=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim(),id=String(o&&o.id||'').trim();
      if(!Number.isFinite(montant)||montant>=0||!cats.has(cat))return;
      if((id&&liensCf[id])||String(o&&o.charge_fixe_id||'').trim())return;
      if(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o))return;
      const d=dateAchatCockpit20260902_(o);if(!d||d<debut||d>fin||d>maintenant)return;
      reelParCat[cat]=Number(reelParCat[cat]||0)+Math.abs(montant);
    });
    env.forEach(x=>{const cat=String(x&&x.categorie||'').trim();x.reelNetPrevisionnel=arrCockpit20260902_(Number(reelParCat[cat]||0));x.reelPilotableDepuisDebutCycle=x.reelNetPrevisionnel;});
  });
}

function dateAchatCockpit20260902_(o){let d=null;if(typeof dateAchatMetierBudgetSoft_==='function')d=dateAchatMetierBudgetSoft_(o);if(!d)d=dateCockpit20260902_(o&&o.date_achat);if(!d&&typeof dateOperationCouranteBudgetSoft_==='function')d=dateOperationCouranteBudgetSoft_(o);if(!d)d=dateCockpit20260902_(o&&(o.date||o.date_comptable));return d;}
function dateCockpit20260902_(v){if(!v)return null;const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d)?null:d;}
function arrCockpit20260902_(n){return Math.round((Number(n)||0)*100)/100;}

function enrichirCycleCockpitCerbere20260902_(p){
  if(!p||typeof p!=='object')return;
  const v=p.v37||(p.v37={}),env=Array.isArray(p.enveloppes)?p.enveloppes:[];
  let p0=0,p1=0,ret=0,dpt=0,consomme=0,plan=0,depassements=0;
  env.forEach(x=>{
    const canon=Math.max(0,Number(x&&x.canon||0)),allocation=Math.max(0,Number(x&&x.prevu||0)),reel=Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0))),reserve=Math.max(0,Number(x&&x.planifie||0)),engage=reel+reserve;
    p0+=canon;p1+=allocation;consomme+=reel;plan+=reserve;ret+=allocation-reel;dpt+=Math.max(allocation,engage);depassements+=Math.max(0,engage-allocation);
    x.engageV37=arrCockpit20260902_(engage);x.resteV37=arrCockpit20260902_(allocation-reel);x.dpt1=arrCockpit20260902_(Math.max(allocation,engage));
  });
  const het=Math.max(0,Number(v.het1!=null?v.het1:(v.horsPilotableAControler||0)));
  const actualise=Math.max(0,Number(v.rt1||0)-Number(v.cft1||0)-het);
  const arr=arrCockpit20260902_;
  v.cockpit20260902={
    p0Total:arr(p0),p1Total:arr(p1),budgetRepartiMolettes:arr(p1),
    budgetPilotableActualise:arr(actualise),capacitePilotable:arr(actualise),
    surplusVsP0:arr(actualise-p0),margeARepartir:arr(actualise-p1),
    consommePilotable:arr(consomme),reservePlan:arr(plan),ret1:arr(ret),dpt1:arr(dpt),depassements:arr(depassements),het1:arr(het),
    detailActualise:{recettesReevaluees:arr(v.rt1),chargesFixesReevaluees:arr(v.cft1),horsPilotableEtImprevus:arr(het)},
    formuleActualisee:'Pilotable à l’instant t = Rt1 - CFt1 - HEt1',
    formuleMarge:'Surplus / économies = pilotable à l’instant t - P1 retenu',
    propositionProjetPossible:actualise>p0+.009,
    datePilotable:'date d’achat prioritaire ; date métier réelle en repli'
  };
  v.ret1=arr(ret);v.dpt1=arr(dpt);v.disponibleEnveloppes=arr(ret);p.resteBudgetPilotable=arr(ret);p.budgetReparti=arr(p1);
}

function appreciationCockpitCerbere20260902_(base){
  const p=Array.isArray(base&&base.periodes)?base.periodes[0]:null;if(!p)return{niveau:'vert',emoji:'🌤️',titre:'Situation à observer',resume:'Aucun cycle courant disponible.',consigne:''};
  const v=p.v37||{},c=v.cockpit20260902||{},env=Array.isArray(p.enveloppes)?p.enveloppes:[],debut=new Date((p.periode||p).debut),fin=new Date((p.periode||p).fin),now=new Date(),total=Math.max(1,fin-debut),ratio=Math.max(0,Math.min(1,(now-debut)/total)),alertes=[];
  env.forEach(x=>{const allocation=Math.max(0,Number(x&&x.prevu||0)),reel=Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0)));if(!allocation&&reel<=0)return;const part=allocation>0?reel/allocation:1,ecart=(part-ratio)*100;if(reel>allocation+.009)alertes.push({niveau:2,texte:String(x.categorie||'Poste')+' dépassé'});else if(ecart>25)alertes.push({niveau:2,texte:String(x.categorie||'Poste')+' très rapide'});else if(ecart>10)alertes.push({niveau:1,texte:String(x.categorie||'Poste')+' un peu rapide'});});
  if(Number(c.margeARepartir||0)<-.009)alertes.push({niveau:2,texte:'Économies à trouver : '+formatEuroCockpit20260902_(Math.abs(c.margeARepartir))});
  const niveau=Math.max(0,...alertes.map(x=>x.niveau)),info=alertes.sort((a,b)=>b.niveau-a.niveau)[0];
  if(niveau>=2)return{niveau:'rouge',emoji:'⛈️',titre:'Arbitrage nécessaire',resume:'Le cycle demande un ajustement du pilotable.',consigne:info?info.texte:''};
  if(niveau===1)return{niveau:'orange',emoji:'🌧️',titre:'Cap à surveiller',resume:'La situation reste récupérable, mais un poste mérite l’attention.',consigne:info?info.texte:''};
  const marge=Number(c.margeARepartir||0);return{niveau:'vert',emoji:'🌤️',titre:'Cap tenu',resume:'Le rythme du pilotable reste compatible avec le cycle.',consigne:marge>0?'Surplus à ventiler : '+formatEuroCockpit20260902_(marge):'Aucun arbitrage particulier à ce stade.'};
}

function auditerCockpitPilotable20260902(){const b=chargerCerbereCockpit20260902(),p=b&&b.periodes&&b.periodes[0],c=p&&p.v37&&p.v37.cockpit20260902;return{ok:!!p,periode:p&&p.periode,p0:c&&c.p0Total,p1:c&&c.p1Total,pilotableActualise:c&&c.budgetPilotableActualise,surplusP0:c&&c.surplusVsP0,marge:c&&c.margeARepartir,reelPilotable:c&&c.consommePilotable,imprevus:c&&c.het1,courses:(p&&p.enveloppes||[]).filter(x=>String(x.categorie||'')==='Courses').map(x=>({allocation:x.prevu,reel:x.reelNetPrevisionnel,reste:x.resteV37}))};}
function formatEuroCockpit20260902_(n){return Utilities.formatString('%.2f €',Math.round((Number(n)||0)*100)/100);}
