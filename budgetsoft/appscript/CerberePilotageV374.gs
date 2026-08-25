const CERBERE_PILOTAGE_V374_VERSION='3.7.4';

/**
 * Complément moteur 3.7.4.
 * Ne modifie aucun maître P0/R0/CF0.
 * Transforme le reliquat d'enveloppes en reste réellement pilotable en ne
 * réinjectant que les variations apparues depuis la construction de P1.
 */
function appliquerResteReellementPilotableV374_(base){
  if(!base||base.ok===false)return base;
  (base.periodes||[]).forEach((p,i)=>{
    const v=p.v37||{};
    const re=arrV374_(Number(p.resteBudgetPilotable!=null?p.resteBudgetPilotable:v.disponibleEnveloppes||0));

    // ΔR : uniquement l'écart au socle R1 + les ressources nouvelles.
    // correctionRecettesReelles est déjà un écart réel - canon.
    // recettesHorsR0Reelles et recettesEvenements sont des ressources hors socle.
    const deltaR=arrV374_(
      Number(v.correctionRecettesReelles||0)+
      Number(v.recettesHorsR0Reelles||0)+
      Number(v.recettesEvenements||0)
    );

    // ΔCF : économie positive / surcoût négatif par rapport au CF1 du cycle.
    const cfReference=Number(v.chargesFixesTotal||0);
    const cfReevalue=Number(v.cft1||cfReference);
    const deltaCF=arrV374_(cfReference-cfReevalue);

    // Réservé pour les variations de liquidité explicitement reconnues qui ne
    // sont déjà ni dans REt1, ni dans ΔR, ni dans ΔCF. Zéro par défaut : aucun
    // montant ne doit apparaître ici par heuristique.
    const deltaAutres=arrV374_(Number(v.deltaAutresPilotage||0));

    const rpt1=arrV374_(re+deltaR+deltaCF+deltaAutres);
    v.ret1=re;
    v.deltaRt1=deltaR;
    v.deltaCFt1=deltaCF;
    v.deltaAt1=deltaAutres;
    v.rpt1=rpt1;
    v.resteReellementPilotable=rpt1;
    v.formuleRPt1='RPt1 = REt1 + ΔRt1 + ΔCFt1 + ΔAt1';
    v.explicationRPt1={
      resteEnveloppes:re,
      variationRecettes:deltaR,
      variationChargesFixes:deltaCF,
      autresVariations:deltaAutres
    };
    p.v37=v;
    p.resteReellementPilotable=rpt1;
    p.capacitePilotable=rpt1;
    // Compatibilité : les composants qui lisent encore ce champ obtiennent
    // désormais la consigne quotidienne et non le simple bilan des enveloppes.
    p.resteBudgetPilotable=rpt1;
    if(i===0)v.disponibleJusquau27=rpt1;
  });
  base.version=CERBERE_PILOTAGE_V374_VERSION;
  base.principe='Cerbère 3.7.4 : RPt1 est le reste réellement pilotable. REt1 conserve le bilan P1 − consommé/réservé ; seules les variations de recettes, CF et liquidité depuis la construction de P1 corrigent REt1.';
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.moteur_pilotage=CERBERE_PILOTAGE_V374_VERSION;
  base.diagnostic.doctrine_rpt1='RPt1 = REt1 + deltaR + deltaCF + deltaAutres ; jamais réadditionner R1 complet';
  return base;
}

/** Point d'entrée 3.7.4 prêt à être appelé par le cockpit. */
function chargerCerbereV374(){
  return serialiserCerberePourClient_(appliquerResteReellementPilotableV374_(chargerCerbereV37()));
}

function arrV374_(n){return Math.round((Number(n)||0)*100)/100;}
