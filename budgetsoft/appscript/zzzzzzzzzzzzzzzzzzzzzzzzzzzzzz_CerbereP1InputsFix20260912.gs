/*
 * Corrections terminales des entrées P1 — 2026-09-12.
 * Objectif : corriger les propriétaires d'entrée sans dupliquer les calculs P1.
 * - Rt1 : maintenir les recettes certaines en retard tant qu'aucune preuve de réalisation n'existe.
 * - CFt1 : reconnaître les suspensions/reports explicites même si l'action est déjà positive.
 * - CB héritées : n'exclure des CB que les liens CF explicites/validés, jamais un rapprochement heuristique.
 */
const CERBERE_P1_INPUTS_FIX_20260912_VERSION='2026-09-12.1';

function normP1InputsFix20260912_(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function dateP1InputsFix20260912_(v){const d=v instanceof Date?new Date(v):new Date(v||0);return isNaN(d)?null:d;}
function jourP1InputsFix20260912_(d){d=dateP1InputsFix20260912_(d);return d?Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()):NaN;}
function arrP1InputsFix20260912_(n){return Math.round(Number(n||0)*100)/100;}

function evenementClosProuveP1InputsFix20260912_(ev){
  if(!ev)return false;
  if(typeof evenementClosProuveRevenuePublicationFix20260912_==='function')return evenementClosProuveRevenuePublicationFix20260912_(ev);
  const s=normP1InputsFix20260912_(ev.statut);
  if(['annule','annulee','abandonne','abandonnee'].includes(s))return true;
  if(String(ev.operation_reelle_id||'').trim())return true;
  const r=normP1InputsFix20260912_(ev.rapprochement_statut||'');
  return ['rapproche','rapprochee','realise','realisee'].includes(r);
}

function corrigerRt1EvenementsCertainsDusP1InputsFix20260912_(base){
  const ps=Array.isArray(base&&base.periodes)?base.periodes:[];
  if(!ps.length)return {montant:0,nombre:0,lignes:[]};
  const p=ps[0],v=p&&p.v37;if(!v)return {montant:0,nombre:0,lignes:[]};
  const periode=p.periode||p||{},fin=dateP1InputsFix20260912_(periode.fin),ref=new Date();
  let evs=[];try{evs=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements')||[]:[];}catch(e){evs=[];}
  let total=0;const lignes=[];
  evs.forEach(ev=>{
    if(normP1InputsFix20260912_(ev&&ev.type)!=='recette')return;
    if(evenementClosProuveP1InputsFix20260912_(ev))return;
    const st=normP1InputsFix20260912_(ev&&ev.statut);
    if(!['effective','effectif','effectives','effectifs','realise a rapprocher','realisee a rapprocher'].includes(st))return;
    let d=null;try{if(typeof datePlanTresorerie_==='function'){const dr=datePlanTresorerie_(ev,ref,false);d=dr&&dr.date?dateP1InputsFix20260912_(dr.date):null;}}catch(e){}
    if(!d)d=dateP1InputsFix20260912_(ev&& (ev.date_effet||ev.date_prevue));
    if(!d||d>ref||(fin&&d>fin))return;
    const m=Math.abs(Number(ev&&ev.montant||0));if(!Number.isFinite(m)||m<=0)return;
    total+=m;lignes.push({id:String(ev.id||''),libelle:String(ev.libelle||''),montant:arrP1InputsFix20260912_(m),date:d.toISOString(),statut:String(ev.statut||'')});
  });
  total=arrP1InputsFix20260912_(total);
  if(total>0){v.rt1=arrP1InputsFix20260912_(Number(v.rt1||0)+total);v.recettesEvenementsCertainsDus20260912=total;}
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.rt1EvenementsCertainsDus20260912={version:CERBERE_P1_INPUTS_FIX_20260912_VERSION,montant:total,nombre:lignes.length,lignes:lignes};
  return {montant:total,nombre:lignes.length,lignes:lignes};
}

/* Override du correcteur Actions/Événements :
 * une suspension/report explicite est une charge évitée, quel que soit le signe déjà normalisé par Plan.
 */
function corrigerSuspensionsActionsEvenements20260903_(base){
  (Array.isArray(base&&base.periodes)?base.periodes:[]).forEach(p=>{
    const v=p&&p.v37;if(!v)return;
    const l=Array.isArray(v.actionsEvenementsCycle)?v.actionsEvenementsCycle:[];
    let correctionCf=0,deltaNet=0;
    l.forEach(x=>{
      const texte=normP1InputsFix20260912_([x&&x.libelle,x&&x.type,x&&x.nature,x&&x.action,x&&x.statut,x&&x.commentaire].filter(Boolean).join(' '));
      const m=Number(x&&x.montantSigne!=null?x.montantSigne:(x&&x.montant!=null?x.montant:0));
      if(!Number.isFinite(m)||m===0||!/(suspension|suspend|report|reporte)/.test(texte))return;
      const a=Math.abs(m);
      x.montantSigne=arrP1InputsFix20260912_(a);
      x.effetBudgetaire='charge évitée';
      correctionCf+=a;
      if(m<0)deltaNet+=2*a;
    });
    correctionCf=arrP1InputsFix20260912_(correctionCf);
    if(correctionCf>0){
      v.cft1=arrP1InputsFix20260912_(Math.max(0,Number(v.cft1||0)-correctionCf));
      v.correctionSuspensions20260903=correctionCf;
      if(deltaNet&&v.actionsEvenementsResume&&Number.isFinite(Number(v.actionsEvenementsResume.net)))v.actionsEvenementsResume.net=arrP1InputsFix20260912_(Number(v.actionsEvenementsResume.net)+deltaNet);
    }
  });
  corrigerRt1EvenementsCertainsDusP1InputsFix20260912_(base);
  return base;
}

/* Override strict des CB héritées : exclusion CF uniquement sur preuve explicite. */
function calculerCbHeriteesP1Cerbere20260912_(p){
  if(!p)return{montant:0,nombre:0,lignes:[],excluesCf:0};
  const periode=p.periode||p,debut=dateCockpit20260902_(periode.debut),fin=dateCockpit20260902_(periode.fin);
  if(!debut||!fin)return{montant:0,nombre:0,lignes:[],excluesCf:0,erreur:'bornes période invalides'};

  const ops0=lireTable_('Operations')||[];
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  const liensCfExplicites={};
  (rapprochements||[]).forEach(r=>{
    if(!(typeof estRapprochementValideP1Cerbere20260912_==='function'&&estRapprochementValideP1Cerbere20260912_(r)))return;
    const opId=String(r&&r.operation_id||'').trim(),cfId=String(r&&r.charge_fixe_id||'').trim();
    if(opId&&cfId)liensCfExplicites[opId]=cfId;
  });

  const debutPrecedent=new Date(debut.getFullYear(),debut.getMonth()-1,28);
  const tDebut=jourCivilP1Cerbere20260912_(debut),tFin=jourCivilP1Cerbere20260912_(fin),tPrec=jourCivilP1Cerbere20260912_(debutPrecedent);
  let total=0,excluesCf=0;const lignes=[],exclusions=[];

  operations.forEach(o=>{
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||m>=0)return;
    if(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o))return;
    const estCb=typeof estAchatCbDoubleRole20260905_==='function'?estAchatCbDoubleRole20260905_(o):!!(String(o&&o.carte_fin||'').trim()||String(o&&o.date_achat||'').trim());
    if(!estCb)return;
    const da=typeof dateAchatCbDoubleRole20260905_==='function'?dateAchatCbDoubleRole20260905_(o):dateCockpit20260902_(o&&o.date_achat);
    const db=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):dateCockpit20260902_(o&&(o.date_comptable||o.date));
    if(!da||!db)return;
    const ta=jourCivilP1Cerbere20260912_(da),tb=jourCivilP1Cerbere20260912_(db);
    if(!(ta>=tPrec&&ta<tDebut&&tb>=tDebut&&tb<=tFin))return;

    const id=String(o&&o.id||'').trim(),cfDirect=String(o&&o.charge_fixe_id||'').trim(),cfRap=id&&liensCfExplicites[id]||'';
    if(cfDirect||cfRap){
      const a=Math.abs(m);excluesCf+=a;exclusions.push({id:id,montant:arrP1InputsFix20260912_(a),chargeFixeId:cfDirect||cfRap,preuve:cfDirect?'operation.charge_fixe_id':'rapprochement CF validé'});return;
    }
    const a=Math.abs(m);total+=a;
    lignes.push({id:id,montant:arrP1InputsFix20260912_(a),categorie:String(o&&o.categorie||''),dateAchat:Utilities.formatDate(da,Session.getScriptTimeZone(),'yyyy-MM-dd'),dateComptable:Utilities.formatDate(db,Session.getScriptTimeZone(),'yyyy-MM-dd'),libelle:String(o&&o.libelle||o&&o.libelle_bancaire||'')});
  });

  return{montant:arrP1InputsFix20260912_(total),nombre:lignes.length,lignes:lignes,excluesCf:arrP1InputsFix20260912_(excluesCf),exclusionsCf:exclusions,versionInputsFix:CERBERE_P1_INPUTS_FIX_20260912_VERSION,doctrine:'CB héritées : exclusion CF uniquement sur charge_fixe_id explicite ou rapprochement CF validé'};
}
