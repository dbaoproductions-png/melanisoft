const CARREFOUR_PASS_STATEMENT_20260915_VERSION='2026-09-15.1';
const CARREFOUR_PASS_REFERENCE_20260915='50209416123100';

function estCreditCarrefourPass20260915_(credit){
  const t=texteCreditAmort20260915_([credit&&credit.nom,credit&&credit.commentaire,credit&&credit.numero_pret].join(' '));
  return t.includes('CARREFOUR PASS')||t.includes('CARREFOUR');
}

function ventilationReleveCarrefourPass20260915_(credit,operation){
  if(!estCreditCarrefourPass20260915_(credit))return null;
  const d=dateOperationCredit20260915_(operation);if(!d)return null;
  const montant=Math.abs(Number(operation&&operation.montant||0));if(Math.abs(montant-168)>.02)return null;
  // Le relevé 21/07/2026–20/08/2026 documente la prochaine échéance du 05/09/2026.
  // Le prélèvement bancaire a été comptabilisé le 07/09/2026 (week-end) : on accepte J à J+2.
  const cible=new Date(2026,8,5,12),delta=Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate(),12)-cible)/86400000);
  if(delta<0||delta>2)return null;
  return{partCapital:58.44,partInterets:71.45,partAssurance:38.11,capitalApresTheorique:5825.54,methode:'releve_exact_CARREFOUR_PASS_'+CARREFOUR_PASS_STATEMENT_20260915_VERSION};
}

function referenceReleveCarrefourPass20260915_(credit){
  if(!estCreditCarrefourPass20260915_(credit))return null;
  return{date:'2026-08-20',capital:5883.98,source:'releve_exact_CARREFOUR_PASS'};
}

function auditerMoteurCarrefourPassExact20260915(){
  const credit=(typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[]).find(estCreditCarrefourPass20260915_);
  if(!credit){const out={ok:false,version:CARREFOUR_PASS_STATEMENT_20260915_VERSION,raison:'credit_carrefour_introuvable'};console.log('[AUDIT MOTEUR CARREFOUR PASS EXACT 20260915] '+JSON.stringify(out));return out;}
  const op={montant:-168,date_comptable:'2026-09-07'};
  const calc=calculerAmortissementCredit20260915_(Object.assign({},credit,{capital_restant:5883.98}),op);
  const out={ok:calc&&String(calc.methode||'').indexOf('releve_exact_CARREFOUR_PASS_')===0,version_moteur:typeof CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION!=='undefined'?CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION:'',version_releve:CARREFOUR_PASS_STATEMENT_20260915_VERSION,credit:{id:credit.id,nom:credit.nom,capital_actuel:Number(credit.capital_restant||0)},reference_2026_08_20:{capital:5883.98},test_echeance_2026_09_05_comptabilisee_2026_09_07:calc,attendu:{montant:168,partCapital:58.44,partInterets:71.45,partAssurance:38.11,capitalAvant:5883.98,capitalApres:5825.54}};
  console.log('[AUDIT MOTEUR CARREFOUR PASS EXACT 20260915] '+JSON.stringify(out));return out;
}
