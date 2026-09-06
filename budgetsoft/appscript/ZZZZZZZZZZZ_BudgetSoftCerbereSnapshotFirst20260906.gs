const BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_VERSION='2026-09-06.1';

/**
 * Entrée publique Cerbère : lecture prioritaire de la révision globale publiée.
 * Pendant la reconstruction du snapshot global, l'adaptateur retourne null et
 * le calcul propriétaire frais ci-dessous reste utilisé pour construire la nouvelle révision.
 */
function chargerCerbereCockpit20260902(){
  try{
    if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function'){
      const snapshot=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();
      if(snapshot&&snapshot.ok!==false&&snapshot.source==='snapshot_global'){
        snapshot.sourceBudgetSoft='snapshot_global';
        snapshot.versionSnapshotFirst=BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_VERSION;
        return snapshot;
      }
    }
  }catch(e){}

  const executer=function(){
    const base=chargerCerbereV374();
    if(!base||base.ok===false)return base;
    corrigerSuspensionsActionsEvenements20260903_(base);
    corrigerReelPilotableDateAchat20260902_(base);
    const periodes=Array.isArray(base.periodes)?base.periodes:[];
    periodes.forEach((p,i)=>enrichirCycleCockpitCerbere20260902_(p,i));
    base.cockpit20260902={
      version:typeof CERBERE_COCKPIT_20260902_VERSION!=='undefined'?CERBERE_COCKPIT_20260902_VERSION:'',
      appreciation:appreciationCockpitCerbere20260902_(base),
      doctrine:'Par défaut, l’enveloppe globale P1 suit le pilotable disponible à l’instant t. Un ajustement manuel est mémorisé comme écart à cette capacité. Surplus/déficit à ventiler = enveloppe globale P1 - somme des molettes. Les achats CB alimentent les molettes selon leur date d’achat ; le règlement CB technique est exclu des molettes et vient réduire l’enveloppe globale du cycle suivant selon sa date bancaire.'
    };
    base.sourceBudgetSoft='recalcul_secours';
    base.versionSnapshotFirst=BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_VERSION;
    return serialiserCerberePourClient_(base);
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'
    ?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-20260902',executer)
    :executer();
}

function auditerEntreePubliqueCerbereSnapshotFirst20260906(){
  const t0=Date.now(),r=chargerCerbereCockpit20260902();
  const out={
    ok:!!(r&&r.ok!==false&&r.source==='snapshot_global'),
    version:BUDGETSOFT_CERBERE_SNAPSHOT_FIRST_VERSION,
    source:r&&r.source||r&&r.sourceBudgetSoft||'',
    revisionBudgetSoft:r&&r.revisionBudgetSoft||'',
    dureeMs:Date.now()-t0,
    periodes:Array.isArray(r&&r.periodes)?r.periodes.length:0,
    cockpitVersion:r&&r.cockpit20260902&&r.cockpit20260902.version||''
  };
  console.log(JSON.stringify(out));return out;
}
