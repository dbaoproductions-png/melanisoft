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

// Dashboard : responsabilité transférée à BudgetSoftDashboardCanonicalOwner20260918.gs.

// Garde recettes transférée à BudgetSoftRevenueSupradoctrineCanonicalGuard20260918.gs.

function auditerRecettesIntermodulesLegacyOwnerBudgetSoft20260912(){
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
