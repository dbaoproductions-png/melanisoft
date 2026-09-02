const CERBERE_COCKPIT_20260902_FIX_VERSION='2026-09-02.pilotable-date-achat-2';

/**
 * Correctif terminal du cockpit Cerbère du 02/09/2026.
 *
 * Deux temps sont volontairement séparés :
 * - trésorerie / banque : date comptable ;
 * - consommation des enveloppes pilotables : date d'achat (ou date métier réelle).
 *
 * Le « encore disponible » est une autorisation de dépense restante :
 * P1 - Réel depuis le début du cycle. Le Plan reste visible mais ne diminue pas
 * cette valeur. Il continue en revanche à participer à DPt1 lorsqu'il crée un
 * dépassement déjà engagé au-delà de l'allocation.
 *
 * Joker : le montant P1 retenu est conservé ; seule sa répartition revient à la
 * forme de P0. Ainsi un P1 retenu à 1 633,36 € ne retombe pas au total canonique
 * si P0 vaut moins : les poids de P0 sont appliqués au montant P1 retenu.
 */
function chargerCerbereCockpitCorrige20260902(){
  const base=chargerCerbereCockpit20260902();
  if(!base||base.ok===false)return base;
  return corrigerCockpitPilotableDateAchat20260902_(base);
}

function corrigerCockpitPilotableDateAchat20260902_(base){
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'
    ?dedoublonnerOperationsCartesBudgetSoft_(lireTable_('Operations')||[])
    :(lireTable_('Operations')||[]);
  const maintenant=new Date();
  const periodes=Array.isArray(base.periodes)?base.periodes:[];

  periodes.forEach((p,pos)=>{
    if(!p||typeof p!=='object')return;
    const env=Array.isArray(p.enveloppes)?p.enveloppes:[];
    const v=p.v37||(p.v37={});
    const c=v.cockpit20260902||(v.cockpit20260902={});

    // Le Joker restaure la FORME P0 sans perdre le montant P1 retenu.
    if(v.joker&&v.joker.actif){
      const canonTotal=env.reduce((s,x)=>s+Math.max(0,Number(x&&x.canon||0)),0);
      const cible=Math.max(0,Number(c.capacitePilotable||c.p1Total||0));
      if(canonTotal>0&&cible>0){
        let distribue=0,dernier=-1;
        env.forEach((x,i)=>{if(Math.max(0,Number(x&&x.canon||0))>0)dernier=i;});
        env.forEach((x,i)=>{
          const canon=Math.max(0,Number(x&&x.canon||0));
          if(!canon){x.prevu=0;return;}
          let montant=arrCerberePilotable20260902_(cible*canon/canonTotal);
          if(i===dernier)montant=arrCerberePilotable20260902_(cible-distribue);
          x.prevu=montant;distribue+=montant;
        });
        c.jokerP0={actif:true,cible:arrCerberePilotable20260902_(cible),canonTotal:arrCerberePilotable20260902_(canonTotal),mode:'P1 conservé · répartition P0'};
      }
    }

    const cats=new Set(env.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
    const debut=dateCerberePilotable20260902_(p.periode&&p.periode.debut);
    const fin=dateCerberePilotable20260902_(p.periode&&p.periode.fin);
    if(!debut||!fin)return;

    const reelParCat={};
    operations.forEach(o=>{
      const montant=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim();
      if(!Number.isFinite(montant)||montant>=0||!cats.has(cat))return;
      if(String(o&&o.charge_fixe_id||'').trim())return;
      if(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o))return;
      const d=dateAchatPilotableCerbere20260902_(o);
      if(!d||d<debut||d>fin||d>maintenant)return;
      reelParCat[cat]=Number(reelParCat[cat]||0)+Math.abs(montant);
    });

    let p1=0,reelTotal=0,planTotal=0,disponible=0,dpt1=0,depassements=0;
    env.forEach(x=>{
      const cat=String(x&&x.categorie||'').trim();
      const allocation=Math.max(0,Number(x&&x.prevu||0));
      const reel=arrCerberePilotable20260902_(Number(reelParCat[cat]||0));
      const plan=Math.max(0,Number(x&&x.planifie||0));
      const engage=arrCerberePilotable20260902_(reel+plan);
      const reste=arrCerberePilotable20260902_(allocation-reel);
      const proj=arrCerberePilotable20260902_(Math.max(allocation,engage));
      x.reelNetPrevisionnel=reel;
      x.reelPilotableDepuisDebutCycle=reel;
      x.engageV37=engage;
      x.resteV37=reste;
      x.dpt1=proj;
      p1+=allocation;reelTotal+=reel;planTotal+=plan;disponible+=reste;dpt1+=proj;
      depassements+=Math.max(0,engage-allocation);
    });

    c.p1Total=arrCerberePilotable20260902_(p1);
    c.consommePilotable=arrCerberePilotable20260902_(reelTotal);
    c.reservePlan=arrCerberePilotable20260902_(planTotal);
    c.ret1=arrCerberePilotable20260902_(disponible);
    c.dpt1=arrCerberePilotable20260902_(dpt1);
    c.depassements=arrCerberePilotable20260902_(depassements);
    c.margeARepartir=arrCerberePilotable20260902_(Number(c.capacitePilotable||0)-c.dpt1);
    c.formuleDisponible='P1 - Réel pilotable depuis le début du cycle';
    c.datePilotable='date_achat prioritaire ; date métier réelle en repli';
    c.correctifVersion=CERBERE_COCKPIT_20260902_FIX_VERSION;
    if(pos===0)c.budgetRetenuC1=c.p1Total;

    v.ret1=c.ret1;v.dpt1=c.dpt1;v.disponibleEnveloppes=c.ret1;
    p.resteBudgetPilotable=c.ret1;p.budgetReparti=c.p1Total;
  });

  base.cockpit20260902=base.cockpit20260902||{};
  base.cockpit20260902.correctifPilotable=CERBERE_COCKPIT_20260902_FIX_VERSION;
  return base;
}

function dateAchatPilotableCerbere20260902_(o){
  let d=null;
  if(typeof dateAchatMetierBudgetSoft_==='function')d=dateAchatMetierBudgetSoft_(o);
  if(!d)d=dateCerberePilotable20260902_(o&&o.date_achat);
  if(!d&&typeof dateOperationCouranteBudgetSoft_==='function')d=dateOperationCouranteBudgetSoft_(o);
  if(!d)d=dateCerberePilotable20260902_(o&&(o.date||o.date_comptable));
  return d;
}
function dateCerberePilotable20260902_(v){if(!v)return null;const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d)?null:d;}
function arrCerberePilotable20260902_(n){return Math.round((Number(n)||0)*100)/100;}

/** Lecture seule : contrôle des montants affichés dans le cockpit corrigé. */
function auditerCockpitPilotable20260902(){
  const b=chargerCerbereCockpitCorrige20260902(),p=b&&b.periodes&&b.periodes[0],c=p&&p.v37&&p.v37.cockpit20260902;
  return {ok:!!p,periode:p&&p.periode,p1:c&&c.p1Total,reel:c&&c.consommePilotable,encoreDisponible:c&&c.ret1,plan:c&&c.reservePlan,dpt1:c&&c.dpt1,capacite:c&&c.capacitePilotable,marge:c&&c.margeARepartir,joker:c&&c.jokerP0,courses:(p&&p.enveloppes||[]).filter(x=>String(x.categorie||'')==='Courses').map(x=>({allocation:x.prevu,reel:x.reelNetPrevisionnel,reste:x.resteV37}))};
}