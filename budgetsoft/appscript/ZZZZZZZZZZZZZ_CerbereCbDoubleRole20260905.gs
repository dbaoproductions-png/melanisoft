/*
 * Cerbère — doctrine CB différée, double rôle (2026-09-05).
 * 1) La dépense est imputée au pilotable par date d'achat dans C1.
 * 2) Les achats CB du mois de débit à venir réduisent aussi le P1 global de C2,
 *    cycle où le débit différé sera supporté.
 *
 * On ne réinjecte PAS ces CB dans les molettes de C2 : elles ont déjà joué leur
 * rôle analytique dans C1. C2 ne reçoit que leur impact global de trésorerie.
 */
const CERBERE_CB_DOUBLE_ROLE_VERSION='2026-09-05.6';

function dateAchatCbDoubleRole20260905_(o){
  const lib=String(o&&o.libelle_bancaire||o&&o.libelle||'');
  let m=lib.match(/\b(?:paiement\s+)?(?:cb|carte)\s+du\s+(\d{2})[\s\/.-]?(\d{2})[\s\/.-]?(\d{2,4})\b/i);
  if(!m)m=lib.match(/\bdu\s+(\d{2})(\d{2})(\d{2})\b/i);
  if(m){
    let y=Number(m[3]);if(y<100)y+=2000;
    const x=new Date(y,Number(m[2])-1,Number(m[1]));
    if(!isNaN(x.getTime())&&x.getDate()===Number(m[1])&&x.getMonth()===Number(m[2])-1)return x;
  }
  let d=dateValideVentilationBudgetSoft_(o&&o.date_achat);
  if(d)return d;
  try{if(typeof dateAchatMetierBudgetSoft_==='function')d=dateAchatMetierBudgetSoft_(o);}catch(e){}
  return d||null;
}

function estAchatCbDoubleRole20260905_(o){
  if(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o))return false;
  const lib=String(o&&o.libelle_bancaire||o&&o.libelle||'');
  const src=String(o&&o.source_bancaire||'');
  const com=String(o&&o.commentaire||'');
  if(String(o&&o.carte_fin||'').trim())return true;
  if(String(o&&o.date_achat||'').trim())return true;
  if(/\b(?:PAIEMENT\s+)?(?:CB|CARTE)\b/i.test(lib))return true;
  if(/\b(?:CB|CARTE)\b/i.test(src+' '+com))return true;
  if(/\b\d{4}x{4,}\d{4}\b/i.test(lib))return true;
  return false;
}

function calculerReportCbCycleSuivant20260905_(base){
  const ps=Array.isArray(base&&base.periodes)?base.periodes:[];
  if(ps.length<2)return{montant:0,lignes:[],diagnostic:{raison:'moins de deux périodes'}};
  const p1=ps[0]&&ps[0].periode||{},p2=ps[1]&&ps[1].periode||{};
  const d12=dateValideVentilationBudgetSoft_(p1.fin),d21=dateValideVentilationBudgetSoft_(p2.debut),d22=dateValideVentilationBudgetSoft_(p2.fin);
  if(!d12||!d21||!d22)return{montant:0,lignes:[],diagnostic:{raison:'bornes C1/C2 invalides',p1:p1,p2:p2}};
  const lireDirect=typeof lireTableDirecteBudgetSoft20260905_==='function'?lireTableDirecteBudgetSoft20260905_:lireTable_;
  const ops=lireDirect('Operations')||[];
  const now=new Date(),lignes=[];let total=0;
  const diag={operations:ops.length,depenses:0,cbDetectees:0,avecDateAchat:0,dansFenetre:0,rejetsTechnique:0};
  const jour=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
  const z1=jour(d12),tn=jour(now);
  /* Doctrine validée : pour C2 28/09 -> 27/10, le report porte sur les achats
   * CB du mois de septembre, donc à partir du 01/09, et non sur les achats du
   * 28/08 déjà rattachés au débit d'août. */
  const debutCb=new Date(d21.getFullYear(),d21.getMonth(),1),aCb=jour(debutCb);
  const impactCycle2=d21,a2=jour(d21),z2=jour(d22);

  (ops||[]).forEach(o=>{
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||m>=0)return;diag.depenses++;
    if(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o)){diag.rejetsTechnique++;return;}
    if(!estAchatCbDoubleRole20260905_(o))return;diag.cbDetectees++;
    const da=dateAchatCbDoubleRole20260905_(o);if(!da)return;diag.avecDateAchat++;
    const ta=jour(da);if(ta<aCb||ta>z1||ta>tn)return;diag.dansFenetre++;
    const ti=jour(impactCycle2);if(ti<a2||ti>z2)return;
    const a=Math.abs(m);total+=a;lignes.push({id:String(o&&o.id||''),categorie:String(o&&o.categorie||''),montant:Math.round(a*100)/100,dateAchat:Utilities.formatDate(da,Session.getScriptTimeZone(),'yyyy-MM-dd'),dateImpact:Utilities.formatDate(impactCycle2,Session.getScriptTimeZone(),'yyyy-MM-dd'),dateComptable:String(o&&o.date_comptable||''),carteFin:String(o&&o.carte_fin||''),libelle:String(o&&o.libelle_bancaire||o&&o.libelle||'')});
  });
  return{montant:Math.round(total*100)/100,lignes,debutFenetre:Utilities.formatDate(debutCb,Session.getScriptTimeZone(),'yyyy-MM-dd'),dateImpact:Utilities.formatDate(impactCycle2,Session.getScriptTimeZone(),'yyyy-MM-dd'),diagnostic:diag};
}

function appliquerReportCbCycleSuivant20260905_(base){
  const ps=Array.isArray(base&&base.periodes)?base.periodes:[];if(ps.length<2)return base;
  const calc=calculerReportCbCycleSuivant20260905_(base),report=Math.max(0,Number(calc.montant||0)),p=ps[1],v=p.v37||(p.v37={}),c=v.cockpit20260902||(v.cockpit20260902={});
  const avant=Math.max(0,Number(c.p1AvantReportCb!=null?c.p1AvantReportCb:(c.p1Total!=null?c.p1Total:(c.p1Cible!=null?c.p1Cible:(p.budgetReparti!=null?p.budgetReparti:0)))));
  const apres=Math.max(0,Math.round((avant-report)*100)/100),cons=Math.max(0,Number(c.consommePilotable||0)),rep=Math.max(0,Number(c.budgetRepartiMolettes!=null?c.budgetRepartiMolettes:(p.budgetReparti||0))),p0=Math.max(0,Number(c.p0Total||0));
  c.p1AvantReportCb=avant;c.reportCbCycle=report;c.cbDejaEngagee=report;c.p1Total=apres;c.p1Cible=apres;c.budgetPilotableActualise=apres;c.ret1=Math.round((apres-cons)*100)/100;c.surplusVsP0=Math.round((apres-p0)*100)/100;c.margeARepartir=Math.round((apres-rep)*100)/100;c.aRepartirDansPostes=c.margeARepartir;c.doctrineCb='CB : analytique par date achat dans C1 + impact global du mois CB suivant dans C2, sans double imputation par catégorie.';
  v.reportCbCycle=report;v.cbDejaEngagee=report;v.p1AvantReportCb=avant;v.p1ApresReportCb=apres;
  p.resteBudgetPilotable=c.ret1;p.resteBudgetAlloue=c.ret1;
  base.diagnostic=base.diagnostic||{};base.diagnostic.cbDoubleRole={version:CERBERE_CB_DOUBLE_ROLE_VERSION,montant:report,nombre:calc.lignes.length,debutFenetre:calc.debutFenetre,dateImpact:calc.dateImpact,selection:calc.diagnostic||{},lignes:calc.lignes.slice(0,50),p1Avant:avant,p1Apres:apres};
  return base;
}

function auditerReportCbCycleSuivant20260905(){
  const base=chargerCerbereCockpitBaseRapide20260903_();
  const res=calculerReportCbCycleSuivant20260905_(base);
  console.log(JSON.stringify(res));
  return res;
}

function chargerCerbereCockpit20260902(){
  const executer=function(){
    const t0=Date.now(),base=chargerCerbereCockpitBaseRapide20260903_();if(!base||base.ok===false)return base;
    const post=base.diagnostic&&base.diagnostic.performancePost35||{couches:[]},timings=Array.isArray(post.couches)?post.couches:[];
    chronometrerCoucheCerbere20260904_(timings,'Suspensions Actions/Événements',()=>corrigerSuspensionsActionsEvenements20260903_(base));
    chronometrerCoucheCerbere20260904_(timings,'Réel pilotable date achat',()=>corrigerReelPilotableDateAchat20260902_(base));
    const periodes=Array.isArray(base.periodes)?base.periodes:[];
    chronometrerCoucheCerbere20260904_(timings,'Enrichissement cockpit C1/C2',()=>periodes.forEach((p,i)=>enrichirCycleCockpitCerbere20260902_(p,i)));
    chronometrerCoucheCerbere20260904_(timings,'CB double rôle C1/C2',()=>appliquerReportCbCycleSuivant20260905_(base));
    let appreciation='';chronometrerCoucheCerbere20260904_(timings,'Appréciation cockpit',()=>{appreciation=appreciationCockpitCerbere20260902_(base);});
    const perf={c1c2Seulement:true,dureeMs:Date.now()-t0,couches:timings};
    base.cockpit20260902={version:'2026-09-05.cb-double-role-6',appreciation:appreciation,performance:perf,doctrine:'Cockpit C1/C2 : CB imputée aux lignes par date achat dans C1 et au global du mois CB suivant dans C2.'};
    const ts=Date.now(),out=serialiserCerberePourClient_(base),serializationMs=Date.now()-ts;
    if(out&&out.cockpit20260902&&out.cockpit20260902.performance){out.cockpit20260902.performance.serializationMs=serializationMs;out.cockpit20260902.performance.dureeMs=Date.now()-t0;}
    return out;
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-cb-double-role-20260905-v6',executer):executer();
}