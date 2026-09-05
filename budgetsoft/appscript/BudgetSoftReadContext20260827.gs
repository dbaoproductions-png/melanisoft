const BUDGETSOFT_READ_CONTEXT_VERSION='2026-09-05.2';
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
    parTable:{},
    dureeMs:0
  };

  function clone_(value){if(value==null)return value;return JSON.parse(JSON.stringify(value));}
  function assurerStats_(cle){if(!stats.parTable[cle])stats.parTable[cle]={appels:0,lecturesFeuille:0,reutilisations:0,reutilisationsDirectes:0,dureeLectureMs:0,lignes:0};return stats.parTable[cle];}
  function lireMemo_(cle, lecteur){
    stats.appels++;const s=assurerStats_(cle);s.appels++;
    if(Object.prototype.hasOwnProperty.call(memo,cle)){
      stats.reutilisations++;s.reutilisations++;
      if(directCerbere&&clesDirectesCerbere.has(cle)){stats.reutilisationsDirectes++;s.reutilisationsDirectes++;return memo[cle];}
      return clone_(memo[cle]);
    }
    const t=Date.now(), valeur=lecteur(), dt=Date.now()-t;
    memo[cle]=clone_(valeur);
    stats.lecturesFeuille++;s.lecturesFeuille++;s.dureeLectureMs+=dt;
    s.lignes=Array.isArray(valeur)?valeur.length:(valeur&&Array.isArray(valeur.lignes)?valeur.lignes.length:0);
    return directCerbere&&clesDirectesCerbere.has(cle)?memo[cle]:clone_(memo[cle]);
  }

  BUDGETSOFT_READ_CONTEXT_ACTIVE_={label:stats.label,memo:memo,stats:stats,directCerbere:directCerbere};
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
