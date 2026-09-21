const BUDGETSOFT_ARCHITECTURE_AUDIT_20260917_VERSION='2026-09-21.2';

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
  const r=auditerSupervisionIntermoduleBudgetSoft20260921();
  r.aliasHistorique='auditerArchitectureBudgetSoft20260917';
  r.versionAlias=BUDGETSOFT_ARCHITECTURE_AUDIT_20260917_VERSION;
  return r;
}

const BUDGETSOFT_INTERMODULE_SUPERVISION_20260921_VERSION='2026-09-21.5';

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

  let brut={ok:false,disponible:false},effectif={ok:false,disponible:false};
  try{
    brut=typeof chargerSnapshotGlobalLegacyBudgetSoft20260906_==='function'
      ?chargerSnapshotGlobalLegacyBudgetSoft20260906_()
      :(typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():brut);
  }catch(e){brut={ok:false,disponible:false,erreur:String(e&&e.message||e)};}
  try{
    effectif=typeof chargerSnapshotGlobalBudgetSoft20260906==='function'
      ?chargerSnapshotGlobalBudgetSoft20260906()
      :effectif;
  }catch(e){effectif={ok:false,disponible:false,erreur:String(e&&e.message||e)};}
  const stocke=brut&&brut.disponible&&brut.etat||null;
  const e=effectif&&effectif.disponible&&effectif.etat||null;
  const m=e&&e.modules||{};
  const peremption=effectif&&effectif.fraicheur||(
    stocke&&typeof diagnostiquerPeremptionSnapshot20260916_==='function'
      ?diagnostiquerPeremptionSnapshot20260916_(stocke)
      :null
  );

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

  const p1=m.cerbere&&Array.isArray(m.cerbere.periodes)?m.cerbere.periodes[1]:null;
  const c1=p1&&p1.v37&&p1.v37.cockpit20260902||{};
  const projCb=m.projectionEtendue&&m.projectionEtendue.decompositionCanonique&&m.projectionEtendue.decompositionCanonique.groupes&&m.projectionEtendue.decompositionCanonique.groupes.cbDiffereesEngagees;
  const cbEngagee=ecartValeursSupervisionBudgetSoft20260921_({
    dashboard:m.dashboard&&m.dashboard.cycleSuivant&&m.dashboard.cycleSuivant.cbDejaEngagee,
    cerbere:c1&&c1.cbDejaEngagee,
    projection:projCb&&Math.abs(Number(projCb.montant||0))
  });

  const doctrineCb=typeof auditerDoctrineImputationCbPilotableBudgetSoft20260921==='function'
    ?auditerDoctrineImputationCbPilotableBudgetSoft20260921()
    :{ok:false,erreur:'Garde doctrine CB pilotable absente'};

  const envCourant=p0&&Array.isArray(p0.enveloppes)?p0.enveloppes:[];
  const epConsommeDepuisLignes=Math.round(envCourant.reduce(function(s,x){
    const v=Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0));
    return s+(Number.isFinite(v)?Math.max(0,v):0);
  },0)*100)/100;
  const epConsommePublie=Math.round(Number(epCer&&epCer.consomme||0)*100)/100;
  const epConsommationInterne={
    ok:Math.abs(epConsommeDepuisLignes-epConsommePublie)<=0.01,
    lignes:epConsommeDepuisLignes,
    publie:epConsommePublie,
    ecart:Math.round((epConsommePublie-epConsommeDepuisLignes)*100)/100
  };

  const perf=e&&e.performance&&e.performance.modules||{};
  const performances=Object.keys(perf).map(k=>({module:k,dureeMs:Number(perf[k]||0)})).sort((a,b)=>b.dureeMs-a.dureeMs);
  const lents=performances.filter(x=>x.dureeMs>10000);

  const controles=[
    {code:'SNAPSHOT_STOCKE',ok:!!(stocke&&stocke.publie===true&&stocke.revisionBudgetSoft),detail:String(stocke&&stocke.revisionBudgetSoft||brut&&brut.erreur||'indisponible')},
    {code:'SNAPSHOT_EFFECTIF_FRAIS',ok:!!(e&&e.ok===true&&e.publie===true&&e.revisionBudgetSoft),detail:e&&e.revisionBudgetSoft||JSON.stringify(peremption&&peremption.raisons||[])||effectif&&effectif.erreur||'indisponible'},
    {code:'VERSION_CONSTRUCTEUR_COURANTE',ok:!!(e&&String(e.versionConstructeur||'')===String(typeof BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION!=='undefined'?BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION:'')),detail:'stockée='+String(stocke&&stocke.versionConstructeur||'')+' ; courante='+String(typeof BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION!=='undefined'?BUDGETSOFT_GLOBAL_SYNTHESE_20260907_VERSION:'')},
    {code:'MODULES_CANONIQUES_COMPLETS',ok:modulesAbsents.length===0,detail:modulesAbsents.join(', ')||'tous présents'},
    {code:'ENDPOINTS_PUBLICS_SNAPSHOT_ONLY',ok:controlesEndpoints.every(x=>x.ok),detail:controlesEndpoints.filter(x=>!x.ok).map(x=>x.nom+':'+x.erreurs.join('|')).join('; ')||'conformes'},
    {code:'CONSTRUCTEUR_SANS_ENDPOINT_PUBLIC',ok:appelsPublicsTrouves.length===0,detail:appelsPublicsTrouves.join(', ')||'aucun appel public'},
    {code:'SOLDE_REEL_TRANSVERSAL_UNIQUE',ok:soldes.ok,detail:'écart '+String(soldes.ecart)},
    {code:'DATE_REFERENCE_TRANSVERSALE_UNIQUE',ok:datesOk,detail:JSON.stringify(dates)},
    {code:'EP_TOTAL_TRANSVERSAL_UNIQUE',ok:epTotal.ok,detail:'écart '+String(epTotal.ecart)},
    {code:'EP_RESTANT_TRANSVERSAL_UNIQUE',ok:epReste.ok,detail:'écart '+String(epReste.ecart)},
    {code:'P_SOUTENABLE_TRANSVERSAL_UNIQUE',ok:pSoutenable.ok,detail:'écart '+String(pSoutenable.ecart)},
    {code:'CB_DIFFEREE_ENGAGEE_TRANSVERSALE',ok:cbEngagee.ok,detail:'écart '+String(cbEngagee.ecart)+' · '+JSON.stringify(cbEngagee.valeurs)},
    {code:'DOCTRINE_CB_PILOTABLE_DATE_ACHAT',ok:doctrineCb.ok===true,detail:JSON.stringify(doctrineCb.controles||doctrineCb.erreur||'')},
    {code:'EP_CONSOMMATION_INTERNE_COHERENTE',ok:epConsommationInterne.ok,detail:JSON.stringify(epConsommationInterne)}
  ];

  const out={
    ok:controles.every(x=>x.ok),
    version:BUDGETSOFT_INTERMODULE_SUPERVISION_20260921_VERSION,
    lectureSeule:true,
    dureeMs:Date.now()-t0,
    revisionBudgetSoft:String(e&&e.revisionBudgetSoft||''),
    genereLe:String(e&&e.genereLe||''),
    snapshotStocke:{revisionBudgetSoft:String(stocke&&stocke.revisionBudgetSoft||''),genereLe:String(stocke&&stocke.genereLe||''),versionConstructeur:String(stocke&&stocke.versionConstructeur||'')},
    snapshotEffectif:{disponible:!!(effectif&&effectif.disponible),perime:!!(effectif&&effectif.perime),fraicheur:peremption||null},
    controles,
    endpoints:controlesEndpoints,
    modules:{requis:modulesRequis,absents:modulesAbsents},
    transversales:{soldes,dates,epTotal,epReste,pSoutenable,cbEngagee,doctrineCb,epConsommationInterne},
    performances:{modules:performances,lentsPlusDe10s:lents,reconstructionLente:lents.length>0},
    architecture:{
      constructeur:'reconstruireSnapshotGlobalSyntheseBudgetSoft20260907',
      porteLecture:'lireEtatGlobalBudgetSoftSiDisponible20260906_',
      principe:'constructeurs internes -> snapshot global atomique -> endpoints publics snapshot-only'
    }
  };
  console.log('[SUPERVISION INTERMODULE BUDGETSOFT 20260921] '+JSON.stringify(out));
  return out;
}
