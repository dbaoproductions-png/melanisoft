/*
 * BudgetSoft — propriétaire canonique EP (Enveloppe Pilotable) — 2026-09-13.
 *
 * Doctrine :
 * - Pn = indicateur de soutenabilité, produit par le moteur comptable Cerbère ;
 * - EPn = décision de dépense, produite par les allocations des molettes ;
 * - avant toute décision locale, les allocations héritent de P0, donc EP=P0 ;
 * - les molettes ne modifient jamais P ;
 * - EP restant = EP - Réel pilotable engagé dans le cycle ;
 * - le prévisionnel bancaire consomme l'impact EP une seule fois, selon la date
 *   de débit : part immédiate avant la frontière, part CB différée dans C2.
 *
 * Une donnée, un propriétaire, un calcul, plusieurs consommateurs.
 */
const BUDGETSOFT_EP_20260913_VERSION='2026-09-25.1';
const BUDGETSOFT_EP_OWNER_20260913='BudgetSoftEnvelopePilotable20260913';

function arrEpBudgetSoft20260913_(n){return Math.round(Number(n||0)*100)/100;}
function dateEpBudgetSoft20260913_(v){const d=v instanceof Date?new Date(v):new Date(v||0);return isNaN(d.getTime())?null:d;}
function jourEpBudgetSoft20260913_(d){d=dateEpBudgetSoft20260913_(d);return d?Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000:NaN;}
function isoEpBudgetSoft20260913_(d){return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';}

function calculerEnvelopePilotableBudgetSoft20260913_(p){
  const env=Array.isArray(p&&p.enveloppes)?p.enveloppes:[];
  let p0=0,ep=0,consomme=0,plan=0,modifie=false;
  const lignes=env.map(x=>{
    const canon=Math.max(0,Number(x&&x.canon||0));
    const allocation=Math.max(0,Number(x&&x.prevu||0));
    const reel=Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0)));
    const reserve=Math.max(0,Number(x&&x.planifie||0));
    p0+=canon;ep+=allocation;consomme+=reel;plan+=reserve;
    if(Math.abs(allocation-canon)>.009)modifie=true;
    return{categorie:String(x&&x.categorie||''),p0:arrEpBudgetSoft20260913_(canon),allocation:arrEpBudgetSoft20260913_(allocation),reel:arrEpBudgetSoft20260913_(reel),reste:arrEpBudgetSoft20260913_(allocation-reel)};
  });
  p0=arrEpBudgetSoft20260913_(p0);ep=arrEpBudgetSoft20260913_(ep);consomme=arrEpBudgetSoft20260913_(consomme);plan=arrEpBudgetSoft20260913_(plan);
  return{ok:true,version:BUDGETSOFT_EP_20260913_VERSION,proprietaire:BUDGETSOFT_EP_OWNER_20260913,cle:String(p&&p.clePilotage||''),source:modifie?'molettes':'P0',p0:p0,total:ep,consomme:consomme,reste:arrEpBudgetSoft20260913_(ep-consomme),reservePlan:plan,lignes:lignes,doctrine:'EP = somme des allocations décidées ; sans modification des molettes, allocations=P0. EP ne modifie jamais P.'};
}

function enrichirEnvelopePilotableBudgetSoft20260913_(base){
  const ps=Array.isArray(base&&base.periodes)?base.periodes:[];
  ps.forEach((p,index)=>{
    if(!p)return;
    const ep=calculerEnvelopePilotableBudgetSoft20260913_(p),v=p.v37||(p.v37={}),c=v.cockpit20260902||(v.cockpit20260902={});
    const pSoutenable=Number(c.p1Total!=null?c.p1Total:(c.p1Cible!=null?c.p1Cible:0));
    const pDisponible=arrEpBudgetSoft20260913_(pSoutenable-ep.consomme);
    c.epTotal=ep.total;c.epConsomme=ep.consomme;c.epDisponible=ep.reste;c.epSource=ep.source;c.epP0=ep.p0;
    c.pSoutenable=arrEpBudgetSoft20260913_(pSoutenable);c.pDisponible=pDisponible;c.ecartEpP=arrEpBudgetSoft20260913_(ep.total-pSoutenable);c.budgetRepartiMolettes=ep.total;
    v.epTotal=ep.total;v.epConsomme=ep.consomme;v.epDisponible=ep.reste;v.epSource=ep.source;
    p.enveloppePilotable=ep;p.resteBudgetAlloue=ep.reste;p.budgetReparti=ep.total;
    if(index===0){base.diagnostic=base.diagnostic||{};base.diagnostic.enveloppePilotable20260913={version:BUDGETSOFT_EP_20260913_VERSION,proprietaire:BUDGETSOFT_EP_OWNER_20260913,ep:ep.total,epDisponible:ep.reste,consomme:ep.consomme,p1:arrEpBudgetSoft20260913_(pSoutenable),p1Disponible:pDisponible,ecartEpP1:arrEpBudgetSoft20260913_(ep.total-pSoutenable),source:ep.source,sansRecalculP:true};}
  });
  return base;
}

function operationPilotableEpBudgetSoft20260913_(o,categories,liensCf){
  const m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim(),id=String(o&&o.id||'').trim();
  if(!Number.isFinite(m)||m>=0||!categories.has(cat))return false;
  if(String(o&&o.charge_fixe_id||'').trim()||(id&&liensCf&&liensCf[id]))return false;
  if(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o))return false;
  return true;
}

function calculerProfilPaiementEpBudgetSoft20260913_(p,operations,reference){
  const env=Array.isArray(p&&p.enveloppes)?p.enveloppes:[],cats=new Set(env.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
  const periode=p&&p.periode||p||{},debut=dateEpBudgetSoft20260913_(periode.debut),fin=dateEpBudgetSoft20260913_(periode.fin),ref=dateEpBudgetSoft20260913_(reference)||new Date();
  const ops0=Array.isArray(operations)?operations:(typeof lireTable_==='function'?(lireTable_('Operations')||[]):[]),ops=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  let liensCf={};try{const charges=typeof lireTable_==='function'?(lireTable_('Charges_fixes')||[]):[],rap=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];if(typeof construireLiensCfCertainsV377_==='function')liensCf=construireLiensCfCertainsV377_(ops,charges,rap)||{};}catch(e){liensCf={};}
  const mesurer=(a,z)=>{let total=0,carte=0,n=0,nCarte=0;(ops||[]).forEach(o=>{if(!operationPilotableEpBudgetSoft20260913_(o,cats,liensCf))return;const estCb=typeof estAchatCbDoubleRole20260905_==='function'?estAchatCbDoubleRole20260905_(o):!!(String(o&&o.carte_fin||'').trim()||String(o&&o.date_achat||'').trim());let d=null;if(estCb&&typeof dateAchatCbDoubleRole20260905_==='function')d=dateAchatCbDoubleRole20260905_(o);if(!d&&typeof dateAchatCockpit20260902_==='function')d=dateAchatCockpit20260902_(o);if(!d)d=dateEpBudgetSoft20260913_(o&&o.date_achat||o&&o.date_comptable||o&&o.date);if(!d||d<a||d>z||d>ref)return;const x=Math.abs(Number(o.montant||0));total+=x;n++;if(estCb){carte+=x;nCarte++;}});return{total:arrEpBudgetSoft20260913_(total),carte:arrEpBudgetSoft20260913_(carte),nombre:n,nombreCarte:nCarte};};
  let echantillon=(debut&&fin)?mesurer(debut,fin):{total:0,carte:0,nombre:0,nombreCarte:0},source='cycle_courant';
  if(echantillon.total<300||echantillon.nombre<5){const z=new Date(ref),a=new Date(ref);a.setDate(a.getDate()-180);echantillon=mesurer(a,z);source='historique_180j';}
  let tauxCarte=echantillon.total>0?echantillon.carte/echantillon.total:.95;if(!Number.isFinite(tauxCarte)||tauxCarte<0||tauxCarte>1)tauxCarte=.95;const fallback=echantillon.total<100||echantillon.nombre<3;if(fallback)tauxCarte=.95;
  let prochaineDebit=null;try{if(typeof prochaineDateDebitCbTresorerie20260901_==='function')prochaineDebit=prochaineDateDebitCbTresorerie20260901_(ref);}catch(e){}
  let fractionCarteVersCycleSuivant=1;if(fin&&prochaineDebit&&prochaineDebit<=fin){const joursRestants=Math.max(1,Math.round(jourEpBudgetSoft20260913_(fin)-jourEpBudgetSoft20260913_(ref))+1),apres=Math.max(0,Math.round(jourEpBudgetSoft20260913_(fin)-jourEpBudgetSoft20260913_(prochaineDebit)));fractionCarteVersCycleSuivant=Math.max(0,Math.min(1,apres/joursRestants));}
  const tauxDiffere=Math.max(0,Math.min(1,tauxCarte*fractionCarteVersCycleSuivant));
  return{version:BUDGETSOFT_EP_20260913_VERSION,source:source,fallback95:fallback,echantillon:echantillon,tauxCarte:arrEpBudgetSoft20260913_(tauxCarte*100)/100,tauxCartePct:arrEpBudgetSoft20260913_(tauxCarte*100),fractionCarteVersCycleSuivant:arrEpBudgetSoft20260913_(fractionCarteVersCycleSuivant),tauxDiffere:arrEpBudgetSoft20260913_(tauxDiffere*100)/100,tauxDifferePct:arrEpBudgetSoft20260913_(tauxDiffere*100),prochaineDateDebit:prochaineDebit?isoEpBudgetSoft20260913_(prochaineDebit):'',doctrine:'taux mesuré sur le Réel pilotable ; estimation uniquement sur la part EP non encore consommée'};
}

const BUDGETSOFT_EP_TAUX_CB_CANONIQUE_20260925=0.90;

function calculerImpactPrevisionnelEpBudgetSoft20260913_(p,operations,reference){
  const ep=calculerEnvelopePilotableBudgetSoft20260913_(p);
  const resteAEngager=Math.max(0,Number(ep.reste||0));
  const profil=calculerProfilPaiementEpBudgetSoft20260913_(p,operations,reference);
  const taux=BUDGETSOFT_EP_TAUX_CB_CANONIQUE_20260925;
  const differe=arrEpBudgetSoft20260913_(resteAEngager*taux);
  const immediat=arrEpBudgetSoft20260913_(resteAEngager-differe);
  const periode=p&&p.periode||p||{},fin=dateEpBudgetSoft20260913_(periode.fin),ref=dateEpBudgetSoft20260913_(reference)||new Date();
  let debit=null;try{if(typeof prochaineDateDebitCbTresorerie20260901_==='function')debit=prochaineDateDebitCbTresorerie20260901_(ref);}catch(e){}
  return{
    ok:true,version:'2026-09-25.1',ep:ep.total,consomme:ep.consomme,
    resteAEngager:arrEpBudgetSoft20260913_(resteAEngager),
    immediat:immediat,differe:differe,tauxDifferePct:90,
    tauxObservePct:Number(profil&&profil.tauxCartePct||0),
    profil:profil,
    dateImmediat:fin?isoEpBudgetSoft20260913_(fin):'',
    dateDiffere:debit?isoEpBudgetSoft20260913_(debit):'',
    reconciliation:arrEpBudgetSoft20260913_(immediat+differe-resteAEngager),
    doctrine:'EP restant = EP décidé - Réel pilotable. 90 % du reliquat est projeté en CB différée hors charges fixes ; 10 % reste en paiement non différé. Le taux observé reste diagnostic, pas moteur.'
  };
}

function etatEnvelopePilotableDepuisCockpitBudgetSoft20260913_(cerbere){
  if(!cerbere||cerbere.ok===false)return cerbere||{ok:false};
  enrichirEnvelopePilotableBudgetSoft20260913_(cerbere);
  const ps=Array.isArray(cerbere.periodes)?cerbere.periodes:[];
  const extraire=p=>{if(!p)return null;const v=p.v37||{},c=v.cockpit20260902||{},ep=p.enveloppePilotable||calculerEnvelopePilotableBudgetSoft20260913_(p),ss=Number(v.ss1);return{cle:String(p.clePilotage||''),ep:Number(ep.total||0),epDisponible:Number(ep.reste||0),epConsomme:Number(ep.consomme||0),epSource:String(ep.source||''),p:Number(c.pSoutenable!=null?c.pSoutenable:(c.p1Total||0)),pDisponible:Number(c.pDisponible!=null?c.pDisponible:(Number(c.p1Total||0)-Number(ep.consomme||0))),ecartEpP:Number(c.ecartEpP||0),soldeInitialReference:Number.isFinite(ss)?arrEpBudgetSoft20260913_(ss):null,soldeInitialSource:String(v.ss1Statut||'frontière Cerbère · avant salaire')};};
  return{ok:true,version:BUDGETSOFT_EP_20260913_VERSION,proprietaire:BUDGETSOFT_EP_OWNER_20260913,courant:extraire(ps[0]),suivant:extraire(ps[1])};
}

function chargerEtatEnvelopePilotableBudgetSoft20260913(){return etatEnvelopePilotableDepuisCockpitBudgetSoft20260913_(chargerCerbereCockpit20260902());}


/**
 * Audit doctrinal CB / pilotable — 2026-09-25.
 *
 * Deux ratios distincts sont mesurés :
 *  A = CB pilotable / dépenses pilotables : ratio utile pour transformer
 *      un EP restant en prévision de CB différée.
 *  B = CB pilotable / toutes les CB hors charges fixes : décrit la composition
 *      des CB, mais ne permet pas à lui seul de prévoir les CB depuis l'EP.
 */
function auditerRatioCbPilotableBudgetSoft20260925(){
  const operations=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];
  const ops=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(operations):operations;
  const charges=typeof lireTable_==='function'?(lireTable_('Charges_fixes')||[]):[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  const liensCf=typeof construireLiensChargesFixesCommuns_==='function'?construireLiensChargesFixesCommuns_(ops,charges,rapprochements):{};
  const cer=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;
  const p1=cer&&Array.isArray(cer.periodes)?cer.periodes[0]:null;
  const env=Array.isArray(p1&&p1.enveloppes)?p1.enveloppes:[];
  const cats=new Set(env.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
  const periode=p1&&p1.periode||p1||{};
  const debut=dateEpBudgetSoft20260913_(periode.debut),fin=dateEpBudgetSoft20260913_(periode.fin),ref=new Date();

  function estCb_(o){
    if(typeof estAchatCbDoubleRole20260905_==='function')return !!estAchatCbDoubleRole20260905_(o);
    return !!(String(o&&o.carte_fin||'').trim()||String(o&&o.date_achat||'').trim());
  }
  function dateAchat_(o){
    let d=null;
    if(estCb_(o)&&typeof dateAchatCbDoubleRole20260905_==='function')d=dateAchatCbDoubleRole20260905_(o);
    if(!d&&typeof dateAchatCockpit20260902_==='function')d=dateAchatCockpit20260902_(o);
    if(!d)d=dateEpBudgetSoft20260913_(o&&o.date_achat||o&&o.date_comptable||o&&o.date);
    return d;
  }
  function mesurer_(a,z){
    let pilotableTotal=0,pilotableCb=0,cbHorsCf=0,cbCf=0,nPilotable=0,nPilotableCb=0,nCbHorsCf=0;
    (ops||[]).forEach(o=>{
      const m=Number(o&&o.montant||0);if(!(m<0))return;
      const d=dateAchat_(o);if(!d||d<a||d>z||d>ref)return;
      const id=String(o&&o.id||'').trim(),estCf=!!String(o&&o.charge_fixe_id||'').trim()||!!(id&&liensCf[id]);
      const cb=estCb_(o),cat=String(o&&o.categorie||'').trim();
      const pilotable=cats.has(cat)&&!estCf&&!(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o));
      const x=Math.abs(m);
      if(pilotable){pilotableTotal+=x;nPilotable++;if(cb){pilotableCb+=x;nPilotableCb++;}}
      if(cb){if(estCf)cbCf+=x;else{cbHorsCf+=x;nCbHorsCf++;}}
    });
    const ratioCbDansPilotable=pilotableTotal>0?pilotableCb/pilotableTotal:null;
    const ratioPilotableDansCb=cbHorsCf>0?pilotableCb/cbHorsCf:null;
    return{
      pilotableTotal:arrEpBudgetSoft20260913_(pilotableTotal),
      pilotableCb:arrEpBudgetSoft20260913_(pilotableCb),
      cbHorsChargesFixes:arrEpBudgetSoft20260913_(cbHorsCf),
      cbChargesFixes:arrEpBudgetSoft20260913_(cbCf),
      nombrePilotable:nPilotable,nombrePilotableCb:nPilotableCb,nombreCbHorsChargesFixes:nCbHorsCf,
      ratioCbDansPilotablePct:ratioCbDansPilotable===null?null:arrEpBudgetSoft20260913_(ratioCbDansPilotable*100),
      ratioPilotableDansCbPct:ratioPilotableDansCb===null?null:arrEpBudgetSoft20260913_(ratioPilotableDansCb*100)
    };
  }

  const histDeb=new Date(ref);histDeb.setDate(histDeb.getDate()-180);histDeb.setHours(0,0,0,0);
  const courant=debut&&fin?mesurer_(debut,fin):null,historique180j=mesurer_(histDeb,ref);
  const utile=historique180j&&historique180j.ratioCbDansPilotablePct;
  const out={
    ok:true,lectureSeule:true,version:'2026-09-25.1',
    periodeCourante:{debut:debut?isoEpBudgetSoft20260913_(debut):'',fin:fin?isoEpBudgetSoft20260913_(fin):'',mesure:courant},
    historique180j:historique180j,
    doctrine:{
      ratioPourPrevoirDepuisEp:'CB pilotable / dépenses pilotables',
      ratioCompositionCb:'CB pilotable / toutes CB hors charges fixes',
      precision:'Pour projeter les CB depuis l’EP restant, seul le premier ratio est causalement utilisable dans la formule.'
    },
    proposition90:{
      ratioMesurePct:utile,
      ecartPoints:utile===null?null:arrEpBudgetSoft20260913_(utile-90),
      suffisammentProche:utile!==null&&Math.abs(utile-90)<=5
    }
  };
  console.log('[AUDIT RATIO CB PILOTABLE 20260925] '+JSON.stringify(out));return out;
}
