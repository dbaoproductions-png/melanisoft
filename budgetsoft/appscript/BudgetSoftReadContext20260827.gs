const BUDGETSOFT_READ_CONTEXT_VERSION='2026-09-03.2';
var BUDGETSOFT_READ_CONTEXT_ACTIVE_=null;
var BUDGETSOFT_READ_CONTEXT_LAST_STATS_=null;

/**
 * Exécute une lecture BudgetSoft lourde avec mémoïsation STRICTEMENT limitée
 * à l'exécution courante. Aucune donnée n'est conservée entre deux appels :
 * chaque nouvelle requête relit donc les feuilles réelles.
 *
 * Depuis 2026-09-03, le contexte couvre aussi les lecteurs dynamiques utilisés
 * par Plan/Cerbère (Plan_Actions, Plan_Evenements, tables Plan et rapprochements
 * de charges fixes). Cela évite que les différentes passes du moteur relisent
 * physiquement les mêmes feuilles.
 */
function avecContexteLectureBudgetSoft20260827_(label, fn) {
  if (typeof fn !== 'function') throw new Error('Fonction de lecture manquante.');
  if (BUDGETSOFT_READ_CONTEXT_ACTIVE_) return fn();

  const originalLireTable = lireTable_;
  const originalPlanDyn = typeof lireFeuilleDynamiquePlan_ === 'function' ? lireFeuilleDynamiquePlan_ : null;
  const originalPlanTable = typeof lireTablePlanCerbere_ === 'function' ? lireTablePlanCerbere_ : null;
  const originalCerbereDyn = typeof lireFeuilleDynamiqueCerbereV379_ === 'function' ? lireFeuilleDynamiqueCerbereV379_ : null;
  const originalRapproCf = typeof lireRapprochementsChargesFixes === 'function' ? lireRapprochementsChargesFixes : null;
  const debut = Date.now();
  const memo = Object.create(null);
  const stats = {
    version:BUDGETSOFT_READ_CONTEXT_VERSION,
    label:String(label||'lecture'),
    appels:0,
    lecturesFeuille:0,
    reutilisations:0,
    parTable:{},
    dureeMs:0
  };

  function clone_(value){
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }
  function lireMemo_(cle, lecteur){
    stats.appels++;
    if(!stats.parTable[cle])stats.parTable[cle]={appels:0,lecturesFeuille:0,reutilisations:0,dureeLectureMs:0,lignes:0};
    const s=stats.parTable[cle];s.appels++;
    if(Object.prototype.hasOwnProperty.call(memo,cle)){
      stats.reutilisations++;s.reutilisations++;
      return clone_(memo[cle]);
    }
    const t=Date.now(), valeur=lecteur(), dt=Date.now()-t;
    memo[cle]=clone_(valeur);
    stats.lecturesFeuille++;s.lecturesFeuille++;s.dureeLectureMs+=dt;
    s.lignes=Array.isArray(valeur)?valeur.length:(valeur&&Array.isArray(valeur.lignes)?valeur.lignes.length:0);
    return clone_(memo[cle]);
  }

  BUDGETSOFT_READ_CONTEXT_ACTIVE_={label:stats.label,memo:memo,stats:stats};
  lireTable_=function(nom){
    const cle=String(nom||'');
    return lireMemo_('TABLE:'+cle,function(){return originalLireTable(cle);});
  };
  if(originalPlanDyn)lireFeuilleDynamiquePlan_=function(nom){
    const cle=String(nom||'');
    return lireMemo_('PLAN_DYN:'+cle,function(){return originalPlanDyn(cle);});
  };
  if(originalPlanTable)lireTablePlanCerbere_=function(nom){
    const cle=String(nom||'');
    return lireMemo_('PLAN_TABLE:'+cle,function(){return originalPlanTable(cle);});
  };
  if(originalCerbereDyn)lireFeuilleDynamiqueCerbereV379_=function(nom){
    const cle=String(nom||'');
    return lireMemo_('CERBERE_DYN:'+cle,function(){return originalCerbereDyn(cle);});
  };
  if(originalRapproCf)lireRapprochementsChargesFixes=function(){
    return lireMemo_('RAPPRO_CF',function(){return originalRapproCf();});
  };

  try{
    return fn();
  }finally{
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

function lireDernieresStatsLectureBudgetSoft20260827(){
  return BUDGETSOFT_READ_CONTEXT_LAST_STATS_||{ok:false,version:BUDGETSOFT_READ_CONTEXT_VERSION,message:'Aucune mesure dans cette exécution.'};
}
