const CREDITS_REPAIR_19082026_VERSION = '2026-08-19.1';

/**
 * Répare les colonnes étendues des 7 crédits connus.
 * Les anciens enregistrements passaient par TABLES.Credits et perdaient les champs
 * ajoutés ensuite (type_credit, coût restant, plafond, disponible, assurance).
 * Cette migration est idempotente et ne touche ni au capital restant ni aux mensualités.
 */
function reparerCreditsEtendusConnus19082026_() {
  if (typeof lireCreditsEtendus_ !== 'function' || typeof enregistrerCreditEtendu_ !== 'function') return { ok: false, raison: 'schema_etendu_indisponible' };
  const credits = lireCreditsEtendus_();
  let modifies = 0;
  const detail = [];

  credits.forEach(c => {
    const t = normaliserTexteBanque_([c.nom || '', c.numero_pret || ''].join(' '));
    let patch = null;

    if (/ACCESSIO/.test(t)) patch = {
      type_credit: 'revolving', plafond_credit: 2500, disponible_credit: 1700, assurance_mensuelle: 0,
      cout_restant: 244.14,
      cout_restant_precision: 'Estimation instantanée par amortissement théorique de 800 € à 23,16 % TAEG avec une mensualité constante de 33,60 €. Environ 32 mensualités ; toute nouvelle utilisation ou variation du TAEG modifiera cette estimation.'
    };
    else if (/CARREFOUR.*PASS/.test(t)) patch = {
      type_credit: 'revolving', plafond_credit: 6000, disponible_credit: 8.05, assurance_mensuelle: 38.49,
      cout_restant: 3969.58
    };
    else if (/FLOA|CDISCOUNT/.test(t)) patch = {
      type_credit: 'revolving', plafond_credit: 3000, disponible_credit: 0, assurance_mensuelle: 0,
      cout_restant: 1068.54
    };
    else if (/ONEY|CARTE B/.test(t)) patch = {
      type_credit: 'revolving', plafond_credit: 3000, disponible_credit: 100, assurance_mensuelle: 19.74,
      cout_restant: 1448.73
    };
    else if (/CASDEN/.test(t)) patch = {
      type_credit: 'amortissable', cout_restant: 1244.66,
      cout_restant_precision: 'Coût restant calculé sur 72 échéances de 576,33 € et une dernière de 311,20 €, moins le capital restant dû de 40 562,30 €.',
      prochaine_echeance: '2026-11-04', date_fin: '2032-11-04'
    };
    else if (/CREATIS/.test(t)) patch = {
      type_credit: 'amortissable', cout_restant: 12078.49,
      cout_restant_precision: 'Estimation actuelle : 82 mensualités de référence de 865,11 € moins le capital restant dû de 58 860,53 €. À réactualiser avec le nouvel échéancier après le report d’août 2026.',
      prochaine_echeance: '2026-09-30'
    };
    else if (/COFIDIS/.test(t)) patch = {
      type_credit: 'amortissable', cout_restant: 2070.13, prochaine_echeance: '2026-09-01'
    };

    if (!patch) return;
    const cible = Object.assign({}, c, patch);
    const champs = Object.keys(patch);
    const change = champs.some(k => String(c[k] == null ? '' : c[k]) !== String(cible[k] == null ? '' : cible[k]));
    if (!change) return;
    enregistrerCreditEtendu_(cible);
    modifies++;
    detail.push({ nom: c.nom, champs: champs });
  });

  return { ok: true, version: CREDITS_REPAIR_19082026_VERSION, modifies: modifies, detail: detail };
}

function reparerCreditsEtendusConnus19082026() {
  verifierInitialisation_();
  const r = reparerCreditsEtendusConnus19082026_();
  return { reparation: r, credits: typeof chargerCreditsEtDettesV2 === 'function' ? chargerCreditsEtDettesV2() : null };
}
