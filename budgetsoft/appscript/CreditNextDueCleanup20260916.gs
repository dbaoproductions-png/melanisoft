const CREDIT_NEXT_DUE_CLEANUP_20260916_VERSION='2026-09-16.1';

function cibleProchaineEcheanceCredit20260916_(credit){
  const nom=String(credit&&credit.nom||'');
  const regles=[
    {test:/^CASDEN$/i,date:'2026-11-04',source:'echeancier_exact_CASDEN'},
    {test:/^Cofidis$/i,date:'2026-10-01',source:'operation_bancaire_2026-09-01'},
    {test:/^Creatis$/i,date:'2026-09-30',source:'date_credit_existante_apres_report'},
    {test:/Carrefour PASS/i,date:'2026-10-05',source:'releve_exact_CARREFOUR_PASS'},
    {test:/FLOA|Cdiscount/i,date:'2026-10-05',source:'releve_exact_FLOA'},
    {test:/Accessio/i,date:'2026-10-05',source:'operation_bancaire_2026-09-04_libelle_20260905'},
    {test:/Oney Carte b\+/i,date:'2026-10-07',source:'releve_exact_ONEY'}
  ];
  const r=regles.find(x=>x.test.test(nom));
  return r?{date:r.date,source:r.source}:null;
}

function dateLocaleCredit20260916_(v){
  if(!v)return'';
  const d=new Date(v);if(isNaN(d))return String(v||'');
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}

function auditerProchainesEcheancesCredits20260916(){
  verifierInitialisation_();
  const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[];
  const lignes=credits.map(c=>{
    const cible=cibleProchaineEcheanceCredit20260916_(c),actuelle=dateLocaleCredit20260916_(c.prochaine_echeance),attendue=cible?cible.date:'';
    return{credit:String(c.nom||''),credit_id:String(c.id||''),prochaine_echeance_actuelle:actuelle,prochaine_echeance_attendue:attendue,source:cible?cible.source:'',a_corriger:!!cible&&actuelle!==attendue};
  });
  const out={ok:true,version:CREDIT_NEXT_DUE_CLEANUP_20260916_VERSION,lecture_seule:true,nombre_credits:lignes.length,nombre_a_corriger:lignes.filter(x=>x.a_corriger).length,lignes};
  console.log('[AUDIT PROCHAINES ECHEANCES CREDITS 20260916] '+JSON.stringify(out));return out;
}

function appliquerProchainesEcheancesCredits20260916(){
  verifierInitialisation_();
  const lock=LockService.getDocumentLock();lock.waitLock(15000);let out;
  try{
    const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[],resultats=[];
    for(const credit of credits){
      const cible=cibleProchaineEcheanceCredit20260916_(credit);if(!cible)continue;
      const actuelle=dateLocaleCredit20260916_(credit.prochaine_echeance);if(actuelle===cible.date){resultats.push({credit:String(credit.nom||''),ok:true,modifie:false,prochaine_echeance:cible.date,source:cible.source});continue;}
      const maj=Object.assign({},credit,{prochaine_echeance:cible.date});
      if(typeof enregistrerCreditEtendu_==='function')enregistrerCreditEtendu_(maj);else enregistrerLigne('Credits',maj);
      resultats.push({credit:String(credit.nom||''),ok:true,modifie:true,avant:actuelle,apres:cible.date,source:cible.source});
    }
    out={ok:resultats.every(x=>x.ok),version:CREDIT_NEXT_DUE_CLEANUP_20260916_VERSION,nombre:resultats.length,nombre_modifies:resultats.filter(x=>x.modifie).length,resultats};
  }finally{lock.releaseLock();}
  if(out&&out.nombre_modifies&&typeof reconstruireSnapshotGlobalSyntheseBudgetSoft20260907==='function'){
    try{const s=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('normalisation_prochaines_echeances_credits');out.snapshot={ok:!!(s&&s.ok),revisionBudgetSoft:String(s&&s.revisionBudgetSoft||''),message:String(s&&s.message||'')};}catch(e){out.snapshot={ok:false,erreur:String(e&&e.message||e)};}
  }
  console.log('[APPLICATION PROCHAINES ECHEANCES CREDITS 20260916] '+JSON.stringify(out));return out;
}
