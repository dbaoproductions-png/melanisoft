const CERBERE_EXPRESS_PRIVATE_VERSION = '2026-08-27.2';
const CERBERE_EXPRESS_PRIVATE_PROP_PREFIX = 'CERBERE_EXPRESS_TOKEN_';

/**
 * Crée (ou relit) deux liens privés révocables : principal et conjointe.
 * Les tokens sont conservés dans les propriétés du script, jamais dans le classeur.
 */
function preparerLiensPrivesCerbereExpress20260827() {
  const props = PropertiesService.getScriptProperties();
  const base = ScriptApp.getService().getUrl();
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
    liens[profil] = base + '?view=cerbere-express&t=' + encodeURIComponent(token);
  });

  const out = {ok:true, version:CERBERE_EXPRESS_PRIVATE_VERSION, liens};
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

/** Route privée appelée par doGet(e). */
function servirCerbereExpressPrive20260827_(e) {
  const token = String(e && e.parameter && e.parameter.t || '');
  if (!verifierTokenCerbereExpress20260827_(token)) {
    return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>Cerbère Express</title></head><body style="font-family:system-ui;padding:32px"><h2>Lien Cerbère Express invalide ou révoqué.</h2></body></html>')
      .setTitle('Cerbère Express');
  }

  // Pour le lien privé, on calcule la vue côté serveur pendant doGet.
  // La page mobile n'attend donc plus un second appel google.script.run,
  // ce qui évite les écrans de chargement bloqués dans certains contextes /dev ou mobiles.
  const vue = chargerVueCerbereExpress20260827();
  const template = HtmlService.createTemplateFromFile('CerbereExpressMobile20260827');
  template.tokenExpress = token;
  template.vueExpressJson = JSON.stringify(vue || {ok:false,erreur:'Cerbère Express indisponible'});
  return template.evaluate().setTitle('Cerbère Express').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Chargement RPC protégé : conservé pour les usages embarqués. */
function chargerVueCerbereExpressPrive20260827(token) {
  if (!verifierTokenCerbereExpress20260827_(token)) throw new Error('Lien Cerbère Express invalide ou révoqué.');
  return chargerVueCerbereExpress20260827();
}

/**
 * Prépare le SMS V1 sans l'envoyer : météo + chiffre global + UNE consigne + lien.
 * profil = principal | conjointe.
 */
function genererSmsCerbereExpress20260827(profil) {
  profil = normaliserProfilCerbereExpress20260827_(profil);
  const v = chargerVueCerbereExpress20260827();
  const lien = preparerLiensPrivesCerbereExpress20260827().liens[profil];
  const meteo = v && v.meteo || {};
  const consigne = v && v.consigneSaillante || {};
  const reste = Number(v && v.pilotable && v.pilotable.reste || 0);
  const texte = [
    '🐺 Cerbère — ' + String(meteo.emoji || '🌤️') + ' ' + String(meteo.libelle || 'Situation'),
    'Pilotable restant : ' + formaterEurosSmsCerbereExpress20260827_(reste),
    '⚠️ ' + String(consigne.texte || 'Cap tenu.'),
    lien
  ].join('\n');
  return {ok:true, version:CERBERE_EXPRESS_PRIVATE_VERSION, profil, texte, lien};
}

function auditerLiensPrivesCerbereExpress20260827() {
  const liens = preparerLiensPrivesCerbereExpress20260827();
  const props = PropertiesService.getScriptProperties();
  const principal = props.getProperty(CERBERE_EXPRESS_PRIVATE_PROP_PREFIX + 'PRINCIPAL') || '';
  const conjointe = props.getProperty(CERBERE_EXPRESS_PRIVATE_PROP_PREFIX + 'CONJOINTE') || '';
  const out = {
    ok: !!(liens && liens.ok && principal && conjointe),
    version: CERBERE_EXPRESS_PRIVATE_VERSION,
    principalValide: verifierTokenCerbereExpress20260827_(principal),
    conjointeValide: verifierTokenCerbereExpress20260827_(conjointe),
    tokensDistincts: principal !== conjointe,
    urlDisponible: !!ScriptApp.getService().getUrl()
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
  return signe + Math.abs(Number(n || 0)).toFixed(0).replace('.', ',') + ' €';
}
