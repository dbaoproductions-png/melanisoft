const CERBERE_EXPRESS_VERSION = '2026-09-13.1';

/** Cerbère Express est un consommateur de décision : EP uniquement. */
function chargerCerbereExpress20260827() {
  const t0=Date.now();
  const cerbere = typeof chargerCerbereCockpit20260902==='function' ? chargerCerbereCockpit20260902() : chargerCerbereV374();
  const out=composerCerbereExpressDepuisCockpit20260910_(cerbere);
  if(out&&out.performance){out.performance.dureeMs=Date.now()-t0;out.performance.source='cockpit Cerbère · propriétaire EP';}
  return out;
}

/** Composition pure depuis le cockpit déjà calculé : aucun P ni calcul comptable. */
function composerCerbereExpressDepuisCockpit20260910_(cerbere) {
  const t0=Date.now();
  if (!cerbere || cerbere.ok === false) return cerbere || {ok:false, erreur:'Cerbère indisponible'};
  if(typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')enrichirEnvelopePilotableBudgetSoft20260913_(cerbere);
  const ps=Array.isArray(cerbere.periodes)?cerbere.periodes:[],p=ps[0]||null,p2=ps[1]||null;
  if(!p||!p.periode)throw new Error('Période courante Cerbère introuvable.');
  const maintenant=new Date(),debut=dateExpress_(p.periode.debut),fin=dateExpress_(p.periode.fin);
  if(!debut||!fin)throw new Error('Bornes du cycle Cerbère invalides.');
  const progression=progressionCycleExpress_(debut,fin,maintenant),c=p.v37&&p.v37.cockpit20260902||{},c2=p2&&p2.v37&&p2.v37.cockpit20260902||{};

  const lignes=(p.enveloppes||[]).map(x=>{
    const allocation=arrExpress_(Math.max(0,Number(x&&x.prevu||0))),consomme=arrExpress_(Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0)))),reste=arrExpress_(allocation-consomme),part=allocation>0?consomme/allocation:(consomme>0?1:0);
    return{categorie:String(x&&x.categorie||'').trim(),allocation,canon:arrExpress_(Math.max(0,Number(x&&x.canon||0))),consomme,reste,partConsommee:arrExpress_(part*100),partTempsPct:arrExpress_(progression.ratio*100),vigilance:vigilanceExpress_(part,progression.ratio,reste,allocation,progression.jour)};
  }).filter(x=>x.categorie);

  const totalAllocation=arrExpress_(Number(c.epTotal!=null?c.epTotal:(p.budgetReparti||lignes.reduce((s,x)=>s+x.allocation,0))));
  const totalConsomme=arrExpress_(Number(c.epConsomme!=null?c.epConsomme:lignes.reduce((s,x)=>s+x.consomme,0)));
  const totalReste=arrExpress_(Number(c.epDisponible!=null?c.epDisponible:totalAllocation-totalConsomme));
  const globalVigilance=vigilanceExpress_(totalAllocation>0?totalConsomme/totalAllocation:(totalConsomme>0?1:0),progression.ratio,totalReste,totalAllocation,progression.jour);
  const meteo={niveau:globalVigilance.niveau,emoji:globalVigilance.niveau==='rouge'?'🌧️':globalVigilance.niveau==='orange'?'🌥️':'🌤️',libelle:globalVigilance.libelle,resume:globalVigilance.message,raisons:[globalVigilance.message]};
  const consigne={niveau:meteo.niveau,texte:totalReste<0?'EP dépassée de '+formatEuroExpress_(Math.abs(totalReste)):('Il reste '+formatEuroExpress_(Math.max(0,totalReste))+' sur l’EP décidée.'),raison:'EP décidée et rythme de consommation'};

  return{
    ok:true,version:CERBERE_EXPRESS_VERSION,moteurSource:String(cerbere.version||''),cockpitVersion:String(cerbere.cockpit20260902&&cerbere.cockpit20260902.version||''),genereLe:Utilities.formatDate(maintenant,Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss"),
    doctrine:'Express = décision d’achat : EP, consommation et rythme uniquement. P et la mécanique comptable n’y sont pas publiés.',
    performance:{dureeMs:Date.now()-t0,source:'cockpit Cerbère précalculé · EP'},
    cycle:{debut:formatDateExpress_(debut),fin:formatDateExpress_(fin),jour:progression.jour,jours:progression.jours,progressionPct:arrExpress_(progression.ratio*100)},
    referenceEP:{totalP0:arrExpress_(c.epP0!=null?c.epP0:(c.p0Total||0)),totalEP:totalAllocation,source:String(c.epSource||'P0'),proprietaire:String(typeof BUDGETSOFT_EP_OWNER_20260913!=='undefined'?BUDGETSOFT_EP_OWNER_20260913:'')},
    pilotable:{allocation:totalAllocation,consomme:totalConsomme,reste:totalReste,reparti:totalAllocation,lignes:lignes},
    pluxee:construirePluxeeExpress_(),
    contexteDecision:{ep:totalAllocation,epDisponible:totalReste,epSource:String(c.epSource||''),prochainCycleEp:arrExpress_(c2.epTotal!=null?c2.epTotal:(p2&&p2.budgetReparti||0)),reportCbCycleSuivant:arrExpress_(c2.reportCbCycle||0),epDiffereEstimeCycleSuivant:arrExpress_(c2.cbEpEstimee||0)},
    meteo,consigneSaillante:consigne
  };
}

function vigilanceExpress_(partConsommee,partTemps,reste,allocation,jour){
  const pc=Math.max(0,Number(partConsommee||0)),pt=Math.max(0,Math.min(1,Number(partTemps||0))),ecart=(pc-pt)*100;let niveau='vert',libelle='Cap tenu';
  if(reste<-.009||pc>1.0001){niveau='rouge';libelle='Enveloppe dépassée';}else if(allocation<=0&&pc<=0){libelle='Aucune dépense';}else if(jour>3&&ecart>25){niveau='rouge';libelle='Rythme très rapide';}else if(jour>3&&ecart>10){niveau='orange';libelle='Rythme un peu rapide';}
  return{niveau,libelle,ecartRythmePoints:arrExpress_(ecart),partTempsPct:arrExpress_(pt*100),message:messageVigilanceExpress_(niveau,libelle,pc,pt,reste)};
}
function messageVigilanceExpress_(niveau,libelle,pc,pt,reste){if(reste<-.009)return libelle+' · dépassement de '+formatEuroExpress_(Math.abs(reste));return libelle+' · '+Math.round(pc*100)+' % consommés pour '+Math.round(pt*100)+' % du cycle';}
function construirePluxeeExpress_(){if(typeof chargerPluxeeCerbere20260827!=='function')return{ok:false,disponible:false};const e=chargerPluxeeCerbere20260827(),debut=e&&e.cycle&&e.cycle.dateRecharge?dateExpress_(e.cycle.dateRecharge):null,maintenant=new Date(),ratio=debut?Math.max(0,Math.min(1,(jourCivilExpress_(maintenant)-jourCivilExpress_(debut)+1)/30)):0,jour=debut?Math.max(1,Math.floor(jourCivilExpress_(maintenant)-jourCivilExpress_(debut))+1):1;const lignes=['Courses','Restaurants'].map(c=>{const allocation=arrExpress_(Number(e&&e.allocation&&e.allocation[c]||0)),consomme=arrExpress_(Number(e&&e.reelParCategorie&&e.reelParCategorie[c]||0)),reste=arrExpress_(allocation-consomme),part=allocation>0?consomme/allocation:(consomme>0?1:0);return{categorie:c,allocation,consomme,reste,partConsommee:arrExpress_(part*100),partTempsPct:arrExpress_(ratio*100),vigilance:vigilanceExpress_(part,ratio,reste,allocation,jour)};});return{ok:true,disponible:true,cycle:e.cycle,progressionPct:arrExpress_(ratio*100),lignes,aClasser:arrExpress_(Number(e&&e.reelParCategorie&&e.reelParCategorie['À classer']||0)),soldeTheorique:arrExpress_(Number(e.soldeTheorique||0)),soldeReel:arrExpress_(Number(e.soldeReel||0)),ecartReelTheorique:arrExpress_(Number(e.ecartReelTheorique||0))};}
function progressionCycleExpress_(debut,fin,maintenant){const a=jourCivilExpress_(debut),z=jourCivilExpress_(fin),n=jourCivilExpress_(maintenant),jours=Math.max(1,Math.round(z-a)+1),jour=Math.max(1,Math.min(jours,Math.floor(n-a)+1));return{jour,jours,ratio:Math.max(0,Math.min(1,jour/jours))};}
function dansCycleExpress_(d,a,z){const t=jourCivilExpress_(d);return t>=jourCivilExpress_(a)&&t<=jourCivilExpress_(z);}
function jourCivilExpress_(d){const x=new Date(d);return Date.UTC(x.getFullYear(),x.getMonth(),x.getDate())/86400000;}
function dateExpress_(v){if(!v)return null;const d=v instanceof Date?new Date(v.getTime()):new Date(v);return isNaN(d.getTime())?null:d;}
function formatDateExpress_(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function formatEuroExpress_(n){return arrExpress_(n).toFixed(2).replace('.',',')+' €';}
function arrExpress_(n){return Math.round(Number(n||0)*100)/100;}
function auditerCerbereExpress20260827(){const e=chargerCerbereExpress20260827(),l=e&&e.pilotable&&e.pilotable.lignes||[],out={ok:!!(e&&e.ok),version:e&&e.version,moteurSource:e&&e.moteurSource,cycle:e&&e.cycle,ep:Number(e&&e.pilotable&&e.pilotable.allocation||0),epDisponible:Number(e&&e.pilotable&&e.pilotable.reste||0),consomme:Number(e&&e.pilotable&&e.pilotable.consomme||0),sommeReel:arrExpress_(l.reduce((s,x)=>s+Number(x.consomme||0),0)),referenceEP:e&&e.referenceEP,contexteDecision:e&&e.contexteDecision,aucunPDecision:!Object.prototype.hasOwnProperty.call(e||{},'referenceP1')&&!(e&&e.contexteFinancier),performance:e&&e.performance};out.ok=out.ok&&out.aucunPDecision;console.log('[AUDIT CERBERE EXPRESS EP] '+JSON.stringify(out));return out;}
