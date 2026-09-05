/*
 * Cerbère — doctrine CB différée, double rôle (2026-09-05).
 * 1) La dépense est imputée au pilotable par date d'achat dans C1.
 * 2) Tant que le débit bancaire n'est pas intervenu, elle réduit aussi le P1 global
 *    du cycle où le débit de carte est attendu (C2 dans le cockpit courant).
 *
 * On ne réinjecte PAS ces CB dans les molettes de C2 : elles ont déjà joué leur
 * rôle analytique dans C1. C2 ne reçoit que leur impact global de trésorerie.
 */
const CERBERE_CB_DOUBLE_ROLE_VERSION='2026-09-05.1';

function calculerReportCbCycleSuivant20260905_(base){
  const ps=Array.isArray(base&&base.periodes)?base.periodes:[];
  if(ps.length<2)return{montant:0,lignes:[]};
  const p1=ps[0]&&ps[0].periode||{},p2=ps[1]&&ps[1].periode||{};
  const d11=dateValideVentilationBudgetSoft_(p1.debut),d12=dateValideVentilationBudgetSoft_(p1.fin),d21=dateValideVentilationBudgetSoft_(p2.debut),d22=dateValideVentilationBudgetSoft_(p2.fin);
  if(!d11||!d12||!d21||!d22)return{montant:0,lignes:[]};
  const lireDirect=typeof lireTableDirecteBudgetSoft20260905_==='function'?lireTableDirecteBudgetSoft20260905_:lireTable_;
  const ops0=lireDirect('Operations')||[],ops=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  const now=new Date(),lignes=[];let total=0;
  const jour=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(),a1=jour(d11),z1=jour(d12),a2=jour(d21),z2=jour(d22),tn=jour(now);
  (ops||[]).forEach(o=>{
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||m>=0)return;
    if(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o))return;
    const lib=String(o&&o.libelle_bancaire||o&&o.libelle||''),estCarte=!!String(o&&o.carte_fin||'').trim()||/\b(?:CB|CARTE)\b/i.test(lib);
    if(!estCarte)return;
    const da=typeof dateAchatMetierBudgetSoft_==='function'?dateAchatMetierBudgetSoft_(o):dateValideVentilationBudgetSoft_(o&&o.date_achat);if(!da)return;
    const ta=jour(da);if(ta<a1||ta>z1||ta>tn)return;
    let impact=null;
    const dc=dateValideVentilationBudgetSoft_(o&&o.date_comptable);
    if(dc&&jour(dc)>tn)impact=dc;
    else if(dc&&jour(dc)<=tn){
      /* Un débit comptable déjà passé signifie que la CB n'est plus à reporter. */
      return;
    }else{
      const debutMois=new Date(da.getFullYear(),da.getMonth(),28);
      impact=new Date(debutMois.getFullYear(),debutMois.getMonth()+1,28);
    }
    const ti=jour(impact);if(ti<a2||ti>z2)return;
    const a=Math.abs(m);total+=a;lignes.push({id:String(o&&o.id||''),categorie:String(o&&o.categorie||''),montant:Math.round(a*100)/100,dateAchat:Utilities.formatDate(da,Session.getScriptTimeZone(),'yyyy-MM-dd'),dateImpact:Utilities.formatDate(impact,Session.getScriptTimeZone(),'yyyy-MM-dd'),carteFin:String(o&&o.carte_fin||'')});
  });
  return{montant:Math.round(total*100)/100,lignes};
}

function appliquerReportCbCycleSuivant20260905_(base){
  const ps=Array.isArray(base&&base.periodes)?base.periodes:[];if(ps.length<2)return base;
  const calc=calculerReportCbCycleSuivant20260905_(base),report=Math.max(0,Number(calc.montant||0)),p=ps[1],v=p.v37||(p.v37={}),c=v.cockpit20260902||(v.cockpit20260902={});
  const avant=Math.max(0,Number(c.p1AvantReportCb!=null?c.p1AvantReportCb:(c.p1Total!=null?c.p1Total:(c.p1Cible!=null?c.p1Cible:0))));
  const apres=Math.max(0,Math.round((avant-report)*100)/100),cons=Math.max(0,Number(c.consommePilotable||0)),rep=Math.max(0,Number(c.budgetRepartiMolettes!=null?c.budgetRepartiMolettes:(p.budgetReparti||0))),p0=Math.max(0,Number(c.p0Total||0));
  c.p1AvantReportCb=avant;c.reportCbCycle=report;c.cbDejaEngagee=report;c.p1Total=apres;c.p1Cible=apres;c.budgetPilotableActualise=apres;c.ret1=Math.round((apres-cons)*100)/100;c.surplusVsP0=Math.round((apres-p0)*100)/100;c.margeARepartir=Math.round((apres-rep)*100)/100;c.aRepartirDansPostes=c.margeARepartir;c.doctrineCb='CB : analytique par date achat dans C1 + impact global de trésorerie dans C2, sans double imputation par catégorie.';
  v.reportCbCycle=report;v.cbDejaEngagee=report;v.p1AvantReportCb=avant;v.p1ApresReportCb=apres;
  p.resteBudgetPilotable=c.ret1;p.resteBudgetAlloue=c.ret1;
  base.diagnostic=base.diagnostic||{};base.diagnostic.cbDoubleRole={version:CERBERE_CB_DOUBLE_ROLE_VERSION,montant:report,nombre:calc.lignes.length,lignes:calc.lignes.slice(0,50),p1Avant:avant,p1Apres:apres};
  return base;
}

/* Surcharge terminale du chargeur cockpit : même pipeline existant, avec la
 * passe CB double-rôle juste après l'enrichissement C1/C2. */
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
    base.cockpit20260902={version:'2026-09-05.cb-double-role-1',appreciation:appreciation,performance:perf,doctrine:'Cockpit C1/C2 : CB imputée aux lignes par date achat dans C1 et au global du cycle de débit dans C2.'};
    const ts=Date.now(),out=serialiserCerberePourClient_(base),serializationMs=Date.now()-ts;
    if(out&&out.cockpit20260902&&out.cockpit20260902.performance){out.cockpit20260902.performance.serializationMs=serializationMs;out.cockpit20260902.performance.dureeMs=Date.now()-t0;}
    return out;
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-cb-double-role-20260905',executer):executer();
}
