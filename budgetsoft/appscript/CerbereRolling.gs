const CERBERE_ROLLING_VERSION='3.6.3';

/**
 * Cerbère roulant 3.6.3.
 * Doctrine : le détail/tirettes ne porte que sur le pilotable P0.
 * Les catégories valides hors P0 gardent leur catégorie et leur effet de trésorerie,
 * mais sont synthétisées hors des enveloppes pilotables.
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
  const p0Cats=new Set((base.p0&&base.p0.postes||[]).map(x=>String(x.categorie||'').trim()).filter(Boolean));
  p0Cats.add('Divers');

  periodes.forEach((p,i)=>{
    const b=ventilation.buckets[i]||{};
    assurerDiversDansPeriodeCerbere363_(p);

    // Épargne est déjà une ligne P0 : ne pas la consommer deux fois dans la capacité structurelle.
    if((p.enveloppes||[]).some(x=>String(x.categorie||'').trim()==='Épargne')){
      p.budgetDisponible=arrondirCerbereV3_(Number(p.budgetDisponible||0)+Number(p.epargne||0));
    }

    // Remplacer les anciens « renforts » par la doctrine structurée : revenus hors R0 + trésorerie signée.
    const revenusHorsR0=Object.keys(b.revenusReels||{}).reduce((s,cat)=>s+(r0Cats.has(cat)?0:Number(b.revenusReels[cat]||0)),0);
    const ajustementReel=arrondirCerbereV3_(revenusHorsR0+Number(b.tresorerieNette||0));
    p.budgetDisponible=arrondirCerbereV3_(Number(p.budgetDisponible||0)-Number(p.renfortsTresorerie||0)+ajustementReel);
    p.ajustementLiquiditeReel=ajustementReel;

    // Les enveloppes hors P0 créées par 3.6.2 ne sont plus des lignes de cockpit.
    p.enveloppes=(p.enveloppes||[]).filter(x=>p0Cats.has(String(x.categorie||'').trim()) || String(x.nature||'')==='projet_planifie');

    const horsNonCb={},horsCb={};
    Object.keys(b.nonCbParCategorie||{}).forEach(cat=>{if(!p0Cats.has(cat))horsNonCb[cat]=Number(b.nonCbParCategorie[cat]||0);});
    Object.keys(b.cbParCategorie||{}).forEach(cat=>{if(!p0Cats.has(cat))horsCb[cat]=Number(b.cbParCategorie[cat]||0);});
    const horsNonCbTotal=sommeObjetCerbere363_(horsNonCb),horsCbTotal=sommeObjetCerbere363_(horsCb);

    let pilotNonCb=0,pilotCb=0,planPilotable=0,budgetPilotable=0;
    (p.enveloppes||[]).forEach(x=>{
      const cat=String(x.categorie||'').trim();
      const n=Number((b.nonCbParCategorie||{})[cat]||0),c=Number((b.cbParCategorie||{})[cat]||0),pl=Number(x.planifie||0),bu=Number(x.prevu||0);
      x.reelNonCb=arrondirCerbereV3_(n);
      x.cbHeritee=arrondirCerbereV3_(c);
      x.reelImpute=arrondirCerbereV3_(n+c);
      x.resteBudget=arrondirCerbereV3_(bu-n-c-pl);
      pilotNonCb+=n;pilotCb+=c;planPilotable+=pl;budgetPilotable+=bu;
    });

    p.budgetReparti=arrondirCerbereV3_(budgetPilotable);
    p.planDansEnveloppes=arrondirCerbereV3_(planPilotable);
    p.resteBudgetAlloue=arrondirCerbereV3_(budgetPilotable-pilotNonCb-pilotCb-planPilotable);
    p.resteBudgetPilotable=p.resteBudgetAlloue;
    p.margeNonAffectee=arrondirCerbereV3_(Number(p.budgetDisponible||0)-budgetPilotable);

    // Deux comptes distincts : pilotable P0 et trésorerie globale.
    p.restePilotable=arrondirCerbereV3_(budgetPilotable-pilotNonCb-pilotCb-planPilotable);
    p.capaciteTresorerie=arrondirCerbereV3_(Number(p.budgetDisponible||0)-pilotNonCb-pilotCb-horsNonCbTotal-horsCbTotal-planPilotable);
    p.capacitePilotable=p.capaciteTresorerie; // compatibilité avec consommateurs historiques.
    p.resteAVentiler=p.margeNonAffectee;

    const next=ventilation.buckets[i+1]||{};
    const nextCbPilotable=Object.keys(next.cbParCategorie||{}).reduce((s,cat)=>s+(p0Cats.has(cat)?Number(next.cbParCategorie[cat]||0):0),0);
    const nextCbHors=Object.keys(next.cbParCategorie||{}).reduce((s,cat)=>s+(p0Cats.has(cat)?0:Number(next.cbParCategorie[cat]||0)),0);

    p.roulant={
      reelNonCb:arrondirCerbereV3_(pilotNonCb),
      cbHeritee:arrondirCerbereV3_(pilotCb),
      reelPilotable:arrondirCerbereV3_(pilotNonCb+pilotCb),
      cbEngageePourSuivant:arrondirCerbereV3_(nextCbPilotable),
      cbEngageePourSuivantHorsP0:arrondirCerbereV3_(nextCbHors),
      cbParCategorie:b.cbParCategorie||{},nonCbParCategorie:b.nonCbParCategorie||{},
      horsPilotable:{
        nonCb:arrondirCerbereV3_(horsNonCbTotal),cb:arrondirCerbereV3_(horsCbTotal),total:arrondirCerbereV3_(horsNonCbTotal+horsCbTotal),
        nonCbParCategorie:horsNonCb,cbParCategorie:horsCb
      },
      tresorerieNette:arrondirCerbereV3_(Number(b.tresorerieNette||0)),
      tresoreriePositive:arrondirCerbereV3_(Number(b.tresoreriePositive||0)),
      tresorerieNegative:arrondirCerbereV3_(Number(b.tresorerieNegative||0)),
      revenusHorsR0:arrondirCerbereV3_(revenusHorsR0),
      chargesFixesReelles:arrondirCerbereV3_(Number(b.chargesFixesReelles||0)),
      nombreChargesFixesReelles:Number(b.nombreChargesFixesReelles||0),
      orphelines:b.orphelines||{},
      sante:{net:arrondirCerbereV3_(Number(b.santeNette||0)),remboursements:arrondirCerbereV3_(Number(b.santeRemboursements||0))},
      reconciliation:{
        reelIndexe:arrondirCerbereV3_(Number(b.nonCbTotal||0)+Number(b.cbTotal||0)),
        reelVentile:arrondirCerbereV3_(pilotNonCb+pilotCb+horsNonCbTotal+horsCbTotal),
        ecart:arrondirCerbereV3_(Number(b.nonCbTotal||0)+Number(b.cbTotal||0)-pilotNonCb-pilotCb-horsNonCbTotal-horsCbTotal)
      },
      moteurVentilation:ventilation.version
    };
  });

  base.cf0=construireCf0Cerbere363_(charges,periodes);
  base.fenetreRoulante=construireFenetreRoulanteCerbere363_(periodes,ventilation.stats);
  base.version=CERBERE_ROLLING_VERSION;
  base.principe='Cerbère M/M+1 : détail réservé au pilotable P0 ; CF0 et hors-P0 restent synthétiques mais pèsent sur la trésorerie globale.';
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.moteur_roulant=CERBERE_ROLLING_VERSION;
  base.diagnostic.ventilation=ventilation.stats;
  base.diagnostic.reconciliation_ok=periodes.every(p=>Math.abs(Number(p.roulant&&p.roulant.reconciliation&&p.roulant.reconciliation.ecart||0))<.01);
  return serialiserCerb...PourClientCompat363_(base);
}

function serialiserCerb...PourClientCompat363_(base){
  return typeof serialiserCerberePourClient_==='function'?serialiserCerberePourClient_(base):base;
}

function construireCf0Cerbere363_(charges,periodes){
  const actives=(charges||[]).filter(c=>String(c.actif).toLowerCase()!=='false');
  const p0=periodes&&periodes[0];
  return{nombreActives:actives.length,totalCourant:arrondirCerbereV3_(Number(p0&&p0.fixesBrutes||0)),totalPondereCourant:arrondirCerbereV3_(Number(p0&&p0.fixesPonderees||0)),principe:'CF0 = charges fixes définies comme telles ; affichage synthétique dans Cerbère.'};
}

function construireFenetreRoulanteCerbere363_(periodes,stats){
  const m=periodes[0],n=periodes[1];if(!m||!n)return null;
  const tresM=Number(m.capaciteTresorerie||0),tresN=Number(n.capaciteTresorerie||0),budM=Number(m.resteBudgetPilotable||0),budN=Number(n.resteBudgetPilotable||0);
  const recOk=[m,n].every(p=>Math.abs(Number(p.roulant&&p.roulant.reconciliation&&p.roulant.reconciliation.ecart||0))<.01);
  const orphelines=Object.keys((m.roulant&&m.roulant.orphelines)||{}).length+Object.keys((n.roulant&&n.roulant.orphelines)||{}).length;
  let niveau='vert',titre='Trajectoire pilotable saine sur deux mois';
  if(!recOk){niveau='rouge';titre='Calcul incomplet : ventilation non réconciliée';}
  else if(tresM<-.009||tresN<-.009){niveau='rouge';titre='Risque de trésorerie sur la fenêtre roulante';}
  else if(budM<-.009||budN<-.009||orphelines>0){niveau='orange';titre='Vigilance sur les enveloppes pilotables';}
  else if(Number(n.roulant&&n.roulant.cbHeritee||0)>Number(n.budgetReparti||0)*.6){niveau='orange';titre='Vigilance : M+1 est déjà fortement engagé';}
  const raisons=[];
  if(budM<-.009)raisons.push('M dépasse ses enveloppes pilotables de '+arrondirCerbereV3_(Math.abs(budM))+' €');
  if(budN<-.009)raisons.push('M+1 dépasse déjà ses enveloppes pilotables de '+arrondirCerbereV3_(Math.abs(budN))+' €');
  if(tresM<-.009)raisons.push('trésorerie globale M négative de '+arrondirCerbereV3_(Math.abs(tresM))+' €');
  if(tresN<-.009)raisons.push('trésorerie globale M+1 négative de '+arrondirCerbereV3_(Math.abs(tresN))+' €');
  if(Number(n.roulant&&n.roulant.cbHeritee||0)>0)raisons.push(arrondirCerbereV3_(n.roulant.cbHeritee)+' € de CB pilotables de M déjà imputés à M+1');
  if(Number(n.roulant&&n.roulant.horsPilotable&&n.roulant.horsPilotable.total||0)>0)raisons.push(arrondirCerbereV3_(n.roulant.horsPilotable.total)+' € hors enveloppes pèsent aussi sur M+1');
  if(Number(n.engagementsPlanifies||0)>0)raisons.push(arrondirCerbereV3_(n.engagementsPlanifies)+' € de Plan à venir sur M+1');
  if(orphelines>0)raisons.push(orphelines+' catégorie(s) orpheline(s) à classer');
  if(Number(stats&&stats.doublonsCbRetires||0)>0)raisons.push(stats.doublonsCbRetires+' doublon(s) CB neutralisé(s)');
  if(!raisons.length)raisons.push('enveloppes pilotables et trésorerie globale restent soutenables sur M et M+1');
  return{niveau,titre,raisons,resteM:arrondirCerbereV3_(budM),resteM1:arrondirCerbereV3_(budN),tresorerieM:arrondirCerbereV3_(tresM),tresorerieM1:arrondirCerbereV3_(tresN)};
}

function assurerDiversDansPeriodeCerbere363_(p){
  const e=p.enveloppes||(p.enveloppes=[]);if(e.some(x=>String(x.categorie||'').trim()==='Divers'))return;
  const i=e.findIndex(x=>String(x.categorie||'').trim()==='Épargne'),l={categorie:'Divers',canon:0,monetaire:0,pluxee:0,nature:'ajustable',prevu:0,planifie:0};
  if(i>=0)e.splice(i,0,l);else e.push(l);
}
function sommeObjetCerbere363_(o){return Object.keys(o||{}).reduce((s,k)=>s+Number(o[k]||0),0);}
