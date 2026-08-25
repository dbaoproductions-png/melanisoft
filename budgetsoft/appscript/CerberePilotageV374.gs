const CERBERE_PILOTAGE_V374_VERSION='3.7.6';

/**
 * Cerbère 3.7.6 — doctrine stabilisée du cockpit court terme.
 * - SCt1 = indicateur principal « Encore disponible jusqu’au 27 ».
 * - REt1 = situation par rapport au budget initial P1 (bilan secondaire).
 * - DPt1 = dépenses pilotables estimées sur le cycle.
 * - HEt1 = sorties hors enveloppes connues et non déjà comptées ailleurs.
 * - M+1 hérite immédiatement de la fin projetée de M.
 * - Santé : uniquement le réel du cycle ; aucun remboursement hypothétique.
 */
function appliquerResteReellementPilotableV374_(base){
  if(!base||base.ok===false)return base;
  recalculerCfFutursDepuisCf0CourantV375_(base);

  let reportPrecedent=null;
  (base.periodes||[]).forEach((p,i)=>{
    const v=p.v37||(p.v37={});
    const r=p.roulant||{};
    const h=r.horsPilotable||{};

    if(i>0 && reportPrecedent!==null){
      v.ss1=arrV374_(reportPrecedent);
      v.soldeOuverture=v.ss1;
      v.ss1Statut='projeté depuis la fin Cerbère de la période précédente';
    }

    // Situation par rapport au budget initial : P1 - consommé/réservé.
    const ret1=arrV374_(Number(v.disponibleEnveloppes!=null?v.disponibleEnveloppes:(p.resteBudgetPilotable||0)));

    // Dépenses hors enveloppes connues. Elles ne doivent peser sur SCt1 que si
    // elles ne sont déjà ni CF rapprochées, ni mouvements de trésorerie, ni
    // intégrées au pilotable. Le moteur amont peut fournir horsPilotableAControler.
    // À défaut, le bloc horsPilotable est traité comme « à contrôler » : on ne
    // l'injecte pas silencieusement dans SCt1 afin d'éviter tout double comptage.
    const het1Explicite=Number(v.horsPilotableAControler!=null?v.horsPilotableAControler:0);
    const het1=arrV374_(Math.max(0,het1Explicite));

    v.ret1=ret1;
    v.het1=het1;
    v.horsPilotableBrut=arrV374_(Number(h.total||0));
    v.dt1=arrV374_(Number(v.cft1||0)+Number(v.dpt1||0)+het1);
    v.sct1=arrV374_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.rpt1=v.sct1; // compatibilité : l'ancien nom pointe désormais sur le vrai indicateur.
    v.resteReellementPilotable=v.sct1;
    v.disponibleJusquau27=v.sct1;
    v.formuleSCt1='SCt1 = SS1 + Rt1 - CFt1 - DPt1 - HEt1';
    v.formuleREt1='REt1 = P1 - pilotable consommé/réservé';

    // Capacité réellement absorbable par les allocations encore non consommées.
    const absorbable=arrV374_((p.enveloppes||[]).reduce((s,x)=>{
      const allocation=Number(x.prevu||0);
      const reel=Number(x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x.reelImpute||0));
      const plan=Number(x.planifie||0);
      return s+Math.max(0,allocation-reel-plan);
    },0));
    v.absorbableParAllocations=absorbable;
    v.incompressible=arrV374_(v.sct1<0?Math.max(0,Math.abs(v.sct1)-absorbable):0);

    p.v37=v;
    p.resteReellementPilotable=v.sct1;
    p.capacitePilotable=v.sct1;
    p.resteBudgetPilotable=ret1;
    p.capaciteTresorerie=v.sct1;
    reportPrecedent=v.sct1;
  });

  base.version=CERBERE_PILOTAGE_V374_VERSION;
  base.principe='Cerbère 3.7.6 : SCt1 pilote le présent et M+1 ; REt1 reste un bilan du budget initial ; les hors-pilotable non rapprochés restent à contrôler avant impact automatique.';
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.moteur_pilotage=CERBERE_PILOTAGE_V374_VERSION;
  base.diagnostic.doctrine_sc='SCt1 = Encore disponible jusqu’au 27';
  base.diagnostic.doctrine_re='REt1 = situation par rapport au budget initial P1';
  base.diagnostic.doctrine_sante='remboursements santé uniquement lorsqu’ils sont réellement constatés sur le cycle';
  return base;
}

/** M est figé ; M+1 et futur repartent du CF0 courant jusqu'à ouverture. */
function recalculerCfFutursDepuisCf0CourantV375_(base){
  const periodes=base.periodes||[];
  if(periodes.length<2)return;
  const charges=lireTable_('Charges_fixes');
  periodes.forEach((p,i)=>{
    if(i===0)return;
    const v=p.v37||(p.v37={});
    const periode=p.periode||p;
    const cf0Courant=arrV374_(cfTotalSecoursV372_(charges,periode));
    const effets=p.plan&&p.plan.effets||{};
    const deltaPlan=arrV374_(Number(effets.hausseCharges||0)-Number(effets.baisseCharges||0)-Number(effets.chargesEvitees||0));
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
  });
}

function chargerCerbereV374(){
  return serialiserCerberePourClient_(appliquerResteReellementPilotableV374_(chargerCerbereV37()));
}
function arrV374_(n){return Math.round((Number(n)||0)*100)/100;}
