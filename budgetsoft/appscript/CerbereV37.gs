const CERBERE_V37_VERSION='3.7.1';

/**
 * Cerbère 3.7.1 — cockpit quotidien M/M+1.
 * Doctrine :
 * - le Réel vient uniquement d'Operations ;
 * - les recettes R0 sont créditées une fois au départ puis corrigées par l'écart réel ;
 * - les dépenses consomment progressivement la capacité ;
 * - les CB pilotables achetées en M sont engagées sur M+1 ;
 * - CF0 est synthétique et une occurrence réelle rapprochée remplace le prévu ;
 * - Planification réserve les dépenses futures et pondère les recettes futures ;
 * - le détail affiché reste strictement pilotable.
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
  let reportProjete=null;

  periodes.forEach((p,i)=>{
    const pi=p.periode||p;
    assurerDiversV37_(p);
    const ev=previsionsEvenementsV371_(events,pi,p0Cats,catType);
    const opsPeriode=operations.filter(o=>dateDansPeriodeV37_(dateOperationCouranteBudgetSoft_(o),pi));
    const opsPassees=i===0?opsPeriode.filter(o=>{const d=dateOperationCouranteBudgetSoft_(o);return d&&d<=new Date();}):[];

    // R0 est chargé une fois. Le réel ne s'ajoute jamais au canon : il ne fait que corriger son écart.
    const reelR0={};
    opsPeriode.forEach(o=>{const m=Number(o.montant||0),cat=String(o.categorie||'').trim();if(m>0&&r0Cats.has(cat))reelR0[cat]=(reelR0[cat]||0)+m;});
    let correctionR0=0,recettesR0Restantes=0;
    r0Postes.forEach(x=>{const cat=String(x.categorie||'').trim(),canon=Number(x.montant||0),reel=Number(reelR0[cat]||0);if(i===0){if(reel>0)correctionR0+=reel-canon;else recettesR0Restantes+=canon;}});

    // CF0 : seules les liaisons explicites charge_fixe_id réalisent une occurrence.
    const idsFixesPasses=new Set(opsPeriode.map(o=>String(o.charge_fixe_id||'').trim()).filter(Boolean));
    const chargesActives=(charges||[]).filter(c=>{try{return chargeActiveCerbere_(c,pi);}catch(e){return String(c.actif).toLowerCase()!=='false';}});
    const cfTotal=arrV37_(chargesActives.reduce((s,c)=>s+Math.abs(Number(c.montant||c.montant_indicatif||0)),0));
    const cfRestantes=i===0?arrV37_(chargesActives.reduce((s,c)=>s+(idsFixesPasses.has(String(c.id||'').trim())?0:Math.abs(Number(c.montant||c.montant_indicatif||0))),0)):cfTotal;

    // Le solde actuel est la vérité du présent. Pour les périodes futures on reporte la projection précédente.
    const mouvementPasse=opsPassees.reduce((s,o)=>s+Number(o.montant||0),0);
    const soldeOuverture=i===0?arrV37_(soldeActuel-mouvementPasse):arrV37_(reportProjete||0);
    const pointDepart=i===0
      ?arrV37_(soldeOuverture+r0Total+ev.recettesInitiales-cfTotal-ev.depensesHorsPilotable)
      :arrV37_(Number(reportProjete||0)+r0Total+ev.recettesInitiales-cfTotal-ev.depensesHorsPilotable);
    const ecartInitial=arrV37_(pointDepart-p0Total);

    // Joker : si les engagements hérités excèdent la capacité de compensation, retour explicite à P0.
    const cbHeritee=Number(p.roulant&&p.roulant.cbHeritee||0);
    const jokerAuto=cbHeritee>Math.max(0,pointDepart);
    const joker=etatJokerCerbereV37_(p,jokerAuto);
    if(joker.actif)(p.enveloppes||[]).forEach(x=>x.prevu=Number(x.canon||0));
    else appliquerEcartInitialV37_(p,ecartInitial,p0Total);

    // Les événements pilotables sont des réservations par catégorie. On évite de les perdre dans un Plan global.
    let engagePilotable=0,restePilotable=0;
    (p.enveloppes||[]).forEach(x=>{
      const cat=String(x.categorie||'').trim();
      const santeAttendue=cat==='Santé'?Number(ev.remboursementsSante||0):0;
      const reelBrut=Math.max(0,Number(x.reelImpute||0));
      const reelNet=Math.max(0,reelBrut-santeAttendue);
      const planBase=Number(x.planifie||0);
      const planEvent=Number(ev.depensesPilotablesParCategorie[cat]||0);
      const plan=arrV37_(Math.max(planBase,planEvent)); // compatibilité : ne pas doubler un événement déjà projeté par le socle.
      x.planifie=plan;x.reelNetPrevisionnel=arrV37_(reelNet);x.remboursementsAttendus=arrV37_(santeAttendue);
      x.engageV37=arrV37_(reelNet+plan);x.resteV37=arrV37_(Number(x.prevu||0)-x.engageV37);
      engagePilotable+=x.engageV37;restePilotable+=x.resteV37;
    });

    // M = aujourd'hui -> 27 : le réel passé est déjà dans le solde actuel. On ne le soustrait donc pas une seconde fois.
    // Les recettes R0 non encore constatées restent attendues ; celles constatées ne sont remplacées que par leur écart au canon.
    const sortiesConfirmees=arrV37_(ev.depensesFutures+ev.depensesHorsPilotableFutures);
    const recettesHorsR0Reelles=i===0?opsPeriode.reduce((s,o)=>{const m=Number(o.montant||0),cat=String(o.categorie||'').trim();return s+(m>0&&!r0Cats.has(cat)?m:0);},0):0;
    const ajustementTresorerie=i===0?arrV37_(recettesHorsR0Reelles):0;
    const disponibleJusquau27=i===0?arrV37_(soldeActuel+recettesR0Restantes+correctionR0+ev.recettesFutures-cfRestantes-sortiesConfirmees):null;

    // M+1 : le report projeté est produit par M, puis R0/CF0/CB/Plan prennent le relais.
    const horsReel=Number(p.roulant&&p.roulant.horsPilotable&&p.roulant.horsPilotable.total||0);
    const planPilotable=arrV37_((p.enveloppes||[]).reduce((s,x)=>s+Number(x.planifie||0),0));
    const capaciteProjetee=i===0
      ?disponibleJusquau27
      :arrV37_(Number(reportProjete||0)+r0Total+ev.recettesInitiales-cfTotal-cbHeritee-planPilotable-horsReel-ev.depensesHorsPilotable);
    const finProjetee=i===0?arrV37_(disponibleJusquau27-Math.max(0,restePilotable)):capaciteProjetee;
    reportProjete=finProjetee;

    p.v37={pointDepart,soldeOuverture,ecartInitial,recettesCanon:arrV37_(r0Total),recettesR0Restantes:arrV37_(recettesR0Restantes),correctionRecettesReelles:arrV37_(correctionR0),recettesEvenements:arrV37_(ev.recettesInitiales),chargesFixesTotal:cfTotal,chargesFixesRestantes:cfRestantes,remboursementsSanteAttendus:arrV37_(ev.remboursementsSante),depensesEvenementsHorsPilotable:arrV37_(ev.depensesHorsPilotable),sortiesFuturesConfirmees:sortiesConfirmees,ajustementTresorerie,disponibleJusquau27,finProjetee,capaciteProjetee,disponibleEnveloppes:arrV37_(restePilotable),engagePilotable:arrV37_(engagePilotable),joker,doctrine:i===0?'Aujourd’hui → 27 : le solde actuel contient déjà le passé ; seules les recettes restantes, écarts R0, CF0 restantes et sorties futures confirmées modifient le disponible.':'28 → 27 : report projeté + R0 − CF0 − CB de M − Plan − hors-enveloppes connus.'};
    p.capaciteTresorerie=arrV37_(capaciteProjetee);p.capacitePilotable=p.capaciteTresorerie;p.resteBudgetPilotable=arrV37_(restePilotable);p.resteBudgetAlloue=p.resteBudgetPilotable;p.budgetReparti=arrV37_((p.enveloppes||[]).reduce((s,x)=>s+Number(x.prevu||0),0));
  });

  base.version=CERBERE_V37_VERSION;base.principe='Cerbère 3.7 : présent et futur proche. Recettes chargées une fois puis corrigées par écart ; dépenses consommées au fil du réel/engagé ; CB pilotables de M portées par M+1 ; CF0 synthétique.';base.fenetreRoulante=fenetreV37_(periodes);base.diagnostic=base.diagnostic||{};base.diagnostic.moteur_37=CERBERE_V37_VERSION;base.diagnostic.doctrine_recettes='R0 initial + correction écart réel, jamais R0 + réel';return serialiserCerberePourClient_(base);
}

function previsionsEvenementsV371_(events,periode,p0Cats,catType){
  const out={recettesInitiales:0,recettesFutures:0,depensesFutures:0,depensesHorsPilotable:0,depensesHorsPilotableFutures:0,remboursementsSante:0,depensesPilotablesParCategorie:{}};
  (events||[]).forEach(e=>{
    if(['Rapproché','Annulé','Réalisé'].includes(String(e.statut||''))||String(e.certitude||'certaine')==='possible')return;
    const occ=typeof occurrencesEvenementV4_==='function'?occurrencesEvenementV4_(e):[{montant:Math.abs(Number(e.montant||0)),date:e.date_effet}];
    occ.forEach(o=>{
      let impact=o.date;
      if(String(e.type||'')==='depense'&&normaliserV37_(e.mode_paiement)==='cb')impact=dateImpactCbPlanV37_(o.date);
      if(!dateDansPeriodeV37_(impact,periode))return;
      const m=Math.abs(Number(o.montant||0)),cat=String(e.categorie||'').trim(),isRec=String(e.type||'')==='recette';
      if(isRec){out.recettesInitiales+=m;out.recettesFutures+=m;if(/sante|remboursement/.test(normaliserV37_(cat+' '+e.libelle)))out.remboursementsSante+=m;return;}
      if(p0Cats.has(cat)){out.depensesPilotablesParCategorie[cat]=(out.depensesPilotablesParCategorie[cat]||0)+m;out.depensesFutures+=m;}
      else{out.depensesHorsPilotable+=m;out.depensesHorsPilotableFutures+=m;}
    });
  });
  Object.keys(out).forEach(k=>{if(typeof out[k]==='number')out[k]=arrV37_(out[k]);});return out;
}

function dateImpactCbPlanV37_(dateAchat){
  const d=dateValideVentilationBudgetSoft_(dateAchat);if(!d)return dateAchat;
  // Doctrine BudgetSoft : achat CB du cycle M -> cycle M+1. Le 28 du cycle suivant suffit à déterminer l'imputation.
  const finCycle=d.getDate()>=28?new Date(d.getFullYear(),d.getMonth()+2,27):new Date(d.getFullYear(),d.getMonth()+1,27);
  const debutSuivant=new Date(finCycle.getFullYear(),finCycle.getMonth(),28);debutSuivant.setMonth(debutSuivant.getMonth()-1);
  return Utilities.formatDate(debutSuivant,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function appliquerEcartInitialV37_(p,ecart,p0Total){
  if(Math.abs(ecart)<.01)return;
  const total=Number(p.budgetReparti||0);if(Math.abs(total-p0Total)>.01)return; // une dérogation locale validée reste prioritaire.
  const divers=(p.enveloppes||[]).find(x=>String(x.categorie||'').trim()==='Divers');if(divers)divers.prevu=arrV37_(Math.max(0,Number(divers.prevu||0)+ecart));
}
function assurerDiversV37_(p){const e=p.enveloppes||(p.enveloppes=[]);if(e.some(x=>String(x.categorie||'').trim()==='Divers'))return;e.push({categorie:'Divers',canon:0,monetaire:0,pluxee:0,nature:'ajustable',prevu:0,planifie:0});}
function etatJokerCerbereV37_(p,auto){const cle='CERBERE_JOKER_'+String(p.clePilotage||p.periode&&p.periode.debut||'');const v=PropertiesService.getDocumentProperties().getProperty(cle),actif=v==='on'?true:v==='off'?false:!!auto;return{actif,automatique:v==null&&!!auto,raison:actif?'Engagements hérités supérieurs à la capacité de compensation : P0 sert temporairement de garde-fou.':'Joker désactivé : le Réel et les ajustements locaux reprennent la main.',cle};}
function reglerJokerCerbereV37(cle,actif){if(!cle)throw new Error('Période Cerbère introuvable.');PropertiesService.getDocumentProperties().setProperty('CERBERE_JOKER_'+String(cle),actif?'on':'off');return chargerCerbereV37();}
function reinitialiserJokerAutoCerbereV37(cle){PropertiesService.getDocumentProperties().deleteProperty('CERBERE_JOKER_'+String(cle));return chargerCerbereV37();}
function fenetreV37_(periodes){const m=periodes[0],n=periodes[1];if(!m||!n)return null;const cm=Number(m.v37&&m.v37.capaciteProjetee||0),cn=Number(n.v37&&n.v37.capaciteProjetee||0);let niveau='vert',titre='Pilotage quotidien soutenable';const raisons=[];if(cm<0||cn<0){niveau='rouge';titre='Risque de trésorerie à court terme';}else if(Number(m.resteBudgetPilotable||0)<0||Number(n.resteBudgetPilotable||0)<0){niveau='orange';titre='Enveloppes à rééquilibrer';}if(cm<0)raisons.push('M : capacité restante '+arrV37_(cm)+' €');if(cn<0)raisons.push('M+1 : capacité projetée '+arrV37_(cn)+' €');if(m.v37&&m.v37.joker&&m.v37.joker.actif)raisons.push('joker actif sur M');if(n.v37&&n.v37.joker&&n.v37.joker.actif)raisons.push('joker actif sur M+1');if(Number(n.roulant&&n.roulant.cbHeritee||0)>0)raisons.push(arrV37_(n.roulant.cbHeritee)+' € de CB pilotables de M déjà engagées sur M+1');if(Number(m.v37&&m.v37.correctionRecettesReelles||0)!==0)raisons.push('écart réel/R0 sur M : '+arrV37_(m.v37.correctionRecettesReelles)+' €');if(Number(m.v37&&m.v37.remboursementsSanteAttendus||0)>0)raisons.push(arrV37_(m.v37.remboursementsSanteAttendus)+' € de remboursements santé attendus intégrés');if(!raisons.length)raisons.push('le disponible à court terme reste positif');return{niveau,titre,raisons,disponibleM:arrV37_(cm),capaciteM1:arrV37_(cn)};}
function dateDansPeriodeV37_(date,p){const d=dateValideVentilationBudgetSoft_(date),a=dateValideVentilationBudgetSoft_(p&&p.debut),z=dateValideVentilationBudgetSoft_(p&&p.fin);if(!d||!a||!z)return false;const t=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();return t>=new Date(a.getFullYear(),a.getMonth(),a.getDate()).getTime()&&t<=new Date(z.getFullYear(),z.getMonth(),z.getDate()).getTime();}
function normaliserV37_(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function arrV37_(n){return Math.round(Number(n||0)*100)/100;}
