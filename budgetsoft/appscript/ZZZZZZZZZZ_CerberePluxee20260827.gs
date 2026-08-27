const CERBERE_PLUXEE_20260827_VERSION='2026-08-27.1';
const CERBERE_PLUXEE_ENVELOPPE=154;

/**
 * Pilotage Pluxee indépendant de la trésorerie bancaire.
 * Doctrine :
 * - enveloppe théorique de cycle = 154 € à chaque rechargement ;
 * - le P0 de répartition vient du canon Cerbère (colonnes pluxee), aujourd'hui 94/60 ;
 * - les allocations locales Courses/Restaurants se partagent toujours les mêmes 154 € ;
 * - le solde théorique est 154 - dépenses réussies depuis le dernier rechargement ;
 * - le solde réel est celui du registre Pluxee et peut différer par reliquat antérieur ;
 * - aucun montant Pluxee ne modifie SHBt1 ni la trésorerie Hello bank.
 */
function chargerPluxeeCerbere20260827(){
  initialiserPluxee();
  const etat=chargerPluxee();
  const ops=(etat.operations||[]).filter(o=>String(o.statut||'valide').toLowerCase()!=='refuse');
  const recharges=ops.filter(o=>String(o.type||'').toLowerCase()==='rechargement'&&Number(o.montant)>0)
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
  const derniere=recharges.length?recharges[recharges.length-1]:null;
  const debut=derniere?new Date(derniere.date):null;
  const depenses=ops.filter(o=>{
    if(Number(o.montant)>=0)return false;
    const d=new Date(o.date);
    return !debut||(!isNaN(d)&&d>=debut);
  });
  const par={Courses:0,Restaurants:0,'À classer':0};
  depenses.forEach(o=>{
    const c=['Courses','Restaurants'].includes(String(o.categorie||''))?String(o.categorie):'À classer';
    par[c]+=Math.abs(Number(o.montant||0));
  });
  Object.keys(par).forEach(k=>par[k]=arrondirPluxee_(par[k]));
  const depenseCycle=arrondirPluxee_(Object.values(par).reduce((s,n)=>s+Number(n||0),0));
  const theorique=arrondirPluxee_(CERBERE_PLUXEE_ENVELOPPE-depenseCycle);
  const reel=arrondirPluxee_(Number(etat.solde||0));
  const canon=typeof chargerCanonCerbereV1==='function'?chargerCanonCerbereV1():{postes:[]};
  const p0={Courses:0,Restaurants:0};
  (canon.postes||[]).forEach(p=>{const c=String(p.categorie||'');if(Object.prototype.hasOwnProperty.call(p0,c))p0[c]=Math.max(0,Number(p.pluxee||0));});
  const sommeP0=p0.Courses+p0.Restaurants;
  if(Math.abs(sommeP0-CERBERE_PLUXEE_ENVELOPPE)>.009){
    if(sommeP0>0){p0.Courses=arrondirPluxee_(CERBERE_PLUXEE_ENVELOPPE*p0.Courses/sommeP0);p0.Restaurants=arrondirPluxee_(CERBERE_PLUXEE_ENVELOPPE-p0.Courses);}
    else{p0.Courses=94;p0.Restaurants=60;}
  }
  const cleCycle=debut?Utilities.formatDate(debut,Session.getScriptTimeZone(),'yyyy-MM-dd'):'sans-rechargement';
  const propKey='CERBERE_PLUXEE_ALLOC_'+cleCycle;
  let allocation=null;
  try{allocation=JSON.parse(PropertiesService.getDocumentProperties().getProperty(propKey)||'null');}catch(e){}
  if(!allocation||!Number.isFinite(Number(allocation.Courses))||!Number.isFinite(Number(allocation.Restaurants))||Math.abs(Number(allocation.Courses)+Number(allocation.Restaurants)-CERBERE_PLUXEE_ENVELOPPE)>.009){
    allocation={Courses:arrondirPluxee_(p0.Courses),Restaurants:arrondirPluxee_(p0.Restaurants)};
  }
  const reste={
    Courses:arrondirPluxee_(Number(allocation.Courses)-par.Courses),
    Restaurants:arrondirPluxee_(Number(allocation.Restaurants)-par.Restaurants)
  };
  return {
    ok:true,version:CERBERE_PLUXEE_20260827_VERSION,enveloppe:CERBERE_PLUXEE_ENVELOPPE,
    cycle:{cle:cleCycle,dateRecharge:cleCycle==='sans-rechargement'?null:cleCycle,montantRecharge:derniere?arrondirPluxee_(Number(derniere.montant||0)):null},
    p0,allocation,reelParCategorie:par,resteParCategorie:reste,depenseCycle,
    soldeTheorique:theorique,soldeReel:reel,ecartReelTheorique:arrondirPluxee_(reel-theorique),
    doctrine:'154 € communs aux deux molettes ; solde théorique de cycle distinct du solde réel de carte.'
  };
}

function sauvegarderAllocationPluxeeCerbere20260827(d){
  d=d||{};
  const c=arrondirPluxee_(Math.max(0,Number(d.Courses||0)));
  const r=arrondirPluxee_(Math.max(0,Number(d.Restaurants||0)));
  if(Math.abs(c+r-CERBERE_PLUXEE_ENVELOPPE)>.009)throw new Error('Les allocations Pluxee doivent totaliser exactement 154 €.');
  const etat=chargerPluxeeCerbere20260827();
  const key='CERBERE_PLUXEE_ALLOC_'+etat.cycle.cle;
  PropertiesService.getDocumentProperties().setProperty(key,JSON.stringify({Courses:c,Restaurants:r,date_validation:new Date().toISOString()}));
  return chargerPluxeeCerbere20260827();
}

function reinitialiserAllocationPluxeeCerbere20260827(){
  const etat=chargerPluxeeCerbere20260827();
  PropertiesService.getDocumentProperties().deleteProperty('CERBERE_PLUXEE_ALLOC_'+etat.cycle.cle);
  return chargerPluxeeCerbere20260827();
}

function auditerPluxeeCerbere20260827(){
  const e=chargerPluxeeCerbere20260827();
  const sommeAlloc=arrondirPluxee_(Number(e.allocation.Courses)+Number(e.allocation.Restaurants));
  const sommeReel=arrondirPluxee_(Number(e.reelParCategorie.Courses)+Number(e.reelParCategorie.Restaurants)+Number(e.reelParCategorie['À classer']));
  const ok=Math.abs(sommeAlloc-CERBERE_PLUXEE_ENVELOPPE)<.01&&Math.abs(sommeReel-e.depenseCycle)<.01;
  const out={ok,version:CERBERE_PLUXEE_20260827_VERSION,cycle:e.cycle,enveloppe:e.enveloppe,sommeAlloc,depenseCycle:e.depenseCycle,soldeTheorique:e.soldeTheorique,soldeReel:e.soldeReel,ecart:e.ecartReelTheorique,reelParCategorie:e.reelParCategorie};
  console.log(JSON.stringify(out));return out;
}
