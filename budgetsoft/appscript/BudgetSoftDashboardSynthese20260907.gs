const BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION='2026-09-07.2';

function arrDashboardSynthese20260907_(n){return Math.round(Number(n||0)*100)/100;}
function dateDashboardSynthese20260907_(v){const d=v instanceof Date?new Date(v):new Date(v||0);if(isNaN(d))return null;d.setHours(0,0,0,0);return d;}
function isoDashboardSynthese20260907_(d){return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';}
function ecartJoursDashboardSynthese20260907_(a,b){return Math.round((dateDashboardSynthese20260907_(b)-dateDashboardSynthese20260907_(a))/86400000);}
function milieuDashboardSynthese20260907_(a,b){const d=dateDashboardSynthese20260907_(a),n=Math.floor(ecartJoursDashboardSynthese20260907_(a,b)/2);d.setDate(d.getDate()+n);return d;}
function libelleCycleDashboardSynthese20260907_(fin){return fin?fin.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase()):'';}
function signeDashboardSynthese20260907_(o){if(typeof montantSigneCanoniqueBudgetSoft20260906_==='function')return Number(montantSigneCanoniqueBudgetSoft20260906_(o)||0);const n=Number(o&&o.montant||0),t=String(o&&o.type||'').toLowerCase();if(Number.isFinite(n)&&n!==0)return n;if(t==='depense'||t==='tresorerie_sortie')return-Math.abs(n);return Math.abs(n);}
function estCarteDashboardSynthese20260907_(o){return !!String(o&&o.carte_fin||'').trim()||/\b(?:paiement\s+)?cb\b/i.test(String(o&&o.libelle_bancaire||o&&o.libelle||''));}
function nombreFiniDashboardSynthese20260907_(v){const n=Number(v);return Number.isFinite(n)?n:null;}

function cyclesDashboardSynthese20260907_(cerbere,reference){
  const p=cerbere&&Array.isArray(cerbere.periodes)&&cerbere.periodes[0],pp=p&&(p.periode||p);
  let debut=dateDashboardSynthese20260907_(pp&&pp.debut),fin=dateDashboardSynthese20260907_(pp&&pp.fin);
  if(!debut||!fin){const r=dateDashboardSynthese20260907_(reference),j=28;debut=r.getDate()>=j?new Date(r.getFullYear(),r.getMonth(),j):new Date(r.getFullYear(),r.getMonth()-1,j);fin=new Date(debut.getFullYear(),debut.getMonth()+1,j);fin.setDate(fin.getDate()-1);}
  const suivantDebut=new Date(fin);suivantDebut.setDate(suivantDebut.getDate()+1);const suivantFin=new Date(suivantDebut.getFullYear(),suivantDebut.getMonth()+1,suivantDebut.getDate());suivantFin.setDate(suivantFin.getDate()-1);
  const precedentFin=new Date(debut);precedentFin.setDate(precedentFin.getDate()-1);const precedentDebut=new Date(debut.getFullYear(),debut.getMonth()-1,debut.getDate());
  return{courant:{debut,fin},suivant:{debut:suivantDebut,fin:suivantFin},precedent:{debut:precedentDebut,fin:precedentFin}};
}

function composerDashboardSyntheseBudgetSoft20260907_(ctx){
  ctx=ctx||{};const sources=ctx.sources||{},tres=ctx.tresorerieComptable||{},proj=ctx.projectionEtendue||{},cer=ctx.cerbere||{},exp=ctx.cerbereExpress||{};
  const reference=dateDashboardSynthese20260907_(tres.dateReference||new Date()),cycles=cyclesDashboardSynthese20260907_(cer,reference),cc=cycles.courant,cs=cycles.suivant,cp=cycles.precedent;
  let ops=Array.isArray(sources.Operations)?sources.Operations:[];if(typeof dedoublonnerOperationsCartesBudgetSoft_==='function')try{ops=dedoublonnerOperationsCartesBudgetSoft_(ops);}catch(e){}
  const comptesSet=new Set();(tres.comptes||[]).forEach(c=>{comptesSet.add(String(c.id||''));comptesSet.add(String(c.nom||''));});
  const dansCompte=o=>!comptesSet.size||comptesSet.has(String(o&&o.compte||''));
  const dateOp=o=>dateDashboardSynthese20260907_(o&&o.date_comptable||o&&o.date);
  const reelle=o=>typeof operationReelleCanoniqueBudgetSoft20260906_==='function'?operationReelleCanoniqueBudgetSoft20260906_(o):!/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||''));
  const opValides=ops.filter(o=>reelle(o)&&dansCompte(o)&&dateOp(o));
  function stats(a,b,lim){const x=dateDashboardSynthese20260907_(a),y=dateDashboardSynthese20260907_(lim&&lim<b?lim:b);let rev=0,dep=0,n=0,net=0;opValides.forEach(o=>{const d=dateOp(o);if(d<x||d>y)return;const s=signeDashboardSynthese20260907_(o),t=String(o.type||'').toLowerCase();net+=s;if(t==='revenu'&&s>0){rev+=s;n++;}else if(t==='depense'&&s<0){dep+=Math.abs(s);n++;}});return{revenus:arrDashboardSynthese20260907_(rev),depenses:arrDashboardSynthese20260907_(dep),resultat:arrDashboardSynthese20260907_(rev-dep),operations:n,net:arrDashboardSynthese20260907_(net)};}
  function soldeHistorique(cible){const d=dateDashboardSynthese20260907_(cible);let apres=0;opValides.forEach(o=>{const od=dateOp(o);if(od>d&&od<=reference)apres+=signeDashboardSynthese20260907_(o);});return arrDashboardSynthese20260907_(Number(tres.soldeReel||0)-apres);}
  const lignesProj=Array.isArray(proj.lignes)?proj.lignes:[];
  function projEntre(a,b){const x=dateDashboardSynthese20260907_(a),y=dateDashboardSynthese20260907_(b);let net=0,rev=0,dep=0;const lignes=[];lignesProj.forEach(l=>{const d=dateDashboardSynthese20260907_(l&&l.date);if(!d||d<x||d>y)return;const m=Number(l.montantSigne||0);if(!Number.isFinite(m))return;net+=m;if(m>0)rev+=m;else dep+=Math.abs(m);lignes.push(l);});return{net:arrDashboardSynthese20260907_(net),revenus:arrDashboardSynthese20260907_(rev),depenses:arrDashboardSynthese20260907_(dep),lignes};}
  function soldeProjection(cible){const d=dateDashboardSynthese20260907_(cible);if(d<=reference)return soldeHistorique(d);const lendemain=new Date(reference);lendemain.setDate(lendemain.getDate()+1);return arrDashboardSynthese20260907_(Number(tres.soldeReel||0)+projEntre(lendemain,d).net);}
  const stCourant=stats(cc.debut,cc.fin,reference),stPrec=stats(cp.debut,cp.fin,cp.fin),milieuCourant=milieuDashboardSynthese20260907_(cc.debut,cc.fin),milieuPrec=milieuDashboardSynthese20260907_(cp.debut,cp.fin);
  const demain=new Date(reference);demain.setDate(demain.getDate()+1);const futurCourant=projEntre(demain,cc.fin);
  const prelevements=opValides.filter(o=>{const d=dateOp(o),s=signeDashboardSynthese20260907_(o);return d>reference&&d<=cc.fin&&s<0&&!estCarteDashboardSynthese20260907_(o);});
  const chargesRestantes=futurCourant.lignes.filter(l=>String(l.source||'')==='charge_fixe');
  const sommeAbs=xs=>arrDashboardSynthese20260907_(xs.reduce((s,x)=>s+Math.abs(Number(x.montantSigne!=null?x.montantSigne:x.montant||0)),0));
  const pilotable=Number(exp&&exp.pilotable&&exp.pilotable.reste),pilotableCourant=Number.isFinite(pilotable)?arrDashboardSynthese20260907_(pilotable):null;
  const prochain=Number(exp&&exp.contexte&&exp.contexte.prochainCycle),pilotableSuiv=Number.isFinite(prochain)?arrDashboardSynthese20260907_(prochain):null;
  const cb=Number(exp&&exp.contexte&&(exp.contexte.reportCbCycleSuivant!=null?exp.contexte.reportCbCycleSuivant:exp.contexte.cbDejaEngageeM1));
  const cbCourant=Number.isFinite(cb)?arrDashboardSynthese20260907_(cb):0;
  const joursRestants=Math.max(0,ecartJoursDashboardSynthese20260907_(reference,cc.fin)),duree=Math.max(1,ecartJoursDashboardSynthese20260907_(cc.debut,cc.fin));
  const courant={libelle:libelleCycleDashboardSynthese20260907_(cc.fin),debut:isoDashboardSynthese20260907_(cc.debut),fin:isoDashboardSynthese20260907_(cc.fin),dateReference:isoDashboardSynthese20260907_(reference),joursRestants,duree,progression:joursRestants+'/'+duree,soldeBancaire:Number(tres.soldeReel||0),soldeMiCycle:soldeProjection(milieuCourant),soldeFinCycle:soldeProjection(cc.fin),revenusConstates:stCourant.revenus,revenusAttendus:arrDashboardSynthese20260907_(stCourant.revenus+futurCourant.revenus),depensesConstatees:stCourant.depenses,depensesAttendues:arrDashboardSynthese20260907_(stCourant.depenses+futurCourant.depenses),cbDifferees:cbCourant,nombreCb:null,prelevements:sommeAbs(prelevements),nombrePrelevements:prelevements.length,chargesFixes:sommeAbs(chargesRestantes),nombreCharges:chargesRestantes.length,pilotableDisponible:pilotableCourant,pilotableParJour:pilotableCourant==null?null:arrDashboardSynthese20260907_(joursRestants?pilotableCourant/joursRestants:pilotableCourant),resultat:stCourant.resultat};

  // Cycle suivant : seules les valeurs possédées par Cerbère/Cerbère Express sont publiées.
  // L'ancienne projection étendue ne doit pas produire de faux soldes futurs en l'absence
  // d'un propriétaire de trésorerie couvrant correctement les revenus réguliers du cycle.
  const pSuiv=cer&&Array.isArray(cer.periodes)?(cer.periodes[1]||null):null,vSuiv=pSuiv&&(pSuiv.v37||{}),cockpitSuiv=vSuiv&&(vSuiv.cockpit20260902||{});
  const recettesSuiv=nombreFiniDashboardSynthese20260907_(vSuiv&&vSuiv.rt1);
  const cfSuiv=nombreFiniDashboardSynthese20260907_(vSuiv&&vSuiv.cft1);
  const hetSuiv=nombreFiniDashboardSynthese20260907_(cockpitSuiv&&cockpitSuiv.het1!=null?cockpitSuiv.het1:(vSuiv&&vSuiv.het1));
  const cbSuiv=nombreFiniDashboardSynthese20260907_(exp&&exp.contexte&&exp.contexte.cbDejaEngageeM1);
  let depensesSuiv=null;
  if(cfSuiv!=null&&hetSuiv!=null&&cbSuiv!=null&&pilotableSuiv!=null)depensesSuiv=arrDashboardSynthese20260907_(cfSuiv+hetSuiv+cbSuiv+pilotableSuiv);
  const suivant={libelle:libelleCycleDashboardSynthese20260907_(cs.fin),debut:isoDashboardSynthese20260907_(cs.debut),fin:isoDashboardSynthese20260907_(cs.fin),soldeJ1:null,soldeMiCycle:null,soldeFinCycle:null,revenusPrevisionnels:recettesSuiv==null?null:arrDashboardSynthese20260907_(recettesSuiv),depensesPrevisionnelles:depensesSuiv,cbDifferees:cbSuiv==null?0:arrDashboardSynthese20260907_(cbSuiv),pilotablePrevisionnel:pilotableSuiv,projectionTresorerieDisponible:false,detailPrevision:{chargesFixes:cfSuiv,horsPilotable:hetSuiv,reportCb:cbSuiv,pilotable:pilotableSuiv}};

  const precedent={libelle:libelleCycleDashboardSynthese20260907_(cp.fin),debut:isoDashboardSynthese20260907_(cp.debut),fin:isoDashboardSynthese20260907_(cp.fin),operations:stPrec.operations,soldeJ1:soldeHistorique(cp.debut),soldeMiCycle:soldeHistorique(milieuPrec),soldeFinCycle:soldeHistorique(cp.fin),revenus:stPrec.revenus,depenses:stPrec.depenses,netOperations:stPrec.net,ecartReconciliation:arrDashboardSynthese20260907_(soldeHistorique(cp.fin)-soldeHistorique(cp.debut)-stPrec.net),cbDifferees:null,pilotableInitial:null};
  return{ok:true,version:BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION,versionCorrection:'3.1',sourceBudgetSoft:'composition_snapshot',doctrine:'Dashboard de synthèse : aucune vérité métier recalculée quand un propriétaire BudgetSoft/Cerbère existe ; une projection indisponible est affichée comme telle plutôt qu’inventée.',courtTerme:courant,cycleSuivant:suivant,cyclePrecedent:precedent,provenance:{solde:'tresorerieComptable',previsionsCourant:'projectionEtendue',previsionsCycleSuivant:'Cerbère/Cerbère Express uniquement ; soldes masqués tant que la trésorerie future complète n’a pas de propriétaire fiable',pilotable:'cerbereExpress',cbDifferees:'cerbereExpress',historique:'Operations canoniques + solde canonique'}};
}

function chargerDashboardSyntheseBudgetSoft20260907(){
  try{if(typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'){const d=lireModuleSnapshotGlobalBudgetSoft20260906_('dashboard');if(d){d.source='snapshot_global';d.sourceBudgetSoft='snapshot_global';return d;}}}catch(e){}
  const executer=function(){const sources=chargerToutesLesDonnees(),comptes=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828(),fin=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(new Date()):new Date(),t=construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,fin,new Date()),cible=new Date(new Date().getFullYear(),new Date().getMonth()+1,27),p=typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function'?construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible):null,c=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null,x=typeof chargerVueCerbereExpressSansContexte20260827_==='function'?chargerVueCerbereExpressSansContexte20260827_():null,r=composerDashboardSyntheseBudgetSoft20260907_({sources,comptes,tresorerieComptable:t,projectionEtendue:p,cerbere:c,cerbereExpress:x});r.source='recalcul_secours';r.sourceBudgetSoft='recalcul_secours';return r;};
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('dashboard-synthese-secours',executer):executer();
}

function auditerDashboardSyntheseBudgetSoft20260907(){const t=Date.now(),d=chargerDashboardSyntheseBudgetSoft20260907(),r={ok:!!(d&&d.ok!==false),version:d&&d.version||'',source:d&&d.source||d&&d.sourceBudgetSoft||'',revisionBudgetSoft:d&&d.revisionBudgetSoft||'',dureeMs:Date.now()-t,solde:d&&d.courtTerme&&d.courtTerme.soldeBancaire,pilotable:d&&d.courtTerme&&d.courtTerme.pilotableDisponible,progression:d&&d.courtTerme&&d.courtTerme.progression};console.log(JSON.stringify(r));return r;}

function auditerCycleSuivantEtHistoriqueDashboardBudgetSoft20260907(){
  const d=chargerDashboardSyntheseBudgetSoft20260907(),s=d&&d.cycleSuivant||{},p=d&&d.cyclePrecedent||{};
  const r={ok:!!(d&&d.ok!==false),version:d&&d.version||'',versionCorrection:d&&d.versionCorrection||'',cycleSuivant:{revenusPrevisionnels:s.revenusPrevisionnels,depensesPrevisionnelles:s.depensesPrevisionnelles,cbDifferees:s.cbDifferees,pilotablePrevisionnel:s.pilotablePrevisionnel,soldeJ1:s.soldeJ1,soldeMiCycle:s.soldeMiCycle,soldeFinCycle:s.soldeFinCycle,detailPrevision:s.detailPrevision||null},cyclePrecedent:{soldeJ1:p.soldeJ1,soldeFinCycle:p.soldeFinCycle,revenusBudgetaires:p.revenus,depensesBudgetaires:p.depenses,netOperations:p.netOperations,ecartReconciliation:p.ecartReconciliation}};
  console.log('[AUDIT Dashboard cycles] '+JSON.stringify(r));return r;
}
