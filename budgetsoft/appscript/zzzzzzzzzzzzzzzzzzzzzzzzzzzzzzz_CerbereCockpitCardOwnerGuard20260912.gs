/*
 * Garde terminale des cartes Cerbère — 2026-09-12.
 *
 * Doctrine : aucune formule métier nouvelle. Cette couche ne calcule rien :
 * elle valide la fraîcheur du snapshot Cerbère puis republie vers les champs
 * consommés par l'UI les valeurs déjà calculées par le propriétaire P1.
 * Un snapshot ancien est refusé et le moteur P1 autoritaire est appelé.
 */
const CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION='2026-09-12.1';

function estSnapshotCerbereP1FraisValide20260912_(s){
  if(!s||s.ok===false)return false;
  const p=Array.isArray(s.periodes)&&s.periodes.length?s.periodes[0]:null;
  const v=p&&p.v37||{};
  const d=s&&s.diagnostic&&s.diagnostic.p1Doctrine20260912||null;
  const due=s&&s.diagnostic&&s.diagnostic.rt1EvenementsCertainsDus20260912||null;
  if(!p||!d||!due)return false;
  if(String(due.version||'')!==String(typeof CERBERE_P1_INPUTS_FIX_20260912_VERSION!=='undefined'?CERBERE_P1_INPUTS_FIX_20260912_VERSION:''))return false;
  const rootVersion=String(s&&s.cockpit20260902&&s.cockpit20260902.version||'');
  if(rootVersion&&rootVersion!==String(CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION))return false;
  const n=x=>Number(x||0),arr=x=>Math.round(n(x)*100)/100;
  const attendu=arr(n(d.ss1)+n(d.rt1)-n(d.cft1)-n(d.het1)-n(d.cbHeritees));
  return Math.abs(attendu-n(d.p1))<0.011;
}

function publierValeursCartesDepuisOwnerP120260912_(base){
  if(!base||base.ok===false)return base;
  const p=Array.isArray(base.periodes)&&base.periodes.length?base.periodes[0]:null;
  const v=p&&p.v37||(p?p.v37={}:{});
  const c=v&&v.cockpit20260902||(v?v.cockpit20260902={}:{});
  const d=base&&base.diagnostic&&base.diagnostic.p1Doctrine20260912||null;
  if(!p||!d)return base;
  const cf=v.cft1Audit20260912||c&&c.detailActualise&&c.detailActualise.chargesFixesAudit||{};
  c.p0Total=Number(d.p0||0);
  c.p1Total=Number(d.p1||0);
  c.p1Cible=Number(d.p1||0);
  c.consommePilotable=Number(d.consommePilotable||0);
  c.ret1=Number(d.restePilotable||0);
  c.surplusVsP0=Number(d.surplusDeficitVsP0||0);
  c.budgetRepartiMolettes=Number(d.allocations||0);
  c.aRepartirDansPostes=Number(d.surplusDeficitAVentiler||0);
  c.margeARepartir=Number(d.surplusDeficitAVentiler||0);
  v.ret1=Number(d.restePilotable||0);
  v.rt1=Number(d.rt1||0);
  v.cft1=Number(d.cft1||0);
  v.het1Reel=Number(d.het1||0);
  if(Number.isFinite(Number(cf.brutAvantSuspensions)))v.chargesFixesTotal=Number(cf.brutAvantSuspensions);
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.publicationCartesP120260912={version:CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION,source:'diagnostic.p1Doctrine20260912',sansRecalculMetier:true};
  return base;
}

/* Override terminal de l'entrée UI Cerbère. */
function chargerCerbereCockpit20260902(){
  try{
    if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function'){
      const snapshot=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();
      if(snapshot&&snapshot.ok!==false&&snapshot.source==='snapshot_global'&&estSnapshotCerbereP1FraisValide20260912_(snapshot)){
        snapshot.sourceBudgetSoft='snapshot_global';
        snapshot.versionSnapshotFirst=CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION;
        return publierValeursCartesDepuisOwnerP120260912_(snapshot);
      }
    }
  }catch(e){}
  const frais=recalculerCerbereCockpitP1Frais20260912_();
  return publierValeursCartesDepuisOwnerP120260912_(frais);
}

function auditerValeursCartesCerbereOwner20260912(){
  const x=chargerCerbereCockpit20260902(),p=x&&Array.isArray(x.periodes)?x.periodes[0]:null,v=p&&p.v37||{},c=v.cockpit20260902||{},d=x&&x.diagnostic&&x.diagnostic.p1Doctrine20260912||{};
  const out={ok:!!p,version:CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION,source:x&&x.sourceBudgetSoft||'',cartes:{p1:Number(c.p1Total||0),encoreDisponible:Number(c.ret1||0),surplusVsP0:Number(c.surplusVsP0||0),surplusDeficitAVentiler:Number(c.margeARepartir||0),rt1:Number(v.rt1||0),cft1:Number(v.cft1||0),het1:Number(v.het1Reel||0)},owner:{p1:Number(d.p1||0),encoreDisponible:Number(d.restePilotable||0),surplusVsP0:Number(d.surplusDeficitVsP0||0),surplusDeficitAVentiler:Number(d.surplusDeficitAVentiler||0),rt1:Number(d.rt1||0),cft1:Number(d.cft1||0),het1:Number(d.het1||0)},sansRecalculMetier:true};
  out.ok=out.ok&&JSON.stringify(out.cartes)===JSON.stringify(out.owner);
  console.log('[AUDIT CARTES CERBERE OWNER 20260912] '+JSON.stringify(out));
  return out;
}
