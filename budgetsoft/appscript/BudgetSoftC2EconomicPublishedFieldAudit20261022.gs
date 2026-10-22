/**
 * Audit C2 du champ de pilotage publié dans le Dashboard canonique.
 * Lecture seule, sans reconstruction du snapshot ni modification de total.
 */
function auditerChampDepensesEconomiquesC2BudgetSoft20261022(){
 const snap=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),etat=snap&&snap.etat||{},
  dash=(etat.modules||{}).dashboard||{},cycle=dash.cycleSuivant||{},
  vue=dash.vueEconomiqueCoproC2BudgetSoft20261021||{},
  a=n=>Math.round(Number(n||0)*100)/100;
 if(!etat.ok||!etat.publie)throw Error('Snapshot publie indisponible');
 const controles={
  vueValidee:vue.ok===true&&vue.applicable===true,
  cycleAttendu:cycle.debut==='2026-10-28'&&cycle.fin==='2026-11-27',
  champPublie:cycle.depensesAttenduesEconomiquesPubliees===true,
  report550:a(cycle.reportProvisionsAttenteEconomique)===550,
  totalEconomiqueConcordant:a(cycle.depensesAttenduesEconomiques)===a(vue.depensesEconomiquesAvecReport),
  projectionCanoniqueInchangee:a(cycle.depensesPrevisionnelles)===a(vue.depensesPrevisionnellesCanoniques),
  impactFinancierNul:vue.impactFinancierCanonique===0,
  ecartReportUnique:a(Number(cycle.depensesAttenduesEconomiques)-Number(cycle.depensesPrevisionnelles))===550
 };
 const out={ok:Object.values(controles).every(Boolean),lectureSeule:true,
  revision:String(etat.revisionBudgetSoft||''),controles,
  cycle:{debut:cycle.debut,fin:cycle.fin},
  depensesPrevisionnellesCanoniques:cycle.depensesPrevisionnelles,
  reportProvisionsAttenteEconomique:cycle.reportProvisionsAttenteEconomique,
  depensesAttenduesEconomiques:cycle.depensesAttenduesEconomiques,
  depensesAttenduesEconomiquesPubliees:cycle.depensesAttenduesEconomiquesPubliees,
  source:String(cycle.depensesAttenduesEconomiquesSource||''),
  modificationsBancaires:0,modificationsCerbere:0};
 console.log('[AUDIT CHAMP DEPENSES ECONOMIQUES C2] '+JSON.stringify(out));
 return out;
}
