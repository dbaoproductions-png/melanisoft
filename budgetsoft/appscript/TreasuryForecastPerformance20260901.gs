const TREASURY_FORECAST_PERF_20260901_VERSION='2026-09-01.perf-1';

/**
 * Chemin rapide du solde prévisionnel bancaire.
 *
 * Objectif : produire strictement la même projection que le moteur doctrinal final,
 * sans exécuter les anciennes couches 30/08 -> 31/08 qui reconstruisaient puis
 * jetaient plusieurs fois les mêmes données, et notamment sans calculer Cerbère
 * lorsque la date cible est antérieure au prochain débit CB.
 *
 * Le contexte de lecture BudgetSoft mémoïse les tables pendant cette exécution.
 */
function chargerTresoreriePrevisionnelleRapide20260901(dateCible){
  const t0=Date.now();
  return avecContexteLectureBudgetSoft20260827_('tresorerie_previsionnelle_rapide_20260901',function(){
    const synthese=chargerSyntheseComptes20260828();
    const tousComptes=(synthese&&synthese.comptes||[]).filter(c=>actifComptes20260828_(c.actif));
    const courants=tousComptes.filter(estCompteCourantTresorerie_);
    const comptes=courants.length?courants:tousComptes.filter(c=>!estEpargneTresorerie_(c));
    const soldeReel=arrondiTresorerie_(comptes.reduce((s,c)=>s+Number(c.soldeReel||0),0));

    const ops=lireTable_('Operations');
    const charges=lireTable_('Charges_fixes');
    const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
    const actions=lireFeuilleDynamiquePlan_('Plan_Actions');

    const socle={
      ok:true,
      version:TREASURY_FORECAST_PERF_20260901_VERSION,
      soldeReel:soldeReel,
      comptes:comptes.map(c=>({id:c.id,nom:c.nom,soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde}))
    };
    const reference=dateReferenceBancaireTresorerie20260901_(socle,ops);
    const cible=normaliserDateCibleTresorerie_(dateCible,reference);

    const hard=operationsFuturesTresorerie_(ops,reference,cible,comptes);
    let lignes=hard.slice();

    let cfs=occurrencesChargesTresorerie_(charges,hard,actions,reference,cible,comptes);
    cfs=recalerChargesFixesCarteTresorerie20260901_(cfs,charges,ops,hard,reference,cible);
    lignes=lignes.concat(cfs);

    const evs=occurrencesEvenementsTresorerie_(evenements,hard,reference,cible,comptes)
      .filter(x=>evenementEffectifTresorerie20260831_(x.sourceId,evenements));
    lignes=lignes.concat(evs);
    lignes=completerEvenementsEffectifsTresorerie20260831_(lignes,evenements,reference,cible);

    const acts=normaliserMontantsActionsTresorerie20260831_(
      occurrencesActionsTresorerie_(actions,hard,reference,cible,comptes),actions
    );
    lignes=lignes.concat(acts);

    lignes=appliquerSuppressionsTemporairesTresorerie20260831_(lignes,evenements);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);

    const revenusCanon=revenusCanoniquesTresorerie20260831_(ops,lignes,reference,cible);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes.concat(revenusCanon));

    // Cerbère n'est appelé que si la cible atteint effectivement le prochain débit CB.
    const prochainDebit=prochaineDateDebitCbTresorerie20260901_(reference);
    let debitCb=null;
    if(prochainDebit<=cible)debitCb=estimationDebitCbDiffereTresorerie20260901V2_(ops,reference,cible);
    if(debitCb)lignes.push(debitCb);

    // Passe Plan/CB finale : une dépense Plan réglée par carte sort à la date bancaire.
    lignes=recalerFluxPlanCarteTresorerie20260901_(lignes,evenements,actions,hard,reference,cible);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);
    lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));

    const r=recalculerSortieTresorerie20260901_(socle,lignes,reference,cible);
    r.version=TREASURY_FORECAST_PERF_20260901_VERSION;
    r.debitCbEstime=debitCb||null;
    r.performance=Object.assign({},r.performance||{},{
      fastPath:true,
      dureeMs:Date.now()-t0,
      cerbereAppelee:prochainDebit<=cible,
      operations:(ops||[]).length,
      chargesFixes:(charges||[]).length,
      evenements:(evenements||[]).length,
      actions:(actions||[]).length,
      lignesFinales:lignes.length
    });
    r.diagnostic20260831=r.diagnostic20260831||{};
    r.diagnostic20260831.cheminRapide=true;
    return serialiserCerberePourClient_(r);
  });
}

function listerMouvementsFutursTresorerieRapide20260901(dateCible){
  const r=chargerTresoreriePrevisionnelleRapide20260901(dateCible||dateDansJoursTresorerie_(45));
  return {ok:r.ok,version:r.version,dateReference:r.dateReference,dateCible:r.dateCible,lignes:r.lignes||[],confiance:r.confiance,performance:r.performance||{},diagnostic20260831:r.diagnostic20260831||{}};
}

/**
 * Audit manuel sans écrit : compare ancien chemin final et chemin rapide sur les
 * cinq frontières qui ont servi à valider la doctrine bancaire.
 */
function auditerPerformanceTresorerie20260901(){
  const reference=new Date();
  const y=reference.getFullYear(),m=reference.getMonth();
  const dates=[3,17,27,new Date(y,m+1,0).getDate()].map(j=>Utilities.formatDate(new Date(y,m,j),Session.getScriptTimeZone(),'yyyy-MM-dd'));
  const d3=Utilities.formatDate(new Date(y,m+1,3),Session.getScriptTimeZone(),'yyyy-MM-dd');dates.push(d3);
  const essais=[];
  dates.forEach(date=>{
    let t=Date.now(),ancien=chargerTresoreriePrevisionnelle20260901(date),ancienMs=Date.now()-t;
    t=Date.now();let rapide=chargerTresoreriePrevisionnelleRapide20260901(date),rapideMs=Date.now()-t;
    essais.push({date,ancienMs,rapideMs,gainPct:ancienMs?Math.round((1-rapideMs/ancienMs)*1000)/10:null,ancien:ancien.soldePrevisionnel,rapide:rapide.soldePrevisionnel,ecart:arrondiTresorerie_(Number(rapide.soldePrevisionnel||0)-Number(ancien.soldePrevisionnel||0)),identique:Math.abs(Number(rapide.soldePrevisionnel||0)-Number(ancien.soldePrevisionnel||0))<.011});
  });
  return {ok:essais.every(x=>x.identique),version:TREASURY_FORECAST_PERF_20260901_VERSION,essais};
}
