const CERBERE_V33_VERSION = '3.3.1';
const CERBERE_V33_SHEET = 'Cerbere_Ajustements';

/**
 * Cerbère 3.3.1 — pilotage mensuel.
 *
 * Règles :
 * - P0 reste le canon ; P1-P6 ont une ventilation propre ;
 * - le réel ne réécrit jamais le budget : un dépassement reste un dépassement ;
 * - les opérations de charges fixes rapprochées et les récurrences techniques ne
 *   sont pas comptées dans les enveloppes souples (elles sont déjà traitées dans
 *   la structure) ;
 * - les Actions / Événements chiffrés et catégorisés apparaissent comme
 *   engagements du Plan dans la catégorie concernée ;
 * - les dépenses du Plan sans catégorie restent retranchées de l'enveloppe globale.
 */
function chargerCerbereV33() {
  const d = chargerBaseCerbereV331_();
  if (!d || d.ok === false) return d;
  const ajustements = lireAjustementsCerbereV33_();
  (d.periodes || []).forEach(p => enrichirPeriodePilotableV33_(p, ajustements));
  d.version = CERBERE_V33_VERSION;
  d.principe = 'P0 est le canon ; budget, réel et Plan restent trois grandeurs distinctes dans chaque période.';
  if (d.diagnostic) d.diagnostic.pilotage = 'budget_reel_plan_separes_3.3.1';
  return d;
}

/**
 * Base 3.2 reprise sans moteur Dashboard, mais avec une indexation du réel corrigée.
 * On évite ainsi une seconde lecture de la feuille Operations dans la couche 3.3.
 */
function chargerBaseCerbereV331_() {
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
    const index = indexerDonneesCerbereV331_(periodes, operations, charges);
    mark('indexation_ms');

    stage = 'lecture du réel léger';
    const reel = construireReelLegerCerbereV3_(operations, index);
    mark('reel_leger_ms');

    stage = 'construction P1-P6';
    const resultats = periodes.map((p, i) => calculerPeriodeCerbereV3_(p, i, canon, heritageP0, index[i], operations, plan, reel));
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
        actions_total: actionsToutes.length,
        actions_executees: actionsExecutables.length,
        categories_p0: canon.postes.length,
        optimisation: 'sans_dashboard_imbrique_index_reel_corrige_3.3.1'
      }
    });
  } catch (e) {
    return {ok:false,version:CERBERE_V33_VERSION,stage,erreur:e&&e.message?e.message:String(e),duree_ms:Date.now()-started,timings};
  }
}

function indexerDonneesCerbereV331_(periodes, operations, charges) {
  const idx = (periodes || []).map(() => ({ops:[],recettesReelles:0,depensesReelles:0,depensesParCategorie:{},fixesP0:0}));
  const bornes = (periodes || []).map(p => ({
    debut: debutJour_(new Date(p.debut)).getTime(),
    fin: debutJour_(new Date(p.fin)).getTime()
  }));

  (operations || []).forEach(o => {
    const d = dateComptableCerbere_(o); if (!d) return;
    const t = debutJour_(new Date(d)).getTime(); if (!isFinite(t)) return;
    let pi = -1;
    for (let i=0;i<bornes.length;i++) if (t>=bornes[i].debut && t<=bornes[i].fin) { pi=i; break; }
    if (pi < 0) return;

    const b = idx[pi];
    const m = montantSigneCerbereV3_(o);
    b.ops.push(o);
    if (!estTresorerieCerbere_(o)) {
      if (m > 0) b.recettesReelles += m;
      else if (m < 0) b.depensesReelles += Math.abs(m);
    }

    // Les enveloppes P0 ne doivent contenir que les dépenses réellement pilotables.
    // Une charge fixe rapprochée est déjà dans fixesP0 ; une récurrence est technique.
    const commentaire = String(o.commentaire || '');
    const technique = /\[RECURRENCE:[^\]]+\]/.test(commentaire);
    const chargeFixe = /\[CHARGE_FIXE:[^\]]+\]/.test(commentaire);
    if (m < 0 && !estTresorerieCerbere_(o) && !technique && !chargeFixe) {
      const cat = String(o.categorie || '').trim();
      if (cat) b.depensesParCategorie[cat] = (b.depensesParCategorie[cat] || 0) + Math.abs(m);
    }
  });

  (charges || []).forEach(c => {
    for (let i=0;i<periodes.length;i++) {
      if (chargeActiveCerbere_(c, periodes[i])) idx[i].fixesP0 += Math.abs(Number(c.montant || c.montant_indicatif || 0));
    }
  });
  return idx;
}

function diagnostiquerCerbereV33() {
  const d = diagnostiquerCerbereV3();
  if (d && d.ok) d.version = CERBERE_V33_VERSION;
  return d;
}

function enrichirPeriodePilotableV33_(p, ajustements) {
  const cle = clePeriodeCerbereV33_(p.periode);
  const map = ajustements[cle] || {};
  const planParCategorie = engagementsPlanParCategorieV33_(p.plan);
  const depensesPlanSansCategorie = depensesPlanSansCategorieV33_(p.plan);

  // Une dépense catégorisée du Plan doit être financée DANS son enveloppe : on ne
  // la retranche donc pas une deuxième fois du disponible global.
  const budgetDisponible = arrondirCerbereV3_(
    Number(p.ressources || 0) - Number(p.fixesPonderees || 0) - Number(p.epargne || 0) -
    Number(p.reserveObjectifs || 0) - depensesPlanSansCategorie
  );

  const existantes = new Set((p.enveloppes || []).map(x => String(x.categorie || '')));
  Object.keys(planParCategorie).forEach(cat => {
    if (!cat || existantes.has(cat)) return;
    (p.enveloppes || (p.enveloppes=[])).push({categorie:cat,monetaire:0,pluxee:0,nature:'plan',protege:false,ordre:98,prevu:0,reel:0,reste:0,etat:'vert'});
  });

  let totalBudget = 0, totalReel = 0, totalPlan = 0, totalDepassements = 0;
  (p.enveloppes || []).forEach(x => {
    const canon = Number(x.monetaire != null ? x.monetaire : x.canon != null ? x.canon : x.prevu || 0);
    const reel = Math.max(0, Number(x.reel || 0));
    const planifie = Math.max(0, Number(planParCategorie[x.categorie] || 0));
    const sauvegarde = Object.prototype.hasOwnProperty.call(map, x.categorie) ? Number(map[x.categorie]) : canon;
    const budget = Math.max(0, Number.isFinite(sauvegarde) ? sauvegarde : canon);
    const resteCategorie = budget - reel - planifie;

    x.canon = arrondirCerbereV3_(canon);
    x.prevu = arrondirCerbereV3_(budget);
    x.reel = arrondirCerbereV3_(reel);
    x.planifie = arrondirCerbereV3_(planifie);
    x.reste = arrondirCerbereV3_(resteCategorie);
    x.depassement = arrondirCerbereV3_(Math.max(0, -resteCategorie));
    x.etat = resteCategorie < -.009 ? 'rouge' : (reel + planifie) > budget * .8 ? 'orange' : 'vert';

    totalBudget += budget;
    totalReel += reel;
    totalPlan += planifie;
    totalDepassements += Math.max(0, -resteCategorie);
  });

  p.clePilotage = cle;
  p.budgetDisponible = budgetDisponible;
  p.budgetReparti = arrondirCerbereV3_(totalBudget);
  p.resteAVentiler = arrondirCerbereV3_(budgetDisponible - totalBudget);
  p.depensesConstateesPilotables = arrondirCerbereV3_(totalReel);
  p.engagementsPlanifies = arrondirCerbereV3_(totalPlan);
  p.depassementCategories = arrondirCerbereV3_(totalDepassements);
  p.depensesPlanSansCategorie = arrondirCerbereV3_(depensesPlanSansCategorie);
  p.enveloppePilotable = budgetDisponible;
  p.disponibleRestant = p.resteAVentiler;
  p.ajustementsSauvegardes = Object.keys(map).length > 0;

  // Le rouge d'une catégorie est une alerte de pilotage ; il ne réécrit pas le budget.
  if (p.resteAVentiler < -.009 || totalDepassements > .009) p.etat = 'rouge';
  else if (p.resteAVentiler < .01 || (totalReel + totalPlan) > totalBudget * .8) p.etat = 'orange';
  else p.etat = 'vert';
}

function engagementsPlanParCategorieV33_(plan) {
  const out = {};
  const ajouter = (cat, montant) => {
    cat = String(cat || '').trim();
    montant = Math.abs(Number(montant || 0));
    if (cat && montant > 0) out[cat] = (out[cat] || 0) + montant;
  };

  ((plan && plan.evenements) || []).forEach(e => {
    if (String(e.type || '').toLowerCase() === 'depense') ajouter(e.categorie, e.montant);
  });

  ((plan && plan.actions) || []).forEach(a => {
    const impact = String(a.impact_type || '').toLowerCase();
    const nature = String(a.nature_action || '').toLowerCase();
    const estDepense = impact === 'depense' || ['rembourser','payer','acheter','dépense','depense'].includes(nature);
    if (estDepense) ajouter(a.categorie || (nature === 'rembourser' ? 'Crédits' : ''), a.impact_montant);
  });
  return out;
}

function depensesPlanSansCategorieV33_(plan) {
  let total = 0;
  ((plan && plan.evenements) || []).forEach(e => {
    if (String(e.type || '').toLowerCase() === 'depense' && !String(e.categorie || '').trim()) total += Math.abs(Number(e.montant || 0));
  });
  ((plan && plan.actions) || []).forEach(a => {
    const impact = String(a.impact_type || '').toLowerCase();
    const nature = String(a.nature_action || '').toLowerCase();
    const estDepense = impact === 'depense' || ['rembourser','payer','acheter','dépense','depense'].includes(nature);
    if (estDepense && !String(a.categorie || '').trim()) total += Math.abs(Number(a.impact_montant || 0));
  });
  return arrondirCerbereV3_(total);
}

function sauvegarderBudgetPeriodeCerbereV33(payload) {
  payload = payload || {};
  const cle = String(payload.cle || '').trim();
  const postes = Array.isArray(payload.postes) ? payload.postes : [];
  if (!/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/.test(cle)) throw new Error('Période Cerbère invalide.');
  if (!postes.length) throw new Error('Aucune ventilation à enregistrer.');

  const sh = assurerFeuilleAjustementsCerbereV33_();
  const valeurs = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues() : [];
  const autres = valeurs.filter(r => String(r[0]) !== cle);
  const maintenant = new Date();
  postes.forEach(x => {
    const cat = String(x.categorie || '').trim();
    const montant = Number(x.montant);
    if (!cat || !Number.isFinite(montant) || montant < 0) return;
    autres.push([cle, cat, arrondirCerbereV3_(montant), maintenant]);
  });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 4).clearContent();
  if (autres.length) sh.getRange(2, 1, autres.length, 4).setValues(autres);
  SpreadsheetApp.flush();
  return {ok:true, cle, postes:postes.length};
}

function reinitialiserBudgetPeriodeCerbereV33(cle) {
  cle = String(cle || '').trim();
  const sh = assurerFeuilleAjustementsCerbereV33_();
  if (sh.getLastRow() < 2) return {ok:true};
  const valeurs = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  const autres = valeurs.filter(r => String(r[0]) !== cle);
  sh.getRange(2, 1, sh.getLastRow() - 1, 4).clearContent();
  if (autres.length) sh.getRange(2, 1, autres.length, 4).setValues(autres);
  return {ok:true};
}

function lireAjustementsCerbereV33_() {
  const sh = assurerFeuilleAjustementsCerbereV33_();
  if (sh.getLastRow() < 2) return {};
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  const out = {};
  rows.forEach(r => {
    const cle = String(r[0] || ''), cat = String(r[1] || ''), n = Number(r[2]);
    if (!cle || !cat || !Number.isFinite(n)) return;
    (out[cle] || (out[cle] = {}))[cat] = n;
  });
  return out;
}

function assurerFeuilleAjustementsCerbereV33_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CERBERE_V33_SHEET);
  if (!sh) sh = ss.insertSheet(CERBERE_V33_SHEET);
  const headers = ['periode', 'categorie', 'montant', 'maj_le'];
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  else {
    const actuels = sh.getRange(1, 1, 1, headers.length).getValues()[0];
    if (headers.some((h,i)=>String(actuels[i]||'')!==h)) sh.getRange(1,1,1,headers.length).setValues([headers]);
  }
  return sh;
}

function clePeriodeCerbereV33_(p) {
  const f = d => Utilities.formatDate(new Date(d), Session.getScriptTimeZone() || 'Europe/Paris', 'yyyy-MM-dd');
  return f(p.debut) + '__' + f(p.fin);
}
