const CERBERE_EXPRESS_PRIVATE_VERSION = '2026-09-09.1';
const CERBERE_EXPRESS_PRIVATE_PROP_PREFIX = 'CERBERE_EXPRESS_TOKEN_';
const CERBERE_EXPRESS_WEBAPP_URL_PROP = 'CERBERE_EXPRESS_WEBAPP_URL';

/**
 * Crée (ou relit) deux liens privés révocables : principal et conjointe.
 * Les tokens sont conservés dans les propriétés du script, jamais dans le classeur.
 * Pour les SMS de production, CERBERE_EXPRESS_WEBAPP_URL doit contenir l'URL /exec stable.
 */
function preparerLiensPrivesCerbereExpress20260827() {
  const props = PropertiesService.getScriptProperties();
  const configuree = String(props.getProperty(CERBERE_EXPRESS_WEBAPP_URL_PROP) || '').trim();
  const native = ScriptApp.getService().getUrl();
  const base = configuree || native;
  if (!base) throw new Error('Aucune URL de déploiement web disponible. Déployez BudgetSoft en application web.');

  const profils = ['principal', 'conjointe'];
  const liens = {};
  profils.forEach(profil => {
    const cle = CERBERE_EXPRESS_PRIVATE_PROP_PREFIX + profil.toUpperCase();
    let token = props.getProperty(cle);
    if (!token) {
      token = creerTokenCerbereExpress20260827_();
      props.setProperty(cle, token);
    }
    liens[profil] = base.replace(/\?.*$/,'') + '?view=cerbere-express&t=' + encodeURIComponent(token);
  });

  const out = {ok:true, version:CERBERE_EXPRESS_PRIVATE_VERSION, liens, urlSource:configuree?'propriete-script':'ScriptApp'};
  console.log(JSON.stringify(out));
  return out;
}

/** Révoque un lien et en génère un nouveau pour le profil choisi. */
function regenererLienPriveCerbereExpress20260827(profil) {
  profil = normaliserProfilCerbereExpress20260827_(profil);
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CERBERE_EXPRESS_PRIVATE_PROP_PREFIX + profil.toUpperCase(), creerTokenCerbereExpress20260827_());
  return preparerLiensPrivesCerbereExpress20260827().liens[profil];
}

/**
 * Lecture canonique de la vue Express : le snapshot global BudgetSoft est prioritaire.
 * Aucun snapshot local Express n'est consommé par la route privée ni par les SMS.
 */
function lireVueCanoniqueCerbereExpressPrive20260909_() {
  if (typeof chargerVueCerbereExpress20260827 !== 'function') {
    throw new Error('Vue canonique Cerbère Express indisponible.');
  }
  const vue = chargerVueCerbereExpress20260827();
  if (!vue || vue.ok === false) throw new Error(String(vue && vue.erreur || 'Cerbère Express indisponible'));
  return vue;
}

/** Route privée appelée par doGet(e). */
function servirCerbereExpressPrive20260827_(e) {
  const token = String(e && e.parameter && e.parameter.t || '');
  if (!verifierTokenCerbereExpress20260827_(token)) {
    return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>Cerbère Express</title></head><body style="font-family:system-ui;padding:32px"><h2>Lien Cerbère Express invalide ou révoqué.</h2></body></html>')
      .setTitle('Cerbère Express');
  }

  let vue;
  try { vue = lireVueCanoniqueCerbereExpressPrive20260909_(); }
  catch (err) { vue = {ok:false,erreur:String(err && err.message || err)}; }

  const template = HtmlService.createTemplateFromFile('CerbereExpressMobile20260827');
  template.tokenExpress = token;
  template.vueExpressJson = JSON.stringify(vue);
  template.snapshotExpressMetaJson = JSON.stringify({
    disponible:!!(vue&&vue.ok!==false),
    perime:false,
    genereLe:String(vue&&vue.genereLe||''),
    dureeLectureMs:0,
    source:String(vue&&vue.sourceBudgetSoft||''),
    revisionBudgetSoft:String(vue&&vue.revisionBudgetSoft||'')
  });
  return template.evaluate().setTitle('Cerbère Express').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Chargement RPC protégé : renvoie exclusivement la vue canonique globale. */
function chargerVueCerbereExpressPrive20260827(token) {
  if (!verifierTokenCerbereExpress20260827_(token)) throw new Error('Lien Cerbère Express invalide ou révoqué.');
  return lireVueCanoniqueCerbereExpressPrive20260909_();
}

/**
 * Rafraîchissement protégé : republie d'abord le snapshot global BudgetSoft,
 * puis relit le module Cerbère Express de cette même révision.
 */
function rafraichirSnapshotCerbereExpressPrive20260827(token) {
  if (!verifierTokenCerbereExpress20260827_(token)) throw new Error('Lien Cerbère Express invalide ou révoqué.');
  if (typeof actualiserBudgetSoftSyntheseMaintenant20260907 === 'function') {
    const publication = actualiserBudgetSoftSyntheseMaintenant20260907();
    if (publication && publication.ok === false) throw new Error('Échec du rafraîchissement du snapshot global BudgetSoft.');
  }
  const vue = lireVueCanoniqueCerbereExpressPrive20260909_();
  return {ok:true,version:CERBERE_EXPRESS_PRIVATE_VERSION,source:'snapshot_global',revisionBudgetSoft:String(vue&&vue.revisionBudgetSoft||''),genereLe:String(vue&&vue.genereLe||''),vue};
}

/**
 * Prépare le SMS V1 sans l'envoyer : météo + chiffre global + UNE consigne + lien.
 * profil = principal | conjointe.
 */
function genererSmsCerbereExpress20260827(profil) {
  profil = normaliserProfilCerbereExpress20260827_(profil);
  const v = lireVueCanoniqueCerbereExpressPrive20260909_();
  const lien = preparerLiensPrivesCerbereExpress20260827().liens[profil];
  const meteo = v && v.meteo || {};
  const consigne = v && v.consigneSaillante || {};
  const reste = Number(v && v.pilotable && v.pilotable.reste || 0);
  const texte = [
    'Cerbere - ' + String(meteo.libelle || 'Situation'),
    'Pilotable : ' + formaterEurosSmsCerbereExpress20260827_(reste),
    String(consigne.texte || 'Cap tenu.'),
    lien
  ].join('\n');
  return {ok:true, version:CERBERE_EXPRESS_PRIVATE_VERSION, profil, texte, lien, sourceBudgetSoft:String(v&&v.sourceBudgetSoft||''), revisionBudgetSoft:String(v&&v.revisionBudgetSoft||'')};
}

function auditerLiensPrivesCerbereExpress20260827() {
  const liens = preparerLiensPrivesCerbereExpress20260827();
  const props = PropertiesService.getScriptProperties();
  const principal = props.getProperty(CERBERE_EXPRESS_PRIVATE_PROP_PREFIX + 'PRINCIPAL') || '';
  const conjointe = props.getProperty(CERBERE_EXPRESS_PRIVATE_PROP_PREFIX + 'CONJOINTE') || '';
  const configuree = String(props.getProperty(CERBERE_EXPRESS_WEBAPP_URL_PROP) || '').trim();
  const out = {
    ok: !!(liens && liens.ok && principal && conjointe),
    version: CERBERE_EXPRESS_PRIVATE_VERSION,
    principalValide: verifierTokenCerbereExpress20260827_(principal),
    conjointeValide: verifierTokenCerbereExpress20260827_(conjointe),
    tokensDistincts: principal !== conjointe,
    urlDisponible: !!(configuree || ScriptApp.getService().getUrl()),
    urlProductionConfiguree: !!configuree,
    urlProductionExec: !!(configuree && /\/exec(?:\?|$)/.test(configuree))
  };
  console.log(JSON.stringify(out));
  return out;
}

function verifierTokenCerbereExpress20260827_(token) {
  if (!token) return false;
  const props = PropertiesService.getScriptProperties();
  const a = props.getProperty(CERBERE_EXPRESS_PRIVATE_PROP_PREFIX + 'PRINCIPAL') || '';
  const b = props.getProperty(CERBERE_EXPRESS_PRIVATE_PROP_PREFIX + 'CONJOINTE') || '';
  return comparaisonConstanteCerbereExpress20260827_(token, a) || comparaisonConstanteCerbereExpress20260827_(token, b);
}

function comparaisonConstanteCerbereExpress20260827_(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function creerTokenCerbereExpress20260827_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function normaliserProfilCerbereExpress20260827_(profil) {
  profil = String(profil || 'principal').toLowerCase().trim();
  if (!['principal','conjointe'].includes(profil)) throw new Error('Profil Cerbère Express inconnu : ' + profil);
  return profil;
}

function formaterEurosSmsCerbereExpress20260827_(n) {
  const signe = Number(n) < 0 ? '-' : '';
  return signe + Math.abs(Number(n || 0)).toFixed(0).replace('.', ',') + ' EUR';
}
