/**
 * Contrat de transmission en lecture seule : la provision deja publiee
 * dans le Dashboard peut etre identifiee comme "en attente de prelevement".
 * Aucune ligne bancaire, aucune dette confirmee et aucune deduction CFT1.
 */
function evaluerAttentePrelevementCfBudgetSoft20261021_(o){
 const x=o||{},attentes=Array.isArray(x.attentes)?x.attentes:[],
  chargeId=String(x.chargeId||''),
  montant=Number(x.provisionCourante||0),
  cft1=Number(x.cft1||0);
 const pertinentes=attentes.filter(a=>String(a.chargeId||'')===chargeId);
 const valide=pertinentes.length<=1&&Number.isFinite(montant)&&montant>=0&&
   Number.isFinite(cft1)&&cft1>=0;
 return{ok:valide,lectureSeule:true,chargeId,
  statut:montant>0?'en_attente_prelevement':'aucune_provision_courante',
  montantDejaPublie:montant,
  montantAAjouterAuDashboard:0,
  montantAAjouterACft1:0,
  statutImpayee:false,
  declarationsAttente:pertinentes.length,
  anomalie:pertinentes.length>1?'attentes_multiples_meme_charge':null,
  garde:'Etat descriptif uniquement : ne recompose pas un cycle precedent et ne change aucune date de prelevement.'};
}
function testerAttentePrelevementCfBudgetSoft20261021(){
 const id='COPRO',z=evaluerAttentePrelevementCfBudgetSoft20261021_({
  chargeId:id,provisionCourante:550,cft1:550,
  attentes:[{chargeId:id,statut:'en_attente_prelevement'}]
 });
 const decision=projeterDecisionsOccurrencesCfBudgetSoft20261021_([{
  charge_fixe_id:id,date_origine:'2026-09-28',
  decision:'en_attente_prelevement',reference_preuve:'provision budgetaire du cycle',
  montant:550,actif:true
 }]);
 const tests={provisionMaintenue:z.montantDejaPublie===550,
  aucunDoubleCft1:z.montantAAjouterACft1===0,
  aucunDoubleDashboard:z.montantAAjouterAuDashboard===0,
  aucunImpayee:z.statutImpayee===false,
  decisionNonConvertieEnImpayee:decision.ok&&decision.attentes.length===1&&decision.confirmations.length===0};
 const r={ok:Object.values(tests).every(Boolean),lectureSeule:true,tests};
 console.log('[TEST ATTENTE PRELEVEMENT CF] '+JSON.stringify(r));return r;
}
function auditerAttentePrelevementCoproBudgetSoft20261021(){
 const s=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),e=s&&s.etat||{},m=e.modules||{},
  c=m.dashboard&&m.dashboard.courtTerme||{},cer=m.cerbere||{};
 if(!e.ok||!e.publie)throw Error('Snapshot publie absent');
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const ligne=((cer.diagnostic&&cer.diagnostic.p1Doctrine20260912||{}).cft1Audit||{}).lignes||[];
 const cf=ligne.find(x=>String(x.id||'')===id);
 const registre=projeterDecisionsOccurrencesCfBudgetSoft20261021_(lireDecisionsOccurrencesCfBudgetSoft20261021_());
 const amount=Number(c.provisionChargesNonDatees20261018&&c.provisionChargesNonDatees20261018.montant||0);
 const etat=evaluerAttentePrelevementCfBudgetSoft20261021_({
  chargeId:id,provisionCourante:amount,cft1:cf&&cf.retenu,
  attentes:registre.attentes||[]
 });
 const out={ok:etat.ok&&registre.ok&&amount===550&&Number(cf&&cf.retenu)===550,
  lectureSeule:true,revision:String(e.revisionBudgetSoft||''),
  cycle:{debut:c.debut,fin:c.fin},statut:etat.statut,
  provision:etat.montantDejaPublie,retenuCft1:Number(cf&&cf.retenu),
  decisionsAttenteEnregistrees:etat.declarationsAttente,
  impactDashboard:etat.montantAAjouterAuDashboard,
  impactCerbere:etat.montantAAjouterACft1,
  dateBancaireInventee:false,publicationModifiee:false,
  note:'L etat affiche est deduit de la provision economique publiee; il ne cree pas une decision persistante.'};
 console.log('[AUDIT ATTENTE PRELEVEMENT COPRO] '+JSON.stringify(out));return out;
}
