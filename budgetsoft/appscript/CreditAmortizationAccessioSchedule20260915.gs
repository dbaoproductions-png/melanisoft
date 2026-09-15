const ACCESSIO_SCHEDULE_20260915_VERSION='2026-09-15.1';
const ACCESSIO_CONTRACT_20260915='28904002280598';

function estCreditAccessio20260915_(credit){
  const nom=texteCreditAmort20260915_([credit&&credit.nom,credit&&credit.commentaire,credit&&credit.numero_pret].join(' '));
  return nom.includes('ACCESSIO')||nom.includes('28904002280598');
}

function ventilationEcheancierAccessio20260915_(credit,operation){
  if(!estCreditAccessio20260915_(credit))return null;
  const d=dateOperationCredit20260915_(operation);if(!d)return null;
  const cle=Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
  if(cle!=='2026-09-05')return null;
  const montant=Math.abs(Number(operation&&operation.montant||0));
  if(Math.abs(montant-33.60)>.02)return null;
  return{partCapital:23.47,partInterets:10.13,partAssurance:0,capitalApresTheorique:776.53,methode:'releve_exact_ACCESSIO_'+ACCESSIO_SCHEDULE_20260915_VERSION};
}

function auditerMoteurAccessioExact20260915(){
  const credit=(typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[]).find(estCreditAccessio20260915_);
  if(!credit){const out={ok:false,version:ACCESSIO_SCHEDULE_20260915_VERSION,raison:'credit_accessio_introuvable'};console.log('[AUDIT MOTEUR ACCESSIO EXACT 20260915] '+JSON.stringify(out));return out;}
  const op={montant:-33.60,date_comptable:'2026-09-05'};
  const calc=calculerAmortissementCredit20260915_(credit,op);
  const out={ok:calc&&calc.methode&&String(calc.methode).indexOf('releve_exact_ACCESSIO_')===0,version_moteur:typeof CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION!=='undefined'?CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION:'',version_releve:ACCESSIO_SCHEDULE_20260915_VERSION,credit:{id:credit.id,nom:credit.nom,capital_actuel:Number(credit.capital_restant||0)},test_2026_09_05:calc,attendu:{montant:33.60,partCapital:23.47,partInterets:10.13,partAssurance:0,capitalAvant:800,capitalApres:776.53}};
  console.log('[AUDIT MOTEUR ACCESSIO EXACT 20260915] '+JSON.stringify(out));return out;
}
