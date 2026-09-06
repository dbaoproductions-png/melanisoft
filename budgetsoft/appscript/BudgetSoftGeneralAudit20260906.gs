const BUDGETSOFT_GENERAL_AUDIT_VERSION='2026-09-06.1';

function auditerParametresGenerauxBudgetSoft20260906(){
  const controles={},avertissements=[],erreurs=[];
  function executer(cle,fn){
    try{const r=typeof fn==='function'?fn():null;controles[cle]=r;return r;}
    catch(e){const x={ok:false,erreur:String(e&&e.message||e)};controles[cle]=x;erreurs.push({controle:cle,erreur:x.erreur});return x;}
  }

  const dedup=executer('dedoublonnageBancaire',()=>auditerDedoublonnageBancaireCanoniqueBudgetSoft20260906());
  if(dedup&&Number(dedup.doublonsExclus||0)>0){
    avertissements.push({
      code:'DOUBLONS_BANCAIRES_NEUTRALISES',
      message:'Des doublons bancaires stricts sont présents dans Operations et neutralisés par la couche canonique.',
      nombre:Number(dedup.doublonsExclus||0),
      impactNet:Number(dedup.ecartNet||0)
    });
  }

  const partition=executer('partitionOperations',()=>auditerPartitionOperationsBudgetSoft20260906());
  if(partition&&Number(partition.indatees||0)>0){
    avertissements.push({code:'OPERATIONS_INDATEES',nombre:Number(partition.indatees||0)});
  }

  const comptes=executer('comptes',()=>auditerPerformanceComptesRapide20260828());
  if(comptes&&Array.isArray(comptes.avertissements)&&comptes.avertissements.length){
    comptes.avertissements.forEach(a=>avertissements.push(a));
  }

  const global=executer('snapshotGlobal',()=>auditerSnapshotGlobalBudgetSoft20260906());
  if(global&&global.ok===false){
    erreurs.push({controle:'snapshotGlobal',erreur:'Le snapshot global n’est pas cohérent ou disponible.'});
  }

  const oracle=executer('oracleBudgetSoft80',()=>auditerOracleBudgetSoft80_20260906());
  if(oracle&&oracle.applicable===true&&oracle.ok===false){
    erreurs.push({controle:'oracleBudgetSoft80',erreur:'Une ou plusieurs valeurs de recette divergent.',details:oracle.erreurs||[]});
  }

  const resultat={
    ok:erreurs.length===0,
    version:BUDGETSOFT_GENERAL_AUDIT_VERSION,
    genereLe:new Date().toISOString(),
    resume:{
      doublonsBancairesNeutralises:Number(dedup&&dedup.doublonsExclus||0),
      impactNetDoublons:Number(dedup&&dedup.ecartNet||0),
      operationsIndatees:Number(partition&&partition.indatees||0),
      sourceComptes:comptes&&comptes.source||'',
      revisionBudgetSoft:global&&global.revisionBudgetSoft||'',
      oracleApplicable:!!(oracle&&oracle.applicable),
      oracleOk:oracle&&oracle.applicable?oracle.ok:null
    },
    avertissements,
    erreurs,
    controles
  };
  console.log(JSON.stringify(resultat));
  return resultat;
}
