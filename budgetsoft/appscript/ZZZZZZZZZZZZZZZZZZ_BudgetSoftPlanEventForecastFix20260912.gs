const BUDGETSOFT_PLAN_EVENT_FORECAST_FIX_20260912_VERSION='2026-09-12.3';

/**
 * Doctrine corrigée :
 * - un Événement standard de type recette/depense représente un flux futur connu ;
 *   il appartient donc au prévisionnel tant qu'aucune preuve bancaire ne l'a clos ;
 * - un simple statut déclaratif (« Réalisé », « Réalisé à rapprocher »...) n'est PAS
 *   une preuve de réalisation : seuls operation_reelle_id ou un rapprochement confirmé
 *   autorisent la sortie du prévisionnel ;
 * - un Événement Effective dont la date prévue est dépassée ne disparaît pas : tant
 *   qu'il n'est pas rapproché/réalisé avec preuve, il reste dû et est reporté au prochain
 *   jour de projection, tout en conservant sa date prévue d'origine dans la preuve ;
 * - un événement déclaré « Réalisé à rapprocher » mais sans opération réelle liée reste
 *   également dû et est traité comme un flux en retard ;
 * - les événements techniques (suspension, déplacement, réserve...) conservent la
 *   doctrine historique : ils ne modifient la trésorerie qu'une fois Effective ;
 * - les Actions Plan restent régies séparément par impact_confirme + statut Effective.
 */
function statutNormaliseEvenementPlanForecast20260912_(v){
  return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function statutAnnuleEvenementPlanForecast20260912_(v){
  return ['annule','annulee','abandonne','abandonnee'].includes(statutNormaliseEvenementPlanForecast20260912_(v));
}
function statutRapprocheEvenementPlanForecast20260912_(v){
  return ['rapproche','rapprochee'].includes(statutNormaliseEvenementPlanForecast20260912_(v));
}
function statutDeclareRealiseEvenementPlanForecast20260912_(v){
  const s=statutNormaliseEvenementPlanForecast20260912_(v);
  return s==='realise'||s==='realisee'||s==='realises'||s==='realisees'||s.indexOf('realise a rapprocher')===0||s.indexOf('realisee a rapprocher')===0;
}
function statutEffectiveEvenementPlanForecast20260912_(v){
  return ['effectif','effective','effectifs','effectives'].includes(statutNormaliseEvenementPlanForecast20260912_(v));
}
function evenementStandardPlanForecast20260912_(e){
  const type=String(e&&e.type||'').trim().toLowerCase();
  return type==='recette'||type==='depense';
}
function evenementProuveClosPlanForecast20260912_(e){
  if(!e)return true;
  if(statutAnnuleEvenementPlanForecast20260912_(e.statut))return true;
  if(statutRapprocheEvenementPlanForecast20260912_(e.statut))return true;
  if(String(e.operation_reelle_id||e.operationReelleId||'').trim())return true;
  const r=statutNormaliseEvenementPlanForecast20260912_(e.rapprochement_statut||e.rapprochementStatut||'');
  return ['rapproche','rapprochee','realise','realisee'].includes(r);
}
function statutFinalEvenementPlanForecast20260912_(v){
  // Compatibilité : cette fonction ne doit plus considérer « Réalisé » seul comme final.
  return statutAnnuleEvenementPlanForecast20260912_(v)||statutRapprocheEvenementPlanForecast20260912_(v);
}
function dateJourSuivantPlanForecast20260912_(reference){
  const d=new Date(reference);d.setDate(d.getDate()+1);d.setHours(12,0,0,0);return d;
}
function isoPlanForecast20260912_(d){
  return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');
}

/** Décision d'entrée des occurrences standard dans la trajectoire. */
evenementEffectifTresorerie20260831_=function(id,evenements){
  const e=(evenements||[]).find(function(x){return String(x&&x.id||'')===String(id||'');});
  if(!e||evenementProuveClosPlanForecast20260912_(e))return false;
  if(statutEffectiveEvenementPlanForecast20260912_(e.statut))return true;
  if(statutDeclareRealiseEvenementPlanForecast20260912_(e.statut))return evenementStandardPlanForecast20260912_(e);
  return evenementStandardPlanForecast20260912_(e);
};

/**
 * Complément terminal : le moteur historique ne fabrique aucune occurrence lorsque
 * la date de l'événement est déjà <= à la référence bancaire. On réinjecte donc les
 * événements standard encore dus dont le statut indique qu'ils sont certains/effectifs
 * ou déclarés réalisés à rapprocher, mais qui n'ont aucune preuve bancaire de réalisation.
 */
completerEvenementsEffectifsTresorerie20260831_=function(lignes,evenements,reference,cible){
  const out=(lignes||[]).slice();
  const report=dateJourSuivantPlanForecast20260912_(reference);
  (evenements||[]).forEach(function(e){
    if(!evenementStandardPlanForecast20260912_(e))return;
    if(evenementProuveClosPlanForecast20260912_(e))return;
    if(typeof estSuspensionTemporaireTresorerie20260831_==='function'&&estSuspensionTemporaireTresorerie20260831_(e))return;

    const statutEligibleRetard=statutEffectiveEvenementPlanForecast20260912_(e.statut)||statutDeclareRealiseEvenementPlanForecast20260912_(e.statut);
    const dr=datePlanTresorerie_(e,reference,false),base=dr&&dr.date;
    if(!base||isNaN(base))return;
    const n=(e.fractionne===true||String(e.fractionne)==='true')?Math.max(1,Number(e.nombre_fois||1)):1;
    const per=String(e.periodicite_fractionnement||'mensuel').toLowerCase();
    const total=Math.abs(Number(e.montant||0));
    if(!total)return;

    for(let i=0;i<n;i++){
      const origine=new Date(base);
      if(i){if(per==='annuel')origine.setFullYear(origine.getFullYear()+i);else origine.setMonth(origine.getMonth()+i);}
      if(origine>cible)continue;
      const enRetard=origine<=reference;
      if(enRetard&&!statutEligibleRetard)continue;
      const d=enRetard?new Date(report):origine;
      if(d<=reference||d>cible)continue;
      if(out.some(function(x){return x.source==='evenement'&&String(x.sourceId||'')===String(e.id||'')&&Math.abs(new Date(x.date)-d)<43200000;}))continue;
      const type=String(e.type||'depense').toLowerCase();
      const montant=(type==='recette'?1:-1)*(total/n);
      const preuve=enRetard
        ?'Événement encore dû · date prévue '+isoPlanForecast20260912_(origine)+' · aucune opération réelle/rapprochement confirmé · maintenu au prévisionnel'
        :preuveDatePlanTresorerie_('Événement du Plan',dr);
      out.push({
        id:'event:'+String(e.id||'')+':'+i+(enRetard?':retard':''),
        source:'evenement',sourceId:e.id||'',date:d.toISOString(),
        libelle:e.libelle||'Événement',categorie:e.categorie||'',compte:e.compte||'',
        montantSigne:arrondiTresorerie_(montant),certitude:'tres_probable',preuve:preuve,
        dateConventionnelle:!!dr.conventionnelle,datePrevueOrigine:isoPlanForecast20260912_(origine),enRetard:enRetard
      });
    }
  });
  return out;
};

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
