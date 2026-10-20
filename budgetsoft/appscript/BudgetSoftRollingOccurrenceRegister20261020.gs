/**
 * Registre de transition des occurrences de charges fixes - lecture seule.
 * Regle conservatrice : aucune dette historique creee par inference.
 * Les echeances futures sont projetables; les echeances echues ne deviennent
 * glissantes qu'avec une confirmation explicite de leur statut.
 */
function construireRegistreOccurrencesCfBudgetSoft20261020_(entree){
 const e=entree||{},ref=String(e.reference||'').slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(ref))throw Error('Date de reference requise');
 const futur=Array.isArray(e.occurrences)?e.occurrences:[],
       confirmations=Array.isArray(e.confirmations)?e.confirmations:[],
       paiements=Array.isArray(e.paiements)?e.paiements:[];
 const confirmationParCle={};
 confirmations.forEach(c=>{const k=String(c.chargeId||'')+'|'+String(c.origine||'').slice(0,10);if(k!=='|'&&String(c.statut||'')==='impaye_confirme')confirmationParCle[k]=c;});
 const preuves=[],propositions=[],anomalies=[];
 paiements.forEach(p=>{
  if(String(p.statut||'')!=='valide')return;
  if(!p.operationId||!p.chargeId||!/^\d{4}-\d{2}-\d{2}$/.test(String(p.origine||''))){
   propositions.push({chargeId:String(p.chargeId||''),operationId:String(p.operationId||''),motif:'preuve_sans_occurrence'});return;
  }
  preuves.push(p);
 });
 const brut=calculerOccurrencesGlissantesCfBudgetSoft20261020_(futur,preuves,ref);
 const lignes=brut.occurrences.map(o=>{
  const conf=confirmationParCle[o.cle]||null;
  const estFuture=o.origine>ref;
  const prouve=conf&&String(conf.reference||'').trim();
  const statut=o.reste<=0?'reglee':estFuture?'future':prouve?'impayee_confirmee':'a_verifier';
  return Object.assign({},o,{statutRegistre:statut,confirmationReference:prouve?String(conf.reference):'',
   provisionReportable:statut==='impayee_confirmee'?o.reste:0,
   montantFuture:statut==='future'?o.reste:0});
 });
 const arr=n=>Math.round(Number(n||0)*100)/100;
 return {ok:brut.ok&&anomalies.length===0,lectureSeule:true,version:'2026-10-20.1',
  reference:ref,lignes,propositions,anomalies:anomalies.concat(brut.anomalies),
  bilan:{futures:arr(lignes.reduce((s,l)=>s+l.montantFuture,0)),
   glissantesConfirmees:arr(lignes.reduce((s,l)=>s+l.provisionReportable,0)),
   aVerifier:arr(lignes.filter(l=>l.statutRegistre==='a_verifier').reduce((s,l)=>s+l.reste,0)),
   reglees:lignes.filter(l=>l.statutRegistre==='reglee').length},
  garde:'Les montants a verifier ne sont jamais reportes automatiquement; aucune date bancaire attribuee.'};
}

function testerRegistreOccurrencesCfBudgetSoft20261020(){
 const id='COPRO',occs=[{chargeId:id,origine:'2026-10-15',montant:550},{chargeId:id,origine:'2026-11-15',montant:550}];
 const run=(ref,conf,paye)=>construireRegistreOccurrencesCfBudgetSoft20261020_({reference:ref,occurrences:occs,confirmations:conf||[],paiements:paye||[]});
 const preuve={chargeId:id,origine:'2026-10-15',operationId:'bank_01',montant:550,statut:'valide'};
 const conf=[{chargeId:id,origine:'2026-10-15',statut:'impaye_confirme',reference:'confirmation_utilisateur'}];
 const a=run('2026-10-20'),b=run('2026-10-20',conf),c=run('2026-11-20',conf),d=run('2026-11-20',conf,[preuve]);
 const e=run('2026-11-20',conf,[{chargeId:id,origine:'',operationId:'bank_01',montant:550,statut:'valide'}]);
 const tests={sansConfirmationAucuneDetteGlissante:a.bilan.glissantesConfirmees===0&&a.bilan.aVerifier===550,
  confirmeOctobre550:b.bilan.glissantesConfirmees===550&&b.bilan.futures===550,
  cycleSuivantGardeOctobre:c.bilan.glissantesConfirmees===550&&c.bilan.aVerifier===550,
  paiementOctobreEteintOctobrePasNovembre:d.bilan.glissantesConfirmees===0&&d.bilan.aVerifier===550,
  paiementAmbiguNeClotPas:e.bilan.glissantesConfirmees===550&&e.propositions.length===1};
 const resultat={ok:Object.values(tests).every(Boolean),lectureSeule:true,version:'2026-10-20.1',
  tests,bilans:{sansConfirmation:a.bilan,confirme:b.bilan,cycleSuivant:c.bilan,paiementProuve:d.bilan,paiementAmbigu:e.bilan}};
 console.log('[TEST REGISTRE GLISSANT CF] '+JSON.stringify(resultat));return resultat;
}

/** Etat reel : echantillon et limites, sans reconstruire d'arrieres anterieurs. */
function auditerRegistreReelCfBudgetSoft20261020(){
 const chargeId='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const charges=(lireTable_('Charges_fixes')||[]),charge=charges.find(c=>String(c.id)===chargeId);
 if(!charge)throw Error('Charge copro absente');
 const ajust=typeof lireAjustementsChargesFixes==='function'?lireAjustementsChargesFixes()||[]:[];
 const start=new Date('2026-10-20T12:00:00'),end=new Date('2026-11-27T12:00:00');
 const o=calculerEcheancesChargeFixeAjustees_(charge,start,charge.date_fin?dateLocaleBudgetSoft_(charge.date_fin):null,end,ajust);
 const fmt=d=>Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
 const lignes=o.map(e=>({chargeId,origine:fmt(e.date),montant:e.montant}));
 const r=construireRegistreOccurrencesCfBudgetSoft20261020_({reference:'2026-10-20',occurrences:lignes,confirmations:[],paiements:[]});
 const out={ok:r.ok,lectureSeule:true,version:r.version,perimetre:'copro prospective uniquement',
  lignes:r.lignes.map(x=>({origine:x.origine,montant:x.montant,statut:x.statutRegistre,reportable:x.provisionReportable})),
  bilan:r.bilan,limite:'La provision economique du cycle du 28/09 au 27/10 est deja portee par Cerbere; ce test ne la recree pas et ne deduit aucun arriere.';
 console.log('[AUDIT REGISTRE REEL CF] '+JSON.stringify(out));return out;
}
