const BUDGETSOFT_TREASURY_OWNER_INTERMODULE_AUDIT_20260928_VERSION='2026-09-28.1';

function arrTreasuryOwnerAudit20260928_(n){return Math.round(Number(n||0)*100)/100;}
function ecartTreasuryOwnerAudit20260928_(a,b){return arrTreasuryOwnerAudit20260928_(Number(a||0)-Number(b||0));}

function auditerProprietairesTresorerieIntermodules20260928(){
  const cerbere=typeof chargerCerbereCockpit20260902==='function'
    ?chargerCerbereCockpit20260902()
    :(typeof chargerCerbereV374==='function'?chargerCerbereV374():null);
  const p0=cerbere&&Array.isArray(cerbere.periodes)?cerbere.periodes[0]:null;
  const v0=p0&&p0.v37||{};
  const periode=p0&&p0.periode||p0||{};
  const debut=periode&&periode.debut?new Date(periode.debut):null;
  const frontiere=debut&&!isNaN(debut.getTime())?new Date(debut):null;
  if(frontiere){frontiere.setDate(frontiere.getDate()-1);frontiere.setHours(23,59,59,999);}

  const ss1Canonique=frontiere&&typeof soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_==='function'
    ?Number(soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_(frontiere))
    :NaN;
  const ss1=Number(v0&&v0.ss1);

  const dashboard=typeof chargerDashboardSyntheseBudgetSoft20260907==='function'
    ?chargerDashboardSyntheseBudgetSoft20260907():null;
  const d0=dashboard&&dashboard.courtTerme||{};
  const dashboardSs1=Number(d0.soldeInitialReference);
  const dashboardRt1=Number(d0.revenusAttendus);
  const rt1=Number(v0&&v0.rt1);

  const cible=periode&&periode.fin?periode.fin:null;
  const projection=cible&&typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function'
    ?construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible):null;
  const lignes=Array.isArray(projection&&projection.lignes)?projection.lignes:[];
  const revenusRecurrents=lignes.filter(function(x){
    return String(x&&x.source||'')==='revenu_recurrent'&&Number(x&&x.montantSigne||0)>0;
  });
  const salaire=v0&&v0.salaireOuverture||{};
  const ajustementSalaire=Number(salaire&&salaire.ajustementSS1||0);

  const controles={
    ss1CanoniqueDisponible:Number.isFinite(ss1Canonique),
    ss1CerbereEgalCanon:Number.isFinite(ss1Canonique)&&Number.isFinite(ss1)&&Math.abs(ss1-ss1Canonique)<.011,
    dashboardLitSs1Cerbere:Number.isFinite(dashboardSs1)&&Number.isFinite(ss1)&&Math.abs(dashboardSs1-ss1)<.011,
    dashboardLitRt1Cerbere:Number.isFinite(dashboardRt1)&&Number.isFinite(rt1)&&Math.abs(dashboardRt1-rt1)<.011,
    salaireNeModifiePasSs1:Math.abs(ajustementSalaire)<.011,
    projectionCanoniqueDisponible:!!(projection&&projection.ok!==false),
    revenusRecurrentsNonFiltres:revenusRecurrents.length>0
  };
  const ok=Object.keys(controles).every(function(k){return controles[k]===true;});

  const out={
    ok:ok,
    lectureSeule:true,
    version:BUDGETSOFT_TREASURY_OWNER_INTERMODULE_AUDIT_20260928_VERSION,
    doctrine:'Une seule vérité : SS1 = clôture bancaire réelle du 27 ; Dashboard lit Cerbère ; soldes futurs lisent la trajectoire canonique ; aucun filtre local ne supprime les revenus récurrents du cycle.',
    proprietaires:{
      ss1:'soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_',
      trajectoire:'construireTrajectoireTresorerieCanoniqueBudgetSoft20260907',
      recettes:'cerbere.periodes[0].v37.rt1',
      dashboard:'consommateur uniquement'
    },
    frontiere:frontiere?Utilities.formatDate(frontiere,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
    valeurs:{
      ss1Canonique:arrTreasuryOwnerAudit20260928_(ss1Canonique),
      ss1Cerbere:arrTreasuryOwnerAudit20260928_(ss1),
      ecartSs1:ecartTreasuryOwnerAudit20260928_(ss1,ss1Canonique),
      dashboardSs1:arrTreasuryOwnerAudit20260928_(dashboardSs1),
      rt1Cerbere:arrTreasuryOwnerAudit20260928_(rt1),
      revenusAttendusDashboard:arrTreasuryOwnerAudit20260928_(dashboardRt1),
      ajustementSs1Salaire:arrTreasuryOwnerAudit20260928_(ajustementSalaire),
      revenusRecurrentsProjection:revenusRecurrents.length,
      totalRevenusRecurrentsProjection:arrTreasuryOwnerAudit20260928_(revenusRecurrents.reduce(function(s,x){return s+Number(x.montantSigne||0);},0))
    },
    controles:controles,
    versions:{
      cerbere:String(cerbere&&cerbere.version||''),
      dashboard:String(dashboard&&dashboard.version||''),
      projection:String(projection&&projection.version||'')
    }
  };
  console.log('[AUDIT PROPRIETAIRES TRESORERIE INTERMODULES 20260928] '+JSON.stringify(out));
  return out;
}


function auditerVirementEpargneSs1BudgetSoft20260928(){
  const ops=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];
  const params=typeof lireTable_==='function'?(lireTable_('Parametres')||[]):[];
  const comptes=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():null;
  const compteJoint=(comptes&&Array.isArray(comptes.comptes)?comptes.comptes:[]).find(function(x){return /compte joint/i.test(String(x&&x.nom||''));})||null;
  const compteId=String(compteJoint&&compteJoint.id||'');
  const cibleDebut='2026-09-25',cibleFin='2026-09-29';
  function jourOp(o){
    const jc=typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):'';
    const jm=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(o&&o.date):'';
    return {comptable:jc,mouvement:jm};
  }
  const lignes=ops.filter(function(o){
    if(compteId&&String(o&&o.compte||'')!==compteId)return false;
    const j=jourOp(o),a=j.mouvement||j.comptable;
    return !!a&&a>=cibleDebut&&a<=cibleFin;
  }).map(function(o){
    const j=jourOp(o),statut=String(o&&o.statut_bancaire||'').trim().toLowerCase();
    const refJour='2026-08-15';
    const apresReference=!!j.comptable&&j.comptable>refJour;
    const provisoireJourReference=/provisoire/.test(statut)&&!!j.mouvement&&j.mouvement>=refJour&&!!j.comptable&&j.comptable<=refJour;
    return {
      id:String(o&&o.id||''),
      montant:Number(o&&o.montant||0),
      type:String(o&&o.type||''),
      categorie:String(o&&o.categorie||''),
      compte:String(o&&o.compte||''),
      date:String(o&&o.date||''),
      date_comptable:String(o&&o.date_comptable||''),
      jourMouvement:j.mouvement,
      jourComptable:j.comptable,
      statut_bancaire:String(o&&o.statut_bancaire||''),
      source_bancaire:String(o&&o.source_bancaire||''),
      libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
      inclusionSelonReference1508:apresReference||provisoireJourReference,
      motifInclusion:apresReference?'jour_comptable_apres_reference':(provisoireJourReference?'provisoire_jour_mouvement':'exclu')
    };
  });
  const refs=params.filter(function(p){
    const k=String(p&&p.cle||'');
    return compteId&&(k==='solde_releve_'+compteId||k==='date_solde_releve_'+compteId||k==='solde_releve_source_'+compteId);
  }).map(function(p){return{cle:String(p&&p.cle||''),valeur:p&&p.valeur};});
  const out={
    ok:true,lectureSeule:true,version:'2026-09-29.1',
    doctrine:'Audit ciblé 25-29/09 du compte joint : le virement vers Epargne doit rester une sortie bancaire du compte courant.',
    compteJoint:compteJoint,
    references:refs,
    fenetre:{debut:cibleDebut,fin:cibleFin},
    lignes:lignes
  };
  console.log('[AUDIT VIREMENT EPARGNE SS1 CIBLE 20260929] '+JSON.stringify(out));
  return out;
}
