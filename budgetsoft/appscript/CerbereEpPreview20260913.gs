/*
 * Cerbère — simulation non persistée de l'impact d'une décision EP courante.
 *
 * Doctrine :
 * - aucune écriture, aucune mutation du propriétaire EP ;
 * - P1 reste inchangé : une variation d'EP1 n'entre jamais dans P1 ;
 * - le brouillon EP1 est injecté dans une copie du cockpit final ;
 * - l'impact bancaire est recalculé par le moteur canonique de trésorerie ;
 * - C2 est recalculé par le propriétaire du report CB (connu + part EP différée).
 *
 * Une donnée, un propriétaire, un calcul, plusieurs consommateurs.
 */
const CERBERE_EP_PREVIEW_20260913_VERSION='2026-09-13.3';

function arrCerbereEpPreview20260913_(n){return Math.round(Number(n||0)*100)/100;}
function dateCerbereEpPreview20260913_(v){const d=v instanceof Date?new Date(v):new Date(v||0);return isNaN(d.getTime())?null:d;}
function isoCerbereEpPreview20260913_(v){const d=dateCerbereEpPreview20260913_(v);return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';}
function milieuCerbereEpPreview20260913_(a,b){a=dateCerbereEpPreview20260913_(a);b=dateCerbereEpPreview20260913_(b);return a&&b?new Date((a.getTime()+b.getTime())/2):null;}
function cloneCerbereEpPreview20260913_(o){return JSON.parse(JSON.stringify(o||{}));}

function pointTrajectoireCerbereEpPreview20260913_(projection,dateCible){
  if(!projection||projection.ok===false)return null;
  const cible=isoCerbereEpPreview20260913_(dateCible),ref=isoCerbereEpPreview20260913_(projection.dateReference),base=Number(projection.soldeReel);
  if(!cible||!ref||!Number.isFinite(base))return null;
  let delta=0;(projection.lignes||[]).forEach(l=>{const j=isoCerbereEpPreview20260913_(l&&l.date),m=Number(l&&l.montantSigne);if(j&&j>ref&&j<=cible&&Number.isFinite(m))delta+=m;});
  return arrCerbereEpPreview20260913_(base+delta);
}

function appliquerBrouillonEpCerberePreview20260913_(p,postes){
  const env=Array.isArray(p&&p.enveloppes)?p.enveloppes:[],map={};
  (Array.isArray(postes)?postes:[]).forEach(x=>{const k=String(x&&x.categorie||'').trim();if(k)map[k]=Math.max(0,Number(x&&x.montant||0));});
  env.forEach(x=>{const k=String(x&&x.categorie||'').trim();if(Object.prototype.hasOwnProperty.call(map,k))x.prevu=map[k];});
  return p;
}

function extraireP2CerbereEpPreview20260913_(base){
  const p=base&&Array.isArray(base.periodes)?base.periodes[1]:null,v=p&&p.v37||{},c=v.cockpit20260902||{},ss=Number(v.ss1);
  return{
    p2:arrCerbereEpPreview20260913_(Number(c.pSoutenable!=null?c.pSoutenable:c.p1Total||0)),
    p2Disponible:arrCerbereEpPreview20260913_(Number(c.pDisponible!=null?c.pDisponible:c.ret1||0)),
    reportCbCycle:arrCerbereEpPreview20260913_(Number(c.reportCbCycle!=null?c.reportCbCycle:v.reportCbCycle||0)),
    cbDejaEngagee:arrCerbereEpPreview20260913_(Number(c.cbDejaEngagee!=null?c.cbDejaEngagee:v.cbDejaEngagee||0)),
    cbEpEstimee:arrCerbereEpPreview20260913_(Number(c.cbEpEstimee!=null?c.cbEpEstimee:v.cbEpEstimee||0)),
    p2AvantReport:arrCerbereEpPreview20260913_(Number(c.p1AvantReportCb!=null?c.p1AvantReportCb:v.p1AvantReportCb||0)),
    soldeInitialReference:Number.isFinite(ss)?arrCerbereEpPreview20260913_(ss):null,
    soldeInitialSource:String(v.ss1Statut||'frontière Cerbère · avant salaire')
  };
}

function simulerImpactEpCerbere20260913(d){
  d=d||{};
  const original=chargerCerbereCockpit20260902();
  if(!original||original.ok===false)return{ok:false,version:CERBERE_EP_PREVIEW_20260913_VERSION,erreur:'Cockpit Cerbère indisponible.'};
  const ps0=Array.isArray(original.periodes)?original.periodes:[],courant0=ps0[0],suivant0=ps0[1];
  if(!courant0||!suivant0)return{ok:false,version:CERBERE_EP_PREVIEW_20260913_VERSION,erreur:'Deux cycles Cerbère sont nécessaires.'};
  const cle=String(d.cle||'').trim();
  if(cle&&cle!==String(courant0.clePilotage||''))return{ok:false,version:CERBERE_EP_PREVIEW_20260913_VERSION,erreur:'La simulation intercycle est réservée au cycle courant.',horizon:'C1→C2'};

  const epAvant=calculerEnvelopePilotableBudgetSoft20260913_(courant0),p2Avant=extraireP2CerbereEpPreview20260913_(original);
  const base=cloneCerbereEpPreview20260913_(original),ps=base.periodes||[],courant=ps[0],suivant=ps[1];
  appliquerBrouillonEpCerberePreview20260913_(courant,d.postes||[]);
  if(typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')enrichirEnvelopePilotableBudgetSoft20260913_(base);
  const epApres=calculerEnvelopePilotableBudgetSoft20260913_(courant);
  if(typeof appliquerReportCbCycleSuivant20260905_==='function')appliquerReportCbCycleSuivant20260905_(base);
  const p2Apres=extraireP2CerbereEpPreview20260913_(base);

  const debut1=isoCerbereEpPreview20260913_(courant.periode&&courant.periode.debut),milieu1=isoCerbereEpPreview20260913_(milieuCerbereEpPreview20260913_(courant.periode&&courant.periode.debut,courant.periode&&courant.periode.fin)),fin1=isoCerbereEpPreview20260913_(courant.periode&&courant.periode.fin);
  const debut2=isoCerbereEpPreview20260913_(suivant.periode&&suivant.periode.debut),milieu2=isoCerbereEpPreview20260913_(milieuCerbereEpPreview20260913_(suivant.periode&&suivant.periode.debut,suivant.periode&&suivant.periode.fin)),fin2=isoCerbereEpPreview20260913_(suivant.periode&&suivant.periode.fin);
  const projection=chargerTresoreriePrevisionnelle20260901(fin2,base);
  if(!projection||projection.ok===false)return{ok:false,version:CERBERE_EP_PREVIEW_20260913_VERSION,erreur:'Projection canonique indisponible.'};

  const soldesParDate={};[debut1,milieu1,fin1,debut2,milieu2,fin2].filter(Boolean).forEach(j=>soldesParDate[j]=pointTrajectoireCerbereEpPreview20260913_(projection,j));
  const ops=lireTable_('Operations')||[],reference=new Date(projection.dateReference||new Date());
  let impactAvant={resteAEngager:0,immediat:0,differe:0,tauxDifferePct:0},impact={resteAEngager:0,immediat:0,differe:0,tauxDifferePct:0};
  try{impactAvant=calculerImpactPrevisionnelEpBudgetSoft20260913_(courant0,ops,reference)||impactAvant;}catch(e){}
  try{impact=calculerImpactPrevisionnelEpBudgetSoft20260913_(courant,ops,reference)||impact;}catch(e){}
  const deltaImmediat=arrCerbereEpPreview20260913_(Number(impact.immediat||0)-Number(impactAvant.immediat||0));
  if(Number.isFinite(Number(p2Avant.soldeInitialReference)))p2Apres.soldeInitialReference=arrCerbereEpPreview20260913_(Number(p2Avant.soldeInitialReference)-deltaImmediat);

  let baseCanon=null;try{baseCanon=chargerTresorerieUnifieeBudgetSoft20260907(fin2);}catch(e){}
  const soldeFin2Avant=baseCanon&&baseCanon.ok?pointTrajectoireCerbereEpPreview20260913_(baseCanon,fin2):null,soldeFin1Avant=baseCanon&&baseCanon.ok?pointTrajectoireCerbereEpPreview20260913_(baseCanon,fin1):null;
  const soldeFin1Apres=soldesParDate[fin1],soldeFin2Apres=soldesParDate[fin2];

  const out={
    ok:true,version:CERBERE_EP_PREVIEW_20260913_VERSION,mode:'simulation_non_persistée',proprietaireEp:BUDGETSOFT_EP_OWNER_20260913,proprietaireTresorerie:'chargerTresoreriePrevisionnelle20260901',cle:String(courant.clePilotage||''),
    ep:{avant:epAvant.total,apres:epApres.total,delta:arrCerbereEpPreview20260913_(epApres.total-epAvant.total),consomme:epApres.consomme,reste:epApres.reste},
    impact:{resteAEngager:arrCerbereEpPreview20260913_(impact.resteAEngager||0),immediat:arrCerbereEpPreview20260913_(impact.immediat||0),differe:arrCerbereEpPreview20260913_(impact.differe||0),tauxDifferePct:Number(impact.tauxDifferePct||0),deltaImmediat:deltaImmediat},
    cycleSuivant:Object.assign({},p2Apres,{deltaReportCb:arrCerbereEpPreview20260913_(p2Apres.reportCbCycle-p2Avant.reportCbCycle),deltaP2:arrCerbereEpPreview20260913_(p2Apres.p2-p2Avant.p2),deltaSoldeInitialReference:Number.isFinite(Number(p2Avant.soldeInitialReference))?arrCerbereEpPreview20260913_(Number(p2Apres.soldeInitialReference)-Number(p2Avant.soldeInitialReference)):null}),
    soldesParDate:soldesParDate,
    soldes:{finC1:soldeFin1Apres,finC2:soldeFin2Apres,deltaFinC1:Number.isFinite(soldeFin1Avant)?arrCerbereEpPreview20260913_(soldeFin1Apres-soldeFin1Avant):null,deltaFinC2:Number.isFinite(soldeFin2Avant)?arrCerbereEpPreview20260913_(soldeFin2Apres-soldeFin2Avant):null},
    dates:{debutC1:debut1,milieuC1:milieu1,finC1:fin1,debutC2:debut2,milieuC2:milieu2,finC2:fin2},
    doctrine:'Une hausse d’EP1 ne modifie pas P1. Elle augmente la part EP restant à engager : part immédiate sur C1 et part CB différée sur C2 ; cette dernière réduit P2 via le report CB. Le solde initial de référence C2 reste une frontière avant salaire, symétrique de C1.'
  };
  console.log('[SIMULATION EP Cerbère] '+JSON.stringify(out));return out;
}

function auditerSimulationEpCerbere20260913(){
  const c=chargerCerbereCockpit20260902(),p=c&&c.periodes&&c.periodes[0];if(!p)return{ok:false,erreur:'C1 absent'};
  const postes=(p.enveloppes||[]).map(x=>({categorie:String(x&&x.categorie||'').trim(),montant:Number(x&&x.prevu||0)})),i=postes.findIndex(x=>x.categorie);
  if(i<0){const out={ok:false,version:CERBERE_EP_PREVIEW_20260913_VERSION,erreur:'Aucune catégorie EP pilotable identifiable pour le stimulus +50.'};console.log('[AUDIT Simulation EP Cerbère] '+JSON.stringify(out));return out;}
  const categorieTest=postes[i].categorie,avantCategorie=Number(postes[i].montant||0);postes[i].montant=avantCategorie+50;
  const r=simulerImpactEpCerbere20260913({cle:p.clePilotage,postes:postes});
  const checks={deltaEp50:!!(r&&r.ok&&Math.abs(Number(r.ep&&r.ep.delta||0)-50)<.01),reportC2Augmente:!!(r&&r.ok&&Number(r.cycleSuivant&&r.cycleSuivant.deltaReportCb||0)>0),p2Baisse:!!(r&&r.ok&&Number(r.cycleSuivant&&r.cycleSuivant.deltaP2||0)<0),finC2Baisse:!!(r&&r.ok&&Number(r.soldes&&r.soldes.deltaFinC2||0)<0),soldeInitialC2AvantSalaire:!!(r&&r.ok&&Number.isFinite(Number(r.cycleSuivant&&r.cycleSuivant.soldeInitialReference)))};
  const out={ok:Object.values(checks).every(Boolean),version:CERBERE_EP_PREVIEW_20260913_VERSION,stimulus:{categorie:categorieTest,avant:avantCategorie,apres:avantCategorie+50,delta:50},checks:checks,simulation:r};
  console.log('[AUDIT Simulation EP Cerbère] '+JSON.stringify(out));return out;
}
