const CERBERE_CB_DATE_COMPTABLE_FIX_VERSION = '2026-09-05.2';
var CERBERE_P0_LECTURE_CACHE_20260905_=null;
var CERBERE_R0_LECTURE_CACHE_20260905_=null;

/**
 * Correctif Cerbère : pour une CB différée, la date comptable réelle est
 * autoritaire dès qu'elle est connue. La projection par date d'achat n'est
 * utilisée qu'en l'absence de date comptable.
 */
function dateImputationCarteCerbereBudgetSoft_(o) {
  const dateComptable = dateValideVentilationBudgetSoft_(o && o.date_comptable);
  if (dateComptable) return dateComptable;

  const d = dateAchatMetierBudgetSoft_(o);
  if (!d) return null;
  const debut = d.getDate() >= 28
    ? new Date(d.getFullYear(), d.getMonth(), 28)
    : new Date(d.getFullYear(), d.getMonth() - 1, 28);
  return new Date(debut.getFullYear(), debut.getMonth() + 1, 28);
}

/**
 * Optimisation lecture seule 2026-09-05.
 * Pendant un calcul encapsulé dans avecContexteLectureBudgetSoft20260827_, P0
 * et R0 ne peuvent pas changer. On ne les relit donc qu'une fois par exécution.
 * Hors contexte lecture, le comportement historique est conservé intégralement.
 */
function chargerCanonCerbereV1() {
  const lecture=typeof BUDGETSOFT_READ_CONTEXT_ACTIVE_!=='undefined'&&!!BUDGETSOFT_READ_CONTEXT_ACTIVE_;
  if(lecture&&CERBERE_P0_LECTURE_CACHE_20260905_)return CERBERE_P0_LECTURE_CACHE_20260905_;
  const sh=assurerCanonCerbereV1_();
  const rows=lireCanonCerbereV1_(sh).filter(r=>String(r.actif).toLowerCase()!=='false').sort((a,b)=>Number(a.ordre||99)-Number(b.ordre||99));
  const pluxee=rows.reduce((s,r)=>s+Number(r.pluxee||0),0),monetaire=rows.reduce((s,r)=>s+Number(r.monetaire||0),0);
  const out={version:CERBERE_CANON_V1_VERSION,principe:'P0 est la référence maître persistante. Le Réel ne le modifie jamais ; seule une validation explicite de P0 change la référence.',pluxeeMensuel:154,moisSansPluxee:5,epargneProtegee:50,postes:rows.map(r=>({categorie:String(r.categorie||''),monetaire:Number(r.monetaire||0),pluxee:Number(r.pluxee||0),nature:String(r.nature||'ajustable'),ordre:Number(r.ordre||99),protege:String(r.protege).toLowerCase()==='true'})),totaux:{monetaire,pluxee,total:monetaire+pluxee}};
  if(lecture)CERBERE_P0_LECTURE_CACHE_20260905_=out;
  return out;
}

function chargerCanonRecettesCerbereV1() {
  const lecture=typeof BUDGETSOFT_READ_CONTEXT_ACTIVE_!=='undefined'&&!!BUDGETSOFT_READ_CONTEXT_ACTIVE_;
  if(lecture&&CERBERE_R0_LECTURE_CACHE_20260905_)return CERBERE_R0_LECTURE_CACHE_20260905_;
  const sh=assurerCanonRecettesCerbereV1_();
  const hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,hs.length).getValues():[];
  const postes=rows.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>Object.fromEntries(hs.map((h,i)=>[h,r[i]]))).filter(x=>String(x.actif).toLowerCase()!=='false').map(x=>({categorie:String(x.categorie||'').trim(),montant:Math.max(0,Number(x.montant||0)),nature:String(x.nature||'structurelle'),ordre:Number(x.ordre||99),commentaire:String(x.commentaire||''),montant_precedent:(x.montant_precedent===''||x.montant_precedent==null)?null:Math.max(0,Number(x.montant_precedent||0)),date_effet:normaliserDateCanonRecettes_(x.date_effet)})).filter(x=>x.categorie&&x.montant>0).sort((a,b)=>a.ordre-b.ordre||a.categorie.localeCompare(b.categorie,'fr'));
  const out={version:CERBERE_RECETTES_CANON_VERSION,principe:'R0 est la référence maître persistante des recettes normales ; le Plan et le réel ne la réécrivent pas. Les changements datés conservent la référence antérieure pour les cycles déjà ouverts.',postes,total:arrondirCerbereV3_(postes.reduce((s,x)=>s+x.montant,0))};
  if(lecture)CERBERE_R0_LECTURE_CACHE_20260905_=out;
  return out;
}

/**
 * Même logique que l'override Plan/Cerbère, mais Plan_Actions est lu sans clone
 * JSON lorsqu'il est déjà présent dans le contexte de lecture de l'exécution.
 */
function previsionsEvenementsV371_(events,periode,p0Cats,catType){
  const out={recettesInitiales:0,recettesFutures:0,depensesFutures:0,depensesHorsPilotable:0,depensesHorsPilotableFutures:0,remboursementsSante:0,depensesPilotablesParCategorie:{},recettesActions:0,depensesActions:0,actionsRetenues:0,evenementsRetenus:0,previsionsNeutraliseesParReel:0};
  const maintenant=new Date();
  function estNeutralise_(x){const statut=normaliserV37_(x.statut||''),rappro=normaliserV37_(x.rapprochement_statut||'');return !!String(x.operation_reelle_id||'').trim()||rappro==='rapproche'||['rapproche','realise','effective','effectif','annule','abandonnee','abandonne'].includes(statut);}
  function ajouterOccurrence_(x,o,source){let impact=o.date;const typeExplicite=normaliserV37_(x.type||x.sens||''),impactType=normaliserV37_(x.impact_type||''),nature=normaliserV37_(x.nature_action||''),estRecette=typeExplicite==='recette'||impactType==='hausse revenu'||nature==='encaisser'||nature==='recouvrer',estDepense=typeExplicite==='depense'||['acheter','rembourser','reserver','investir','payer'].includes(nature);if(source==='Action'&&!estRecette&&!estDepense)return;if(!estRecette&&normaliserV37_(x.mode_paiement)==='cb')impact=dateImpactCbPlanV37_(o.date);if(!dateDansPeriodeV37_(impact,periode))return;const dateImpact=dateValideVentilationBudgetSoft_(impact),futur=!dateImpact||dateImpact>maintenant,m=Math.abs(Number(o.montant||0)),cat=String(x.categorie||'').trim();if(!m)return;if(estRecette){out.recettesInitiales+=m;if(futur)out.recettesFutures+=m;if(source==='Action')out.recettesActions+=m;if(/sante|remboursement/.test(normaliserV37_(cat+' '+(x.libelle||''))))out.remboursementsSante+=m;return;}if(p0Cats.has(cat)){out.depensesPilotablesParCategorie[cat]=(out.depensesPilotablesParCategorie[cat]||0)+m;if(futur)out.depensesFutures+=m;}else{out.depensesHorsPilotable+=m;if(futur)out.depensesHorsPilotableFutures+=m;}if(source==='Action')out.depensesActions+=m;}
  (events||[]).forEach(e=>{if(estNeutralise_(e)){out.previsionsNeutraliseesParReel++;return;}if(String(e.certitude||'certaine')==='possible')return;out.evenementsRetenus++;const occ=typeof occurrencesEvenementV4_==='function'?occurrencesEvenementV4_(e):[{montant:Math.abs(Number(e.montant||0)),date:e.date_effet}];occ.forEach(o=>ajouterOccurrence_(e,o,'Événement'));});
  let actions=[];try{actions=typeof lirePlanDynamiqueDirectBudgetSoft20260905_==='function'?lirePlanDynamiqueDirectBudgetSoft20260905_('Plan_Actions'):(typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Actions'):[]);}catch(e){actions=[];}
  (actions||[]).forEach(a=>{if(!yesPlanV4_(a.impact_confirme))return;if(estNeutralise_(a)){out.previsionsNeutraliseesParReel++;return;}out.actionsRetenues++;const occ=typeof occurrencesActionV46_==='function'?occurrencesActionV46_(a):[{montant:Math.abs(Number(a.impact_montant||0)),date:a.date_effet}];occ.forEach(o=>ajouterOccurrence_(a,o,'Action'));});
  Object.keys(out).forEach(k=>{if(typeof out[k]==='number')out[k]=arrV37_(out[k]);});return out;
}
