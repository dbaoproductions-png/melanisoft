function auditerCorrespondanceCreditsChargesFixes20260915(){
  verifierInitialisation_();
  const charges=lireTable_('Charges_fixes'),credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[];
  const lignes=charges.filter(c=>/credit|casden|creatis|cofidis|accessio|oney|floa|cdiscount|carrefour/i.test([c.nature,c.categorie,c.libelle,c.libelle_bancaire].join(' '))).map(charge=>{
    const l=trouverCreditPourChargeFixe20260915_(charge,credits);
    if(!l.ok)return{charge:String(charge.libelle||''),charge_fixe_id:String(charge.id||''),ok:false,raison:l.raison,candidats:l.candidats||[]};
    const fauxOp={montant:-Math.abs(Number(charge.montant||l.credit.mensualite||0))};
    const calc=calculerAmortissementCredit20260915_(l.credit,fauxOp);
    return{charge:String(charge.libelle||''),charge_fixe_id:String(charge.id||''),ok:true,credit:String(l.credit.nom||''),credit_id:String(l.credit.id||''),score:l.score,montantReference:calc.montant,partCapitalEstimee:calc.partCapital,partInteretsEstimee:calc.partInterets,partAssurance:calc.partAssurance,capitalActuel:calc.capitalAvant,capitalApresProchaineEcheance:calc.capitalApres,methode:calc.methode};
  });
  const out={ok:lignes.every(x=>x.ok),version:typeof CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION!=='undefined'?CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION:'',nombre:lignes.length,lignes};
  console.log('[AUDIT CORRESPONDANCE CREDITS CHARGES FIXES 20260915] '+JSON.stringify(out));return out;
}
