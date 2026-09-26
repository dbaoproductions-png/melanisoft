const TREASURY_FORECAST_DOCTRINE_20260901_VERSION='2026-09-25.1';

function chargerSocleTresorerie20260831SansDebitCbLegacy20260910_(dateCible,ctx){
  if(typeof chargerTresoreriePrevisionnelle20260831!=='function')return null;
  if(typeof estimationDebitCbDiffereTresorerie20260901_!=='function')return chargerTresoreriePrevisionnelle20260831(dateCible,ctx);
  const legacy=estimationDebitCbDiffereTresorerie20260901_;
  try{estimationDebitCbDiffereTresorerie20260901_=function(){return null;};return chargerTresoreriePrevisionnelle20260831(dateCible,ctx);}finally{estimationDebitCbDiffereTresorerie20260901_=legacy;}
}
function filtrerRevenusCanonCycleCourantTresorerie20260922_(lignes,reference){
  const ref=reference instanceof Date?new Date(reference):new Date(reference||0);if(isNaN(ref))return(lignes||[]).slice();
  const fin=typeof dateFinCycleCanonBudgetSoft20260906_==='function'
    ?dateFinCycleCanonBudgetSoft20260906_(ref)
    :new Date(ref.getDate()<=27?ref.getFullYear():ref.getFullYear(),ref.getDate()<=27?ref.getMonth():ref.getMonth()+1,27);
  fin.setHours(23,59,59,999);
  return(lignes||[]).filter(function(x){
    if(String(x&&x.source||'')!=='revenu_recurrent')return true;
    const d=new Date(x&&x.date||0);if(isNaN(d))return true;
    return !(d>ref&&d<=fin);
  });
}

function chargerTresoreriePrevisionnelle20260901(dateCible,cerberePrecharge,ctx){
  const r=chargerSocleTresorerie20260831SansDebitCbLegacy20260910_(dateCible,ctx);if(!r||!r.ok)return r;
  const reference=new Date(r.dateReference||new Date()),cible=new Date(r.dateCible||new Date()),evenements=lireFeuilleDynamiquePlan_('Plan_Evenements'),actions=lireFeuilleDynamiquePlan_('Plan_Actions'),ops=lireTable_('Operations'),hard=(r.lignes||[]).filter(x=>x.source==='operation_future');
  let lignes=recalerFluxPlanCarteTresorerie20260901_(r.lignes||[],evenements,actions,hard,reference,cible);
  lignes=filtrerRevenusCanonCycleCourantTresorerie20260922_(lignes,reference);
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
const BUDGETSOFT_CB_PREVISION_CALIBRATION_20260925=1950;
const BUDGETSOFT_CB_PREVISION_CALIBRATION_MOIS_20260925='2026-09';

function totalCbConnuPourDebitTresorerie20260925_(ops,debit){
  const y=debit.getFullYear(),m=debit.getMonth();
  return arrondiTresorerie_((ops||[]).reduce((s,o)=>{
    if(!estOperationCarteTresorerie20260901_(o))return s;
    if(/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||'')))return s;
    const montant=Number(o&&o.montant||0);if(!(montant<0))return s;
    const d=typeof dateOpTresorerie_==='function'?dateOpTresorerie_(o):new Date(o&&o.date_comptable||o&&o.date||0);
    if(!d||isNaN(d)||d.getFullYear()!==y||d.getMonth()!==m)return s;
    return s+Math.abs(montant);
  },0));
}

function cibleCbMensuelleGlissanteTresorerie20260925_(ops,debit){
  const calibration=new Date(2026,8,1,12,0,0,0),fin=new Date(debit.getFullYear(),debit.getMonth(),1,12,0,0,0);
  const valeurs=[BUDGETSOFT_CB_PREVISION_CALIBRATION_20260925],historique=[];
  let d=new Date(calibration.getFullYear(),calibration.getMonth(),1,12,0,0,0),guard=0;
  while(d<fin&&guard++<24){
    const prochain=new Date(d.getFullYear(),d.getMonth()+1,1,12,0,0,0);
    // Septembre 2026 est la période d'étalonnage : sa réalisation ne devient
    // disponible pour la cible suivante qu'une fois le mois clos.
    const total=totalCbConnuPourDebitTresorerie20260925_(ops,new Date(d.getFullYear(),d.getMonth()+1,0,12,0,0,0));
    if(total>0){valeurs.push(total);historique.push({mois:Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM'),total:total});}
    d=prochain;
  }
  const fenetre=valeurs.slice(-4),cible=arrondiTresorerie_(fenetre.reduce((s,x)=>s+x,0)/Math.max(1,fenetre.length));
  return{cible:cible,calibration:BUDGETSOFT_CB_PREVISION_CALIBRATION_20260925,fenetre:fenetre,historique:historique};
}

function projectionEnvelopePilotableTresorerie20260913_(ops,reference,cible,cerberePrecharge){
  const c=cerbereProjectionEpTresorerie20260913_(cerberePrecharge),ps=c&&Array.isArray(c.periodes)?c.periodes:[];
  const courant=ps[0]||null;
  let impactCourant=null,immediat=null;

  if(courant&&typeof calculerImpactPrevisionnelEpBudgetSoft20260913_==='function'){
    impactCourant=calculerImpactPrevisionnelEpBudgetSoft20260913_(courant,ops,reference);
    const fin=dateCockpit20260902_(courant&&courant.periode&&courant.periode.fin);
    const immediatMontant=Math.max(0,Number(impactCourant&&impactCourant.immediat||0));
    if(immediatMontant>0&&fin&&fin>reference&&fin<=cible)immediat={
      id:'ep_immediat_estime:'+courant.clePilotage,
      source:'ep_immediat_estime',
      sourceId:String(courant.clePilotage||''),
      date:fin.toISOString(),
      libelle:'Part non CB estimée de l’EP restant',
      categorie:'Enveloppe pilotable',
      compte:'',
      montantSigne:-arrondiTresorerie_(immediatMontant),
      certitude:'estime',
      preuve:'EP décidé - Réel pilotable ; 10 % du reliquat projeté hors CB différée',
      dateConventionnelle:true,
      ownerEp:BUDGETSOFT_EP_OWNER_20260913,
      tauxCbPilotablePct:90
    };
  }

  /*
   * Doctrine bancaire :
   * - les achats CB déjà réels restent des lignes certaines à leur date de débit ;
   * - ils ont déjà consommé l'EP et ne sont donc jamais soustraits une seconde fois ;
   * - pour chaque cycle Cerbère disponible, 90 % de l'EP restant est projeté
   *   au prochain débit CB ;
   * - les charges fixes CB sont hors EP et restent au propriétaire Charges_fixes ;
   * - 1 950 € reste seulement un étalon statistique de cohérence, jamais un plafond
   *   ni une cible qui modifie le calcul.
   */
  const debitsCb=[],diagnosticsCycles=[];
  (ps||[]).forEach(function(p,index){
    if(!p||typeof calculerImpactPrevisionnelEpBudgetSoft20260913_!=='function')return;
    const periode=p.periode||p,fin=dateCockpit20260902_(periode&&periode.fin);
    if(!fin)return;
    const impact=index===0&&impactCourant?impactCourant:calculerImpactPrevisionnelEpBudgetSoft20260913_(p,ops,reference);
    const debit=prochaineDateDebitCbTresorerie20260901_(fin);
    if(!debit||isNaN(debit)||debit<=reference||debit>cible)return;
    const residuel=arrondiTresorerie_(Math.max(0,Number(impact&&impact.differe||0)));
    const connu=totalCbConnuPourDebitTresorerie20260925_(ops,debit);
    const totalProjete=arrondiTresorerie_(connu+residuel);
    const ecartEtalon=arrondiTresorerie_(totalProjete-BUDGETSOFT_CB_PREVISION_CALIBRATION_20260925);
    diagnosticsCycles.push({
      index:index+1,
      cle:String(p.clePilotage||''),
      finCycle:Utilities.formatDate(fin,Session.getScriptTimeZone(),'yyyy-MM-dd'),
      dateDebit:Utilities.formatDate(debit,Session.getScriptTimeZone(),'yyyy-MM-dd'),
      ep:Number(impact&&impact.ep||0),
      consomme:Number(impact&&impact.consomme||0),
      resteAEngager:Number(impact&&impact.resteAEngager||0),
      cbDejaConnue:connu,
      cbEstimeeSurEp:residuel,
      totalCbProjete:totalProjete,
      etalon1950:BUDGETSOFT_CB_PREVISION_CALIBRATION_20260925,
      ecartEtalon:ecartEtalon
    });
    if(residuel<=0)return;
    debitsCb.push({
      id:'debit_cb_estime:'+debit.getTime()+':ep:'+String(p.clePilotage||index),
      source:'debit_cb_estime',
      sourceId:'cb:'+debit.getFullYear()+'-'+(debit.getMonth()+1),
      date:debit.toISOString(),
      libelle:'Part CB différée estimée de l’EP restant',
      categorie:'Carte à débit différé',
      compte:'',
      montantSigne:-residuel,
      certitude:'estime',
      preuve:'EP décidé - Réel pilotable ; 90 % du reliquat projeté en CB différée ; charges fixes CB exclues',
      dateConventionnelle:false,
      ep:Number(impact&&impact.ep||0),
      epConsomme:Number(impact&&impact.consomme||0),
      epRestant:Number(impact&&impact.resteAEngager||0),
      tauxCbPilotablePct:90,
      cbDejaEngage:connu,
      residuelCb:residuel,
      calibrationCb:BUDGETSOFT_CB_PREVISION_CALIBRATION_20260925,
      ecartEtalon1950:ecartEtalon,
      partCerbere:residuel,
      partEp:residuel,
      partFinMois:0,
      moteurCerbere:String(c&&c.version||''),
      ownerCb:'ep_restant_90pct_20260925'
    });
  });

  return{
    immediat:immediat,
    debitsCb:debitsCb,
    diagnostic:{
      version:'2026-09-25.2',
      ownerEp:!!(courant&&impactCourant),
      proprietaireEp:typeof BUDGETSOFT_EP_OWNER_20260913!=='undefined'?BUDGETSOFT_EP_OWNER_20260913:'',
      ownerCb:'ep_restant_90pct_20260925',
      doctrineCb:'CB bancaire = achats réels déjà connus + 90 % de l’EP restant ; charges fixes CB hors EP ; 1 950 € = étalon de contrôle uniquement',
      calibrationCb:BUDGETSOFT_CB_PREVISION_CALIBRATION_20260925,
      ep:Number(impactCourant&&impactCourant.ep||0),
      consomme:Number(impactCourant&&impactCourant.consomme||0),
      resteAEngager:Number(impactCourant&&impactCourant.resteAEngager||0),
      immediat:Number(impactCourant&&impactCourant.immediat||0),
      differe:Number(impactCourant&&impactCourant.differe||0),
      differeEpDiagnostic:Number(impactCourant&&impactCourant.differe||0),
      tauxDifferePct:Number(impactCourant&&impactCourant.tauxDifferePct||0),
      tauxObservePct:Number(impactCourant&&impactCourant.tauxObservePct||0),
      reconciliation:Number(impactCourant&&impactCourant.reconciliation||0),
      profil:impactCourant&&impactCourant.profil||null,
      cycles:diagnosticsCycles
    }
  };
}
function estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,cible,cerberePrecharge){return projectionEnvelopePilotableTresorerie20260913_(ops,reference,cible,cerberePrecharge).debitsCb;}
function estimationDebitCbDiffereTresorerie20260901V2_(ops,reference,cible,cerberePrecharge){const xs=estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,cible,cerberePrecharge);return xs.length?xs[0]:null;}
function recalculerSortieTresorerie20260901_(r,lignes,reference,cible){const variation=arrondiTresorerie_((lignes||[]).reduce((s,x)=>s+Number(x.montantSigne||0),0)),certain=arrondiTresorerie_((lignes||[]).filter(x=>x.certitude==='certain').reduce((s,x)=>s+Number(x.montantSigne||0),0)),tresProbable=arrondiTresorerie_((lignes||[]).filter(x=>['certain','tres_probable'].includes(x.certitude)).reduce((s,x)=>s+Number(x.montantSigne||0),0));r.version=TREASURY_FORECAST_DOCTRINE_20260901_VERSION;r.lignes=lignes;r.variationPrevue=variation;r.soldePrevisionnel=arrondiTresorerie_(Number(r.soldeReel||0)+variation);r.fourchette={certain:arrondiTresorerie_(Number(r.soldeReel||0)+certain),tresProbable:arrondiTresorerie_(Number(r.soldeReel||0)+tresProbable),toutesHypotheses:r.soldePrevisionnel};r.resume=resumeTresorerie20260831_(lignes);r.confiance=confianceTresorerie_(reference,cible,lignes);r.diagnostic20260831=r.diagnostic20260831||{};r.diagnostic20260831.passeTerminalePlanCb=true;r.diagnostic20260831.actionsPlanTresorerie='uniquement impact_confirme + statut Effectif/Effective';r.diagnostic20260831.revenusR0CycleCourant='aucune créance implicite R0 dans le cycle courant ; R0 reprend à partir du cycle suivant';r.diagnostic20260831.debitCbDoctrine='CB bancaire : achats réels déjà connus + 90 % de l’EP restant ; charges fixes CB séparées ; 1 950 € conservé comme étalon statistique uniquement';r.diagnostic20260831.optimisationCerbereCb='Cerbère préchargé finalisé en cockpit avant lecture EP';r.diagnostic20260831.suppressionCbLegacy20260831='estimation legacy neutralisée sur le chemin canonique';r.diagnostic20260831.reutilisationCerbereSnapshot='snapshot peut fournir une base Cerbère, finalisée avant projection EP';return r;}
