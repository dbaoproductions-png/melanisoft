const TREASURY_FUTURE_FAST_20260902_VERSION='2026-09-02.future-fast-1';

/**
 * Liste rapide des mouvements bancaires futurs explicites.
 *
 * Cette fonction ne calcule volontairement PAS le complément CB Cerbère. Elle sert
 * à rendre immédiatement la liste utile (opérations futures connues, CF, Plan,
 * revenus structurels) même quand la cible dépasse le prochain débit différé.
 * L'interface peut ensuite enrichir la liste avec le seul débit CB estimé via le
 * moteur complet, sans bloquer l'affichage initial.
 */
function listerMouvementsFutursTresorerieSansCerbere20260902(dateCible){
  const t0=Date.now();
  return avecContexteLectureBudgetSoft20260827_('tresorerie_futures_sans_cerbere_20260902',function(){
    const synthese=chargerSyntheseComptes20260828();
    const tousComptes=(synthese&&synthese.comptes||[]).filter(c=>actifComptes20260828_(c.actif));
    const courants=tousComptes.filter(estCompteCourantTresorerie_);
    const comptes=courants.length?courants:tousComptes.filter(c=>!estEpargneTresorerie_(c));
    const soldeReel=arrondiTresorerie_(comptes.reduce((s,c)=>s+Number(c.soldeReel||0),0));

    const ops=lireTable_('Operations');
    const charges=lireTable_('Charges_fixes');
    const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
    const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
    const socle={ok:true,soldeReel,comptes:comptes.map(c=>({id:c.id,nom:c.nom,soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde}))};
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

    // Les flux Plan payés par CB sont bien replacés à la date de débit bancaire,
    // sans charger Cerbère pour autant.
    lignes=recalerFluxPlanCarteTresorerie20260901_(lignes,evenements,actions,hard,reference,cible);
    lignes=lignes.filter(x=>x.source!=='pilotable'&&x.source!=='debit_cb_estime');
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);
    lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));

    return serialiserCerberePourClient_({
      ok:true,
      version:TREASURY_FUTURE_FAST_20260902_VERSION,
      dateReference:reference.toISOString(),
      dateCible:cible.toISOString(),
      lignes,
      performance:{fastExplicit:true,dureeMs:Date.now()-t0,cerbereAppelee:false,lignesFinales:lignes.length}
    });
  });
}
