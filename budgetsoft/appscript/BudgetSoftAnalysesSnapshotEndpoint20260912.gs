const BUDGETSOFT_ANALYSES_SNAPSHOT_20260912_VERSION='2026-09-22.1';

function normaliserNombrePeriodesAnalysesSnapshot20260912_(nombrePeriodes){
  const n=parseInt(nombrePeriodes,10);
  return [3,6,12].includes(n)?n:6;
}

function construireModuleAnalysesSnapshotBudgetSoft20260912_(){
  const t0=Date.now(),variantes={},performances={};
  const contexteSeries={
    operations:lireTable_('Operations')||[],
    categories:lireTable_('Categories')||[],
    charges:lireTable_('Charges_fixes')||[],
    historique:typeof lireHistoriqueStructurelAnalyses20260922_==='function'?lireHistoriqueStructurelAnalyses20260922_():[]
  };
  try{contexteSeries.credits=typeof construireCreditsEtDettesV2_==='function'?construireCreditsEtDettesV2_():{};}catch(e){contexteSeries.credits={};}
  try{contexteSeries.patrimoine=typeof construirePatrimoineLegacySource20260921_==='function'?construirePatrimoineLegacySource20260921_():{};}catch(e){contexteSeries.patrimoine={};}
  [3,6,12].forEach(function(nb){
    const t=Date.now();
    const r=chargerAnalysesBudgetairesV23Source20260912_(nb);
    if(!r||typeof r!=='object')throw new Error('Analyse '+nb+' périodes invalide.');
    if(typeof construireSeriesAnalysesBudgetSoft20260922_==='function'){
      r.seriesCourbes=construireSeriesAnalysesBudgetSoft20260922_(r.periodes||[],contexteSeries);
    }
    variantes[String(nb)]=r;
    performances[String(nb)]=Date.now()-t;
  });
  return {
    ok:true,
    version:BUDGETSOFT_ANALYSES_SNAPSHOT_20260912_VERSION,
    versionMoteur:ANALYSES_CORRECTIONS_19082026_VERSION,
    versionSeries:typeof BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION!=='undefined'?BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION:'',
    variantes:variantes,
    periodesDisponibles:[3,6,12],
    performance:{dureeMs:Date.now()-t0,variantesMs:performances},
    doctrine:'Le snapshot global transporte les sorties 3/6/12 du moteur Analyses autoritaire et les séries multi-postes ; aucun calcul n’est refait dans l’UI.'
  };
}

function servirAnalysesDepuisSnapshotBudgetSoft20260912_(nombrePeriodes){
  const nb=normaliserNombrePeriodesAnalysesSnapshot20260912_(nombrePeriodes);
  try{
    const module=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'
      ?lireModuleSnapshotGlobalBudgetSoft20260906_('analyses'):null;
    const variante=module&&module.variantes&&module.variantes[String(nb)];
    if(module&&module.ok!==false&&variante){
      const r=JSON.parse(JSON.stringify(variante));
      r.sourceBudgetSoft='snapshot_global';
      r.revisionBudgetSoft=module.revisionBudgetSoft||'';
      r.genereLeBudgetSoft=module.genereLeBudgetSoft||'';
      r.versionSnapshotAnalyses=BUDGETSOFT_ANALYSES_SNAPSHOT_20260912_VERSION;
      r.nombrePeriodesSnapshot=nb;
      return r;
    }
  }catch(e){}
  return null;
}

// Point d'entrée public conservé : l'UI n'a rien à changer.
function chargerAnalysesBudgetairesV23(nombrePeriodes){
  const snapshot=servirAnalysesDepuisSnapshotBudgetSoft20260912_(nombrePeriodes);
  return snapshot||{ok:false,sourceBudgetSoft:'snapshot_global_indisponible',versionSnapshotAnalyses:BUDGETSOFT_ANALYSES_SNAPSHOT_20260912_VERSION,erreur:'Analyses absentes du snapshot global.'};
}

function auditerAnalysesSnapshotBudgetSoft20260912(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat,m=e&&e.modules&&e.modules.analyses;
  const resultats={};
  [3,6,12].forEach(function(nb){
    const r=chargerAnalysesBudgetairesV23(nb);
    resultats[String(nb)]={
      ok:!!(r&&r.sourceBudgetSoft==='snapshot_global'&&r.revisionBudgetSoft&&r.revisionBudgetSoft===e.revisionBudgetSoft),
      source:r&&r.sourceBudgetSoft||'',
      revisionBudgetSoft:r&&r.revisionBudgetSoft||'',
      periodes:Array.isArray(r&&r.periodes)?r.periodes.length:0,
      version:r&&r.version||''
    };
  });
  const ok=!!(e&&e.publie&&m&&m.ok!==false&&[3,6,12].every(function(nb){return resultats[String(nb)].ok&&resultats[String(nb)].periodes===nb;}));
  const out={ok:ok,version:BUDGETSOFT_ANALYSES_SNAPSHOT_20260912_VERSION,revisionBudgetSoft:e&&e.revisionBudgetSoft||'',module:m?{version:m.version||'',versionMoteur:m.versionMoteur||'',periodesDisponibles:m.periodesDisponibles||[],performance:m.performance||null}:null,resultats:resultats};
  console.log('[AUDIT Analyses snapshot] '+JSON.stringify(out));
  return out;
}
