/**
 * Pont canonique de lecture des decisions d'attente vers le Dashboard.
 * AUCUNE operation de tresorerie ou de CFT1 n'est creee.
 * Les decisions restent independantes du statut "impaye".
 */
function calculerPontProvisionsAttenteDashboardCf20261021_(args){
 const a=args||{},arr=n=>Math.round(Number(n||0)*100)/100;
 const lignes=Array.isArray(a.decisions)?a.decisions:[],
  inclus=Array.isArray(a.couverturesDashboard)?a.couverturesDashboard:[],
  regles=projeterDecisionsOccurrencesCfBudgetSoft20261021_(lignes);
 const anomalies=(regles.anomalies||[]).slice(),details=[],ids=new Set();
 (regles.attentes||[]).forEach(z=>{
   const cle=String(z.chargeId||'')+'|'+String(z.origine||'');
   if(ids.has(cle)){anomalies.push({motif:'attente_dupliquee',cle});return;}
   ids.add(cle);
   const montant=arr(z.montant);
   if(!(montant>0)){anomalies.push({motif:'montant_attente_manquant',cle});return;}
   const couverts=inclus.filter(x=>String(x.chargeId||'')===String(z.chargeId||'')&&
     String(x.origine||'')===String(z.origine||''));
   if(couverts.length>1){anomalies.push({motif:'couverture_multiple',cle});return;}
   const retenu=couverts.length?arr(couverts[0].montant):0;
   const reste=arr(Math.max(0,montant-retenu));
   details.push({cle,montant,reste,retenu,statut:'en_attente_prelevement',
     dateBanqueConnue:false});
 });
 return{ok:regles.ok&&anomalies.length===0,lectureSeule:true,
  version:'2026-10-21.1',details,anomalies,
  provisionComplementaire:arr(details.reduce((s,x)=>s+x.reste,0)),
  garde:'Ce pont est un diagnostic non publie. La preuve de paiement et les occurrences futures doivent etre rapprochées avant tout changement des totaux.'};
}
function testerPontProvisionsAttenteDashboardCf20261021(){
 const base={charge_fixe_id:'COPRO',date_origine:'2026-09-28',
   decision:'en_attente_prelevement',montant:550,
   reference_preuve:'provision deja validee dans le snapshot',actif:true};
 const x=calculerPontProvisionsAttenteDashboardCf20261021_({
   decisions:[base],couverturesDashboard:[{chargeId:'COPRO',origine:'2026-09-28',montant:550}]});
 const y=calculerPontProvisionsAttenteDashboardCf20261021_({
   decisions:[base],couverturesDashboard:[]});
 const z=calculerPontProvisionsAttenteDashboardCf20261021_({
   decisions:[base,base],couverturesDashboard:[]});
 const controles={dejaCouvertePasDeDoublon:x.ok&&x.provisionComplementaire===0,
   nonCouverteResteAExaminer:y.ok&&y.provisionComplementaire===550,
   doublonRefuse:!z.ok};
 const out={ok:Object.values(controles).every(Boolean),lectureSeule:true,controles};
 console.log('[TEST PONT ATTENTE DASHBOARD CF] '+JSON.stringify(out));return out;
}
function auditerPontProvisionsAttenteDashboardCf20261021(){
 const snap=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),e=snap&&snap.etat||{},
 m=e.modules||{},dash=m.dashboard&&m.dashboard.courtTerme||{};
 if(!e.ok||!e.publie)throw Error('Snapshot publie absent');
 const montant=Number(dash.provisionChargesNonDatees20261018&&dash.provisionChargesNonDatees20261018.montant||0);
 const chargeId='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const decisions=lireDecisionsOccurrencesCfBudgetSoft20261021_();
 const r=calculerPontProvisionsAttenteDashboardCf20261021_({
  decisions,couverturesDashboard:montant===550?[{chargeId,origine:'2026-09-28',montant}]:[]});
 const out={ok:r.ok&&montant===550,lectureSeule:true,revision:String(e.revisionBudgetSoft||''),
  provisionActuelle:montant,decisionsEnregistrees:decisions.length,
  complementProposeMaisNonPublie:r.provisionComplementaire,
  anomalies:r.anomalies,impactCft1:0,impactTresorerie:0,publicationActive:false};
 console.log('[AUDIT PONT ATTENTE DASHBOARD CF] '+JSON.stringify(out));return out;
}
