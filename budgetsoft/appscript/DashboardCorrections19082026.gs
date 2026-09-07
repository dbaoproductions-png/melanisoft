const DASHBOARD_CORRECTIONS_19082026_VERSION = '2.5';

function normaliserTexteCreditDashboard2026_(v) {try { return normaliserTexteBanque_(String(v || '')); }catch (e) { return String(v || '').toUpperCase(); }}
function creditPourChargeDashboard2026_(charge, credits) {const t=normaliserTexteCreditDashboard2026_([charge.libelle||'',charge.libelle_bancaire||''].join(' '));const candidats=(credits||[]).filter(c=>{const tc=normaliserTexteCreditDashboard2026_([c.nom||'',c.numero_pret||''].join(' '));if(/ACCESSIO/.test(t))return/ACCESSIO/.test(tc);if(/CASDEN/.test(t))return/CASDEN/.test(tc);if(/CREATIS/.test(t))return/CREATIS/.test(tc);if(/FLOA|CDISCOUNT/.test(t))return/FLOA|CDISCOUNT/.test(tc);if(/ONEY|BANQUE ACCORD/.test(t))return/ONEY|CARTE B/.test(tc);if(/CARREFOUR|PASS/.test(t))return/CARREFOUR.*PASS/.test(tc);if(/COFIDIS/.test(t))return/COFIDIS/.test(tc)&&!/ACCESSIO/.test(tc);return false;});return candidats.length===1?candidats[0]:null;}

function operationsCanoniquesDashboard20260907_(){
  const raw=lireTable_('Operations')||[];
  if(typeof dedoublonnerOperationsCartesCanonique20260906V3_==='function')return dedoublonnerOperationsCartesCanonique20260906V3_(raw);
  if(typeof dedoublonnerOperationsCartesBudgetSoft_==='function')return dedoublonnerOperationsCartesBudgetSoft_(raw);
  return raw;
}

function projectionChargesFixesCycle2026_(debutCycle, finCycle) {
  const deb=dateLocaleBudgetSoft_(debutCycle);deb.setHours(0,0,0,0);const fin=dateLocaleBudgetSoft_(finCycle);fin.setHours(23,59,59,999);
  const charges=lireTable_('Charges_fixes').filter(c=>convertirBooleen_(c.actif));const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():(typeof lireCreditsEtendus_==='function'?lireCreditsEtendus_():[]);const items=[];
  charges.forEach(c=>{const debutCharge=c.date_debut?dateLocaleBudgetSoft_(c.date_debut):deb,finCharge=c.date_fin?dateLocaleBudgetSoft_(c.date_fin):null;if(finCharge&&finCharge<deb)return;if(debutCharge>fin)return;const credit=creditPourChargeDashboard2026_(c,credits),prochaine=credit&&credit.prochaine_echeance?dateLocaleBudgetSoft_(credit.prochaine_echeance):null;if(prochaine&&!isNaN(prochaine)&&prochaine>=deb){if(prochaine<=fin)items.push({id:String(c.id||''),libelle:String(c.libelle||c.libelle_bancaire||'Charge fixe'),montant:Math.abs(Number(c.montant||credit.mensualite||0)),date:prochaine.toISOString(),source:'prochaine_echeance_credit'});return;}const debutCalcul=debutCharge>deb?debutCharge:deb;let echeances=[];try{echeances=typeof calculerEcheancesChargeFixeAjustees_==='function'?calculerEcheancesChargeFixeAjustees_(c,debutCalcul,finCharge,fin):calculerEcheancesJusqua_(c,debutCalcul,finCharge,fin).map(d=>({date:d,montant:Math.abs(Number(c.montant||0)),ajustement:''}));}catch(e){echeances=[];}echeances.filter(e=>{const d=new Date(e.date);return!isNaN(d)&&d>=deb&&d<=fin;}).forEach(e=>items.push({id:String(c.id||''),libelle:String(c.libelle||c.libelle_bancaire||'Charge fixe'),montant:Math.abs(Number(e.montant||c.montant||0)),date:new Date(e.date).toISOString(),source:e.ajustement?'ajustement':'recurrence'}));});
  items.sort((a,b)=>new Date(a.date)-new Date(b.date));return{items,total:Math.round(items.reduce((s,x)=>s+Number(x.montant||0),0)*100)/100,nombre:items.length};
}

function salaireMoyenNetBancaire2026_() {const aujourdHui=new Date();const ops=operationsCanoniquesDashboard20260907_().map(o=>Object.assign({},o,{__date:new Date(o.date_comptable||o.date)})).filter(o=>!isNaN(o.__date)&&dateBancaireConnueAuJour_(o.__date,aujourdHui));const salaires=ops.filter(o=>Number(o.montant||0)>0&&(String(o.categorie||'').trim()==='Salaires'||/MAIRIE DE TOULOUSE/i.test(String(o.libelle_bancaire||o.libelle||'')))).sort((a,b)=>a.__date-b.__date).slice(-6);if(!salaires.length)return null;return Math.round((salaires.reduce((s,o)=>s+Number(o.montant||0),0)/salaires.length)*100)/100;}

/** Chiffres économiques du dashboard : la trésorerie modifie le solde bancaire, jamais revenus/dépenses/épargne. */
function statsEconomiquesDashboard2026_(debut,fin){
  const cats=lireTable_('Categories'),types=Object.fromEntries(cats.map(c=>[String(c.nom||'').trim(),String(c.type||'').toLowerCase()]));
  const a=new Date(debut),b=new Date(fin);a.setHours(0,0,0,0);b.setHours(23,59,59,999);
  const ops=operationsCanoniquesDashboard20260907_().filter(o=>!/\[RECURRENCE:[^\]]+\]/.test(String(o.commentaire||''))).filter(o=>{const d=new Date(o.date_comptable||o.date);return!isNaN(d)&&d>=a&&d<=b;});
  let revenus=0,depenses=0,n=0;
  ops.forEach(o=>{const cat=String(o.categorie||'').trim(),nature=types[cat],m=Number(o.montant||0);if(nature==='revenu'&&m>0){revenus+=m;n++;}else if(nature==='depense'&&m<0){depenses+=Math.abs(m);n++;}});
  const r=v=>Math.round(v*100)/100;return{revenus:r(revenus),depenses:r(depenses),epargne:r(revenus-depenses),operations:n};
}

function soldeCanoniqueDashboard20260907_(){
  try{
    const c=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():(typeof chargerSyntheseComptes20260828==='function'?chargerSyntheseComptes20260828():null);
    const s=c&&c.synthese||c||{};
    const v=Number(s.disponible);
    if(Number.isFinite(v))return{solde:Math.round(v*100)/100,dateReference:c&&c.dateReferenceReel||'',source:'comptes_canonique'};
  }catch(e){}
  return null;
}

function chargerDashboardReelV2() {
  try{
    if(typeof chargerDashboardDepuisSnapshotGlobalBudgetSoft20260906==='function'){
      const snap=chargerDashboardDepuisSnapshotGlobalBudgetSoft20260906();
      if(snap&&snap.ok!==false&&snap.source==='snapshot_global'){
        snap.sourceBudgetSoft='snapshot_global';
        snap.versionCorrection=DASHBOARD_CORRECTIONS_19082026_VERSION;
        return snap;
      }
    }
  }catch(e){}

  const d=chargerDashboardReel();if(!d)return d;
  const soldeCanon=soldeCanoniqueDashboard20260907_();
  if(d.courtTerme&&soldeCanon){
    d.courtTerme.soldeBancaire=soldeCanon.solde;
    d.courtTerme.soldeCanoniqueBudgetSoft=true;
    d.courtTerme.sourceSolde=soldeCanon.source;
    if(soldeCanon.dateReference)d.courtTerme.dateSolde=soldeCanon.dateReference;
  }
  if(d.cycleSuivant){const salaire=salaireMoyenNetBancaire2026_(),projection=projectionChargesFixesCycle2026_(d.cycleSuivant.debut,d.cycleSuivant.fin),cb=Number(d.cycleSuivant.cbDifferees||0);d.cycleSuivant.salaireAttendu=salaire;d.cycleSuivant.chargesFixes=projection.total;d.cycleSuivant.nombreCharges=projection.nombre;d.cycleSuivant.detailFixes=projection.items;d.cycleSuivant.marge=salaire==null?null:Math.round((salaire-projection.total-cb)*100)/100;d.cycleSuivant.methodeProjection='Échéances connues dans le cycle 28 inclus -> 27 inclus ; reports et suspensions appliqués ; salaire net bancaire moyen sur 6 versements.';}
  if(d.courtTerme&&d.courtTerme.debut){const fin=d.courtTerme.dateReference||d.referenceImport||new Date();const s=statsEconomiquesDashboard2026_(d.courtTerme.debut,fin);d.courtTerme.revenusConstates=s.revenus;d.courtTerme.depensesConstatees=s.depenses;d.courtTerme.epargne=s.epargne;d.courtTerme.operations=s.operations;}
  if(d.cyclePrecedent&&d.cyclePrecedent.debut&&d.cyclePrecedent.fin){const s=statsEconomiquesDashboard2026_(d.cyclePrecedent.debut,d.cyclePrecedent.fin);d.cyclePrecedent.revenus=s.revenus;d.cyclePrecedent.depenses=s.depenses;d.cyclePrecedent.epargne=s.epargne;d.cyclePrecedent.operations=s.operations;}
  d.versionCorrection=DASHBOARD_CORRECTIONS_19082026_VERSION;d.sourceBudgetSoft='recalcul_secours';d.diagnosticEconomique={tresorerieExclueDesRevenusDepenses:true,soldeBancaireConserveTousFlux:true,typeOperation:'sens du flux',typeCategorie:'nature économique',operationsCanoniques:true,versionDedoublonnage:typeof BUDGETSOFT_CANONICAL_BANK_DEDUP_VERSION!=='undefined'?BUDGETSOFT_CANONICAL_BANK_DEDUP_VERSION:''};
  return JSON.parse(JSON.stringify(d));
}

function auditerDashboardSnapshotFirstBudgetSoft20260907(){
  const t0=Date.now(),d=chargerDashboardReelV2();
  const s=typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():null;
  const e=s&&s.disponible&&s.etat||{},t=e.transversales&&e.transversales.tresorerie||{};
  const soldeDash=Number(d&&d.courtTerme&&d.courtTerme.soldeBancaire);
  const soldeCanon=Number(t.soldeReel);
  const source=d&&d.source||d&&d.sourceBudgetSoft||'';
  const erreurs=[];
  if(source!=='snapshot_global')erreurs.push({code:'SOURCE',attendu:'snapshot_global',obtenu:source});
  if(!d||!d.revisionBudgetSoft)erreurs.push({code:'REVISION_ABSENTE'});
  if(d&&d.revisionBudgetSoft&&e.revisionBudgetSoft&&d.revisionBudgetSoft!==e.revisionBudgetSoft)erreurs.push({code:'REVISION',dashboard:d.revisionBudgetSoft,snapshot:e.revisionBudgetSoft});
  if(Number.isFinite(soldeDash)&&Number.isFinite(soldeCanon)&&Math.abs(soldeDash-soldeCanon)>0.005)erreurs.push({code:'SOLDE_REEL',dashboard:soldeDash,canonique:soldeCanon});
  const r={ok:erreurs.length===0,version:DASHBOARD_CORRECTIONS_19082026_VERSION,source:source,revisionBudgetSoft:d&&d.revisionBudgetSoft||'',dureeMs:Date.now()-t0,soldeDashboard:Number.isFinite(soldeDash)?soldeDash:null,soldeCanonique:Number.isFinite(soldeCanon)?soldeCanon:null,versionCorrection:d&&d.versionCorrection||'',erreurs:erreurs};
  console.log(JSON.stringify(r));return r;
}
