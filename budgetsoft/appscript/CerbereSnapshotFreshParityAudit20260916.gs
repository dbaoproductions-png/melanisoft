const CERBERE_SNAPSHOT_FRESH_PARITY_20260916_VERSION='2026-09-16.1';

function arrCerbereParity20260916_(n){return Math.round((Number(n)||0)*100)/100;}
function cloneCerbereParity20260916_(v){return JSON.parse(JSON.stringify(v==null?null:v));}
function ligneSanteCerbereParity20260916_(p){
  const e=(p&&p.enveloppes||[]).find(x=>typeof estCategorieSante20260915_==='function'?estCategorieSante20260915_(x&&x.categorie):String(x&&x.categorie||'').toLowerCase()==='santé')||{};
  return{
    prevu:arrCerbereParity20260916_(e.prevu),
    reelImpute:arrCerbereParity20260916_(e.reelImpute),
    reelNetPrevisionnel:arrCerbereParity20260916_(e.reelNetPrevisionnel),
    planifie:arrCerbereParity20260916_(e.planifie),
    brutSante:arrCerbereParity20260916_(e.reelSanteBrut20260915),
    remboursements:arrCerbereParity20260916_(e.remboursementsSanteEncaisses20260915),
    resteV37:arrCerbereParity20260916_(e.resteV37)
  };
}
function resumePeriodeCerbereParity20260916_(p,index){
  const c=p&&p.v37&&p.v37.cockpit20260902||{},ep=p&&p.enveloppePilotable||{};
  return{
    index:index+1,
    cle:String(p&&p.clePilotage||''),
    budgetDisponible:arrCerbereParity20260916_(p&&p.budgetDisponible),
    budgetReparti:arrCerbereParity20260916_(p&&p.budgetReparti),
    resteBudgetPilotable:arrCerbereParity20260916_(p&&p.resteBudgetPilotable),
    p1Total:arrCerbereParity20260916_(c.p1Total),
    pSoutenable:arrCerbereParity20260916_(c.pSoutenable),
    consommePilotable:arrCerbereParity20260916_(c.consommePilotable),
    pDisponible:arrCerbereParity20260916_(c.pDisponible!=null?c.pDisponible:c.ret1),
    epTotal:arrCerbereParity20260916_(c.epTotal!=null?c.epTotal:ep.total),
    epConsomme:arrCerbereParity20260916_(c.epConsomme!=null?c.epConsomme:ep.consomme),
    epDisponible:arrCerbereParity20260916_(c.epDisponible!=null?c.epDisponible:ep.reste),
    reportCbCycle:arrCerbereParity20260916_(c.reportCbCycle),
    sante:ligneSanteCerbereParity20260916_(p)
  };
}
function resumeCerbereParity20260916_(r){
  return{
    ok:!!(r&&r.ok!==false),
    source:String(r&&r.source||r&&r.sourceBudgetSoft||''),
    revisionBudgetSoft:String(r&&r.revisionBudgetSoft||''),
    periodes:(r&&r.periodes||[]).slice(0,2).map(resumePeriodeCerbereParity20260916_),
    diagSante:r&&r.diagnostic&&r.diagnostic.enveloppeSante20260915||null
  };
}
function comparerPeriodesCerbereParity20260916_(a,b,labelA,labelB){
  const champs=['budgetDisponible','budgetReparti','resteBudgetPilotable','p1Total','pSoutenable','consommePilotable','pDisponible','epTotal','epConsomme','epDisponible','reportCbCycle'];
  const out=[];
  for(let i=0;i<2;i++){
    const x=a&&a.periodes&&a.periodes[i]||{},y=b&&b.periodes&&b.periodes[i]||{};
    champs.forEach(ch=>{const av=Number(x[ch]||0),bv=Number(y[ch]||0),d=arrCerbereParity20260916_(bv-av);if(Math.abs(d)>.01)out.push({periode:i+1,champ:ch,[labelA]:arrCerbereParity20260916_(av),[labelB]:arrCerbereParity20260916_(bv),delta:d});});
    ['prevu','reelImpute','reelNetPrevisionnel','planifie','brutSante','remboursements','resteV37'].forEach(ch=>{const av=Number(x.sante&&x.sante[ch]||0),bv=Number(y.sante&&y.sante[ch]||0),d=arrCerbereParity20260916_(bv-av);if(Math.abs(d)>.01)out.push({periode:i+1,champ:'sante.'+ch,[labelA]:arrCerbereParity20260916_(av),[labelB]:arrCerbereParity20260916_(bv),delta:d});});
  }
  return out;
}

/**
 * Audit ciblé : un seul recalcul Cerbère frais, puis comparaison avec le snapshot.
 * Il compare aussi le même calcul frais après application locale de la normalisation Santé.
 * Aucune écriture métier, aucune reconstruction du snapshot.
 */
function auditerPariteCerbereFraisSnapshot20260916(){
  const t0=Date.now();
  const snap=chargerSnapshotGlobalBudgetSoft20260906(),etat=snap&&snap.disponible&&snap.etat||{},snapshot=etat&&etat.modules&&etat.modules.cerbere||null;
  if(!snapshot)throw new Error('Cerbère absent du snapshot publié.');
  if(typeof recalculerCerbereCockpitP1Frais20260912_!=='function')throw new Error('Moteur frais Cerbère introuvable.');
  const brut=recalculerCerbereCockpitP1Frais20260912_({contexteExterne:true});
  if(!brut||brut.ok===false)throw new Error('Recalcul frais Cerbère invalide.');
  const normalise=cloneCerbereParity20260916_(brut);
  if(typeof normaliserCerbereCfPourSnapshot20260914_==='function')normaliserCerbereCfPourSnapshot20260914_(normalise,chargerToutesLesDonnees());
  if(typeof normaliserCerbereSantePourSnapshot20260915_==='function')normaliserCerbereSantePourSnapshot20260915_(normalise);
  if(typeof synchroniserAgregatsApresSante20260915_==='function')synchroniserAgregatsApresSante20260915_(normalise);

  const rBrut=resumeCerbereParity20260916_(brut),rNorm=resumeCerbereParity20260916_(normalise),rSnap=resumeCerbereParity20260916_(snapshot);
  const ecartsBrutSnapshot=comparerPeriodesCerbereParity20260916_(rBrut,rSnap,'fraisBrut','snapshot');
  const ecartsNormSnapshot=comparerPeriodesCerbereParity20260916_(rNorm,rSnap,'fraisNormalise','snapshot');
  const ecartsBrutNorm=comparerPeriodesCerbereParity20260916_(rBrut,rNorm,'fraisBrut','fraisNormalise');
  const out={
    ok:ecartsNormSnapshot.length===0,
    version:CERBERE_SNAPSHOT_FRESH_PARITY_20260916_VERSION,
    revisionBudgetSoft:String(etat.revisionBudgetSoft||''),
    dureeMs:Date.now()-t0,
    fraisBrut:rBrut,
    fraisNormaliseCommeSnapshot:rNorm,
    snapshot:rSnap,
    ecarts:{brutVersSnapshot:ecartsBrutSnapshot,brutVersNormalise:ecartsBrutNorm,normaliseVersSnapshot:ecartsNormSnapshot},
    diagnostic:ecartsNormSnapshot.length===0
      ?'Le snapshot est égal au moteur frais après normalisations snapshot ; la divergence vient donc des normalisations post-moteur, pas du snapshot lui-même.'
      :'Le snapshot diverge encore du moteur frais même après application des mêmes normalisations ; il faut chercher une autre différence de chemin de construction.'
  };
  console.log('[AUDIT PARITE CERBERE FRAIS SNAPSHOT 20260916] '+JSON.stringify(out));
  return out;
}
