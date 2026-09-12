const BUDGETSOFT_PLAN_EVENT_FORECAST_FIX_20260912_VERSION='2026-09-12.1';

/**
 * Doctrine corrigée :
 * - un Événement standard de type recette/depense représente un flux futur connu ;
 *   il appartient donc au prévisionnel dès qu'il n'est ni réalisé/rapproché ni annulé ;
 * - les événements techniques (suspension, déplacement, réserve...) conservent la
 *   doctrine historique : ils ne modifient la trésorerie qu'une fois Effective ;
 * - les Actions Plan restent régies séparément par impact_confirme + statut Effective.
 *
 * Le moteur 20260831 appelle ce helper pour décider si une occurrence d'événement
 * entre dans la trajectoire. On corrige uniquement cette décision, sans déplacer
 * ni dupliquer les calculs de montant/date/dédoublonnage.
 */
evenementEffectifTresorerie20260831_=function(id,evenements){
  const e=(evenements||[]).find(function(x){return String(x&&x.id||'')===String(id||'');});
  if(!e)return false;
  const statut=String(e.statut||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(['realise','realisee','realises','realisees','rapproche','rapprochee','annule','annulee','abandonne','abandonnee'].includes(statut))return false;
  if(['effectif','effective','effectifs','effectives'].includes(statut))return true;
  const type=String(e.type||'').trim().toLowerCase();
  return type==='recette'||type==='depense';
};

function auditerEvenementsPrevusTresorerieBudgetSoft20260912(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat,m=e&&e.modules||{},proj=m.projectionEtendue||{},dash=m.dashboard||{},ct=dash.courtTerme||{};
  const reference=dateDashboardSynthese20260907_(ct.dateReference||new Date());
  const fin=dateDashboardSynthese20260907_(ct.fin||new Date());
  const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
  const attendus=[];
  (evenements||[]).forEach(function(ev){
    const type=String(ev&&ev.type||'').toLowerCase();
    if(type!=='recette'&&type!=='depense')return;
    const statut=String(ev&&ev.statut||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(['realise','realisee','realises','realisees','rapproche','rapprochee','annule','annulee','abandonne','abandonnee'].includes(statut))return;
    const dr=datePlanTresorerie_(ev,reference,false),d=dr&&dr.date;
    if(!d||isNaN(d)||d<=reference||d>fin)return;
    attendus.push({id:String(ev.id||''),libelle:String(ev.libelle||''),type:type,date:isoDashboardSynthese20260907_(d),montant:Math.abs(Number(ev.montant||0)),statut:String(ev.statut||'')});
  });
  const lignes=(proj&&Array.isArray(proj.lignes)?proj.lignes:[]).filter(function(l){return String(l&&l.source||'')==='evenement';});
  const controles=attendus.map(function(a){
    const ll=lignes.filter(function(l){return String(l&&l.sourceId||'')===a.id;});
    const somme=Math.round(ll.reduce(function(t,l){return t+Number(l&&l.montantSigne||0);},0)*100)/100;
    const attenduSigne=Math.round((a.type==='recette'?1:-1)*a.montant*100)/100;
    return Object.assign({},a,{ok:Math.abs(somme-attenduSigne)<0.01,sommeProjection:somme,lignesProjection:ll.map(function(l){return{date:l.date,libelle:l.libelle,montantSigne:l.montantSigne,certitude:l.certitude};})});
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
    recettesFutures:recettesFutures.map(function(l){return{source:l.source,sourceId:l.sourceId||'',date:l.date,libelle:l.libelle,montantSigne:l.montantSigne,certitude:l.certitude};}),
    totalRecettesFutures:totalFutur,
    evenementsAttendus:controles
  };
  console.log('[AUDIT événements prévus trésorerie] '+JSON.stringify(out));
  return out;
}
