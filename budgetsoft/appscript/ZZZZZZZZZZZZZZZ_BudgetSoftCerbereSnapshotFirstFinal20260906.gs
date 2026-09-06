const BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_FINAL_VERSION='2026-09-06.2';

/**
 * Override terminal Cerbère : la lecture publique consomme d'abord le snapshot global.
 * Pendant la reconstruction globale, l'adaptateur retourne null et on conserve
 * exactement le moteur CB double-rôle C1/C2 actuellement autoritaire.
 */
function chargerCerbereCockpit20260902(){
  try{
    if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function'){
      const snapshot=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();
      if(snapshot&&snapshot.ok!==false&&snapshot.source==='snapshot_global'){
        snapshot.sourceBudgetSoft='snapshot_global';
        snapshot.versionSnapshotFirst=BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_FINAL_VERSION;
        return snapshot;
      }
    }
  }catch(e){}

  const executer=function(){
    const t0=Date.now(),base=chargerCerbereCockpitBaseRapide20260903_();if(!base||base.ok===false)return base;
    const post=base.diagnostic&&base.diagnostic.performancePost35||{couches:[]},timings=Array.isArray(post.couches)?post.couches:[];
    chronometrerCoucheCerbere20260904_(timings,'Suspensions Actions/Événements',()=>corrigerSuspensionsActionsEvenements20260903_(base));
    chronometrerCoucheCerbere20260904_(timings,'Réel pilotable date achat',()=>corrigerReelPilotableDateAchat20260902_(base));
    const periodes=Array.isArray(base.periodes)?base.periodes:[];
    chronometrerCoucheCerbere20260904_(timings,'Enrichissement cockpit C1/C2',()=>periodes.forEach((p,i)=>enrichirCycleCockpitCerbere20260902_(p,i)));
    chronometrerCoucheCerbere20260904_(timings,'CB double rôle C1/C2',()=>appliquerReportCbCycleSuivant20260905_(base));
    let appreciation='';chronometrerCoucheCerbere20260904_(timings,'Appréciation cockpit',()=>{appreciation=appreciationCockpitCerbere20260902_(base);});
    const perf={c1c2Seulement:true,dureeMs:Date.now()-t0,couches:timings};
    base.cockpit20260902={version:'2026-09-05.cb-double-role-8',appreciation:appreciation,performance:perf,doctrine:'Cockpit C1/C2 : CB imputée aux lignes par date achat dans C1 et au global de C2 selon la date comptable, sans toucher aux molettes C2.'};
    base.sourceBudgetSoft='recalcul_secours';
    base.versionSnapshotFirst=BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_FINAL_VERSION;
    const ts=Date.now(),out=serialiserCerberePourClient_(base),serializationMs=Date.now()-ts;
    if(out&&out.cockpit20260902&&out.cockpit20260902.performance){out.cockpit20260902.performance.serializationMs=serializationMs;out.cockpit20260902.performance.dureeMs=Date.now()-t0;}
    return out;
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-cb-double-role-snapshot-first-final-20260906',executer):executer();
}

function auditerEntreePubliqueCerbereSnapshotFirst20260906(){
  const t0=Date.now(),r=chargerCerbereCockpit20260902();
  const source=r&&r.source||r&&r.sourceBudgetSoft||'';
  const out={
    ok:!!(r&&r.ok!==false&&source==='snapshot_global'&&r.revisionBudgetSoft),
    version:BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_FINAL_VERSION,
    source:source,
    revisionBudgetSoft:r&&r.revisionBudgetSoft||'',
    dureeMs:Date.now()-t0,
    periodes:Array.isArray(r&&r.periodes)?r.periodes.length:0,
    cockpitVersion:r&&r.cockpit20260902&&r.cockpit20260902.version||'',
    doctrinePeriodes:'Cerbère public pilote C1/C2 ; 2 périodes attendues dans le cockpit courant.'
  };
  console.log(JSON.stringify(out));return out;
}
