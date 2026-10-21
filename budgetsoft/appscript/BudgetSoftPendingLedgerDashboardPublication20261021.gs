/**
 * Tableau de bord : etat informatif des provisions explicites a date glissante.
 * Publication de l'identite et du statut uniquement : aucune injection financiere.
 */
function enrichirDashboardAttentesPersistantesCf20261021_(dashboard,decisions){
 const r=dashboard||{},c=r.courtTerme||{},xs=Array.isArray(decisions)?decisions:[],
  suivi=projeterDecisionsOccurrencesCfBudgetSoft20261021_(xs);
 const a=n=>Math.round(Number(n||0)*100)/100;
 const actifs=(suivi.attentes||[]).map(z=>{
  const id=String(z.chargeId||''),origine=String(z.origine||'');
  const provision=c.provisionChargesNonDatees20261018||{};
  const couverteCycle=String(provision.chargeFixeId||'')===id&&
    String(c.debut||'')===origine&&a(provision.montant)===a(z.montant);
  return{cle:id+'|'+origine,chargeId:id,origine,montant:a(z.montant),
    statut:'en_attente_prelevement',
    dejaDansDashboardCourant:couverteCycle,
    reportSurCycleSuivantAutorise:false,
    operationBancaireCreee:false,dateBancaireInconnue:true};
 });
 r.suiviAttentesChargesFixes20261021={
  version:'2026-10-21.1',lectureSeule:true,ok:suivi.ok,
  decisionsLues:xs.length,attentes:actifs,anomalies:suivi.anomalies||[],
  montantAAjouterDepensesAttendues:0,impactCft1:0,impactTresorerie:0,
  publicationFinanciereActive:false,
  garde:'Une attente est identifiee entre cycles, mais son cumul avec les occurrences recurrentes et son paiement restent a reconciler avant toute publication de montants.'};
 return r;
}
function testerSuiviAttentesDashboardCf20261021(){
 const id='COPRO',base={charge_fixe_id:id,date_origine:'2026-09-28',
  decision:'en_attente_prelevement',montant:550,reference_preuve:'snapshot de reference',actif:true};
 const make=c=>enrichirDashboardAttentesPersistantesCf20261021_({courtTerme:c},[base]).suiviAttentesChargesFixes20261021;
 const courant=make({debut:'2026-09-28',provisionChargesNonDatees20261018:{chargeFixeId:id,montant:550}});
 const suivant=make({debut:'2026-10-28'});
 const controles={
  suiviPersistantCourant:courant.ok&&courant.attentes.length===1,
  couvertureCouranteDetectee:courant.attentes[0].dejaDansDashboardCourant===true,
  identiteConserveeCycleSuivant:suivant.attentes[0].cle===courant.attentes[0].cle,
  aucunReportChiffreAutomatique:suivant.montantAAjouterDepensesAttendues===0&&suivant.impactCft1===0,
  aucunDebitBancaire:suivant.attentes[0].operationBancaireCreee===false
 };
 const out={ok:Object.values(controles).every(Boolean),lectureSeule:true,controles};
 console.log('[TEST SUIVI ATTENTES DASHBOARD] '+JSON.stringify(out));return out;
}
function auditerSuiviAttentesDashboardPublie20261021(){
 const s=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),e=s&&s.etat||{},m=e.modules||{},
  v=m.dashboard&&m.dashboard.suiviAttentesChargesFixes20261021||null;
 const out={ok:!!v&&v.ok===true,lectureSeule:true,
  revision:String(e.revisionBudgetSoft||''),suiviPublie:!!v,
  nombreAttentes:v&&v.attentes&&v.attentes.length||0,
  details:v&&v.attentes||[],anomalies:v&&v.anomalies||[],
  impactDepenses:v&&v.montantAAjouterDepensesAttendues,
  impactCft1:v&&v.impactCft1,publicationFinanciereActive:v&&v.publicationFinanciereActive};
 console.log('[AUDIT SUIVI ATTENTES DASHBOARD PUBLIE] '+JSON.stringify(out));return out;
}
