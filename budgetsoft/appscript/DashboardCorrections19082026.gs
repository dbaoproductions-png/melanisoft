const DASHBOARD_CORRECTIONS_19082026_VERSION = '2.2';

function normaliserTexteCreditDashboard2026_(v) {
  try { return normaliserTexteBanque_(String(v || '')); }
  catch (e) { return String(v || '').toUpperCase(); }
}

function creditPourChargeDashboard2026_(charge, credits) {
  const t = normaliserTexteCreditDashboard2026_([charge.libelle || '', charge.libelle_bancaire || ''].join(' '));
  const candidats = (credits || []).filter(c => {
    const tc = normaliserTexteCreditDashboard2026_([c.nom || '', c.numero_pret || ''].join(' '));
    if (/ACCESSIO/.test(t)) return /ACCESSIO/.test(tc);
    if (/CASDEN/.test(t)) return /CASDEN/.test(tc);
    if (/CREATIS/.test(t)) return /CREATIS/.test(tc);
    if (/FLOA|CDISCOUNT/.test(t)) return /FLOA|CDISCOUNT/.test(tc);
    if (/ONEY|BANQUE ACCORD/.test(t)) return /ONEY|CARTE B/.test(tc);
    if (/CARREFOUR|PASS/.test(t)) return /CARREFOUR.*PASS/.test(tc);
    if (/COFIDIS/.test(t)) return /COFIDIS/.test(tc) && !/ACCESSIO/.test(tc);
    return false;
  });
  return candidats.length === 1 ? candidats[0] : null;
}

function projectionChargesFixesCycle2026_(debutCycle, finCycle) {
  const deb = dateLocaleBudgetSoft_(debutCycle);
  deb.setHours(0, 0, 0, 0);
  const fin = dateLocaleBudgetSoft_(finCycle);
  fin.setHours(23, 59, 59, 999);
  const charges = lireTable_('Charges_fixes').filter(c => convertirBooleen_(c.actif));
  const credits = typeof lireCreditsEtendusV2_ === 'function' ? lireCreditsEtendusV2_() : (typeof lireCreditsEtendus_ === 'function' ? lireCreditsEtendus_() : []);
  const items = [];

  charges.forEach(c => {
    const debutCharge = c.date_debut ? dateLocaleBudgetSoft_(c.date_debut) : deb;
    const finCharge = c.date_fin ? dateLocaleBudgetSoft_(c.date_fin) : null;
    if (finCharge && finCharge < deb) return;
    if (debutCharge > fin) return;

    const credit = creditPourChargeDashboard2026_(c, credits);
    const prochaine = credit && credit.prochaine_echeance ? dateLocaleBudgetSoft_(credit.prochaine_echeance) : null;

    if (prochaine && !isNaN(prochaine) && prochaine >= deb) {
      if (prochaine <= fin) {
        items.push({
          id: String(c.id || ''),
          libelle: String(c.libelle || c.libelle_bancaire || 'Charge fixe'),
          montant: Math.abs(Number(c.montant || credit.mensualite || 0)),
          date: prochaine.toISOString(),
          source: 'prochaine_echeance_credit'
        });
      }
      return;
    }

    const debutCalcul = debutCharge > deb ? debutCharge : deb;
    let echeances = [];
    try {
      echeances = typeof calculerEcheancesChargeFixeAjustees_ === 'function'
        ? calculerEcheancesChargeFixeAjustees_(c, debutCalcul, finCharge, fin)
        : calculerEcheancesJusqua_(c, debutCalcul, finCharge, fin).map(d => ({ date: d, montant: Math.abs(Number(c.montant || 0)), ajustement: '' }));
    } catch (e) { echeances = []; }

    echeances.filter(e => {
      const d = new Date(e.date);
      return !isNaN(d) && d >= deb && d <= fin;
    }).forEach(e => items.push({
      id: String(c.id || ''),
      libelle: String(c.libelle || c.libelle_bancaire || 'Charge fixe'),
      montant: Math.abs(Number(e.montant || c.montant || 0)),
      date: new Date(e.date).toISOString(),
      source: e.ajustement ? 'ajustement' : 'recurrence'
    }));
  });

  items.sort((a, b) => new Date(a.date) - new Date(b.date));
  return {
    items: items,
    total: Math.round(items.reduce((s, x) => s + Number(x.montant || 0), 0) * 100) / 100,
    nombre: items.length
  };
}

function salaireMoyenNetBancaire2026_() {
  const aujourdHui = new Date();
  const ops = lireTable_('Operations').map(o => {
    const d = new Date(o.date_comptable || o.date);
    return Object.assign({}, o, { __date: d });
  }).filter(o => !isNaN(o.__date) && dateBancaireConnueAuJour_(o.__date, aujourdHui));

  const salaires = ops.filter(o => {
    if (Number(o.montant || 0) <= 0) return false;
    const cat = String(o.categorie || '').trim();
    const txt = String(o.libelle_bancaire || o.libelle || '');
    return cat === 'Salaires' || /MAIRIE DE TOULOUSE/i.test(txt);
  }).sort((a, b) => a.__date - b.__date).slice(-6);

  if (!salaires.length) return null;
  return Math.round((salaires.reduce((s, o) => s + Number(o.montant || 0), 0) / salaires.length) * 100) / 100;
}

function chargerDashboardReelV2() {
  const d = chargerDashboardReel();
  if (!d || !d.cycleSuivant) return d;

  const salaire = salaireMoyenNetBancaire2026_();
  const projection = projectionChargesFixesCycle2026_(d.cycleSuivant.debut, d.cycleSuivant.fin);
  const cb = Number(d.cycleSuivant.cbDifferees || 0);

  d.cycleSuivant.salaireAttendu = salaire;
  d.cycleSuivant.chargesFixes = projection.total;
  d.cycleSuivant.nombreCharges = projection.nombre;
  d.cycleSuivant.detailFixes = projection.items;
  d.cycleSuivant.marge = salaire == null ? null : Math.round((salaire - projection.total - cb) * 100) / 100;
  d.cycleSuivant.methodeProjection = 'Échéances connues dans le cycle 28 inclus -> 27 inclus ; reports et suspensions appliqués ; salaire net bancaire moyen sur 6 versements.';
  d.versionCorrection = DASHBOARD_CORRECTIONS_19082026_VERSION;
  return JSON.parse(JSON.stringify(d));
}
