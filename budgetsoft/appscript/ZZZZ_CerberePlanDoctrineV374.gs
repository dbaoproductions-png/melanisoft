/*
 * Cerbère 3.7.4 — pont Planification -> Cerbère.
 * Complément ciblé : Actions + Événements pondèrent la période ;
 * une occurrence rapprochée/réalisée quitte le prévisionnel afin que le Réel
 * prenne seul sa place. Ne modifie ni l'infrastructure ni les référentiels maître.
 *
 * Ce fichier surcharge uniquement previsionsEvenementsV371_ utilisée par
 * CerbereV37.gs. Le préfixe ZZZZ garantit qu'il est chargé après le socle dans
 * le projet Apps Script synchronisé selon le circuit existant.
 */

function previsionsEvenementsV371_(events,periode,p0Cats,catType){
  const out={
    recettesInitiales:0,recettesFutures:0,depensesFutures:0,
    depensesHorsPilotable:0,depensesHorsPilotableFutures:0,
    remboursementsSante:0,depensesPilotablesParCategorie:{},
    recettesActions:0,depensesActions:0,actionsRetenues:0,evenementsRetenus:0,
    previsionsNeutraliseesParReel:0
  };
  const maintenant=new Date();

  function estNeutralise_(x){
    const statut=normaliserV37_(x.statut||'');
    const rappro=normaliserV37_(x.rapprochement_statut||'');
    return !!String(x.operation_reelle_id||'').trim()
      || rappro==='rapproche'
      || ['rapproche','realise','effective','effectif','annule','abandonnee','abandonne'].includes(statut);
  }

  function ajouterOccurrence_(x,o,source){
    let impact=o.date;
    const typeExplicite=normaliserV37_(x.type||x.sens||'');
    const impactType=normaliserV37_(x.impact_type||'');
    const nature=normaliserV37_(x.nature_action||'');
    const estRecette=typeExplicite==='recette'||impactType==='hausse revenu'||nature==='encaisser'||nature==='recouvrer';
    const estDepense=typeExplicite==='depense'||['acheter','rembourser','reserver','investir','payer'].includes(nature);

    // Une Action de baisse/suppression de charge n'est pas une nouvelle recette :
    // son effet relève de CF1/CFt1 via la logique de charge fixe existante.
    if(source==='Action'&&!estRecette&&!estDepense)return;

    if(!estRecette&&normaliserV37_(x.mode_paiement)==='cb')impact=dateImpactCbPlanV37_(o.date);
    if(!dateDansPeriodeV37_(impact,periode))return;
    const dateImpact=dateValideVentilationBudgetSoft_(impact);
    const futur=!dateImpact||dateImpact>maintenant;
    const m=Math.abs(Number(o.montant||0));
    const cat=String(x.categorie||'').trim();
    if(!m)return;

    if(estRecette){
      out.recettesInitiales+=m;
      if(futur)out.recettesFutures+=m;
      if(source==='Action')out.recettesActions+=m;
      if(/sante|remboursement/.test(normaliserV37_(cat+' '+(x.libelle||''))))out.remboursementsSante+=m;
      return;
    }

    if(p0Cats.has(cat)){
      out.depensesPilotablesParCategorie[cat]=(out.depensesPilotablesParCategorie[cat]||0)+m;
      if(futur)out.depensesFutures+=m;
    }else{
      out.depensesHorsPilotable+=m;
      if(futur)out.depensesHorsPilotableFutures+=m;
    }
    if(source==='Action')out.depensesActions+=m;
  }

  (events||[]).forEach(e=>{
    if(estNeutralise_(e)){out.previsionsNeutraliseesParReel++;return;}
    if(String(e.certitude||'certaine')==='possible')return;
    out.evenementsRetenus++;
    const occ=typeof occurrencesEvenementV4_==='function'
      ?occurrencesEvenementV4_(e)
      :[{montant:Math.abs(Number(e.montant||0)),date:e.date_effet}];
    occ.forEach(o=>ajouterOccurrence_(e,o,'Événement'));
  });

  let actions=[];
  try{
    if(typeof assurerColonnesPlanV4_==='function'){
      assurerColonnesPlanV4_('Plan_Actions',['montant_reel','date_realisation','rapprochement_statut','operation_reelle_id']);
    }
    actions=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Actions'):[];
  }catch(e){actions=[];}

  (actions||[]).forEach(a=>{
    if(!yesPlanV4_(a.impact_confirme))return;
    if(estNeutralise_(a)){out.previsionsNeutraliseesParReel++;return;}
    out.actionsRetenues++;
    const occ=typeof occurrencesActionV46_==='function'
      ?occurrencesActionV46_(a)
      :[{montant:Math.abs(Number(a.impact_montant||0)),date:a.date_effet}];
    occ.forEach(o=>ajouterOccurrence_(a,o,'Action'));
  });

  Object.keys(out).forEach(k=>{if(typeof out[k]==='number')out[k]=arrV37_(out[k]);});
  return out;
}

/** Rapproche explicitement une Action à une opération réelle : le prévisionnel
 * est alors neutralisé et le Réel devient seul compté par Cerbère. */
function rapprocherActionV474(actionId,operationId){
  if(typeof assurerPlanActionsV4_==='function')assurerPlanActionsV4_();
  if(typeof assurerColonnesPlanV4_==='function')assurerColonnesPlanV4_('Plan_Actions',['montant_reel','date_realisation','rapprochement_statut','operation_reelle_id']);
  const a=lireFeuilleDynamiquePlan_('Plan_Actions').find(x=>String(x.id)===String(actionId));
  if(!a)throw new Error('Action introuvable.');
  const op=lireTable_('Operations').find(x=>String(x.id)===String(operationId));
  if(!op)throw new Error('Opération introuvable.');
  a.operation_reelle_id=operationId;
  a.montant_reel=Math.abs(Number(op.montant||0));
  a.date_realisation=op.date_comptable||op.date||op.date_operation||'';
  a.rapprochement_statut='Rapproché';
  a.statut='Réalisée';
  if(typeof upsertDynamiquePlanV4_==='function')upsertDynamiquePlanV4_('Plan_Actions',a);
  else enregistrerActionPlanV3(a);
  if(typeof recalculerPlanBudgetSoft_==='function')recalculerPlanBudgetSoft_('rapprochement_action');
  return typeof chargerPlanActionsV4==='function'?chargerPlanActionsV4():{ok:true};
}