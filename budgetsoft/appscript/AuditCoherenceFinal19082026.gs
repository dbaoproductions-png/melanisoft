const AUDIT_COHERENCE_FINAL_19082026_VERSION = '2026-08-20.3';

/**
 * Contrôle transversal non destructif des chiffres critiques de BudgetSoft.
 * À lancer depuis Apps Script après Pull TEST : auditerCoherenceFinale19082026()
 */
function auditerCoherenceFinale19082026() {
  verifierInitialisation_();
  const dashboard = chargerDashboardReelV2();
  const analyses = chargerAnalysesBudgetairesV23(6);
  const credits = chargerCreditsEtDettesV2();

  const courantD = dashboard && dashboard.courtTerme ? dashboard.courtTerme : {};
  const courantA = analyses && analyses.courante ? analyses.courante : {};
  const suivant = dashboard && dashboard.cycleSuivant ? dashboard.cycleSuivant : {};

  const arr = n => Math.round(Number(n || 0) * 100) / 100;
  const jourLocal = v => {
    const d = new Date(v);
    return isNaN(d) ? null : d.getDate();
  };
  const ecartCycleCourant = arr(Number(courantA.solde || 0) - Number(courantD.epargne || 0));
  const margeRecalculee = suivant.salaireAttendu == null ? null : arr(Number(suivant.salaireAttendu || 0) - Number(suivant.chargesFixes || 0) - Number(suivant.cbDifferees || 0));
  const ecartMarge = margeRecalculee == null ? null : arr(Number(suivant.marge || 0) - margeRecalculee);

  const renouvelables = (credits.renouvelables || []).map(c => ({
    nom: c.nom,
    encours: arr(c.capital_restant),
    coutRestant: arr(c.cout_restant),
    plafond: arr(c.plafond_credit),
    disponible: arr(c.disponible_credit),
    assurance: arr(c.assurance_mensuelle)
  }));

  // Diagnostic lecture seule des opérations expliquant un éventuel écart Dashboard / Analyses.
  // Il reproduit les critères structurants des deux moteurs sans modifier aucune donnée.
  const categoriesRef = lireTable_('Categories');
  const typesCategories = Object.fromEntries(categoriesRef.map(c => [String(c.nom || '').trim(), String(c.type || '').toLowerCase()]));
  const estTresorerie = o => {
    const cat = String(o.categorie || '').trim();
    return String(o.type || '').toLowerCase() === 'tresorerie' ||
      typesCategories[cat] === 'tresorerie' ||
      cat === 'Crédits de trésorerie' ||
      cat === 'Virements internes';
  };
  const estAuto = o => /\[RECURRENCE:[^\]]+\]/.test(String(o && o.commentaire || ''));
  const debutCycle = new Date(courantD.debut || courantA.debut);
  const finCycle = new Date(courantD.fin || courantA.fin);
  const refDashboard = new Date(courantD.dateReference || dashboard.referenceImport || finCycle);
  const refAnalyse = new Date(analyses.dateReference || courantA.constateJusquAu || finCycle);
  if (!isNaN(debutCycle)) debutCycle.setHours(0, 0, 0, 0);
  if (!isNaN(finCycle)) finCycle.setHours(23, 59, 59, 999);
  if (!isNaN(refDashboard)) refDashboard.setHours(23, 59, 59, 999);
  if (!isNaN(refAnalyse)) refAnalyse.setHours(23, 59, 59, 999);

  const operationsDifferentielles = lireTable_('Operations').map(o => {
    let enrichie = o;
    try { enrichie = typeof enrichirDepuisCommentaireBanque_ === 'function' ? enrichirDepuisCommentaireBanque_(o) : o; }
    catch (e) {}
    const d = new Date(enrichie.date_comptable || enrichie.date);
    const type = String(enrichie.type || '').toLowerCase();
    const montantSigne = Number(enrichie.montant || 0);
    const montantAbs = Math.abs(montantSigne);
    const dansCycle = !isNaN(d) && d >= debutCycle && d <= finCycle;
    const dashboardIncluse = dansCycle && !estAuto(enrichie) && d <= refDashboard && montantAbs > 0 && (type === 'revenu' || type === 'depense');
    const analyseIncluse = dansCycle && d <= refAnalyse && !estTresorerie(enrichie) && Number.isFinite(montantSigne) && montantSigne !== 0;
    const contributionDashboard = dashboardIncluse ? (type === 'depense' ? -montantAbs : montantAbs) : 0;
    const contributionAnalyse = analyseIncluse ? montantSigne : 0;
    const deltaAnalyseMoinsDashboard = arr(contributionAnalyse - contributionDashboard);
    if (Math.abs(deltaAnalyseMoinsDashboard) < 0.005) return null;

    const raisons = [];
    if (dashboardIncluse && !analyseIncluse) {
      if (d > refAnalyse) raisons.push('postérieure à la date de référence Analyses');
      if (estTresorerie(enrichie)) raisons.push('exclue des Analyses comme trésorerie');
    }
    if (!dashboardIncluse && analyseIncluse) {
      if (estAuto(enrichie)) raisons.push('récurrence automatique exclue du Dashboard');
      if (type !== 'revenu' && type !== 'depense') raisons.push('type non revenu/dépense pour le Dashboard');
      if (d > refDashboard) raisons.push('postérieure à la date de référence Dashboard');
    }
    if (dashboardIncluse && analyseIncluse && Math.abs(contributionDashboard - contributionAnalyse) >= 0.005) {
      raisons.push('signe/type interprété différemment par les deux moteurs');
    }

    return {
      id: String(enrichie.id || ''),
      date: isNaN(d) ? null : d.toISOString(),
      libelle: String(enrichie.libelle_bancaire || enrichie.libelle || ''),
      montant: montantSigne,
      type: String(enrichie.type || ''),
      categorie: String(enrichie.categorie || ''),
      compte: String(enrichie.compte || ''),
      dashboardIncluse: dashboardIncluse,
      analyseIncluse: analyseIncluse,
      contributionDashboard: arr(contributionDashboard),
      contributionAnalyse: arr(contributionAnalyse),
      deltaAnalyseMoinsDashboard: deltaAnalyseMoinsDashboard,
      raisons: raisons
    };
  }).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));

  const sommeDiagnostic = arr(operationsDifferentielles.reduce((s, o) => s + Number(o.deltaAnalyseMoinsDashboard || 0), 0));

  const controles = {
    cycle28_27_dashboard: jourLocal(courantD.debut) === 28 && jourLocal(courantD.fin) === 27,
    cycle28_27_analyse: jourLocal(courantA.debut) === 28 && jourLocal(courantA.fin) === 27,
    dashboard_analyse_courant_identiques: Math.abs(ecartCycleCourant) < 0.01,
    marge_suivante_retombe: ecartMarge == null || Math.abs(ecartMarge) < 0.01,
    credits_7: (credits.amortissables || []).length + (credits.renouvelables || []).length === 7,
    renouvelables_4: (credits.renouvelables || []).length === 4,
    champs_reserves_renseignes: renouvelables.every(c => Number(c.plafond || 0) > 0),
    capital_total_positif: Number(credits.capitalRestant || 0) > 0
  };

  const resultat = {
    version: AUDIT_COHERENCE_FINAL_19082026_VERSION,
    ok: Object.values(controles).every(Boolean),
    controles: controles,
    ecarts: {
      resultatCycleAnalyseMoinsDashboard: ecartCycleCourant,
      margeAfficheeMoinsMargeRecalculee: ecartMarge,
      sommeOperationsDifferentielles: sommeDiagnostic,
      diagnosticRetombe: Math.abs(sommeDiagnostic - ecartCycleCourant) < 0.01
    },
    diagnosticDashboardAnalyses: {
      dateReferenceDashboard: isNaN(refDashboard) ? null : refDashboard.toISOString(),
      dateReferenceAnalyses: isNaN(refAnalyse) ? null : refAnalyse.toISOString(),
      nombreOperationsDifferentielles: operationsDifferentielles.length,
      operations: operationsDifferentielles
    },
    dashboard: {
      cycleCourant: { debut: courantD.debut, fin: courantD.fin, dateReference: courantD.dateReference, resultat: courantD.epargne },
      cycleSuivant: { debut: suivant.debut, fin: suivant.fin, salaireAttendu: suivant.salaireAttendu, cbDifferees: suivant.cbDifferees, chargesFixes: suivant.chargesFixes, nombreCharges: suivant.nombreCharges, marge: suivant.marge },
      detailFixesSuivants: suivant.detailFixes || []
    },
    analyses: {
      version: analyses.version,
      dateReference: analyses.dateReference,
      resultatCourant: courantA.solde,
      revenusCourants: courantA.revenus,
      depensesCourantes: courantA.depenses
    },
    credits: {
      version: credits.version,
      capitalTotal: arr(credits.capitalRestant),
      coutRestantTotal: arr(credits.coutRestant),
      encoursRenouvelable: arr(credits.capitalRenouvelable),
      coutRenouvelable: arr(credits.coutRenouvelable),
      renouvelables: renouvelables
    }
  };
  console.log(JSON.stringify(resultat, null, 2));
  return resultat;
}
