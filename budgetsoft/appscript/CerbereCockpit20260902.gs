const CERBERE_COCKPIT_20260902_VERSION='2026-09-02.1';

/**
 * Couche d'orchestration du cockpit Cerbère.
 * Elle ne remplace aucun moteur métier : elle annote le résultat 3.7.23 avec
 * des dérivés simples destinés à l'UI.
 *
 * Autorités conservées :
 * - P0/P1/réel pilotable : Cerbère + Operations ;
 * - R1 : canon recettes / Operations / Plan déjà consolidés par Cerbère ;
 * - CF1 : Charges_fixes + rapprochements communs déjà consolidés par Cerbère ;
 * - trésorerie bancaire : moteur TreasuryForecast (appelé séparément par l'UI) ;
 * - Pluxee : moteur Pluxee existant.
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
  // Capacité économique du cycle : les ressources du cycle après fixes et hors-pilotable.
  // On n'y injecte ni SS1 ni SHBt1 : les reports/décalages CB appartiennent à la banque.
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
