const BUDGETSOFT_DASHBOARD_CURRENT_CYCLE_PROJECTION_20260912_VERSION='2026-09-13.3';

/*
 * Adaptateur Dashboard intermodule.
 *
 * IMPORTANT : il consomme exclusivement le contexte de construction de la même
 * révision globale (ctx.cerbere + ctx.projectionEtendue). Il ne relit jamais un
 * snapshot précédent pendant la composition. Ainsi EP, P et les soldes projetés
 * appartiennent tous à la même photographie BudgetSoft.
 */
// Composition active transférée à BudgetSoftDashboardCanonicalOwner20260918.gs.

function auditerSoldesPrevisionnelsDashboardBudgetSoft20260912(){
  const snap=chargerSnapshotGlobalBudgetSoft20260906(),etat=snap&&snap.disponible&&snap.etat,m=etat&&etat.modules||{},d=m.dashboard||{},c=d.courtTerme||{},s=d.cycleSuivant||{},p=m.projectionEtendue||{},cer=m.cerbere||{},ps=Array.isArray(cer.periodes)?cer.periodes:[],ep=ps[0]&&ps[0].enveloppePilotable||{},ep2=ps[1]&&ps[1].enveloppePilotable||{};
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const canonFin=c.fin&&typeof pointProjectionTresorerieUnifiee20260907_==='function'?pointProjectionTresorerieUnifiee20260907_(p,c.fin):null,canonJ2=s.debut&&typeof pointProjectionTresorerieUnifiee20260907_==='function'?pointProjectionTresorerieUnifiee20260907_(p,s.debut):null;
  const out={ok:!!(etat&&etat.ok===true),version:BUDGETSOFT_DASHBOARD_CURRENT_CYCLE_PROJECTION_20260912_VERSION,revisionBudgetSoft:etat&&etat.revisionBudgetSoft||'',courant:{ep:arr(c.ep),epOwner:arr(ep.total),p:arr(c.pSoutenable),soldeFin:arr(c.soldeFinCycle),soldeFinCanon:Number.isFinite(Number(canonFin))?arr(canonFin):null},suivant:{ep:arr(s.ep),epOwner:arr(ep2.total),p:arr(s.pSoutenable),soldeJ1:arr(s.soldeJ1),soldeJ1Canon:Number.isFinite(Number(canonJ2))?arr(canonJ2):null},provenance:d&&d.provenance||{}};
  out.ok=out.ok&&Math.abs(out.courant.ep-out.courant.epOwner)<=.01&&Math.abs(out.suivant.ep-out.suivant.epOwner)<=.01&&(out.courant.soldeFinCanon==null||Math.abs(out.courant.soldeFin-out.courant.soldeFinCanon)<=.01)&&(out.suivant.soldeJ1Canon==null||Math.abs(out.suivant.soldeJ1-out.suivant.soldeJ1Canon)<=.01);
  console.log('[AUDIT Dashboard projection + EP/P] '+JSON.stringify(out));return out;
}
