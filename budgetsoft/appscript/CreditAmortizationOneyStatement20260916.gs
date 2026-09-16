const ONEY_STATEMENT_20260916_VERSION='2026-09-16.1';

function estCreditOney20260916_(credit){
  const t=texteCreditAmort20260915_([credit&&credit.nom,credit&&credit.commentaire,credit&&credit.numero_pret].join(' '));
  return t.includes('ONEY')||t.includes('CARTE B');
}

function referenceReleveOney20260916_(credit){
  if(!estCreditOney20260916_(credit))return null;
  return{date:'2026-08-25',capital:2722.72,source:'releve_exact_ONEY_2026-08-25'};
}

function ventilationReleveOney20260916_(credit,operation){
  if(!estCreditOney20260916_(credit))return null;
  const d=dateOperationCredit20260915_(operation);if(!d)return null;
  const montant=Math.abs(Number(operation&&operation.montant||0));
  if(Math.abs(montant-117.29)>.02)return null;
  // Relevé arrêté au 25/08/2026 : prochain prélèvement le 07/09/2026.
  // Ventilation annoncée : capital 49,09 €, intérêts 48,80 €, assurance 19,40 €.
  const cible=new Date(2026,8,7,12),jour=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12),delta=Math.round((jour-cible)/86400000);
  // L'opération bancaire peut être datée en UTC la veille au soir dans BudgetSoft.
  if(delta<-1||delta>1)return null;
  return{partCapital:49.09,partInterets:48.80,partAssurance:19.40,capitalApresTheorique:2673.63,methode:'releve_exact_ONEY_'+ONEY_STATEMENT_20260916_VERSION};
}

function auditerReleveOneyExact20260916(){
  const credit=(typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[]).find(estCreditOney20260916_);
  if(!credit){const out={ok:false,version:ONEY_STATEMENT_20260916_VERSION,raison:'credit_oney_introuvable'};console.log('[AUDIT RELEVE ONEY EXACT 20260916] '+JSON.stringify(out));return out;}
  const ref=referenceReleveOney20260916_(credit),op={montant:-117.29,date_comptable:'2026-09-07'},vent=ventilationReleveOney20260916_(Object.assign({},credit,{capital_restant:ref.capital}),op);
  const out={ok:!!vent,version:ONEY_STATEMENT_20260916_VERSION,credit:{id:credit.id,nom:credit.nom,capital_actuel:Number(credit.capital_restant||0)},reference_2026_08_25:ref,test_echeance_2026_09_07:vent,attendu:{montant:117.29,partCapital:49.09,partInterets:48.80,partAssurance:19.40,capitalAvant:2722.72,capitalApres:2673.63}};
  console.log('[AUDIT RELEVE ONEY EXACT 20260916] '+JSON.stringify(out));return out;
}
