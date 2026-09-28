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
