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
  const out={recettesInitiales:0,recettesFutures:0,depensesFutures:0,depensesHorsPilotable:0,depensesHorsPilotableFutures:0,remboursementsSante:0,depensesPilotablesParCategorie:{},recettesActions:0,depensesActions:0,actionsRetenues:0,evenementsRetenus:0,previsionsNeutraliseesParReel:0};
  const maintenant=new Date();
  function estNeutralise_(x){const statut=normaliserV37_(x.statut||''),rappro=normaliserV37_(x.rapprochement_statut||'');return !!String(x.operation_reelle_id||'').trim()||rappro==='rapproche'||['rapproche','realise','effective','effectif','annule','abandonnee','abandonne'].includes(statut);}
  function ajouterOccurrence_(x,o,source){let impact=o.date;const typeExplicite=normaliserV37_(x.type||x.sens||''),impactType=normaliserV37_(x.impact_type||''),nature=normaliserV37_(x.nature_action||''),estRecette=typeExplicite==='recette'||impactType==='hausse revenu'||nature==='encaisser'||nature==='recouvrer',estDepense=typeExplicite==='depense'||['acheter','rembourser','reserver','investir','payer'].includes(nature);if(source==='Action'&&!estRecette&&!estDepense)return;if(!estRecette&&normaliserV37_(x.mode_paiement)==='cb')impact=dateImpactCbPlanV37_(o.date);if(!dateDansPeriodeV37_(impact,periode))return;const dateImpact=dateValideVentilationBudgetSoft_(impact),futur=!dateImpact||dateImpact>maintenant,m=Math.abs(Number(o.montant||0)),cat=String(x.categorie||'').trim();if(!m)return;if(estRecette){out.recettesInitiales+=m;if(futur)out.recettesFutures+=m;if(source==='Action')out.recettesActions+=m;if(/sante|remboursement/.test(normaliserV37_(cat+' '+(x.libelle||''))))out.remboursementsSante+=m;return;}if(p0Cats.has(cat)){out.depensesPilotablesParCategorie[cat]=(out.depensesPilotablesParCategorie[cat]||0)+m;if(futur)out.depensesFutures+=m;}else{out.depensesHorsPilotable+=m;if(futur)out.depensesHorsPilotableFutures+=m;}if(source==='Action')out.depensesActions+=m;}
  (events||[]).forEach(e=>{if(estNeutralise_(e)){out.previsionsNeutraliseesParReel++;return;}if(String(e.certitude||'certaine')==='possible')return;out.evenementsRetenus++;const occ=typeof occurrencesEvenementV4_==='function'?occurrencesEvenementV4_(e):[{montant:Math.abs(Number(e.montant||0)),date:e.date_effet}];occ.forEach(o=>ajouterOccurrence_(e,o,'Événement'));});
  let actions=[];try{actions=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Actions'):[];}catch(e){actions=[];}
  (actions||[]).forEach(a=>{if(!yesPlanV4_(a.impact_confirme))return;if(estNeutralise_(a)){out.previsionsNeutraliseesParReel++;return;}out.actionsRetenues++;const occ=typeof occurrencesActionV46_==='function'?occurrencesActionV46_(a):[{montant:Math.abs(Number(a.impact_montant||0)),date:a.date_effet}];occ.forEach(o=>ajouterOccurrence_(a,o,'Action'));});
  Object.keys(out).forEach(k=>{if(typeof out[k]==='number')out[k]=arrV37_(out[k]);});return out;
}

function rapprocherActionV474(actionId,operationId){if(typeof assurerPlanActionsV4_==='function')assurerPlanActionsV4_();if(typeof assurerColonnesPlanV4_==='function')assurerColonnesPlanV4_('Plan_Actions',['montant_reel','date_realisation','rapprochement_statut','operation_reelle_id']);const a=lireFeuilleDynamiquePlan_('Plan_Actions').find(x=>String(x.id)===String(actionId));if(!a)throw new Error('Action introuvable.');const op=lireTable_('Operations').find(x=>String(x.id)===String(operationId));if(!op)throw new Error('Opération introuvable.');a.operation_reelle_id=operationId;a.montant_reel=Math.abs(Number(op.montant||0));a.date_realisation=op.date_comptable||op.date||op.date_operation||'';a.rapprochement_statut='Rapproché';a.statut='Réalisée';if(typeof upsertDynamiquePlanV4_==='function')upsertDynamiquePlanV4_('Plan_Actions',a);else enregistrerActionPlanV3(a);if(typeof recalculerPlanBudgetSoft_==='function')recalculerPlanBudgetSoft_('rapprochement_action');return typeof chargerPlanActionsV4==='function'?chargerPlanActionsV4():{ok:true};}

function listerImprevusCerbere20260903(clePilotage){
  const executer=function(){const periodes=typeof construirePeriodesCerbereV2_==='function'?construirePeriodesCerbereV2_():[],candidats=(periodes||[]).map(p=>({periode:p,cle:typeof clePeriodeCerbereV33_==='function'?String(clePeriodeCerbereV33_(p)):String(p&&p.debut||'')})),trouve=candidats.find(x=>x.cle===String(clePilotage||''))||candidats[0];if(!trouve)return{ok:false,lignes:[],depenses:0,recettes:0,net:0};const p0=typeof chargerCanonCerbereV1==='function'?chargerCanonCerbereV1():{postes:[]},r0=typeof chargerCanonRecettesCerbereV1==='function'?chargerCanonRecettesCerbereV1():{postes:[]},operations=lireTable_('Operations')||[],charges=lireTable_('Charges_fixes')||[],categories=lireTable_('Categories')||[],rap=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[],liens=typeof construireLiensChargesFixesCommuns_==='function'?construireLiensChargesFixesCommuns_(operations,charges,rap):{},periode=trouve.periode,p0Cats=new Set((p0.postes||[]).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean)),r0Cats=new Set((r0.postes||[]).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean)),types={},events=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):[],opsEvents=new Set(events.map(e=>String(e&&e.operation_reelle_id||'').trim()).filter(Boolean));p0Cats.add('Divers');categories.forEach(c=>types[String(c&&c.nom||'').trim()]=typeof normaliserV377_==='function'?normaliserV377_(c&&c.type):String(c&&c.type||'').toLowerCase());const lignes=[];let depenses=0,recettes=0;operations.forEach(o=>{const d=typeof dateImputationCerbereV377_==='function'?dateImputationCerbereV377_(o):dateValideVentilationBudgetSoft_(o&&o.date),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim(),id=String(o&&o.id||'').trim();if(!d||!(typeof dateDansCycleV377_==='function'?dateDansCycleV377_(d,periode):true)||!m||opsEvents.has(id)||liens[id]||types[cat]==='tresorerie'||(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o)))return;if(m<0&&p0Cats.has(cat))return;if(m>0&&r0Cats.has(cat))return;if(m<0)depenses+=Math.abs(m);else recettes+=m;lignes.push({id:id,date:Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd'),montant:Math.round(m*100)/100,categorie:cat,libelle:String(o&&o.libelle||o&&o.libelle_bancaire||'')});});return{ok:true,clePilotage:trouve.cle,lignes:lignes,depenses:Math.round(depenses*100)/100,recettes:Math.round(recettes*100)/100,net:Math.round((recettes-depenses)*100)/100,categories:categories.map(c=>String(c&&c.nom||'').trim()).filter(Boolean).sort(),performance:{moteurCerbereRelance:false}};};
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-imprevus-legers',executer):executer();
}

/** Chemin spécialisé cockpit : après le socle 3.7, seules C1/C2 traversent les passes terminales. */
function chargerCerbereCockpitBaseRapide20260903_(){
  const brut=chargerCerbereV37();if(!brut||brut.ok===false)return brut;
  if(Array.isArray(brut.periodes)&&brut.periodes.length>2)brut.periodes=brut.periodes.slice(0,2);
  let base=appliquerResteReellementPilotableV374_(brut);
  base=typeof appliquerAuditCerbereV377_==='function'?appliquerAuditCerbereV377_(base):base;
  base=typeof appliquerHistoriqueR0V378_==='function'?appliquerHistoriqueR0V378_(base):base;
  base=typeof appliquerRapprochementCerbereV3711_==='function'?appliquerRapprochementCerbereV3711_(base):base;
  base=typeof appliquerDoctrineCycleV3712_==='function'?appliquerDoctrineCycleV3712_(base):base;
  base=typeof appliquerConventionSalaireTousCyclesV3712_==='function'?appliquerConventionSalaireTousCyclesV3712_(base):base;
  base=typeof appliquerProjectionFrontiereV3713_==='function'?appliquerProjectionFrontiereV3713_(base):base;
  base=typeof corrigerProjectionFrontiereV3713b_==='function'?corrigerProjectionFrontiereV3713b_(base):base;
  base=typeof corrigerEffetsFinanciersActionsV3713_==='function'?corrigerEffetsFinanciersActionsV3713_(base):base;
  base=stabiliserCerbereV3716_(base);base=stabiliserCerbereV3717_(base);
  if(base&&typeof base==='object')base.version=CERBERE_PILOTAGE_V374_VERSION;return base;
}

/** Surcharge du chargeur cockpit : même doctrine, payload C1/C2 seulement. */
function chargerCerbereCockpit20260902(){
  const executer=function(){const t0=Date.now(),base=chargerCerbereCockpitBaseRapide20260903_();if(!base||base.ok===false)return base;corrigerSuspensionsActionsEvenements20260903_(base);corrigerReelPilotableDateAchat20260902_(base);const periodes=Array.isArray(base.periodes)?base.periodes:[];periodes.forEach((p,i)=>enrichirCycleCockpitCerbere20260902_(p,i));base.cockpit20260902={version:'2026-09-03.fast-1',appreciation:appreciationCockpitCerbere20260902_(base),performance:{c1c2Seulement:true,dureeMs:Date.now()-t0},doctrine:'Cockpit C1/C2 : mêmes règles métier ; passes terminales limitées aux deux cycles affichés.'};return serialiserCerberePourClient_(base);};
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-c1c2-20260903',executer):executer();
}
