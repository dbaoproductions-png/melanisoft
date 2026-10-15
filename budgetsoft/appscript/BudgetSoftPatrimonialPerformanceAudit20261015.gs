/**
 * Profil patrimonial en lecture seule. Aucun recalcul de snapshot, aucune
 * ecriture ni modification des capitaux ou des rapprochements.
 * Les resultats instantanes sont compares au snapshot de la meme lecture.
 */
function auditerPerformancePatrimonialeBudgetSoft20261015(){
  const temps={};const mesurer=(nom,fn)=>{
    const t=Date.now();try{const resultat=fn();temps[nom]={ms:Date.now()-t,ok:true};return resultat;}
    catch(e){temps[nom]={ms:Date.now()-t,ok:false,erreur:String(e&&e.message||e)};return null;}
  };
  const s=mesurer('lectureSnapshot',()=>lireEtatGlobalBudgetSoftSiDisponible20260906_());
  const m=s&&s.modules||{};
  const simulation=mesurer('simulationCredits',()=>simulerRattrapageAmortissementsCredits20260915());
  const courant=mesurer('compositionEstimation',()=>construireSituationPatrimonialeEstimeeBudgetSoft20261014_(m.credits,m.patrimoine,simulation));
  const canon=m.situationPatrimonialeEstimee;
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const ecart=canon&&courant?arr(courant.endettementTotalEstime-canon.endettementTotalEstime):null;
  const accord=ecart!==null&&Math.abs(ecart)<=.01;
  const out={ok:!!(s&&canon&&canon.ok&&simulation&&simulation.ok&&courant&&courant.ok&&accord),
    lectureSeule:true,version:'2026-10-15.1',revisionBudgetSoft:String(s&&s.revisionBudgetSoft||''),
    snapshotDisponible:!!canon,simulationOk:!!(simulation&&simulation.ok),
    nombreCredits:simulation&&simulation.nombre_credits,
    nombreOperationsSimulees:simulation&&simulation.nombre_operations,
    detteSnapshot:canon&&canon.endettementTotalEstime,
    detteRecalculee:courant&&courant.endettementTotalEstime,ecart,
    temps,attention:'Profil ponctuel: frais de lecture et cache variables; ne prouve pas un gain de performance.'};
  console.log('[AUDIT PERFORMANCE PATRIMONIALE 20261015] '+JSON.stringify(out));
  return out;
}
