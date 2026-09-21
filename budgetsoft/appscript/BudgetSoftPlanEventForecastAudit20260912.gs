const BUDGETSOFT_PLAN_EVENT_FORECAST_FIX_20260912_VERSION='2026-09-12.3';

// Logique active transférée à TreasuryForecastCorrections20260831.gs. Ce fichier conserve uniquement l'audit.

function auditerEvenementsPrevusTresorerieBudgetSoft20260912(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat,m=e&&e.modules||{},proj=m.projectionEtendue||{},dash=m.dashboard||{},ct=dash.courtTerme||{},cer=m.cerbere||{};
  const referenceProjection=dateDashboardSynthese20260907_(proj.dateReference||ct.dateReference||new Date());
  const referenceDashboard=dateDashboardSynthese20260907_(ct.dateReference||proj.dateReference||new Date());
  const fin=dateDashboardSynthese20260907_(ct.fin||proj.dateCible||new Date());
  const report=dateJourSuivantPlanForecast20260912_(referenceProjection);
  const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
  const attendus=[];

  (evenements||[]).forEach(function(ev){
    if(!evenementStandardPlanForecast20260912_(ev)||evenementProuveClosPlanForecast20260912_(ev))return;
    const dr=datePlanTresorerie_(ev,referenceProjection,false),origine=dr&&dr.date;
    if(!origine||isNaN(origine)||origine>fin)return;
    const eligibleRetard=statutEffectiveEvenementPlanForecast20260912_(ev.statut)||statutDeclareRealiseEvenementPlanForecast20260912_(ev.statut);
    if(origine<=referenceProjection&&!eligibleRetard)return;
    const dateProjection=origine<=referenceProjection?report:origine;
    if(dateProjection<=referenceProjection||dateProjection>fin)return;
    attendus.push({
      id:String(ev.id||''),libelle:String(ev.libelle||''),type:String(ev.type||'').toLowerCase(),
      datePrevue:isoDashboardSynthese20260907_(origine),dateProjection:isoDashboardSynthese20260907_(dateProjection),
      enRetard:origine<=referenceProjection,montant:Math.abs(Number(ev.montant||0)),statut:String(ev.statut||''),
      operationReelleId:String(ev.operation_reelle_id||ev.operationReelleId||''),preuveCloture:false
    });
  });

  const lignes=(proj&&Array.isArray(proj.lignes)?proj.lignes:[]).filter(function(l){return String(l&&l.source||'')==='evenement';});
  const controles=attendus.map(function(a){
    const ll=lignes.filter(function(l){return String(l&&l.sourceId||'')===a.id;});
    const somme=Math.round(ll.reduce(function(t,l){return t+Number(l&&l.montantSigne||0);},0)*100)/100;
    const attenduSigne=Math.round((a.type==='recette'?1:-1)*a.montant*100)/100;
    return Object.assign({},a,{ok:Math.abs(somme-attenduSigne)<0.01,sommeProjection:somme,lignesProjection:ll.map(function(l){return{date:l.date,libelle:l.libelle,montantSigne:l.montantSigne,certitude:l.certitude,enRetard:!!l.enRetard,datePrevueOrigine:l.datePrevueOrigine||''};})});
  });

  // Diagnostic projection : cette somme n'est plus propriétaire de revenusAttendus.
  const recettesFuturesProjection=(proj&&Array.isArray(proj.lignes)?proj.lignes:[]).filter(function(l){
    const d=dateDashboardSynthese20260907_(l&&l.date),montant=Number(l&&l.montantSigne||0);
    return d&&d>referenceProjection&&d<=fin&&montant>0;
  });
  const totalFuturProjection=Math.round(recettesFuturesProjection.reduce(function(t,l){return t+Number(l.montantSigne||0);},0)*100)/100;

  // Propriétaire doctrinal : Rt1 Cerbère de la même révision.
  const p=Array.isArray(cer&&cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},rt1=Number(v.rt1),publie=Number(ct.revenusAttendus);
  const coherenceRt1=Number.isFinite(rt1)&&Number.isFinite(publie)&&Math.abs(Math.round((rt1-publie)*100)/100)<=0.01;
  const evenementsOk=controles.every(function(x){return x.ok;});

  const out={
    ok:!!(e&&e.publie&&evenementsOk&&coherenceRt1),
    version:BUDGETSOFT_PLAN_EVENT_FORECAST_FIX_20260912_VERSION,
    versionAuditDoctrine:'2026-09-19.1',
    revisionBudgetSoft:e&&e.revisionBudgetSoft||'',
    frontieres:{
      projection:proj.dateReference||'',
      dashboard:ct.dateReference||'',
      finCycle:ct.fin||'',
      commentaire:'Les événements sont contrôlés sur la frontière de projection ; revenusAttendus est contrôlé contre Rt1 Cerbère.'
    },
    dashboard:{
      revenusConstates:Number(ct.revenusConstates||0),
      revenusAttendus:publie,
      cerbereRt1:Number.isFinite(rt1)?rt1:null,
      coherenceRt1:coherenceRt1
    },
    projection:{
      recettesFutures:recettesFuturesProjection.map(function(l){return{source:l.source,sourceId:l.sourceId||'',date:l.date,libelle:l.libelle,montantSigne:l.montantSigne,certitude:l.certitude,enRetard:!!l.enRetard,datePrevueOrigine:l.datePrevueOrigine||''};}),
      totalRecettesFutures:totalFuturProjection,
      sourceVerite:'projectionEtendue canonique',
      proprietaireRevenusAttendus:false
    },
    evenementsAttendus:controles
  };
  console.log('[AUDIT événements prévus trésorerie] '+JSON.stringify(out));
  return out;
}


function normaliserLibelleAuditRapprochementPlan20260921_(v){
  return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function compterRefsAuditRapprochementPlan20260921_(v,termes){
  const txt=JSON.stringify(v||{});
  const out={};
  (termes||[]).forEach(function(t){
    const s=String(t||'');if(!s){out[s]=0;return;}
    let i=0,n=0;while((i=txt.indexOf(s,i))>=0){n++;i+=s.length;}
    out[s]=n;
  });
  return out;
}

/**
 * Audit ciblé lecture seule du rapprochement Plan -> Réel
 * "Versement caution plus loyer août".
 * Aucun recalcul métier, aucune écriture.
 */
function auditerImpactVersementCautionLoyerAout20260921(){
  const cible='versement caution plus loyer aout';
  const evenements=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):[];
  const matches=(evenements||[]).filter(function(e){
    return normaliserLibelleAuditRapprochementPlan20260921_(e&&e.libelle)===cible;
  });
  if(matches.length!==1){
    const out={ok:false,version:'2026-09-21.1',lectureSeule:true,erreur:'Événement cible non unique',nombre:matches.length,libelles:matches.map(function(x){return String(x&&x.libelle||'');})};
    console.log('[AUDIT IMPACT RAPPROCHEMENT CAUTION LOYER AOUT 20260921] '+JSON.stringify(out));
    return out;
  }

  const ev=matches[0],eventId=String(ev&&ev.id||'').trim(),operationId=String(ev&&ev.operation_reelle_id||'').trim();
  const operations=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];
  const op=operations.find(function(x){return String(x&&x.id||'').trim()===operationId;})||null;

  const etat=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'
    ?lireEtatGlobalBudgetSoftSiDisponible20260906_()
    :null;
  const disponible=!!(etat&&etat.disponible&&etat.etat);
  const e=disponible?etat.etat:null,m=e&&e.modules||{};
  const projection=m.projectionEtendue||{},cerbere=m.cerbere||{},dashboard=m.dashboard||{},analyses=m.analyses||{},engagements=m.engagementsBancaires||{};

  const lignesProjection=Array.isArray(projection&&projection.lignes)?projection.lignes:[];
  const eventLines=lignesProjection.filter(function(l){return String(l&&l.source||'')==='evenement'&&String(l&&l.sourceId||'')===eventId;});
  const opLines=lignesProjection.filter(function(l){return String(l&&l.sourceId||'')===operationId||String(l&&l.id||'').indexOf(operationId)>=0;});

  const refs={
    cerbere:compterRefsAuditRapprochementPlan20260921_(cerbere,[eventId,operationId]),
    dashboard:compterRefsAuditRapprochementPlan20260921_(dashboard,[eventId,operationId]),
    analyses:compterRefsAuditRapprochementPlan20260921_(analyses,[eventId,operationId]),
    engagementsBancaires:compterRefsAuditRapprochementPlan20260921_(engagements,[eventId,operationId])
  };

  const statutNorm=typeof statutNormaliseEvenementPlanForecast20260912_==='function'
    ?statutNormaliseEvenementPlanForecast20260912_(ev&&ev.statut)
    :normaliserLibelleAuditRapprochementPlan20260921_(ev&&ev.statut);
  const rapproNorm=typeof statutNormaliseEvenementPlanForecast20260912_==='function'
    ?statutNormaliseEvenementPlanForecast20260912_(ev&&ev.rapprochement_statut)
    :normaliserLibelleAuditRapprochementPlan20260921_(ev&&ev.rapprochement_statut);

  const controles=[
    {code:'PLAN_EVENEMENT_RAPPROCHE',ok:statutNorm==='rapproche'||rapproNorm==='rapproche',detail:{statut:String(ev&&ev.statut||''),rapprochementStatut:String(ev&&ev.rapprochement_statut||'')}},
    {code:'PLAN_LIEN_OPERATION_REELLE',ok:!!operationId&&!!op,detail:{eventId:eventId,operationId:operationId,operationTrouvee:!!op}},
    {code:'SNAPSHOT_FRAIS_APRES_RAPPROCHEMENT',ok:disponible,detail:{disponible:disponible,revisionBudgetSoft:String(e&&e.revisionBudgetSoft||''),genereLe:String(e&&e.genereLe||'')}},
    {code:'PROJECTION_PREVISION_PLAN_NEUTRALISEE',ok:disponible&&eventLines.length===0,detail:{lignesEvenement:eventLines}},
    {code:'PROJECTION_OPERATION_REELLE_NON_DOUBLEE',ok:disponible&&opLines.length<=1,detail:{nombreLignesOperation:opLines.length,lignes:opLines}},
    {code:'MODULES_SNAPSHOT_PRESENTS',ok:disponible&&!!m.cerbere&&!!m.dashboard&&!!m.analyses&&!!m.engagementsBancaires,detail:{cerbere:!!m.cerbere,dashboard:!!m.dashboard,analyses:!!m.analyses,engagementsBancaires:!!m.engagementsBancaires}}
  ];

  const out={
    ok:controles.every(function(x){return x.ok;}),
    version:'2026-09-21.1',
    lectureSeule:true,
    evenement:{
      id:eventId,libelle:String(ev&&ev.libelle||''),type:String(ev&&ev.type||''),categorie:String(ev&&ev.categorie||''),
      montantPrevu:Number(ev&&ev.montant||0),statut:String(ev&&ev.statut||''),rapprochementStatut:String(ev&&ev.rapprochement_statut||''),
      operationReelleId:operationId,montantReel:Number(ev&&ev.montant_reel||0),dateRealisation:String(ev&&ev.date_realisation||'')
    },
    operation:op?{
      id:String(op.id||''),libelle:String(op.libelle_bancaire||op.libelle||''),montant:Number(op.montant||0),
      categorie:String(op.categorie||''),dateComptable:String(op.date_comptable||''),dateAchat:String(op.date_achat||''),compte:String(op.compte||'')
    }:null,
    snapshot:{disponible:disponible,revisionBudgetSoft:String(e&&e.revisionBudgetSoft||''),genereLe:String(e&&e.genereLe||'')},
    projection:{lignesEvenement:eventLines,lignesOperation:opLines},
    referencesModules:refs,
    controles:controles
  };
  console.log('[AUDIT IMPACT RAPPROCHEMENT CAUTION LOYER AOUT 20260921] '+JSON.stringify(out));
  return out;
}
