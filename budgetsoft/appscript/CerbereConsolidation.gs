const CERBERE_CONSOLIDATION_VERSION='1.0.3';

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

const CERBERE_COCKPIT_20260902_VERSION='2026-09-02.3';

/**
 * Doctrine cockpit :
 * 1. P1 initial = recettes prévisionnelles - CF prévisionnelles - dépenses A/E prévues.
 * 2. Budget pilotable actualisé = même capacité réévaluée par le Réel, sans déduire
 *    la consommation normale des enveloppes pilotables.
 * 3. Surplus / économies = budget actualisé - somme des allocations des molettes.
 */
function chargerCerbereCockpit20260902(){
  const executer=function(){
    const base=chargerCerbereV374();
    if(!base||base.ok===false)return base;
    corrigerReelPilotableDateAchat20260902_(base);
    const periodes=Array.isArray(base.periodes)?base.periodes:[];
    periodes.forEach(p=>enrichirCycleCockpitCerbere20260902_(p,base));
    base.cockpit20260902={
      version:CERBERE_COCKPIT_20260902_VERSION,
      appreciation:appreciationCockpitCerbere20260902_(base),
      doctrine:'P1 initial = recettes prévues - charges fixes prévues - dépenses prévues Actions/Événements. Le budget pilotable actualisé applique ensuite les écarts révélés par le Réel sur recettes, charges fixes, Actions/Événements et imprévus. La consommation normale des molettes n’abaisse pas cette capacité : elle est suivie dans chaque enveloppe. Surplus/économies = budget actualisé - allocations des molettes.'
    };
    return serialiserCerberePourClient_(base);
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'
    ?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-20260902',executer)
    :executer();
}

/**
 * Recalcule le consommé des enveloppes selon la date d'achat réelle.
 * Les débits CB différés restent comptés à leur date bancaire dans le moteur de
 * trésorerie, mais ne doivent pas déplacer un achat ancien dans le cycle pilotable.
 */
function corrigerReelPilotableDateAchat20260902_(base){
  const ops0=lireTable_('Operations')||[];
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'
    ?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  const charges=lireTable_('Charges_fixes')||[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  const liensCf=typeof construireLiensCfCertainsV377_==='function'
    ?construireLiensCfCertainsV377_(operations,charges,rapprochements):{};
  const maintenant=new Date();

  (Array.isArray(base.periodes)?base.periodes:[]).forEach(p=>{
    if(!p||typeof p!=='object')return;
    const env=Array.isArray(p.enveloppes)?p.enveloppes:[];
    const v=p.v37||(p.v37={});
    const debut=dateCockpit20260902_(p.periode&&p.periode.debut);
    const fin=dateCockpit20260902_(p.periode&&p.periode.fin);
    if(!debut||!fin)return;

    if(v.joker&&v.joker.actif)env.forEach(x=>x.prevu=Math.max(0,Number(x&&x.canon||0)));

    const cats=new Set(env.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
    const reelParCat={};
    operations.forEach(o=>{
      const montant=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim(),id=String(o&&o.id||'').trim();
      if(!Number.isFinite(montant)||montant>=0||!cats.has(cat))return;
      if((id&&liensCf[id])||String(o&&o.charge_fixe_id||'').trim())return;
      if(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o))return;
      const d=dateAchatCockpit20260902_(o);
      if(!d||d<debut||d>fin||d>maintenant)return;
      reelParCat[cat]=Number(reelParCat[cat]||0)+Math.abs(montant);
    });

    env.forEach(x=>{
      const cat=String(x&&x.categorie||'').trim();
      x.reelNetPrevisionnel=arrCockpit20260902_(Number(reelParCat[cat]||0));
      x.reelPilotableDepuisDebutCycle=x.reelNetPrevisionnel;
    });
  });
}

function dateAchatCockpit20260902_(o){
  let d=null;
  if(typeof dateAchatMetierBudgetSoft_==='function')d=dateAchatMetierBudgetSoft_(o);
  if(!d)d=dateCockpit20260902_(o&&o.date_achat);
  if(!d&&typeof dateOperationCouranteBudgetSoft_==='function')d=dateOperationCouranteBudgetSoft_(o);
  if(!d)d=dateCockpit20260902_(o&&(o.date||o.date_comptable));
  return d;
}
function dateCockpit20260902_(v){if(!v)return null;const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d)?null:d;}
function arrCockpit20260902_(n){return Math.round((Number(n)||0)*100)/100;}
function nombreCockpit20260902_(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function normaliserCibleCockpit20260902_(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s-]+/g,'_');}

function calculerBudgetPilotableInitial20260902_(p,base){
  const v=p&&p.v37||{},auditR=v.rt1Audit||{},auditCf=v.cft1Audit||{};
  const effets=Array.isArray(v.actionsEvenementsCycle)?v.actionsEvenementsCycle:[];
  const socle3723=nombreCockpit20260902_(auditR.socleCanonTerminal3723);
  const socle3716=nombreCockpit20260902_(auditR.socleCanonTerminal3716);
  const socleCanon=nombreCockpit20260902_(base&&base.recettesCanon&&base.recettesCanon.total);
  const socle=socle3723!=null?socle3723:(socle3716!=null?socle3716:(socleCanon!=null?socleCanon:Number(v.rt1||0)));
  const recettesCarte=nombreCockpit20260902_(auditR.recettesCarteTerminal3723);
  const recettesEffets=effets.reduce((s,x)=>normaliserCibleCockpit20260902_(x&&x.cible)==='recette'&&Number(x&&x.montantSigne||0)>0?s+Number(x.montantSigne):s,0);
  const recettesPlan=recettesCarte!=null?Math.max(0,recettesCarte):Math.max(0,recettesEffets);
  const recettesPrevisionnelles=Math.max(0,socle+recettesPlan);

  const cfReference=nombreCockpit20260902_(auditCf.reference);
  const cfBase=cfReference!=null?cfReference:Math.max(0,Number(v.chargesFixesTotal!=null?v.chargesFixesTotal:v.cft1||0));
  const effetCf=nombreCockpit20260902_(auditCf.effetNetCycle);
  const chargesFixesPrevisionnelles=Math.max(0,cfBase-(effetCf!=null?effetCf:0));

  let depensesAE=effets.reduce((s,x)=>{
    const cible=normaliserCibleCockpit20260902_(x&&x.cible),m=Number(x&&x.montantSigne||0);
    if(cible==='recette'||cible==='charge_fixe'||m>=0)return s;
    return s+Math.abs(m);
  },0);
  const hetPlan=nombreCockpit20260902_(v.het1Plan);
  if(depensesAE<.01&&hetPlan!=null)depensesAE=Math.max(0,hetPlan);
  depensesAE=arrCockpit20260902_(depensesAE);

  return {
    recettesPrevisionnelles:arrCockpit20260902_(recettesPrevisionnelles),
    chargesFixesPrevisionnelles:arrCockpit20260902_(chargesFixesPrevisionnelles),
    depensesPrevisionnellesActionsEvenements:depensesAE,
    budgetPilotableInitial:arrCockpit20260902_(Math.max(0,recettesPrevisionnelles-chargesFixesPrevisionnelles-depensesAE))
  };
}

function enrichirCycleCockpitCerbere20260902_(p,base){
  if(!p||typeof p!=='object')return;
  const v=p.v37||(p.v37={}),env=Array.isArray(p.enveloppes)?p.enveloppes:[];
  let p0=0,allocation=0,ret=0,dpt=0,consomme=0,plan=0,depassements=0;
  env.forEach(x=>{
    const canon=Math.max(0,Number(x&&x.canon||0));
    const a=Math.max(0,Number(x&&x.prevu||0));
    const reel=Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0)));
    const reserve=Math.max(0,Number(x&&x.planifie||0));
    const engage=reel+reserve;
    p0+=canon;allocation+=a;consomme+=reel;plan+=reserve;
    ret+=a-reel;
    dpt+=Math.max(a,engage);
    depassements+=Math.max(0,engage-a);
    x.engageV37=arrCockpit20260902_(engage);
    x.resteV37=arrCockpit20260902_(a-reel);
    x.dpt1=arrCockpit20260902_(Math.max(a,engage));
  });

  const initial=calculerBudgetPilotableInitial20260902_(p,base);
  const het=Math.max(0,Number(v.het1!=null?v.het1:(v.horsPilotableAControler||0)));
  const actualise=Math.max(0,Number(v.rt1||0)-Number(v.cft1||0)-het);
  const marge=actualise-allocation;
  const arr=arrCockpit20260902_;

  v.cockpit20260902={
    p0Total:arr(p0),
    p1Total:initial.budgetPilotableInitial,
    budgetPilotableInitial:initial.budgetPilotableInitial,
    budgetPilotableActualise:arr(actualise),
    budgetRepartiMolettes:arr(allocation),
    deltaActualisation:arr(actualise-initial.budgetPilotableInitial),
    detailInitial:initial,
    detailActualise:{recettesReevaluees:arr(v.rt1),chargesFixesReevaluees:arr(v.cft1),horsPilotableEtImprevus:arr(het)},
    consommePilotable:arr(consomme),reservePlan:arr(plan),ret1:arr(ret),dpt1:arr(dpt),depassements:arr(depassements),het1:arr(het),
    capacitePilotable:arr(actualise),margeARepartir:arr(marge),surplusVsP0:arr(initial.budgetPilotableInitial-p0),
    formuleInitiale:'P1 initial = recettes prévisionnelles - charges fixes prévisionnelles - dépenses prévisionnelles Actions/Événements',
    formuleActualisee:'Budget pilotable actualisé = Rt1 - CFt1 - HEt1 ; le Réel pilotable normal ne diminue pas cette capacité',
    formuleMarge:'Surplus / économies = budget pilotable actualisé - allocations des molettes',
    propositionProjetPossible:false,
    datePilotable:'date d’achat prioritaire ; date métier réelle en repli',
    jokerP0:!!(v.joker&&v.joker.actif)
  };
  v.ret1=arr(ret);v.dpt1=arr(dpt);v.disponibleEnveloppes=arr(ret);
  p.resteBudgetPilotable=arr(ret);p.budgetReparti=arr(allocation);
}

function appreciationCockpitCerbere20260902_(base){
  const p=Array.isArray(base&&base.periodes)?base.periodes[0]:null;
  if(!p)return{niveau:'vert',emoji:'🌤️',titre:'Situation à observer',resume:'Aucun cycle courant disponible.',consigne:''};
  const v=p.v37||{},c=v.cockpit20260902||{},env=Array.isArray(p.enveloppes)?p.enveloppes:[];
  const debut=new Date((p.periode||p).debut),fin=new Date((p.periode||p).fin),now=new Date();
  const total=Math.max(1,fin-debut),ratio=Math.max(0,Math.min(1,(now-debut)/total));
  const alertes=[];
  env.forEach(x=>{
    const allocation=Math.max(0,Number(x&&x.prevu||0));
    const reel=Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0)));
    if(!allocation&&reel<=0)return;
    const part=allocation>0?reel/allocation:1;
    const ecart=(part-ratio)*100;
    if(reel>allocation+.009)alertes.push({niveau:2,texte:String(x.categorie||'Poste')+' dépassé'});
    else if(ecart>25)alertes.push({niveau:2,texte:String(x.categorie||'Poste')+' très rapide'});
    else if(ecart>10)alertes.push({niveau:1,texte:String(x.categorie||'Poste')+' un peu rapide'});
  });
  if(Number(c.margeARepartir||0)<-.009)alertes.push({niveau:2,texte:'Économies à trouver : '+formatEuroCockpit20260902_(Math.abs(c.margeARepartir))});
  const niveau=Math.max(0,...alertes.map(x=>x.niveau));
  const info=alertes.sort((a,b)=>b.niveau-a.niveau)[0];
  if(niveau>=2)return{niveau:'rouge',emoji:'⛈️',titre:'Arbitrage nécessaire',resume:'Le cycle demande un ajustement du pilotable.',consigne:info?info.texte:''};
  if(niveau===1)return{niveau:'orange',emoji:'🌧️',titre:'Cap à surveiller',resume:'La situation reste récupérable, mais un poste mérite l’attention.',consigne:info?info.texte:''};
  const marge=Number(c.margeARepartir||0);
  return{niveau:'vert',emoji:'🌤️',titre:'Cap tenu',resume:'Le rythme du pilotable reste compatible avec le cycle.',consigne:marge>0?'Surplus à ventiler : '+formatEuroCockpit20260902_(marge):'Aucun arbitrage particulier à ce stade.'};
}

function auditerCockpitPilotable20260902(){
  const b=chargerCerbereCockpit20260902(),p=b&&b.periodes&&b.periodes[0],c=p&&p.v37&&p.v37.cockpit20260902;
  return {ok:!!p,periode:p&&p.periode,p0:c&&c.p0Total,p1Initial:c&&c.budgetPilotableInitial,pilotableActualise:c&&c.budgetPilotableActualise,repartiMolettes:c&&c.budgetRepartiMolettes,marge:c&&c.margeARepartir,detailInitial:c&&c.detailInitial,detailActualise:c&&c.detailActualise,reelPilotable:c&&c.consommePilotable,joker:c&&c.jokerP0,courses:(p&&p.enveloppes||[]).filter(x=>String(x.categorie||'')==='Courses').map(x=>({allocation:x.prevu,reel:x.reelNetPrevisionnel,reste:x.resteV37}))};
}

function formatEuroCockpit20260902_(n){return Utilities.formatString('%.2f €',Math.round((Number(n)||0)*100)/100);}
