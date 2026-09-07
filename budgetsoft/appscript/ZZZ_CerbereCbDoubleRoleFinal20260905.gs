/*
 * Correctif d'ordre de chargement — Cerbère CB double rôle.
 *
 * Ce fichier ZZZ_C... est volontairement chargé en dernier dans l'ordre effectif
 * du payload Apps Script. Il doit donc porter l'entrée publique autoritaire.
 * La lecture publique consomme d'abord le snapshot global ; le moteur CB double
 * rôle C1/C2 reste disponible comme secours pendant une reconstruction globale
 * ou si aucun snapshot valide n'est disponible.
 */
const CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION='2026-09-06.snapshot-first-1';

function chargerCerbereCockpit20260902(){
  try{
    if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function'){
      const snapshot=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();
      if(snapshot&&snapshot.ok!==false&&snapshot.source==='snapshot_global'){
        snapshot.sourceBudgetSoft='snapshot_global';
        snapshot.versionSnapshotFirst=CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION;
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
    base.cockpit20260902={version:CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION,appreciation:appreciation,performance:perf,doctrine:'Cockpit C1/C2 : CB imputée aux lignes par date achat dans C1 et au global de C2 selon la date comptable, sans double imputation par catégorie.'};
    base.sourceBudgetSoft='recalcul_secours';
    base.versionSnapshotFirst=CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION;
    const ts=Date.now(),out=serialiserCerberePourClient_(base),serializationMs=Date.now()-ts;
    if(out&&out.cockpit20260902&&out.cockpit20260902.performance){out.cockpit20260902.performance.serializationMs=serializationMs;out.cockpit20260902.performance.dureeMs=Date.now()-t0;}
    return out;
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-cb-double-role-final-snapshot-first-20260906',executer):executer();
}