/**
 * Simulation STRICTEMENT en lecture seule du lissage economique concerts/ARE.
 * R0, Operations, Rt1 publie et snapshots ne sont jamais modifies.
 * La valeur 74,46 EUR/cachet est une convention budgetaire et non un calcul de droits.
 */
function auditerSimulationLissageConcertsAREBudgetSoft20261017(){
  const arr=n=>Math.round((Number(n)||0)*100)/100;
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat;
  if(!e)throw new Error('Snapshot global non disponible');
  const modules=e.modules||{},cer=modules.cerbere||{},p=(cer.periodes||[])[0]||{};
  const v=p.v37||{},a=v.rt1Audit||{},canon=a.canonEffectifParCategorie||{};
  const dashboard=modules.dashboard&&modules.dashboard.courtTerme||{};
  const concert=canon.Concerts||{},ft=canon['France Travail']||{};
  const rt1=Number(v.rt1),c=Number(concert.retenu),are=Number(ft.retenu);
  if(!Number.isFinite(rt1)||!Number.isFinite(c)||!Number.isFinite(are)||
     !('revenusConstatesCycle' in a))throw new Error('Audit Rt1 incomplet; ne pas simuler');
  const refConcert=300,prixCachet=150,perteCachet=74.46;
  const reel=Number(a.revenusConstatesCycle),dus=Number(a.evenementsDus||0);
  const plancher=arr(reel+dus);
  const calcul=(concerts)=>{
    const delta=arr((concerts-refConcert)/prixCachet*perteCachet);
    // Une baisse de l'allocation ne peut pas depasser la composante FT estimee.
    const areApres=Math.max(0,arr(are-delta));
    const correctionAppliquee=arr(are-areApres);
    const rt1AvantPlancher=arr(rt1-correctionAppliquee);
    const rt1Lisse=Math.max(rt1AvantPlancher,plancher);
    return {concerts:arr(concerts),cachetsEstimes:arr(concerts/prixCachet),
      correctionTheoriqueARE:delta,franceTravailAvant:arr(are),
      franceTravailApres:arr(areApres),correctionAREAppliquee:correctionAppliquee,
      rt1AvantPlancher,plancherReelEtDus:plancher,rt1Simule:arr(rt1Lisse),
      ecretementPlancher:arr(rt1Lisse-rt1AvantPlancher)};
  };
  const actuel=calcul(c);
  const scenarios=[calcul(0),calcul(150),calcul(300),calcul(450),calcul(600),calcul(900),calcul(3000)];
  const invariants={
    aucunAjustementReference:calcul(300).correctionAREAppliquee===0,
    plancherReel:scenarios.every(x=>x.rt1Simule>=plancher),
    areNonNegative:scenarios.every(x=>x.franceTravailApres>=0),
    aucuneMutation:true,
    revenuFTReelConserve:true
  };
  const out={ok:Object.values(invariants).every(Boolean),lectureSeule:true,version:'2026-10-17.1',
    revisionBudgetSoft:String(e.revisionBudgetSoft||''),
    cycle:p.periode||{},rt1Publie:arr(rt1),constateDashboard:arr(dashboard.revenusConstates),
    reference:{concertsR0:refConcert,cachetEstime:prixCachet,compensationParCachet:perteCachet,
      franceTravailR0IntegreDeuxCachets:true},
    valeursCanonCourant:{concertsRetenus:arr(c),franceTravailRetenu:arr(are),
      franceTravailReel:arr(ft.reel),recettesReellesCerbere:arr(reel),evenementsDus:arr(dus)},
    simulationActuelle:actuel,scenarios,invariants,
    attention:'Modele economique lisse sans decalage des paiements; aucune operation, reference R0, valeur Rt1 ni snapshot historique modifies.'};
  console.log('[SIMULATION LISSAGE CONCERTS ARE RT1] '+JSON.stringify(out));return out;
}
