const CERBERE_V3_VERSION = '3.0.0';

/**
 * Cerbère V3 — moteur d'exécution du Budget maître.
 *
 * Principes :
 * - P0 est l'unique canon budgétaire ;
 * - P1 à P6 héritent de P0 puis reçoivent les déformations du Plan ;
 * - seules les Actions confirmées et décidées/en cours/effectives sont exécutables ;
 * - le réel est lu, jamais modifié ;
 * - P1 reçoit le solde bancaire/reporté issu du moteur réel du tableau de bord.
 */
function chargerCerbereV3() {
  const started = Date.now();
  let stage = 'initialisation';
  try {
    verifierInitialisation_();
    assurerTablesPlanCerbere_();
    if (typeof assurerPlanActionsV3_ === 'function') assurerPlanActionsV3_();

    stage = 'P0 · Budget maître';
    const canon = chargerCanonCerbereV1();

    stage = 'lecture structure et réel';
    const charges = lireTable_('Charges_fixes');
    const operations = lireTable_('Operations');
    const reel = typeof chargerDashboardReel === 'function' ? chargerDashboardReel() : null;

    stage = 'lecture du Plan validé';
    const plan = {
      objectifs: lireTablePlanCerbere_('Plan_Objectifs'),
      actions: lireFeuilleDynamiqueCerbereV3_('Plan_Actions'),
      evenements: lireTablePlanCerbere_('Plan_Evenements')
    };

    stage = 'construction P1-P6';
    const periodes = construirePeriodesCerbereV2_();
    const resultats = periodes.map((p, i) => calculerPeriodeCerbereV3_(p, i, canon, charges, operations, plan, reel));

    return serialiserCerberePourClient_({
      ok: true,
      version: CERBERE_V3_VERSION,
      principe: 'P1–P6 héritent de P0 ; seules les décisions validées du Plan peuvent les déformer.',
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
        actions_valides: plan.actions.filter(actionExecutableCerbereV3_),
        actions_non_executees: plan.actions.filter(a => !actionExecutableCerbereV3_(a)),
        evenements: plan.evenements
      },
      diagnostic: {
        duree_ms: Date.now() - started,
        operations: operations.length,
        charges_fixes: charges.length,
        actions_total: plan.actions.length,
        actions_executees: plan.actions.filter(actionExecutableCerbereV3_).length,
        categories_p0: canon.postes.length,
        source_solde: reel && reel.courtTerme && reel.courtTerme.soldeFiable ? 'reel_fiable' : 'reel_non_certifie'
      }
    });
  } catch (e) {
    return {
      ok: false,
      version: CERBERE_V3_VERSION,
      stage: stage,
      erreur: e && e.message ? e.message : String(e),
      duree_ms: Date.now() - started
    };
  }
}

function diagnostiquerCerbereV3() {
  try {
    verifierInitialisation_();
    assurerTablesPlanCerbere_();
    if (typeof assurerPlanActionsV3_ === 'function') assurerPlanActionsV3_();
    const canon = chargerCanonCerbereV1();
    const actions = lireFeuilleDynamiqueCerbereV3_('Plan_Actions');
    const reel = typeof chargerDashboardReel === 'function' ? chargerDashboardReel() : null;
    return {
      ok: true,
      version: CERBERE_V3_VERSION,
      operations: lireTable_('Operations').length,
      charges_fixes: lireTable_('Charges_fixes').length,
      categories_p0: canon.postes.length,
      actions_total: actions.length,
      actions_executees: actions.filter(actionExecutableCerbereV3_).length,
      solde_reporte: reel && reel.courtTerme ? reel.courtTerme.soldeBancaire : null,
      solde_fiable: !!(reel && reel.courtTerme && reel.courtTerme.soldeFiable)
    };
  } catch (e) {
    return {ok:false, version:CERBERE_V3_VERSION, erreur:e && e.message ? e.message : String(e)};
  }
}

function calculerPeriodeCerbereV3_(p, index, canon, charges, operations, planGlobal, reel) {
  const p0 = construireHeritageP0CerbereV3_(canon);
  const plan = projeterPlanCerbereV3_(p.debut, p.fin, planGlobal);
  const ops = operations.filter(o => dateDansPeriodeCerbere_(dateComptableCerbere_(o), p));

  const recettesReelles = ops
    .filter(o => Number(o.montant || 0) > 0 && !estTresorerieCerbere_(o))
    .reduce((s, o) => s + Number(o.montant || 0), 0);
  const depensesReelles = ops
    .filter(o => Number(o.montant || 0) < 0 && !estTresorerieCerbere_(o))
    .reduce((s, o) => s + Math.abs(Number(o.montant || 0)), 0);

  const fixesP0 = charges
    .filter(c => chargeActiveCerbere_(c, p))
    .reduce((s, c) => s + Math.abs(Number(c.montant || c.montant_indicatif || 0)), 0);
  const fixesPonderees = Math.max(0, fixesP0 + plan.effets.hausseCharges - plan.effets.baisseCharges - plan.effets.chargesEvitees);

  const recettesStructurelles = estimerRecettesStructurellesCerbere_(operations, p, index);
  const ressources = recettesStructurelles + plan.effets.ressources;
  const enveloppes = p0.postes.map(x => {
    const reelCat = ops
      .filter(o => String(o.categorie || '').trim() === x.categorie && Number(o.montant || 0) < 0)
      .reduce((s, o) => s + Math.abs(Number(o.montant || 0)), 0);
    return Object.assign({}, x, {
      prevu: x.monetaire,
      reel: arrondirCerbereV3_(reelCat),
      reste: arrondirCerbereV3_(x.monetaire - reelCat),
      etat: reelCat > x.monetaire ? 'rouge' : reelCat > x.monetaire * .8 ? 'orange' : 'vert'
    });
  });

  const ecarts = enveloppes
    .filter(x => x.reel > x.prevu + .009)
    .map(x => ({categorie:x.categorie, montant:arrondirCerbereV3_(x.reel-x.prevu)}));
  const propositions = proposerCompensationsCerbere_(ecarts, enveloppes.map(x => Object.assign({}, x, {nature:x.nature || 'ajustable'})), index);

  const soldeReporte = index === 0 && reel && reel.courtTerme ? Number(reel.courtTerme.soldeBancaire) : null;
  const disponibleReel = index === 0 && reel && reel.courtTerme ? reel.courtTerme.disponible : null;
  const coutP0Monetaire = p0.totalMonetaire;
  const reserveObjectifs = plan.effets.reserveObjectifs;
  const depensesExceptionnelles = plan.effets.depenses;
  const margeStructurelle = ressources - fixesPonderees - coutP0Monetaire - reserveObjectifs - depensesExceptionnelles;
  const disponibleRestant = index === 0 && disponibleReel !== null && disponibleReel !== undefined
    ? Number(disponibleReel)
    : margeStructurelle;

  const alertes = [];
  if (index === 0 && reel && reel.courtTerme && !reel.courtTerme.soldeFiable) alertes.push({niveau:'orange', code:'SOLDE_NON_CERTIFIE', message:'Le solde reporté existe mais n’est pas certifié par un relevé bancaire.'});
  if (margeStructurelle < -.009) alertes.push({niveau:'rouge', code:'P0_NON_FINANCE', message:'Les ressources projetées ne financent pas complètement la structure héritée de P0.'});
  if (ecarts.length) alertes.push({niveau:'orange', code:'ECART_ENVELOPPE', message:ecarts.length+' enveloppe(s) dépassée(s) par le réel constaté.'});
  if (plan.actions.length) alertes.push({niveau:'info', code:'PLAN_APPLIQUE', message:plan.actions.length+' action(s) validée(s) appliquée(s) à cette période.'});

  const etat = alertes.some(a => a.niveau === 'rouge') || propositions.some(x => x.niveau === 'escalade')
    ? 'rouge'
    : alertes.some(a => a.niveau === 'orange') ? 'orange' : 'vert';

  return {
    index: index + 1,
    periode: p,
    heritageP0: p0,
    plan,
    ressources: arrondirCerbereV3_(ressources),
    recettesStructurelles: arrondirCerbereV3_(recettesStructurelles),
    fixesBrutes: arrondirCerbereV3_(fixesP0),
    fixesPonderees: arrondirCerbereV3_(fixesPonderees),
    epargne: Number(canon.epargneProtegee || 0),
    reserveObjectifs: arrondirCerbereV3_(reserveObjectifs),
    depensesExceptionnelles: arrondirCerbereV3_(depensesExceptionnelles),
    recettesReelles: arrondirCerbereV3_(recettesReelles),
    depensesReelles: arrondirCerbereV3_(depensesReelles),
    enveloppePilotable: arrondirCerbereV3_(coutP0Monetaire),
    margeStructurelle: arrondirCerbereV3_(margeStructurelle),
    soldeReporte: soldeReporte === null ? null : arrondirCerbereV3_(soldeReporte),
    disponibleRestant: disponibleRestant === null ? null : arrondirCerbereV3_(disponibleRestant),
    enveloppes,
    ecarts,
    propositions,
    alertes,
    etat
  };
}

function construireHeritageP0CerbereV3_(canon) {
  const postes = (canon.postes || []).map(p => ({
    categorie: String(p.categorie || ''),
    monetaire: Number(p.monetaire || 0),
    pluxee: Number(p.pluxee || 0),
    nature: String(p.nature || 'ajustable'),
    protege: p.protege === true || String(p.protege).toLowerCase() === 'true',
    ordre: Number(p.ordre || 99)
  }));
  return {
    source: 'P0',
    version: canon.version,
    postes,
    totalMonetaire: arrondirCerbereV3_(postes.reduce((s,p)=>s+p.monetaire,0)),
    totalPluxee: arrondirCerbereV3_(postes.reduce((s,p)=>s+p.pluxee,0)),
    total: arrondirCerbereV3_(postes.reduce((s,p)=>s+p.monetaire+p.pluxee,0))
  };
}

function projeterPlanCerbereV3_(debut, fin, planGlobal) {
  const d0 = debutJour_(new Date(debut));
  const d1 = debutJour_(new Date(fin));
  const objectifs = (planGlobal.objectifs || []).filter(x => !['Terminé','Abandonné','Abandonnée'].includes(String(x.statut || '')));
  const actions = (planGlobal.actions || []).filter(actionExecutableCerbereV3_).filter(x => actionActiveSurPeriode_(x, d0, d1));
  const evenements = (planGlobal.evenements || []).filter(x => evenementActifSurPeriode_(x, d0, d1));

  let ressources=0, depenses=0, baisseCharges=0, hausseCharges=0, chargesEvitees=0, reserveObjectifs=0;
  evenements.forEach(e => {
    const m=Math.abs(Number(e.montant||0));
    if(e.type==='depense') depenses+=m;
    else if(e.type==='charge_supprimee_temporairement'||e.type==='charge_deplacee') chargesEvitees+=m;
    else if(e.type==='argent_reserve') reserveObjectifs+=m;
    else ressources+=m;
  });
  actions.forEach(a => {
    const m=Math.abs(Number(a.impact_montant||0));
    if(a.impact_type==='baisse_charge') baisseCharges+=m;
    else if(a.impact_type==='hausse_charge') hausseCharges+=m;
    else if(a.impact_type==='hausse_revenu') ressources+=m;
    else if(a.impact_type==='reservation_objectif') reserveObjectifs+=m;
  });
  return {
    debut:d0, fin:d1, objectifs, actions, evenements,
    effets:{ressources,depenses,baisseCharges,hausseCharges,chargesEvitees,reserveObjectifs}
  };
}

function actionExecutableCerbereV3_(a) {
  const confirme = a && (a.impact_confirme === true || String(a.impact_confirme).toLowerCase() === 'true');
  const statut = String(a && a.statut || '').trim();
  return confirme && ['Décidée','Decidee','En cours','Effective','Réalisée','Realisee','Réalisé','Realise'].includes(statut);
}

function resumeReelCerbereV3_(reel) {
  const c = reel && reel.courtTerme;
  if (!c) return {disponible:false};
  return {
    disponible:true,
    dateReference:c.dateReference,
    soldeBancaire:c.soldeBancaire,
    soldeFiable:c.soldeFiable,
    chargesFixesRestantes:c.chargesFixes,
    cbDifferees:c.cbDifferees,
    disponibleRestant:c.disponible,
    revenusConstates:c.revenusConstates,
    depensesConstatees:c.depensesConstatees
  };
}

function lireFeuilleDynamiqueCerbereV3_(nom) {
  const sh=SpreadsheetApp.getActive().getSheetByName(nom);
  if(!sh||sh.getLastRow()<2)return[];
  const hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());
  return sh.getRange(2,1,sh.getLastRow()-1,hs.length).getValues()
    .filter(r=>r.some(v=>v!==''&&v!==null))
    .map(r=>Object.fromEntries(hs.map((h,i)=>[h,typeof serialiserValeur_==='function'?serialiserValeur_(r[i]):r[i]])));
}

function arrondirCerbereV3_(n){return Math.round(Number(n||0)*100)/100;}
