const CERBERE_EXPRESS_VIEW_VERSION = '2026-09-21.1';

/**
 * Adapte le moteur Cerbère Express vers la vue mobile, sans recalcul métier.
 * Le même adaptateur est utilisé pour le module issu du snapshot global et pour
 * le recalcul de secours : une seule sémantique de présentation, EP uniquement.
 */
function composerVueCerbereExpressDepuisMoteur20260913_(e,sourceBudgetSoft,revisionBudgetSoft){
  if(!e||e.ok===false)return e||{ok:false,erreur:'Cerbère Express indisponible'};
  const lignes=(e.pilotable&&e.pilotable.lignes||[]).map(x=>({categorie:x.categorie,allocation:Number(x.allocation||0),consomme:Number(x.consomme||0),reste:Number(x.reste||0),partConsommee:Number(x.partConsommee||0),partTempsPct:Number(x.partTempsPct||0),niveau:x.vigilance&&x.vigilance.niveau||'vert',libelle:x.vigilance&&x.vigilance.libelle||'Cap tenu',message:x.vigilance&&x.vigilance.message||''}));
  const pluxee=e.pluxee&&e.pluxee.disponible?{disponible:true,soldeReel:Number(e.pluxee.soldeReel||0),soldeTheorique:Number(e.pluxee.soldeTheorique||0),ecart:Number(e.pluxee.ecartReelTheorique||0),progressionPct:Number(e.pluxee.progressionPct||0),lignes:(e.pluxee.lignes||[]).map(x=>({categorie:x.categorie,allocation:Number(x.allocation||0),consomme:Number(x.consomme||0),reste:Number(x.reste||0),partConsommee:Number(x.partConsommee||0),partTempsPct:Number(x.partTempsPct||0),niveau:x.vigilance&&x.vigilance.niveau||'vert',message:x.vigilance&&x.vigilance.message||''}))}:{disponible:false};
  const rouges=lignes.filter(x=>x.niveau==='rouge').length,oranges=lignes.filter(x=>x.niveau==='orange').length,ctx=e.contexteDecision||{},ref=e.referenceEP||{};
  return{ok:true,version:CERBERE_EXPRESS_VIEW_VERSION,moteurVersion:e.version,moteurSource:e.moteurSource||'',cockpitVersion:e.cockpitVersion||'',genereLe:e.genereLe,cycle:e.cycle,meteo:e.meteo,consigneSaillante:e.consigneSaillante,pilotable:{allocation:Number(e.pilotable&&e.pilotable.allocation||0),consomme:Number(e.pilotable&&e.pilotable.consomme||0),reste:Number(e.pilotable&&e.pilotable.reste||0),reparti:Number(e.pilotable&&e.pilotable.reparti||0),lignes,rouges,oranges},pluxee,decision:{
    ep:Number(ctx.ep!=null?ctx.ep:(e.pilotable&&e.pilotable.allocation||0)),
    epDisponible:Number(ctx.epDisponible!=null?ctx.epDisponible:(e.pilotable&&e.pilotable.reste||0)),
    epSource:String(ctx.epSource||ref.source||''),
    p0Reference:Number(ref.totalP0||0),
    prochainCycleEp:Number(ctx.prochainCycleEp||0),
    prochainCycleCbEngagee:Number(ctx.prochainCycleCbEngagee!=null?ctx.prochainCycleCbEngagee:(ctx.reportCbCycleSuivant||0)),
    prochainCycleEpConsommee:Number(ctx.prochainCycleEpConsommee||0),
    prochainCycleEpDisponible:Number(ctx.prochainCycleEpDisponible!=null?ctx.prochainCycleEpDisponible:(ctx.epDiffereEstimeCycleSuivant||0)),
    // Compatibilité de la vue avec les anciens noms jusqu'à disparition des consommateurs legacy.
    reportCbCycleSuivant:Number(ctx.prochainCycleCbEngagee!=null?ctx.prochainCycleCbEngagee:(ctx.reportCbCycleSuivant||0)),
    epDiffereEstimeCycleSuivant:Number(ctx.prochainCycleEpDisponible!=null?ctx.prochainCycleEpDisponible:(ctx.epDiffereEstimeCycleSuivant||0)),
    sourceProchainCycle:String(ctx.sourceProchainCycle||'')
  },performance:Object.assign({},e.performance||{},{source:sourceBudgetSoft==='snapshot_global'?'snapshot_global · moteur EP':'recalcul_secours · moteur EP'}),sourceBudgetSoft:String(sourceBudgetSoft||'recalcul_secours'),revisionBudgetSoft:String(revisionBudgetSoft||e.revisionBudgetSoft||''),doctrine:'Cerbère Express publie exclusivement la décision EP et son rythme de consommation.'};
}

function chargerVueCerbereExpress20260827(){
  const global=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'?lireModuleSnapshotGlobalBudgetSoft20260906_('cerbereExpress'):null;
  if(global)return composerVueCerbereExpressDepuisMoteur20260913_(global,'snapshot_global',global.revisionBudgetSoft||'');
  return{ok:false,version:CERBERE_EXPRESS_VIEW_VERSION,sourceBudgetSoft:'snapshot_global_indisponible',erreur:'Cerbère Express absent du snapshot global.'};
}
function chargerVueCerbereExpressSansContexte20260827_(){return composerVueCerbereExpressDepuisMoteur20260913_(chargerCerbereExpress20260827(),'recalcul_secours','');}
function ouvrirCerbereExpress20260827(){const html=HtmlService.createTemplateFromFile('CerbereExpressEpMobile20260913').evaluate().setTitle('Cerbère Express');SpreadsheetApp.getUi().showSidebar(html);}
function installerMenuCerbereExpress20260827(){SpreadsheetApp.getUi().createMenu('🐺 Cerbère Express').addItem('Ouvrir Cerbère Express','ouvrirCerbereExpress20260827').addToUi();return{ok:true,version:CERBERE_EXPRESS_VIEW_VERSION,message:'Menu Cerbère Express installé dans Google Sheets.'};}
function auditerVueCerbereExpress20260827(){const v=chargerVueCerbereExpress20260827();const out={ok:!!(v&&v.ok),version:v&&v.version,moteurVersion:v&&v.moteurVersion,sourceBudgetSoft:v&&v.sourceBudgetSoft||'',revisionBudgetSoft:v&&v.revisionBudgetSoft||'',cycle:v&&v.cycle,meteo:v&&v.meteo,consigneSaillante:v&&v.consigneSaillante,pilotable:v&&v.pilotable?{allocation:v.pilotable.allocation,consomme:v.pilotable.consomme,reste:v.pilotable.reste}:null,pluxee:v&&v.pluxee,decision:v&&v.decision,aucunP:!(v&&v.contexte)&&!(v&&v.referenceP1)&&!(v&&v.contexteFinancier)};out.ok=out.ok&&out.aucunP&&!!(v&&v.decision)&&Math.abs(Number(v.decision.ep||0)-Number(v.pilotable&&v.pilotable.allocation||0))<=.01&&Math.abs(Number(v.decision.epDisponible||0)-Number(v.pilotable&&v.pilotable.reste||0))<=.01;console.log(JSON.stringify(out));return out;}
function auditerPerformanceCerbereExpress20260827(){const t=Date.now(),v=chargerVueCerbereExpress20260827(),dureeMs=Date.now()-t;const out={ok:!!(v&&v.ok),version:CERBERE_EXPRESS_VIEW_VERSION,dureeMs,dureeSecondes:Math.round(dureeMs/100)/10,source:v&&v.sourceBudgetSoft||'recalcul_secours',revisionBudgetSoft:v&&v.revisionBudgetSoft||''};console.log('[PERF Cerbere Express] '+JSON.stringify(out));return out;}
