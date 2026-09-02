const CERBERE_CONSOLIDATION_VERSION='1.0.1';

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
    dernier_calcul:p.getProperty('CERBERE_DERNIERE_RECALCUL')||'',
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

const CERBERE_COCKPIT_20260902_VERSION='2026-09-02.1';

/**
 * Couche d'orchestration du cockpit Cerbère.
 * Elle ne remplace aucun moteur métier : elle annote le résultat 3.7.23 avec
 * des dérivés simples destinés à l'UI.
 */
function chargerCerbereCockpit20260902(){
  const executer=function(){
    const base=chargerCerbereV374();
    if(!base||base.ok===false)return base;
    const periodes=Array.isArray(base.periodes)?base.periodes:[];
    periodes.forEach(enrichirCycleCockpitCerbere20260902_);
    base.cockpit20260902={
      version:CERBERE_COCKPIT_20260902_VERSION,
      appreciation:appreciationCockpitCerbere20260902_(base),
      doctrine:'P0 est la référence. P1 est le budget pilotable décidé pour le cycle. REt1 = P1 - consommé/réservé du cycle. La capacité pilotable économique exclut le solde bancaire d’ouverture et les CB héritées ; la trajectoire bancaire reste l’autorité du moteur de trésorerie.'
    };
    return serialiserCerberePourClient_(base);
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'
    ?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-20260902',executer)
    :executer();
}

function enrichirCycleCockpitCerbere20260902_(p){
  if(!p||typeof p!=='object')return;
  const v=p.v37||(p.v37={}),env=Array.isArray(p.enveloppes)?p.enveloppes:[];
  let p0=0,p1=0,ret=0,dpt=0,consomme=0,plan=0,depassements=0;
  env.forEach(x=>{
    const canon=Math.max(0,Number(x&&x.canon||0));
    const allocation=Math.max(0,Number(x&&x.prevu||0));
    const reel=Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0)));
    const reserve=Math.max(0,Number(x&&x.planifie||0));
    const engage=reel+reserve;
    p0+=canon;p1+=allocation;consomme+=reel;plan+=reserve;
    ret+=allocation-engage;
    dpt+=Math.max(allocation,engage);
    depassements+=Math.max(0,engage-allocation);
  });
  const het=Math.max(0,Number(v.het1!=null?v.het1:(v.horsPilotableAControler||0)));
  const capacite=Math.max(0,Number(v.rt1||0)-Number(v.cft1||0)-het);
  const marge=capacite-dpt;
  const arr=n=>Math.round((Number(n)||0)*100)/100;
  v.cockpit20260902={
    p0Total:arr(p0),p1Total:arr(p1),consommePilotable:arr(consomme),reservePlan:arr(plan),
    ret1:arr(ret),dpt1:arr(dpt),depassements:arr(depassements),het1:arr(het),
    capacitePilotable:arr(capacite),margeARepartir:arr(marge),surplusVsP0:arr(capacite-p0),
    formuleCapacite:'Capacité pilotable = Rt1 - CFt1 - HEt1',
    formuleRet1:'REt1 = P1 - réel pilotable - Plan réservé',
    propositionProjetPossible:capacite>p0+.009
  };
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
  if(Number(c.margeARepartir||0)<-.009)alertes.push({niveau:2,texte:'P1 à réduire de '+formatEuroCockpit20260902_(Math.abs(c.margeARepartir))});
  const niveau=Math.max(0,...alertes.map(x=>x.niveau));
  const info=alertes.sort((a,b)=>b.niveau-a.niveau)[0];
  if(niveau>=2)return{niveau:'rouge',emoji:'⛈️',titre:'Arbitrage nécessaire',resume:'Le cycle demande un ajustement du pilotable.',consigne:info?info.texte:''};
  if(niveau===1)return{niveau:'orange',emoji:'🌧️',titre:'Cap à surveiller',resume:'La situation reste récupérable, mais un poste mérite l’attention.',consigne:info?info.texte:''};
  const marge=Number(c.margeARepartir||0);
  return{niveau:'vert',emoji:'🌤️',titre:'Cap tenu',resume:'Le rythme du pilotable reste compatible avec le cycle.',consigne:marge>0?'Marge encore affectable : '+formatEuroCockpit20260902_(marge):'Aucun arbitrage particulier à ce stade.'};
}

function formatEuroCockpit20260902_(n){return Utilities.formatString('%.2f €',Math.round((Number(n)||0)*100)/100);}
