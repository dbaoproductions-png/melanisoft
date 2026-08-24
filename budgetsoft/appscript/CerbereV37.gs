const CERBERE_V37_VERSION='3.7.0';

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
  const catType={};(categories||[]).forEach(c=>catType[String(c.nom||'').trim()]=String(c.type||'').trim().toLowerCase());
  const p0Cats=new Set((base.p0&&base.p0.postes||[]).map(x=>String(x.categorie||'').trim()).filter(Boolean));p0Cats.add('Divers');
  const soldeActuel=Number(base.reel&&base.reel.soldeBancaire||0);
  let finProjeteePrecedente=null;
  periodes.forEach((p,i)=>{
    const pInfo=p.periode||p;
    const reelPeriode=operations.filter(o=>dateDansPeriodeV37_(dateOperationCouranteBudgetSoft_(o),pInfo));
    const reelJusquaAuj=i===0?reelPeriode.filter(o=>{const d=dateOperationCouranteBudgetSoft_(o);return d&&d<=new Date();}):[];
    const mouvementReel=reelJusquaAuj.reduce((s,o)=>s+Number(o.montant||0),0);
    const soldeOuverture=i===0?arrV37_(soldeActuel-mouvementReel):(finProjeteePrecedente==null?0:finProjeteePrecedente);

    const revenusReelsParCat={};reelPeriode.forEach(o=>{const m=Number(o.montant||0),cat=String(o.categorie||'').trim();if(m>0&&catType[cat]==='revenu')revenusReelsParCat[cat]=(revenusReelsParCat[cat]||0)+m;});
    const recettesRestantes=i===0?r0Postes.reduce((s,x)=>{const cat=String(x.categorie||'').trim();return s+(Number(revenusReelsParCat[cat]||0)>0?0:Number(x.montant||0));},0):r0Total;

    const idsFixesPasses=new Set(reelPeriode.map(o=>String(o.charge_fixe_id||'').trim()).filter(Boolean));
    const chargesActives=(charges||[]).filter(c=>{try{return chargeActiveCerbere_(c,pInfo);}catch(e){return String(c.actif).toLowerCase()!=='false';}});
    const cfTotal=arrV37_(chargesActives.reduce((s,c)=>s+Math.abs(Number(c.montant||c.montant_indicatif||0)),0));
    const cfRestantes=i===0?arrV37_(chargesActives.reduce((s,c)=>s+(idsFixesPasses.has(String(c.id||'').trim())?0:Math.abs(Number(c.montant||c.montant_indicatif||0))),0)):cfTotal;

    const ev=previsionsEvenementsV37_(events,pInfo,p0Cats);
    const pointDepart=arrV37_(soldeOuverture+r0Total+ev.recettes-cfTotal-ev.depensesHorsPilotable);
    let allocations=(p.enveloppes||[]);
    const ecartInitial=arrV37_(pointDepart-p0Total);
    const jokerAuto=Number(p.roulant&&p.roulant.cbHeritee||0)>Math.max(0,pointDepart);
    const joker=etatJokerCerbereV37_(p,jokerAuto);
    if(joker.actif){allocations.forEach(x=>x.prevu=Number(x.canon||0));}
    else if(Math.abs(Number(p.budgetReparti||0)-p0Total)<.01&&ecartInitial>0){const d=allocations.find(x=>String(x.categorie||'').trim()==='Divers');if(d)d.prevu=arrV37_(Number(d.prevu||0)+ecartInitial);}

    let engage=0,dispoEnveloppes=0;
    allocations.forEach(x=>{
      const cat=String(x.categorie||'').trim();
      const rembourseSanteAttendus=cat==='Santé'?ev.remboursementsSante:0;
      const reel=Math.max(0,Number(x.reelImpute||0)-rembourseSanteAttendus);
      const plan=Number(x.planifie||0);
      x.reelNetPrevisionnel=arrV37_(reel);
      x.remboursementsAttendus=arrV37_(rembourseSanteAttendus);
      x.engageV37=arrV37_(reel+plan);
      x.resteV37=arrV37_(Number(x.prevu||0)-x.engageV37);
      engage+=x.engageV37;dispoEnveloppes+=Math.max(0,x.resteV37);
    });

    const horsReel=Number(p.roulant&&p.roulant.horsPilotable&&p.roulant.horsPilotable.total||0);
    const futurHorsPilotable=ev.depensesHorsPilotable;
    const dispoJusquau27=i===0?arrV37_(soldeActuel+recettesRestantes+ev.recettesFutures-cfRestantes-futurHorsPilotable):null;
    const finProjetee=i===0?arrV37_(dispoJusquau27-dispoEnveloppes):arrV37_(pointDepart-Number(p.roulant&&p.roulant.cbHeritee||0)-Number(p.planDansEnveloppes||0)-horsReel);
    const capaciteProjetee=i===0?dispoJusquau27:finProjetee;
    finProjeteePrecedente=finProjetee;

    p.v37={
      pointDepart:arrV37_(pointDepart),soldeOuverture:arrV37_(soldeOuverture),ecartInitial,
      recettesCanon:arrV37_(r0Total),recettesRestantes:arrV37_(recettesRestantes),recettesEvenements:arrV37_(ev.recettes),
      chargesFixesTotal:cfTotal,chargesFixesRestantes:cfRestantes,
      remboursementsSanteAttendus:arrV37_(ev.remboursementsSante),
      depensesEvenementsHorsPilotable:arrV37_(ev.depensesHorsPilotable),
      disponibleJusquau27:dispoJusquau27,finProjetee:arrV37_(finProjetee),capaciteProjetee:arrV37_(capaciteProjetee),
      disponibleEnveloppes:arrV37_(dispoEnveloppes),engagePilotable:arrV37_(engage),
      joker,
      doctrine:i===0?'Aujourd’hui → 27 : solde actuel + recettes encore attendues − CF0 restantes − autres sorties confirmées.':'28 → 27 suivant : report projeté + R0 − CF0 − CB déjà engagées − Plan − hors-enveloppes connus.'
    };
    p.capaciteTresorerie=arrV37_(capaciteProjetee);
    p.capacitePilotable=p.capaciteTresorerie;
    p.resteBudgetPilotable=arrV37_(allocations.reduce((s,x)=>s+Number(x.resteV37||0),0));
    p.resteBudgetAlloue=p.resteBudgetPilotable;
    p.budgetReparti=arrV37_(allocations.reduce((s,x)=>s+Number(x.prevu||0),0));
  });
  base.version=CERBERE_V37_VERSION;
  base.principe='Cerbère 3.7 pilote uniquement le présent et le futur proche : le réel bancaire fait autorité, CF0 reste synthétique, les CB sont imputées à leur date réelle d’impact et les recettes prévues sont chargées une fois au début du cycle puis ajustées par le réel.';
  base.fenetreRoulante=fenetreV37_(periodes);
  base.diagnostic=base.diagnostic||{};base.diagnostic.moteur_37=CERBERE_V37_VERSION;
  return serialiserCerberePourClient_(base);
}

function previsionsEvenementsV37_(events,periode,p0Cats){
  let recettes=0,recettesFutures=0,depensesHorsPilotable=0,remboursementsSante=0;
  (events||[]).forEach(e=>{
    if(['Rapproché','Annulé','Réalisé'].includes(String(e.statut||'')))return;
    if(String(e.certitude||'certaine')==='possible')return;
    const occ=typeof occurrencesEvenementV4_==='function'?occurrencesEvenementV4_(e):[{montant:Math.abs(Number(e.montant||0)),date:e.date_effet}];
    occ.forEach(o=>{
      let impact=o.date;
      if(e.type==='depense'&&normaliserV37_(e.mode_paiement)==='cb'){
        const fake={date_achat:o.date,carte_fin:'9999',montant:-Math.abs(Number(o.montant||0))};
        const d=dateImputationCarteCerbereBudgetSoft_(fake);impact=d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):o.date;
      }
      if(!dateDansPeriodeV37_(impact,periode))return;
      const m=Math.abs(Number(o.montant||0)),cat=String(e.categorie||'').trim();
      if(e.type==='recette'){
        recettes+=m;recettesFutures+=m;
        if(/sante|remboursements sante/.test(normaliserV37_(cat+' '+e.libelle)))remboursementsSante+=m;
      }else if(!p0Cats.has(cat))depensesHorsPilotable+=m;
    });
  });
  return{recettes:arrV37_(recettes),recettesFutures:arrV37_(recettesFutures),depensesHorsPilotable:arrV37_(depensesHorsPilotable),remboursementsSante:arrV37_(remboursementsSante)};
}

function etatJokerCerbereV37_(p,auto){
  const cle='CERBERE_JOKER_'+String(p.clePilotage||p.periode&&p.periode.debut||'');
  const v=PropertiesService.getDocumentProperties().getProperty(cle);
  const actif=v==='on'?true:v==='off'?false:!!auto;
  return{actif,automatique:v==null&&!!auto,raison:actif?'CB héritées supérieures à la capacité de compensation : tirettes remises à P0.':'Le réel et les ajustements locaux pondèrent les tirettes.',cle};
}
function reglerJokerCerbereV37(cle,actif){
  if(!cle)throw new Error('Période Cerbère introuvable.');
  PropertiesService.getDocumentProperties().setProperty('CERBERE_JOKER_'+String(cle),actif?'on':'off');
  return chargerCerbereV37();
}
function reinitialiserJokerAutoCerbereV37(cle){PropertiesService.getDocumentProperties().deleteProperty('CERBERE_JOKER_'+String(cle));return chargerCerbereV37();}

function fenetreV37_(periodes){
  const m=periodes[0],n=periodes[1];if(!m||!n)return null;
  const cm=Number(m.v37&&m.v37.capaciteProjetee||0),cn=Number(n.v37&&n.v37.capaciteProjetee||0);
  let niveau='vert',titre='Pilotage quotidien soutenable';const raisons=[];
  if(cm<0||cn<0){niveau='rouge';titre='Risque de trésorerie à court terme';}
  else if(Number(m.resteBudgetPilotable||0)<0||Number(n.resteBudgetPilotable||0)<0){niveau='orange';titre='Enveloppes à rééquilibrer';}
  if(cm<0)raisons.push('M : '+arrV37_(cm)+' € encore disponibles d’ici au 27');
  if(cn<0)raisons.push('M+1 : capacité projetée '+arrV37_(cn)+' €');
  if(m.v37&&m.v37.joker&&m.v37.joker.actif)raisons.push('joker actif sur M');
  if(n.v37&&n.v37.joker&&n.v37.joker.actif)raisons.push('joker actif sur M+1');
  if(Number(n.roulant&&n.roulant.cbHeritee||0)>0)raisons.push(arrV37_(n.roulant.cbHeritee)+' € de CB de M déjà engagées sur M+1');
  if(Number(m.v37&&m.v37.remboursementsSanteAttendus||0)>0)raisons.push(arrV37_(m.v37.remboursementsSanteAttendus)+' € de remboursements santé attendus intégrés');
  if(!raisons.length)raisons.push('le disponible à court terme reste positif');
  return{niveau,titre,raisons,disponibleM:arrV37_(cm),capaciteM1:arrV37_(cn)};
}
function dateDansPeriodeV37_(date,p){const d=dateValideVentilationBudgetSoft_(date),a=dateValideVentilationBudgetSoft_(p&&p.debut),z=dateValideVentilationBudgetSoft_(p&&p.fin);if(!d||!a||!z)return false;const t=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();return t>=new Date(a.getFullYear(),a.getMonth(),a.getDate()).getTime()&&t<=new Date(z.getFullYear(),z.getMonth(),z.getDate()).getTime();}
function normaliserV37_(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function arrV37_(n){return Math.round(Number(n||0)*100)/100;}
