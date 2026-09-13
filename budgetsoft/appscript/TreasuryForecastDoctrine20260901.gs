const TREASURY_FORECAST_DOCTRINE_20260901_VERSION='2026-09-13.3';

function chargerSocleTresorerie20260831SansDebitCbLegacy20260910_(dateCible){
  if(typeof chargerTresoreriePrevisionnelle20260831!=='function')return null;
  if(typeof estimationDebitCbDiffereTresorerie20260901_!=='function')return chargerTresoreriePrevisionnelle20260831(dateCible);
  const legacy=estimationDebitCbDiffereTresorerie20260901_;
  try{estimationDebitCbDiffereTresorerie20260901_=function(){return null;};return chargerTresoreriePrevisionnelle20260831(dateCible);}finally{estimationDebitCbDiffereTresorerie20260901_=legacy;}
}
function chargerTresoreriePrevisionnelle20260901(dateCible,cerberePrecharge){
  const r=chargerSocleTresorerie20260831SansDebitCbLegacy20260910_(dateCible);if(!r||!r.ok)return r;
  const reference=new Date(r.dateReference||new Date()),cible=new Date(r.dateCible||new Date()),evenements=lireFeuilleDynamiquePlan_('Plan_Evenements'),actions=lireFeuilleDynamiquePlan_('Plan_Actions'),ops=lireTable_('Operations'),hard=(r.lignes||[]).filter(x=>x.source==='operation_future');
  let lignes=recalerFluxPlanCarteTresorerie20260901_(r.lignes||[],evenements,actions,hard,reference,cible);
  lignes=filtrerActionsPlanEffectivesTresorerie20260908_(lignes,actions).filter(x=>!['debit_cb_estime','ep_immediat_estime'].includes(String(x&&x.source||'')));
  const projectionEp=projectionEnvelopePilotableTresorerie20260913_(ops,reference,cible,cerberePrecharge);
  if(projectionEp.immediat)lignes.push(projectionEp.immediat);if(projectionEp.debitsCb.length)lignes.push.apply(lignes,projectionEp.debitsCb);
  lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));
  const out=recalculerSortieTresorerie20260901_(r,lignes,reference,cible);out.diagnostic20260831=out.diagnostic20260831||{};out.diagnostic20260831.cerberePrechargeProjection=!!cerberePrecharge;out.diagnostic20260831.enveloppePilotable20260913=projectionEp.diagnostic;return out;
}
function listerMouvementsFutursTresorerie20260901(dateCible){const r=chargerTresoreriePrevisionnelle20260901(dateCible||dateDansJoursTresorerie_(45));return{ok:r.ok,version:r.version,dateReference:r.dateReference,dateCible:r.dateCible,lignes:r.lignes||[],confiance:r.confiance,diagnostic20260831:r.diagnostic20260831||{}};}
function normaliserStatutActionTresorerie20260908_(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function actionPlanEffectiveTresorerie20260908_(a){if(!a)return false;const confirme=a.impact_confirme===true||String(a.impact_confirme)==='true',statut=normaliserStatutActionTresorerie20260908_(a.statut);return confirme&&['effective','effectif'].includes(statut);}
function filtrerActionsPlanEffectivesTresorerie20260908_(lignes,actions){const index=Object.fromEntries((actions||[]).map(a=>[String(a.id||''),a]));return(lignes||[]).filter(x=>String(x&&x.source||'')!=='action'||actionPlanEffectiveTresorerie20260908_(index[String(x.sourceId||'')]));}
function paiementCartePlanTresorerie20260901_(o){return /^(cb|carte|carte bancaire)$/i.test(String(o&&o.mode_paiement||'').trim());}
function recalerFluxPlanCarteTresorerie20260901_(lignes,evenements,actions,hard,reference,cible){
  const ev=Object.fromEntries((evenements||[]).map(x=>[String(x.id||''),x])),ac=Object.fromEntries((actions||[]).map(x=>[String(x.id||''),x])),out=[];
  (lignes||[]).forEach(x=>{const src=x.source==='evenement'?ev[String(x.sourceId||'')]:x.source==='action'?ac[String(x.sourceId||'')]:null;if(!src||Number(x.montantSigne||0)>=0||!paiementCartePlanTresorerie20260901_(src)){out.push(x);return;}const d0=new Date(x.date);if(isNaN(d0)){out.push(x);return;}const d=dernierJourMoisTresorerie20260901_(d0.getFullYear(),d0.getMonth());if(d<=reference||d>cible)return;if(operationCouvrePrevisionTresorerie_(hard,d,Number(x.montantSigne||0),x.libelle||''))return;out.push(Object.assign({},x,{date:d.toISOString(),preuve:String(x.preuve||'Flux Plan')+' · paiement CB : débit bancaire différé fin de mois'}));});
  (evenements||[]).forEach(e=>{if(!statutEffectifTresorerie20260831_(e.statut)||!paiementCartePlanTresorerie20260901_(e)||estSuspensionTemporaireTresorerie20260831_(e)||String(e.type||'').toLowerCase()!=='depense')return;const dr=datePlanTresorerie_(e,reference,false),base=dr.date;if(!base||isNaN(base))return;const n=(e.fractionne===true||String(e.fractionne)==='true')?Math.max(1,Number(e.nombre_fois||1)):1,per=String(e.periodicite_fractionnement||'mensuel').toLowerCase(),total=Math.abs(Number(e.montant||0));for(let i=0;i<n;i++){const achat=new Date(base);if(i){if(per==='annuel')achat.setFullYear(achat.getFullYear()+i);else achat.setMonth(achat.getMonth()+i);}const d=dernierJourMoisTresorerie20260901_(achat.getFullYear(),achat.getMonth());if(d<=reference||d>cible)continue;const m=-arrondiTresorerie_(total/n);if(out.some(x=>x.source==='evenement'&&String(x.sourceId||'')===String(e.id||'')&&Math.abs(new Date(x.date)-d)<43200000))continue;if(operationCouvrePrevisionTresorerie_(hard,d,m,e.libelle||''))continue;out.push({id:'eventcb:'+String(e.id||'')+':'+i,source:'evenement',sourceId:e.id||'',date:d.toISOString(),libelle:e.libelle||'Événement',categorie:e.categorie||'',compte:e.compte||'',montantSigne:m,certitude:'tres_probable',preuve:'Événement effectif · paiement CB : débit bancaire différé fin de mois',dateConventionnelle:false});}});return out;
}

/**
 * Le snapshot global fournit historiquement une base Cerbère brute à la projection.
 * Pour EP, une base brute n'est pas suffisante : la consommation pilotable doit avoir
 * traversé les mêmes corrections et propriétaires que le cockpit publié. On compose
 * donc le cockpit final depuis cette base avant de lire EP. Aucune formule parallèle.
 */
function cerbereProjectionEpTresorerie20260913_(cerberePrecharge){
  let c=cerberePrecharge||null;
  try{
    const p0=c&&Array.isArray(c.periodes)?c.periodes[0]:null;
    const estFinal=!!(p0&&p0.v37&&p0.v37.cockpit20260902&&c.diagnostic&&c.diagnostic.p1Doctrine20260912);
    if(c&&!estFinal&&typeof composerCerbereCockpitDepuisBaseSnapshotBudgetSoft20260910_==='function')c=composerCerbereCockpitDepuisBaseSnapshotBudgetSoft20260910_(c);
    if(!c){const chargeur=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902:(typeof chargerCerbereV374==='function'?chargerCerbereV374:null);if(chargeur)c=chargeur();}
    if(c&&typeof enrichirEnvelopePilotableBudgetSoft20260913_==='function')enrichirEnvelopePilotableBudgetSoft20260913_(c);
  }catch(e){c=null;}
  return c;
}
function projectionEnvelopePilotableTresorerie20260913_(ops,reference,cible,cerberePrecharge){
  const c=cerbereProjectionEpTresorerie20260913_(cerberePrecharge),ps=c&&Array.isArray(c.periodes)?c.periodes:[],p=ps[0]||null;
  if(!p||typeof calculerImpactPrevisionnelEpBudgetSoft20260913_!=='function')return{immediat:null,debitsCb:[],diagnostic:{version:'2026-09-13.3',ownerEp:false,abandonEstimation:true,raison:'propriétaire EP indisponible — aucune estimation heuristique de remplacement'}};
  const impact=calculerImpactPrevisionnelEpBudgetSoft20260913_(p,ops,reference),fin=dateCockpit20260902_(p&&p.periode&&p.periode.fin),immediatMontant=Math.max(0,Number(impact.immediat||0));let immediat=null;
  if(immediatMontant>0&&fin&&fin>reference&&fin<=cible)immediat={id:'ep_immediat_estime:'+p.clePilotage,source:'ep_immediat_estime',sourceId:String(p.clePilotage||''),date:fin.toISOString(),libelle:'Part immédiate estimée de l’EP restant',categorie:'Enveloppe pilotable',compte:'',montantSigne:-arrondiTresorerie_(immediatMontant),certitude:'estime',preuve:'Owner EP · part non CB estimée de l’EP non encore consommée ; Réel déjà engagé exclu',dateConventionnelle:true,ownerEp:BUDGETSOFT_EP_OWNER_20260913};
  const debitsCb=[];let ref=new Date(reference),garde=0,injecte=false;
  while(ref<cible&&garde++<12){const debit=prochaineDateDebitCbTresorerie20260901_(ref);if(!debit||isNaN(debit)||debit>cible)break;const queue=estimationQueueCbFinMoisTresorerie20260901_(ops,ref,debit),epPart=!injecte?Math.max(0,Number(impact.differe||0)):0,residuel=arrondiTresorerie_(Math.max(0,epPart+queue));if(residuel>0)debitsCb.push({id:'debit_cb_estime:'+debit.getTime(),source:'debit_cb_estime',sourceId:'cb:'+debit.getFullYear()+'-'+(debit.getMonth()+1),date:debit.toISOString(),libelle:'Complément estimé du débit CB différé',categorie:'Carte à débit différé',compte:'',montantSigne:-residuel,certitude:'estime',preuve:'Owner EP : part CB différée de l’EP restant + estimation marginale 28-fin ; Réel déjà engagé exclu',dateConventionnelle:false,partCerbere:arrondiTresorerie_(epPart),partEp:arrondiTresorerie_(epPart),partFinMois:arrondiTresorerie_(queue),moteurCerbere:String(c&&c.version||''),ownerEp:BUDGETSOFT_EP_OWNER_20260913,tauxDifferePct:Number(impact.tauxDifferePct||0)});injecte=true;ref=new Date(debit.getTime()+1);}
  return{immediat,debitsCb,diagnostic:{version:'2026-09-13.3',ownerEp:true,proprietaire:BUDGETSOFT_EP_OWNER_20260913,sourceCerbereFinal:!!(c&&c.diagnostic&&c.diagnostic.p1Doctrine20260912),ep:Number(impact.ep||0),consomme:Number(impact.consomme||0),resteAEngager:Number(impact.resteAEngager||0),immediat:Number(impact.immediat||0),differe:Number(impact.differe||0),tauxDifferePct:Number(impact.tauxDifferePct||0),reconciliation:Number(impact.reconciliation||0),profil:impact.profil||null}};
}
function estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,cible,cerberePrecharge){return projectionEnvelopePilotableTresorerie20260913_(ops,reference,cible,cerberePrecharge).debitsCb;}
function estimationDebitCbDiffereTresorerie20260901V2_(ops,reference,cible,cerberePrecharge){const xs=estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,cible,cerberePrecharge);return xs.length?xs[0]:null;}
function recalculerSortieTresorerie20260901_(r,lignes,reference,cible){const variation=arrondiTresorerie_((lignes||[]).reduce((s,x)=>s+Number(x.montantSigne||0),0)),certain=arrondiTresorerie_((lignes||[]).filter(x=>x.certitude==='certain').reduce((s,x)=>s+Number(x.montantSigne||0),0)),tresProbable=arrondiTresorerie_((lignes||[]).filter(x=>['certain','tres_probable'].includes(x.certitude)).reduce((s,x)=>s+Number(x.montantSigne||0),0));r.version=TREASURY_FORECAST_DOCTRINE_20260901_VERSION;r.lignes=lignes;r.variationPrevue=variation;r.soldePrevisionnel=arrondiTresorerie_(Number(r.soldeReel||0)+variation);r.fourchette={certain:arrondiTresorerie_(Number(r.soldeReel||0)+certain),tresProbable:arrondiTresorerie_(Number(r.soldeReel||0)+tresProbable),toutesHypotheses:r.soldePrevisionnel};r.resume=resumeTresorerie20260831_(lignes);r.confiance=confianceTresorerie_(reference,cible,lignes);r.diagnostic20260831=r.diagnostic20260831||{};r.diagnostic20260831.passeTerminalePlanCb=true;r.diagnostic20260831.actionsPlanTresorerie='uniquement impact_confirme + statut Effectif/Effective';r.diagnostic20260831.debitCbDoctrine='EP restant ventilé une seule fois : immédiat à la frontière + CB différée à la date de débit';r.diagnostic20260831.optimisationCerbereCb='Cerbère préchargé finalisé en cockpit avant lecture EP';r.diagnostic20260831.suppressionCbLegacy20260831='estimation legacy neutralisée sur le chemin canonique';r.diagnostic20260831.reutilisationCerbereSnapshot='snapshot peut fournir une base Cerbère, finalisée avant projection EP';return r;}
