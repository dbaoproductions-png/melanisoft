/**
 * Audit lecture seule de la preuve d'imputation d'une operation bancaire
 * a une occurrence mensuelle distincte.
 * Ne cree aucun rapprochement et n'attribue jamais une occurrence par hypothese.
 */
function auditerPreuvesOccurrencesChargesFixes20261020(){
  const charges=lireTable_('Charges_fixes')||[];
  const operations=lireTable_('Operations')||[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'
    ?lireRapprochementsChargesFixes()||[]:[];
  const byId={};charges.forEach(c=>{byId[String(c.id||'')]=c;});
  const opsById={};operations.forEach(o=>{opsById[String(o.id||'')]=o;});
  let valide=0,ambigu=0,avecOccurrence=0,sansOperation=0,avecLienDirect=0;
  const ambiguExamples=[],avecOccurrenceExamples=[];
  const status=x=>String(x||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const accepte=r=>/valid|rapproch/.test(status(r.statut||r.decision))&&!/a valider|propos/.test(status(r.statut||r.decision));
  const origine=r=>String(r.date_echeance_origine||r.occurrence_date||r.date_cible||'').slice(0,10);
  rapprochements.forEach(r=>{
    if(!accepte(r))return;
    valide++;
    const chargeId=String(r.charge_fixe_id||''),opId=String(r.operation_id||'');
    const o=opsById[opId],c=byId[chargeId],occ=origine(r);
    if(!o)sansOperation++;
    if(occ&&/^\d{4}-\d{2}-\d{2}$/.test(occ)){
      avecOccurrence++;
      if(avecOccurrenceExamples.length<3)avecOccurrenceExamples.push({chargeId,origine:occ});
    }else{
      ambigu++;
      if(ambiguExamples.length<6)ambiguExamples.push({chargeId,charge:String(c&&c.libelle||'').slice(0,55),
        montantReel:Number(r.montant_reel||o&&o.montant||0),
        dateOperation:String(r.date_operation||o&&o.date_comptable||o&&o.date||'').slice(0,10),
        statut:String(r.statut||''),aucuneOccurrenceIdentifiee:true});
    }
  });
  operations.forEach(o=>{
    if(String(o.charge_fixe_id||'').trim())avecLienDirect++;
  });
  const x={lectureSeule:true,version:'2026-10-20.1',
    volumes:{charges:charges.length,operations:operations.length,rapprochements:rapprochements.length,
      rapprochementsValides:valide,preuvesAvecOccurrence:avecOccurrence,
      preuvesSansOccurrence:ambigu,preuvesSansOperation:sansOperation,
      operationsLieesChargeFixe:avecLienDirect},
    exemplesAmbigus:ambiguExamples,exemplesAvecOccurrence:avecOccurrenceExamples,
    compatibleAttributionAutomatique:ambigu===0&&sansOperation===0,
    avertissement:'Un rapprochement par charge_fixe_id ou par date_operation ne suffit pas a prouver quelle mensualite est reglee ; aucune ecriture modifiee.'};
  console.log('[AUDIT PREUVES OCCURRENCES CF] '+JSON.stringify(x));return x;
}
