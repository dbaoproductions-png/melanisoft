const BUDGETSOFT_GENERAL_AUDIT_VERSION='2026-09-06.2';

function auditerParametresGenerauxBudgetSoft20260906(){
  const controles={},avertissements=[],erreurs=[];
  function executer(cle,fn){
    try{const r=typeof fn==='function'?fn():null;controles[cle]=r;return r;}
    catch(e){const x={ok:false,erreur:String(e&&e.message||e)};controles[cle]=x;erreurs.push({controle:cle,erreur:x.erreur});return x;}
  }

  const dedup=executer('dedoublonnageBancaire',()=>auditerDedoublonnageBancaireCanoniqueBudgetSoft20260906());
  if(dedup){
    if(String(dedup.primitive||'')!=='dedoublonnerOperationsCartesCanonique20260906V3_'){
      erreurs.push({controle:'dedoublonnageBancaire',erreur:'La primitive canonique V3 n’est pas active.',details:{primitive:dedup.primitive||'',version:dedup.version||''}});
    }
    if(Number(dedup.doublonsExclus||0)>0){
      avertissements.push({code:'DOUBLONS_BANCAIRES_NEUTRALISES',message:'Des ombres bancaires certaines sont neutralisées par la couche canonique.',nombre:Number(dedup.doublonsExclus||0),impactNet:Number(dedup.ecartNet||0)});
    }
  }

  const partition=executer('partitionOperations',()=>auditerPartitionOperationsBudgetSoft20260906());
  if(partition&&Number(partition.indatees||0)>0)avertissements.push({code:'OPERATIONS_INDATEES',nombre:Number(partition.indatees||0)});
  if(dedup&&partition&&Number(partition.doublonsBancairesExclus||0)!==Number(dedup.doublonsExclus||0)){
    erreurs.push({controle:'partitionOperations',erreur:'La partition et la déduplication n’utilisent pas le même univers canonique.',details:{dedup:dedup.doublonsExclus,partition:partition.doublonsBancairesExclus}});
  }

  const comptes=executer('comptes',()=>auditerPerformanceComptesRapide20260828());
  if(comptes&&Array.isArray(comptes.avertissements)&&comptes.avertissements.length)comptes.avertissements.forEach(a=>avertissements.push(a));
  if(dedup&&comptes&&Number(comptes.doublonsBancairesExclus||0)!==Number(dedup.doublonsExclus||0)){
    erreurs.push({controle:'comptes',erreur:'Comptes n’utilise pas la même déduplication bancaire que la couche canonique.',details:{dedup:dedup.doublonsExclus,comptes:comptes.doublonsBancairesExclus}});
  }

  const cible=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(new Date()):new Date();
  const tresorerie=executer('tresorerieCanonique',()=>chargerTresorerieComptableCanoniqueBudgetSoft20260906(cible));
  if(comptes&&tresorerie){
    const soldeComptes=Number(comptes.synthese&&comptes.synthese.disponible),soldeTres=Number(tresorerie.soldeReel),variation=Number(tresorerie.variationComptableCertaine),prev=Number(tresorerie.soldePrevisionnel);
    if(Number.isFinite(soldeComptes)&&Number.isFinite(soldeTres)&&Math.abs(soldeComptes-soldeTres)>.01)erreurs.push({controle:'tresorerieCanonique',erreur:'Le solde réel de Trésorerie diverge de Comptes.',details:{comptes:soldeComptes,tresorerie:soldeTres}});
    if(Number.isFinite(soldeTres)&&Number.isFinite(variation)&&Number.isFinite(prev)&&Math.abs((soldeTres+variation)-prev)>.01)erreurs.push({controle:'tresorerieCanonique',erreur:'La formule solde réel + variation future = solde prévisionnel est rompue.',details:{soldeReel:soldeTres,variation,soldePrevisionnel:prev}});
  }

  const global=executer('snapshotGlobal',()=>auditerSnapshotGlobalBudgetSoft20260906());
  if(global&&global.disponible===false)avertissements.push({code:'SNAPSHOT_GLOBAL_ABSENT',message:'Le snapshot global n’est pas encore initialisé ; les contrôles canoniques restent valides mais l’ouverture sans recalcul n’est pas active.'});
  else if(global&&global.ok===false)erreurs.push({controle:'snapshotGlobal',erreur:'Le snapshot global publié n’est pas cohérent.'});

  const oracle=executer('oracleBudgetSoft80',()=>auditerOracleBudgetSoft80_20260906());
  if(oracle&&oracle.applicable===true&&oracle.ok===false)erreurs.push({controle:'oracleBudgetSoft80',erreur:'Une ou plusieurs valeurs de recette divergent.',details:oracle.erreurs||[]});

  const resultat={ok:erreurs.length===0,version:BUDGETSOFT_GENERAL_AUDIT_VERSION,genereLe:new Date().toISOString(),resume:{primitiveDedup:dedup&&dedup.primitive||'',versionDedup:dedup&&dedup.version||'',doublonsBancairesNeutralises:Number(dedup&&dedup.doublonsExclus||0),impactNetDoublons:Number(dedup&&dedup.ecartNet||0),operationsBrutes:Number(partition&&partition.sourceBrute||0),operationsCanoniques:Number(partition&&partition.sourceCanonique||0),operationsIndatees:Number(partition&&partition.indatees||0),soldeReel:Number(comptes&&comptes.synthese&&comptes.synthese.disponible),soldePrevisionnelFinCycle:Number(tresorerie&&tresorerie.soldePrevisionnel),sourceComptes:comptes&&comptes.source||'',revisionBudgetSoft:global&&global.revisionBudgetSoft||'',snapshotGlobalDisponible:!!(global&&global.disponible),oracleApplicable:!!(oracle&&oracle.applicable),oracleOk:oracle&&oracle.applicable?oracle.ok:null},avertissements,erreurs,controles};
  console.log(JSON.stringify(resultat));return resultat;
}
