/*
 * Correctif d'ordre de chargement — Cerbère CB double rôle.
 *
 * Le payload Apps Script est trié lexicographiquement. Les fichiers commençant
 * par davantage de Z sont donc chargés AVANT ceux dont le nom rencontre plus
 * tôt le caractère "_". Le correctif historique ZZZZZZZZZZZZZ_... était ainsi
 * neutralisé ensuite par ZZZZ_CerberePlanDoctrineV374.gs qui redéfinissait le
 * chargeur cockpit.
 *
 * Ce fichier ZZZ_C... est volontairement chargé après ZZZZ_C... et rétablit le
 * pipeline final. Les fonctions de calcul CB restent définies dans le correctif
 * double-rôle existant ; seule la surcharge terminale est répétée ici.
 */
const CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION='2026-09-05.5';

function chargerCerbereCockpit20260902(){
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
    base.cockpit20260902={version:CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION,appreciation:appreciation,performance:perf,doctrine:'Cockpit C1/C2 : CB imputée aux lignes par date achat dans C1 et au global du cycle de débit dans C2.'};
    const ts=Date.now(),out=serialiserCerberePourClient_(base),serializationMs=Date.now()-ts;
    if(out&&out.cockpit20260902&&out.cockpit20260902.performance){out.cockpit20260902.performance.serializationMs=serializationMs;out.cockpit20260902.performance.dureeMs=Date.now()-t0;}
    return out;
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-cb-double-role-final-20260905',executer):executer();
}
