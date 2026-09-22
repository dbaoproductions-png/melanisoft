const PLAN_FUNCTIONS_V54_VERSION='5.4.6';
const PLAN_V54_CACHE_TTL=45;

function cachePlanV54_(){return CacheService.getScriptCache();}
function lireCachePlanV54_(key){try{const v=cachePlanV54_().get(key);return v?JSON.parse(v):null;}catch(e){return null;}}
function ecrireCachePlanV54_(key,val){try{cachePlanV54_().put(key,JSON.stringify(val),PLAN_V54_CACHE_TTL);}catch(e){}return val;}
function invaliderCachePlanV54_(){try{cachePlanV54_().removeAll(['plan_v54_structure','plan_v54_mesures']);}catch(e){}}

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
  const cached=lireCachePlanV54_('plan_v54_structure');
  if(cached){cached.performance=Object.assign({},cached.performance||{},{cache:true});return cached;}
  const t0=Date.now();
  const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
  const objectifs=lireTablePlanCerbere_('Plan_Objectifs');
  const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
  const categories=listerCategoriesPlanV4();
  let em=0,ea=0;
  actions.forEach(a=>{if(['Abandonnée','Annulée'].includes(String(a.statut||'')))return;const g=gainEquivalentPlanV54_(a);em+=g.mensuel;ea+=g.annuel;});
  const groupes=objectifs.map(o=>({objectif:o,actions:actions.filter(a=>String(a.objectif_id||'')===String(o.id))}));
  return ecrireCachePlanV54_('plan_v54_structure',serialiserCerberePourClient_({version:PLAN_FUNCTIONS_V54_VERSION,actions,objectifs,evenements,categories,groupes,sansObjectif:actions.filter(a=>!a.objectif_id),gains_attendus:{mensuel:arrondirPlanV5_(em),annuel:arrondirPlanV5_(ea)},performance:{duree_ms:Date.now()-t0,cache:false}}));
}

function chargerMesuresPlanV54(){
  const cached=lireCachePlanV54_('plan_v54_mesures');
  if(cached){cached.performance=Object.assign({},cached.performance||{},{cache:true});return cached;}
  const t0=Date.now();
  const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
  const paquet=typeof evaluerToutesActionsPlanV56_==='function'?evaluerToutesActionsPlanV56_(actions):{mesures:actions.map(a=>({id:a.id,libelle:a.libelle,mesure:evaluerActionPlanV5_(a)})),performance:{fallback:true}};
  const mesures=paquet.mesures||[];
  const mm=Object.fromEntries(mesures.map(x=>[String(x.id),x.mesure||{}]));
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
  return ecrireCachePlanV54_('plan_v54_mesures',serialiserCerberePourClient_({version:PLAN_FUNCTIONS_V54_VERSION,mesures:mm,gains_effectifs:{mensuel:arrondirPlanV5_(em),annuel:arrondirPlanV5_(ea)},performance:Object.assign({duree_ms:Date.now()-t0,cache:false},paquet.performance||{})}));
}

function normaliserStatutPlanV54_(s){
  s=String(s||'Prévue');
  if(['Effective','Abandonnée','En cours','Prévue'].includes(s))return s;
  if(['Réalisée','Réalisé','Realisee','Realise'].includes(s))return 'Effective';
  if(s==='Abandonnée'||s==='Annulée')return 'Abandonnée';
  if(s==='En cours')return 'En cours';
  return 'Prévue';
}

function suppressionRealiseePlanV54_(d){
  return String(d&&d.fonction_plan||'').toUpperCase()==='SUPPRIMER'&&
    normaliserStatutPlanV54_(d&&d.statut)==='Effective';
}

function actionSuppressionChargeFixeRealiseeV54_(d){
  return suppressionRealiseePlanV54_(d)&&
    String(d&&d.source_type||'')==='charge_fixe'&&!!String(d&&d.source_id||'').trim();
}

function verifierSourceSuppressionRealiseeV54_(d){
  if(!suppressionRealiseePlanV54_(d))return;
  if(String(d.source_type||'')!=='charge_fixe'||!String(d.source_id||'').trim()){
    throw new Error('Une suppression réalisée doit être rattachée explicitement à une charge fixe BudgetSoft. Recherchez puis sélectionnez la charge fixe concernée avant d’enregistrer.');
  }
  const cf=lireTable_('Charges_fixes').find(x=>String(x.id)===String(d.source_id));
  if(!cf)throw new Error('La charge fixe rattachée est introuvable. Recherchez puis sélectionnez de nouveau la charge fixe avant d’enregistrer.');
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
  d.mode_preuve_reception=['operation_distincte','integre_salaire'].includes(String(d.mode_preuve_reception||'').toLowerCase())?String(d.mode_preuve_reception).toLowerCase():'operation_distincte';
  if(f!=='RECEVOIR')d.mode_preuve_reception='operation_distincte';
  if(f==='RECEVOIR'&&d.mode_preuve_reception==='integre_salaire'&&!d.date_effet)throw new Error('Une réception intégrée au salaire nécessite une date de début / effet.');
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

  // Toute suppression explicitement réalisée doit être adossée à une vraie
  // charge fixe AVANT l'écriture de l'action, afin d'éviter un état incohérent
  // "action réalisée / charge canonique toujours active".
  verifierSourceSuppressionRealiseeV54_(d);

  // Doctrine 2026-09-14 : pour SUPPRIMER une charge fixe, le passage explicite à
  // Réalisée est en lui-même la confirmation structurelle. Il ne dépend plus des
  // deux cases techniques de l'ancien formulaire. L'effet financier durable est
  // ensuite porté exclusivement par Charges_fixes via date_fin.
  if(actionSuppressionChargeFixeRealiseeV54_(d)){
    d.impact_confirme=true;
    d.reevaluer_charges_fixes=true;
    if(!d.date_effet)d.date_effet=old.date_effet||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  }

  d.dernier_recalcul=new Date().toISOString();
  upsertDynamiquePlanV4_('Plan_Actions',d);

  let cloture=null;
  if(actionSuppressionChargeFixeRealiseeV54_(d)){
    cloture=cloturerChargeFixeDepuisActionV3(d.id,d.date_effet);
  }

  try{recalculerPlanBudgetSoft_('action_v54');}catch(e){}
  invaliderCachePlanV54_();
  return {ok:true,id:d.id,libelle:d.libelle,action_structurelle_realisee:actionSuppressionChargeFixeRealiseeV54_(d),date_fin_charge_fixe:actionSuppressionChargeFixeRealiseeV54_(d)?d.date_effet:'',cloture_charge_fixe:cloture};
}

function enregistrerEvenementPlanV54(d){
  assurerPlanActionsV4_();d=Object.assign({},d||{});
  d.libelle=String(d.libelle||'').trim();if(!d.libelle)throw new Error('Le libellé de l’événement est obligatoire.');
  d.montant=Math.abs(Number(d.montant||0));if(!d.montant)throw new Error('Le montant doit être supérieur à zéro.');
  d.categorie=String(d.categorie||'').trim();d.statut=String(d.statut||'Prévu');d.certitude=String(d.certitude||'certaine');
  normaliserFractionPlanV46_(d);d.recurrence=d.fractionne?d.periodicite_fractionnement:'ponctuel';d.dernier_recalcul=new Date().toISOString();
  upsertDynamiquePlanV4_('Plan_Evenements',d);try{recalculerPlanBudgetSoft_('evenement_v54');}catch(e){}
  invaliderCachePlanV54_();
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
  invaliderCachePlanV54_();
  return {ok:true};
}

function auditerPerformancePlanV54(){
  invaliderCachePlanV54_();
  const t0=Date.now();const s1=chargerPlanStructureV54();const t1=Date.now();const m1=chargerMesuresPlanV54();const t2=Date.now();
  const s2=chargerPlanStructureV54();const t3=Date.now();const m2=chargerMesuresPlanV54();const t4=Date.now();
  return {version:PLAN_FUNCTIONS_V54_VERSION,structure_froid_ms:t1-t0,mesures_froid_ms:t2-t1,structure_cache_ms:t3-t2,mesures_cache_ms:t4-t3,actions:(s1.actions||[]).length,evenements:(s1.evenements||[]).length,details_mesures:m1.performance||{}};
}