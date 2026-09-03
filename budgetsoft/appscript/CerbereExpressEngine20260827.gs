const CERBERE_EXPRESS_VERSION = '2026-09-03.1';

/**
 * Cerbère Express n'est plus un second moteur budgétaire.
 * Il adapte strictement C1/C2 déjà calculés par le cockpit Cerbère.
 */
function chargerCerbereExpress20260827() {
  const t0=Date.now();
  const cerbere = typeof chargerCerbereCockpit20260902==='function'
    ? chargerCerbereCockpit20260902()
    : chargerCerbereV374();
  if (!cerbere || cerbere.ok === false) return cerbere || {ok:false, erreur:'Cerbère indisponible'};

  const ps=Array.isArray(cerbere.periodes)?cerbere.periodes:[];
  const p=ps[0]||null, p2=ps[1]||null;
  if(!p||!p.periode)throw new Error('Période courante Cerbère introuvable.');

  const maintenant=new Date(),debut=dateExpress_(p.periode.debut),fin=dateExpress_(p.periode.fin);
  if(!debut||!fin)throw new Error('Bornes du cycle Cerbère invalides.');
  const progression=progressionCycleExpress_(debut,fin,maintenant);
  const c=p.v37&&p.v37.cockpit20260902||{};
  const c2=p2&&p2.v37&&p2.v37.cockpit20260902||{};

  const lignes=(p.enveloppes||[]).map(x=>{
    const allocation=arrExpress_(Math.max(0,Number(x&&x.prevu||0)));
    const consomme=arrExpress_(Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0))));
    const reste=arrExpress_(allocation-consomme);
    const part=allocation>0?consomme/allocation:(consomme>0?1:0);
    return {
      categorie:String(x&&x.categorie||'').trim(),
      allocation,
      canon:arrExpress_(Math.max(0,Number(x&&x.canon||0))),
      consomme,
      reste,
      partConsommee:arrExpress_(part*100),
      partTempsPct:arrExpress_(progression.ratio*100),
      vigilance:vigilanceExpress_(part,progression.ratio,reste,allocation,progression.jour)
    };
  }).filter(x=>x.categorie);

  const totalAllocation=arrExpress_(Number(c.p1Total!=null?c.p1Total:(c.p1Cible!=null?c.p1Cible:(p.budgetReparti||0))));
  const totalConsomme=arrExpress_(Number(c.consommePilotable!=null?c.consommePilotable:lignes.reduce((s,x)=>s+x.consomme,0)));
  const totalReste=arrExpress_(Number(c.ret1!=null?c.ret1:totalAllocation-totalConsomme));
  const reparti=arrExpress_(Number(c.budgetRepartiMolettes!=null?c.budgetRepartiMolettes:lignes.reduce((s,x)=>s+x.allocation,0)));
  const aVentiler=arrExpress_(Number(c.margeARepartir!=null?c.margeARepartir:totalAllocation-reparti));

  const app=cerbere.cockpit20260902&&cerbere.cockpit20260902.appreciation||{};
  const meteo={
    niveau:String(app.niveau||'vert'),
    emoji:String(app.emoji||'🌤️'),
    libelle:String(app.titre||'Cap tenu'),
    resume:String(app.resume||''),
    raisons:app.consigne?[String(app.consigne)]:[]
  };
  const consigne={niveau:meteo.niveau,texte:String(app.consigne||'Cap tenu.'),raison:'appréciation du cockpit Cerbère'};

  return {
    ok:true,
    version:CERBERE_EXPRESS_VERSION,
    moteurSource:String(cerbere.version||''),
    cockpitVersion:String(cerbere.cockpit20260902&&cerbere.cockpit20260902.version||''),
    genereLe:Utilities.formatDate(maintenant,Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss"),
    doctrine:'Express présente les valeurs déjà validées par le cockpit Cerbère ; aucun recalcul budgétaire autonome.',
    performance:{dureeMs:Date.now()-t0,source:'cockpit Cerbère'},
    cycle:{debut:formatDateExpress_(debut),fin:formatDateExpress_(fin),jour:progression.jour,jours:progression.jours,progressionPct:arrExpress_(progression.ratio*100)},
    referenceP1:{totalP0:arrExpress_(c.p0Total||0),totalP1:totalAllocation,ecartP1P0:arrExpress_(c.surplusVsP0||0),source:'v37.cockpit20260902'},
    pilotable:{allocation:totalAllocation,consomme:totalConsomme,reste:totalReste,reparti,aVentiler,lignes},
    pluxee:construirePluxeeExpress_(),
    contexteFinancier:{
      pilotableInstantT:arrExpress_(c.budgetPilotableActualise||0),
      p1:totalAllocation,
      aVentiler,
      prochainCycle:arrExpress_(c2.p1Total||c2.budgetPilotableActualise||0),
      reportCbCycleSuivant:arrExpress_(c2.reportCbCycle||0),
      surplusDeficitCycleSuivant:arrExpress_(c2.margeARepartir||0)
    },
    meteo,
    consigneSaillante:consigne
  };
}

function vigilanceExpress_(partConsommee,partTemps,reste,allocation,jour){
  const pc=Math.max(0,Number(partConsommee||0)),pt=Math.max(0,Math.min(1,Number(partTemps||0))),ecart=(pc-pt)*100;
  let niveau='vert',libelle='Cap tenu';
  if(reste<-.009||pc>1.0001){niveau='rouge';libelle='Enveloppe dépassée';}
  else if(allocation<=0&&pc<=0){libelle='Aucune dépense';}
  else if(jour>3&&ecart>25){niveau='rouge';libelle='Rythme très rapide';}
  else if(jour>3&&ecart>10){niveau='orange';libelle='Rythme un peu rapide';}
  return {niveau,libelle,ecartRythmePoints:arrExpress_(ecart),partTempsPct:arrExpress_(pt*100),message:messageVigilanceExpress_(niveau,libelle,pc,pt,reste)};
}
function messageVigilanceExpress_(niveau,libelle,pc,pt,reste){if(reste<-.009)return libelle+' · dépassement de '+formatEuroExpress_(Math.abs(reste));return libelle+' · '+Math.round(pc*100)+' % consommés pour '+Math.round(pt*100)+' % du cycle';}

function construirePluxeeExpress_(){
  if(typeof chargerPluxeeCerbere20260827!=='function')return{ok:false,disponible:false};
  const e=chargerPluxeeCerbere20260827(),debut=e&&e.cycle&&e.cycle.dateRecharge?dateExpress_(e.cycle.dateRecharge):null,maintenant=new Date(),ratio=debut?Math.max(0,Math.min(1,(jourCivilExpress_(maintenant)-jourCivilExpress_(debut)+1)/30)):0,jour=debut?Math.max(1,Math.floor(jourCivilExpress_(maintenant)-jourCivilExpress_(debut))+1):1;
  const lignes=['Courses','Restaurants'].map(c=>{const allocation=arrExpress_(Number(e&&e.allocation&&e.allocation[c]||0)),consomme=arrExpress_(Number(e&&e.reelParCategorie&&e.reelParCategorie[c]||0)),reste=arrExpress_(allocation-consomme),part=allocation>0?consomme/allocation:(consomme>0?1:0);return{categorie:c,allocation,consomme,reste,partConsommee:arrExpress_(part*100),partTempsPct:arrExpress_(ratio*100),vigilance:vigilanceExpress_(part,ratio,reste,allocation,jour)};});
  return{ok:true,disponible:true,cycle:e.cycle,progressionPct:arrExpress_(ratio*100),lignes,aClasser:arrExpress_(Number(e&&e.reelParCategorie&&e.reelParCategorie['À classer']||0)),soldeTheorique:arrExpress_(Number(e.soldeTheorique||0)),soldeReel:arrExpress_(Number(e.soldeReel||0)),ecartReelTheorique:arrExpress_(Number(e.ecartReelTheorique||0))};
}

function progressionCycleExpress_(debut,fin,maintenant){const a=jourCivilExpress_(debut),z=jourCivilExpress_(fin),n=jourCivilExpress_(maintenant),jours=Math.max(1,Math.round(z-a)+1),jour=Math.max(1,Math.min(jours,Math.floor(n-a)+1));return{jour,jours,ratio:Math.max(0,Math.min(1,jour/jours))};}
function dansCycleExpress_(d,a,z){const t=jourCivilExpress_(d);return t>=jourCivilExpress_(a)&&t<=jourCivilExpress_(z);}
function jourCivilExpress_(d){const x=new Date(d);return Date.UTC(x.getFullYear(),x.getMonth(),x.getDate())/86400000;}
function dateExpress_(v){if(!v)return null;const d=v instanceof Date?new Date(v.getTime()):new Date(v);return isNaN(d.getTime())?null:d;}
function formatDateExpress_(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function formatEuroExpress_(n){return arrExpress_(n).toFixed(2).replace('.',',')+' €';}
function arrExpress_(n){return Math.round(Number(n||0)*100)/100;}

function auditerCerbereExpress20260827(){const e=chargerCerbereExpress20260827();const lignes=e&&e.pilotable&&e.pilotable.lignes||[];return{ok:!!(e&&e.ok),version:e&&e.version,moteurSource:e&&e.moteurSource,cycle:e&&e.cycle,pilotable:e&&e.pilotable,coherence:{sommeReel:arrExpress_(lignes.reduce((s,x)=>s+Number(x.consomme||0),0)),p1:Number(e&&e.pilotable&&e.pilotable.allocation||0),reste:Number(e&&e.pilotable&&e.pilotable.reste||0),aVentiler:Number(e&&e.pilotable&&e.pilotable.aVentiler||0)},meteo:e&&e.meteo,contexte:e&&e.contexteFinancier,performance:e&&e.performance};}
