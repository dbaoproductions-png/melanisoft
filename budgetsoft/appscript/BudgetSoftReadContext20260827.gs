const BUDGETSOFT_READ_CONTEXT_VERSION='2026-08-27.1';
var BUDGETSOFT_READ_CONTEXT_ACTIVE_=null;
var BUDGETSOFT_READ_CONTEXT_LAST_STATS_=null;

/**
 * Exécute une lecture BudgetSoft lourde avec mémoïsation STRICTEMENT limitée
 * à l'exécution courante. Aucune donnée n'est conservée entre deux appels :
 * chaque nouvelle requête relit donc les feuilles réelles.
 *
 * Cette couche est réservée aux calculs de lecture seule. Elle restaure toujours
 * lireTable_ dans finally, y compris en cas d'erreur.
 */
function avecContexteLectureBudgetSoft20260827_(label, fn) {
  if (typeof fn !== 'function') throw new Error('Fonction de lecture manquante.');
  if (BUDGETSOFT_READ_CONTEXT_ACTIVE_) return fn();

  const original = lireTable_;
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

  BUDGETSOFT_READ_CONTEXT_ACTIVE_={label:stats.label,memo:memo,stats:stats};
  lireTable_=function(nom){
    const cle=String(nom||'');
    stats.appels++;
    if(!stats.parTable[cle])stats.parTable[cle]={appels:0,lecturesFeuille:0,reutilisations:0,dureeLectureMs:0,lignes:0};
    const s=stats.parTable[cle];
    s.appels++;

    if(Object.prototype.hasOwnProperty.call(memo,cle)){
      stats.reutilisations++;s.reutilisations++;
      return clone_(memo[cle]);
    }

    const t=Date.now();
    const valeur=original(cle);
    const dt=Date.now()-t;
    memo[cle]=clone_(valeur);
    stats.lecturesFeuille++;s.lecturesFeuille++;s.dureeLectureMs+=dt;
    s.lignes=Array.isArray(valeur)?valeur.length:0;
    return clone_(memo[cle]);
  };

  try{
    return fn();
  }finally{
    lireTable_=original;
    stats.dureeMs=Date.now()-debut;
    BUDGETSOFT_READ_CONTEXT_LAST_STATS_=stats;
    BUDGETSOFT_READ_CONTEXT_ACTIVE_=null;
    console.log('[PERF BudgetSoft] '+JSON.stringify(stats));
  }
}

function lireDernieresStatsLectureBudgetSoft20260827(){
  return BUDGETSOFT_READ_CONTEXT_LAST_STATS_||{ok:false,version:BUDGETSOFT_READ_CONTEXT_VERSION,message:'Aucune mesure dans cette exécution.'};
}
