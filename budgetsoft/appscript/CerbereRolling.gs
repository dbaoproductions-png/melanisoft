const CERBERE_ROLLING_VERSION='3.6.2';

/**
 * Cerbère roulant 3.6.2.
 * S'appuie sur OperationsVentilation.gs : catégories et champs structurés font foi.
 */
function chargerCerbereRoulant(){
  const base=chargerCerbereV33();
  if(!base||base.ok===false)return base;

  const operations=lireTable_('Operations');
  const categories=lireTable_('Categories');
  const charges=lireTable_('Charges_fixes');
  const periodes=base.periodes||[];
  const ventilation=construireVentilationOperationsBudgetSoft_(operations,categories,periodes);
  const r0Cats=new Set((base.recettesCanon&&base.recettesCanon.postes||[]).map(x=>String(x.categorie||'').trim()).filter(Boolean));

  periodes.forEach((p,i)=>{
    const b=ventilation.buckets[i]||{};
    assurerDiversDansPeriodeCerbere362_(p);

    // La V3.5 retire déjà Épargne de la capacité alors qu'Épargne est une ligne P0.
    // Le cockpit roulant la réintègre pour qu'elle ne soit consommée qu'une fois.
    if((p.enveloppes||[]).some(x=>String(x.categorie||'').trim()==='Épargne')){
      p.budgetDisponible=arrondirCerbereV3_(Number(p.budgetDisponible||0)+Number(p.epargne||0));
    }

    // La V3.5 ajoute tous les flux positifs hors R0 comme « renforts ».
    // 3.6.2 les remplace par la doctrine structurée : revenus hors R0 + trésorerie nette.
    const revenusHorsR0=Object.keys(b.revenusReels||{}).reduce((s,cat)=>s+(r0Cats.has(cat)?0:Number(b.revenusReels[cat]||0)),0);
    const ajustementReel=arrondirCerbereV3_(revenusHorsR0+Number(b.tresorerieNette||0));
    p.budgetDisponible=arrondirCerbereV3_(Number(p.budgetDisponible||0)-Number(p.renfortsTresorerie||0)+ajustementReel);
    p.ajustementLiquiditeReel=ajustementReel;

    const exist=new Set((p.enveloppes||[]).map(x=>String(x.categorie||'')));
    Object.keys(b.nonCbParCategorie||{}).concat(Object.keys(b.cbParCategorie||{})).forEach(cat=>{
      if(cat&&!exist.has(cat)){
        (p.enveloppes||(p.enveloppes=[])).push({categorie:cat,canon:0,monetaire:0,pluxee:0,nature:'hors_p0',prevu:0,planifie:0});
        exist.add(cat);
      }
    });

    let nonCb=0,cb=0,plan=0,budget=0;
    (p.enveloppes||[]).forEach(x=>{
      const cat=String(x.categorie||'');
      const n=Number((b.nonCbParCategorie||{})[cat]||0),c=Number((b.cbParCategorie||{})[cat]||0),pl=Number(x.planifie||0),bu=Number(x.prevu||0);
      x.reelNonCb=arrondirCerbereV3_(n);x.cbHeritee=arrondirCerbereV3_(c);x.reelImpute=arrondirCerbereV3_(n+c);x.resteBudget=arrondirCerbereV3_(bu-n-c-pl);
      nonCb+=n;cb+=c;plan+=pl;budget+=bu;
    });

    p.budgetReparti=arrondirCerbereV3_(budget);
    p.planDansEnveloppes=arrondirCerbereV3_(plan);
    p.resteBudgetAlloue=arrondirCerbereV3_(budget-nonCb-cb-plan);
    p.margeNonAffectee=arrondirCerbereV3_(Number(p.budgetDisponible||0)-budget);
    p.capacitePilotable=arrondirCerbereV3_(Number(p.budgetDisponible||0)-nonCb-cb-plan);
    p.resteAVentiler=p.margeNonAffectee;

    const next=ventilation.buckets[i+1]||{};
    p.roulant={
      reelNonCb:arrondirCerbereV3_(nonCb),
      cbHeritee:arrondirCerbereV3_(cb),
      cbEngageePourSuivant:arrondirCerbereV3_(Number(next.cbTotal||0)),
      cbParCategorie:b.cbParCategorie||{},nonCbParCategorie:b.nonCbParCategorie||{},
      tresorerieNette:arrondirCerbereV3_(Number(b.tresorerieNette||0)),
      tresoreriePositive:arrondirCerbereV3_(Number(b.tresoreriePositive||0)),
      tresorerieNegative:arrondirCerbereV3_(Number(b.tresorerieNegative||0)),
      revenusHorsR0:arrondirCerbereV3_(revenusHorsR0),
      chargesFixesReelles:arrondirCerbereV3_(Number(b.chargesFixesReelles||0)),
      nombreChargesFixesReelles:Number(b.nombreChargesFixesReelles||0),
      orphelines:b.orphelines||{},
      sante:{net:arrondirCerbereV3_(Number(b.santeNette||0)),remboursements:arrondirCerbereV3_(Number(b.santeRemboursements||0))},
      reconciliation:{reelIndexe:arrondirCerbereV3_(Number(b.nonCbTotal||0)),reelAffiche:arrondirCerbereV3_(nonCb),ecart:arrondirCerbereV3_(Number(b.nonCbTotal||0)-nonCb)},
      moteurVentilation:ventilation.version
    };
  });

  base.cf0=construireCf0Cerbere362_(charges,periodes);
  base.fenetreRoulante=construireFenetreRoulanteCerbere362_(periodes,ventilation.stats);
  base.version=CERBERE_ROLLING_VERSION;
  base.principe='Cerbère M/M+1 : catégorie enregistrée autoritaire, CF0 explicite, CB structurée date_achat+carte_fin imputée à M+1, trésorerie selon son signe.';
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.moteur_roulant=CERBERE_ROLLING_VERSION;
  base.diagnostic.ventilation=ventilation.stats;
  base.diagnostic.reconciliation_ok=periodes.every(p=>Math.abs(Number(p.roulant&&p.roulant.reconciliation&&p.roulant.reconciliation.ecart||0))<.01);
  return serialiserCerberePourClient_(base);
}

function construireCf0Cerbere362_(charges,periodes){
  const actives=(charges||[]).filter(c=>String(c.actif).toLowerCase()!=='false');
  const p0=periodes&&periodes[0];
  return{
    nombreActives:actives.length,
    totalCourant:arrondirCerbereV3_(Number(p0&&p0.fixesBrutes||0)),
    totalPondereCourant:arrondirCerbereV3_(Number(p0&&p0.fixesPonderees||0)),
    principe:'CF0 = charges fixes définies comme telles ; le réel CF0 exige une liaison charge_fixe_id.'
  };
}

function construireFenetreRoulanteCerbere362_(periodes,stats){
  const m=periodes[0],n=periodes[1];if(!m||!n)return null;
  const capM=Number(m.capacitePilotable||0),capN=Number(n.capacitePilotable||0),budM=Number(m.resteBudgetAlloue||0),budN=Number(n.resteBudgetAlloue||0);
  const recOk=[m,n].every(p=>Math.abs(Number(p.roulant&&p.roulant.reconciliation&&p.roulant.reconciliation.ecart||0))<.01);
  const orphelines=Object.keys((m.roulant&&m.roulant.orphelines)||{}).length+Object.keys((n.roulant&&n.roulant.orphelines)||{}).length;
  let niveau='vert',titre='Trajectoire saine sur deux mois';
  if(!recOk){niveau='rouge';titre='Calcul incomplet : le réel affiché ne se réconcilie pas';}
  else if(capM<-.009||capN<-.009){niveau='rouge';titre='Risque de trésorerie sur la fenêtre roulante';}
  else if(budM<-.009||budN<-.009||orphelines>0){niveau='orange';titre='Vigilance : budget dépassé ou classement à compléter';}
  else if(Number(n.roulant&&n.roulant.cbHeritee||0)>Number(n.budgetReparti||0)*.6){niveau='orange';titre='Vigilance : le mois suivant est déjà fortement engagé par la CB';}
  const raisons=[];
  if(budM<-.009)raisons.push('M dépasse son budget alloué de '+arrondirCerbereV3_(Math.abs(budM))+' €');
  if(budN<-.009)raisons.push('M+1 dépasse déjà son budget alloué de '+arrondirCerbereV3_(Math.abs(budN))+' €');
  if(Number(n.roulant&&n.roulant.cbHeritee||0)>0)raisons.push(arrondirCerbereV3_(n.roulant.cbHeritee)+' € de CB structurées de M déjà imputés à M+1');
  if(Number(n.engagementsPlanifies||0)>0)raisons.push(arrondirCerbereV3_(n.engagementsPlanifies)+' € de Plan à venir sur M+1');
  if(Number(m.engagementsPlanifies||0)>0)raisons.push(arrondirCerbereV3_(m.engagementsPlanifies)+' € de Plan à venir sur M');
  if(orphelines>0)raisons.push(orphelines+' catégorie(s) orpheline(s) à classer');
  if(Number(stats&&stats.doublonsCbRetires||0)>0)raisons.push(stats.doublonsCbRetires+' doublon(s) CB provisoire/définitif neutralisé(s)');
  if(!recOk)raisons.push('écart de réconciliation entre ventilation commune et lignes affichées');
  if(!raisons.length)raisons.push('budgets alloués et capacité de trésorerie restent positifs sur M et M+1');
  return{niveau,titre,raisons,resteM:arrondirCerbereV3_(capM),resteM1:arrondirCerbereV3_(capN),resteBudgetM:arrondirCerbereV3_(budM),resteBudgetM1:arrondirCerbereV3_(budN)};
}

function assurerDiversDansPeriodeCerbere362_(p){
  const e=p.enveloppes||(p.enveloppes=[]);if(e.some(x=>String(x.categorie||'').trim()==='Divers'))return;
  const i=e.findIndex(x=>String(x.categorie||'').trim()==='Épargne'),l={categorie:'Divers',canon:0,monetaire:0,pluxee:0,nature:'ajustable',prevu:0,planifie:0};
  if(i>=0)e.splice(i,0,l);else e.push(l);
}
