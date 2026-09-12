const BUDGETSOFT_DASHBOARD_REVENUE_AUDIT_20260912_VERSION='2026-09-12.1';

/**
 * Audit strict du total « Recettes au jour J / attendues » du Dashboard.
 * Reprend les mêmes conventions que composerDashboardSyntheseBudgetSoft20260907_ :
 * - opérations réelles uniquement ;
 * - comptes inclus dans la trésorerie canonique ;
 * - date comptable prioritaire ;
 * - type revenu et montant signé > 0 ;
 * - cycle courant borné par Cerbère ;
 * - recettes attendues = recettes constatées + recettes futures de projection.
 */
function auditerDetailRecettesDashboardBudgetSoft20260912(){
  const t0=Date.now();
  verifierInitialisation_();

  const sources=chargerToutesLesDonnees();
  const comptes=typeof construireSyntheseComptes20260828_==='function'
    ?construireSyntheseComptes20260828_()
    :chargerSyntheseComptes20260828();
  const fin=typeof dateFinCycleCanonBudgetSoft20260906_==='function'
    ?dateFinCycleCanonBudgetSoft20260906_(new Date())
    :new Date();
  const tres=construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,fin,new Date());
  const cer=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;
  const cycles=cyclesDashboardSynthese20260907_(cer,tres&&tres.dateReference||new Date());
  const cc=cycles.courant;
  const reference=dateDashboardSynthese20260907_(tres&&tres.dateReference||new Date());

  let ops=Array.isArray(sources&&sources.Operations)?sources.Operations:[];
  if(typeof dedoublonnerOperationsCartesBudgetSoft_==='function'){
    try{ops=dedoublonnerOperationsCartesBudgetSoft_(ops);}catch(e){}
  }

  const comptesSet=new Set();
  (tres&&Array.isArray(tres.comptes)?tres.comptes:[]).forEach(function(c){
    comptesSet.add(String(c&&c.id||''));
    comptesSet.add(String(c&&c.nom||''));
  });
  const dansCompte=function(o){return !comptesSet.size||comptesSet.has(String(o&&o.compte||''));};
  const dateOp=function(o){return dateDashboardSynthese20260907_(o&&o.date_comptable||o&&o.date);};
  const reelle=function(o){
    return typeof operationReelleCanoniqueBudgetSoft20260906_==='function'
      ?operationReelleCanoniqueBudgetSoft20260906_(o)
      :!/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||''));
  };

  const lignes=[];
  let total=0;
  ops.forEach(function(o){
    const d=dateOp(o);
    if(!d||d<cc.debut||d>reference)return;
    if(!reelle(o)||!dansCompte(o))return;
    const s=signeDashboardSynthese20260907_(o);
    if(String(o&&o.type||'').toLowerCase()!=='revenu'||!(s>0))return;
    total+=s;
    lignes.push({
      id:String(o&&o.id||''),
      date:isoDashboardSynthese20260907_(d),
      compte:String(o&&o.compte||''),
      libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
      categorie:String(o&&o.categorie||''),
      montant:arrDashboardSynthese20260907_(s)
    });
  });
  lignes.sort(function(a,b){return a.date.localeCompare(b.date)||a.libelle.localeCompare(b.libelle);});
  total=arrDashboardSynthese20260907_(total);

  const cible=new Date(reference.getFullYear(),reference.getMonth()+1,27);
  const proj=typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function'
    ?construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible)
    :null;
  const demain=new Date(reference);demain.setDate(demain.getDate()+1);
  let futur=0;
  const futures=[];
  (proj&&Array.isArray(proj.lignes)?proj.lignes:[]).forEach(function(l){
    const d=dateDashboardSynthese20260907_(l&&l.date);
    const m=Number(l&&l.montantSigne||0);
    if(!d||d<demain||d>cc.fin||!Number.isFinite(m)||m<=0)return;
    futur+=m;
    futures.push({date:isoDashboardSynthese20260907_(d),source:String(l&&l.source||''),libelle:String(l&&l.libelle||l&&l.nom||''),montant:arrDashboardSynthese20260907_(m)});
  });
  futur=arrDashboardSynthese20260907_(futur);

  const dash=typeof chargerDashboardReel==='function'?chargerDashboardReel():null;
  const ct=dash&&dash.courtTerme||{};
  const attendu=arrDashboardSynthese20260907_(total+futur);
  const out={
    ok:arrDashboardSynthese20260907_(Number(ct.revenusConstates||0))===total&&arrDashboardSynthese20260907_(Number(ct.revenusAttendus||0))===attendu,
    version:BUDGETSOFT_DASHBOARD_REVENUE_AUDIT_20260912_VERSION,
    revisionBudgetSoft:dash&&dash.revisionBudgetSoft||'',
    cycle:{debut:isoDashboardSynthese20260907_(cc.debut),fin:isoDashboardSynthese20260907_(cc.fin),dateReference:isoDashboardSynthese20260907_(reference)},
    totalRecettesJourJ:total,
    totalRecettesAttendues:attendu,
    recettesFutures:futur,
    dashboard:{revenusConstates:Number(ct.revenusConstates||0),revenusAttendus:Number(ct.revenusAttendus||0)},
    nombreLignes:lignes.length,
    lignes:lignes,
    lignesFutures:futures,
    dureeMs:Date.now()-t0
  };
  console.log('[AUDIT détail recettes Dashboard] '+JSON.stringify(out));
  return out;
}
