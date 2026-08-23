const CERBERE_V33_VERSION = '3.4.0';
const CERBERE_V33_SHEET = 'Cerbere_Ajustements';

/**
 * Cerbère 3.4 — pilotage mensuel stabilisé.
 *
 * - P0 reste le canon ; P1-P6 ont une ventilation propre ;
 * - budget, réel, Plan et trésorerie restent distincts ;
 * - les charges fixes utilisent leurs échéances réelles et les ajustements saisis ;
 * - les charges fixes reconnues ne sont pas recomptées dans les enveloppes souples ;
 * - la construction de l'enveloppe est exposée à l'interface pour être vérifiable.
 */
function chargerCerbereV33() {
  const d = chargerBaseCerbereV340_();
  if (!d || d.ok === false) return d;
  const ajustements = lireAjustementsCerbereV33_();
  (d.periodes || []).forEach(p => enrichirPeriodePilotableV33_(p, ajustements));
  d.version = CERBERE_V33_VERSION;
  d.principe = 'P0 est le canon ; budget, réel, Plan et trésorerie restent quatre grandeurs distinctes.';
  if (d.diagnostic) d.diagnostic.pilotage = 'revenus_stables_fixes_ajustees_3.4';
  return d;
}

function chargerBaseCerbereV340_() {
  const started = Date.now();
  const timings = {};
  let checkpoint = started;
  let stage = 'initialisation';
  const mark = nom => { const now = Date.now(); timings[nom] = now - checkpoint; checkpoint = now; };
  try {
    verifierInitialisation_();
    assurerTablesPlanCerbere_();
    if (typeof assurerPlanActionsV3_ === 'function') assurerPlanActionsV3_();
    mark('initialisation_ms');

    stage = 'P0 · Budget maître';
    const canon = chargerCanonCerbereV1();
    const heritageP0 = construireHeritageP0CerbereV3_(canon);
    mark('p0_ms');

    stage = 'lecture structure';
    const charges = lireTable_('Charges_fixes');
    const operations = lireTable_('Operations');
    let ajustementsFixes = [];
    try { if (typeof lireAjustementsChargesFixes === 'function') ajustementsFixes = lireAjustementsChargesFixes(); } catch (e) {}
    mark('lecture_structure_ms');

    stage = 'lecture du Plan validé';
    const objectifs = lireTablePlanCerbere_('Plan_Objectifs');
    const actionsToutes = lireFeuilleDynamiqueCerbereV3_('Plan_Actions');
    const actionsExecutables = actionsToutes.filter(actionExecutableCerbereV3_);
    const plan = {
      objectifs,
      objectifsActifs: objectifs.filter(x => !['Terminé','Abandonné','Abandonnée'].includes(String(x.statut || ''))),
      actions: actionsToutes,
      actionsExecutables,
      evenements: lireTablePlanCerbere_('Plan_Evenements')
    };
    mark('lecture_plan_ms');

    stage = 'indexation P1-P6';
    const periodes = construirePeriodesCerbereV2_();
    const fixes = construireFixesAjusteesCerbereV34_(periodes, charges, ajustementsFixes);
    const index = indexerDonneesCerbereV340_(periodes, operations, charges, fixes);
    mark('indexation_ms');

    stage = 'lecture du réel léger';
    const reel = construireReelLegerCerbereV3_(operations, index);
    mark('reel_leger_ms');

    stage = 'construction P1-P6';
    const resultats = periodes.map((p, i) => {
      const r = calculerPeriodeCerbereV3_(p, i, canon, heritageP0, index[i], operations, plan, reel);
      r.fixesTheoriques = Number(index[i].fixesDetails && index[i].fixesDetails.brut || r.fixesBrutes || 0);
      r.ajustementsFixes = Number(index[i].fixesDetails && index[i].fixesDetails.brut || 0) - Number(index[i].fixesP0 || 0);
      r.nbAjustementsFixes = Number(index[i].fixesDetails && index[i].fixesDetails.ajustements || 0);
      return r;
    });
    mark('construction_periodes_ms');

    return serialiserCerberePourClient_({
      ok: true,
      version: CERBERE_V33_VERSION,
      p0: {
        version: canon.version,
        postes: canon.postes,
        totaux: canon.totaux,
        epargneProtegee: canon.epargneProtegee,
        pluxeeMensuel: canon.pluxeeMensuel,
        moisSansPluxee: canon.moisSansPluxee
      },
      reel: resumeReelCerbereV3_(reel),
      periodes: resultats,
      plan: {
        objectifs: plan.objectifs,
        actions_valides: actionsExecutables,
        actions_non_executees: actionsToutes.filter(a => !actionExecutableCerbereV3_(a)),
        evenements: plan.evenements
      },
      diagnostic: {
        duree_ms: Date.now() - started,
        timings,
        operations: operations.length,
        charges_fixes: charges.length,
        ajustements_charges_fixes: ajustementsFixes.length,
        actions_total: actionsToutes.length,
        actions_executees: actionsExecutables.length,
        categories_p0: canon.postes.length,
        optimisation: 'revenus_ancrés_fixes_ajustees_3.4'
      }
    });
  } catch (e) {
    return {ok:false,version:CERBERE_V33_VERSION,stage,erreur:e&&e.message?e.message:String(e),duree_ms:Date.now()-started,timings};
  }
}

function indexerDonneesCerbereV340_(periodes, operations, charges, fixes) {
  const idx = (periodes || []).map((p,i) => ({
    ops:[],recettesReelles:0,depensesReelles:0,depensesParCategorie:{},
    fixesP0:Number(fixes[i] && fixes[i].total || 0),
    fixesDetails:fixes[i] || {brut:0,total:0,ajustements:0}
  }));
  const bornes = (periodes || []).map(p => ({debut:debutJour_(new Date(p.debut)).getTime(),fin:debutJour_(new Date(p.fin)).getTime()}));
  const indexMotifs = indexChargesFixesCerbereV34_(charges);

  (operations || []).forEach(o => {
    const d = dateComptableCerbere_(o); if (!d) return;
    const t = debutJour_(new Date(d)).getTime(); if (!isFinite(t)) return;
    let pi = -1;
    for (let i=0;i<bornes.length;i++) if (t>=bornes[i].debut && t<=bornes[i].fin) { pi=i; break; }
    if (pi < 0) return;

    const b = idx[pi], m = montantSigneCerbereV3_(o);
    b.ops.push(o);
    if (!estTresorerieCerbere_(o)) {
      if (m > 0) b.recettesReelles += m;
      else if (m < 0) b.depensesReelles += Math.abs(m);
    }

    const commentaire = String(o.commentaire || '');
    const technique = /\[RECURRENCE:[^\]]+\]/.test(commentaire);
    const chargeFixeDirecte = /\[CHARGE_FIXE:[^\]]+\]/.test(commentaire) || !!String(o.charge_fixe_id || '').trim();
    const chargeFixeForte = !chargeFixeDirecte && operationCorrespondChargeFixeCerbereV34_(o,indexMotifs);
    if (m < 0 && !estTresorerieCerbere_(o) && !technique && !chargeFixeDirecte && !chargeFixeForte) {
      const cat = String(o.categorie || '').trim();
      if (cat) b.depensesParCategorie[cat] = (b.depensesParCategorie[cat] || 0) + Math.abs(m);
    }
  });
  return idx;
}

function indexChargesFixesCerbereV34_(charges) {
  const out = {};
  (charges || []).forEach(c => {
    if (String(c.actif).toLowerCase() === 'false') return;
    const compte = String(c.compte || '').trim();
    const lib = String(c.libelle_bancaire || c.libelle || '');
    const motif = typeof extraireMotifStableBanque_ === 'function' ? extraireMotifStableBanque_(lib) : normaliserMotifCerbereV34_(lib);
    if (!motif) return;
    const cle = compte + '|' + motif;
    (out[cle] || (out[cle]=[])).push(c);
  });
  return out;
}
function normaliserMotifCerbereV34_(v) { return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }
function operationCorrespondChargeFixeCerbereV34_(o,indexMotifs) {
  if (!o || Number(o.montant||0) >= 0) return false;
  const compte=String(o.compte||'').trim();
  const lib=String(o.libelle_bancaire||o.marchand_normalise||o.libelle||'');
  const motif=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(lib):normaliserMotifCerbereV34_(lib);
  const candidats=indexMotifs[compte+'|'+motif]||[];
  if (!candidats.length) return false;
  const montant=Math.abs(Number(o.montant||0));
  return candidats.some(c=>{
    const attendu=Math.abs(Number(c.montant||0));
    const tol=Math.max(Number(c.tolerance||0.5),Math.max(1,attendu*.08));
    return Math.abs(montant-attendu)<=tol;
  });
}

function construireFixesAjusteesCerbereV34_(periodes, charges, ajustements) {
  const parCharge = {};
  (ajustements || []).forEach(a => {
    if (String(a.actif).toLowerCase() === 'false') return;
    const id=String(a.charge_fixe_id||'');
    if(id)(parCharge[id]||(parCharge[id]=[])).push(a);
  });
  return (periodes || []).map(p => {
    let brut=0,total=0,nbAjust=0;
    (charges || []).forEach(c => {
      if (String(c.actif).toLowerCase()==='false') return;
      const base=echeancesChargePeriodeCerbereV34_(c,p);
      brut+=base.reduce((s,e)=>s+e.montant,0);
      const adj=appliquerAjustementsChargeCerbereV34_(c,base,p,parCharge[String(c.id||'')]||[]);
      total+=adj.reduce((s,e)=>s+e.montant,0);
      if (Math.abs(adj.reduce((s,e)=>s+e.montant,0)-base.reduce((s,e)=>s+e.montant,0))>.009) nbAjust++;
    });
    return {brut:arrondirCerbereV3_(brut),total:arrondirCerbereV3_(total),ajustements:nbAjust};
  });
}
function echeancesChargePeriodeCerbereV34_(c,p) {
  const freq=String(c.frequence||'Mensuelle').toLowerCase();
  const d0=debutJour_(new Date(p.debut)),d1=debutJour_(new Date(p.fin));
  const deb=c.date_debut?debutJour_(new Date(c.date_debut)):null,fin=c.date_fin?debutJour_(new Date(c.date_fin)):null;
  const montant=Math.abs(Number(c.montant||c.montant_indicatif||0));
  if(!montant)return[];
  if(!freq.includes('mens'))return(!deb||deb<=d1)&&(!fin||fin>=d0)?[{date:d0,montant}]:[];
  const jour=Math.max(1,Math.min(31,Number(c.jour_execution||1))),out=[];
  let cur=new Date(d0.getFullYear(),d0.getMonth(),1),last=new Date(d1.getFullYear(),d1.getMonth(),1);
  while(cur<=last){
    const y=cur.getFullYear(),m=cur.getMonth(),dernier=new Date(y,m+1,0).getDate();
    const date=debutJour_(new Date(y,m,Math.min(jour,dernier)));
    if(date>=d0&&date<=d1&&(!deb||date>=deb)&&(!fin||date<=fin))out.push({date,montant});
    cur=new Date(y,m+1,1);
  }
  return out;
}
function cleDateCerbereV34_(v){if(!v)return'';const d=new Date(v);if(isNaN(d))return'';return Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');}
function appliquerAjustementsChargeCerbereV34_(c,base,p,ajustements){
  let ev=(base||[]).map(e=>({date:new Date(e.date),montant:e.montant}));
  const moisExclus=new Set();
  (ajustements||[]).filter(a=>String(a.action)==='exclure_mois').forEach(a=>String(a.mois||'').split(',').forEach(m=>{const n=parseInt(m,10);if(n>=1&&n<=12)moisExclus.add(n);}));
  ev=ev.filter(e=>!moisExclus.has(e.date.getMonth()+1));
  (ajustements||[]).forEach(a=>{
    const action=String(a.action||'');if(action==='exclure_mois')return;
    const cible=cleDateCerbereV34_(a.date_cible);if(!cible)return;
    const pos=ev.findIndex(e=>cleDateCerbereV34_(e.date)===cible);
    if(action==='ignorer'){if(pos>=0)ev.splice(pos,1);return;}
    if(action==='montant'){if(pos>=0)ev[pos].montant=Math.abs(Number(a.nouveau_montant||ev[pos].montant));return;}
    if(action==='reporter'){
      if(pos>=0)ev.splice(pos,1);
      const nd=debutJour_(new Date(a.nouvelle_date));
      if(!isNaN(nd)&&nd>=p.debut&&nd<=p.fin)ev.push({date:nd,montant:Math.abs(Number(a.nouveau_montant||c.montant||0))});
    }
  });
  return ev;
}

function diagnostiquerCerbereV33() {
  const d = chargerCerbereV33();
  if (!d || d.ok === false) return d;
  return {ok:true,version:d.version,diagnostic:d.diagnostic,periodes:(d.periodes||[]).map(p=>({index:p.index,periode:p.periode,audit:p.auditEnveloppe,budgetDisponible:p.budgetDisponible,budgetReparti:p.budgetReparti,resteAVentiler:p.resteAVentiler}))};
}

function enrichirPeriodePilotableV33_(p, ajustements) {
  const cle = clePeriodeCerbereV33_(p.periode);
  const map = ajustements[cle] || {};
  const planParCategorie = engagementsPlanParCategorieV33_(p.plan);
  const depensesPlanSansCategorie = depensesPlanSansCategorieV33_(p.plan);
  const budgetDisponible = arrondirCerbereV3_(Number(p.ressources || 0) - Number(p.fixesPonderees || 0) - Number(p.epargne || 0) - Number(p.reserveObjectifs || 0) - depensesPlanSansCategorie);

  const existantes = new Set((p.enveloppes || []).map(x => String(x.categorie || '')));
  Object.keys(planParCategorie).forEach(cat => {
    if (!cat || existantes.has(cat)) return;
    (p.enveloppes || (p.enveloppes=[])).push({categorie:cat,monetaire:0,pluxee:0,nature:'plan',protege:false,ordre:98,prevu:0,reel:0,reste:0,etat:'vert'});
  });

  let totalBudget=0,totalReel=0,totalPlan=0,totalDepassements=0;
  (p.enveloppes || []).forEach(x => {
    const canon=Number(x.monetaire!=null?x.monetaire:x.canon!=null?x.canon:x.prevu||0);
    const reel=Math.max(0,Number(x.reel||0)),planifie=Math.max(0,Number(planParCategorie[x.categorie]||0));
    const sauvegarde=Object.prototype.hasOwnProperty.call(map,x.categorie)?Number(map[x.categorie]):canon;
    const budget=Math.max(0,Number.isFinite(sauvegarde)?sauvegarde:canon),reste=budget-reel-planifie;
    x.canon=arrondirCerbereV3_(canon);x.prevu=arrondirCerbereV3_(budget);x.reel=arrondirCerbereV3_(reel);x.planifie=arrondirCerbereV3_(planifie);x.reste=arrondirCerbereV3_(reste);x.depassement=arrondirCerbereV3_(Math.max(0,-reste));x.etat=reste<-.009?'rouge':(reel+planifie)>budget*.8?'orange':'vert';
    totalBudget+=budget;totalReel+=reel;totalPlan+=planifie;totalDepassements+=Math.max(0,-reste);
  });

  p.clePilotage=cle;
  p.budgetDisponible=budgetDisponible;
  p.budgetReparti=arrondirCerbereV3_(totalBudget);
  p.resteAVentiler=arrondirCerbereV3_(budgetDisponible-totalBudget);
  p.depensesConstateesPilotables=arrondirCerbereV3_(totalReel);
  p.engagementsPlanifies=arrondirCerbereV3_(totalPlan);
  p.depassementCategories=arrondirCerbereV3_(totalDepassements);
  p.depensesPlanSansCategorie=arrondirCerbereV3_(depensesPlanSansCategorie);
  p.enveloppePilotable=budgetDisponible;
  p.disponibleRestant=p.resteAVentiler;
  p.ajustementsSauvegardes=Object.keys(map).length>0;
  p.auditEnveloppe={
    methodeRecettes:p.index===1?'recettes économiques constatées sur le cycle courant':'médiane par catégorie sur les 6 derniers cycles clos',
    recettesBase:arrondirCerbereV3_(p.recettesStructurelles||0),
    recettesPlan:arrondirCerbereV3_(Number(p.ressources||0)-Number(p.recettesStructurelles||0)),
    chargesFixesTheoriques:arrondirCerbereV3_(p.fixesTheoriques||p.fixesBrutes||0),
    ajustementsChargesFixes:arrondirCerbereV3_(p.ajustementsFixes||0),
    chargesFixesApresAjustements:arrondirCerbereV3_(p.fixesBrutes||0),
    chargesFixesApresPlan:arrondirCerbereV3_(p.fixesPonderees||0),
    nbAjustementsFixes:Number(p.nbAjustementsFixes||0),
    epargne:arrondirCerbereV3_(p.epargne||0),
    reserveObjectifs:arrondirCerbereV3_(p.reserveObjectifs||0),
    depensesPlanSansCategorie:p.depensesPlanSansCategorie,
    enveloppeDisponible:p.budgetDisponible
  };

  if(p.resteAVentiler<-.009||totalDepassements>.009)p.etat='rouge';
  else if(p.resteAVentiler<.01||(totalReel+totalPlan)>totalBudget*.8)p.etat='orange';
  else p.etat='vert';
}

function engagementsPlanParCategorieV33_(plan) {
  const out = {},ajouter=(cat,montant)=>{cat=String(cat||'').trim();montant=Math.abs(Number(montant||0));if(cat&&montant>0)out[cat]=(out[cat]||0)+montant;};
  ((plan&&plan.evenements)||[]).forEach(e=>{if(String(e.type||'').toLowerCase()==='depense')ajouter(e.categorie,e.montant);});
  ((plan&&plan.actions)||[]).forEach(a=>{const impact=String(a.impact_type||'').toLowerCase(),nature=String(a.nature_action||'').toLowerCase(),estDepense=impact==='depense'||['rembourser','payer','acheter','dépense','depense'].includes(nature);if(estDepense)ajouter(a.categorie||(nature==='rembourser'?'Crédits':''),a.impact_montant);});
  return out;
}
function depensesPlanSansCategorieV33_(plan) {
  let total=0;
  ((plan&&plan.evenements)||[]).forEach(e=>{if(String(e.type||'').toLowerCase()==='depense'&&!String(e.categorie||'').trim())total+=Math.abs(Number(e.montant||0));});
  ((plan&&plan.actions)||[]).forEach(a=>{const impact=String(a.impact_type||'').toLowerCase(),nature=String(a.nature_action||'').toLowerCase(),estDepense=impact==='depense'||['rembourser','payer','acheter','dépense','depense'].includes(nature);if(estDepense&&!String(a.categorie||'').trim())total+=Math.abs(Number(a.impact_montant||0));});
  return arrondirCerbereV3_(total);
}

function sauvegarderBudgetPeriodeCerbereV33(payload) {
  payload=payload||{};const cle=String(payload.cle||'').trim(),postes=Array.isArray(payload.postes)?payload.postes:[];
  if(!/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/.test(cle))throw new Error('Période Cerbère invalide.');
  if(!postes.length)throw new Error('Aucune ventilation à enregistrer.');
  const sh=assurerFeuilleAjustementsCerbereV33_(),valeurs=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,4).getValues():[],autres=valeurs.filter(r=>String(r[0])!==cle),maintenant=new Date();
  postes.forEach(x=>{const cat=String(x.categorie||'').trim(),montant=Number(x.montant);if(cat&&Number.isFinite(montant)&&montant>=0)autres.push([cle,cat,arrondirCerbereV3_(montant),maintenant]);});
  if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,4).clearContent();if(autres.length)sh.getRange(2,1,autres.length,4).setValues(autres);SpreadsheetApp.flush();return{ok:true,cle,postes:postes.length};
}
function reinitialiserBudgetPeriodeCerbereV33(cle){cle=String(cle||'').trim();const sh=assurerFeuilleAjustementsCerbereV33_();if(sh.getLastRow()<2)return{ok:true};const valeurs=sh.getRange(2,1,sh.getLastRow()-1,4).getValues(),autres=valeurs.filter(r=>String(r[0])!==cle);sh.getRange(2,1,sh.getLastRow()-1,4).clearContent();if(autres.length)sh.getRange(2,1,autres.length,4).setValues(autres);return{ok:true};}
function lireAjustementsCerbereV33_(){const sh=assurerFeuilleAjustementsCerbereV33_();if(sh.getLastRow()<2)return{};const rows=sh.getRange(2,1,sh.getLastRow()-1,3).getValues(),out={};rows.forEach(r=>{const cle=String(r[0]||''),cat=String(r[1]||''),n=Number(r[2]);if(cle&&cat&&Number.isFinite(n))(out[cle]||(out[cle]={}))[cat]=n;});return out;}
function assurerFeuilleAjustementsCerbereV33_(){const ss=SpreadsheetApp.getActive();let sh=ss.getSheetByName(CERBERE_V33_SHEET);if(!sh)sh=ss.insertSheet(CERBERE_V33_SHEET);const headers=['periode','categorie','montant','maj_le'];if(sh.getLastRow()===0)sh.getRange(1,1,1,headers.length).setValues([headers]);else{const actuels=sh.getRange(1,1,1,headers.length).getValues()[0];if(headers.some((h,i)=>String(actuels[i]||'')!==h))sh.getRange(1,1,1,headers.length).setValues([headers]);}return sh;}
function clePeriodeCerbereV33_(p){const f=d=>Utilities.formatDate(new Date(d),Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');return f(p.debut)+'__'+f(p.fin);}
