const ANALYSE_FINANCEMENT_VERSION = '2026-08-19.1';

// Calibration validée le 19/08/2026 sur la fenêtre 6 périodes :
// sorties de financement = 12 574,50 € ; capital remboursé estimé ≈ 8 410 €.
// Suravenir reste volontairement inclus dans les sorties de financement, mais ne
// constitue pas à lui seul un remboursement de capital. Le ratio ci-dessous est
// donc une estimation prudente de la part des sorties qui amortit réellement la dette.
const ANALYSE_FINANCEMENT_SORTIES_REFERENCE = 12574.50;
const ANALYSE_FINANCEMENT_CAPITAL_REFERENCE = 8410.00;
const ANALYSE_FINANCEMENT_RATIO_CAPITAL = ANALYSE_FINANCEMENT_CAPITAL_REFERENCE / ANALYSE_FINANCEMENT_SORTIES_REFERENCE;

function enrichirAnalyseFinancement2026_(depensesDetail, operations) {
  if (!depensesDetail || !depensesDetail.fenetres) return depensesDetail;
  const ops = Array.isArray(operations) ? operations : [];

  [3, 6, 12].forEach(nb => {
    const f = depensesDetail.fenetres[String(nb)] || depensesDetail.fenetres[nb];
    if (!f) return;

    const debut = dateMetier2026_(f.debut);
    const fin = dateMetier2026_(f.fin);
    if (!debut || !fin) return;

    const dansFenetre = ops.filter(o => {
      const d = dateMetier2026_(o.date);
      return d && d >= debut && d <= fin;
    });

    const sortiesFinancement = dansFenetre
      .filter(o => Number(o.montant || 0) < 0 && ['Crédits', 'Crédits revolving'].includes(String(o.categorie || '').trim()))
      .reduce((s, o) => s + Math.abs(Number(o.montant || 0)), 0);

    const reinjectionsTresorerie = dansFenetre
      .filter(o => Number(o.montant || 0) > 0 && String(o.categorie || '').trim() === 'Crédits de trésorerie')
      .reduce((s, o) => s + Number(o.montant || 0), 0);

    const capitalRembourseEstime = sortiesFinancement * ANALYSE_FINANCEMENT_RATIO_CAPITAL;
    const coutFinancementEstime = Math.max(0, sortiesFinancement - capitalRembourseEstime);
    const desendettementNetEstime = capitalRembourseEstime - reinjectionsTresorerie;

    f.financement = {
      version: ANALYSE_FINANCEMENT_VERSION,
      sortiesFinancement: sortiesFinancement,
      capitalRembourseEstime: capitalRembourseEstime,
      coutFinancementEstime: coutFinancementEstime,
      reinjectionsTresorerie: reinjectionsTresorerie,
      desendettementNetEstime: desendettementNetEstime,
      ratioCapitalEstime: ANALYSE_FINANCEMENT_RATIO_CAPITAL,
      estimation: true,
      methode: 'Part de capital calibrée sur l’audit validé du 19/08/2026 ; réinjections = crédits de trésorerie réellement crédités.'
    };

    // Les quatre chiffres remontent dans l'interface existante sans refonte UI,
    // immédiatement après le poste Crédits / financement.
    const themes = Array.isArray(f.themes) ? f.themes : [];
    const nomsAjoutes = new Set([
      'Capital remboursé estimé',
      'Réinjections de crédit',
      'Désendettement net estimé'
    ]);
    f.themes = themes.filter(x => !nomsAjoutes.has(String(x.nom || '')));
    const idx = f.themes.findIndex(x => String(x.nom || '') === 'Crédits / financement');
    const ajouts = [
      { nom: 'Capital remboursé estimé', montant: capitalRembourseEstime },
      { nom: 'Réinjections de crédit', montant: reinjectionsTresorerie },
      { nom: 'Désendettement net estimé', montant: desendettementNetEstime }
    ];
    if (idx >= 0) f.themes.splice(idx + 1, 0, ...ajouts);
    else f.themes.push(...ajouts);
  });

  depensesDetail.financement = {
    version: ANALYSE_FINANCEMENT_VERSION,
    estimation: true,
    calibration: {
      sortiesReference: ANALYSE_FINANCEMENT_SORTIES_REFERENCE,
      capitalReference: ANALYSE_FINANCEMENT_CAPITAL_REFERENCE,
      ratioCapital: ANALYSE_FINANCEMENT_RATIO_CAPITAL,
      date: '2026-08-19'
    }
  };
  return depensesDetail;
}
