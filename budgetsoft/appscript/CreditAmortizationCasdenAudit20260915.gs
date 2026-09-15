function auditerMoteurCasdenExact20260915(){
  verifierInitialisation_();
  const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[];
  const credit=credits.find(c=>typeof estCreditCasdenEcheancier20260915_==='function'&&estCreditCasdenEcheancier20260915_(c));
  if(!credit){const absent={ok:false,raison:'credit_CASDEN_introuvable'};console.log('[AUDIT MOTEUR CASDEN EXACT 20260915] '+JSON.stringify(absent));return absent;}
  const opReprise={montant:-576.33,date_comptable:new Date(2026,10,4,12)};
  const calc=calculerAmortissementCredit20260915_(Object.assign({},credit,{capital_restant:40562.30}),opReprise);
  const out={
    ok:calc.methode&&String(calc.methode).indexOf('echeancier_exact_CASDEN_')===0,
    version_moteur:typeof CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION!=='undefined'?CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION:'',
    version_echeancier:typeof CASDEN_SCHEDULE_20260915_VERSION!=='undefined'?CASDEN_SCHEDULE_20260915_VERSION:'',
    credit:{id:credit.id,nom:credit.nom,numero_pret:credit.numero_pret||'',capital_actuel:Number(credit.capital_restant||0)},
    test_reprise_2026_11_04:calc,
    attendu:{montant:576.33,partCapital:480.97,partInterets:95.36,partAssurance:0,capitalAvant:40562.30,capitalApres:40081.33}
  };
  console.log('[AUDIT MOTEUR CASDEN EXACT 20260915] '+JSON.stringify(out));return out;
}
