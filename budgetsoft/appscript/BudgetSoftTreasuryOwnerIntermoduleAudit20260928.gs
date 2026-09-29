const BUDGETSOFT_TREASURY_OWNER_INTERMODULE_AUDIT_20260928_VERSION='2026-09-29.2';

function arrTreasuryOwnerAudit20260928_(n){return Math.round(Number(n||0)*100)/100;}
function ecartTreasuryOwnerAudit20260928_(a,b){return arrTreasuryOwnerAudit20260928_(Number(a||0)-Number(b||0));}

function auditerProprietairesTresorerieIntermodules20260928(){
  const t0=Date.now();
  // Un audit doit lire la révision réellement persistée, sans passer par la
  // couche d'accès des interfaces qui peut masquer un snapshot déclaré périmé
  // ou déclencher une reconstruction de fraîcheur. Ici : zéro recalcul métier.
  const chargeurStockage=typeof chargerSnapshotGlobalLegacyBudgetSoft20260906_==='function'
    ?chargerSnapshotGlobalLegacyBudgetSoft20260906_
    :null;
  if(!chargeurStockage){
    throw new Error('Chargeur de stockage du snapshot global BudgetSoft indisponible.');
  }
  const charge=chargeurStockage();
  const etat=charge&&charge.disponible&&charge.etat||null;
  if(!etat||etat.ok!==true||etat.publie!==true||!etat.revisionBudgetSoft){
    throw new Error('Aucune révision globale BudgetSoft persistée, publiée et valide à auditer.');
  }
  const modules=etat.modules||{};
  const cerbere=modules.cerbere||null;
  const dashboard=modules.dashboard||null;
  const projection=modules.projectionEtendue||null;
  const comptes=modules.comptes||null;

  const p0=cerbere&&Array.isArray(cerbere.periodes)?cerbere.periodes[0]:null;
  const v0=p0&&p0.v37||{};
  const periode=p0&&p0.periode||p0||{};
  const debut=periode&&periode.debut?new Date(periode.debut):null;
  const frontiere=debut&&!isNaN(debut.getTime())?new Date(debut):null;
  if(frontiere){frontiere.setDate(frontiere.getDate()-1);frontiere.setHours(23,59,59,999);}

  const lignesComptes=Array.isArray(comptes&&comptes.comptes)?comptes.comptes:[];
  const compteCourant=lignesComptes.find(function(x){
    if(typeof estCompteCourantCanoniqueBudgetSoft20260906_==='function'){
      return estCompteCourantCanoniqueBudgetSoft20260906_(x);
    }
    const t=String((x&&x.nom||'')+' '+(x&&x.type||'')).toLowerCase();
    return /courant|compte\s*(joint|cheques?)/.test(t)&&!/livret|epargne|épargne/.test(t);
  })||null;
  const soldeReelCompte=compteCourant&&Number(compteCourant.soldeReel);
  const dateReferenceCompte=compteCourant&&compteCourant.dateSolde||'';

  let operations=[];
  try{operations=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];}catch(e){operations=[];}
  const ss1Canonique=frontiere&&compteCourant&&typeof soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_==='function'
    ?Number(soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_(frontiere,{
      soldeReel:soldeReelCompte,
      comptes:[compteCourant],
      operations:operations,
      dateReference:dateReferenceCompte||new Date()
    }))
    :NaN;
  const ss1=Number(v0&&v0.ss1);

  const d0=dashboard&&dashboard.courtTerme||{};
  const dashboardSs1=Number(d0.soldeInitialReference);
  const dashboardRt1=Number(d0.revenusAttendus);
  const rt1=Number(v0&&v0.rt1);

  const lignes=Array.isArray(projection&&projection.lignes)?projection.lignes:[];
  const revenusRecurrents=lignes.filter(function(x){
    return String(x&&x.source||'')==='revenu_recurrent'&&Number(x&&x.montantSigne||0)>0;
  });
  const salaire=v0&&v0.salaireOuverture||{};
  const ajustementSalaire=Number(salaire&&salaire.ajustementSS1||0);

  const controles={
    snapshotUniqueValide:!!(etat&&etat.ok===true&&etat.revisionBudgetSoft),
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
    version:'2026-09-29.3',
    revisionBudgetSoft:String(etat.revisionBudgetSoft||''),
    dureeMs:Date.now()-t0,
    doctrine:'Audit sans recalcul métier : une seule révision globale publiée est lue ; SS1 est recomposé depuis le solde bancaire canonique de cette révision et les opérations réelles jusqu à sa date de référence.',
    proprietaires:{
      snapshot:'chargerSnapshotGlobalLegacyBudgetSoft20260906_ (lecture stockage uniquement)',
      ss1:'soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_',
      trajectoire:'modules.projectionEtendue du snapshot',
      recettes:'modules.cerbere.periodes[0].v37.rt1',
      dashboard:'modules.dashboard, consommateur uniquement'
    },
    frontiere:frontiere?Utilities.formatDate(frontiere,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
    referenceBancaire:{
      compte:compteCourant?String(compteCourant.nom||''):'',
      soldeReel:arrTreasuryOwnerAudit20260928_(soldeReelCompte),
      dateReference:String(dateReferenceCompte||''),
      source:String(compteCourant&&compteCourant.sourceSolde||'')
    },
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
  console.log('[AUDIT PROPRIETAIRES TRESORERIE INTERMODULES 20260929 SNAPSHOT UNIQUE] '+JSON.stringify(out));
  return out;
}
