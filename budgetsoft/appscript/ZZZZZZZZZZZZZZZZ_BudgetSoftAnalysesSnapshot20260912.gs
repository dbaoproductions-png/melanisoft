const BUDGETSOFT_ANALYSES_SNAPSHOT_20260912_VERSION='2026-09-12.2';

// Capture le moteur métier autoritaire avant de remplacer uniquement son point
// d'entrée public. Les calculs Analyses eux-mêmes restent inchangés.
var chargerAnalysesBudgetairesV23Source20260912_=chargerAnalysesBudgetairesV23;

function normaliserNombrePeriodesAnalysesSnapshot20260912_(nombrePeriodes){
  const n=parseInt(nombrePeriodes,10);
  return [3,6,12].includes(n)?n:6;
}

function construireModuleAnalysesSnapshotBudgetSoft20260912_(){
  const t0=Date.now(),variantes={},performances={};
  [3,6,12].forEach(function(nb){
    const t=Date.now();
    const r=chargerAnalysesBudgetairesV23Source20260912_(nb);
    if(!r||typeof r!=='object')throw new Error('Analyse '+nb+' périodes invalide.');
    variantes[String(nb)]=r;
    performances[String(nb)]=Date.now()-t;
  });
  return {
    ok:true,
    version:BUDGETSOFT_ANALYSES_SNAPSHOT_20260912_VERSION,
    versionMoteur:ANALYSES_CORRECTIONS_19082026_VERSION,
    variantes:variantes,
    periodesDisponibles:[3,6,12],
    performance:{dureeMs:Date.now()-t0,variantesMs:performances},
    doctrine:'Le snapshot global transporte les sorties 3/6/12 du moteur Analyses autoritaire sans modifier ses calculs.'
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
chargerAnalysesBudgetairesV23=function(nombrePeriodes){
  const snapshot=servirAnalysesDepuisSnapshotBudgetSoft20260912_(nombrePeriodes);
  if(snapshot)return snapshot;
  const r=chargerAnalysesBudgetairesV23Source20260912_(nombrePeriodes);
  if(r&&typeof r==='object'){
    r.sourceBudgetSoft='recalcul_secours';
    r.versionSnapshotAnalyses=BUDGETSOFT_ANALYSES_SNAPSHOT_20260912_VERSION;
  }
  return r;
};

/**
 * Writer terminal unique des extensions snapshot 2026-09-12.
 * Analyses et Engagements bancaires sont construits avant l'écriture physique.
 * Aucun autre fichier ne doit surcharger ce writer : on évite ainsi les chaînes
 * d'override inter-fichiers non déterministes dans Apps Script.
 */
function ecrireSnapshotGlobalBudgetSoft20260906_(etat){
  if(!etat||!etat.revisionBudgetSoft)throw new Error('Snapshot global invalide avant intégration des extensions 2026-09-12.');
  etat.modules=etat.modules||{};

  const analyses=construireModuleAnalysesSnapshotBudgetSoft20260912_();
  analyses.revisionBudgetSoft=etat.revisionBudgetSoft;
  etat.modules.analyses=analyses;

  if(typeof construireModuleEngagementsBancairesSnapshotBudgetSoft20260912_==='function'){
    const engagements=construireModuleEngagementsBancairesSnapshotBudgetSoft20260912_(etat.modules.dashboard||null);
    engagements.revisionBudgetSoft=etat.revisionBudgetSoft;
    etat.modules.engagementsBancaires=engagements;
  }

  etat.optimisations=Object.assign({},etat.optimisations||{},
    {analysesSnapshot:{version:BUDGETSOFT_ANALYSES_SNAPSHOT_20260912_VERSION,variantes:[3,6,12],moteurMetierInchange:true}},
    etat.modules.engagementsBancaires?{engagementsBancairesSnapshot:{version:etat.modules.engagementsBancaires.version||'',moteurMetierInchange:true,dashboardRevisionInjecte:true}}:{}
  );

  const props=PropertiesService.getDocumentProperties(),json=JSON.stringify(etat),zip=encoderEtatGlobalBudgetSoft20260906_(json),parts=[];
  for(let i=0;i<zip.length;i+=BUDGETSOFT_GLOBAL_SNAPSHOT_CHUNK)parts.push(zip.slice(i,i+BUDGETSOFT_GLOBAL_SNAPSHOT_CHUNK));
  const ancien=Number(props.getProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'COUNT')||0);
  parts.forEach((p,i)=>props.setProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'PART_'+i,p));
  for(let i=parts.length;i<ancien;i++)props.deleteProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'PART_'+i);
  props.setProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'COUNT',String(parts.length));
  props.setProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'META',JSON.stringify({version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,revisionBudgetSoft:etat.revisionBudgetSoft,genereLe:etat.genereLe,morceaux:parts.length,tailleCompressee:zip.length}));
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
