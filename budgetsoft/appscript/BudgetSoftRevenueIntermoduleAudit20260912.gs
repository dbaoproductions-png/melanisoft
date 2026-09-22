const BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION='2026-09-12.2';

function arrRevenueFinal20260912_(n){return Math.round(Number(n||0)*100)/100;}
function normRevenueFinal20260912_(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function dateRevenueFinal20260912_(v){const d=v instanceof Date?new Date(v):new Date(v||0);if(isNaN(d))return null;d.setHours(0,0,0,0);return d;}
function isoRevenueFinal20260912_(v){const d=dateRevenueFinal20260912_(v);return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';}
function evenementClosProuveRevenueFinal20260912_(ev){
  if(!ev)return false;
  const statut=normRevenueFinal20260912_(ev.statut);
  if(['annule','annulee','abandonne','abandonnee'].includes(statut))return true;
  if(String(ev.operation_reelle_id||'').trim())return true;
  const rap=normRevenueFinal20260912_(ev.rapprochement_statut||'');
  return ['rapproche','rapprochee','realise','realisee'].includes(rap);
}
function evenementCertainEncoreDuRevenueFinal20260912_(ev){
  if(!ev||String(ev.type||'').trim().toLowerCase()!=='recette'||evenementClosProuveRevenueFinal20260912_(ev))return false;
  const s=normRevenueFinal20260912_(ev.statut);
  return ['effectif','effective','effectifs','effectives','realise a rapprocher','realisee a rapprocher'].includes(s);
}
function dateEvenementRevenueFinal20260912_(ev,reference){
  try{const dr=typeof datePlanTresorerie_==='function'?datePlanTresorerie_(ev,reference||new Date(),false):null;if(dr&&dr.date)return dateRevenueFinal20260912_(dr.date);}catch(e){}
  return dateRevenueFinal20260912_(ev&&(ev.date_effet||ev.date_prevue));
}
function evenementsCertainsDusCycleRevenueFinal20260912_(periode,reference){
  const debut=dateRevenueFinal20260912_(periode&&periode.debut),fin=dateRevenueFinal20260912_(periode&&periode.fin);if(!debut||!fin)return[];
  let evs=[];try{evs=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):[];}catch(e){return[];}
  return (evs||[]).filter(function(ev){if(!evenementCertainEncoreDuRevenueFinal20260912_(ev))return false;const d=dateEvenementRevenueFinal20260912_(ev,reference);return d&&d>=debut&&d<=fin;});
}

/* Propriété Rt1 transférée à CerbereRevenueDueOwner20260919.gs ; aucun override du lecteur historique. */

/* Projection bancaire : responsabilité transférée à BudgetSoftTreasuryCanonical20260907.gs. */

/* Dashboard : responsabilité transférée à BudgetSoftDashboardCanonicalOwner20260918.gs. */

/* Garde recettes transférée à BudgetSoftRevenueSupradoctrineCanonicalGuard20260918.gs. */

function auditerRecettesIntermodulesBudgetSoft20260912(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();if(!s||!s.disponible){const x={ok:false,version:BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION,erreur:'Snapshot global indisponible.'};console.log('[AUDIT recettes intermodules] '+JSON.stringify(x));return x;}
  const etat=s.etat||{},m=etat.modules||{},cer=m.cerbere||{},p=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},periode=p&&(p.periode||p)||{},garde=verifierSupradoctrineRecettesBudgetSoft20260912_(etat),cible=periode.fin||new Date();
  let unite={ok:false};try{const comptes=chargerTresorerieUnifieeBudgetSoft20260907(cible),banque=chargerTrajectoireBanqueCerbereRapide20260903(cible,cer),ref=dateRevenueFinal20260912_(comptes&&comptes.dateReference||new Date()),fin=dateRevenueFinal20260912_(cible);const filtrer=function(xs){return(xs||[]).filter(function(l){const d=dateRevenueFinal20260912_(l&&l.date);return d&&d>ref&&d<=fin;});};const sig=function(xs){return filtrer(xs).map(function(l){return[isoRevenueFinal20260912_(l&&l.date),String(l&&l.source||''),String(l&&l.sourceId||''),arrRevenueFinal20260912_(l&&l.montantSigne)].join('|');}).sort();};const a=sig(comptes&&comptes.lignes),b=sig(banque&&banque.lignes);unite={ok:String(comptes&&comptes.revisionBudgetSoft||'')===String(etat.revisionBudgetSoft||'')&&String(banque&&banque.revisionBudgetSoft||'')===String(etat.revisionBudgetSoft||'')&&JSON.stringify(a)===JSON.stringify(b),revisionComptes:String(comptes&&comptes.revisionBudgetSoft||''),revisionCerbere:String(banque&&banque.revisionBudgetSoft||''),nombreLignesComptes:a.length,nombreLignesCerbere:b.length,proprietaireComptes:String(comptes&&comptes.proprietaireBudgetSoft||''),sourceCerbere:String(banque&&banque.sourceBudgetSoft||'')};}catch(e){unite={ok:false,erreur:String(e&&e.message||e)};}
  const out={ok:garde.ok===true&&unite.ok===true,version:BUDGETSOFT_REVENUE_INTERMODULE_FINAL_20260912_VERSION,revisionBudgetSoft:String(etat.revisionBudgetSoft||''),cerbereRt1:arrRevenueFinal20260912_(v.rt1),dashboardRevenusAttendus:arrRevenueFinal20260912_(m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.revenusAttendus),gardePublication:garde,uniteProjectionComptesCerbere:unite};console.log('[AUDIT recettes intermodules] '+JSON.stringify(out));return out;
}


function auditerDoctrineRecettesPlanIntermodule20260922(){
  const arr=function(n){return Math.round(Number(n||0)*100)/100;},props=PropertiesService.getDocumentProperties();
  const etat=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
  if(!etat||!etat.modules){const out={ok:false,version:'2026-09-22.3',lectureSeule:true,erreur:'Snapshot global indisponible ou périmé.',fraicheur:typeof auditerFraicheurSnapshotGlobalBudgetSoft20260916==='function'?auditerFraicheurSnapshotGlobalBudgetSoft20260916():null};console.log('[AUDIT DOCTRINE RECETTES PLAN INTERMODULE 20260922] '+JSON.stringify(out));return out;}
  const m=etat.modules||{},dash=m.dashboard||{},ct=dash.courtTerme||{},cer=m.cerbere||{},proj=m.projectionEtendue||{},p0=Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p0&&p0.v37||{},periode=p0&&(p0.periode||p0)||{};
  const debut=new Date(periode.debut||0),fin=new Date(periode.fin||0),reference=new Date(proj.dateReference||etat.genereLe||new Date());
  const dus=typeof occurrencesRecettesCertainesDuesRevenuePublicationFix20260922_==='function'?occurrencesRecettesCertainesDuesRevenuePublicationFix20260922_(reference,debut,fin):[];
  const detailDus=dus.map(function(o){const d=new Date(o&&o.date_effet||o&&o.date_prevue||0);return{eventId:String(o&&o.eventId||o&&o.id||''),libelle:String(o&&o.libelle||''),occurrence:Number(o&&o.occurrence||1),occurrences:Number(o&&o.occurrences||1),montant:arr(Math.abs(Number(o&&o.montant||0))),datePrevue:isNaN(d)?'':Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'),enRetard:!isNaN(reference)&&!isNaN(d)&&d<=reference};});
  const totalDu=arr(detailDus.reduce(function(s,o){return s+Number(o.montant||0);},0));
  let reelSource=null;try{reelSource=typeof revenusConstatesCycleCerbereRevenueDueOwner20260922_==='function'?revenusConstatesCycleCerbereRevenueDueOwner20260922_(debut,fin):null;}catch(e){}
  const revenusConstates=arr(ct.revenusConstates),revenusAttendus=arr(ct.revenusAttendus),resteDashboard=arr(revenusAttendus-revenusConstates),rt1=arr(v.rt1),reelOwner=arr(reelSource&&reelSource.total),rt1Attendu=arr(reelOwner+totalDu);
  const lignes=Array.isArray(proj.lignes)?proj.lignes:[],lignesR0Courant=lignes.filter(function(l){if(String(l&&l.source||'')!=='revenu_recurrent')return false;const d=new Date(l&&l.date||0);return !isNaN(d)&&!isNaN(reference)&&!isNaN(fin)&&d>reference&&d<=fin;});
  const lignesEvenementsCourant=lignes.filter(function(l){if(String(l&&l.source||'')!=='evenement'||Number(l&&l.montantSigne||0)<=0)return false;const d=new Date(l&&l.date||0);return !isNaN(d)&&!isNaN(reference)&&!isNaN(fin)&&d>reference&&d<=fin;});
  const totalEvenementsProjection=arr(lignesEvenementsCourant.reduce(function(s,l){return s+Number(l&&l.montantSigne||0);},0));

  let canon=[],actualParCat=reelSource&&reelSource.detail||{},ancienneDoctrine=[];
  try{canon=typeof chargerCanonRecettesCerbereV1==='function'?(chargerCanonRecettesCerbereV1().postes||[]):[];}catch(e){canon=[];}
  canon.forEach(function(x){const cat=String(x&&x.categorie||''),r=Number(actualParCat[cat]||0),k=Math.max(0,Number(x&&x.montant||0)),complement=r>0?Math.max(0,k-r):k;if(complement>0)ancienneDoctrine.push({categorie:cat,canon:arr(k),reel:arr(r),complementImpliciteAncienneDoctrine:arr(complement)});});
  const totalAncienComplement=arr(ancienneDoctrine.reduce(function(s,x){return s+Number(x.complementImpliciteAncienneDoctrine||0);},0));

  const controles=[
    {code:'RT1_FORMULE_REEL_PLUS_DU',ok:Math.abs(rt1-rt1Attendu)<=.01,detail:{rt1:rt1,reelOwner:reelOwner,totalPlanDu:totalDu,attendu:rt1Attendu}},
    {code:'DASHBOARD_RESTE_EGAL_PLAN_DU',ok:Math.abs(resteDashboard-totalDu)<=.01,detail:{revenusConstates:revenusConstates,revenusAttendus:revenusAttendus,resteDashboard:resteDashboard,totalPlanDu:totalDu}},
    {code:'RT1_EGAL_DASHBOARD',ok:Math.abs(rt1-revenusAttendus)<=.01,detail:{rt1:rt1,dashboard:revenusAttendus}},
    {code:'AUCUN_R0_IMPLICITE_CYCLE_COURANT',ok:lignesR0Courant.length===0,detail:{nombre:lignesR0Courant.length,lignes:lignesR0Courant.map(function(x){return{sourceId:x.sourceId,date:x.date,montant:x.montantSigne};})}},
    {code:'PROJECTION_PLAN_DU_COHERENTE',ok:Math.abs(totalEvenementsProjection-totalDu)<=.01,detail:{projectionEvenements:totalEvenementsProjection,totalPlanDu:totalDu,lignes:lignesEvenementsCourant.map(function(x){return{sourceId:x.sourceId,occurrence:x.occurrence||1,date:x.date,montant:x.montantSigne,enRetard:!!x.enRetard};})}},
    {code:'SNAPSHOT_POSTERIEUR_DERNIER_PLAN',ok:!String(props.getProperty('PLAN_DERNIER_RECALCUL')||'')||String(etat.genereLe||'')>=String(props.getProperty('PLAN_DERNIER_RECALCUL')||''),detail:{planDernier:String(props.getProperty('PLAN_DERNIER_RECALCUL')||''),snapshotGenereLe:String(etat.genereLe||'')}}
  ];
  const out={ok:controles.every(function(x){return x.ok;}),version:'2026-09-22.2',lectureSeule:true,revisionBudgetSoft:String(etat.revisionBudgetSoft||''),genereLe:String(etat.genereLe||''),periode:{debut:periode.debut||'',fin:periode.fin||'',dateReference:proj.dateReference||''},recettes:{revenusConstatesDashboard:revenusConstates,reelOwner:reelOwner,revenusAttendus:revenusAttendus,resteDashboard:resteDashboard,totalPlanDu:totalDu,rt1Attendu:rt1Attendu,detailDus:detailDus},diagnosticAncienneDoctrine:{information:'Diagnostic explicatif uniquement ; ces compléments R0 ne doivent plus alimenter le cycle courant.',complements:ancienneDoctrine,totalComplement:totalAncienComplement},fraicheur:{planDernier:String(props.getProperty('PLAN_DERNIER_RECALCUL')||''),planOrigine:String(props.getProperty('PLAN_DERNIERE_ORIGINE')||'')},controles:controles};
  console.log('[AUDIT DOCTRINE RECETTES PLAN INTERMODULE 20260922] '+JSON.stringify(out));return out;
}






function auditerDoctrineActionsRecevoirBudgetSoft20260922(){
  const actions=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Actions'):[];
  const recevoir=(actions||[]).filter(function(a){return String(a&&a.fonction_plan||'').toUpperCase()==='RECEVOIR';});
  const etat=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
  const modules=etat&&etat.modules||{},cerbere=modules.cerbere||{},projection=modules.projectionEtendue||{};
  const ids=new Set(recevoir.map(function(a){return String(a&&a.id||'');}).filter(Boolean));
  const lignesCerbere=[];
  (cerbere.periodes||[]).forEach(function(p,i){
    const ls=p&&p.v37&&Array.isArray(p.v37.actionsEvenementsCycle)?p.v37.actionsEvenementsCycle:[];
    ls.forEach(function(x){if(ids.has(String(x&&x.id||'')))lignesCerbere.push({periode:i+1,source:x.source,cible:x.cible,montant:x.montant,montantSigne:x.montantSigne,statut:x.statut,id:x.id,libelle:x.libelle});});
  });
  const lignesProjection=(projection.lignes||[]).filter(function(x){return ids.has(String(x&&x.sourceId||''))||ids.has(String(x&&x.id||''));});
  let paquet=null;
  try{paquet=typeof evaluerToutesActionsPlanV56_==='function'?evaluerToutesActionsPlanV56_(recevoir):null;}catch(e){paquet={erreur:String(e&&e.message||e)};}
  const mesures=paquet&&paquet.mesures||[];
  const controles=[
    {code:'AUCUNE_ACTION_RECEVOIR_DANS_RT1',ok:lignesCerbere.every(function(x){return String(x.cible||'')!=='recette'&&Math.abs(Number(x.montantSigne||0))<.011;}),detail:lignesCerbere},
    {code:'AUCUNE_ACTION_RECEVOIR_DANS_PROJECTION_BANCAIRE',ok:lignesProjection.length===0,detail:lignesProjection},
    {code:'MESURE_PAR_REEL_DISPONIBLE',ok:mesures.length===recevoir.length,detail:mesures},
    {code:'AUCUN_FALLBACK_GLOBAL_SANS_PREUVE',ok:mesures.every(function(m){const a=recevoir.find(function(x){return String(x.id)===String(m.id);})||{},mm=m&&m.mesure||{},mode=String(a.mode_preuve_reception||'operation_distincte');if(Number(mm.realise||0)<=0)return true;if(mode==='integre_salaire')return (mm.preuves||[]).length>0&&(mm.preuves||[]).every(function(p){return String(p&&p.type||'')==='salaire_preuve_activation'&&String(p&&p.categorie||'')==='Salaires';});if(String(a.categorie||'').trim())return (mm.preuves||[]).every(function(p){return String(p&&p.categorie||'')===String(a.categorie||'');});return (mm.preuves||[]).length>0;}),detail:mesures.map(function(m){const a=recevoir.find(function(x){return String(x.id)===String(m.id);})||{};return{id:m.id,libelle:m.libelle,categorie:a.categorie||'',mode_preuve:a.mode_preuve_reception||'operation_distincte',cible:Number(a.cible_valeur||a.impact_montant||0),realise:m.mesure&&m.mesure.realise||0,preuves:m.mesure&&m.mesure.preuves||[]};})},
    {code:'PREUVE_SALAIRE_NE_DOUBLE_COMPTE_PAS',ok:mesures.every(function(m){const a=recevoir.find(function(x){return String(x.id)===String(m.id);})||{},mm=m&&m.mesure||{};if(String(a.mode_preuve_reception||'')!=='integre_salaire')return true;const cible=Math.max(0,Number(a.cible_valeur||a.impact_montant||0)),realise=Math.max(0,Number(mm.realise||0));return realise<=cible+.011&&(realise===0||Math.abs(realise-cible)<=.011);}),detail:mesures.map(function(m){const a=recevoir.find(function(x){return String(x.id)===String(m.id);})||{};return{id:m.id,mode_preuve:a.mode_preuve_reception||'operation_distincte',cible:Number(a.cible_valeur||a.impact_montant||0),realise:m.mesure&&m.mesure.realise||0};})}
  ];
  const out={ok:controles.every(function(x){return x.ok;}),version:'2026-09-22.2',lectureSeule:true,actionsRecevoir:recevoir.map(function(a){return{id:a.id,libelle:a.libelle,statut:a.statut,categorie:a.categorie,cible:Number(a.cible_valeur||a.impact_montant||0),frequence:a.impact_frequence,date_effet:a.date_effet,condition:a.condition_libelle||'',condition_statut:a.condition_statut||'',impact_confirme:a.impact_confirme,mode_preuve_reception:a.mode_preuve_reception||'operation_distincte'};}),controles:controles,revisionBudgetSoft:etat&&etat.revisionBudgetSoft||'',genereLe:etat&&etat.genereLe||''};
  console.log('[AUDIT DOCTRINE ACTIONS RECEVOIR 20260922] '+JSON.stringify(out));return out;
}
