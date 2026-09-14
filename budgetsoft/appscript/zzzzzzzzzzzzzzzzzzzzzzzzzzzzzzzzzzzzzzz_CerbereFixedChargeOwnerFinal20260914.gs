/*
 * Cerbère — propriétaire canonique Charges_fixes — 2026-09-14.
 *
 * Doctrine : Charges_fixes possède la prévision de charges fixes. Cerbère ne
 * recalcule pas une doctrine parallèle et ne revient jamais à un ancien CFt1
 * simplement parce qu'une charge n'est pas mensuelle. Toutes les fréquences
 * passent par le générateur canonique d'échéances BudgetSoft.
 */
const CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION='2026-09-14.2';

function reconstruireChargesFixesReevalueesP1Cerbere20260912_(p,v){
  const periode=p&&p.periode||p||{};
  const debut=dateCockpit20260902_(periode.debut),fin=dateCockpit20260902_(periode.fin);
  if(!debut||!fin)return{ok:false,erreur:'bornes période invalides',total:Number(v&&v.cft1||0),ownerVersion:CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION};
  if(typeof calculerEcheancesChargeFixeAjustees_!=='function')return{ok:false,erreur:'générateur canonique Charges_fixes indisponible',total:Number(v&&v.cft1||0),ownerVersion:CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION};

  const charges=lireTable_('Charges_fixes')||[],ops0=lireTable_('Operations')||[];
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  const lienValide={};
  (rapprochements||[]).forEach(r=>{
    if(!estRapprochementValideP1Cerbere20260912_(r))return;
    const opId=String(r&&r.operation_id||'').trim(),cfId=String(r&&r.charge_fixe_id||'').trim();
    if(opId&&cfId)lienValide[opId]=cfId;
  });

  const reelsParCf={};
  operations.forEach(o=>{
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||m>=0)return;
    const d=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):dateCockpit20260902_(o&&(o.date_comptable||o.date));
    if(!d||jourCivilP1Cerbere20260912_(d)<jourCivilP1Cerbere20260912_(debut)||jourCivilP1Cerbere20260912_(d)>jourCivilP1Cerbere20260912_(fin))return;
    const opId=String(o&&o.id||'').trim(),cfId=String(o&&o.charge_fixe_id||'').trim()||(opId&&lienValide[opId]||'');
    if(!cfId)return;
    if(!reelsParCf[cfId])reelsParCf[cfId]={total:0,nombre:0};
    reelsParCf[cfId].total+=Math.abs(m);reelsParCf[cfId].nombre++;
  });

  let brut=0;const lignes=[],erreurs=[];
  (charges||[]).forEach(c=>{
    if(!estActifP1Cerbere20260912_(c&&c.actif))return;
    let occs=[];
    try{
      occs=(calculerEcheancesChargeFixeAjustees_(c,debut,fin,fin)||[]).filter(e=>{
        const d=dateCockpit20260902_(e&&e.date);return d&&jourCivilP1Cerbere20260912_(d)>=jourCivilP1Cerbere20260912_(debut)&&jourCivilP1Cerbere20260912_(d)<=jourCivilP1Cerbere20260912_(fin);
      });
    }catch(e){erreurs.push({id:String(c&&c.id||''),libelle:String(c&&c.libelle||''),erreur:String(e&&e.message||e)});return;}
    if(!occs.length)return;

    const id=String(c&&c.id||''),prevu=occs.reduce((s,e)=>s+Math.abs(Number(e&&e.montant||0)),0),reel=reelsParCf[id]||null;
    let retenu=prevu,source='prévision canonique';
    if(reel){
      const couvert=Math.min(Math.max(0,Number(reel.nombre||0)),occs.length);
      const prevuCouvert=occs.slice(0,couvert).reduce((s,e)=>s+Math.abs(Number(e&&e.montant||0)),0);
      retenu=Math.max(0,Number(reel.total||0)+Math.max(0,prevu-prevuCouvert));
      source='réel explicite + occurrences restantes';
    }
    brut+=retenu;
    lignes.push({
      id:id,libelle:String(c&&c.libelle||''),frequence:String(c&&c.frequence||'Mensuelle'),
      occurrences:occs.length,dates:occs.map(e=>Utilities.formatDate(dateCockpit20260902_(e.date),Session.getScriptTimeZone(),'yyyy-MM-dd')),
      prevu:arrCockpit20260902_(prevu),reel:reel?arrCockpit20260902_(reel.total):null,retenu:arrCockpit20260902_(retenu),source:source
    });
  });

  if(erreurs.length)return{ok:false,erreur:'échec du générateur canonique sur '+erreurs.length+' charge(s)',erreurs:erreurs,total:Number(v&&v.cft1||0),ownerVersion:CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION};
  brut=arrCockpit20260902_(brut);
  const suspension=arrCockpit20260902_(Math.max(0,Number(v&&v.correctionSuspensions20260903||0)));
  const total=arrCockpit20260902_(Math.max(0,brut-suspension)),ancien=arrCockpit20260902_(Number(v&&v.cft1||0));
  return{ok:true,total:total,brutAvantSuspensions:brut,suspensions:suspension,ancienMoteur:ancien,ecartVsAncien:arrCockpit20260902_(total-ancien),lignes:lignes,ownerVersion:CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION,doctrine:'Toutes les fréquences proviennent du générateur canonique Charges_fixes ; le Réel explicitement lié remplace les occurrences couvertes ; aucune fréquence non mensuelle ne déclenche de retour à un ancien total.'};
}

function estSnapshotCerbereP1FraisValide20260912_(s){
  if(!s||s.ok===false)return false;
  const p=Array.isArray(s.periodes)&&s.periodes.length?s.periodes[0]:null;
  const d=s&&s.diagnostic&&s.diagnostic.p1Doctrine20260912||null,ep=s&&s.diagnostic&&s.diagnostic.enveloppePilotable20260913||null,due=s&&s.diagnostic&&s.diagnostic.rt1EvenementsCertainsDus20260912||null,p2=s&&s.diagnostic&&s.diagnostic.p2Doctrine20260913||null,ss2=s&&s.diagnostic&&s.diagnostic.ss2Canonique20260913||null;
  if(!p||!d||!due||!ep||!p2||!ss2)return false;
  if(String(due.version||'')!==String(typeof CERBERE_P1_INPUTS_FIX_20260912_VERSION!=='undefined'?CERBERE_P1_INPUTS_FIX_20260912_VERSION:''))return false;
  if(String(p2.version||'')!==String(typeof CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION!=='undefined'?CERBERE_COCKPIT_CARD_OWNER_GUARD_20260912_VERSION:''))return false;
  if(String(p2.frontiereVersion||'')!==String(typeof CERBERE_C2_CANONICAL_OPENING_20260913_VERSION!=='undefined'?CERBERE_C2_CANONICAL_OPENING_20260913_VERSION:''))return false;
  if(!ss2.frontiere||ss2.frontiere.ok!==true)return false;
  if(String(d&&d.cft1Audit&&d.cft1Audit.ownerVersion||'')!==CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION)return false;
  if(String(p2&&p2.cft2Audit&&p2.cft2Audit.ownerVersion||'')!==CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION)return false;
  const n=x=>Number(x||0),arr=x=>Math.round(n(x)*100)/100;
  const attenduP1=arr(n(d.ss1)+n(d.rt1)-n(d.cft1)-n(d.het1)-n(d.cbHeritees)),attenduP2=Math.max(0,arr(n(p2.ss2)+n(p2.rt2)-n(p2.cft2)-n(p2.het2)-n(p2.reportCb)));
  return Math.abs(attenduP1-n(d.p1))<.011&&Math.abs(n(ep.ep)-n(d.allocations))<.011&&Math.abs(attenduP2-n(p2.p2))<.011&&Math.abs(n(ss2.frontiere.ss2)-n(p2.ss2))<.011;
}

/* Entrée publique terminale : un snapshot pré-correctif ne peut plus contourner la garde. */
function chargerCerbereCockpit20260902(){
  try{
    if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function'){
      const snapshot=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();
      if(snapshot&&snapshot.ok!==false&&snapshot.source==='snapshot_global'&&estSnapshotCerbereP1FraisValide20260912_(snapshot)){
        snapshot.sourceBudgetSoft='snapshot_global';snapshot.versionSnapshotFirst=CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION;return snapshot;
      }
    }
  }catch(e){}
  const frais=recalculerCerbereCockpitP1Frais20260912_();
  if(frais){frais.sourceBudgetSoft='recalcul_frais_cf_owner_20260914';frais.versionSnapshotFirst=CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION;}
  return frais;
}

function auditerOwnerChargesFixesCerbere20260914(){
  const r=chargerCerbereCockpit20260902(),p1=r&&r.diagnostic&&r.diagnostic.p1Doctrine20260912||{},p2=r&&r.diagnostic&&r.diagnostic.p2Doctrine20260913||{};
  const o1=String(p1&&p1.cft1Audit&&p1.cft1Audit.ownerVersion||''),o2=String(p2&&p2.cft2Audit&&p2.cft2Audit.ownerVersion||'');
  const out={ok:o1===CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION&&o2===CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION,version:CERBERE_FIXED_CHARGE_OWNER_FINAL_20260914_VERSION,source:r&&r.sourceBudgetSoft||'',c1:{cf:Number(p1.cft1||0),ownerVersion:o1},c2:{cf:Number(p2.cft2||0),p2:Number(p2.p2||0),ownerVersion:o2}};
  console.log('[AUDIT OWNER CHARGES FIXES CERBERE 20260914] '+JSON.stringify(out));return out;
}
