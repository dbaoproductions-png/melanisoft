const BUDGETSOFT_GLOBAL_ACCESS_VERSION='2026-09-21.1';

/**
 * Lecture commune du dernier snapshot global publié.
 * Pendant TOUTE reconstruction globale, on retourne volontairement null afin que
 * les moteurs propriétaires recalculent depuis les sources de la révision en cours.
 * Aucun constructeur global ne doit pouvoir consommer la révision précédente.
 */
function jourGlobalAccessBudgetSoft20260921_(v){
  const d=v instanceof Date?new Date(v):new Date(v||'');
  if(isNaN(d.getTime()))return'';
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}

function snapshotGlobalDuJourBudgetSoft20260921_(e){
  if(!e)return false;
  const aujourd=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const t=e.modules&&e.modules.tresorerieComptable||{};
  const ref=String(t.dateReference||'').slice(0,10);
  const genere=jourGlobalAccessBudgetSoft20260921_(e.genereLe);
  return (ref&&ref===aujourd)||(!ref&&genere===aujourd);
}

function lireEtatGlobalBudgetSoftSiDisponible20260906_(){
  try{
    const ctx=typeof BUDGETSOFT_READ_CONTEXT_ACTIVE_!=='undefined'?BUDGETSOFT_READ_CONTEXT_ACTIVE_:null;
    const label=ctx&&String(ctx.label||'')||'';
    if(/^budgetsoft-global-snapshot(?:$|-)/.test(label))return null;
    if(typeof chargerSnapshotGlobalBudgetSoft20260906!=='function')return null;
    let s=chargerSnapshotGlobalBudgetSoft20260906();
    let e=s&&s.disponible&&s.etat;
    if(!e||e.ok!==true||e.publie!==true||!e.revisionBudgetSoft)return null;

    // Garde de fraîcheur journalière : à minuit, une révision de la veille ne
    // peut plus être servie comme vérité courante. On reconstruit une fois le
    // snapshot atomique afin que dateReference, réel et projections basculent
    // ensemble sur le nouveau jour.
    if(!snapshotGlobalDuJourBudgetSoft20260921_(e)){
      if(typeof reconstruireSnapshotGlobalBudgetSoft20260906!=='function')return null;
      const frais=reconstruireSnapshotGlobalBudgetSoft20260906('fraicheur_journaliere');
      if(!frais||frais.ok!==true||frais.publie!==true)return null;
      e=frais;
    }
    return e;
  }catch(err){return null;}
}

function lireModuleSnapshotGlobalBudgetSoft20260906_(nom){
  const e=lireEtatGlobalBudgetSoftSiDisponible20260906_();
  const module=e&&e.modules&&e.modules[String(nom||'')];
  if(!module)return null;
  const r=JSON.parse(JSON.stringify(module));
  r.revisionBudgetSoft=e.revisionBudgetSoft;
  r.genereLeBudgetSoft=e.genereLe||'';
  r.sourceBudgetSoft='snapshot_global';
  return r;
}

function lireTransversalesSnapshotGlobalBudgetSoft20260906_(){
  const e=lireEtatGlobalBudgetSoftSiDisponible20260906_();
  if(!e)return null;
  return {revisionBudgetSoft:e.revisionBudgetSoft,genereLeBudgetSoft:e.genereLe||'',sourceBudgetSoft:'snapshot_global',transversales:JSON.parse(JSON.stringify(e.transversales||{}))};
}

function auditerLectureSnapshotGlobalBudgetSoft20260906(){
  const t0=Date.now(),e=lireEtatGlobalBudgetSoftSiDisponible20260906_();
  const r={ok:!!e,version:BUDGETSOFT_GLOBAL_ACCESS_VERSION,dureeMs:Date.now()-t0,revisionBudgetSoft:e&&e.revisionBudgetSoft||'',genereLe:e&&e.genereLe||'',modules:e&&e.modules?Object.keys(e.modules):[]};
  console.log(JSON.stringify(r));return r;
}
