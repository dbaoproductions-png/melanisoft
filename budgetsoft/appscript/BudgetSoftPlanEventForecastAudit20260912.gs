const BUDGETSOFT_PLAN_EVENT_FORECAST_FIX_20260912_VERSION='2026-09-12.3';

// Logique active transférée à TreasuryForecastCorrections20260831.gs. Ce fichier conserve uniquement l'audit.

function auditerEvenementsPrevusTresorerieBudgetSoft20260912(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat,m=e&&e.modules||{},proj=m.projectionEtendue||{},dash=m.dashboard||{},ct=dash.courtTerme||{};
  const reference=dateDashboardSynthese20260907_(ct.dateReference||new Date());
  const fin=dateDashboardSynthese20260907_(ct.fin||new Date());
  const report=dateJourSuivantPlanForecast20260912_(reference);
  const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
  const attendus=[];

  (evenements||[]).forEach(function(ev){
    if(!evenementStandardPlanForecast20260912_(ev)||evenementProuveClosPlanForecast20260912_(ev))return;
    const dr=datePlanTresorerie_(ev,reference,false),origine=dr&&dr.date;
    if(!origine||isNaN(origine)||origine>fin)return;
    const eligibleRetard=statutEffectiveEvenementPlanForecast20260912_(ev.statut)||statutDeclareRealiseEvenementPlanForecast20260912_(ev.statut);
    if(origine<=reference&&!eligibleRetard)return;
    const dateProjection=origine<=reference?report:origine;
    if(dateProjection<=reference||dateProjection>fin)return;
    attendus.push({
      id:String(ev.id||''),libelle:String(ev.libelle||''),type:String(ev.type||'').toLowerCase(),
      datePrevue:isoDashboardSynthese20260907_(origine),dateProjection:isoDashboardSynthese20260907_(dateProjection),
      enRetard:origine<=reference,montant:Math.abs(Number(ev.montant||0)),statut:String(ev.statut||''),
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

  const recettesFutures=(proj&&Array.isArray(proj.lignes)?proj.lignes:[]).filter(function(l){
    const d=dateDashboardSynthese20260907_(l&&l.date),montant=Number(l&&l.montantSigne||0);
    return d&&d>reference&&d<=fin&&montant>0;
  });
  const totalFutur=Math.round(recettesFutures.reduce(function(t,l){return t+Number(l.montantSigne||0);},0)*100)/100;
  const attenduDashboard=Math.round((Number(ct.revenusConstates||0)+totalFutur)*100)/100;
  const out={
    ok:!!(e&&e.publie&&controles.every(function(x){return x.ok;})&&Math.abs(Number(ct.revenusAttendus||0)-attenduDashboard)<0.01),
    version:BUDGETSOFT_PLAN_EVENT_FORECAST_FIX_20260912_VERSION,
    revisionBudgetSoft:e&&e.revisionBudgetSoft||'',
    cycle:{dateReference:ct.dateReference||'',fin:ct.fin||''},
    dashboard:{revenusConstates:Number(ct.revenusConstates||0),revenusAttendus:Number(ct.revenusAttendus||0),revenusAttendusCalcules:attenduDashboard},
    recettesFutures:recettesFutures.map(function(l){return{source:l.source,sourceId:l.sourceId||'',date:l.date,libelle:l.libelle,montantSigne:l.montantSigne,certitude:l.certitude,enRetard:!!l.enRetard,datePrevueOrigine:l.datePrevueOrigine||''};}),
    totalRecettesFutures:totalFutur,
    evenementsAttendus:controles
  };
  console.log('[AUDIT événements prévus trésorerie] '+JSON.stringify(out));
  return out;
}
