/*
 * BudgetSoft — fraîcheur snapshot après mutation des charges fixes — 2026-09-14.
 *
 * Doctrine : Charges_fixes reste propriétaire du référentiel. Le snapshot global
 * orchestre une révision commune mais ne doit jamais republier une ancienne
 * révision après activation/désactivation/clôture d'une charge fixe.
 */
const BUDGETSOFT_CF_SNAPSHOT_FRESHNESS_20260914_VERSION='2026-09-14.1';

function nombreChargesFixesActives20260914_(){
  const charges=typeof lireTable_==='function'?(lireTable_('Charges_fixes')||[]):[];
  return charges.filter(c=>typeof estActifP1Cerbere20260912_==='function'
    ?estActifP1Cerbere20260912_(c&&c.actif)
    :(c&&c.actif===true||String(c&&c.actif||'').toLowerCase()==='true'||String(c&&c.actif||'')==='1')).length;
}

function reconstruireSnapshotApresMutationChargeFixe20260914_(origine){
  try{
    if(typeof reconstruireSnapshotGlobalBudgetSoft20260906==='function'){
      return reconstruireSnapshotGlobalBudgetSoft20260906(String(origine||'mutation_charge_fixe'));
    }
  }catch(e){
    console.warn('[CF SNAPSHOT FRESHNESS] reconstruction différée: '+String(e&&e.message||e));
    return {ok:false,erreur:String(e&&e.message||e)};
  }
  return {ok:false,indisponible:true};
}

/*
 * Garde terminale : on conserve toutes les validations doctrinales C1/C2
 * existantes et on ajoute la fraîcheur minimale du propriétaire Charges_fixes.
 * Un simple changement actif/inactif suffit à rendre l'ancienne révision impropre
 * à la publication. Les mutations futures reconstruisent ensuite le snapshot.
 */
function estSnapshotCerbereP1FraisValide20260912_(s){
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

  const actuelles=nombreChargesFixesActives20260914_();
  const cf0=s&&s.cf0||{};
  const snapActives=Number(cf0.nombreActives);
  if(!Number.isFinite(snapActives)||snapActives!==actuelles)return false;
  return true;
}

/* Override ciblé du CRUD Charges fixes : même comportement, puis nouvelle révision. */
function sauvegarderChargeFixeReview20260828(charge){
  if(!charge||typeof charge!=='object')throw new Error('Charge fixe invalide.');
  const existante=charge.id?lireTable_('Charges_fixes').find(c=>String(c.id)===String(charge.id)):null;
  const fusion=Object.assign({},existante||{},charge);
  ['dernier_rapprochement_id','dernier_rapprochement_date','dernier_montant_reel','statut_rapprochement'].forEach(k=>{if(existante&&charge[k]===undefined)fusion[k]=existante[k];});
  enregistrerLigne('Charges_fixes',fusion);
  if(typeof supprimerSnapshotChargesFixes20260828_==='function')supprimerSnapshotChargesFixes20260828_();
  const snapshot=reconstruireSnapshotApresMutationChargeFixe20260914_('mutation_charge_fixe');
  const data=chargerChargesFixesReview20260828();
  data._snapshotGlobal20260914={ok:!!(snapshot&&snapshot.ok),version:BUDGETSOFT_CF_SNAPSHOT_FRESHNESS_20260914_VERSION};
  return data;
}

function supprimerChargeFixeReview20260828(id){
  const ok=supprimerLigne('Charges_fixes',id);
  if(typeof supprimerSnapshotChargesFixes20260828_==='function')supprimerSnapshotChargesFixes20260828_();
  const snapshot=reconstruireSnapshotApresMutationChargeFixe20260914_('suppression_charge_fixe');
  const data=chargerChargesFixesReview20260828();
  return Object.assign({supprimee:ok,_snapshotGlobal20260914:{ok:!!(snapshot&&snapshot.ok),version:BUDGETSOFT_CF_SNAPSHOT_FRESHNESS_20260914_VERSION}},data);
}

/*
 * Clôture structurelle depuis Plan : date_fin est l'écriture canonique, puis la
 * révision BudgetSoft est reconstruite. Le Plan ne porte jamais directement le
 * +gain dans Pn.
 */
function cloturerChargeFixeDepuisActionV3(actionId,dateEffet){
  assurerPlanActionsV3_();
  const a=lireFeuilleDynamiquePlan_('Plan_Actions').find(x=>String(x.id)===String(actionId));
  if(!a||a.source_type!=='charge_fixe'||!a.source_id)throw new Error('Cette action n’est pas adossée à une charge fixe.');
  if(!(a.impact_confirme===true||String(a.impact_confirme)==='true'))throw new Error('L’impact doit être confirmé avant de modifier le référentiel.');
  const sh=SpreadsheetApp.getActive().getSheetByName('Charges_fixes');
  const hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),idc=hs.indexOf('id'),fc=hs.indexOf('date_fin'),ac=hs.indexOf('actif');
  if(idc<0||fc<0)throw new Error('Colonnes Charges_fixes incompatibles.');
  const ids=sh.getRange(2,idc+1,Math.max(0,sh.getLastRow()-1),1).getValues().flat(),p=ids.findIndex(x=>String(x)===String(a.source_id));
  if(p<0)throw new Error('Charge fixe liée introuvable.');
  const d=new Date(dateEffet||a.date_effet);if(isNaN(d))throw new Error('Date de réalisation invalide.');
  sh.getRange(p+2,fc+1).setValue(d);
  if(ac>=0)sh.getRange(p+2,ac+1).setValue(false);
  if(typeof supprimerSnapshotChargesFixes20260828_==='function')supprimerSnapshotChargesFixes20260828_();
  const snapshot=reconstruireSnapshotApresMutationChargeFixe20260914_('plan_action_structurelle_charge_fixe');
  return {ok:true,date_fin:d.toISOString(),snapshotGlobal:!!(snapshot&&snapshot.ok)};
}

function auditerFraicheurChargesFixesSnapshot20260914(){
  const actuelles=nombreChargesFixesActives20260914_();
  let snap=null;try{if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function')snap=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();}catch(e){}
  const snapActives=Number(snap&&snap.cf0&&snap.cf0.nombreActives);
  return {ok:Number.isFinite(snapActives)&&snapActives===actuelles,version:BUDGETSOFT_CF_SNAPSHOT_FRESHNESS_20260914_VERSION,chargesActivesActuelles:actuelles,chargesActivesSnapshot:Number.isFinite(snapActives)?snapActives:null,snapshotValide:estSnapshotCerbereP1FraisValide20260912_(snap)};
}
