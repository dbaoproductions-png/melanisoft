const PLAN_STRUCTURAL_ACTIONS_20260914_VERSION='2026-09-14.1';

/**
 * Doctrine Plan — actions structurelles.
 *
 * Une action structurelle ne représente pas elle-même un flux bancaire à rapprocher.
 * Exemple : résilier un abonnement. La réalisation est l'acte de résiliation ; son
 * effet financier durable appartient ensuite au référentiel canonique concerné
 * (Charges_fixes pour un abonnement), afin d'éviter tout double comptage dans Pn.
 *
 * Les événements/dépenses prévus restent, eux, soumis à la preuve bancaire et au
 * rapprochement lorsqu'ils représentent un flux réel attendu.
 */
function statutActionStructurelleRealisee20260914_(v){
  const s=String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return ['effective','effectif','realisee','realise'].includes(s);
}

/**
 * Surcharge ciblée de l'évaluation SUPPRIMER de PlanFunctionsV5.
 * Une suppression explicitement réalisée est acquise immédiatement : on n'attend
 * pas 28 jours ni un débit bancaire qui, précisément, ne doit plus survenir.
 * L'absence de débit reste seulement un indice de contrôle pour une action qui n'a
 * pas encore été déclarée réalisée.
 */
function evaluerSuppressionPlanV5_(a,cible){
  if(a.source_type!=='charge_fixe')return {statut:'Charge fixe requise'};

  if(statutActionStructurelleRealisee20260914_(a.statut)){
    return {
      realise:cible,
      attendu_a_date:cible,
      progression:100,
      statut:'Réalisée',
      confiance:'certaine',
      preuves:[{
        type:'realisation_structurelle',
        date:a.date_realisation||a.date_effet||'',
        source_type:'charge_fixe',
        source_id:a.source_id||'',
        doctrine:'clôture par réalisation ; aucun rapprochement bancaire requis'
      }]
    };
  }

  const ops=operationsDansFenetrePlanV5_(a).filter(o=>String(o.charge_fixe_id||'')===String(a.source_id));
  const debut=dateDebutActionPlanV5_(a),jours=debut?Math.floor((new Date()-debut)/86400000):0;
  if(ops.length)return {realise:0,attendu_a_date:cible,statut:'Toujours débitée',confiance:'certaine',preuves:ops.slice(-5).map(preuveOperationPlanV5_)};
  if(jours<28)return {realise:0,attendu_a_date:cible,statut:'À vérifier après un cycle',confiance:'à_valider',preuves:[]};
  return {realise:cible,attendu_a_date:cible,progression:100,statut:'Suppression probable',confiance:'probable',preuves:[{type:'absence_debit',depuis:a.date_effet||'',jours:jours}]};
}

/** Contrôle de cohérence sans mutation des données. */
function auditerActionsStructurellesPlan20260914(){
  const actions=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Actions'):[];
  const charges=typeof lireTable_==='function'?lireTable_('Charges_fixes'):[];
  const parId={};(charges||[]).forEach(c=>{const id=String(c&&c.id||'');if(id)parId[id]=c;});
  const lignes=(actions||[]).filter(a=>String(a&&a.fonction_plan||'').toUpperCase()==='SUPPRIMER'&&String(a&&a.source_type||'')==='charge_fixe').map(a=>{
    const c=parId[String(a.source_id||'')]||{},realisee=statutActionStructurelleRealisee20260914_(a.statut),impactConfirme=a.impact_confirme===true||String(a.impact_confirme)==='true',reeval=a.reevaluer_charges_fixes===true||String(a.reevaluer_charges_fixes)==='true',dateFin=c.date_fin||c.fin||'';
    return {id:a.id||'',libelle:a.libelle||'',statut:a.statut||'',source_id:a.source_id||'',impact_montant:Number(a.impact_montant||0),realisee:realisee,impact_confirme:impactConfirme,reevaluer_charges_fixes:reeval,date_fin_charge_fixe:dateFin,conforme:!realisee||!!dateFin};
  });
  return {ok:lignes.every(x=>x.conforme),version:PLAN_STRUCTURAL_ACTIONS_20260914_VERSION,lignes:lignes,doctrine:'Une action SUPPRIMER réalisée se clôt par réalisation. Son effet durable doit être porté par Charges_fixes ; aucun rapprochement bancaire de l’action n’est requis.'};
}
