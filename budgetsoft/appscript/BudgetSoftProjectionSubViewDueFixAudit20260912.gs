const BUDGETSOFT_PROJECTION_SUBVIEW_DUE_FIX_20260912_VERSION='2026-09-12.3';

// Logique active déplacée dans TreasuryForecastCorrections20260831.gs et BudgetSoftTreasuryCanonical20260907.gs.

function auditerEvenementCertainRetardeTresorerieBudgetSoft20260912(){
  const cible=Utilities.formatDate(typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(new Date()):new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const r=chargerTresoreriePrevisionnelle20260901(cible),id='1d207b7c-b59f-41f9-aade-babee152d967';
  const lignes=(r&&r.lignes||[]).filter(function(l){return String(l&&l.sourceId||'')===id;});
  const out={ok:!!(r&&r.ok&&lignes.length),version:BUDGETSOFT_PROJECTION_SUBVIEW_DUE_FIX_20260912_VERSION,dateReference:r&&r.dateReference||'',dateCible:r&&r.dateCible||'',lignes:lignes};
  console.log('[AUDIT evenement certain retarde tresorerie] '+JSON.stringify(out));return out;
}

function auditerChaineProjectionSnapshotEvenementCertainBudgetSoft20260912(){
  const id='1d207b7c-b59f-41f9-aade-babee152d967',maintenant=new Date();
  const finCourant=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(maintenant):new Date(maintenant.getFullYear(),maintenant.getMonth(),27);
  const finSuivant=new Date(finCourant.getFullYear(),finCourant.getMonth()+1,finCourant.getDate());
  const finBancaireSuivante=new Date(finSuivant.getFullYear(),finSuivant.getMonth()+1,0,23,59,59,999);
  const cibleSuivante=Utilities.formatDate(finSuivant,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const cibleCalculUnique=Utilities.formatDate(finBancaireSuivante,Session.getScriptTimeZone(),'yyyy-MM-dd');
  let sources=null,cerbereBase=null;
  try{sources=chargerToutesLesDonnees();const charge=chargerCerbereBaseDepuisSourcesSnapshotBudgetSoft20260911_(sources);cerbereBase=charge&&charge.base||null;}catch(e){return{ok:false,version:BUDGETSOFT_PROJECTION_SUBVIEW_DUE_FIX_20260912_VERSION,etape:'preparation',erreur:String(e&&e.message||e)};}
  const complet=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cibleCalculUnique,cerbereBase&&cerbereBase.ok!==false?cerbereBase:null);
  const sousVue=complet&&complet.ok!==false?sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_(complet,cibleSuivante):complet;
  function lignesId(r){return (r&&r.lignes||[]).filter(function(l){return String(l&&l.sourceId||'')===id;});}
  const lignesComplet=lignesId(complet),lignesSousVue=lignesId(sousVue);
  const out={ok:!!(complet&&complet.ok&&sousVue&&sousVue.ok&&lignesSousVue.length),version:BUDGETSOFT_PROJECTION_SUBVIEW_DUE_FIX_20260912_VERSION,cibleCalculUnique:cibleCalculUnique,cibleSousVue:cibleSuivante,complet:{ok:!!(complet&&complet.ok),dateReference:complet&&complet.dateReference||'',dateCible:complet&&complet.dateCible||'',version:complet&&complet.version||'',versionRevenueIntermodule:complet&&complet.versionRevenueIntermodule||'',proprietaire:complet&&complet.proprietaireBudgetSoft||'',lignes:lignesComplet},sousVue:{ok:!!(sousVue&&sousVue.ok),dateReference:sousVue&&sousVue.dateReference||'',dateCible:sousVue&&sousVue.dateCible||'',versionProjectionSubviewDueFix:sousVue&&sousVue.versionProjectionSubviewDueFix||'',optimisationSnapshot:sousVue&&sousVue.optimisationSnapshot||null,lignes:lignesSousVue}};
  console.log('[AUDIT chaine projection snapshot evenement certain] '+JSON.stringify(out));return out;
}
