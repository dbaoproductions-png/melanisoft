const BUDGETSOFT_REVENUE_INTERMODULE_OWNER_20260912_VERSION='2026-09-12.1';

function arrRevenueOwner20260912_(n){return Math.round(Number(n||0)*100)/100;}
function normRevenueOwner20260912_(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function dateRevenueOwner20260912_(v){const d=v instanceof Date?new Date(v):new Date(v||0);if(isNaN(d))return null;d.setHours(0,0,0,0);return d;}
function evenementClosProuveRevenueOwner20260912_(ev){
  if(!ev)return false;
  const statut=normRevenueOwner20260912_(ev.statut);
  if(['annule','annulee','abandonne','abandonnee'].includes(statut))return true;
  if(String(ev.operation_reelle_id||'').trim())return true;
  const rap=normRevenueOwner20260912_(ev.rapprochement_statut||'');
  return ['rapproche','rapprochee','realise','realisee'].includes(rap);
}
function evenementRetardMaintenuRevenueOwner20260912_(ev){
  const s=normRevenueOwner20260912_(ev&&ev.statut);
  return ['effectif','effective','effectifs','effectives','realise a rapprocher','realisee a rapprocher'].includes(s);
}

// Dashboard : Rt1 Cerbere est l'unique proprietaire des recettes attendues du cycle.
var composerDashboardSyntheseBudgetSoftAvantRevenueOwner20260912_=composerDashboardSyntheseBudgetSoft20260907_;
composerDashboardSyntheseBudgetSoft20260907_=function(ctx){
  const r=composerDashboardSyntheseBudgetSoftAvantRevenueOwner20260912_(ctx);
  const cer=ctx&&ctx.cerbere||{},p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{};
  const rt1=Number(v.rt1);
  if(r&&r.courtTerme&&Number.isFinite(rt1)){
    r.courtTerme.revenusAttendus=arrRevenueOwner20260912_(rt1);
    r.courtTerme.revenusPrevisionnelsRestants=arrRevenueOwner20260912_(rt1-Number(r.courtTerme.revenusConstates||0));
    r.provenance=r.provenance||{};
    r.provenance.revenusAttendus='cerbere.periodes[0].v37.rt1';
    r.provenance.revenusPrevisionnels='projectionEtendue canonique ; aucun recalcul local dans Comptes';
    r.versionRevenueOwner=BUDGETSOFT_REVENUE_INTERMODULE_OWNER_20260912_VERSION;
  }
  return r;
};

// Remplace le garde recettes precedent : le Dashboard ne doit plus etre valide
// contre une formule locale reel + projection, mais contre le proprietaire Rt1.
verifierSupradoctrineRecettesBudgetSoft20260912_=function(etat){
  const erreurs=[],avertissements=[],m=etat&&etat.modules||{},dash=m.dashboard||{},ct=dash.courtTerme||{},cer=m.cerbere||{},proj=m.projectionEtendue||{};
  const p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},rt1=Number(v.rt1),publie=Number(ct.revenusAttendus);
  const revision=String(etat&&etat.revisionBudgetSoft||'');
  if(!revision)erreurs.push({code:'SUPRA_RECETTES_REVISION_ABSENTE',message:'revisionBudgetSoft absente.'});
  if(!Number.isFinite(rt1))erreurs.push({code:'SUPRA_RECETTES_RT1_ABSENT',message:'Rt1 Cerbere absent ou non numerique : aucune recette attendue ne peut etre publiee.'});
  if(Number.isFinite(rt1)&&(!Number.isFinite(publie)||Math.abs(arrRevenueOwner20260912_(publie)-arrRevenueOwner20260912_(rt1))>0.01)){
    erreurs.push({code:'SUPRA_RECETTES_INTERMODULE_RT1',message:'Dashboard.revenusAttendus doit etre strictement egal au Rt1 Cerbere de la meme revision.',detail:{revisionBudgetSoft:revision,dashboard:arrRevenueOwner20260912_(publie),cerbereRt1:arrRevenueOwner20260912_(rt1)}});
  }
  const owner=String(proj&&proj.proprietaireBudgetSoft||proj&&proj.proprietaire||'');
  if(owner&&owner!=='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907'){
    erreurs.push({code:'SUPRA_RECETTES_PROJECTION_OWNER',message:'projectionEtendue n utilise pas le proprietaire canonique attendu.',detail:{proprietaire:owner}});
  }
  const reference=dateRevenueOwner20260912_(ct.dateReference),fin=dateRevenueOwner20260912_(ct.fin),lignes=Array.isArray(proj.lignes)?proj.lignes:[];
  let evenements=[];try{evenements=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):[];}catch(e){erreurs.push({code:'SUPRA_EVENEMENTS_LECTURE',message:String(e&&e.message||e)});}
  const controles=[];
  (evenements||[]).forEach(function(ev){
    const type=String(ev&&ev.type||'').trim().toLowerCase();if(type!=='recette'&&type!=='depense')return;
    if(evenementClosProuveRevenueOwner20260912_(ev))return;
    let dr=null;try{dr=typeof datePlanTresorerie_==='function'?datePlanTresorerie_(ev,reference||new Date(),false):null;}catch(e){}
    const origine=dr&&dr.date?dateRevenueOwner20260912_(dr.date):null;if(!origine||!fin||origine>fin)return;
    if(reference&&origine<=reference&&!evenementRetardMaintenuRevenueOwner20260912_(ev))return;
    const eventLines=lignes.filter(function(l){return String(l&&l.source||'')==='evenement'&&String(l&&l.sourceId||'')===String(ev.id||'');});
    const c={id:String(ev.id||''),libelle:String(ev.libelle||''),statut:String(ev.statut||''),operationReelleId:String(ev.operation_reelle_id||''),rapprochementStatut:String(ev.rapprochement_statut||''),couvert:eventLines.length>0,montant:Math.abs(Number(ev.montant||0))};
    controles.push(c);if(!c.couvert)erreurs.push({code:'SUPRA_EVENEMENT_DU_DISPARU',message:'Un evenement encore du a disparu de la projection canonique.',detail:c});
  });
  return {ok:erreurs.length===0,version:BUDGETSOFT_REVENUE_INTERMODULE_OWNER_20260912_VERSION,doctrine:{proprietaireRecettesAttendues:'cerbere.periodes[0].v37.rt1',dashboard:'consommateur strict de Rt1',comptes:'consommateur de projectionEtendue via chargerTresorerieUnifieeBudgetSoft20260907',principe:'une donnee, un proprietaire, un calcul, plusieurs consommateurs'},intermodule:{revisionBudgetSoft:revision,cerbereRt1:Number.isFinite(rt1)?arrRevenueOwner20260912_(rt1):null,dashboardRevenusAttendus:Number.isFinite(publie)?arrRevenueOwner20260912_(publie):null,projectionOwner:owner||null},evenementsDus:controles,erreurs:erreurs,avertissements:avertissements};
};

function auditerRecettesIntermodulesBudgetSoft20260912(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  if(!s||!s.disponible){const x={ok:false,version:BUDGETSOFT_REVENUE_INTERMODULE_OWNER_20260912_VERSION,erreur:'Snapshot global indisponible.'};console.log('[AUDIT recettes intermodules] '+JSON.stringify(x));return x;}
  const etat=s.etat||{},garde=verifierSupradoctrineRecettesBudgetSoft20260912_(etat),m=etat.modules||{},cer=m.cerbere||{},p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},periode=p&&(p.periode||p)||{};
  let unite={ok:false,erreur:'Audit Comptes/Cerbere indisponible'};
  try{
    const cible=String(periode.fin||'');
    const comptes=chargerTresorerieUnifieeBudgetSoft20260907(cible);
    const banqueCerbere=chargerTrajectoireBanqueCerbereRapide20260903(cible,cer);
    const sig=function(xs){return (xs||[]).map(function(l){return [String(l&&l.date||'').slice(0,10),String(l&&l.source||''),String(l&&l.sourceId||''),arrRevenueOwner20260912_(l&&l.montantSigne)].join('|');}).sort();};
    unite={ok:String(comptes&&comptes.revisionBudgetSoft||'')===String(etat.revisionBudgetSoft||'')&&String(banqueCerbere&&banqueCerbere.revisionBudgetSoft||'')===String(etat.revisionBudgetSoft||'')&&JSON.stringify(sig(comptes&&comptes.lignes))===JSON.stringify(sig(banqueCerbere&&banqueCerbere.lignes)),revisionComptes:String(comptes&&comptes.revisionBudgetSoft||''),revisionCerbere:String(banqueCerbere&&banqueCerbere.revisionBudgetSoft||''),nombreLignesComptes:(comptes&&comptes.lignes||[]).length,nombreLignesCerbere:(banqueCerbere&&banqueCerbere.lignes||[]).length,proprietaireComptes:String(comptes&&comptes.proprietaireBudgetSoft||''),sourceCerbere:String(banqueCerbere&&banqueCerbere.sourceBudgetSoft||'')};
  }catch(e){unite={ok:false,erreur:String(e&&e.message||e)};}
  const out={ok:garde.ok===true&&unite.ok===true,version:BUDGETSOFT_REVENUE_INTERMODULE_OWNER_20260912_VERSION,revisionBudgetSoft:String(etat.revisionBudgetSoft||''),cerbereRt1:arrRevenueOwner20260912_(v.rt1),dashboardRevenusAttendus:arrRevenueOwner20260912_(m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.revenusAttendus),gardePublication:garde,uniteProjectionComptesCerbere:unite};
  console.log('[AUDIT recettes intermodules] '+JSON.stringify(out));return out;
}
