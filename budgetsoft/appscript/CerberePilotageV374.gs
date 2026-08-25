const CERBERE_PILOTAGE_V374_VERSION='3.7.16';

function appliquerResteReellementPilotableV374_(base){if(!base||base.ok===false)return base;recalculerCfFutursDepuisCf0CourantV375_(base);let reportPrecedent=null;const periodes=Array.isArray(base.periodes)?base.periodes:[];periodes.forEach((p,i)=>{if(!p||typeof p!=='object')return;const v=p.v37||(p.v37={}),r=p.roulant&&typeof p.roulant==='object'?p.roulant:{},h=r.horsPilotable&&typeof r.horsPilotable==='object'?r.horsPilotable:{};if(i>0&&reportPrecedent!==null){v.ss1=arrV374_(reportPrecedent);v.soldeOuverture=v.ss1;v.ss1Statut='projection provisoire héritée du socle';}const ret1=arrV374_(Number(v.disponibleEnveloppes!=null?v.disponibleEnveloppes:(p.resteBudgetPilotable||0))),het1=arrV374_(Math.max(0,Number(v.horsPilotableAControler!=null?v.horsPilotableAControler:0)));v.ret1=ret1;v.het1=het1;v.horsPilotableBrut=arrV374_(Number(h.total||0));v.dt1=arrV374_(Number(v.cft1||0)+Number(v.dpt1||0)+het1);v.sct1=arrV374_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;v.formuleSCt1='SCt1 = SS1 + Rt1 - CFt1 - DPt1 - HEt1';v.formuleREt1='REt1 = P1 - pilotable consommé/réservé';const env=Array.isArray(p.enveloppes)?p.enveloppes:[],abs=arrV374_(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)-Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0))-Number(x&&x.planifie||0)),0));v.absorbableParAllocations=abs;v.incompressible=arrV374_(v.sct1<0?Math.max(0,Math.abs(v.sct1)-abs):0);p.v37=v;p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.resteBudgetPilotable=ret1;p.capaciteTresorerie=v.sct1;reportPrecedent=v.sct1;});base.version=CERBERE_PILOTAGE_V374_VERSION;return base;}

function recalculerCfFutursDepuisCf0CourantV375_(base){const periodes=Array.isArray(base&&base.periodes)?base.periodes:[];if(periodes.length<2)return;const charges=Array.isArray(lireTable_('Charges_fixes'))?lireTable_('Charges_fixes'):[];periodes.forEach((p,i)=>{if(i===0||!p||typeof p!=='object')return;const v=p.v37||(p.v37={}),periode=p.periode||p,cf0=arrV374_(cfTotalSecoursV372_(charges,periode)),effets=p.plan&&p.plan.effets||{},delta=arrV374_(Number(effets.hausseCharges||0)-Number(effets.baisseCharges||0)-Number(effets.chargesEvitees||0)),cf1=arrV374_(Math.max(0,cf0+delta));v.cf0CourantSource=cf0;v.deltaPlanCharges=delta;v.chargesFixesTotal=cf1;v.chargesFixesRestantes=cf1;v.chargesFixesAttenduRealise=0;v.chargesFixesReelRealise=0;v.chargesFixesRealisees=0;v.cft1=cf1;v.cf1Statut='projection dynamique depuis CF0 courant jusqu’à ouverture du cycle';});}

/**
 * Passe terminale 3.7.16.
 * Elle ne redécouvre rien : elle protège les deux briques déjà qualifiées en amont.
 * - R0 futur est relu depuis le canon courant daté, et non depuis un audit intermédiaire.
 * - les candidats CF rejetés par la passe 3.7.11 survivent aux passes frontière.
 * - toutes les grandeurs dérivées sont recalculées une seule fois après stabilisation.
 */
function stabiliserCerbereV3716_(base){
  if(!base||base.ok===false)return base;
  const periodes=Array.isArray(base.periodes)?base.periodes:[];
  const postes=Array.isArray(base.recettesCanon&&base.recettesCanon.postes)?base.recettesCanon.postes:[];
  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;

    if(i>0&&postes.length){
      const socle=arrV374_(postes.reduce((s,x)=>{
        if(!x||typeof x!=='object')return s;
        const montant=typeof montantR0PourCycleV378_==='function'?montantR0PourCycleV378_(x,periode):Math.max(0,Number(x.montant||0));
        return s+Math.max(0,Number(montant||0));
      },0));
      const plan=arrV374_(Number(v.rt1Audit&&v.rt1Audit.planCycle!=null?v.rt1Audit.planCycle:0));
      const avant=arrV374_(Number(v.rt1||0));
      v.rt1=arrV374_(socle+plan);
      v.rt1Audit=v.rt1Audit&&typeof v.rt1Audit==='object'?v.rt1Audit:{};
      v.rt1Audit.socleCanonTerminal3716=socle;
      v.rt1Audit.planTerminal3716=plan;
      v.rt1Audit.rt1AvantTerminal3716=avant;
      v.rt1Audit.deltaTerminal3716=arrV374_(v.rt1-avant);
    }

    const rejetes=Array.isArray(v.cft1Audit&&v.cft1Audit.candidatsRejetes)?v.cft1Audit.candidatsRejetes:[];
    p.roulant=p.roulant&&typeof p.roulant==='object'?p.roulant:{};
    p.roulant.horsPilotable=p.roulant.horsPilotable&&typeof p.roulant.horsPilotable==='object'?p.roulant.horsPilotable:{};
    if(rejetes.length)p.roulant.horsPilotable.candidatsCfRejetes=rejetes;
    v.candidatsCfRejetes=rejetes;

    v.dt1=arrV374_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));
    v.sct1=arrV374_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
    v.capaciteAvantPilotable=arrV374_(Number(v.ss1||0)+Number(v.rt1||0)-Number(v.cft1||0)-Number(v.het1||0));
    const env=Array.isArray(p.enveloppes)?p.enveloppes:[];
    const allocation=arrV374_(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)),0));
    const dep=arrV374_(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.engageV37||0)-Math.max(0,Number(x&&x.prevu||0))),0));
    v.allocationP1Courante=allocation;v.depassementsPilotables=dep;
    v.aReequilibrer=arrV374_(v.capaciteAvantPilotable-allocation-dep);v.aReequilibrerReference=v.aReequilibrer;
    const abs=arrV374_(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)-Number(x&&x.engageV37||0)),0));
    v.absorbableParAllocations=abs;v.incompressible=arrV374_(v.aReequilibrer<0?Math.max(0,Math.abs(v.aReequilibrer)-abs):0);
    v.auditReequilibrage={attendu:v.sct1,reel:v.aReequilibrer,ecart:arrV374_(v.aReequilibrer-v.sct1),ok:Math.abs(v.aReequilibrer-v.sct1)<.011};
    p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
  });
  base.version=CERBERE_PILOTAGE_V374_VERSION;
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.stabilisation_3716='R0 futur relu depuis canon daté ; diagnostic CF préservé ; dérivés recalculés en passe terminale';
  return base;
}

function chargerCerbereV374(){const brut=chargerCerbereV37(),base=appliquerResteReellementPilotableV374_(brut),audite=typeof appliquerAuditCerbereV377_==='function'?appliquerAuditCerbereV377_(base):base,historique=typeof appliquerHistoriqueR0V378_==='function'?appliquerHistoriqueR0V378_(audite):audite,rapproche=typeof appliquerRapprochementCerbereV3711_==='function'?appliquerRapprochementCerbereV3711_(historique):historique,cycle=typeof appliquerDoctrineCycleV3712_==='function'?appliquerDoctrineCycleV3712_(rapproche):rapproche,salaire=typeof appliquerConventionSalaireTousCyclesV3712_==='function'?appliquerConventionSalaireTousCyclesV3712_(cycle):cycle,frontiere=typeof appliquerProjectionFrontiereV3713_==='function'?appliquerProjectionFrontiereV3713_(salaire):salaire,frontiere2=typeof corrigerProjectionFrontiereV3713b_==='function'?corrigerProjectionFrontiereV3713b_(frontiere):frontiere,effets=typeof corrigerEffetsFinanciersActionsV3713_==='function'?corrigerEffetsFinanciersActionsV3713_(frontiere2):frontiere2,stable=stabiliserCerbereV3716_(effets);if(stable&&typeof stable==='object')stable.version=CERBERE_PILOTAGE_V374_VERSION;return serialiserCerberePourClient_(stable);}

function arrV374_(n){return Math.round((Number(n)||0)*100)/100;}
