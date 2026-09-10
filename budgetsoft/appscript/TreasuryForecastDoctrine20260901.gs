const TREASURY_FORECAST_DOCTRINE_20260901_VERSION='2026-09-10.3';

/**
 * Optimisation 2026-09-10.2 : le socle 20260831 reste rétrocompatible pour ses
 * consommateurs historiques, mais son estimation CB legacy est neutralisée pendant
 * l'appel canonique. La passe 20260901 reconstruit immédiatement tous les débits CB
 * via estimationsDebitsCbDiffereTresorerie20260908_, déjà validée A/B ligne par ligne.
 */
function chargerSocleTresorerie20260831SansDebitCbLegacy20260910_(dateCible){
  if(typeof chargerTresoreriePrevisionnelle20260831!=='function')return null;
  if(typeof estimationDebitCbDiffereTresorerie20260901_!=='function')return chargerTresoreriePrevisionnelle20260831(dateCible);
  const legacy=estimationDebitCbDiffereTresorerie20260901_;
  try{
    estimationDebitCbDiffereTresorerie20260901_=function(){return null;};
    return chargerTresoreriePrevisionnelle20260831(dateCible);
  }finally{
    estimationDebitCbDiffereTresorerie20260901_=legacy;
  }
}

/**
 * Passe terminale du solde prévisionnel bancaire.
 * Le second argument optionnel permet au snapshot global de fournir un Cerbère déjà
 * calculé. Les appels historiques à un seul argument conservent leur comportement.
 */
function chargerTresoreriePrevisionnelle20260901(dateCible,cerberePrecharge){
  const r=chargerSocleTresorerie20260831SansDebitCbLegacy20260910_(dateCible);
  if(!r||!r.ok)return r;
  const reference=new Date(r.dateReference||new Date()),cible=new Date(r.dateCible||new Date());
  const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
  const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
  const ops=lireTable_('Operations');
  const hard=(r.lignes||[]).filter(x=>x.source==='operation_future');
  let lignes=recalerFluxPlanCarteTresorerie20260901_(r.lignes||[],evenements,actions,hard,reference,cible);

  lignes=filtrerActionsPlanEffectivesTresorerie20260908_(lignes,actions);
  lignes=lignes.filter(x=>x.source!=='debit_cb_estime');
  const debitsCb=estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,cible,cerberePrecharge);
  if(debitsCb.length)lignes.push.apply(lignes,debitsCb);

  lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);
  lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));
  const out=recalculerSortieTresorerie20260901_(r,lignes,reference,cible);
  out.diagnostic20260831=out.diagnostic20260831||{};
  out.diagnostic20260831.cerberePrechargeProjection=!!cerberePrecharge;
  return out;
}

function listerMouvementsFutursTresorerie20260901(dateCible){
  const r=chargerTresoreriePrevisionnelle20260901(dateCible||dateDansJoursTresorerie_(45));
  return {ok:r.ok,version:r.version,dateReference:r.dateReference,dateCible:r.dateCible,lignes:r.lignes||[],confiance:r.confiance,diagnostic20260831:r.diagnostic20260831||{}};
}

function normaliserStatutActionTresorerie20260908_(v){
  return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function actionPlanEffectiveTresorerie20260908_(a){
  if(!a)return false;
  const confirme=a.impact_confirme===true||String(a.impact_confirme)==='true';
  const statut=normaliserStatutActionTresorerie20260908_(a.statut);
  return confirme&&['effective','effectif'].includes(statut);
}
function filtrerActionsPlanEffectivesTresorerie20260908_(lignes,actions){
  const index=Object.fromEntries((actions||[]).map(a=>[String(a.id||''),a]));
  return (lignes||[]).filter(x=>{
    if(String(x&&x.source||'')!=='action')return true;
    return actionPlanEffectiveTresorerie20260908_(index[String(x.sourceId||'')]);
  });
}

function paiementCartePlanTresorerie20260901_(o){return /^(cb|carte|carte bancaire)$/i.test(String(o&&o.mode_paiement||'').trim());}

function recalerFluxPlanCarteTresorerie20260901_(lignes,evenements,actions,hard,reference,cible){
  const ev=Object.fromEntries((evenements||[]).map(x=>[String(x.id||''),x]));
  const ac=Object.fromEntries((actions||[]).map(x=>[String(x.id||''),x]));
  const out=[];
  (lignes||[]).forEach(x=>{
    const src=x.source==='evenement'?ev[String(x.sourceId||'')]:x.source==='action'?ac[String(x.sourceId||'')]:null;
    if(!src||Number(x.montantSigne||0)>=0||!paiementCartePlanTresorerie20260901_(src)){out.push(x);return;}
    const d0=new Date(x.date);if(isNaN(d0)){out.push(x);return;}
    const d=dernierJourMoisTresorerie20260901_(d0.getFullYear(),d0.getMonth());
    if(d<=reference||d>cible)return;
    if(operationCouvrePrevisionTresorerie_(hard,d,Number(x.montantSigne||0),x.libelle||''))return;
    out.push(Object.assign({},x,{date:d.toISOString(),preuve:String(x.preuve||'Flux Plan')+' · paiement CB : débit bancaire différé fin de mois'}));
  });

  (evenements||[]).forEach(e=>{
    if(!statutEffectifTresorerie20260831_(e.statut)||!paiementCartePlanTresorerie20260901_(e)||estSuspensionTemporaireTresorerie20260831_(e)||String(e.type||'').toLowerCase()!=='depense')return;
    const dr=datePlanTresorerie_(e,reference,false),base=dr.date;if(!base||isNaN(base))return;
    const n=(e.fractionne===true||String(e.fractionne)==='true')?Math.max(1,Number(e.nombre_fois||1)):1;
    const per=String(e.periodicite_fractionnement||'mensuel').toLowerCase(),total=Math.abs(Number(e.montant||0));
    for(let i=0;i<n;i++){
      const achat=new Date(base);if(i){if(per==='annuel')achat.setFullYear(achat.getFullYear()+i);else achat.setMonth(achat.getMonth()+i);}
      const d=dernierJourMoisTresorerie20260901_(achat.getFullYear(),achat.getMonth());if(d<=reference||d>cible)continue;
      const m=-arrondiTresorerie_(total/n);
      if(out.some(x=>x.source==='evenement'&&String(x.sourceId||'')===String(e.id||'')&&Math.abs(new Date(x.date)-d)<43200000))continue;
      if(operationCouvrePrevisionTresorerie_(hard,d,m,e.libelle||''))continue;
      out.push({id:'eventcb:'+String(e.id||'')+':'+i,source:'evenement',sourceId:e.id||'',date:d.toISOString(),libelle:e.libelle||'Événement',categorie:e.categorie||'',compte:e.compte||'',montantSigne:m,certitude:'tres_probable',preuve:'Événement effectif · paiement CB : débit bancaire différé fin de mois',dateConventionnelle:false});
    }
  });
  return out;
}

/**
 * Produit tous les compléments CB compris entre la référence bancaire et la cible.
 * Si un Cerbère préchargé est fourni, il est réutilisé sans recalcul. Sinon le
 * comportement historique est conservé avec une seule charge Cerbère par trajectoire.
 */
function estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,cible,cerberePrecharge){
  const out=[],vus={};
  let c=cerberePrecharge||null;
  if(!c){
    try{
      const chargeur=typeof chargerCerbereV374==='function'?chargerCerbereV374:(typeof chargerCerbereV37==='function'?chargerCerbereV37:null);
      if(chargeur)c=chargeur();
    }catch(e){c=null;}
  }
  let ref=new Date(reference),garde=0;
  while(ref<cible&&garde++<12){
    const debit=prochaineDateDebitCbTresorerie20260901_(ref);
    if(!debit||isNaN(debit)||debit>cible)break;
    const cle=String(debit.getTime());
    if(vus[cle])break;
    vus[cle]=true;
    const ligne=estimationDebitCbDiffereTresorerie20260901V2_(ops,ref,cible,c);
    if(ligne)out.push(ligne);
    ref=new Date(debit.getTime()+1);
  }
  return out;
}

function estimationDebitCbDiffereTresorerie20260901V2_(ops,reference,cible,cerberePrecharge){
  const debit=prochaineDateDebitCbTresorerie20260901_(reference);if(debit>cible)return null;
  let partCerbere=0,moteurCerbere='',c=cerberePrecharge;
  try{
    if(arguments.length<4||!c){
      const chargeur=typeof chargerCerbereV374==='function'?chargerCerbereV374:(typeof chargerCerbereV37==='function'?chargerCerbereV37:null);
      if(chargeur)c=chargeur();
    }
    const periodes=c&&Array.isArray(c.periodes)?c.periodes:[];
    const p=periodes.find(pp=>{
      const finCycle=new Date((pp&&pp.periode||pp||{}).fin||0);
      return !isNaN(finCycle)&&finCycle.getFullYear()===debit.getFullYear()&&finCycle.getMonth()===debit.getMonth();
    })||null;
    if(p){
      const env=Array.isArray(p.enveloppes)?p.enveloppes:[];
      partCerbere=arrondiTresorerie_(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.resteV37!=null?x.resteV37:(Number(x&&x.prevu||0)-Number(x&&x.reelNetPrevisionnel||x&&x.reelImpute||0)-Number(x&&x.planifie||0)))||0),0));
      moteurCerbere=String(c&&c.version||'');
    }
  }catch(e){}
  const partFinMois=estimationQueueCbFinMoisTresorerie20260901_(ops,reference,debit);
  const residuel=arrondiTresorerie_(Math.max(0,partCerbere+partFinMois));if(residuel<=0)return null;
  return {
    id:'debit_cb_estime:'+debit.getTime(),source:'debit_cb_estime',sourceId:'cb:'+debit.getFullYear()+'-'+(debit.getMonth()+1),date:debit.toISOString(),
    libelle:'Complément estimé du débit CB différé',categorie:'Carte à débit différé',compte:'',montantSigne:-residuel,certitude:'estime',
    preuve:'Complément non encore connu : reste Cerbère du cycle aligné sur le débit + estimation marginale des jours 28-fin de mois',dateConventionnelle:false,
    partCerbere:partCerbere,partFinMois:partFinMois,moteurCerbere:moteurCerbere
  };
}

function recalculerSortieTresorerie20260901_(r,lignes,reference,cible){
  const variation=arrondiTresorerie_((lignes||[]).reduce((s,x)=>s+Number(x.montantSigne||0),0));
  const certain=arrondiTresorerie_((lignes||[]).filter(x=>x.certitude==='certain').reduce((s,x)=>s+Number(x.montantSigne||0),0));
  const tresProbable=arrondiTresorerie_((lignes||[]).filter(x=>['certain','tres_probable'].includes(x.certitude)).reduce((s,x)=>s+Number(x.montantSigne||0),0));
  r.version=TREASURY_FORECAST_DOCTRINE_20260901_VERSION;
  r.lignes=lignes;
  r.variationPrevue=variation;
  r.soldePrevisionnel=arrondiTresorerie_(Number(r.soldeReel||0)+variation);
  r.fourchette={certain:arrondiTresorerie_(Number(r.soldeReel||0)+certain),tresProbable:arrondiTresorerie_(Number(r.soldeReel||0)+tresProbable),toutesHypotheses:r.soldePrevisionnel};
  r.resume=resumeTresorerie20260831_(lignes);
  r.confiance=confianceTresorerie_(reference,cible,lignes);
  r.diagnostic20260831=r.diagnostic20260831||{};
  r.diagnostic20260831.passeTerminalePlanCb=true;
  r.diagnostic20260831.actionsPlanTresorerie='uniquement impact_confirme + statut Effectif/Effective';
  r.diagnostic20260831.debitCbDoctrine='tous les débits CB jusqu’à la cible ; chaque cycle Cerbère est aligné sur le mois de son débit';
  r.diagnostic20260831.optimisationCerbereCb='2026-09-10 : une seule charge Cerbère réutilisée pour tous les débits CB de la trajectoire';
  r.diagnostic20260831.suppressionCbLegacy20260831='2026-09-10.2 : estimation legacy neutralisée uniquement sur le chemin canonique 20260901';
  r.diagnostic20260831.reutilisationCerbereSnapshot='2026-09-10.3 : le snapshot peut fournir un Cerbère déjà calculé ; fallback autonome conservé';
  return r;
}