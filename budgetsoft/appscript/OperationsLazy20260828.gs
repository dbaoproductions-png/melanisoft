const OPERATIONS_LAZY_20260828_VERSION='2026-09-17.1';

function chargerOperationsLeger20260828(){
  const t0=Date.now();
  const data=typeof lireOperationsLeger20260828_==='function'
    ?lireOperationsLeger20260828_()
    :{Operations:lireTable_('Operations'),Operations_futures:[],Operations_indatees:[],Comptes:lireTable_('Comptes'),Categories:lireTable_('Categories')};
  const t1=Date.now();

  // Lecture stricte : ouvrir l'écran Opérations ne doit écrire ni snapshot ni donnée métier.
  // Le cache global est reconstruit par ses propres workflows, jamais par une simple lecture UI.
  const realisees=Array.isArray(data.Operations)?data.Operations:[];
  const futures=Array.isArray(data.Operations_futures)?data.Operations_futures:[];
  const indatées=Array.isArray(data.Operations_indatees)?data.Operations_indatees:[];
  const toutes=realisees.concat(futures,indatées);

  return {
    ok:true,
    meta:Object.assign({version:OPERATIONS_LAZY_20260828_VERSION,source:'operations-light-canonique',lectureSeule:true},data.meta||{}),
    // Contrat UI stabilisé : l'onglet Opérations affiche Réel + Prévisionnel.
    // Les sous-ensembles restent exposés séparément pour les cartes qui doivent distinguer les deux.
    Operations:toutes,
    Operations_reelles:realisees,
    Operations_futures:futures,
    Operations_indatees:indatées,
    Comptes:data.Comptes||[],
    Categories:data.Categories||[],
    Charges_fixes:[],
    _performance:{
      totalMs:Date.now()-t0,
      lectureMs:t1-t0,
      snapshotMs:0,
      lectureSeule:true,
      operations:realisees.length,
      futures:futures.length,
      indatées:indatées.length,
      affichees:toutes.length,
      snapshotOk:null
    }
  };
}
