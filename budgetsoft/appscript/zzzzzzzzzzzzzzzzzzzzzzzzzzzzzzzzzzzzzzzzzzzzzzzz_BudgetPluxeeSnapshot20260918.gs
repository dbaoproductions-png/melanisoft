const BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION='2026-09-18.1';

/*
 * Budget et Pluxee restent propriétaires de leurs calculs/écritures.
 * Ce fichier ne fait que capturer leurs lecteurs source et publier une lecture
 * snapshot-first. Budget n'est snapshoté que pour la période courante, qui est
 * la seule préchargée aujourd'hui par l'interface.
 */
var chargerBudgetPeriodeSource20260918_=chargerBudgetPeriode;
var chargerPluxeeSource20260918_=chargerPluxee;

function servirBudgetDepuisSnapshotBudgetSoft20260918_(clePeriode){
  try{
    const cle=String(clePeriode||'').trim();
    const s=chargerSnapshotGlobalBudgetSoft20260906();
    const e=s&&s.disponible&&s.etat,m=e&&e.modules&&e.modules.budget;
    if(!m||typeof m!=='object')return null;
    const cleSnapshot=String(m&&m.periode&&m.periode.cle||'');
    if(cle&&cleSnapshot&&cle!==cleSnapshot)return null;
    const r=JSON.parse(JSON.stringify(m));
    r.sourceBudgetSoft='snapshot_global';
    r.revisionBudgetSoft=String(e.revisionBudgetSoft||'');
    r.versionSnapshotBudgetPluxee=BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION;
    return r;
  }catch(e){return null;}
}

function servirPluxeeDepuisSnapshotBudgetSoft20260918_(){
  try{
    const s=chargerSnapshotGlobalBudgetSoft20260906();
    const e=s&&s.disponible&&s.etat,m=e&&e.modules&&e.modules.pluxee;
    if(!m||typeof m!=='object')return null;
    const r=JSON.parse(JSON.stringify(m));
    r.sourceBudgetSoft='snapshot_global';
    r.revisionBudgetSoft=String(e.revisionBudgetSoft||'');
    r.versionSnapshotBudgetPluxee=BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION;
    return r;
  }catch(e){return null;}
}

chargerBudgetPeriode=function(clePeriode){
  const snap=servirBudgetDepuisSnapshotBudgetSoft20260918_(clePeriode);
  if(snap)return snap;
  const r=chargerBudgetPeriodeSource20260918_(clePeriode);
  if(r&&typeof r==='object'){
    r.sourceBudgetSoft='recalcul_secours';
    r.versionSnapshotBudgetPluxee=BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION;
  }
  return r;
};

chargerPluxee=function(){
  const snap=servirPluxeeDepuisSnapshotBudgetSoft20260918_();
  if(snap)return snap;
  const r=chargerPluxeeSource20260918_();
  if(r&&typeof r==='object'){
    r.sourceBudgetSoft='recalcul_secours';
    r.versionSnapshotBudgetPluxee=BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION;
  }
  return r;
};

function auditerBudgetPluxeeSnapshotBudgetSoft20260918(){
  const b=chargerBudgetPeriode(''),p=chargerPluxee();
  const out={
    ok:!!(b&&p&&b.sourceBudgetSoft==='snapshot_global'&&p.sourceBudgetSoft==='snapshot_global'&&b.revisionBudgetSoft&&b.revisionBudgetSoft===p.revisionBudgetSoft),
    version:BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION,
    budget:{source:b&&b.sourceBudgetSoft||'',revisionBudgetSoft:b&&b.revisionBudgetSoft||'',cle:b&&b.periode&&b.periode.cle||'',postes:Array.isArray(b&&b.postes)?b.postes.length:0},
    pluxee:{source:p&&p.sourceBudgetSoft||'',revisionBudgetSoft:p&&p.revisionBudgetSoft||'',operations:Array.isArray(p&&p.operations)?p.operations.length:0,solde:Number(p&&p.solde||0)}
  };
  console.log('[AUDIT BUDGET PLUXEE SNAPSHOT 20260918] '+JSON.stringify(out));
  return out;
}
