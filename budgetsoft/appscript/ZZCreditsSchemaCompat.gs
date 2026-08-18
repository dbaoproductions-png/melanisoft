// Compatibilité schéma Credits étendu — audit du 18/08/2026
// Le schéma central historique ne connaissait pas encore type_credit et les champs revolving.

function lireCreditsEtendus_() {
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

function enregistrerCreditEtendu_(credit) {
  assurerColonnesCredits_();
  const f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Credits');
  const largeur = Math.max(1, f.getLastColumn());
  const entetes = f.getRange(1, 1, 1, largeur).getValues()[0].map(v => String(v || '').trim());
  const c = Object.assign({}, credit || {});
  if (!c.id) c.id = Utilities.getUuid();
  const idIndex = entetes.indexOf('id');
  let ligneCible = -1;
  if (idIndex >= 0 && f.getLastRow() > 1) {
    const ids = f.getRange(2, idIndex + 1, f.getLastRow() - 1, 1).getValues().flat();
    const p = ids.findIndex(v => String(v) === String(c.id));
    if (p >= 0) ligneCible = p + 2;
  }
  const valeurs = entetes.map(h => normaliserValeur_(c[h]));
  if (ligneCible > 0) f.getRange(ligneCible, 1, 1, valeurs.length).setValues([valeurs]);
  else f.appendRow(valeurs);
  return c;
}

function corrigerTypesCreditsAudit18082026V2() {
  verifierInitialisation_();
  const credits = lireCreditsEtendus_();
  let modifiees = 0;
  const detail = [];
  credits.forEach(c => {
    const texte = normaliserTexteBanque_([c.nom || '', c.numero_pret || ''].join(' '));
    const revolving = /CARREFOUR.*PASS|ACCESSIO|FLOA.*CDISCOUNT|ONEY.*B\+|CARTE B\+/.test(texte);
    const amortissable = /\bCASDEN\b|\bCREATIS\b|^COFIDIS(?: |$)/.test(texte) && !/ACCESSIO/.test(texte);
    const cible = revolving ? 'revolving' : (amortissable ? 'amortissable' : '');
    if (!cible || String(c.type_credit || '').toLowerCase() === cible) return;
    c.type_credit = cible;
    enregistrerCreditEtendu_(c);
    modifiees++;
    detail.push({ nom: c.nom, type_credit: cible });
  });
  return { modifiees, detail };
}

// Remplacement compatible du chargeur : il lit toutes les colonnes réellement présentes
// dans la feuille Credits, notamment type_credit et les champs propres aux renouvelables.
function chargerCreditsEtDettes() {
  verifierInitialisation_();
  assurerColonnesCredits_();
  const credits = lireCreditsEtendus_().map(enrichirCredit_);
  const dettes = lireTable_('Dettes');
  const tous = [
    ...credits.map(c => Object.assign({ table: 'Credits', nature: c.type_credit === 'revolving' ? 'Crédit renouvelable' : 'Crédit' }, c)),
    ...dettes.map(d => Object.assign({ table: 'Dettes', nature: 'Dette' }, d))
  ].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));

  const capitalRestant = tous.reduce((s, l) => s + Math.abs(Number(l.capital_restant || 0)), 0);
  const mensualites = tous.reduce((s, l) => s + Math.abs(Number(l.mensualite || 0)), 0);
  const tauxPondere = capitalRestant ? tous.reduce((s, l) => s + Math.abs(Number(l.capital_restant || 0)) * Math.abs(Number(l.taux || 0)), 0) / capitalRestant : 0;
  const echeancesRestantes = credits.reduce((s, c) => s + Math.max(0, Number(c.echeances_restantes || 0)), 0);
  const coutRestant = credits.reduce((s, c) => s + Math.max(0, Number(c.cout_restant || 0)), 0);
  const amortissables = credits.filter(c => c.type_credit !== 'revolving');
  const renouvelables = credits.filter(c => c.type_credit === 'revolving');
  const capitalRenouvelable = renouvelables.reduce((s, c) => s + Number(c.capital_restant || 0), 0);
  const coutRenouvelable = renouvelables.reduce((s, c) => s + Number(c.cout_restant || 0), 0);
  const tauxRenouvelablePondere = capitalRenouvelable ? renouvelables.reduce((s, c) => s + Number(c.capital_restant || 0) * Number(c.taux || 0), 0) / capitalRenouvelable : 0;

  return { version: '1.9-schema-etendu', lignes: tous, capitalRestant, mensualites, tauxPondere, echeancesRestantes, coutRestant, amortissables, renouvelables, capitalRenouvelable, coutRenouvelable, tauxRenouvelablePondere };
}
