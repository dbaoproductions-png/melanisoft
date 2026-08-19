const ANALYSE_FINANCEMENT_VERSION = '2026-08-19.2';

// Calibration validée le 19/08/2026 sur la fenêtre 6 périodes :
// sorties de financement = 12 574,50 € ; capital remboursé estimé ≈ 8 410 €.
// Suravenir reste volontairement inclus dans les sorties de financement, mais ne
// constitue pas à lui seul un remboursement de capital. Le ratio ci-dessous est
// donc une estimation prudente de la part des sorties qui amortit réellement la dette.
const ANALYSE_FINANCEMENT_SORTIES_REFERENCE = 12574.50;
const ANALYSE_FINANCEMENT_CAPITAL_REFERENCE = 8410.00;
const ANALYSE_FINANCEMENT_RATIO_CAPITAL = ANALYSE_FINANCEMENT_CAPITAL_REFERENCE / ANALYSE_FINANCEMENT_SORTIES_REFERENCE;

function enrichirAnalyseFinancement2026_(depensesDetail, operations, periodesBudgetaires) {
  if (!depensesDetail || !depensesDetail.fenetres) return depensesDetail;
  const ops = Array.isArray(operations) ? operations : [];
  const periodes = Array.isArray(periodesBudgetaires) ? periodesBudgetaires : [];

  [3, 6, 12].forEach(nb => {
    const f = depensesDetail.fenetres[String(nb)] || depensesDetail.fenetres[nb];
    if (!f) return;

    // Quand l'utilisateur demande précisément 3, 6 ou 12 périodes, la fenêtre
    // financement doit être STRICTEMENT la même que celle de la vue générale :
    // du début de la première période budgétaire à la fin de la dernière.
    // On évite ainsi l'ancien décalage "mois civil" (ex. 01/03) / cycle (ex. 27/02).
    let debut = null;
    let fin = null;
    if (periodes.length === nb && periodes.length) {
      debut = dateMetier2026_(periodes[0].debut);
      fin = dateMetier2026_(periodes[periodes.length - 1].fin);
    }
    if (!debut || !fin) {
      debut = dateMetier2026_(f.debut);
      fin = dateMetier2026_(f.fin);
    }
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
      debut: debut,
      fin: fin,
      sortiesFinancement: sortiesFinancement,
      capitalRembourseEstime: capitalRembourseEstime,
      coutFinancementEstime: coutFinancementEstime,
      reinjectionsTresorerie: reinjectionsTresorerie,
      desendettementNetEstime: desendettementNetEstime,
      ratioCapitalEstime: ANALYSE_FINANCEMENT_RATIO_CAPITAL,
      estimation: true,
      methode: 'Fenêtre alignée sur les cycles budgétaires affichés ; part de capital calibrée sur l’audit validé du 19/08/2026 ; réinjections = crédits de trésorerie réellement crédités.'
    };

    const themes = Array.isArray(f.themes) ? f.themes : [];
    const nomsAjoutes = new Set([
      'Capital remboursé estimé',
      'Réinjections de crédit',
      'Désendettement net estimé'
    ]);
    f.themes = themes.filter(x => !nomsAjoutes.has(String(x.nom || '')));

    // Le thème principal doit lui aussi reprendre la fenêtre budgétaire exacte.
    let idx = f.themes.findIndex(x => String(x.nom || '') === 'Crédits / financement');
    if (idx >= 0) f.themes[idx].montant = sortiesFinancement;
    else {
      f.themes.unshift({ nom: 'Crédits / financement', montant: sortiesFinancement });
      idx = 0;
    }

    const ajouts = [
      { nom: 'Capital remboursé estimé', montant: capitalRembourseEstime },
      { nom: 'Réinjections de crédit', montant: reinjectionsTresorerie },
      { nom: 'Désendettement net estimé', montant: desendettementNetEstime }
    ];
    f.themes.splice(idx + 1, 0, ...ajouts);
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
