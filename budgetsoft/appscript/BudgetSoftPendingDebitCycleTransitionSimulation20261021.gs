/**
 * Transition de provisions en attente de prelevement : simulateur pur.
 * Ne publie rien. Identite stable definie explicitement par le demandeur,
 * sans creation d'une dette sur simple absence d'operation.
 */
function simulerReportProvisionsAttenteCf20261021_(entree){
 const x=entree||{}, a=n=>Math.round(Number(n||0)*100)/100;
 const debut=String(x.debutSuivant||''),fin=String(x.finSuivant||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(debut)||!/^\d{4}-\d{2}-\d{2}$/.test(fin)||debut>fin)throw Error('Bornes de cycle invalides');
 const provisions=Array.isArray(x.provisions)?x.provisions:[],
  eches=Array.isArray(x.echeancesSuivantes)?x.echeancesSuivantes:[],
  paiements=Array.isArray(x.paiements)?x.paiements:[];
 const deja=new Set(),anomalies=[],reportees=[],couvertes=[],futures=[];
 provisions.forEach(z=>{
  const identite=String(z.identite||''),chargeId=String(z.chargeId||''),
   montant=a(z.montant),confirme=!!z.attenteConfirmee;
  if(!identite||!chargeId||montant<=0||deja.has(identite)){anomalies.push('provision_invalide_ou_dupliquee');return;}
  deja.add(identite);
  if(!confirme)return; // pas de report sans confirmation de maintien
  const liees=paiements.filter(p=>String(p.identite||'')===identite&&p.valide===true&&String(p.operationId||''));
  const ids=new Set(),paye=a(liees.reduce((total,p)=>{
   const id=String(p.operationId);if(ids.has(id))return total;ids.add(id);return total+Math.max(0,Number(p.montant||0));
  },0));
  if(paye>montant+.01){anomalies.push('paiement_superieur_provision:'+identite);return;}
  const reste=a(montant-paye);
  if(reste>0)reportees.push({identite,chargeId,montant:reste,origine:z.origine||'',statut:'en_attente_prelevement'});
  else couvertes.push({identite,chargeId,paiements:[...ids]});
 });
 eches.forEach(z=>{
  const id=String(z.identite||''),d=String(z.date||'').slice(0,10),m=a(z.montant);
  if(!id||!z.chargeId||m<=0||!d||d<debut||d>fin){anomalies.push('echeance_invalide');return;}
  if(deja.has(id)){anomalies.push('identite_future_deja_reportee:'+id);return;}
  deja.add(id);futures.push({identite:id,chargeId:String(z.chargeId),date:d,montant:m});
 });
 return{ok:anomalies.length===0,lectureSeule:true,
  version:'2026-10-21.1',cycle:{debut,fin},reportees,couvertes,futures,anomalies,
  totals:{report:a(reportees.reduce((s,z)=>s+z.montant,0)),
   nouvelles:a(futures.reduce((s,z)=>s+z.montant,0))},
  garde:'Le report n est pas un debit bancaire. Ne pas additionner automatiquement avec CFT1 ou une projection deja couverte.'};
}
function testerSimulationReportProvisionsAttenteCf20261021(){
 const chargeId='COPRO',base={debutSuivant:'2026-10-28',finSuivant:'2026-11-27',
  provisions:[{identite:'copro:provision:cycle-2026-09-28',chargeId,montant:550,origine:'cycle-2026-09-28',attenteConfirmee:true}],
  echeancesSuivantes:[{identite:'copro:echeance:2026-11-15',chargeId,date:'2026-11-15',montant:550}]};
 const a=simulerReportProvisionsAttenteCf20261021_(base);
 const b=simulerReportProvisionsAttenteCf20261021_(Object.assign({},base,{paiements:[{
  identite:'copro:provision:cycle-2026-09-28',operationId:'OP1',montant:550,valide:true}]}));
 const c=simulerReportProvisionsAttenteCf20261021_(Object.assign({},base,{provisions:base.provisions.map(p=>Object.assign({},p,{attenteConfirmee:false}))}));
 const d=simulerReportProvisionsAttenteCf20261021_(Object.assign({},base,{echeancesSuivantes:[{
  identite:'copro:provision:cycle-2026-09-28',chargeId,date:'2026-11-15',montant:550}]}));
 const tests={attenteConfirmeeEtNouvelleDistinctes:a.ok&&a.totals.report===550&&a.totals.nouvelles===550,
  paiementProuveSoldeReport:b.ok&&b.totals.report===0&&b.totals.nouvelles===550,
  sansConfirmationPasDeReport:c.ok&&c.totals.report===0,
  memeIdentiteRefusee:!d.ok};
 const out={ok:Object.values(tests).every(Boolean),lectureSeule:true,tests,
  exemples:{deuxObligationsConditionnelles:a.totals,paiementProuve:b.totals,sansConfirmation:c.totals},
  avertissement:'Les deux montants ne peuvent etre cumules dans les finances reelles qu apres verification que les obligations sont distinctes.'};
 console.log('[TEST REPORT PROVISIONS ATTENTE C1 C2] '+JSON.stringify(out));return out;
}
function auditerSimulationReportCoproSnapshot20261021(){
 const snap=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),etat=snap&&snap.etat||{},m=etat.modules||{},
  c=m.dashboard&&m.dashboard.courtTerme||{},p=m.projectionEtendue||{};
 if(!etat.ok||!etat.publie)throw Error('Snapshot publie absent');
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const montant=Number(c.provisionChargesNonDatees20261018&&c.provisionChargesNonDatees20261018.montant||0);
 const futures=(p.lignes||[]).filter(z=>String(z.sourceId||'')===id&&String(z.date||'').slice(0,10)>String(c.fin||''));
 const simul=simulerReportProvisionsAttenteCf20261021_({
  debutSuivant:'2026-10-28',finSuivant:'2026-11-27',
  provisions:[{identite:'copro:provision:cycle-2026-09-28',chargeId:id,montant,
   origine:String(c.debut||''),attenteConfirmee:false}],
  echeancesSuivantes:futures.filter(z=>String(z.date||'').slice(0,10)<='2026-11-27').map(z=>({
   identite:String(z.id||''),chargeId:id,date:String(z.date||'').slice(0,10),montant:Math.abs(Number(z.montantSigne||0))}))
 });
 const out={ok:simul.ok&&montant===550,lectureSeule:true,
  revision:String(etat.revisionBudgetSoft||''),provisionCourante:montant,
  simulationSansConfirmation:simul.totals,reportAutomatiqueActive:false,
  notification:'La provision courante reste identifiee mais aucun report du cycle suivant sans confirmation persistante.',
  projectionBancaireModifiee:false,cft1Modifie:false};
 console.log('[AUDIT SIMULATION REPORT COPRO SNAPSHOT] '+JSON.stringify(out));return out;
}
