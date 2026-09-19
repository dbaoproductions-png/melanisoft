/*
 * Cerbère — garde de fraîcheur snapshot C2 canonique — 2026-09-13.
 *
 * Un snapshot antérieur à l'introduction de la frontière canonique C2 ne doit
 * jamais être republié par chargerCerbereCockpit20260902(). Il peut contenir un
 * P2 mathématiquement cohérent avec un ancien SS2 faux, ce qui ne suffit pas à
 * en faire une source valide.
 *
 * Une donnée, un propriétaire, un calcul, plusieurs consommateurs.
 */
const CERBERE_SNAPSHOT_C2_FRESHNESS_20260913_VERSION='2026-09-13.1';

function estSnapshotCerbereP1FraisValideLegacyC2Freshness20260913_(s){
  if(!s||s.ok===false)return false;
  const p=Array.isArray(s.periodes)&&s.periodes.length?s.periodes[0]:null;
  const d=s&&s.diagnostic&&s.diagnostic.p1Doctrine20260912||null;
  const ep=s&&s.diagnostic&&s.diagnostic.enveloppePilotable20260913||null;
  const due=s&&s.diagnostic&&s.diagnostic.rt1EvenementsCertainsDus20260912||null;
  const p2=s&&s.diagnostic&&s.diagnostic.p2Doctrine20260913||null;
  const ss2=s&&s.diagnostic&&s.diagnostic.ss2Canonique20260913||null;
  if(!p||!d||!due||!ep||!p2||!ss2)return false;
  if(String(due.version||'')!==String(typeof CERBERE_P1_INPUTS_FIX_20260912_VERSION!=='undefined'?CERBERE_P1_INPUTS_FIX_20260912_VERSION:''))return false;
  if(String(p2.version||'')!==String(typeof CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION!=='undefined'?CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION:''))return false;
  if(String(p2.frontiereVersion||'')!==String(typeof CERBERE_C2_CANONICAL_OPENING_20260913_VERSION!=='undefined'?CERBERE_C2_CANONICAL_OPENING_20260913_VERSION:''))return false;
  if(!ss2.frontiere||ss2.frontiere.ok!==true)return false;

  const n=x=>Number(x||0),arr=x=>Math.round(n(x)*100)/100;
  const attenduP1=arr(n(d.ss1)+n(d.rt1)-n(d.cft1)-n(d.het1)-n(d.cbHeritees));
  const attenduP2=Math.max(0,arr(n(p2.ss2)+n(p2.rt2)-n(p2.cft2)-n(p2.het2)-n(p2.reportCb)));
  if(Math.abs(attenduP1-n(d.p1))>=.011)return false;
  if(Math.abs(n(ep.ep)-n(d.allocations))>=.011)return false;
  if(Math.abs(attenduP2-n(p2.p2))>=.011)return false;
  if(Math.abs(n(ss2.frontiere.ss2)-n(p2.ss2))>=.011)return false;
  return true;
}

function auditerFraicheurSnapshotC2Cerbere20260913(){
  let snapshot=null;
  try{if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function')snapshot=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();}catch(e){}
  const snapshotValide=typeof estSnapshotCerbereP1FraisValide20260912_==='function'\n    ?estSnapshotCerbereP1FraisValide20260912_(snapshot)\n    :estSnapshotCerbereP1FraisValideLegacyC2Freshness20260913_(snapshot);
  const cockpit=chargerCerbereCockpit20260902();
  const p2=cockpit&&Array.isArray(cockpit.periodes)?cockpit.periodes[1]:null,v=p2&&p2.v37||{},c=v.cockpit20260902||{},d=cockpit&&cockpit.diagnostic&&cockpit.diagnostic.p2Doctrine20260913||{},s=cockpit&&cockpit.diagnostic&&cockpit.diagnostic.ss2Canonique20260913||{};
  const out={
    ok:!!(p2&&Number.isFinite(Number(c.soldeInitialReference))&&Math.abs(Number(c.soldeInitialReference)-Number(d.ss2||0))<.011&&String(d.frontiereVersion||'')===String(CERBERE_C2_CANONICAL_OPENING_20260913_VERSION)),
    version:CERBERE_SNAPSHOT_C2_FRESHNESS_20260913_VERSION,
    snapshot:{present:!!snapshot,valide:snapshotValide,source:snapshot&&snapshot.source||'',p2FrontiereVersion:snapshot&&snapshot.diagnostic&&snapshot.diagnostic.p2Doctrine20260913&&snapshot.diagnostic.p2Doctrine20260913.frontiereVersion||'',aSs2Canonique:!!(snapshot&&snapshot.diagnostic&&snapshot.diagnostic.ss2Canonique20260913)},
    cockpit:{source:cockpit&&cockpit.sourceBudgetSoft||'',ss2:Number(d.ss2||0),p2:Number(d.p2||0),soldeInitialReference:Number(c.soldeInitialReference||0),frontiereVersion:String(d.frontiereVersion||''),frontiereOk:!!(s.frontiere&&s.frontiere.ok)}
  };
  console.log('[AUDIT FRAICHEUR SNAPSHOT C2 CERBERE 20260913] '+JSON.stringify(out));
  return out;
}
