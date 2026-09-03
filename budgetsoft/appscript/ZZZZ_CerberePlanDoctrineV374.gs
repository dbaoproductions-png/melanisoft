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

/**
 * Surcharge performance 2026-09-03.
 * L'ancien contrôleur d'imprévus rappelait chargerCerbereV374(), donc chaque carte
 * C1/C2 relançait toutes les passes Cerbère après le chargement principal.
 * Ici on relit uniquement les référentiels nécessaires et le registre Operations.
 */
function listerImprevusCerbere20260903(clePilotage){
  const executer=function(){
    const periodes=typeof construirePeriodesCerbereV2_==='function'?construirePeriodesCerbereV2_():[];
    const candidats=(periodes||[]).map(p=>({periode:p,cle:typeof clePeriodeCerbereV33_==='function'?String(clePeriodeCerbereV33_(p)):String(p&&p.debut||'')}));
    const trouve=candidats.find(x=>x.cle===String(clePilotage||''))||candidats[0];
    if(!trouve)return{ok:false,lignes:[],depenses:0,recettes:0,net:0};
    const p0=typeof chargerCanonCerbereV1==='function'?chargerCanonCerbereV1():{postes:[]};
    const r0=typeof chargerCanonRecettesCerbereV1==='function'?chargerCanonRecettesCerbereV1():{postes:[]};
    const operations=lireTable_('Operations')||[],charges=lireTable_('Charges_fixes')||[],categories=lireTable_('Categories')||[];
    const rap=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
    const liens=typeof construireLiensChargesFixesCommuns_==='function'?construireLiensChargesFixesCommuns_(operations,charges,rap):{};
    const periode=trouve.periode,p0Cats=new Set((p0.postes||[]).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean)),r0Cats=new Set((r0.postes||[]).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean)),types={};
    const events=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):[];
    const opsEvents=new Set(events.map(e=>String(e&&e.operation_reelle_id||'').trim()).filter(Boolean));
    p0Cats.add('Divers');
    categories.forEach(c=>types[String(c&&c.nom||'').trim()]=typeof normaliserV377_==='function'?normaliserV377_(c&&c.type):String(c&&c.type||'').toLowerCase());
    const lignes=[];let depenses=0,recettes=0;
    operations.forEach(o=>{
      const d=typeof dateImputationCerbereV377_==='function'?dateImputationCerbereV377_(o):dateValideVentilationBudgetSoft_(o&&o.date),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim(),id=String(o&&o.id||'').trim();
      if(!d||!(typeof dateDansCycleV377_==='function'?dateDansCycleV377_(d,periode):true)||!m||opsEvents.has(id)||liens[id]||types[cat]==='tresorerie'||(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o)))return;
      if(m<0&&p0Cats.has(cat))return;if(m>0&&r0Cats.has(cat))return;
      if(m<0)depenses+=Math.abs(m);else recettes+=m;
      lignes.push({id:id,date:Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd'),montant:Math.round(m*100)/100,categorie:cat,libelle:String(o&&o.libelle||o&&o.libelle_bancaire||'')});
    });
    return{ok:true,clePilotage:trouve.cle,lignes:lignes,depenses:Math.round(depenses*100)/100,recettes:Math.round(recettes*100)/100,net:Math.round((recettes-depenses)*100)/100,categories:categories.map(c=>String(c&&c.nom||'').trim()).filter(Boolean).sort(),performance:{moteurCerbereRelance:false}};
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-imprevus-legers',executer):executer();
}
