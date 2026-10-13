/**
 * Diagnostic lecture seule: rapprochements bancaires des credits et
 * frontiere entre paiements passes et operations futures.
 */
function auditerEcheancesCreditsBancaires20261013(){
  verifierInitialisation_();
  const today=new Date();
  const jour=d=>Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const reference=jour(today);
  const credits=lireCreditsEtendusV2_();
  const rapprochements=rapprochementsCreditsValidesRattrapage20260915_();
  const simulation=simulerRattrapageAmortissementsCredits20260915();
  const parId=new Map((simulation.credits||[]).map(c=>[String(c.credit_id),c]));
  const lignes=credits.map(c=>{
    const id=String(c.id||'');
    const rapprochementsCredit=rapprochements.filter(r=>{
      const lien=trouverCreditRattrapageCofidis20261012_(r,credits);
      return lien&&lien.ok&&String(lien.credit.id)===id;
    }).map(r=>{
      const d=jour(r.date),op=r.operation||{},montant=Number(op.montant||0);
      return {operationId:String(op.id||''),date:d,statutDate:d>reference?'future_annoncee':'passee_ou_du_jour',
        montant:montant,libelle:String(op.libelle||op.libelle_bancaire||''),
        sourceRapprochement:String(r.source||''),chargeFixeId:String((r.charge||{}).id||'')};
    });
    const sim=parId.get(id)||{};
    const debutReference=String(sim.date_reference||'');
    const rapprochementsDepuisReference=rapprochementsCredit.filter(o=>!debutReference||o.date>debutReference);
    const operationsSim=(sim.operations||[]).map(o=>({
      operationId:String(o.operation_id||''),date:jour(new Date(o.date)),
      futur:jour(new Date(o.date))>reference,capitalEstime:Number(o.part_capital||0),
      documente:!!o.ventilation_documentee
    }));
    return {credit:id,nom:String(c.nom||''),mensualite:Number(c.mensualite||0),
      prochaineEcheanceEnregistree:c.prochaine_echeance?jour(new Date(c.prochaine_echeance)):'',
      capitalEnregistre:Number(c.capital_restant||0),
      capitalSimule:sim.capital_simule_apres!=null?Number(sim.capital_simule_apres):null,
      dateReferenceCapital:debutReference,
      nombreRapprochementsHistoriques:rapprochementsCredit.length-rapprochementsDepuisReference.length,
      rapprochements:rapprochementsDepuisReference,
      operationsRetenuesSimulation:operationsSim,
      futuresDansSimulation:operationsSim.filter(o=>o.futur),
      ecarts:rapprochementsDepuisReference.filter(o=>o.statutDate==='passee_ou_du_jour'&&!operationsSim.some(x=>x.operationId===o.operationId)),
      operationsExclues:sim.exclues||[],confiance:String(sim.confiance||'')};
  });
  const out={ok:true,lectureSeule:true,version:'2026-10-13.2',dateReference:reference,
    nombreCredits:lignes.length,
    nombreFuturesDansSimulation:lignes.reduce((a,l)=>a+l.futuresDansSimulation.length,0),
    nombreRapprochementsPassesNonRetenus:lignes.reduce((a,l)=>a+l.ecarts.length,0),
    lignes};
  console.log('[AUDIT ECHEANCES CREDITS BANCAIRES 20261013] '+JSON.stringify({...out,lignes:lignes.map(l=>({nom:l.nom,dateReferenceCapital:l.dateReferenceCapital,prochaineEcheanceEnregistree:l.prochaineEcheanceEnregistree,nombreRapprochementsHistoriques:l.nombreRapprochementsHistoriques,rapprochements:l.rapprochements,operationsRetenuesSimulation:l.operationsRetenuesSimulation,operationsExclues:l.operationsExclues,ecarts:l.ecarts}))}));
  return out;
}
