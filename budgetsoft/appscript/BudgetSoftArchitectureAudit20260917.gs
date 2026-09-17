const BUDGETSOFT_ARCHITECTURE_AUDIT_20260917_VERSION='2026-09-17.1';

function fonctionDisponibleArchitectureBudgetSoft20260917_(nom){
  try{return typeof this[nom]==='function';}catch(e){return false;}
}

function arrArchitectureBudgetSoft20260917_(n){return Math.round((Number(n)||0)*100)/100;}

function lireTableArchitectureBudgetSoft20260917_(nom){
  try{return typeof lireTable_==='function'?(lireTable_(nom)||[]):[];}catch(e){return[];}
}

function resumePropertiesArchitectureBudgetSoft20260917_(){
  try{
    const props=PropertiesService.getDocumentProperties().getProperties()||{};
    const cles=Object.keys(props);
    let caracteres=0;
    const prefixes={};
    cles.forEach(k=>{
      const v=String(props[k]||'');caracteres+=String(k).length+v.length;
      const p=String(k).split('_').slice(0,3).join('_')||'(sans_prefixe)';
      prefixes[p]=(prefixes[p]||0)+1;
    });
    return{ok:true,nombreCles:cles.length,caracteresApprox:caracteres,prefixes:Object.entries(prefixes).sort((a,b)=>b[1]-a[1]).slice(0,20).map(x=>({prefixe:x[0],nombre:x[1]}))};
  }catch(e){return{ok:false,erreur:String(e&&e.message||e)};}
}

function auditerArchitectureBudgetSoft20260917(){
  const t0=Date.now();
  const operationsSource=lireTableArchitectureBudgetSoft20260917_('Operations');
  const categories=lireTableArchitectureBudgetSoft20260917_('Categories');
  const charges=lireTableArchitectureBudgetSoft20260917_('Charges_fixes');
  const credits=lireTableArchitectureBudgetSoft20260917_('Credits');
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(operationsSource):operationsSource;
  const partition=typeof partitionnerOperationsCanoniqueBudgetSoft20260906_==='function'
    ?partitionnerOperationsCanoniqueBudgetSoft20260906_(operations,new Date())
    :{realisees:operations,futures:[],indatees:[],dateReference:''};

  const fonctions=[
    ['chargerToutesLesDonnees','Code.gs'],
    ['chargerOperationsLeger20260828','OperationsLazy20260828.gs'],
    ['chargerSnapshotOperations20260828','OperationsSnapshot20260828.gs'],
    ['chargerSyntheseComptes20260828','ComptesReview20260828.gs'],
    ['chargerTresorerieUnifieeBudgetSoft20260907','ZZZZZZZZZZZZZ_BudgetSoftUnifiedTreasury20260907.gs'],
    ['chargerDashboardSyntheseV3BudgetSoft20260907','BudgetSoftDashboardSyntheseAccess20260907.gs'],
    ['chargerCerbereCockpitCanonique20260914','CerbereCanonicalPublicEndpoint20260914.gs'],
    ['chargerCerbereCockpit20260902','zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz_CerbereFreshHealthParity20260917.gs'],
    ['chargerVueCerbereExpress20260827','CerbereExpressView20260827.gs'],
    ['chargerCreditsEtDettesV2','CreditsDataV2.gs'],
    ['chargerCreditsPatrimoineIntegres20260915','CreditsPatrimoineIntegration20260915.gs'],
    ['chargerAnalysesBudgetairesV23','ZZZZZZZZZZZZZZZZ_BudgetSoftAnalysesSnapshot20260912.gs']
  ].map(x=>({fonction:x[0],fichier:x[1],disponible:fonctionDisponibleArchitectureBudgetSoft20260917_(x[0])}));

  let snapshotGlobal={ok:false,disponible:false};
  try{if(typeof chargerSnapshotGlobalBudgetSoft20260906==='function')snapshotGlobal=chargerSnapshotGlobalBudgetSoft20260906()||snapshotGlobal;}catch(e){snapshotGlobal={ok:false,disponible:false,erreur:String(e&&e.message||e)};}
  let snapshotOperations={ok:false,disponible:false};
  try{if(typeof chargerSnapshotOperations20260828==='function')snapshotOperations=chargerSnapshotOperations20260828()||snapshotOperations;}catch(e){snapshotOperations={ok:false,disponible:false,erreur:String(e&&e.message||e)};}

  const categoriesTresorerie=categories.filter(c=>String(c.type||'').toLowerCase()==='tresorerie').map(c=>String(c.nom||'')).filter(Boolean).sort();
  const chargesRevolving=charges.filter(c=>String(c.categorie||'').trim()==='Crédits revolving');
  const idsChargesRevolving=new Set(chargesRevolving.map(c=>String(c.id||'')));
  const operationsLieesRevolving=operationsSource.filter(o=>idsChargesRevolving.has(String(o.charge_fixe_id||'')));
  const operationsRevolvingMalClassees=operationsLieesRevolving.filter(o=>String(o.categorie||'').trim()!=='Crédits revolving').map(o=>({id:String(o.id||''),date:o.date_comptable||o.date||'',libelle:String(o.libelle||o.libelle_bancaire||''),montant:Number(o.montant||0),categorie:String(o.categorie||''),charge_fixe_id:String(o.charge_fixe_id||'')}));
  const creditsRevolving=credits.filter(c=>String(c.type_credit||'').toLowerCase()==='revolving').map(c=>({id:String(c.id||''),nom:String(c.nom||''),mensualite:Number(c.mensualite||0),capital_restant:Number(c.capital_restant||0)}));

  const risques=[
    {code:'CERBERE_UI_SNAPSHOT_ONLY',niveau:'critique',detail:'L UI Cerbère appelle chargerCerbereCockpitCanonique20260914(), endpoint snapshot-only, alors que chargerCerbereCockpit20260902() possède un fallback frais.'},
    {code:'OPERATIONS_FUTURES_NON_RENDUES',niveau:'critique',detail:'Le serveur sépare Operations et Operations_futures ; la liste UI principale ne rend que state.data.Operations.'},
    {code:'LECTURE_OPERATIONS_AVEC_ECRITURE_SNAPSHOT',niveau:'eleve',detail:'chargerOperationsLeger20260828() mémorise un snapshot local pendant une lecture écran ; un affichage n est donc pas strictement read-only.'},
    {code:'TRESORERIE_TYPES_UI_EXPOSES',niveau:'eleve',detail:'Index.html expose tresorerie_sortie / tresorerie_entree et OperationTypeUI.html les active selon des catégories de type tresorerie.'},
    {code:'CATEGORIES_TRESORERIE_AUTO_INSTALLEES',niveau:'eleve',detail:'installerArchitectureCategoriesBudgetSoft() peut créer automatiquement les catégories de type tresorerie définies dans CategoryDefaults.gs.'},
    {code:'OVERRIDES_UI_ORDONNES',niveau:'eleve',detail:'Index.html charge une longue chaîne de scripts UI qui redéfinissent ouvrirVue, charger, rendreDashboard, rendreComptes et chargerCerbereV2UI selon l ordre d inclusion.'},
    {code:'SNAPSHOTS_LOCAUX_PLUS_GLOBAL',niveau:'eleve',detail:'Le système combine snapshot global et snapshots locaux Comptes/Operations ; leurs cycles de fraîcheur ne sont pas uniformes.'}
  ];

  const controles=[
    {code:'FONCTIONS_CRITIQUES_PRESENTES',ok:fonctions.every(f=>f.disponible),detail:fonctions.filter(f=>!f.disponible).map(f=>f.fonction).join(', ')||'toutes présentes'},
    {code:'OPERATIONS_FUTURES_EXISTENT',ok:partition.futures.length>0,detail:String(partition.futures.length)+' future(s) sur '+String(operations.length)+' canonique(s)'},
    {code:'REVOLVING_LIES_BIEN_CATEGORISES',ok:operationsRevolvingMalClassees.length===0,detail:String(operationsRevolvingMalClassees.length)+' anomalie(s) parmi '+String(operationsLieesRevolving.length)+' opération(s) liées à des charges revolving'},
    {code:'SNAPSHOT_GLOBAL_DISPONIBLE',ok:!!snapshotGlobal.disponible,detail:String(snapshotGlobal.revisionBudgetSoft||snapshotGlobal.genereLe||snapshotGlobal.erreur||'indisponible')},
    {code:'AUCUNE_CATEGORIE_TRESORERIE',ok:categoriesTresorerie.length===0,detail:categoriesTresorerie.join(', ')||'aucune'}
  ];

  const out={
    ok:controles.filter(c=>!['SNAPSHOT_GLOBAL_DISPONIBLE','AUCUNE_CATEGORIE_TRESORERIE'].includes(c.code)).every(c=>c.ok),
    version:BUDGETSOFT_ARCHITECTURE_AUDIT_20260917_VERSION,
    lectureSeule:true,
    date:new Date().toISOString(),
    dureeMs:Date.now()-t0,
    controles,
    fonctions,
    operations:{source:operationsSource.length,canonique:operations.length,realisees:partition.realisees.length,futures:partition.futures.length,indatees:partition.indatees.length,dateReference:partition.dateReference||''},
    snapshots:{global:{disponible:!!snapshotGlobal.disponible,revisionBudgetSoft:String(snapshotGlobal.revisionBudgetSoft||''),genereLe:String(snapshotGlobal.genereLe||''),erreur:String(snapshotGlobal.erreur||'')},operations:{disponible:!!snapshotOperations.disponible,genereLe:String(snapshotOperations.genereLe||''),totalOperations:Number(snapshotOperations.totalOperations||0),totalFutures:Number(snapshotOperations.totalFutures||0)}},
    categories:{tresorerie:categoriesTresorerie},
    revolving:{credits:creditsRevolving,chargesFixes:chargesRevolving.map(c=>({id:String(c.id||''),libelle:String(c.libelle||''),categorie:String(c.categorie||'')})),operationsLiees:operationsLieesRevolving.length,operationsMalClassees:operationsRevolvingMalClassees},
    properties:resumePropertiesArchitectureBudgetSoft20260917_(),
    risques
  };
  console.log('[AUDIT ARCHITECTURE BUDGETSOFT 20260917] '+JSON.stringify(out));
  return out;
}
