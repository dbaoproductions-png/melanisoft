/**
 * Profil autonome et strictement en lecture seule du rattrapage des credits.
 * Mesure les couts independants des lectures et du rapprochement, puis la
 * simulation complete. Ne modifie ni moteur, ni cache, ni tables.
 * ATTENTION : les lectures repetees peuvent profiter des caches ; elles
 * ne constituent pas une decomposition additive du temps de simulation.
 */
function auditerCoutsRattrapageCreditsBudgetSoft20261016(){
  verifierInitialisation_();
  const mesures={},observer=(nom,fn)=>{
    const t=Date.now();
    try {const v=fn();mesures[nom]={ms:Date.now()-t,ok:true,nombre:Array.isArray(v)?v.length:null};return v;}
    catch(e){mesures[nom]={ms:Date.now()-t,ok:false,erreur:String(e&&e.message||e)};return null;}
  };
  const operations=observer('lectureOperations',()=>lireTable_('Operations'));
  const charges=observer('lectureChargesFixes',()=>lireTable_('Charges_fixes'));
  const credits=observer('lectureCreditsEtendus',()=>lireCreditsEtendusV2_());
  const rapprochements=observer('rapprochementsComplets',()=>rapprochementsCreditsValidesRattrapage20260915_());
  const simulation=observer('simulationComplete',()=>simulerRattrapageAmortissementsCredits20260915());
  const out={ok:!!(simulation&&simulation.ok&&operations&&charges&&credits&&rapprochements&&Object.values(mesures).every(x=>x.ok)),
    version:'2026-10-16.1',lectureSeule:true,
    mesures,nombreCredits:simulation&&simulation.nombre_credits,
    nombreOperationsRattrapage:simulation&&simulation.nombre_operations,
    capitalTotalDeduit:simulation&&simulation.capital_total_a_deduire,
    avertissement:'Mesures successives non additives ; cache et appels repetes peuvent varier. Aucune ecriture.'};
  console.log('[AUDIT COUTS RATTRAPAGE CREDITS 20261016] '+JSON.stringify(out));
  return out;
}
