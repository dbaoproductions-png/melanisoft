const BUDGETSOFT_ENGAGEMENTS_SNAPSHOT_20260912_VERSION='2026-09-12.1';

// Le moteur métier existant reste autoritaire. On ne remplace que son mode de
// publication/lecture afin qu'une UI fonctionnelle ne possède plus sa propre
// photographie du budget.
var chargerEngagementsBancairesFutursSource20260912_=chargerEngagementsBancairesFuturs;
var ecrireSnapshotGlobalBudgetSoftAvantEngagements20260912_=ecrireSnapshotGlobalBudgetSoft20260906_;

function construireModuleEngagementsBancairesSnapshotBudgetSoft20260912_(dashboardRevision){
  const t0=Date.now();
  if(typeof chargerEngagementsBancairesFutursSource20260912_!=='function')throw new Error('Moteur Engagements bancaires futurs absent.');

  // Le moteur historique appelle chargerDashboardReel(). Pendant la construction
  // du snapshot, on lui fournit explicitement le Dashboard déjà calculé pour CETTE
  // révision. Aucune lecture de l'ancien snapshot publié n'est alors possible.
  const dashboardOriginal=typeof chargerDashboardReel==='function'?chargerDashboardReel:null;
  try{
    if(dashboardRevision&&typeof dashboardRevision==='object'){
      chargerDashboardReel=function(){return dashboardRevision;};
    }
    const resultat=chargerEngagementsBancairesFutursSource20260912_();
    if(!resultat||typeof resultat!=='object')throw new Error('Résultat Engagements bancaires futurs invalide.');
    return {
      ok:true,
      version:BUDGETSOFT_ENGAGEMENTS_SNAPSHOT_20260912_VERSION,
      resultat:resultat,
      performance:{dureeMs:Date.now()-t0},
      doctrine:'Moteur métier historique inchangé ; Dashboard injecté depuis la révision globale en cours.'
    };
  }finally{
    if(dashboardOriginal)chargerDashboardReel=dashboardOriginal;
  }
}

function servirEngagementsBancairesDepuisSnapshotBudgetSoft20260912_(){
  try{
    const module=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'
      ?lireModuleSnapshotGlobalBudgetSoft20260906_('engagementsBancaires'):null;
    if(module&&module.ok!==false&&module.resultat){
      const r=JSON.parse(JSON.stringify(module.resultat));
      r.sourceBudgetSoft='snapshot_global';
      r.revisionBudgetSoft=module.revisionBudgetSoft||'';
      r.genereLeBudgetSoft=module.genereLeBudgetSoft||'';
      r.versionSnapshotEngagements=BUDGETSOFT_ENGAGEMENTS_SNAPSHOT_20260912_VERSION;
      return r;
    }
  }catch(e){}
  return null;
}

// Point d'entrée public conservé : aucune modification de l'UI.
chargerEngagementsBancairesFuturs=function(){
  const snapshot=servirEngagementsBancairesDepuisSnapshotBudgetSoft20260912_();
  if(snapshot)return snapshot;
  const r=chargerEngagementsBancairesFutursSource20260912_();
  if(r&&typeof r==='object'){
    r.sourceBudgetSoft='recalcul_secours';
    r.versionSnapshotEngagements=BUDGETSOFT_ENGAGEMENTS_SNAPSHOT_20260912_VERSION;
  }
  return r;
};

/**
 * Extension atomique du writer déjà enrichi par Analyses. Le module Engagements
 * est construit avant l'écriture physique, puis le writer précédent poursuit la
 * chaîne (notamment intégration Analyses + écriture des chunks).
 */
ecrireSnapshotGlobalBudgetSoft20260906_=function(etat){
  if(!etat||!etat.revisionBudgetSoft)throw new Error('Snapshot global invalide avant intégration Engagements bancaires.');
  etat.modules=etat.modules||{};
  const module=construireModuleEngagementsBancairesSnapshotBudgetSoft20260912_(etat.modules.dashboard||null);
  module.revisionBudgetSoft=etat.revisionBudgetSoft;
  etat.modules.engagementsBancaires=module;
  etat.optimisations=Object.assign({},etat.optimisations||{},{
    engagementsBancairesSnapshot:{
      version:BUDGETSOFT_ENGAGEMENTS_SNAPSHOT_20260912_VERSION,
      moteurMetierInchange:true,
      dashboardRevisionInjecte:true
    }
  });
  return ecrireSnapshotGlobalBudgetSoftAvantEngagements20260912_(etat);
};

function auditerEngagementsBancairesSnapshotBudgetSoft20260912(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat,m=e&&e.modules&&e.modules.engagementsBancaires;
  const r=chargerEngagementsBancairesFuturs();
  const ok=!!(
    e&&e.publie&&m&&m.ok!==false&&r&&
    r.sourceBudgetSoft==='snapshot_global'&&
    r.revisionBudgetSoft&&r.revisionBudgetSoft===e.revisionBudgetSoft
  );
  const out={
    ok:ok,
    version:BUDGETSOFT_ENGAGEMENTS_SNAPSHOT_20260912_VERSION,
    revisionBudgetSoft:e&&e.revisionBudgetSoft||'',
    source:r&&r.sourceBudgetSoft||'',
    module:m?{
      version:m.version||'',
      performance:m.performance||null,
      prelevements:m.resultat&&m.resultat.prelevements,
      cbDifferees:m.resultat&&m.resultat.cbDifferees,
      chargesFixesRestantes:m.resultat&&m.resultat.chargesFixesRestantes
    }:null,
    resultat:{
      revisionBudgetSoft:r&&r.revisionBudgetSoft||'',
      nombrePrelevements:r&&r.nombrePrelevements,
      nombreCb:r&&r.nombreCb,
      nombreChargesFixesRestantes:r&&r.nombreChargesFixesRestantes
    }
  };
  console.log('[AUDIT Engagements bancaires snapshot] '+JSON.stringify(out));
  return out;
}
