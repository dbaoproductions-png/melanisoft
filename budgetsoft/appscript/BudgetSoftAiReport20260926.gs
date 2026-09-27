const BUDGETSOFT_AI_REPORT_20260926_VERSION='2026-09-27.0';

function genererRapportIaBudgetSoft20260926(options){
  throw new Error('Rapport IA temporairement isolé pendant le diagnostic du chargement principal BudgetSoft.');
}

function auditerRapportIaBudgetSoft20260926(){
  const out={ok:false,version:BUDGETSOFT_AI_REPORT_20260926_VERSION,isole:true,message:'Rapport IA temporairement isolé pendant le diagnostic du chargement principal.'};
  console.log('[AUDIT RAPPORT IA BUDGETSOFT 20260926] '+JSON.stringify(out));
  return out;
}
