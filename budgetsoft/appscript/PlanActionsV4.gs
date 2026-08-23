const PLAN_ACTIONS_V4_VERSION='4.1.0';

function assurerPlanActionsV4_(){
  assurerPlanActionsV3_();
  const ss=SpreadsheetApp.getActive(), sh=ss.getSheetByName('Plan_Actions');
  const extra=['nature_action','reevaluer_charges_fixes','affectation','source_remplacement_id','source_remplacement_libelle','dernier_recalcul'];
  const hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());
  const miss=extra.filter(x=>!hs.includes(x)); if(miss.length)sh.getRange(1,hs.length+1,1,miss.length).setValues([miss]);
}

function chargerPlanActionsV4(){
  assurerPlanActionsV4_();
  const base=chargerActionsPlanV3(), objectifs=base.objectifs||[], actions=base.actions||[];
  const groupes=objectifs.map(o=>{const aa=actions.filter(a=>String(a.objectif_id||'')===String(o.id));return {objectif:o,actions:aa,impact:agregerImpactActionsV4_(aa)};});
  return serialiserCerberePourClient_({version:PLAN_ACTIONS_V4_VERSION,groupes,sansObjectif:actions.filter(a=>!a.objectif_id),actions,objectifs,versions:base.versions||[],gains:base.gains||{},evenements:lireTablePlanCerbere_('Plan_Evenements')});
}

function agregerImpactActionsV4_(actions){
  let confirme=0,attendu=0;(actions||[]).forEach(a=>{if(['Abandonnée','Annulée'].includes(String(a.statut)))return;const m=Number(a.impact_montant||0),mensuel=String(a.impact_frequence)==='mensuel'?m:0;if(a.impact_confirme===true||String(a.impact_confirme)==='true')confirme+=mensuel;else attendu+=mensuel;});
  return {mensuel_confirme:Math.round(confirme*100)/100,mensuel_attendu:Math.round(attendu*100)/100,annuel_confirme:Math.round(confirme*1200)/100,annuel_attendu:Math.round(attendu*1200)/100};
}

function enregistrerActionPlanV4(d){
  assurerPlanActionsV4_();d=Object.assign({},d||{});d.nature_action=String(d.nature_action||'autre');d.reevaluer_charges_fixes=d.reevaluer_charges_fixes===true||String(d.reevaluer_charges_fixes)==='true';d.affectation='Projet';d.projet='Projet';d.dernier_recalcul=new Date().toISOString();
  enregistrerActionPlanV3(d);
  if(d.impact_confirme&&d.reevaluer_charges_fixes&&d.source_type==='charge_fixe'&&d.nature_action==='supprimer')cloturerChargeFixeDepuisActionV3(d.id,d.date_effet);
  recalculerPlanBudgetSoft_('action');return chargerPlanActionsV4();
}
function enregistrerEvenementPlanV4(d){enregistrerEvenementPlan(d);recalculerPlanBudgetSoft_('evenement');return chargerPlanActionsV4();}
function supprimerElementPlanV4(type,id){supprimerElementPlan(type,id);recalculerPlanBudgetSoft_('suppression_'+type);return chargerPlanActionsV4();}

function proposerResolutionSourceV4(sourceType,sourceId,mois){
  sourceType=String(sourceType||'');sourceId=String(sourceId||'');mois=Math.max(1,Math.min(6,Number(mois||4)));
  let capital=0;
  if(sourceType==='credit'&&sourceId){const c=lireTable_('Credits').find(x=>String(x.id)===sourceId);capital=Math.abs(Number(c&&c.capital_restant||0));}
  return calculerResolutionV4_(capital,mois);
}
function proposerResolutionActionV4(actionId,mois){
  assurerPlanActionsV4_();mois=Math.max(1,Math.min(6,Number(mois||4)));const a=lireFeuilleDynamiquePlan_('Plan_Actions').find(x=>String(x.id)===String(actionId));if(!a)throw new Error('Action introuvable.');
  let capital=0;if(a.source_type==='credit'&&a.source_id){const c=lireTable_('Credits').find(x=>String(x.id)===String(a.source_id));capital=Math.abs(Number(c&&c.capital_restant||0));}
  return calculerResolutionV4_(capital,mois);
}
function calculerResolutionV4_(capital,mois){
  const cerbere=chargerCerbereV2(),ps=cerbere&&cerbere.ok?(cerbere.periodes||[]).slice(0,mois):[],disponibilites=ps.reduce((s,p)=>s+Math.max(0,Number(p.enveloppePilotable||0)),0),soutenable=capital>0&&disponibilites>=capital,echeance=soutenable?Math.ceil(capital/mois*100)/100:0;
  return serialiserCerberePourClient_({capital_restant:capital,mois,disponibilites_mobilisables:Math.round(disponibilites*100)/100,soutenable,echeance_proposee:echeance,periodes_verifiees:ps.length,etapes:[{libelle:'Capital restant dû : '+capital.toFixed(2)+' €',montant_prevu:capital,statut:capital>0?'Calculée':'À renseigner'},{libelle:'Disponibilités mobilisables sur '+mois+' mois : '+disponibilites.toFixed(2)+' €',montant_prevu:disponibilites,statut:'Calculée après vérification P1–P6'},{libelle:soutenable?'Proposition : '+echeance.toFixed(2)+' € × '+mois+' mois':'Capacité insuffisante : ajustement nécessaire',montant_prevu:soutenable?capital:0,statut:'À valider'}]});
}
function recalculerPlanBudgetSoft_(origine){const props=PropertiesService.getDocumentProperties();props.setProperty('PLAN_DERNIER_RECALCUL',new Date().toISOString());props.setProperty('PLAN_DERNIERE_ORIGINE',String(origine||'inconnue'));try{const c=chargerCerbereV2();return {ok:!!(c&&c.ok),origine,cerbere:c};}catch(e){return {ok:false,origine,erreur:e.message||String(e)};}}
