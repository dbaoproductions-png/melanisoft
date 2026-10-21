/**
 * Audit de la transition 27 -> 28 octobre depuis la decision PERSISTANTE.
 * Ne publie aucune nouvelle somme dans le Dashboard ou les comptes.
 */
function auditerTransitionCoproPersistanteVersC2BudgetSoft20261021(){
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1',
  origine='2026-09-28',debut='2026-10-28',fin='2026-11-27';
 const snap=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),etat=snap&&snap.etat||{},modules=etat.modules||{},
  dashboard=modules.dashboard||{},court=dashboard.courtTerme||{},
  projection=modules.projectionEtendue||{};
 if(!etat.ok||!etat.publie)throw Error('Snapshot publie absent : audit arrete.');
 const decisions=lireDecisionsOccurrencesCfBudgetSoft20261021_(),
   p=projeterDecisionsOccurrencesCfBudgetSoft20261021_(decisions);
 const attentes=(p.attentes||[]).filter(x=>x.chargeId===id&&x.origine===origine);
 const paiements=(p.paiements||[]).filter(x=>x.chargeId===id&&x.origine===origine);
 const anomalies=(p.anomalies||[]).slice();
 if(attentes.length!==1)anomalies.push('attente_persistante_non_unique');
 if(paiements.length)anomalies.push('paiement_enregistre_a_rapprocher');
 const montant=attentes.length===1?Number(attentes[0].montant||0):0;
 const courant=Number(court.provisionChargesNonDatees20261018&&court.provisionChargesNonDatees20261018.montant||0);
 if(montant!==550||courant!==550)anomalies.push('provision_courante_non_concordante');
 const futures=(projection.lignes||[]).filter(x=>
  String(x.sourceId||'')===id&&
  String(x.date||'').slice(0,10)>=debut&&String(x.date||'').slice(0,10)<=fin);
 if(futures.length!==1)anomalies.push('nombre_echeances_futures_inattendu');
 const echeances=futures.map(x=>({
  identite:String(x.id||''),chargeId:id,date:String(x.date||'').slice(0,10),
  montant:Math.abs(Number(x.montantSigne||0))}));
 if(echeances.length===1&&(echeances[0].date!=='2026-11-15'||echeances[0].montant!==550))
  anomalies.push('echeance_novembre_non_concordante');
 const suivi=dashboard.suiviAttentesChargesFixes20261021||{};
 if(!suivi.ok||(suivi.attentes||[]).filter(z=>z.cle===id+'|'+origine).length!==1)
  anomalies.push('suivi_dashboard_absent');
 // Statut persistant : autorise une simulation, jamais l'ajout chiffré automatique.
 const simul=simulerReportProvisionsAttenteCf20261021_({
  debutSuivant:debut,finSuivant:fin,
  provisions:attentes.map(x=>({identite:x.chargeId+'|'+x.origine,
   chargeId:x.chargeId,origine:x.origine,montant:Number(x.montant),attenteConfirmee:true})),
  echeancesSuivantes:echeances,paiements:[]
 });
 if(!simul.ok)anomalies.push('simulation_invalide');
 const out={ok:anomalies.length===0,lectureSeule:true,
  revision:String(etat.revisionBudgetSoft||''),
  transition:{finCourant:'2026-10-27',debutSuivant:debut,finSuivant:fin},
  provisionCourante:courant,attentesPersistantes:attentes.length,
  nouvelleEcheance:echeances,simulationConditionnelle:simul.totals,
  obligationsDistinctesProuvees:false,
  totalFinancierSupplementairePublie:0,
  operationBancaireCreee:false,impactCft1:0,impactTresorerie:0,
  autorisationReportFinancier:false,anomalies,
  avertissement:'Les 550 euros reportes restent une hypothese economique conditionnelle. Ne pas sommer avec novembre sans preuve de deux obligations distinctes.'};
 console.log('[AUDIT TRANSITION COPRO PERSISTANTE C1 C2] '+JSON.stringify(out));return out;
}
