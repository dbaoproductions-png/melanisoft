const BUDGETSOFT_DASHBOARD_SEMANTICS_FINAL_VERSION='2026-09-07.1';

function corrigerSemantiqueDashboardBudgetSoft20260907_(d){
  if(!d||typeof d!=='object')return d;
  let r=d;
  try{r=JSON.parse(JSON.stringify(d));}catch(e){}
  const s=r.cycleSuivant||(r.cycleSuivant={}),p=r.cyclePrecedent||(r.cyclePrecedent={});

  // Le total construit par Cerbère (CF + hors-pilotable + report CB + pilotable)
  // est une enveloppe/affectation budgétaire du cycle, pas une dépense bancaire prédite.
  if(s.depensesPrevisionnelles!=null){
    s.depensesBudgetees=Number(s.depensesPrevisionnelles);
    s.depensesPrevisionnelles=null;
  }
  s.doctrineDepenses='Budget total affecté = charges fixes + hors-pilotable + CB + pilotable ; ce n’est pas une prévision de débit bancaire.';

  // Pour l’historique, "Solde à J1" signifie ici solde d’ouverture du cycle,
  // avant les mouvements comptables du premier jour. Il se reconstruit
  // mathématiquement depuis le solde de clôture et le net des opérations du cycle.
  const fin=Number(p.soldeFinCycle),net=Number(p.netOperations);
  if(Number.isFinite(fin)&&Number.isFinite(net)){
    const ancien=Number(p.soldeJ1);
    p.soldeJ1Original=Number.isFinite(ancien)?ancien:null;
    p.soldeJ1=Math.round((fin-net)*100)/100;
    p.soldeJ1Nature='ouverture_avant_mouvements_J1';
    p.ecartReconciliationOriginal=p.ecartReconciliation;
    p.ecartReconciliation=Math.round((fin-p.soldeJ1-net)*100)/100;
  }

  r.versionSemantique=BUDGETSOFT_DASHBOARD_SEMANTICS_FINAL_VERSION;
  return r;
}

// Entrée publique terminale de l’UI : lecture snapshot-first, puis correction sémantique pure.
function chargerDashboardSyntheseV3BudgetSoft20260907(){
  return corrigerSemantiqueDashboardBudgetSoft20260907_(chargerDashboardSyntheseBudgetSoft20260907());
}

function auditerSemantiqueDashboardBudgetSoft20260907(){
  const d=chargerDashboardSyntheseV3BudgetSoft20260907(),s=d&&d.cycleSuivant||{},p=d&&d.cyclePrecedent||{};
  const r={ok:!!(d&&d.ok!==false),version:d&&d.version||'',versionCorrection:d&&d.versionCorrection||'',versionSemantique:d&&d.versionSemantique||'',cycleSuivant:{revenusPrevisionnels:s.revenusPrevisionnels,depensesPrevisionnelles:s.depensesPrevisionnelles,depensesBudgetees:s.depensesBudgetees,pilotablePrevisionnel:s.pilotablePrevisionnel,cbDifferees:s.cbDifferees},cyclePrecedent:{soldeJ1:p.soldeJ1,soldeJ1Original:p.soldeJ1Original,soldeFinCycle:p.soldeFinCycle,netOperations:p.netOperations,ecartReconciliation:p.ecartReconciliation,ecartReconciliationOriginal:p.ecartReconciliationOriginal}};
  console.log('[AUDIT Dashboard semantique] '+JSON.stringify(r));return r;
}
