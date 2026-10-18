const BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION='2026-09-28.3';

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

function composerDashboardSyntheseSourceBudgetSoft20260907_(ctx){
  ctx=ctx||{};const sources=ctx.sources||{},tres=ctx.tresorerieComptable||{},proj=ctx.projectionEtendue||{},cer=ctx.cerbere||{},exp=ctx.cerbereExpress||{};
  const reference=dateDashboardSynthese20260907_(tres.dateReference||new Date()),cycles=cyclesDashboardSynthese20260907_(cer,reference),cc=cycles.courant,cs=cycles.suivant,cp=cycles.precedent;
  let ops=Array.isArray(sources.Operations)?sources.Operations:[];if(typeof dedoublonnerOperationsCartesBudgetSoft_==='function')try{ops=dedoublonnerOperationsCartesBudgetSoft_(ops);}catch(e){}
  const comptesSet=new Set();(tres.comptes||[]).forEach(c=>{comptesSet.add(String(c.id||''));comptesSet.add(String(c.nom||''));});
  const dansCompte=o=>!comptesSet.size||comptesSet.has(String(o&&o.compte||''));
  const dateOp=o=>dateDashboardSynthese20260907_(o&&o.date_comptable||o&&o.date);
  const reelle=o=>typeof operationReelleCanoniqueBudgetSoft20260906_==='function'?operationReelleCanoniqueBudgetSoft20260906_(o):!/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||''));
  const opValides=ops.filter(o=>reelle(o)&&dansCompte(o)&&dateOp(o));
  function stats(a,b,lim){const x=dateDashboardSynthese20260907_(a),y=dateDashboardSynthese20260907_(lim&&lim<b?lim:b);let rev=0,dep=0,n=0,net=0;opValides.forEach(o=>{const d=dateOp(o);if(d<x||d>y)return;const s=signeDashboardSynthese20260907_(o);net+=s;if(s>0){rev+=s;n++;}else if(s<0){dep+=Math.abs(s);n++;}});return{revenus:arrDashboardSynthese20260907_(rev),depenses:arrDashboardSynthese20260907_(dep),resultat:arrDashboardSynthese20260907_(rev-dep),operations:n,net:arrDashboardSynthese20260907_(net)};}
  function soldeHistorique(cible){
    if(typeof soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_==='function'){
      const x=soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_(cible,{soldeReel:Number(tres.soldeReel||0),comptes:tres.comptes||[],operations:opValides,dateReference:reference});
      if(Number.isFinite(Number(x)))return arrDashboardSynthese20260907_(x);
    }
    const d=dateDashboardSynthese20260907_(cible);let apres=0;opValides.forEach(o=>{const od=dateOp(o);if(od>d&&od<=reference)apres+=signeDashboardSynthese20260907_(o);});return arrDashboardSynthese20260907_(Number(tres.soldeReel||0)-apres);
  }
  // Solde d'ouverture : avant les opérations du jour de début. Cette convention est
  // nécessaire pour réconcilier un intervalle inclusif [début, fin] avec son net d'opérations.
  function soldeHistoriqueOuverture(cible){const d=dateDashboardSynthese20260907_(cible);let depuis=0;opValides.forEach(o=>{const od=dateOp(o);if(od>=d&&od<=reference)depuis+=signeDashboardSynthese20260907_(o);});return arrDashboardSynthese20260907_(Number(tres.soldeReel||0)-depuis);}
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
  const finMoisCourant=new Date(cc.fin.getFullYear(),cc.fin.getMonth()+1,0);
  const cbEngagees=opValides.filter(o=>{const d=dateOp(o),da=dateDashboardSynthese20260907_(o&&o.date_achat||o&&o.date),s=signeDashboardSynthese20260907_(o);return estCarteDashboardSynthese20260907_(o)&&s<0&&d>cc.fin&&d<=finMoisCourant&&(!da||da<=reference);});
  const cbCourant=sommeAbs(cbEngagees);
  const joursRestants=Math.max(0,ecartJoursDashboardSynthese20260907_(reference,cc.fin)),duree=Math.max(1,ecartJoursDashboardSynthese20260907_(cc.debut,cc.fin));
  const courant={libelle:libelleCycleDashboardSynthese20260907_(cc.fin),debut:isoDashboardSynthese20260907_(cc.debut),fin:isoDashboardSynthese20260907_(cc.fin),dateReference:isoDashboardSynthese20260907_(reference),joursRestants,duree,progression:joursRestants+'/'+duree,soldeBancaire:Number(tres.soldeReel||0),soldeMiCycle:soldeProjection(milieuCourant),soldeFinCycle:soldeProjection(cc.fin),revenusConstates:stCourant.revenus,revenusAttendus:arrDashboardSynthese20260907_(stCourant.revenus+futurCourant.revenus),depensesConstatees:stCourant.depenses,depensesAttendues:arrDashboardSynthese20260907_(stCourant.depenses+futurCourant.depenses),cbDifferees:cbCourant,nombreCb:cbEngagees.length,prelevements:sommeAbs(prelevements),nombrePrelevements:prelevements.length,chargesFixes:sommeAbs(chargesRestantes),nombreCharges:chargesRestantes.length,pilotableDisponible:pilotableCourant,pilotableParJour:pilotableCourant==null?null:arrDashboardSynthese20260907_(joursRestants?pilotableCourant/joursRestants:pilotableCourant),resultat:stCourant.resultat};

  // Detail de traçabilite : construit avec EXACTEMENT les operations deja retenues
  // pour les constats et les lignes de la meme projection, sans nouvelle lecture.
  // Les totaux restent la propriete de leurs moteurs respectifs.
  function ligneReelleDetail(o){
    const montant=signeDashboardSynthese20260907_(o);
    return {id:String(o.id||''),date:isoDashboardSynthese20260907_(dateOp(o)),
      libelle:String(o.libelle||o.libelle_bancaire||'Operation'),categorie:String(o.categorie||''),
      montant:arrDashboardSynthese20260907_(montant),statut:'constate',source:String(o.source_bancaire||'reel')};
  }
  function ligneProjeteeDetail(l){
    return {id:String(l.id||l.sourceId||''),date:isoDashboardSynthese20260907_(dateDashboardSynthese20260907_(l.date)),
      libelle:String(l.libelle||l.nom||l.source||'Operation attendue'),categorie:String(l.categorie||''),
      montant:arrDashboardSynthese20260907_(l.montantSigne),statut:'attendu',source:String(l.source||'projection'),
      certitude:String(l.certitude||'')};
  }
  const reellesCycle=opValides.filter(o=>{const d=dateOp(o);return d>=cc.debut&&d<=cc.fin&&d<=reference;});
  const futuresCycle=futurCourant.lignes.map(ligneProjeteeDetail);
  courant.detailsCartes={
    recettes:{constatees:reellesCycle.filter(o=>signeDashboardSynthese20260907_(o)>0).map(ligneReelleDetail),
      attendues:futuresCycle.filter(o=>o.montant>0)},
    depenses:{constatees:reellesCycle.filter(o=>signeDashboardSynthese20260907_(o)<0).map(ligneReelleDetail),
      attendues:futuresCycle.filter(o=>o.montant<0)},
    // Échéances à venir : charges fixes prévues ET débits futurs déjà
    // annoncés par la banque. Les deux sources sont complémentaires ; une
    // charge fixe couverte par un débit bancaire ne doit figurer qu'une fois.
    prelevements:[],

    chargesFixes:futuresCycle.filter(o=>o.montant<0&&o.source==='charge_fixe')
  };
  const echeancesBanque=prelevements.map(function(o){
    const l=ligneReelleDetail(o);
    l.statut='bancaire_futur';l.source='operation_bancaire_future';
    return l;
  });
  const echeancesFixes=courant.detailsCartes.chargesFixes.slice();
  // Les charges déjà rapprochées au flux futur doivent être remplacées par
  // ce flux : jamais deux lignes pour la même échéance.
  const idsChargesCouvertes=new Set(prelevements.map(function(o){
    return String(o.charge_fixe_id||'');
  }).filter(Boolean));
  const fixesNonCouvertes=echeancesFixes.filter(function(l){
    const sourceId=String(l.id||'').match(/^cf:([^:]+):/);
    return !sourceId||!idsChargesCouvertes.has(sourceId[1]);
  });
  const echeances=fixesNonCouvertes.concat(echeancesBanque);
  echeances.sort(function(a,b){return String(a.date).localeCompare(String(b.date))||String(a.libelle).localeCompare(String(b.libelle));});
  courant.detailsCartes.prelevements=echeances;
  courant.prelevements=arrDashboardSynthese20260907_(echeances.reduce(function(t,l){return t+Math.abs(Number(l.montant||0));},0));
  courant.nombrePrelevements=echeances.length;

  // Provision de pilotage uniquement : copro avec echeance bancaire non confirmee.
  // CFT1 possede deja cette depense. Ne jamais toucher a la trajectoire, au reel
  // ou retrancher de nouveau cette provision de la capacite de Cerbere.
  (function ajouterProvisionCoproEnAttente20261018_(){
    const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
    const debutCycle=isoDashboardSynthese20260907_(cc.debut);
    const finCycle=isoDashboardSynthese20260907_(cc.fin);
    // Garde transitoire : ne pas etendre a des cycles non audites.
    courant.auditProvisionCopro20261018={version:'2026-10-18.2',debutCycle:debutCycle,finCycle:finCycle,stade:'controle_dates'};
    if(debutCycle!=='2026-09-28'||finCycle!=='2026-10-27'){courant.auditProvisionCopro20261018.motif='cycle_incompatible';return;}
    const audit=cer&&cer.diagnostic&&cer.diagnostic.p1Doctrine20260912||{};
    const lignes=audit.cft1Audit&&audit.cft1Audit.lignes||[];
    const ligne=lignes.find(x=>String(x&&x.id||'')===id);
    courant.auditProvisionCopro20261018.stade='controle_cerbere';
    courant.auditProvisionCopro20261018.ligneTrouvee=!!ligne;
    courant.auditProvisionCopro20261018.occurrences=ligne?Number(ligne.occurrences):null;
    courant.auditProvisionCopro20261018.retenu=ligne?Number(ligne.retenu):null;
    courant.auditProvisionCopro20261018.reel=ligne?ligne.reel:null;
    if(!ligne||Number(ligne.occurrences)!==1||Math.abs(Number(ligne.retenu||0)-550)>.01||
      ligne.reel!=null&&Math.abs(Number(ligne.reel||0))>.01){courant.auditProvisionCopro20261018.motif='garde_cerbere';return;}
    const existeProjectionCycle=futurCourant.lignes.some(x=>
      String(x&&x.sourceId||'')===id||String(x&&x.id||'').indexOf('cf:'+id+':')===0);
    const dejaReel=reellesCycle.some(o=>String(o&&o.charge_fixe_id||'')===id);
    const dejaFuture=prelevements.some(o=>String(o&&o.charge_fixe_id||'')===id);
    courant.auditProvisionCopro20261018.projectionDansCycle=existeProjectionCycle;
    courant.auditProvisionCopro20261018.dejaReel=dejaReel;
    courant.auditProvisionCopro20261018.dejaFuture=dejaFuture;
    if(existeProjectionCycle||dejaReel||dejaFuture){courant.auditProvisionCopro20261018.motif='deja_couvert';return;}
    const ligneProvision={id:'provision-copro-20261018:'+id,date:'',
      libelle:String(ligne.libelle||'Charges de copropriete pour deux appartements'),
      categorie:'Logements',montant:-550,statut:'provision_en_attente',
      source:'provision_economique_cerbere',certitude:'date_bancaire_a_confirmer'};
    courant.auditProvisionCopro20261018.motif='provision_appliquee';
    courant.depensesAttendues=arrDashboardSynthese20260907_(courant.depensesAttendues+550);
    courant.detailsCartes.depenses.attendues.push(ligneProvision);
    courant.provisionChargesNonDatees20261018={montant:550,chargeFixeId:id,
      dansCft1:true,dateBancaireConnue:false,source:'cerbere.cft1Audit'};
  })();

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

  const soldeOuverturePrec=soldeHistoriqueOuverture(cp.debut),soldeFinPrec=soldeHistorique(cp.fin);
  const precedent={libelle:libelleCycleDashboardSynthese20260907_(cp.fin),debut:isoDashboardSynthese20260907_(cp.debut),fin:isoDashboardSynthese20260907_(cp.fin),operations:stPrec.operations,soldeJ1:soldeOuverturePrec,soldeMiCycle:soldeHistorique(milieuPrec),soldeFinCycle:soldeFinPrec,revenus:stPrec.revenus,depenses:stPrec.depenses,netOperations:stPrec.net,ecartReconciliation:arrDashboardSynthese20260907_(soldeFinPrec-soldeOuverturePrec-stPrec.net),cbDifferees:null,pilotableInitial:null};
  return{ok:true,version:BUDGETSOFT_DASHBOARD_SYNTHESE_VERSION,versionCorrection:'3.3',sourceBudgetSoft:'composition_snapshot',doctrine:'Dashboard de synthèse : aucune vérité métier recalculée quand un propriétaire BudgetSoft/Cerbère existe ; une projection indisponible est affichée comme telle plutôt qu’inventée. Historique : solde J1 = solde d’ouverture avant les opérations du premier jour.',courtTerme:courant,cycleSuivant:suivant,cyclePrecedent:precedent,provenance:{solde:'tresorerieComptable',previsionsCourant:'projectionEtendue',previsionsCycleSuivant:'Cerbère/Cerbère Express uniquement ; soldes masqués tant que la trésorerie future complète n’a pas de propriétaire fiable',pilotable:'cerbereExpress',cbDifferees:'Operations canoniques · CB différées déjà engagées dont le débit comptable tombe après la fin du cycle et avant la fin du mois',historique:'Operations canoniques + solde canonique ; frontière J1 en ouverture'}};
}

function chargerDashboardSyntheseBudgetSoft20260907(){
  try{if(typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'){const d=lireModuleSnapshotGlobalBudgetSoft20260906_('dashboard');if(d){d.source='snapshot_global';d.sourceBudgetSoft='snapshot_global';return d;}}}catch(e){}
  const executer=function(){const sources=chargerToutesLesDonnees(),comptes=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828(),fin=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(new Date()):new Date(),t=construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,fin,new Date()),cible=new Date(new Date().getFullYear(),new Date().getMonth()+1,27),p=typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function'?construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible):null,c=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null,x=typeof chargerVueCerbereExpressSansContexte20260827_==='function'?chargerVueCerbereExpressSansContexte20260827_():null,r=composerDashboardSyntheseBudgetSoft20260907_({sources,comptes,tresorerieComptable:t,projectionEtendue:p,cerbere:c,cerbereExpress:x});r.source='recalcul_secours';r.sourceBudgetSoft='recalcul_secours';return r;};
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('dashboard-synthese-secours',executer):executer();
}

function auditerDashboardSyntheseBudgetSoft20260907(){const t=Date.now(),d=chargerDashboardSyntheseBudgetSoft20260907(),r={ok:!!(d&&d.ok!==false),version:d&&d.version||'',source:d&&d.source||d&&d.sourceBudgetSoft||'',revisionBudgetSoft:d&&d.revisionBudgetSoft||'',dureeMs:Date.now()-t,solde:d&&d.courtTerme&&d.courtTerme.soldeBancaire,pilotable:d&&d.courtTerme&&d.courtTerme.pilotableDisponible,progression:d&&d.courtTerme&&d.courtTerme.progression,cbDifferees:d&&d.courtTerme&&d.courtTerme.cbDifferees,nombreCb:d&&d.courtTerme&&d.courtTerme.nombreCb};console.log(JSON.stringify(r));return r;}

function auditerCycleSuivantEtHistoriqueDashboardBudgetSoft20260907(){
  const d=chargerDashboardSyntheseBudgetSoft20260907(),s=d&&d.cycleSuivant||{},p=d&&d.cyclePrecedent||{};
  const ecart=arrDashboardSynthese20260907_(Number(p.ecartReconciliation||0));
  const historiqueReconcile=Math.abs(ecart)<=.01;
  const r={ok:!!(d&&d.ok!==false)&&historiqueReconcile,version:d&&d.version||'',versionCorrection:d&&d.versionCorrection||'',historiqueReconcile,cycleSuivant:{revenusPrevisionnels:s.revenusPrevisionnels,depensesPrevisionnelles:s.depensesPrevisionnelles,cbDifferees:s.cbDifferees,pilotablePrevisionnel:s.pilotablePrevisionnel,soldeJ1:s.soldeJ1,soldeMiCycle:s.soldeMiCycle,soldeFinCycle:s.soldeFinCycle,detailPrevision:s.detailPrevision||null},cyclePrecedent:{soldeJ1:p.soldeJ1,soldeFinCycle:p.soldeFinCycle,revenusBudgetaires:p.revenus,depensesBudgetaires:p.depenses,netOperations:p.netOperations,ecartReconciliation:ecart}};
  console.log('[AUDIT Dashboard cycles] '+JSON.stringify(r));return r;
}