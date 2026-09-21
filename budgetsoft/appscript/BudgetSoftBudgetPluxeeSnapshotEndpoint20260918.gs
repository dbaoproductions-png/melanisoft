const BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION='2026-09-21.1';

/*
 * Budget et Pluxee restent propriétaires de leurs calculs/écritures.
 * Les moteurs sources sont explicitement nommés dans BudgetPlan.gs et Pluxee.gs.
 * Ce fichier expose les points d'entrée publics snapshot-first, sans dépendre de
 * l'ordre lexical de chargement. Budget n'est snapshoté que pour la période courante.
 */
function servirBudgetDepuisSnapshotBudgetSoft20260918_(clePeriode){
  try{
    const cle=String(clePeriode||'').trim();
    const m=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'?lireModuleSnapshotGlobalBudgetSoft20260906_('budget'):null;
    if(!m||typeof m!=='object')return null;
    const cleSnapshot=String(m&&m.periode&&m.periode.cle||'');
    if(cle&&cleSnapshot&&cle!==cleSnapshot)return null;
    const r=JSON.parse(JSON.stringify(m));
    r.sourceBudgetSoft='snapshot_global';
    r.versionSnapshotBudgetPluxee=BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION;
    return r;
  }catch(e){return null;}
}

function servirPluxeeDepuisSnapshotBudgetSoft20260918_(){
  try{
    const m=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'?lireModuleSnapshotGlobalBudgetSoft20260906_('pluxee'):null;
    if(!m||typeof m!=='object')return null;
    const r=JSON.parse(JSON.stringify(m));
    r.sourceBudgetSoft='snapshot_global';
    r.versionSnapshotBudgetPluxee=BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION;
    return r;
  }catch(e){return null;}
}

function chargerBudgetPeriode(clePeriode){
  const snap=servirBudgetDepuisSnapshotBudgetSoft20260918_(clePeriode);
  return snap||{ok:false,sourceBudgetSoft:'snapshot_global_indisponible',versionSnapshotBudgetPluxee:BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION,erreur:'Budget courant absent du snapshot global.'};
}

function chargerPluxee(){
  const snap=servirPluxeeDepuisSnapshotBudgetSoft20260918_();
  return snap||{ok:false,sourceBudgetSoft:'snapshot_global_indisponible',versionSnapshotBudgetPluxee:BUDGETSOFT_BUDGET_PLUXEE_SNAPSHOT_20260918_VERSION,erreur:'Pluxee absent du snapshot global.'};
}

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
