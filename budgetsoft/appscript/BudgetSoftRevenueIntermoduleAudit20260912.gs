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


function auditerSimulationFractionnementPlan30020260922(){
  const arr=function(n){return Math.round(Number(n||0)*100)/100;};
  const ev={id:'SIMULATION_300_TENNIS',libelle:'Règlement cours de tennis collectif',type:'depense',categorie:'Loisirs',montant:300,date_effet:'2026-10-15',certitude:'certaine',statut:'Prévu',mode_paiement:'Chèque',fractionne:true,nombre_fois:3,periodicite_fractionnement:'mensuel',rapprochements_occurrences_json:''};
  const brut=occurrencesEvenementEtatBudgetSoft20260922_(ev);
  const clone=Object.assign({},ev,{statut:'Partiellement rapproché',rapprochement_statut:'Partiel',rapprochements_occurrences_json:JSON.stringify({'1':{operation_id:'SIM_OP_1',montant_reel:100,date_realisation:'2026-10-15',rapproche_le:'2026-10-15T12:00:00.000Z'}})});
  const apres=occurrencesEvenementEtatBudgetSoft20260922_(clone),ouvertes=apres.filter(function(o){return !o.rapprochee;});
  const reference=new Date('2026-09-22T12:00:00'),cycles=[
    {debut:new Date('2026-08-28T00:00:00'),fin:new Date('2026-09-27T23:59:59')},
    {debut:new Date('2026-09-28T00:00:00'),fin:new Date('2026-10-27T23:59:59')},
    {debut:new Date('2026-10-28T00:00:00'),fin:new Date('2026-11-27T23:59:59')},
    {debut:new Date('2026-11-28T00:00:00'),fin:new Date('2026-12-27T23:59:59')}
  ];
  const repartition=cycles.map(function(p,i){
    return brut.filter(function(o){
      const d=new Date(o&&o.date||0);if(isNaN(d))return false;
      return d>=p.debut&&d<=p.fin;
    }).map(function(o){return{occurrence:Number(o.index||1),montantSigne:-arr(o.montant),date:String(o.date).slice(0,10),categorie:'Loisirs'};});
  });

  const effetsCerbere=cycles.map(function(p){
    if(typeof construireEffetsCycleV3712_!=='function')return null;
    return construireEffetsCycleV3712_([], [ev], {}, p, new Set(['Loisirs']), {'Loisirs':'depense'});
  });
  const lignesPrevisionnelles=typeof construireLignesPrevisionnellesV4_==='function'?construireLignesPrevisionnellesV4_([], [ev]):[];
  const lignesTennis=(lignesPrevisionnelles||[]).filter(function(x){return String(x&&x.source_id||'')==='SIMULATION_300_TENNIS';});
  const totalSeptembre=arr(lignesTennis.filter(function(x){return Number(x&&x.periode||0)===1;}).reduce(function(s,x){return s+Number(x&&x.montant||0);},0));
  const totalOct=arr(lignesTennis.filter(function(x){return Number(x&&x.periode||0)===2;}).reduce(function(s,x){return s+Number(x&&x.montant||0);},0));
  const totalNov=arr(lignesTennis.filter(function(x){return Number(x&&x.periode||0)===3;}).reduce(function(s,x){return s+Number(x&&x.montant||0);},0));
  const totalDec=arr(lignesTennis.filter(function(x){return Number(x&&x.periode||0)===4;}).reduce(function(s,x){return s+Number(x&&x.montant||0);},0));

  const controles=[
    {code:'TYPE_DEPENSE_LOISIRS',ok:ev.type==='depense'&&ev.categorie==='Loisirs',detail:{type:ev.type,categorie:ev.categorie}},
    {code:'TROIS_OCCURRENCES',ok:brut.length===3,detail:brut},
    {code:'MONTANTS_100_100_100',ok:JSON.stringify(brut.map(function(o){return arr(o.montant);}))===JSON.stringify([100,100,100]),detail:brut.map(function(o){return arr(o.montant);})},
    {code:'DATES_OCT_NOV_DEC',ok:JSON.stringify(brut.map(function(o){return String(o.date).slice(0,10);}))===JSON.stringify(['2026-10-15','2026-11-15','2026-12-15']),detail:brut.map(function(o){return o.date;})},
    {code:'SIGNES_NEGATIFS',ok:JSON.stringify(repartition.slice(1).map(function(x){return x[0]&&x[0].montantSigne;}))===JSON.stringify([-100,-100,-100]),detail:repartition},
    {code:'AUCUN_IMPACT_CYCLE_SEPTEMBRE',ok:repartition[0].length===0&&Math.abs(totalSeptembre)<=.01,detail:{repartition:repartition[0],lignePlan:totalSeptembre}},
    {code:'UNE_OCCURRENCE_PAR_CYCLE_FUTUR',ok:repartition[1].length===1&&repartition[2].length===1&&repartition[3].length===1,detail:repartition},
    {code:'PLAN_MONTANT_BUDGETAIRE_POSITIF_100_PAR_CYCLE',ok:Math.abs(totalOct-100)<=.01&&Math.abs(totalNov-100)<=.01&&Math.abs(totalDec-100)<=.01,detail:{octobre:totalOct,novembre:totalNov,decembre:totalDec,lignes:lignesTennis}},
    {code:'PLAN_MONTANT_SIGNE_NEGATIF_100_PAR_CYCLE',ok:JSON.stringify(lignesTennis.map(function(x){return Number(x&&x.montantSigne||0);}))===JSON.stringify([-100,-100,-100]),detail:lignesTennis.map(function(x){return{periode:x.periode,montant:x.montant,montantSigne:x.montantSigne,conventionMontant:x.conventionMontant};})},
    {code:'AUCUN_IMPACT_RT1',ok:effetsCerbere.filter(Boolean).every(function(e){return Math.abs(Number(e.recettesPrevisionnelles||0))<=.01;}),detail:effetsCerbere.map(function(e){return e?{recettesPrevisionnelles:e.recettesPrevisionnelles,resume:e.resume}:null;})},
    {code:'DEPENSE_PILOTABLE_LOISIRS',ok:[1,2,3].every(function(i){const e=effetsCerbere[i];return !!(e&&Array.isArray(e.lignes)&&e.lignes.length===1&&String(e.lignes[0].cible)==='pilotable'&&Math.abs(Number(e.lignes[0].montantSigne||0)+100)<=.01&&String(e.lignes[0].categorie)==='Loisirs');}),detail:effetsCerbere.map(function(e){return e&&e.lignes||[];})},
    {code:'PAS_CHARGE_FIXE_NI_HORS_PILOTABLE',ok:[1,2,3].every(function(i){const e=effetsCerbere[i];return !!(e&&Math.abs(Number(e.chargesEviteesPrevisionnelles||0))<=.01&&Math.abs(Number(e.haussesChargesPrevisionnelles||0))<=.01&&Math.abs(Number(e.sortiesHorsPilotablePrevisionnelles||0))<=.01);}),detail:effetsCerbere.map(function(e){return e?{chargesEvitees:e.chargesEviteesPrevisionnelles,haussesCharges:e.haussesChargesPrevisionnelles,sortiesHorsPilotable:e.sortiesHorsPilotablePrevisionnelles}:null;})},
    {code:'PREMIER_RAPPROCHEMENT_NE_CLOT_PAS_LES_AUTRES',ok:apres.length===3&&apres[0].rapprochee===true&&ouvertes.length===2&&ouvertes.every(function(o){return Number(o.index)>1;}),detail:{apres:apres,ouvertes:ouvertes}}
  ];

  const out={ok:controles.every(function(x){return x.ok;}),version:'2026-09-22.2',lectureSeule:true,aucuneEcriture:true,evenementSimule:ev,controles:controles};
  console.log('[AUDIT SIMULATION FRACTIONNEMENT PLAN 300 20260922] '+JSON.stringify(out));return out;
}


function auditerEvenementTennisReel20260922(){
  const arr=function(n){return Math.round(Number(n||0)*100)/100;};
  let evs=[];try{evs=lireFeuilleDynamiquePlan_('Plan_Evenements')||[];}catch(e){evs=[];}
  const candidats=evs.filter(function(e){
    const lib=String(e&&e.libelle||'').trim().toLowerCase();
    return lib.indexOf('tennis')>=0&&String(e&&e.type||'').trim().toLowerCase()==='depense'&&Math.abs(Number(e&&e.montant||0)-300)<.011;
  }).sort(function(a,b){return String(b&&b.modifie_le||b&&b.dernier_recalcul||'').localeCompare(String(a&&a.modifie_le||a&&a.dernier_recalcul||''));});
  const ev=candidats[0]||null;
  if(!ev){
    const out={ok:false,version:'2026-09-22.1',lectureSeule:true,erreur:'Événement tennis 300 € introuvable dans Plan_Evenements.'};
    console.log('[AUDIT EVENEMENT TENNIS REEL 20260922] '+JSON.stringify(out));return out;
  }

  const occ=typeof occurrencesEvenementEtatBudgetSoft20260922_==='function'?occurrencesEvenementEtatBudgetSoft20260922_(ev):[];
  const etat=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
  const m=etat&&etat.modules||{},cer=m.cerbere||{},proj=m.projectionEtendue||{},periodes=Array.isArray(cer.periodes)?cer.periodes:[];
  const lignesProj=Array.isArray(proj.lignes)?proj.lignes:[];
  const id=String(ev.id||'');

  const effets=periodes.slice(0,4).map(function(p){
    const v=p&&p.v37||{},l=Array.isArray(v.actionsEvenementsCycle)?v.actionsEvenementsCycle:[];
    return {periode:p&&p.periode||p,lignes:l.filter(function(x){return String(x&&x.id||'')===id;})};
  });
  const projTennis=lignesProj.filter(function(x){return String(x&&x.source||'')==='evenement'&&String(x&&x.sourceId||'')===id;});

  const plan=typeof construireLignesPrevisionnellesV4_==='function'?construireLignesPrevisionnellesV4_([], [ev]).filter(function(x){return String(x&&x.source_id||'')===id;}):[];
  const parPeriode=function(n){return plan.filter(function(x){return Number(x&&x.periode||0)===n;});};

  const p1=parPeriode(1),p2=parPeriode(2),p3=parPeriode(3),p4=parPeriode(4);
  const sommeSigne=function(xs){return arr(xs.reduce(function(s,x){return s+Number(x&&x.montantSigne||0);},0));};

  const fraicheur=typeof auditerFraicheurSnapshotGlobalBudgetSoft20260916==='function'?auditerFraicheurSnapshotGlobalBudgetSoft20260916():null;
  const controles=[
    {code:'EVENEMENT_REEL_DEPENSE_LOISIRS_300',ok:String(ev.type||'')==='depense'&&String(ev.categorie||'')==='Loisirs'&&Math.abs(Number(ev.montant||0)-300)<.011,detail:{id:id,libelle:ev.libelle,type:ev.type,categorie:ev.categorie,montant:ev.montant,statut:ev.statut,certitude:ev.certitude,mode_paiement:ev.mode_paiement}},
    {code:'FRACTIONNEMENT_3_MENSUEL',ok:ev.fractionne===true||String(ev.fractionne)==='true',detail:{fractionne:ev.fractionne,nombre_fois:ev.nombre_fois,periodicite:ev.periodicite_fractionnement}},
    {code:'OCCURRENCES_100_100_100',ok:occ.length===3&&occ.every(function(o){return Math.abs(Number(o.montant||0)-100)<.011;}),detail:occ},
    {code:'AUCUN_IMPACT_SEPTEMBRE',ok:p1.length===0&&effets[0]&&effets[0].lignes.length===0,detail:{plan:p1,cerbere:effets[0]&&effets[0].lignes||[]}},
    {code:'PLAN_OCT_NOV_DEC_MOINS_100',ok:p2.length===1&&p3.length===1&&p4.length===1&&sommeSigne(p2)===-100&&sommeSigne(p3)===-100&&sommeSigne(p4)===-100,detail:{octobre:p2,novembre:p3,decembre:p4}},
    {code:'CERBERE_PILOTABLE_OCT_NOV_DEC',ok:[1,2,3].every(function(i){const l=effets[i]&&effets[i].lignes||[];return l.length===1&&String(l[0].cible||'')==='pilotable'&&String(l[0].categorie||'')==='Loisirs'&&Math.abs(Number(l[0].montantSigne||0)+100)<.011;}),detail:effets},
    {code:'PROJECTION_TRESORERIE_MOINS_300_TOTAL',ok:Math.abs(arr(projTennis.reduce(function(s,x){return s+Number(x&&x.montantSigne||0);},0))+300)<.011,detail:projTennis.map(function(x){return{occurrence:x.occurrence,date:x.date,montantSigne:x.montantSigne,enRetard:!!x.enRetard};})},
    {code:'SNAPSHOT_FRAIS_APRES_MUTATION',ok:!!(etat&&etat.genereLe)&&(!fraicheur||fraicheur.ok!==false),detail:{revisionBudgetSoft:etat&&etat.revisionBudgetSoft||'',genereLe:etat&&etat.genereLe||'',fraicheur:fraicheur}}
  ];
  const out={ok:controles.every(function(x){return x.ok;}),version:'2026-09-22.1',lectureSeule:true,aucuneEcriture:true,evenement:{id:id,libelle:ev.libelle,type:ev.type,categorie:ev.categorie,montant:Number(ev.montant||0),date_effet:ev.date_effet,statut:ev.statut,certitude:ev.certitude,mode_paiement:ev.mode_paiement,fractionne:ev.fractionne,nombre_fois:ev.nombre_fois,periodicite_fractionnement:ev.periodicite_fractionnement},snapshot:{revisionBudgetSoft:etat&&etat.revisionBudgetSoft||'',genereLe:etat&&etat.genereLe||''},controles:controles};
  console.log('[AUDIT EVENEMENT TENNIS REEL 20260922] '+JSON.stringify(out));return out;
}
