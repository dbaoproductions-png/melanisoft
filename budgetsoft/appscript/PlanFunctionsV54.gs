const PLAN_FUNCTIONS_V54_VERSION='5.4.1';

function gainEquivalentPlanV54_(a,montant){
  const f=String(a.fonction_plan||'').toUpperCase();
  if(!['REDUIRE','SUPPRIMER','REMPLACER','RECEVOIR'].includes(f))return {mensuel:0,annuel:0,neutre:true};
  const m=Math.max(0,Number(montant==null?(a.cible_valeur||a.impact_montant||0):montant));
  const freq=String(a.impact_frequence||'ponctuel').toLowerCase();
  if(freq==='mensuel')return {mensuel:arrondirPlanV5_(m),annuel:arrondirPlanV5_(m*12),neutre:false};
  if(freq==='annuel')return {mensuel:arrondirPlanV5_(m/12),annuel:arrondirPlanV5_(m),neutre:false};
  return {mensuel:0,annuel:arrondirPlanV5_(m),neutre:false};
}

function chargerPlanStructureV54(){
  const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
  const objectifs=lireTablePlanCerbere_('Plan_Objectifs');
  const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
  const categories=listerCategoriesPlanV4();
  let em=0,ea=0;
  actions.forEach(a=>{if(['Abandonnée','Annulée'].includes(String(a.statut||'')))return;const g=gainEquivalentPlanV54_(a);em+=g.mensuel;ea+=g.annuel;});
  const groupes=objectifs.map(o=>({objectif:o,actions:actions.filter(a=>String(a.objectif_id||'')===String(o.id))}));
  return serialiserCerberePourClient_({version:PLAN_FUNCTIONS_V54_VERSION,actions,objectifs,evenements,categories,groupes,sansObjectif:actions.filter(a=>!a.objectif_id),gains_attendus:{mensuel:arrondirPlanV5_(em),annuel:arrondirPlanV5_(ea)}});
}

function chargerMesuresPlanV54(){
  const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
  const mesures=evaluerToutesActionsPlanV5();
  const mm=Object.fromEntries((mesures||[]).map(x=>[String(x.id),x.mesure||{}]));
  let em=0,ea=0;
  actions.forEach(a=>{
    const m=mm[String(a.id)]||{};
    let effectif=0;
    const f=String(a.fonction_plan||'').toUpperCase();
    if(['REDUIRE','REMPLACER'].includes(f))effectif=Math.max(0,Number(m.realise||0));
    else if(f==='SUPPRIMER'&&Number(m.progression||0)>=100)effectif=Math.max(0,Number(a.cible_valeur||a.impact_montant||0));
    else if(f==='RECEVOIR'){
      const freq=String(a.impact_frequence||'ponctuel').toLowerCase();
      const reel=Math.max(0,Number(m.realise||0));
      if(freq==='mensuel'||freq==='annuel')effectif=reel>0?Math.min(reel,Math.max(0,Number(a.cible_valeur||a.impact_montant||0))||reel):0;
      else effectif=reel;
    }
    const g=gainEquivalentPlanV54_(a,effectif);em+=g.mensuel;ea+=g.annuel;
  });
  return serialiserCerberePourClient_({version:PLAN_FUNCTIONS_V54_VERSION,mesures:mm,gains_effectifs:{mensuel:arrondirPlanV5_(em),annuel:arrondirPlanV5_(ea)}});
}

function normaliserStatutPlanV54_(s){
  s=String(s||'Prévue');
  if(['Effective','Abandonnée','En cours','Prévue'].includes(s))return s;
  if(['Réalisée','Réalisé','Realisee','Realise'].includes(s))return 'Effective';
  if(s==='Abandonnée'||s==='Annulée')return 'Abandonnée';
  if(s==='En cours')return 'En cours';
  return 'Prévue';
}

function enregistrerActionPlanV54(d){
  assurerPlanFunctionsV5_();
  d=Object.assign({},d||{});
  const f=String(d.fonction_plan||'').toUpperCase();
  if(!PLAN_FUNCTIONS_V5[f])throw new Error('Fonction de mesure inconnue.');
  d.libelle=String(d.libelle||'').trim();if(!d.libelle)throw new Error('Le libellé de l’action est obligatoire.');
  d.statut=normaliserStatutPlanV54_(d.statut);
  d.fonction_plan=f;
  d.cible_valeur=Math.max(0,Number(d.cible_valeur||0));
  d.impact_montant=d.cible_valeur;
  d.impact_frequence=['mensuel','annuel','ponctuel'].includes(String(d.impact_frequence||'').toLowerCase())?String(d.impact_frequence).toLowerCase():'ponctuel';
  d.enquete_auto=d.enquete_auto!==false&&String(d.enquete_auto)!=='false';
  d.reevaluer_charges_fixes=d.reevaluer_charges_fixes===true||String(d.reevaluer_charges_fixes)==='true';
  d.impact_confirme=d.impact_confirme===true||String(d.impact_confirme)==='true';
  d.condition_libelle=String(d.condition_libelle||'').trim();
  if(d.condition_libelle&&String(d.condition_statut||'')!=='Remplie')d.impact_confirme=false;
  d.nature_action=String(f).toLowerCase();
  if(['REDUIRE','SUPPRIMER','REMPLACER'].includes(f))d.impact_type='baisse_charge';
  else if(f==='RECEVOIR')d.impact_type='hausse_revenu';
  else d.impact_type='aucun';
  const old=lireFeuilleDynamiquePlan_('Plan_Actions').find(x=>String(x.id)===String(d.id||''))||{};
  if(!d.valeur_depart){
    if(old.valeur_depart)d.valeur_depart=old.valeur_depart;
    else if(d.source_type==='charge_fixe'&&d.source_id){const cf=lireTable_('Charges_fixes').find(x=>String(x.id)===String(d.source_id));if(cf)d.valeur_depart=Math.abs(Number(cf.montant||0));}
    else if(f==='REMBOURSER'&&(d.source_type==='credit'||d.source_type==='dette'))d.valeur_depart=capitalSourcePlanV4_(d.source_type,d.source_id);
  }
  d.dernier_recalcul=new Date().toISOString();
  upsertDynamiquePlanV4_('Plan_Actions',d);
  if(d.impact_confirme&&d.reevaluer_charges_fixes&&d.source_type==='charge_fixe'&&f==='SUPPRIMER'&&d.statut==='Effective'){
    try{cloturerChargeFixeDepuisActionV3(d.id,d.date_effet);}catch(e){}
  }
  try{recalculerPlanBudgetSoft_('action_v54');}catch(e){}
  return {ok:true,id:d.id,libelle:d.libelle};
}

function enregistrerEvenementPlanV54(d){
  assurerPlanActionsV4_();d=Object.assign({},d||{});
  d.libelle=String(d.libelle||'').trim();if(!d.libelle)throw new Error('Le libellé de l’événement est obligatoire.');
  d.montant=Math.abs(Number(d.montant||0));if(!d.montant)throw new Error('Le montant doit être supérieur à zéro.');
  d.categorie=String(d.categorie||'').trim();d.statut=String(d.statut||'Prévu');d.certitude=String(d.certitude||'certaine');
  normaliserFractionPlanV46_(d);d.recurrence=d.fractionne?d.periodicite_fractionnement:'ponctuel';d.dernier_recalcul=new Date().toISOString();
  upsertDynamiquePlanV4_('Plan_Evenements',d);try{recalculerPlanBudgetSoft_('evenement_v54');}catch(e){}
  return {ok:true,id:d.id,libelle:d.libelle};
}

function rechercherOperationsEvenementV54(d){
  d=d||{};const type=String(d.type||'depense').toLowerCase(),montant=Math.abs(Number(d.montant||0)),date=d.date_effet?new Date(d.date_effet):null,cat=String(d.categorie||'');
  let ops=lireTable_('Operations').filter(o=>type==='recette'?Number(o.montant||0)>0:Number(o.montant||0)<0);
  ops=ops.map(o=>{const om=Math.abs(Number(o.montant||0)),od=new Date(o.date_comptable||o.date||o.date_operation||0),jours=date&&!isNaN(date)&&!isNaN(od)?Math.abs(od-date)/86400000:99,score=Math.abs(om-montant)+(jours*2)+(cat&&String(o.categorie||'')!==cat?50:0);return {id:o.id||'',libelle:o.libelle||o.libelle_bancaire||'',montant:om,date:o.date_comptable||o.date||o.date_operation||'',categorie:o.categorie||'',score};}).sort((a,b)=>a.score-b.score).slice(0,12);
  return serialiserCerberePourClient_(ops);
}

function supprimerElementPlanV54(type,id){
  if(type==='action')supprimerActionPlanV3(id);else supprimerElementPlan(type,id);
  try{recalculerPlanBudgetSoft_('suppression_v54_'+type);}catch(e){}
  return {ok:true};
}
