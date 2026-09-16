const CREDIT_DATA_REFRESH_20260916_VERSION='2026-09-16.1';

function dateLocaleCreditDataRefresh20260916_(v){
  if(!v)return'';const d=new Date(v);if(isNaN(d))return'';
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}

function trouverOperationAccessioSeptembre20260916_(){
  const operations=typeof lireTable_==='function'?lireTable_('Operations'):[];
  const candidats=(operations||[]).filter(op=>{
    const montant=Math.abs(Number(op&&op.montant||0));
    if(Math.abs(montant-33.60)>.02)return false;
    const date=dateLocaleCreditDataRefresh20260916_(op.date_comptable||op.date||op.date_operation);
    if(date!=='2026-09-04'&&date!=='2026-09-05')return false;
    const texte=texteCreditAmort20260915_([op.libelle,op.libelle_bancaire,op.description,op.commentaire,op.nature].join(' '));
    return texte.includes('COFIDIS');
  });
  if(candidats.length!==1)return{ok:false,raison:candidats.length?'operation_accessio_ambigue':'operation_accessio_introuvable',nombre:candidats.length,candidats:candidats.map(x=>({id:String(x.id||''),date:dateLocaleCreditDataRefresh20260916_(x.date_comptable||x.date||x.date_operation),montant:Number(x.montant||0),charge_fixe_id:String(x.charge_fixe_id||'')}))};
  return{ok:true,operation:candidats[0]};
}

function rapprochementChargeFixeAccessio20260916_(operationId){
  const oid=String(operationId||'');if(!oid)return'';
  const op=(typeof lireTable_==='function'?lireTable_('Operations'):[]).find(x=>String(x.id||'')===oid);
  if(op&&op.charge_fixe_id)return String(op.charge_fixe_id);
  const rappro=typeof lireTable_==='function'?lireTable_('Rapprochements_charges_fixes'):[];
  const r=(rappro||[]).find(x=>String(x.operation_id||x.operationId||'')===oid&&String(x.statut||'').toLowerCase()!=='rejete');
  return r?String(r.charge_fixe_id||r.chargeId||''):'';
}

function auditerRattrapageAccessio20260916(){
  verifierInitialisation_();
  const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[];
  const credit=credits.find(c=>typeof estCreditAccessio20260915_==='function'&&estCreditAccessio20260915_(c));
  const trouve=trouverOperationAccessioSeptembre20260916_();
  if(!credit||!trouve.ok){const out={ok:false,version:CREDIT_DATA_REFRESH_20260916_VERSION,lecture_seule:true,raison:!credit?'credit_accessio_introuvable':trouve.raison,detail:trouve};console.log('[AUDIT RATTRAPAGE ACCESSIO 20260916] '+JSON.stringify(out));return out;}
  const op=trouve.operation,oid=String(op.id||''),journal=typeof lireJournalAmortissementsCredits20260915_==='function'?lireJournalAmortissementsCredits20260915_():[],deja=journal.find(x=>String(x.operation_id||'')===oid&&String(x.statut||'')==='applique');
  const calc=calculerAmortissementCredit20260915_(credit,op),capitalActuel=Number(credit.capital_restant||0),capitalAttendu=776.53;
  const calculExact=!!(calc&&String(calc.methode||'').indexOf('releve_exact_ACCESSIO_')===0&&Math.abs(Number(calc.partCapital||0)-23.47)<.001&&Math.abs(Number(calc.partInterets||0)-10.13)<.001);
  const autorisable=!deja&&Math.abs(capitalActuel-800)<.01&&calculExact;
  const out={ok:true,version:CREDIT_DATA_REFRESH_20260916_VERSION,lecture_seule:true,credit:{id:String(credit.id||''),nom:String(credit.nom||''),capital_actuel:capitalActuel,capital_attendu:capitalAttendu,prochaine_echeance:String(credit.prochaine_echeance||'')},operation:{id:oid,date:dateLocaleCreditDataRefresh20260916_(op.date_comptable||op.date||op.date_operation),montant:Number(op.montant||0),charge_fixe_id:rapprochementChargeFixeAccessio20260916_(oid)},calcul:calc,deja_journalisee:!!deja,application_autorisable:autorisable};
  console.log('[AUDIT RATTRAPAGE ACCESSIO 20260916] '+JSON.stringify(out));return out;
}

function appliquerRattrapageAccessio20260916(){
  verifierInitialisation_();const lock=LockService.getDocumentLock();lock.waitLock(15000);let out;
  try{
    const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[],credit=credits.find(c=>typeof estCreditAccessio20260915_==='function'&&estCreditAccessio20260915_(c)),trouve=trouverOperationAccessioSeptembre20260916_();
    if(!credit||!trouve.ok){out={ok:false,version:CREDIT_DATA_REFRESH_20260916_VERSION,raison:!credit?'credit_accessio_introuvable':trouve.raison};}
    else{
      const op=trouve.operation,oid=String(op.id||''),journal=lireJournalAmortissementsCredits20260915_(),deja=journal.find(x=>String(x.operation_id||'')===oid&&String(x.statut||'')==='applique');
      if(deja){out={ok:true,version:CREDIT_DATA_REFRESH_20260916_VERSION,applique:false,duplique:true,operation_id:oid,capital_restant:Number(credit.capital_restant||0)};}
      else{
        const capitalAvant=Number(credit.capital_restant||0),calc=calculerAmortissementCredit20260915_(credit,op),exact=calc&&String(calc.methode||'').indexOf('releve_exact_ACCESSIO_')===0;
        if(Math.abs(capitalAvant-800)>=.01||!exact||Math.abs(Number(calc.partCapital||0)-23.47)>=.001)throw new Error('Garde Accessio refusée : état ou ventilation inattendu');
        const cible=Object.assign({},credit,{capital_restant:776.53,prochaine_echeance:'2026-10-05'});
        if(typeof enregistrerCreditEtendu_==='function')enregistrerCreditEtendu_(cible);else enregistrerLigne('Credits',cible);
        const sh=assurerJournalAmortissementsCredits20260915_(),chargeId=rapprochementChargeFixeAccessio20260916_(oid),row={id:Utilities.getUuid(),credit_id:credit.id,credit_nom:credit.nom,charge_fixe_id:chargeId,operation_id:oid,date_operation:op.date_comptable||op.date||op.date_operation,montant_echeance:33.60,part_capital:23.47,part_interets:10.13,part_assurance:0,capital_avant:800,capital_apres:776.53,echeances_avant:Number(credit.echeances_restantes||0),echeances_apres:Number(credit.echeances_restantes||0),prochaine_echeance_avant:credit.prochaine_echeance||'',prochaine_echeance_apres:'2026-10-05',methode:String(calc.methode||'')+'_rattrapage',statut:'applique',version:CREDIT_DATA_REFRESH_20260916_VERSION,date_traitement:new Date().toISOString()};
        sh.getRange(sh.getLastRow()+1,1,1,CREDIT_AMORTIZATION_HEADERS_20260915.length).setValues([CREDIT_AMORTIZATION_HEADERS_20260915.map(h=>row[h]??'')]);
        out={ok:true,version:CREDIT_DATA_REFRESH_20260916_VERSION,applique:true,credit:String(credit.nom||''),operation_id:oid,capital_avant:800,part_capital:23.47,capital_apres:776.53,prochaine_echeance:'2026-10-05',methode:row.methode};
      }
    }
  }finally{lock.releaseLock();}
  if(out&&out.applique&&typeof reconstruireSnapshotGlobalSyntheseBudgetSoft20260907==='function'){
    try{const s=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('rattrapage_accessio_20260916');out.snapshot={ok:!!(s&&s.ok),revisionBudgetSoft:String(s&&s.revisionBudgetSoft||''),message:String(s&&s.message||'')};}catch(e){out.snapshot={ok:false,erreur:String(e&&e.message||e)};}
  }
  console.log('[APPLICATION RATTRAPAGE ACCESSIO 20260916] '+JSON.stringify(out));return out;
}

function ciblesMetadonneesCredits20260916_(){
  return [
    {test:/^Cofidis$/i,commentaire:'TAEG fixe 4,70 %. Montant emprunté 10 000 €. Capital restant dû constaté sur l’espace Cofidis au 15/09/2026 : 8 795,45 €. Échéance de 207,89 € prélevée le 01/09/2026 ; prochaine échéance le 01/10/2026. La durée restante de 53 mois provenait de la situation communiquée au 16/08/2026 et reste une estimation tant qu’un échéancier contractuel actualisé n’est pas fourni.'},
    {test:/Carrefour PASS/i,assurance_mensuelle:38.11,commentaire:'Relevé de référence arrêté au 20/08/2026 : capital restant dû 5 883,98 €. Échéance de septembre : 168,00 €, dont 58,44 € de capital, 71,45 € d’intérêts et 38,11 € d’assurance. Capital restant dû après cette échéance : 5 825,54 €. Prochaine échéance : 05/10/2026. TAEG révisable 15,66 % ; fin estimée sans nouvelle utilisation.'},
    {test:/FLOA|Cdiscount/i,assurance_mensuelle:0,commentaire:'Relevé de référence arrêté au 24/08/2026 : capital restant dû 2 974,05 €. Échéance de septembre : 114,25 €, dont 60,41 € de capital, 52,59 € d’intérêts et 1,25 € de frais ; aucune assurance. Capital restant dû après cette échéance : 2 913,64 €. Prochaine échéance : 05/10/2026. TAEG révisable 15,66 % ; fin estimée sans nouvelle utilisation.'},
    {test:/Accessio/i,commentaire:'Situation de référence communiquée le 16/08/2026 : capital restant dû 800,00 €, réserve 2 500 €, disponible communiqué 1 700 €, TAEG révisable 23,16 %, sans assurance. Échéance contractuelle du 05/09/2026, prélevée le 04/09/2026 : 33,60 €, dont 23,47 € de capital et 10,13 € d’intérêts. Capital restant dû après échéance : 776,53 €. Prochaine échéance : 05/10/2026.'},
    {test:/Oney Carte b\+/i,assurance_mensuelle:19.40,commentaire:'Relevé de référence arrêté au 25/08/2026 : capital restant dû 2 722,72 €. Échéance de septembre : 117,29 €, dont 49,09 € de capital, 48,80 € d’intérêts et 19,40 € d’assurance. Capital restant dû après cette échéance : 2 673,63 €. Prochaine échéance : 07/10/2026. TAEG révisable 23,30 % ; fin estimée sans nouvelle utilisation.'}
  ];
}

function auditerRafraichissementMetadonneesCredits20260916(){
  verifierInitialisation_();const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[],regles=ciblesMetadonneesCredits20260916_(),lignes=[];
  for(const c of credits){const r=regles.find(x=>x.test.test(String(c.nom||'')));if(!r)continue;const changements={};if(Object.prototype.hasOwnProperty.call(r,'commentaire')&&String(c.commentaire||'')!==r.commentaire)changements.commentaire={actuel:String(c.commentaire||''),attendu:r.commentaire};if(Object.prototype.hasOwnProperty.call(r,'assurance_mensuelle')&&Number(c.assurance_mensuelle||0)!==Number(r.assurance_mensuelle))changements.assurance_mensuelle={actuel:Number(c.assurance_mensuelle||0),attendu:Number(r.assurance_mensuelle)};lignes.push({credit:String(c.nom||''),credit_id:String(c.id||''),a_corriger:Object.keys(changements).length>0,changements});}
  const out={ok:true,version:CREDIT_DATA_REFRESH_20260916_VERSION,lecture_seule:true,nombre:lignes.length,nombre_a_corriger:lignes.filter(x=>x.a_corriger).length,lignes};console.log('[AUDIT RAFRAICHISSEMENT METADONNEES CREDITS 20260916] '+JSON.stringify(out));return out;
}

function appliquerRafraichissementMetadonneesCredits20260916(){
  verifierInitialisation_();const lock=LockService.getDocumentLock();lock.waitLock(15000);let out;
  try{const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[],regles=ciblesMetadonneesCredits20260916_(),resultats=[];for(const c of credits){const r=regles.find(x=>x.test.test(String(c.nom||'')));if(!r)continue;const maj=Object.assign({},c);let modifie=false;if(Object.prototype.hasOwnProperty.call(r,'commentaire')&&String(c.commentaire||'')!==r.commentaire){maj.commentaire=r.commentaire;modifie=true;}if(Object.prototype.hasOwnProperty.call(r,'assurance_mensuelle')&&Number(c.assurance_mensuelle||0)!==Number(r.assurance_mensuelle)){maj.assurance_mensuelle=r.assurance_mensuelle;modifie=true;}if(modifie){if(typeof enregistrerCreditEtendu_==='function')enregistrerCreditEtendu_(maj);else enregistrerLigne('Credits',maj);}resultats.push({credit:String(c.nom||''),ok:true,modifie});}out={ok:true,version:CREDIT_DATA_REFRESH_20260916_VERSION,nombre:resultats.length,nombre_modifies:resultats.filter(x=>x.modifie).length,resultats};}finally{lock.releaseLock();}
  if(out&&out.nombre_modifies&&typeof reconstruireSnapshotGlobalSyntheseBudgetSoft20260907==='function'){try{const s=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('rafraichissement_metadonnees_credits_20260916');out.snapshot={ok:!!(s&&s.ok),revisionBudgetSoft:String(s&&s.revisionBudgetSoft||''),message:String(s&&s.message||'')};}catch(e){out.snapshot={ok:false,erreur:String(e&&e.message||e)};}}
  console.log('[APPLICATION RAFRAICHISSEMENT METADONNEES CREDITS 20260916] '+JSON.stringify(out));return out;
}
