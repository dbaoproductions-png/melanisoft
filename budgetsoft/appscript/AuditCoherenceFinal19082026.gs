const AUDIT_COHERENCE_FINAL_19082026_VERSION = '2026-08-19.1';

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

  const controles = {
    cycle28_27_dashboard: String(courantD.debut || '').slice(8,10) === '28' && String(courantD.fin || '').slice(8,10) === '27',
    cycle28_27_analyse: String(courantA.debut || '').slice(8,10) === '28' && String(courantA.fin || '').slice(8,10) === '27',
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
      margeAfficheeMoinsMargeRecalculee: ecartMarge
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
