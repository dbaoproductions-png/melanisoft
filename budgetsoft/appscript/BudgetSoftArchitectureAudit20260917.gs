const BUDGETSOFT_ARCHITECTURE_AUDIT_20260917_VERSION='2026-09-17.2';

function fonctionDisponibleArchitectureBudgetSoft20260917_(nom){
  try{return !!eval('(typeof '+String(nom)+' === "function")');}catch(e){return false;}
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


const BUDGETSOFT_INTERMODULE_SUPERVISION_20260921_VERSION='2026-09-21.1';

function sourceFonctionSupervisionBudgetSoft20260921_(nom){
  try{
    const fn=globalThis[String(nom||'')];
    return typeof fn==='function'?String(fn):'';
  }catch(e){return'';}
}

function controlerEndpointSnapshotOnlyBudgetSoft20260921_(spec){
  const src=sourceFonctionSupervisionBudgetSoft20260921_(spec.nom),erreurs=[];
  if(!src)erreurs.push('fonction_absente');
  (spec.exige||[]).forEach(x=>{if(src.indexOf(x)<0)erreurs.push('manque:'+x);});
  (spec.interdit||[]).forEach(x=>{if(src.indexOf(x)>=0)erreurs.push('interdit:'+x);});
  return{nom:spec.nom,ok:erreurs.length===0,erreurs};
}

function jourSupervisionBudgetSoft20260921_(v){
  if(v==null||v==='')return'';
  const d=v instanceof Date?new Date(v):new Date(v);
  return isNaN(d.getTime())?'':Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}

function ecartValeursSupervisionBudgetSoft20260921_(obj){
  const vals=Object.entries(obj).filter(([,v])=>Number.isFinite(Number(v))).map(([k,v])=>[k,Number(v)]);
  if(!vals.length)return{ok:false,ecart:null,valeurs:Object.fromEntries(vals),nombre:0};
  const nums=vals.map(([,v])=>v),ecart=Math.round((Math.max.apply(null,nums)-Math.min.apply(null,nums))*100)/100;
  return{ok:vals.length===Object.keys(obj).length&&Math.abs(ecart)<=.01,ecart,valeurs:Object.fromEntries(vals),nombre:vals.length};
}

function auditerSupervisionIntermoduleBudgetSoft20260921(){
  const t0=Date.now();

  const endpoints=[
    {nom:'chargerSyntheseComptes20260828',exige:['chargerSyntheseComptesDepuisSnapshotGlobal20260906_'],interdit:['construireSyntheseComptes20260828_']},
    {nom:'chargerDashboardSyntheseV3BudgetSoft20260907',exige:['lireModuleSnapshotGlobalBudgetSoft20260906_'],interdit:['chargerToutesLesDonnees','construireTresorerieComptableCanoniqueBudgetSoft20260906_','construireTrajectoireTresorerieCanoniqueBudgetSoft20260907']},
    {nom:'chargerTresorerieComptableCanoniqueBudgetSoft20260906',exige:['lireTresorerieComptableSnapshotBudgetSoft20260906_'],interdit:['chargerToutesLesDonnees','construireTresorerieComptableCanoniqueBudgetSoft20260906_']},
    {nom:'chargerTresorerieUnifieeBudgetSoft20260907',exige:['lireEtatGlobalBudgetSoftSiDisponible20260906_'],interdit:['construireTrajectoireTresorerieCanoniqueBudgetSoft20260907']},
    {nom:'chargerCerbereCockpitCanonique20260914',exige:['chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906'],interdit:['chargerCerbereCockpitProprietaire20260917_','recalculerCerbereCockpitP1Frais20260912_']},
    {nom:'chargerVueCerbereExpress20260827',exige:['lireModuleSnapshotGlobalBudgetSoft20260906_'],interdit:['chargerVueCerbereExpressSansContexte20260827_']},
    {nom:'chargerCreditsEtDettesV2',exige:['lireModuleSnapshotGlobalBudgetSoft20260906_'],interdit:['lireCreditsEtendusV2_','lireTable_']},
    {nom:'chargerPatrimoine',exige:['lireModuleSnapshotGlobalBudgetSoft20260906_'],interdit:['lireTable_','construirePatrimoineLegacySource20260921_']},
    {nom:'chargerAnalysesBudgetairesV23',exige:['servirAnalysesDepuisSnapshotBudgetSoft20260912_'],interdit:['chargerAnalysesBudgetairesV23Source20260912_']},
    {nom:'chargerEngagementsBancairesFuturs',exige:['servirEngagementsBancairesDepuisSnapshotBudgetSoft20260912_'],interdit:['chargerEngagementsBancairesFutursSource20260912_']},
    {nom:'chargerBudgetPeriode',exige:['servirBudgetDepuisSnapshotBudgetSoft20260918_'],interdit:['chargerBudgetPeriodeSource20260918_']},
    {nom:'chargerPluxee',exige:['servirPluxeeDepuisSnapshotBudgetSoft20260918_'],interdit:['chargerPluxeeSource20260918_']},
    {nom:'chargerConseillerFinancier',exige:['lireModuleSnapshotGlobalBudgetSoft20260906_'],interdit:['lireTable_','chargerAnalysesBudgetaires']},
    {nom:'chargerCreditsPatrimoineIntegres20260915',exige:['lireEtatGlobalBudgetSoftSiDisponible20260906_'],interdit:['chargerCreditsEtDettesV2','chargerPatrimoine']}
  ];
  const controlesEndpoints=endpoints.map(controlerEndpointSnapshotOnlyBudgetSoft20260921_);

  const constructeur=sourceFonctionSupervisionBudgetSoft20260921_('reconstruireSnapshotGlobalSyntheseBudgetSoft20260907');
  const compositeurCerbere=sourceFonctionSupervisionBudgetSoft20260921_('composerCerbereCockpitDepuisBaseSnapshotBudgetSoft20260910_');
  const appelsPublicsInterdits=[
    'chargerCerbereCockpit20260902(',
    'chargerCerbereCockpitCanonique20260914(',
    'chargerCreditsEtDettesV2(',
    'chargerPatrimoine(',
    'chargerDashboardSyntheseV3BudgetSoft20260907(',
    'chargerTresorerieUnifieeBudgetSoft20260907(',
    'chargerBudgetPeriode(',
    'chargerPluxee(',
    'chargerAnalysesBudgetairesV23(',
    'chargerEngagementsBancairesFuturs(',
    'chargerConseillerFinancier('
  ];
  const appelsPublicsTrouves=appelsPublicsInterdits.filter(x=>constructeur.indexOf(x)>=0||compositeurCerbere.indexOf(x)>=0);

  let brut={ok:false,disponible:false};
  try{
    brut=typeof chargerSnapshotGlobalLegacyBudgetSoft20260906_==='function'
      ?chargerSnapshotGlobalLegacyBudgetSoft20260906_()
      :(typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():brut);
  }catch(e){brut={ok:false,disponible:false,erreur:String(e&&e.message||e)};}
  const e=brut&&brut.disponible&&brut.etat||null,m=e&&e.modules||{};

  const modulesRequis=['comptes','credits','patrimoine','budget','pluxee','tresorerieComptable','projectionEtendue','cerbere','cerbereExpress','dashboard','analyses','engagementsBancaires','conseiller'];
  const modulesAbsents=modulesRequis.filter(n=>!m[n]||m[n].ok===false);

  const soldes=ecartValeursSupervisionBudgetSoft20260921_({
    comptes:m.comptes&&m.comptes.synthese&&m.comptes.synthese.disponible,
    tresorerieComptable:m.tresorerieComptable&&m.tresorerieComptable.soldeReel,
    projection:m.projectionEtendue&&m.projectionEtendue.soldeReel,
    dashboard:m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.soldeBancaire,
    cerbere:m.cerbere&&m.cerbere.reel&&m.cerbere.reel.soldeBancaire
  });

  const dates={
    tresorerieComptable:jourSupervisionBudgetSoft20260921_(m.tresorerieComptable&&m.tresorerieComptable.dateReference),
    projection:jourSupervisionBudgetSoft20260921_(m.projectionEtendue&&m.projectionEtendue.dateReference),
    dashboard:jourSupervisionBudgetSoft20260921_(m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.dateReference),
    cerbere:jourSupervisionBudgetSoft20260921_(m.cerbere&&m.cerbere.reel&&m.cerbere.reel.dateReference)
  };
  const datesPresentes=Object.values(dates).filter(Boolean),datesUniques=[...new Set(datesPresentes)];
  const aujourd=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const datesOk=datesPresentes.length===Object.keys(dates).length&&datesUniques.length===1&&datesUniques[0]===aujourd;

  const p0=m.cerbere&&Array.isArray(m.cerbere.periodes)?m.cerbere.periodes[0]:null;
  const epCer=p0&&p0.enveloppePilotable||{};
  const epTotal=ecartValeursSupervisionBudgetSoft20260921_({
    dashboard:m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.ep,
    cerbere:epCer.total,
    express:m.cerbereExpress&&m.cerbereExpress.pilotable&&m.cerbereExpress.pilotable.allocation
  });
  const epReste=ecartValeursSupervisionBudgetSoft20260921_({
    dashboard:m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.epDisponible,
    cerbere:epCer.reste,
    express:m.cerbereExpress&&m.cerbereExpress.pilotable&&m.cerbereExpress.pilotable.reste
  });
  const cockpit=p0&&p0.v37&&p0.v37.cockpit20260902||{};
  const pSoutenable=ecartValeursSupervisionBudgetSoft20260921_({
    dashboard:m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.pSoutenable,
    cerbere:cockpit.pSoutenable!=null?cockpit.pSoutenable:cockpit.p1Total
  });

  const perf=e&&e.performance&&e.performance.modules||{};
  const performances=Object.keys(perf).map(k=>({module:k,dureeMs:Number(perf[k]||0)})).sort((a,b)=>b.dureeMs-a.dureeMs);
  const lents=performances.filter(x=>x.dureeMs>10000);

  const controles=[
    {code:'SNAPSHOT_PUBLIE',ok:!!(e&&e.ok===true&&e.publie===true&&e.revisionBudgetSoft),detail:e&&e.revisionBudgetSoft||brut&&brut.erreur||'indisponible'},
    {code:'VERSION_CONSTRUCTEUR_COURANTE',ok:!!(e&&String(e.versionConstructeur||'')===String(typeof BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION!=='undefined'?BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION:'')),detail:String(e&&e.versionConstructeur||'')},
    {code:'MODULES_CANONIQUES_COMPLETS',ok:modulesAbsents.length===0,detail:modulesAbsents.join(', ')||'tous présents'},
    {code:'ENDPOINTS_PUBLICS_SNAPSHOT_ONLY',ok:controlesEndpoints.every(x=>x.ok),detail:controlesEndpoints.filter(x=>!x.ok).map(x=>x.nom+':'+x.erreurs.join('|')).join('; ')||'conformes'},
    {code:'CONSTRUCTEUR_SANS_ENDPOINT_PUBLIC',ok:appelsPublicsTrouves.length===0,detail:appelsPublicsTrouves.join(', ')||'aucun appel public'},
    {code:'SOLDE_REEL_TRANSVERSAL_UNIQUE',ok:soldes.ok,detail:'écart '+String(soldes.ecart)},
    {code:'DATE_REFERENCE_TRANSVERSALE_UNIQUE',ok:datesOk,detail:JSON.stringify(dates)},
    {code:'EP_TOTAL_TRANSVERSAL_UNIQUE',ok:epTotal.ok,detail:'écart '+String(epTotal.ecart)},
    {code:'EP_RESTANT_TRANSVERSAL_UNIQUE',ok:epReste.ok,detail:'écart '+String(epReste.ecart)},
    {code:'P_SOUTENABLE_TRANSVERSAL_UNIQUE',ok:pSoutenable.ok,detail:'écart '+String(pSoutenable.ecart)}
  ];

  const out={
    ok:controles.every(x=>x.ok),
    version:BUDGETSOFT_INTERMODULE_SUPERVISION_20260921_VERSION,
    lectureSeule:true,
    dureeMs:Date.now()-t0,
    revisionBudgetSoft:String(e&&e.revisionBudgetSoft||''),
    genereLe:String(e&&e.genereLe||''),
    controles,
    endpoints:controlesEndpoints,
    modules:{requis:modulesRequis,absents:modulesAbsents},
    transversales:{soldes,dates,epTotal,epReste,pSoutenable},
    performances:{modules:performances,lentsPlusDe10s:lents},
    architecture:{
      constructeur:'reconstruireSnapshotGlobalSyntheseBudgetSoft20260907',
      porteLecture:'lireEtatGlobalBudgetSoftSiDisponible20260906_',
      principe:'constructeurs internes -> snapshot global atomique -> endpoints publics snapshot-only'
    }
  };
  console.log('[SUPERVISION INTERMODULE BUDGETSOFT 20260921] '+JSON.stringify(out));
  return out;
}
