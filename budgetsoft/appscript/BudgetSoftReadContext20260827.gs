const BUDGETSOFT_READ_CONTEXT_VERSION='2026-09-07.1';
var BUDGETSOFT_READ_CONTEXT_ACTIVE_=null;
var BUDGETSOFT_READ_CONTEXT_LAST_STATS_=null;

/**
 * Exécute une lecture BudgetSoft lourde avec mémoïsation STRICTEMENT limitée
 * à l'exécution courante. Aucune donnée n'est conservée entre deux appels :
 * chaque nouvelle requête relit donc les feuilles réelles.
 *
 * Depuis 2026-09-03, le contexte couvre aussi les lecteurs dynamiques utilisés
 * par Plan/Cerbère. Depuis 2026-09-05, le cockpit Cerbère peut réutiliser sans
 * clone quelques sources garanties en lecture seule pendant cette exécution.
 *
 * Depuis 2026-09-07, la représentation JSON de chaque source est sérialisée une
 * seule fois. Les consommateurs isolés reçoivent toujours un clone JSON, mais on
 * évite les JSON.stringify répétés sur les grosses tables (notamment Operations).
 */
function avecContexteLectureBudgetSoft20260827_(label, fn) {
  if (typeof fn !== 'function') throw new Error('Fonction de lecture manquante.');
  if (BUDGETSOFT_READ_CONTEXT_ACTIVE_) return fn();

  const originalLireTable = lireTable_;
  const originalPlanDyn = typeof lireFeuilleDynamiquePlan_ === 'function' ? lireFeuilleDynamiquePlan_ : null;
  const originalPlanTable = typeof lireTablePlanCerbere_ === 'function' ? lireTablePlanCerbere_ : null;
  const originalCerbereDyn = typeof lireFeuilleDynamiqueCerbereV379_ === 'function' ? lireFeuilleDynamiqueCerbereV379_ : null;
  const originalRapproCf = typeof lireRapprochementsChargesFixes === 'function' ? lireRapprochementsChargesFixes : null;
  const debut = Date.now(),libelle=String(label||'lecture');
  const memo = Object.create(null);
  const memoJson = Object.create(null);
  const directCerbere=/^cerbere-cockpit/.test(libelle);
  const clesDirectesCerbere=new Set([
    'TABLE:Operations','TABLE:Charges_fixes','TABLE:Categories','TABLE:Comptes',
    'PLAN_DYN:Plan_Actions','PLAN_DYN:Plan_Evenements',
    'PLAN_TABLE:Plan_Actions','PLAN_TABLE:Plan_Evenements',
    'CERBERE_DYN:Controles_releves','CERBERE_DYN:Rapprochements_charges_fixes',
    'RAPPRO_CF'
  ]);
  const stats = {
    version:BUDGETSOFT_READ_CONTEXT_VERSION,
    label:libelle,
    appels:0,
    lecturesFeuille:0,
    reutilisations:0,
    reutilisationsDirectes:0,
    serialisationsJson:0,
    clonesParParse:0,
    parTable:{},
    dureeMs:0
  };

  function assurerStats_(cle){if(!stats.parTable[cle])stats.parTable[cle]={appels:0,lecturesFeuille:0,reutilisations:0,reutilisationsDirectes:0,dureeLectureMs:0,lignes:0};return stats.parTable[cle];}
  function cloneDepuisMemo_(cle){
    const v=memo[cle];
    if(v==null)return v;
    const json=memoJson[cle];
    if(json==null)return v;
    stats.clonesParParse++;
    return JSON.parse(json);
  }
  function initialiserMemo_(cle,valeur){
    if(valeur==null){memo[cle]=valeur;memoJson[cle]=null;return valeur;}
    const json=JSON.stringify(valeur);
    stats.serialisationsJson++;
    memoJson[cle]=json;
    memo[cle]=JSON.parse(json);
    return memo[cle];
  }
  function lireMemo_(cle, lecteur){
    stats.appels++;const s=assurerStats_(cle);s.appels++;
    if(Object.prototype.hasOwnProperty.call(memo,cle)){
      stats.reutilisations++;s.reutilisations++;
      if(directCerbere&&clesDirectesCerbere.has(cle)){stats.reutilisationsDirectes++;s.reutilisationsDirectes++;return memo[cle];}
      return cloneDepuisMemo_(cle);
    }
    const t=Date.now(), valeur=lecteur(), dt=Date.now()-t;
    initialiserMemo_(cle,valeur);
    stats.lecturesFeuille++;s.lecturesFeuille++;s.dureeLectureMs+=dt;
    s.lignes=Array.isArray(valeur)?valeur.length:(valeur&&Array.isArray(valeur.lignes)?valeur.lignes.length:0);
    return directCerbere&&clesDirectesCerbere.has(cle)?memo[cle]:cloneDepuisMemo_(cle);
  }

  BUDGETSOFT_READ_CONTEXT_ACTIVE_={label:stats.label,memo:memo,memoJson:memoJson,stats:stats,directCerbere:directCerbere};
  lireTable_=function(nom){const cle=String(nom||'');return lireMemo_('TABLE:'+cle,function(){return originalLireTable(cle);});};
  if(originalPlanDyn)lireFeuilleDynamiquePlan_=function(nom){const cle=String(nom||'');return lireMemo_('PLAN_DYN:'+cle,function(){return originalPlanDyn(cle);});};
  if(originalPlanTable)lireTablePlanCerbere_=function(nom){const cle=String(nom||'');return lireMemo_('PLAN_TABLE:'+cle,function(){return originalPlanTable(cle);});};
  if(originalCerbereDyn)lireFeuilleDynamiqueCerbereV379_=function(nom){const cle=String(nom||'');return lireMemo_('CERBERE_DYN:'+cle,function(){return originalCerbereDyn(cle);});};
  if(originalRapproCf)lireRapprochementsChargesFixes=function(){return lireMemo_('RAPPRO_CF',function(){return originalRapproCf();});};

  try{return fn();}
  finally{
    lireTable_=originalLireTable;
    if(originalPlanDyn)lireFeuilleDynamiquePlan_=originalPlanDyn;
    if(originalPlanTable)lireTablePlanCerbere_=originalPlanTable;
    if(originalCerbereDyn)lireFeuilleDynamiqueCerbereV379_=originalCerbereDyn;
    if(originalRapproCf)lireRapprochementsChargesFixes=originalRapproCf;
    stats.dureeMs=Date.now()-debut;
    BUDGETSOFT_READ_CONTEXT_LAST_STATS_=stats;
    BUDGETSOFT_READ_CONTEXT_ACTIVE_=null;
    console.log('[PERF BudgetSoft] '+JSON.stringify(stats));
  }
}

/** Accès sans clone au mémo courant, réservé aux traitements de lecture seule. */
function lireMemoDirectBudgetSoft20260905_(cle, lecteur){
  const ctx=BUDGETSOFT_READ_CONTEXT_ACTIVE_;
  if(!ctx||!ctx.memo)return typeof lecteur==='function'?lecteur():null;
  cle=String(cle||'');
  if(Object.prototype.hasOwnProperty.call(ctx.memo,cle)){
    const s=ctx.stats;if(s){s.reutilisationsDirectes=(s.reutilisationsDirectes||0)+1;if(!s.parTable[cle])s.parTable[cle]={appels:0,lecturesFeuille:0,reutilisations:0,reutilisationsDirectes:0,dureeLectureMs:0,lignes:0};s.parTable[cle].reutilisationsDirectes=(s.parTable[cle].reutilisationsDirectes||0)+1;}
    return ctx.memo[cle];
  }
  const valeur=typeof lecteur==='function'?lecteur():null;
  return Object.prototype.hasOwnProperty.call(ctx.memo,cle)?ctx.memo[cle]:valeur;
}
function lireTableDirecteBudgetSoft20260905_(nom){const n=String(nom||'');return lireMemoDirectBudgetSoft20260905_('TABLE:'+n,function(){return lireTable_(n);});}
function lirePlanDynamiqueDirectBudgetSoft20260905_(nom){const n=String(nom||'');return lireMemoDirectBudgetSoft20260905_('PLAN_DYN:'+n,function(){return typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_(n):[];});}
function lireRapprochementsCfDirectBudgetSoft20260905_(){return lireMemoDirectBudgetSoft20260905_('RAPPRO_CF',function(){return typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];});}

function lireDernieresStatsLectureBudgetSoft20260827(){return BUDGETSOFT_READ_CONTEXT_LAST_STATS_||{ok:false,version:BUDGETSOFT_READ_CONTEXT_VERSION,message:'Aucune mesure dans cette exécution.'};}

/**
 * Profil lecture seule du mécanisme de mémoïsation/clonage BudgetSoft.
 * Il ne modifie ni les lecteurs ni les calculs métier : il charge un jeu représentatif
 * de sources dans un contexte isolé, puis mesure sur le mémo courant le coût du
 * JSON.stringify, du JSON.parse, du chemin normal de clone et d'un accès direct.
 * Les mesures sont des micro-benchmarks diagnostiques : elles se chevauchent et ne
 * doivent pas être additionnées comme des étapes du snapshot.
 */
function auditerProfilClonageContexteLectureBudgetSoft20260911(){
  const version='2026-09-11.10',tGlobal=Date.now(),mesures=[],erreurs=[];
  const repetitionsClone=20,repetitionsStringify=10,repetitionsDirect=100;
  const defs=[
    {cle:'TABLE:Operations',lire:function(){return lireTable_('Operations');}},
    {cle:'TABLE:Charges_fixes',lire:function(){return lireTable_('Charges_fixes');}},
    {cle:'TABLE:Comptes',lire:function(){return lireTable_('Comptes');}},
    {cle:'TABLE:Parametres',lire:function(){return lireTable_('Parametres');}},
    {cle:'TABLE:Categories',lire:function(){return lireTable_('Categories');}},
    {cle:'PLAN_TABLE:Plan_Objectifs',lire:function(){return typeof lireTablePlanCerbere_==='function'?lireTablePlanCerbere_('Plan_Objectifs'):[];}},
    {cle:'PLAN_TABLE:Plan_Evenements',lire:function(){return typeof lireTablePlanCerbere_==='function'?lireTablePlanCerbere_('Plan_Evenements'):[];}},
    {cle:'PLAN_DYN:Plan_Actions',lire:function(){return typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Actions'):[];}},
    {cle:'PLAN_DYN:Plan_Evenements',lire:function(){return typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):[];}},
    {cle:'RAPPRO_CF',lire:function(){return typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];}},
    {cle:'CERBERE_DYN:Controles_releves',lire:function(){return typeof lireFeuilleDynamiqueCerbereV379_==='function'?lireFeuilleDynamiqueCerbereV379_('Controles_releves'):[];}}
  ];
  try{
    avecContexteLectureBudgetSoft20260827_('audit-profil-clonage-contexte-20260911',function(){
      defs.forEach(function(def){
        try{
          const tPremier=Date.now();def.lire();const premierAppelMs=Date.now()-tPremier;
          const ctx=BUDGETSOFT_READ_CONTEXT_ACTIVE_,json=ctx&&ctx.memoJson&&ctx.memoJson[def.cle],memo=ctx&&ctx.memo&&ctx.memo[def.cle];
          if(json==null){mesures.push({cle:def.cle,premierAppelMs:premierAppelMs,disponible:false});return;}
          const empreinteAvant=json;
          let t=Date.now();for(let i=0;i<repetitionsStringify;i++)JSON.stringify(memo);const stringifyMs=Date.now()-t;
          t=Date.now();for(let i=0;i<repetitionsClone;i++)JSON.parse(json);const parsePurMs=Date.now()-t;
          t=Date.now();for(let i=0;i<repetitionsClone;i++)def.lire();const cheminCloneMs=Date.now()-t;
          t=Date.now();for(let i=0;i<repetitionsDirect;i++)lireMemoDirectBudgetSoft20260905_(def.cle,function(){return null;});const accesDirectMs=Date.now()-t;
          const empreinteApres=JSON.stringify(ctx.memo[def.cle]);
          let octets=null;try{octets=Utilities.newBlob(json,'application/json').getBytes().length;}catch(e){}
          const cloneUnitaire=cheminCloneMs/repetitionsClone,directUnitaire=accesDirectMs/repetitionsDirect;
          mesures.push({
            cle:def.cle,disponible:true,premierAppelMs:premierAppelMs,
            lignes:Array.isArray(memo)?memo.length:(memo&&Array.isArray(memo.lignes)?memo.lignes.length:0),
            tailleJsonCaracteres:json.length,tailleJsonOctets:octets,
            stringifyBenchmarkMs:stringifyMs,stringifyUnitaireMs:Math.round(stringifyMs/repetitionsStringify*1000)/1000,
            parsePurBenchmarkMs:parsePurMs,parsePurUnitaireMs:Math.round(parsePurMs/repetitionsClone*1000)/1000,
            cheminCloneBenchmarkMs:cheminCloneMs,cheminCloneUnitaireMs:Math.round(cloneUnitaire*1000)/1000,
            accesDirectBenchmarkMs:accesDirectMs,accesDirectUnitaireMs:Math.round(directUnitaire*1000)/1000,
            economieTheoriquePar100AccesMs:Math.round(Math.max(0,cloneUnitaire-directUnitaire)*100*10)/10,
            memoInchange:empreinteAvant===empreinteApres
          });
        }catch(e){erreurs.push({cle:def.cle,erreur:String(e&&e.message||e)});}
      });
      return true;
    });
  }catch(e){erreurs.push({cle:'contexte',erreur:String(e&&e.stack||e&&e.message||e)});}
  const stats=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  mesures.forEach(function(m){const s=stats&&stats.parTable&&stats.parTable[m.cle];m.lecturePhysiqueMs=s?Number(s.dureeLectureMs||0):null;m.appelsContexte=s?Number(s.appels||0):null;m.reutilisationsContexte=s?Number(s.reutilisations||0):null;m.reutilisationsDirectesContexte=s?Number(s.reutilisationsDirectes||0):null;});
  const topClone=mesures.filter(function(m){return m.disponible;}).slice().sort(function(a,b){return Number(b.cheminCloneUnitaireMs||0)-Number(a.cheminCloneUnitaireMs||0);}).map(function(m){return{cle:m.cle,tailleJsonOctets:m.tailleJsonOctets,cheminCloneUnitaireMs:m.cheminCloneUnitaireMs,parsePurUnitaireMs:m.parsePurUnitaireMs,economieTheoriquePar100AccesMs:m.economieTheoriquePar100AccesMs};});
  const tousInchanges=mesures.filter(function(m){return m.disponible;}).every(function(m){return m.memoInchange===true;});
  const out={
    ok:erreurs.length===0&&tousInchanges,version:version,lectureSeule:true,aucuneModification:true,
    perimetre:{compare:'coût de lecture physique, sérialisation JSON, parse/clone du cache et accès direct sur un jeu représentatif de sources BudgetSoft',reference:new Date().toISOString(),sourceVerite:'BudgetSoftReadContext20260827.gs / avecContexteLectureBudgetSoft20260827_',mode:'micro-benchmark dans un contexte isolé ; aucune reconstruction ni publication de snapshot'},
    repetitions:{clone:repetitionsClone,stringify:repetitionsStringify,direct:repetitionsDirect},
    mesures:mesures,topClone:topClone,statsContexte:stats,erreurs:erreurs,
    controles:{memosInchanges:tousInchanges,aucuneEcriture:true},
    dureeTotaleMs:Date.now()-tGlobal,
    decision:erreurs.length===0&&tousInchanges?'PROFIL_CLONAGE_VALIDE_POUR_CHOISIR_LEVIER':'PROFIL_CLONAGE_INVALIDE_NE_RIEN_OPTIMISER',
    doctrine:'Mesures de micro-benchmark non additives. Aucun accès direct ne doit être généralisé sans A/B strict prouvant l’absence de mutation, puis passage des gardes du snapshot.'
  };
  console.log('[AUDIT PERF clonage contexte lecture] '+JSON.stringify(out));return out;
}
