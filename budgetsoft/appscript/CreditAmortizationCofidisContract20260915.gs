const COFIDIS_CONTRACT_20260915_VERSION='2026-09-15.1';
const COFIDIS_CONTRACT_ACCOUNT_20260915='28924002171500';
const COFIDIS_CONTRACT_TNA_20260915=0.046;
const COFIDIS_CONTRACT_ASSURANCE_20260915=21.00;
const COFIDIS_CONTRACT_ECHEANCE_HORS_ASSURANCE_20260915=186.89;
const COFIDIS_CONTRACT_ECHEANCE_AVEC_ASSURANCE_20260915=207.89;

function estCreditCofidisPersonnel20260915_(credit){
  const t=texteCreditAmort20260915_([credit&&credit.nom,credit&&credit.commentaire,credit&&credit.numero_pret].join(' '));
  return t.includes('COFIDIS')&&!t.includes('ACCESSIO');
}

function ventilationContratCofidis20260915_(credit,operation){
  if(!estCreditCofidisPersonnel20260915_(credit))return null;
  const montant=Math.abs(Number(operation&&operation.montant||0));
  if(Math.abs(montant-COFIDIS_CONTRACT_ECHEANCE_AVEC_ASSURANCE_20260915)>.02)return null;
  const capital=Math.max(0,Number(credit&&credit.capital_restant||0));
  if(capital<=0)return null;
  const interets=arrCreditAmort20260915_(capital*(COFIDIS_CONTRACT_TNA_20260915/12));
  const assurance=COFIDIS_CONTRACT_ASSURANCE_20260915;
  const partCapital=Math.min(capital,arrCreditAmort20260915_(montant-assurance-interets));
  if(partCapital<=0)return null;
  return{
    partCapital,
    partInterets:interets,
    partAssurance:assurance,
    capitalApresTheorique:arrCreditAmort20260915_(capital-partCapital),
    methode:'contrat_COFIDIS_TNA_assurance_'+COFIDIS_CONTRACT_20260915_VERSION
  };
}

function auditerMoteurCofidisContrat20260915(){
  const credit=(typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[]).find(estCreditCofidisPersonnel20260915_);
  if(!credit){const out={ok:false,version:COFIDIS_CONTRACT_20260915_VERSION,raison:'credit_cofidis_introuvable'};console.log('[AUDIT MOTEUR COFIDIS CONTRAT 20260915] '+JSON.stringify(out));return out;}
  const op={montant:-COFIDIS_CONTRACT_ECHEANCE_AVEC_ASSURANCE_20260915,date_comptable:'2026-09-01'};
  const calc=calculerAmortissementCredit20260915_(credit,op);
  const attenduInterets=arrCreditAmort20260915_(Number(credit.capital_restant||0)*(COFIDIS_CONTRACT_TNA_20260915/12));
  const attenduCapital=arrCreditAmort20260915_(COFIDIS_CONTRACT_ECHEANCE_AVEC_ASSURANCE_20260915-COFIDIS_CONTRACT_ASSURANCE_20260915-attenduInterets);
  const attenduApres=arrCreditAmort20260915_(Number(credit.capital_restant||0)-attenduCapital);
  const out={ok:calc&&String(calc.methode||'').indexOf('contrat_COFIDIS_TNA_assurance_')===0,version_moteur:typeof CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION!=='undefined'?CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION:'',version_contrat:COFIDIS_CONTRACT_20260915_VERSION,credit:{id:credit.id,nom:credit.nom,capital_actuel:Number(credit.capital_restant||0)},test_2026_09_01:calc,attendu:{montant:COFIDIS_CONTRACT_ECHEANCE_AVEC_ASSURANCE_20260915,partCapital:attenduCapital,partInterets:attenduInterets,partAssurance:COFIDIS_CONTRACT_ASSURANCE_20260915,capitalApres:attenduApres}};
  console.log('[AUDIT MOTEUR COFIDIS CONTRAT 20260915] '+JSON.stringify(out));return out;
}
