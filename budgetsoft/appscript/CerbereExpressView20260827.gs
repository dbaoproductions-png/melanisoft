const CERBERE_EXPRESS_VIEW_VERSION = '2026-08-27.3';

/**
 * Couche de présentation de Cerbère Express.
 * Lecture seule : aucune donnée BudgetSoft n'est modifiée.
 * Les retraits/espèces volontairement catégorisés restent comptés dans leur catégorie,
 * conformément à la décision utilisateur portée par Operations.
 *
 * La vue est exécutée dans un contexte de lecture mémoïsé : une même feuille n'est
 * lue qu'une fois pendant cette requête, même si le moteur Cerbère profond la redemande.
 * Le contexte est détruit à la fin de l'appel : aucune donnée n'est conservée entre
 * deux requêtes, donc aucune donnée périmée n'est servie.
 */
function chargerVueCerbereExpress20260827() {
  if (typeof avecContexteLectureBudgetSoft20260827_ === 'function') {
    return avecContexteLectureBudgetSoft20260827_('cerbere-express', chargerVueCerbereExpressSansContexte20260827_);
  }
  return chargerVueCerbereExpressSansContexte20260827_();
}

function chargerVueCerbereExpressSansContexte20260827_() {
  const e = chargerCerbereExpress20260827();
  if (!e || e.ok === false) return e || {ok:false,erreur:'Cerbère Express indisponible'};

  const lignes = (e.pilotable && e.pilotable.lignes || []).map(x => ({
    categorie:x.categorie,
    allocation:Number(x.allocation||0),
    consomme:Number(x.consomme||0),
    reste:Number(x.reste||0),
    partConsommee:Number(x.partConsommee||0),
    niveau:x.vigilance && x.vigilance.niveau || 'vert',
    libelle:x.vigilance && x.vigilance.libelle || 'Cap tenu',
    message:x.vigilance && x.vigilance.message || ''
  }));

  const pluxee = e.pluxee && e.pluxee.disponible ? {
    disponible:true,
    soldeReel:Number(e.pluxee.soldeReel||0),
    soldeTheorique:Number(e.pluxee.soldeTheorique||0),
    ecart:Number(e.pluxee.ecartReelTheorique||0),
    progressionPct:Number(e.pluxee.progressionPct||0),
    lignes:(e.pluxee.lignes||[]).map(x=>({
      categorie:x.categorie,
      allocation:Number(x.allocation||0),
      consomme:Number(x.consomme||0),
      reste:Number(x.reste||0),
      partConsommee:Number(x.partConsommee||0),
      niveau:x.vigilance&&x.vigilance.niveau||'vert',
      message:x.vigilance&&x.vigilance.message||''
    }))
  } : {disponible:false};

  const rouges=lignes.filter(x=>x.niveau==='rouge').length;
  const oranges=lignes.filter(x=>x.niveau==='orange').length;

  return {
    ok:true,
    version:CERBERE_EXPRESS_VIEW_VERSION,
    moteurVersion:e.version,
    genereLe:e.genereLe,
    cycle:e.cycle,
    meteo:e.meteo,
    consigneSaillante:e.consigneSaillante,
    pilotable:{
      allocation:Number(e.pilotable&&e.pilotable.allocation||0),
      consomme:Number(e.pilotable&&e.pilotable.consomme||0),
      reste:Number(e.pilotable&&e.pilotable.reste||0),
      lignes,
      rouges,
      oranges
    },
    pluxee,
    contexte:{
      prochainCycle:Number(e.contexteFinancier&&e.contexteFinancier.disponibleCerbereM1||0),
      cbDejaEngageeM1:Number(e.contexteFinancier&&e.contexteFinancier.cbDejaEngageeM1||0)
    },
    doctrine:'Vue comportementale en lecture seule ; achats à la date réelle ; retraits catégorisés comptés ; Cerbère complet reste l’autorité financière.'
  };
}

/**
 * Aperçu depuis le classeur : barre latérale plutôt que modal.
 * Cela reste visible même quand la fonction est lancée depuis l’éditeur Apps Script.
 */
function ouvrirCerbereExpress20260827() {
  const html=HtmlService.createTemplateFromFile('CerbereExpressMobile20260827')
    .evaluate()
    .setTitle('Cerbère Express');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Installe immédiatement une entrée de menu dans le classeur courant.
 * À lancer une seule fois pour le test ; le menu reste disponible tant que le classeur est ouvert.
 */
function installerMenuCerbereExpress20260827() {
  SpreadsheetApp.getUi()
    .createMenu('🐺 Cerbère Express')
    .addItem('Ouvrir Cerbère Express','ouvrirCerbereExpress20260827')
    .addToUi();
  return {ok:true,version:CERBERE_EXPRESS_VIEW_VERSION,message:'Menu Cerbère Express installé dans Google Sheets.'};
}

/** Audit court de la couche de présentation. */
function auditerVueCerbereExpress20260827() {
  const v=chargerVueCerbereExpress20260827();
  const out={
    ok:!!(v&&v.ok),
    version:v&&v.version,
    moteurVersion:v&&v.moteurVersion,
    cycle:v&&v.cycle,
    meteo:v&&v.meteo,
    consigneSaillante:v&&v.consigneSaillante,
    pilotable:v&&v.pilotable?{allocation:v.pilotable.allocation,consomme:v.pilotable.consomme,reste:v.pilotable.reste,rouges:v.pilotable.rouges,oranges:v.pilotable.oranges}:null,
    pluxee:v&&v.pluxee,
    contexte:v&&v.contexte
  };
  console.log(JSON.stringify(out));
  return out;
}

/** Mesure la vue réelle et expose les lectures de feuilles évitées. */
function auditerPerformanceCerbereExpress20260827() {
  const t=Date.now();
  const v=chargerVueCerbereExpress20260827();
  const dureeMs=Date.now()-t;
  const stats=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)
    ? BUDGETSOFT_READ_CONTEXT_LAST_STATS_
    : null;
  const out={
    ok:!!(v&&v.ok),
    version:CERBERE_EXPRESS_VIEW_VERSION,
    dureeMs,
    dureeSecondes:Math.round(dureeMs/100)/10,
    lectures:stats
  };
  console.log('[PERF Cerbere Express] '+JSON.stringify(out));
  return out;
}
