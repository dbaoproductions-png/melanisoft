const CERBERE_PILOTAGE_V374_VERSION='3.7.5';

/**
 * Complément moteur 3.7.5.
 * Ne modifie aucun maître P0/R0/CF0.
 *
 * Règle CF :
 * - M conserve sa photographie CF1 du début de cycle ;
 * - M+1 et les périodes futures n'étant pas encore ouvertes repartent du CF0
 *   courant, puis appliquent les effets Actions/Événements de leur période ;
 * - au 28, la période devient à son tour figée.
 *
 * RPt1 reste provisoirement calculé comme REt1 + variations ; l'audit métier
 * déterminera ensuite si SCt1 devient directement l'indicateur principal.
 */
function appliquerResteReellementPilotableV374_(base){
  if(!base||base.ok===false)return base;

  // Correction ciblée CF1 futur : le référentiel d'une période non ouverte ne
  // doit jamais rester accroché à une ancienne photographie de CF0.
  recalculerCfFutursDepuisCf0CourantV375_(base);

  (base.periodes||[]).forEach((p,i)=>{
    const v=p.v37||{};
    const re=arrV374_(Number(p.resteBudgetPilotable!=null?p.resteBudgetPilotable:v.disponibleEnveloppes||0));

    // ΔR : uniquement l'écart au socle R1 + les ressources nouvelles.
    const deltaR=arrV374_(
      Number(v.correctionRecettesReelles||0)+
      Number(v.recettesHorsR0Reelles||0)+
      Number(v.recettesEvenements||0)
    );

    // ΔCF : économie positive / surcoût négatif par rapport au CF1 du cycle.
    const cfReference=Number(v.chargesFixesTotal||0);
    const cfReevalue=Number(v.cft1||cfReference);
    const deltaCF=arrV374_(cfReference-cfReevalue);

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
    p.resteBudgetPilotable=rpt1;
    if(i===0)v.disponibleJusquau27=rpt1;
  });

  base.version=CERBERE_PILOTAGE_V374_VERSION;
  base.principe='Cerbère 3.7.5 : M conserve son CF1 figé ; M+1 repart du CF0 courant puis applique les Actions/Événements de sa période. RPt1 reste séparé de SCt1 pendant l’audit.';
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.moteur_pilotage=CERBERE_PILOTAGE_V374_VERSION;
  base.diagnostic.doctrine_cf1='M figé ; M+1 et futur = CF0 courant + effets Plan de période jusqu’à leur ouverture';
  base.diagnostic.doctrine_rpt1='RPt1 = REt1 + deltaR + deltaCF + deltaAutres ; formule encore sous audit face à SCt1';
  return base;
}

/**
 * Recalcule seulement les CF des périodes FUTURES.
 * M (index 0) reste volontairement immuable.
 */
function recalculerCfFutursDepuisCf0CourantV375_(base){
  const periodes=base.periodes||[];
  if(periodes.length<2)return;
  const charges=lireTable_('Charges_fixes');

  let reportPrecedent=null;
  periodes.forEach((p,i)=>{
    const v=p.v37||(p.v37={});

    if(i===0){
      reportPrecedent=Number(v.sct1||0);
      return;
    }

    const periode=p.periode||p;
    const cf0Courant=arrV374_(cfTotalSecoursV372_(charges,periode));
    const effets=p.plan&&p.plan.effets||{};
    const deltaPlan=arrV374_(
      Number(effets.hausseCharges||0)-
      Number(effets.baisseCharges||0)-
      Number(effets.chargesEvitees||0)
    );
    const cf1=arrV374_(Math.max(0,cf0Courant+deltaPlan));

    v.cf0CourantSource=cf0Courant;
    v.deltaPlanCharges=deltaPlan;
    v.chargesFixesTotal=cf1;
    v.chargesFixesRestantes=cf1;
    v.chargesFixesAttenduRealise=0;
    v.chargesFixesReelRealise=0;
    v.chargesFixesRealisees=0;
    v.cft1=cf1;
    v.cf1Statut='projection dynamique depuis CF0 courant jusqu’à ouverture du cycle';

    // Pour M+1 et au-delà, le report doit suivre la trajectoire corrigée de la
    // période précédente, sinon une correction CF ne se propagerait pas.
    if(reportPrecedent!==null){
      v.ss1=arrV374_(reportPrecedent);
      v.soldeOuverture=v.ss1;
      v.ss1Statut='projeté depuis SCt1 de la période précédente';
    }

    v.dt1=arrV374_(Number(v.cft1||0)+Number(v.dpt1||0));
    v.sct1=arrV374_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.pointDepart=arrV374_(Number(v.ss1||0)+Number(v.rt1||0)-Number(v.cft1||0));
    v.finProjetee=v.sct1;
    v.capaciteProjetee=v.sct1;
    p.capaciteTresorerie=v.sct1;
    reportPrecedent=v.sct1;
  });
}

/** Point d'entrée conservé pour ne pas toucher au circuit UI. */
function chargerCerbereV374(){
  return serialiserCerberePourClient_(appliquerResteReellementPilotableV374_(chargerCerbereV37()));
}

function arrV374_(n){return Math.round((Number(n)||0)*100)/100;}
