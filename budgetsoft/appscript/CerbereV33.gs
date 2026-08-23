const CERBERE_V33_VERSION = '3.3.0';
const CERBERE_V33_SHEET = 'Cerbere_Ajustements';

/**
 * Cerbère 3.3 : couche de pilotage mensuel au-dessus du moteur 3.2.
 * P0 reste le canon. P1-P6 héritent de P0 mais disposent de leur propre
 * ventilation, persistée par période, sans modifier P0 ni le réel.
 */
function chargerCerbereV33() {
  const d = chargerCerbereV3();
  if (!d || d.ok === false) return d;
  const ajustements = lireAjustementsCerbereV33_();
  (d.periodes || []).forEach(p => enrichirPeriodePilotableV33_(p, ajustements));
  d.version = CERBERE_V33_VERSION;
  d.principe = 'P0 est le canon ; chaque période P1–P6 possède une ventilation pilotable propre, bornée par le réel déjà constaté.';
  if (d.diagnostic) d.diagnostic.pilotage = 'mensuel_persistant_3.3';
  return d;
}

function diagnostiquerCerbereV33() {
  const d = diagnostiquerCerbereV3();
  if (d && d.ok) d.version = CERBERE_V33_VERSION;
  return d;
}

function enrichirPeriodePilotableV33_(p, ajustements) {
  const cle = clePeriodeCerbereV33_(p.periode);
  const budgetDisponible = arrondirCerbereV3_(
    Number(p.ressources || 0) - Number(p.fixesPonderees || 0) - Number(p.epargne || 0) -
    Number(p.reserveObjectifs || 0) - Number(p.depensesExceptionnelles || 0)
  );
  const map = ajustements[cle] || {};
  let total = 0;
  (p.enveloppes || []).forEach(x => {
    const canon = Number(x.monetaire != null ? x.monetaire : x.prevu || 0);
    const reel = Number(x.reel || 0);
    const sauvegarde = Object.prototype.hasOwnProperty.call(map, x.categorie) ? Number(map[x.categorie]) : canon;
    const budget = Math.max(reel, Number.isFinite(sauvegarde) ? sauvegarde : canon);
    x.canon = arrondirCerbereV3_(canon);
    x.prevu = arrondirCerbereV3_(budget);
    x.reste = arrondirCerbereV3_(budget - reel);
    x.etat = reel > budget + .009 ? 'rouge' : reel > budget * .8 ? 'orange' : 'vert';
    total += budget;
  });
  p.clePilotage = cle;
  p.budgetDisponible = budgetDisponible;
  p.budgetReparti = arrondirCerbereV3_(total);
  p.resteAVentiler = arrondirCerbereV3_(budgetDisponible - total);
  p.enveloppePilotable = budgetDisponible;
  p.disponibleRestant = p.resteAVentiler;
  p.ajustementsSauvegardes = Object.keys(map).length > 0;
  if (p.resteAVentiler < -.009) p.etat = 'rouge';
  else if (p.etat !== 'rouge' && p.resteAVentiler < 0.01) p.etat = 'orange';
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
  return {ok:true, cle:cle, postes:postes.length};
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
