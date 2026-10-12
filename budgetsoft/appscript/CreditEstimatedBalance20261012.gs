/**
 * Projection indicative en lecture seule. Les valeurs de Credits restent
 * les capitaux de reference, meme lorsque des remboursements sont simules.
 */
function chargerProjectionEndettementCredits20261012(){
  const sim=simulerRattrapageAmortissementsCredits20260915();
  const credits=lireCreditsEtendusV2_();
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const index=new Map(credits.map(c=>[String(c.id),c]));
  const lignes=(sim.credits||[]).map(x=>{
    const c=index.get(String(x.credit_id)),base=c?arr(c.capital_restant):null;
    const coherent=base!==null&&Math.abs(base-arr(x.capital_actuel))<.01;
    const estime=coherent&&x.confiance!=='conflit'?arr(x.capital_simule_apres):null;
    return {id:x.credit_id,nom:x.credit,capitalConfirme:base,capitalEstime:estime,
      reduction:estime===null?null:arr(base-estime),confiance:x.confiance,
      operations:(x.operations||[]).map(o=>({date:o.date,montant:o.montant,capital:o.part_capital,
        interets:o.part_interets,assurance:o.part_assurance,documentee:o.ventilation_documentee,
        methode:o.methode,id:o.operation_id})),
      exclues:x.exclues||[],journalisees:x.operations_journalisees_depuis_reference||0};
  });
  const valide=lignes.length===credits.length&&lignes.every(x=>x.capitalEstime!==null);
  const confirme=arr(credits.reduce((s,c)=>s+Number(c.capital_restant||0),0));
  const estime=valide?arr(lignes.reduce((s,x)=>s+x.capitalEstime,0)):null;
  const out={ok:!!sim.ok&&valide,lectureSeule:true,version:'2026-10-12.1',
    capitalConfirme:confirme,capitalEstime:estime,reduction:estime===null?null:arr(confirme-estime),
    operationsDocumentees:sim.nombre_operations_documentees||0,
    operationsEstimees:sim.nombre_operations_estimees||0,
    operationsExclues:sim.nombre_operations_exclues||0,lignes};
  console.log('[PROJECTION CREDITS 20261012] '+JSON.stringify({ok:out.ok,lectureSeule:true,capitalConfirme:confirme,capitalEstime:estime,reduction:out.reduction}));
  return out;
}
