function auditerCorrespondanceCreditsChargesFixes20260915(){
  verifierInitialisation_();
  const charges=lireTable_('Charges_fixes'),credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[];
  const lignes=charges.filter(c=>/credit|casden|creatis|cofidis|accessio|oney|floa|cdiscount|carrefour/i.test([c.nature,c.categorie,c.libelle,c.libelle_bancaire].join(' '))).map(charge=>{
    const l=trouverCreditPourChargeFixe20260915_(charge,credits);
    if(!l.ok)return{charge:String(charge.libelle||''),charge_fixe_id:String(charge.id||''),ok:false,raison:l.raison,candidats:l.candidats||[]};
    const fauxOp={montant:-Math.abs(Number(charge.montant||l.credit.mensualite||0))};
    const calc=calculerAmortissementCredit20260915_(l.credit,fauxOp);
    const explicite=typeof ventilationExpliciteCredit20260915_==='function'?ventilationExpliciteCredit20260915_(l.credit,Math.abs(fauxOp.montant)):null;
    return{
      charge:String(charge.libelle||''),charge_fixe_id:String(charge.id||''),ok:true,credit:String(l.credit.nom||''),credit_id:String(l.credit.id||''),score:l.score,
      montantReference:calc.montant,partCapitalEstimee:calc.partCapital,partInteretsEstimee:calc.partInterets,partAssurance:calc.partAssurance,capitalActuel:calc.capitalAvant,capitalApresProchaineEcheance:calc.capitalApres,methode:calc.methode,
      ventilationExpliciteTrouvee:!!explicite,
      sourcesVentilation:{
        part_capital:l.credit.part_capital??'',part_interets:l.credit.part_interets??'',part_assurance:l.credit.part_assurance??'',
        capital_echeance:l.credit.capital_echeance??'',interets_echeance:l.credit.interets_echeance??'',assurance_echeance:l.credit.assurance_echeance??'',
        assurance_mensuelle:l.credit.assurance_mensuelle??'',commentaire:String(l.credit.commentaire||''),cout_restant_precision:String(l.credit.cout_restant_precision||'')
      }
    };
  });
  const out={ok:lignes.every(x=>x.ok),version:typeof CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION!=='undefined'?CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION:'',nombre:lignes.length,lignes};
  console.log('[AUDIT CORRESPONDANCE CREDITS CHARGES FIXES 20260915] '+JSON.stringify(out));return out;
}
