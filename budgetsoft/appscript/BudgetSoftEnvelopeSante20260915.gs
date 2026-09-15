/*
 * BudgetSoft — doctrine spéciale de l'enveloppe Santé — 2026-09-15.
 *
 * La comptabilité globale conserve les flux bruts : dépenses en débit,
 * remboursements en crédit. Seule la consommation de la molette Santé est
 * nette des remboursements réellement encaissés dans le cycle.
 */
const BUDGETSOFT_ENVELOPPE_SANTE_20260915_VERSION='2026-09-15.1';
const BUDGETSOFT_ENVELOPPE_SANTE_20260915_OWNER='BudgetSoftEnvelopeSante20260915';

function arrEnveloppeSante20260915_(n){return Math.round((Number(n)||0)*100)/100;}
function estCategorieSante20260915_(v){
  const s=String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  return s==='sante';
}

function faitsSantePeriode20260915_(p){
  const depDirect=Number(p&&p.santeDepenses),rembDirect=Number(p&&p.santeRemboursements);
  if(Number.isFinite(depDirect)||Number.isFinite(rembDirect)){
    const dep=Math.max(0,Number.isFinite(depDirect)?depDirect:0),remb=Math.max(0,Number.isFinite(rembDirect)?rembDirect:0);
    return{depenses:arrEnveloppeSante20260915_(dep),remboursements:arrEnveloppeSante20260915_(remb),source:'periode.santeDepenses/santeRemboursements'};
  }
  const s=p&&p.roulant&&p.roulant.sante||{};
  const net=Number(s.net),remb=Number(s.remboursements);
  if(Number.isFinite(net)||Number.isFinite(remb)){
    const r=Math.max(0,Number.isFinite(remb)?remb:0),n=Math.max(0,Number.isFinite(net)?net:0);
    return{depenses:arrEnveloppeSante20260915_(n+r),remboursements:arrEnveloppeSante20260915_(r),source:'roulant.sante (brut reconstitué)'};
  }
  return{depenses:0,remboursements:0,source:'aucun fait Santé'};
}

function normaliserCerbereSantePourSnapshot20260915_(base){
  if(!base||base.ok===false)return base;
  const periodes=Array.isArray(base.periodes)?base.periodes:[],cycles=[];
  periodes.forEach((p,index)=>{
    if(!p)return;
    const env=Array.isArray(p.enveloppes)?p.enveloppes:[],sante=env.find(x=>estCategorieSante20260915_(x&&x.categorie));
    const faits=faitsSantePeriode20260915_(p);
    const net=arrEnveloppeSante20260915_(Math.max(0,faits.depenses-faits.remboursements));
    if(sante){
      const allocation=Math.max(0,Number(sante.prevu||0)),plan=Math.max(0,Number(sante.planifie||0));
      sante.reelSanteBrut20260915=faits.depenses;
      sante.remboursementsSanteEncaisses20260915=faits.remboursements;
      sante.reelNetPrevisionnel=net;
      sante.resteV37=arrEnveloppeSante20260915_(allocation-net);
      sante.engageV37=arrEnveloppeSante20260915_(net+plan);
      sante.dpt1=arrEnveloppeSante20260915_(Math.max(allocation,net+plan));
      sante.doctrineSante20260915='Consommation Santé = max(0, dépenses réelles - remboursements réellement encaissés). Les remboursements attendus ne reconstituent pas la molette.';
      cycles.push({index:index+1,cle:String(p.clePilotage||''),allocation:arrEnveloppeSante20260915_(allocation),depenses:faits.depenses,remboursements:faits.remboursements,consommationNette:net,disponible:arrEnveloppeSante20260915_(allocation-net),source:faits.source});
    }else cycles.push({index:index+1,cle:String(p.clePilotage||''),allocation:0,depenses:faits.depenses,remboursements:faits.remboursements,consommationNette:net,disponible:0,source:faits.source,sansEnveloppeSante:true});
  });
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.enveloppeSante20260915={ok:true,version:BUDGETSOFT_ENVELOPPE_SANTE_20260915_VERSION,proprietaire:BUDGETSOFT_ENVELOPPE_SANTE_20260915_OWNER,cycles:cycles,doctrine:'Flux bancaires bruts inchangés ; seule la molette Santé consomme le net des remboursements réellement encaissés ; consommation plancher 0, donc disponibilité jamais supérieure à l’allocation.'};
  return base;
}

function synchroniserAgregatsApresSante20260915_(base){
  if(!base||base.ok===false)return base;
  if(typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')enrichirEnvelopePilotableBudgetSoft20260913_(base);
  const ps=Array.isArray(base.periodes)?base.periodes:[];
  ps.forEach(p=>{
    if(!p)return;
    const ep=typeof calculerEnvelopePilotableBudgetSoft20260913_==='function'?calculerEnvelopePilotableBudgetSoft20260913_(p):null;
    if(!ep)return;
    const v=p.v37||(p.v37={}),c=v.cockpit20260902||(v.cockpit20260902={});
    const soutenable=Math.max(0,Number(c.pSoutenable!=null?c.pSoutenable:(c.p1Total!=null?c.p1Total:0)));
    const resteP=arrEnveloppeSante20260915_(soutenable-Number(ep.consomme||0));
    c.consommePilotable=arrEnveloppeSante20260915_(ep.consomme);
    c.ret1=resteP;c.pDisponible=resteP;
    c.epTotal=Number(ep.total||0);c.epConsomme=Number(ep.consomme||0);c.epDisponible=Number(ep.reste||0);
    v.ret1=resteP;v.disponibleEnveloppes=Number(ep.reste||0);
    p.resteBudgetPilotable=resteP;p.resteBudgetAlloue=Number(ep.reste||0);p.enveloppePilotable=ep;
  });
  return base;
}

function auditerEnveloppeSanteSnapshot20260915(){
  const s=typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():null,e=s&&s.disponible&&s.etat||{},c=e&&e.modules&&e.modules.cerbere||{},diag=c&&c.diagnostic&&c.diagnostic.enveloppeSante20260915||{},ps=Array.isArray(c&&c.periodes)?c.periodes:[];
  const cycles=ps.map((p,index)=>{const x=(p.enveloppes||[]).find(y=>estCategorieSante20260915_(y&&y.categorie))||{},v=p.v37||{},co=v.cockpit20260902||{};return{index:index+1,cle:String(p.clePilotage||''),allocation:arrEnveloppeSante20260915_(x.prevu||0),depensesBrutes:arrEnveloppeSante20260915_(x.reelSanteBrut20260915||0),remboursementsEncaisses:arrEnveloppeSante20260915_(x.remboursementsSanteEncaisses20260915||0),consommationNette:arrEnveloppeSante20260915_(x.reelNetPrevisionnel||0),disponibleSante:arrEnveloppeSante20260915_(Number(x.prevu||0)-Number(x.reelNetPrevisionnel||0)),epConsomme:arrEnveloppeSante20260915_(co.epConsomme||0),pDisponible:arrEnveloppeSante20260915_(co.pDisponible!=null?co.pDisponible:co.ret1||0)};});
  const out={ok:String(diag.version||'')===BUDGETSOFT_ENVELOPPE_SANTE_20260915_VERSION,version:BUDGETSOFT_ENVELOPPE_SANTE_20260915_VERSION,revisionBudgetSoft:String(e.revisionBudgetSoft||''),owner:String(diag.proprietaire||''),cycles:cycles};
  console.log('[AUDIT ENVELOPPE SANTE 20260915] '+JSON.stringify(out));return out;
}
