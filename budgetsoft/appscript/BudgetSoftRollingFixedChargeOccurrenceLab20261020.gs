/**
 * Laboratoire pur : propriétaire d'occurrences de charges fixes glissantes.
 * Aucun acces Sheets, aucune mutation, aucune date bancaire inventee.
 *
 * Contrat des entrees :
 * occurrences [{chargeId,origine (YYYY-MM-DD),montant,statut?,ajustement?}]
 * preuves [{chargeId,origine,operationId,montant,statut:'valide'}]
 * Annulation explicite : statut='annulee' ou 'suspendue'.
 * Une preuve non datee par occurrence n'est JAMAIS repartie arbitrairement.
 */
function calculerOccurrencesGlissantesCfBudgetSoft20261020_(occurrences,preuves,jourReference){
 const arr=n=>Math.round((Number(n)||0)*100)/100;
 const xs=Array.isArray(occurrences)?occurrences:[],
       ps=Array.isArray(preuves)?preuves:[];
 const reference=String(jourReference||'').slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(reference))throw Error('Date de reference canonique requise');
 const uniques=new Set(),issues=[],anomalies=[];
 for(const o of xs){
   const chargeId=String(o&&o.chargeId||''),origine=String(o&&o.origine||'').slice(0,10);
   const montant=arr(o&&o.montant);
   if(!chargeId||!/^\d{4}-\d{2}-\d{2}$/.test(origine)||montant<=0){
     anomalies.push({motif:'occurrence_invalide',chargeId,origine});continue;
   }
   const cle=chargeId+'|'+origine;
   if(uniques.has(cle)){anomalies.push({motif:'occurrence_dupliquee',cle});continue;}
   uniques.add(cle);
   const statut=String(o.statut||'active').toLowerCase();
   const annulee=['annulee','suspendue','ignoree'].includes(statut);
   const couverture=new Set();let paye=0;
   for(const p of ps){
     if(String(p.chargeId||'')!==chargeId||String(p.origine||'').slice(0,10)!==origine)continue;
     if(String(p.statut||'').toLowerCase()!=='valide')continue;
     const opId=String(p.operationId||'');
     if(!opId){anomalies.push({motif:'preuve_sans_operation',cle});continue;}
     if(couverture.has(opId))continue;
     couverture.add(opId);
     paye+=Math.max(0,Number(p.montant||0));
   }
   paye=arr(paye);
   if(paye>montant+.01)anomalies.push({motif:'surpaiement_a_verifier',cle,montant,paye});
   const reste=annulee?0:arr(Math.max(0,montant-paye));
   issues.push({cle,chargeId,origine,montant,paye,reste,
     statut:annulee?statut:reste===0?'reglee':origine<=reference?'en_attente_de_prelevement':'a_venir',
     datePilotage:reste>0&&origine<=reference?'glissante':origine,
     dateBancaireCertifiee:false});
 }
 return{ok:anomalies.length===0,lectureSeule:true,
   version:'2026-10-20.1',reference,occurrences:issues,anomalies,
   totalRestant:arr(issues.reduce((s,o)=>s+o.reste,0)),
   totalEchuImpayé:arr(issues.filter(o=>o.origine<=reference).reduce((s,o)=>s+o.reste,0)),
   nombreImpayees:issues.filter(o=>o.origine<=reference&&o.reste>0).length};
}

/** Jeux de tests hermetiques, sans acces aux feuilles et sans ecriture. */
function testerOccurrencesGlissantesCfBudgetSoft20261020(){
 const ref='2026-11-20',id='COPRO';
 const a=[{chargeId:id,origine:'2026-10-15',montant:550},
          {chargeId:id,origine:'2026-11-15',montant:550}];
 const scenarios={
  impayes:calculerOccurrencesGlissantesCfBudgetSoft20261020_(a,[],ref),
  octobreRegle:calculerOccurrencesGlissantesCfBudgetSoft20261020_(a,[{chargeId:id,origine:'2026-10-15',operationId:'b1',montant:550,statut:'valide'}],ref),
  octobrePartiel:calculerOccurrencesGlissantesCfBudgetSoft20261020_(a,[{chargeId:id,origine:'2026-10-15',operationId:'b1',montant:200,statut:'valide'}],ref),
  preuveAmbigue:calculerOccurrencesGlissantesCfBudgetSoft20261020_(a,[{chargeId:id,origine:'',operationId:'b1',montant:550,statut:'valide'}],ref),
  annulation:calculerOccurrencesGlissantesCfBudgetSoft20261020_([{chargeId:id,origine:'2026-10-15',montant:550,statut:'annulee'}],[],ref),
  doublon:calculerOccurrencesGlissantesCfBudgetSoft20261020_(a.concat([a[0]]),[],ref)
 };
 const controles={
  deuxEcheancesDistinctes:scenarios.impayes.totalRestant===1100&&scenarios.impayes.nombreImpayees===2,
  paiementOctobreNeClotPasNovembre:scenarios.octobreRegle.totalRestant===550,
  paiementPartiel:scenarios.octobrePartiel.totalRestant===900,
  preuveSansOccurrenceNeClotRien:scenarios.preuveAmbigue.totalRestant===1100,
  annulationExplicite:scenarios.annulation.totalRestant===0,
  identiteSansDoublon:scenarios.doublon.ok===false&&scenarios.doublon.totalRestant===1100
 };
 const out={ok:Object.values(controles).every(Boolean),lectureSeule:true,
  version:'2026-10-20.1',controles,
  totaux:Object.fromEntries(Object.entries(scenarios).map(([k,v])=>[k,v.totalRestant])),
  remarque:'Tests hermetiques : ne prouvent pas encore le raccordement aux rapprochements du fichier reel.'};
 console.log('[TEST OCCURRENCES GLISSANTES CF] '+JSON.stringify(out));return out;
}
