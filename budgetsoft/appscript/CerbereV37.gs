const CERBERE_V37_VERSION='3.7.3';

/**
 * Cerbère 3.7.3 — cockpit quotidien M/M+1.
 * Invariants :
 * - P0/R0/CF0 restent des maîtres et ne sont jamais réécrits par le Réel ;
 * - P1 est l'allocation pilotable locale du cycle ;
 * - RPt1 = P1 - pilotable déjà consommé/engagé ;
 * - Rt1/CFt1/DPt1 réévaluent le cycle : réel pour ce qui est réalisé,
 *   prévision de période pour ce qui reste à venir ;
 * - SS1 est le solde significatif de départ ;
 * - SCt1 = SS1 + Rt1 - CFt1 - DPt1 ;
 * - SHBt1 est comparé au solde Cerbère présent pour expliquer tout écart.
 */
function chargerCerbereV37(){
  const base=chargerCerbereRoulant();
  if(!base||base.ok===false)return base;
  const operations=dedoublonnerOperationsCartesBudgetSoft_(lireTable_('Operations'));
  const charges=lireTable_('Charges_fixes');
  const categories=lireTable_('Categories');
  const events=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):lireTablePlanCerbere_('Plan_Evenements');
  const periodes=base.periodes||[];
  const p0Total=Number(base.p0&&base.p0.totaux&&base.p0.totaux.monetaire||0);
  const r0Postes=(base.recettesCanon&&base.recettesCanon.postes)||[];
  const r0Total=Number(base.recettesCanon&&base.recettesCanon.total||0);
  const r0Cats=new Set(r0Postes.map(x=>String(x.categorie||'').trim()).filter(Boolean));
  const p0Cats=new Set((base.p0&&base.p0.postes||[]).map(x=>String(x.categorie||'').trim()).filter(Boolean));p0Cats.add('Divers');
  const catType={};(categories||[]).forEach(c=>catType[String(c.nom||c.categorie||'').trim()]=String(c.type||'').trim().toLowerCase());
  const soldeActuel=Number(base.reel&&base.reel.soldeBancaire||0);
  const chargeById={};(charges||[]).forEach(c=>{const id=String(c.id||'').trim();if(id)chargeById[id]=c;});
  const maintenant=new Date();
  let reportProjete=null;

  periodes.forEach((p,i)=>{
    const pi=p.periode||p;
    assurerDiversV37_(p);
    const ev=previsionsEvenementsV371_(events,pi,p0Cats,catType);

    // Deux lectures des dates coexistent volontairement :
    // - date bancaire/comptable pour reconstruire le solde du compte ;
    // - date d'imputation Cerbère déjà portée par le moteur roulant pour les enveloppes.
    const opsPeriode=operations.filter(o=>dateDansPeriodeV37_(dateOperationCouranteBudgetSoft_(o),pi));
    const opsPassees=i===0?opsPeriode.filter(o=>{const d=dateOperationCouranteBudgetSoft_(o);return d&&d<=maintenant;}):[];

    /* ========================= Rt1 · recettes réévaluées =========================
     * Pour chaque poste R1 : le Réel constaté remplace la prévision ; sinon la
     * prévision du cycle reste retenue. Les recettes réelles hors R0 et les
     * événements futurs confirmés s'ajoutent comme déformations propres au cycle.
     */
    const reelR0={};
    opsPeriode.forEach(o=>{
      const d=dateOperationCouranteBudgetSoft_(o),m=Number(o.montant||0),cat=String(o.categorie||'').trim();
      if(d&&d<=maintenant&&m>0&&r0Cats.has(cat))reelR0[cat]=(reelR0[cat]||0)+m;
    });
    let rt1Socle=0,correctionR0=0,recettesR0Restantes=0;
    r0Postes.forEach(x=>{
      const cat=String(x.categorie||'').trim(),canon=Number(x.montant||0),reel=Number(reelR0[cat]||0);
      const retenu=reel>0?reel:canon;
      rt1Socle+=retenu;
      if(i===0){if(reel>0)correctionR0+=reel-canon;else recettesR0Restantes+=canon;}
    });
    const recettesHorsR0Reelles=i===0?opsPeriode.reduce((s,o)=>{
      const d=dateOperationCouranteBudgetSoft_(o),m=Number(o.montant||0),cat=String(o.categorie||'').trim();
      if(!d||d>maintenant||m<=0||r0Cats.has(cat))return s;
      return s+m;
    },0):0;
    const rt1=arrV37_(rt1Socle+recettesHorsR0Reelles+ev.recettesFutures);

    /* ========================= CFt1 · charges fixes réévaluées ========================= */
    const cfSocle=Number(p.fixesPonderees!=null?p.fixesPonderees:p.fixesBrutes||0);
    const cfTotal=arrV37_(cfSocle>0?cfSocle:cfTotalSecoursV372_(charges,pi));
    let cfAttenduRealise=0,cfReelRealise=0,nbCfRealises=0;
    if(i===0){
      const vus=new Set();
      opsPeriode.forEach(o=>{
        const d=dateOperationCouranteBudgetSoft_(o),id=String(o.charge_fixe_id||'').trim();
        if(!d||d>maintenant||!id||vus.has(id))return;
        vus.add(id);nbCfRealises++;
        const c=chargeById[id];
        cfAttenduRealise+=Math.abs(Number(c&&(c.montant!=null?c.montant:c.montant_indicatif)||0));
        cfReelRealise+=Math.abs(Number(o.montant||0));
      });
    }
    const cft1=arrV37_(Math.max(0,cfTotal-cfAttenduRealise)+cfReelRealise);
    const cfRestantes=i===0?arrV37_(Math.max(0,cfTotal-cfAttenduRealise)):cfTotal;

    /* ========================= SS1 · solde significatif =========================
     * Tant qu'aucun SS1 validé n'est stocké pour le cycle, on reconstitue un
     * candidat depuis SHBt1 et les mouvements bancaires réellement présents.
     * Ce candidat est explicitement marqué « reconstitué » : il ne vaut pas
     * validation de frontière 27/28.
     */
    const clePeriode=String(p.clePilotage||pi.debut||'');
    const propSS1=PropertiesService.getDocumentProperties().getProperty('CERBERE_SS1_'+clePeriode);
    const mouvementBancairePasse=opsPassees.reduce((s,o)=>s+Number(o.montant||0),0);
    const ss1Valide=propSS1!==null&&propSS1!==''&&Number.isFinite(Number(propSS1));
    const ss1=i===0
      ?arrV37_(ss1Valide?Number(propSS1):soldeActuel-mouvementBancairePasse)
      :arrV37_(Number(reportProjete||0));

    const cbHeritee=Number(p.roulant&&p.roulant.cbHeritee||0);
    const jokerAuto=cbHeritee>Math.max(0,ss1+rt1-cft1);
    const joker=etatJokerCerbereV37_(p,jokerAuto);
    if(joker.actif)(p.enveloppes||[]).forEach(x=>x.prevu=Number(x.canon||0));

    /* ========================= P1 / RPt1 / DPt1 ========================= */
    const allocationAvant=arrV37_((p.enveloppes||[]).reduce((s,x)=>s+Number(x.prevu||0),0));
    let engagePilotable=0,restePilotable=0,dpt1=0;
    (p.enveloppes||[]).forEach(x=>{
      const cat=String(x.categorie||'').trim();
      const santeAttendue=cat==='Santé'?Number(ev.remboursementsSante||0):0;
      const reelBrut=Math.max(0,Number(x.reelImpute||0));
      const reelNet=Math.max(0,reelBrut-santeAttendue);
      const planBase=Number(x.planifie||0);
      const planEvent=Number(ev.depensesPilotablesParCategorie[cat]||0);
      const plan=arrV37_(Math.max(planBase,planEvent));
      const engage=arrV37_(reelNet+plan);
      const allocation=Math.max(0,Number(x.prevu||0));
      x.planifie=plan;
      x.reelNetPrevisionnel=arrV37_(reelNet);
      x.remboursementsAttendus=arrV37_(santeAttendue);
      x.engageV37=engage;
      x.resteV37=arrV37_(allocation-engage);
      // DPt1 = Réel/engagé pour la partie connue + D1 pour le futur restant.
      // Tant que l'enveloppe n'est pas dépassée, la dépense de fin de cycle
      // projetée est donc l'allocation P1 ; un dépassement réel l'augmente.
      x.dpt1=arrV37_(Math.max(allocation,engage));
      engagePilotable+=engage;
      restePilotable+=x.resteV37;
      dpt1+=x.dpt1;
    });
    dpt1=arrV37_(dpt1);
    restePilotable=arrV37_(restePilotable);
    engagePilotable=arrV37_(engagePilotable);

    /* ========================= SCt1 · trajectoire réévaluée ========================= */
    const dt1=arrV37_(cft1+dpt1);
    const sct1=arrV37_(ss1+rt1-dt1);

    /* ========================= contrôle SHBt1 / SC-présent =========================
     * Le solde Cerbère présent utilise uniquement les mouvements bancaires déjà
     * constatés depuis SS1. S'il diffère de Hello bank, l'écart doit être expliqué
     * par les frontières, opérations manquantes/provisoires ou décalages bancaires.
     */
    const scPresent=i===0?arrV37_(ss1+mouvementBancairePasse):null;
    const ecartHelloCerbere=i===0?arrV37_(soldeActuel-scPresent):null;

    // Compatibilité avec les autres composants 3.7 : le « disponible » principal
    // devient le reliquat pilotable RPt1. La soutenabilité est portée par SCt1.
    const disponibleJusquau27=i===0?restePilotable:null;
    const capaciteProjetee=sct1;
    const finProjetee=sct1;
    reportProjete=finProjetee;

    const pointDepart=arrV37_(ss1+rt1-cft1);
    const margeInitiale=arrV37_(pointDepart-allocationAvant);
    const ecartInitial=arrV37_(pointDepart-p0Total);

    p.v37={
      pointDepart,soldeOuverture:ss1,ss1,ss1Valide,ss1Statut:ss1Valide?'validé':'reconstitué à contrôler',
      rt1,cft1,dpt1,dt1,sct1,scPresent,shbt1:i===0?arrV37_(soldeActuel):null,ecartHelloCerbere,
      ecartInitial,margeInitiale,
      recettesCanon:arrV37_(r0Total),recettesR0Restantes:arrV37_(recettesR0Restantes),correctionRecettesReelles:arrV37_(correctionR0),recettesEvenements:arrV37_(ev.recettesFutures),recettesHorsR0Reelles:arrV37_(recettesHorsR0Reelles),
      chargesFixesTotal:cfTotal,chargesFixesRestantes:cfRestantes,chargesFixesAttenduRealise:arrV37_(cfAttenduRealise),chargesFixesReelRealise:arrV37_(cfReelRealise),chargesFixesRealisees:nbCfRealises,
      remboursementsSanteAttendus:arrV37_(ev.remboursementsSante),depensesEvenementsHorsPilotable:arrV37_(ev.depensesHorsPilotable),
      disponibleJusquau27,finProjetee,capaciteProjetee,disponibleEnveloppes:restePilotable,engagePilotable,joker,
      doctrine:i===0?'RPt1 = P1 − pilotable consommé/engagé. SCt1 = SS1 + Rt1 − CFt1 − DPt1. SHBt1 est contrôlé séparément contre le solde Cerbère présent.':'M+1 utilise comme SS1 le SCt1 projeté de M, puis applique Rt1 − CFt1 − DPt1.'
    };
    p.capaciteTresorerie=sct1;
    p.capacitePilotable=restePilotable;
    p.resteBudgetPilotable=restePilotable;
    p.resteBudgetAlloue=restePilotable;
    p.budgetReparti=allocationAvant;
  });

  base.version=CERBERE_V37_VERSION;
  base.principe='Cerbère 3.7.3 : P1 mesure l’autorisation pilotable ; RPt1 son reliquat. SS1 + Rt1 − CFt1 − DPt1 produit SCt1, trajectoire réévaluée de fin de cycle. SHBt1 est contrôlé séparément.';
  base.fenetreRoulante=fenetreV37_(periodes);
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.moteur_37=CERBERE_V37_VERSION;
  base.diagnostic.doctrine_pt='RPt1 = P1 - consommé/engagé ; SCt1 = SS1 + Rt1 - CFt1 - DPt1';
  base.diagnostic.doctrine_coherence='SHBt1 comparé au solde Cerbère présent ; tout écart doit être mathématiquement explicable';
  return serialiserCerberePourClient_(base);
}

/** Valide explicitement le solde significatif du cycle. */
function enregistrerSS1CerbereV373(cle,montant){
  if(!cle)throw new Error('Période Cerbère introuvable.');
  const n=Number(montant);if(!Number.isFinite(n))throw new Error('SS1 invalide.');
  PropertiesService.getDocumentProperties().setProperty('CERBERE_SS1_'+String(cle),String(arrV37_(n)));
  return chargerCerbereV37();
}

function cfTotalSecoursV372_(charges,periode){
  return arrV37_((charges||[]).reduce((s,c)=>{
    const actif=!(c.actif===false||String(c.actif||'').trim().toLowerCase()==='false'||String(c.actif||'').trim().toLowerCase()==='non');if(!actif)return s;
    const deb=dateValideVentilationBudgetSoft_(c.date_debut||c.debut||c.date_effet),fin=dateValideVentilationBudgetSoft_(c.date_fin||c.fin),p0=dateValideVentilationBudgetSoft_(periode&&periode.debut),p1=dateValideVentilationBudgetSoft_(periode&&periode.fin);
    if(deb&&p1&&deb>p1)return s;if(fin&&p0&&fin<p0)return s;
    return s+Math.abs(Number(c.montant!=null?c.montant:c.montant_indicatif||0));
  },0));
}

function previsionsEvenementsV371_(events,periode,p0Cats,catType){
  const out={recettesInitiales:0,recettesFutures:0,depensesFutures:0,depensesHorsPilotable:0,depensesHorsPilotableFutures:0,remboursementsSante:0,depensesPilotablesParCategorie:{}};
  const maintenant=new Date();
  (events||[]).forEach(e=>{
    if(['Rapproché','Annulé','Réalisé'].includes(String(e.statut||''))||String(e.certitude||'certaine')==='possible')return;
    const occ=typeof occurrencesEvenementV4_==='function'?occurrencesEvenementV4_(e):[{montant:Math.abs(Number(e.montant||0)),date:e.date_effet}];
    occ.forEach(o=>{
      let impact=o.date;
      if(String(e.type||'')==='depense'&&normaliserV37_(e.mode_paiement)==='cb')impact=dateImpactCbPlanV37_(o.date);
      if(!dateDansPeriodeV37_(impact,periode))return;
      const dateImpact=dateValideVentilationBudgetSoft_(impact);
      const futur=!dateImpact||dateImpact>maintenant;
      const m=Math.abs(Number(o.montant||0)),cat=String(e.categorie||'').trim(),isRec=String(e.type||'')==='recette';
      if(isRec){
        out.recettesInitiales+=m;
        if(futur)out.recettesFutures+=m;
        if(/sante|remboursement/.test(normaliserV37_(cat+' '+e.libelle)))out.remboursementsSante+=m;
        return;
      }
      if(p0Cats.has(cat)){
        out.depensesPilotablesParCategorie[cat]=(out.depensesPilotablesParCategorie[cat]||0)+m;
        if(futur)out.depensesFutures+=m;
      }else{
        out.depensesHorsPilotable+=m;
        if(futur)out.depensesHorsPilotableFutures+=m;
      }
    });
  });
  Object.keys(out).forEach(k=>{if(typeof out[k]==='number')out[k]=arrV37_(out[k]);});return out;
}
function dateImpactCbPlanV37_(dateAchat){const d=dateValideVentilationBudgetSoft_(dateAchat);if(!d)return dateAchat;const finCycle=d.getDate()>=28?new Date(d.getFullYear(),d.getMonth()+2,27):new Date(d.getFullYear(),d.getMonth()+1,27);const debutSuivant=new Date(finCycle.getFullYear(),finCycle.getMonth(),28);debutSuivant.setMonth(debutSuivant.getMonth()-1);return Utilities.formatDate(debutSuivant,Session.getScriptTimeZone(),'yyyy-MM-dd');}
function assurerDiversV37_(p){const e=p.enveloppes||(p.enveloppes=[]);if(e.some(x=>String(x.categorie||'').trim()==='Divers'))return;e.push({categorie:'Divers',canon:0,monetaire:0,pluxee:0,nature:'ajustable',prevu:0,planifie:0});}
function etatJokerCerbereV37_(p,auto){const cle='CERBERE_JOKER_'+String(p.clePilotage||p.periode&&p.periode.debut||'');const v=PropertiesService.getDocumentProperties().getProperty(cle),actif=v==='on'?true:v==='off'?false:!!auto;return{actif,automatique:v==null&&!!auto,raison:actif?'Engagements hérités supérieurs à la capacité de compensation : P0 sert temporairement de garde-fou.':'Joker désactivé : le Réel et les ajustements locaux reprennent la main.',cle};}
function reglerJokerCerbereV37(cle,actif){if(!cle)throw new Error('Période Cerbère introuvable.');PropertiesService.getDocumentProperties().setProperty('CERBERE_JOKER_'+String(cle),actif?'on':'off');return chargerCerbereV37();}
function reinitialiserJokerAutoCerbereV37(cle){PropertiesService.getDocumentProperties().deleteProperty('CERBERE_JOKER_'+String(cle));return chargerCerbereV37();}
function fenetreV37_(periodes){
  const m=periodes[0],n=periodes[1];if(!m||!n)return null;
  const scm=Number(m.v37&&m.v37.sct1||0),scn=Number(n.v37&&n.v37.sct1||0),rpm=Number(m.resteBudgetPilotable||0),rpn=Number(n.resteBudgetPilotable||0);
  let niveau='vert',titre='Pilotage quotidien soutenable';const raisons=[];
  if(scm<0||scn<0){niveau='rouge';titre='Trajectoire de fin de cycle à corriger';}
  else if(rpm<0||rpn<0){niveau='orange';titre='Enveloppes à rééquilibrer';}
  if(rpm<0)raisons.push('M : reliquat P1 '+arrV37_(rpm)+' €');
  if(scm<0)raisons.push('M : SCt1 '+arrV37_(scm)+' €');
  if(scn<0)raisons.push('M+1 : SCt1 projeté '+arrV37_(scn)+' €');
  if(m.v37&&Math.abs(Number(m.v37.ecartHelloCerbere||0))>.01)raisons.push('écart SHB/SC présent '+arrV37_(m.v37.ecartHelloCerbere)+' € à expliquer');
  if(m.v37&&m.v37.joker&&m.v37.joker.actif)raisons.push('joker actif sur M');
  if(n.v37&&n.v37.joker&&n.v37.joker.actif)raisons.push('joker actif sur M+1');
  if(Number(n.roulant&&n.roulant.cbHeritee||0)>0)raisons.push(arrV37_(n.roulant.cbHeritee)+' € de CB pilotables de M déjà engagées sur M+1');
  if(!raisons.length)raisons.push('reliquat pilotable et trajectoire de fin de cycle restent positifs');
  return{niveau,titre,raisons,disponibleM:arrV37_(rpm),capaciteM1:arrV37_(scn)};
}
function dateDansPeriodeV37_(date,p){const d=dateValideVentilationBudgetSoft_(date),a=dateValideVentilationBudgetSoft_(p&&p.debut),z=dateValideVentilationBudgetSoft_(p&&p.fin);if(!d||!a||!z)return false;const t=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();return t>=new Date(a.getFullYear(),a.getMonth(),a.getDate()).getTime()&&t<=new Date(z.getFullYear(),z.getMonth(),z.getDate()).getTime();}
function normaliserV37_(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function arrV37_(n){return Math.round(Number(n||0)*100)/100;}
