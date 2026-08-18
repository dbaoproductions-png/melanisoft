const CREDITS_DATA_V2_VERSION = '2.1-2026-08-18';

function lireCreditsEtendusV2_() {
  assurerColonnesCredits_();
  const f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Credits');
  if (!f || f.getLastRow() < 2) return [];
  const largeur = Math.max(1, f.getLastColumn());
  const entetes = f.getRange(1, 1, 1, largeur).getValues()[0].map(v => String(v || '').trim());
  const valeurs = f.getRange(2, 1, f.getLastRow() - 1, largeur).getValues();
  return valeurs.filter(l => l.some(v => v !== '' && v !== null)).map(ligne => {
    const o = {};
    entetes.forEach((h, i) => { if (h) o[h] = serialiserValeur_(ligne[i]); });
    return o;
  });
}

function typeCreditV2_(c) {
  const explicite = String(c.type_credit || '').toLowerCase();
  if (explicite === 'revolving' || explicite === 'amortissable') return explicite;

  // Ne pas dépendre du signe + : la normalisation bancaire peut le supprimer.
  const brut = [c.nom || '', c.numero_pret || ''].join(' ').toUpperCase();
  const normalise = normaliserTexteBanque_(brut);
  const texte = brut + ' ' + normalise;
  if (/CARREFOUR.*PASS|ACCESSIO|FLOA|CDISCOUNT|ONEY|CARTE\s+B/.test(texte)) return 'revolving';
  return 'amortissable';
}

function enrichirCreditV2_(c) {
  const x = enrichirCredit_(c);
  x.type_credit = typeCreditV2_(c);

  // Dans l'ancien schéma, une cellule vide de cout_restant était convertie en 0
  // avant que le calcul de secours puisse s'appliquer. On recalcule uniquement
  // si aucun coût positif n'est réellement stocké.
  const coutBrut = c.cout_restant;
  const coutSaisi = coutBrut !== '' && coutBrut !== null && coutBrut !== undefined && Number(coutBrut) > 0;
  if (!coutSaisi && x.echeances_restantes > 0 && x.mensualite > 0 && x.capital_restant > 0) {
    x.cout_restant = Math.max(0, Math.round((x.echeances_restantes * x.mensualite - x.capital_restant) * 100) / 100);
  }
  return x;
}

function chargerCreditsEtDettesV2() {
  verifierInitialisation_();
  const credits = lireCreditsEtendusV2_().map(enrichirCreditV2_);
  const dettes = lireTable_('Dettes');
  const tous = [
    ...credits.map(c => Object.assign({ table: 'Credits', nature: c.type_credit === 'revolving' ? 'Crédit renouvelable' : 'Crédit' }, c)),
    ...dettes.map(d => Object.assign({ table: 'Dettes', nature: 'Dette' }, d))
  ].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));

  const capitalRestant = tous.reduce((s, l) => s + Math.abs(Number(l.capital_restant || 0)), 0);
  const mensualites = tous.reduce((s, l) => s + Math.abs(Number(l.mensualite || 0)), 0);
  const tauxPondere = capitalRestant
    ? tous.reduce((s, l) => s + Math.abs(Number(l.capital_restant || 0)) * Math.abs(Number(l.taux || 0)), 0) / capitalRestant
    : 0;
  const echeancesRestantes = credits.reduce((s, c) => s + Math.max(0, Number(c.echeances_restantes || 0)), 0);
  const coutRestant = credits.reduce((s, c) => s + Math.max(0, Number(c.cout_restant || 0)), 0);
  const amortissables = credits.filter(c => c.type_credit === 'amortissable');
  const renouvelables = credits.filter(c => c.type_credit === 'revolving');
  const capitalRenouvelable = renouvelables.reduce((s, c) => s + Number(c.capital_restant || 0), 0);
  const coutRenouvelable = renouvelables.reduce((s, c) => s + Number(c.cout_restant || 0), 0);
  const tauxRenouvelablePondere = capitalRenouvelable
    ? renouvelables.reduce((s, c) => s + Number(c.capital_restant || 0) * Number(c.taux || 0), 0) / capitalRenouvelable
    : 0;

  return {
    version: CREDITS_DATA_V2_VERSION,
    lignes: tous,
    capitalRestant,
    mensualites,
    tauxPondere,
    echeancesRestantes,
    coutRestant,
    amortissables,
    renouvelables,
    capitalRenouvelable,
    coutRenouvelable,
    tauxRenouvelablePondere
  };
}

function diagnostiquerCreditsV2() {
  const d = chargerCreditsEtDettesV2();
  const resume = {
    version: d.version,
    capitalRenouvelable: d.capitalRenouvelable,
    coutRenouvelable: d.coutRenouvelable,
    renouvelables: (d.renouvelables || []).map(c => ({
      nom: c.nom,
      type_credit: c.type_credit,
      capital_restant: c.capital_restant,
      cout_restant: c.cout_restant
    })),
    amortissables: (d.amortissables || []).map(c => c.nom)
  };
  console.log(JSON.stringify(resume, null, 2));
  return resume;
}
