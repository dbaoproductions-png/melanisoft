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
