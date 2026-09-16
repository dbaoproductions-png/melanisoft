const FLOA_STATEMENT_20260916_VERSION='2026-09-16.1';
const FLOA_CREDIT_NUMBER_20260916='42192773271100';

function estCreditFloa20260916_(credit){
  const t=texteCreditAmort20260915_([credit&&credit.nom,credit&&credit.commentaire,credit&&credit.numero_pret].join(' '));
  return t.includes('FLOA')||t.includes('CDISCOUNT');
}

function referenceReleveFloa20260916_(credit){
  if(!estCreditFloa20260916_(credit))return null;
  return{date:'2026-08-24',capital:2974.05,source:'releve_exact_FLOA_2026-08-24'};
}

function ventilationReleveFloa20260916_(credit,operation){
  if(!estCreditFloa20260916_(credit))return null;
  const d=dateOperationCredit20260915_(operation);if(!d)return null;
  const montant=Math.abs(Number(operation&&operation.montant||0));
  if(Math.abs(montant-114.25)>.02)return null;
  // Relevé août 2026 : prochaine mensualité au 05/09/2026.
  // Mensualité crédit 113,00 €, dont 52,59 € d'intérêts et 0 € d'assurance.
  // Le prélèvement de 114,25 € inclut la cotisation carte de 1,25 €.
  const cible=new Date(2026,8,5,12),jour=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12),delta=Math.round((jour-cible)/86400000);
  if(delta<0||delta>2)return null;
  const partInterets=52.59,partAssurance=0,partFrais=1.25,partCapital=60.41;
  return{partCapital,partInterets,partAssurance,partFrais,capitalApresTheorique:2913.64,methode:'releve_exact_FLOA_'+FLOA_STATEMENT_20260916_VERSION};
}

function auditerReleveFloaExact20260916(){
  const credit=(typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[]).find(estCreditFloa20260916_);
  if(!credit){const out={ok:false,version:FLOA_STATEMENT_20260916_VERSION,raison:'credit_floa_introuvable'};console.log('[AUDIT RELEVE FLOA EXACT 20260916] '+JSON.stringify(out));return out;}
  const ref=referenceReleveFloa20260916_(credit),op={montant:-114.25,date_comptable:'2026-09-07'},vent=ventilationReleveFloa20260916_(Object.assign({},credit,{capital_restant:ref.capital}),op);
  const out={ok:!!vent,version:FLOA_STATEMENT_20260916_VERSION,credit:{id:credit.id,nom:credit.nom,capital_actuel:Number(credit.capital_restant||0)},reference_2026_08_24:ref,test_echeance_2026_09_05_comptabilisee_2026_09_07:vent,attendu:{montant:114.25,mensualite_credit:113,partCapital:60.41,partInterets:52.59,partAssurance:0,partFrais:1.25,capitalAvant:2974.05,capitalApres:2913.64}};
  console.log('[AUDIT RELEVE FLOA EXACT 20260916] '+JSON.stringify(out));return out;
}
