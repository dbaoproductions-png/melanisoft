const CERBERE_EXPRESS_VIEW_VERSION = '2026-09-05.1';

/** Vue rapide : snapshot frais d'abord ; si le snapshot est périmé, recalcul immédiat. */
function chargerVueCerbereExpress20260827(){
  try{
    if(typeof chargerSnapshotCerbereExpress20260827==='function'){
      const s=chargerSnapshotCerbereExpress20260827();
      if(s&&s.disponible&&s.vue&&!s.perime)return s.vue;
    }
  }catch(e){}
  if(typeof avecContexteLectureBudgetSoft20260827_==='function')return avecContexteLectureBudgetSoft20260827_('cerbere-express-calcul',chargerVueCerbereExpressSansContexte20260827_);
  return chargerVueCerbereExpressSansContexte20260827_();
}

/** Calcul frais utilisé par le rafraîchissement du snapshot. */
function chargerVueCerbereExpressSansContexte20260827_(){
  const e=chargerCerbereExpress20260827();
  if(!e||e.ok===false)return e||{ok:false,erreur:'Cerbère Express indisponible'};
  const lignes=(e.pilotable&&e.pilotable.lignes||[]).map(x=>({categorie:x.categorie,allocation:Number(x.allocation||0),consomme:Number(x.consomme||0),reste:Number(x.reste||0),partConsommee:Number(x.partConsommee||0),partTempsPct:Number(x.partTempsPct||0),niveau:x.vigilance&&x.vigilance.niveau||'vert',libelle:x.vigilance&&x.vigilance.libelle||'Cap tenu',message:x.vigilance&&x.vigilance.message||''}));
  const pluxee=e.pluxee&&e.pluxee.disponible?{disponible:true,soldeReel:Number(e.pluxee.soldeReel||0),soldeTheorique:Number(e.pluxee.soldeTheorique||0),ecart:Number(e.pluxee.ecartReelTheorique||0),progressionPct:Number(e.pluxee.progressionPct||0),lignes:(e.pluxee.lignes||[]).map(x=>({categorie:x.categorie,allocation:Number(x.allocation||0),consomme:Number(x.consomme||0),reste:Number(x.reste||0),partConsommee:Number(x.partConsommee||0),partTempsPct:Number(x.partTempsPct||0),niveau:x.vigilance&&x.vigilance.niveau||'vert',message:x.vigilance&&x.vigilance.message||''}))}:{disponible:false};
  const rouges=lignes.filter(x=>x.niveau==='rouge').length,oranges=lignes.filter(x=>x.niveau==='orange').length;
  return{ok:true,version:CERBERE_EXPRESS_VIEW_VERSION,moteurVersion:e.version,moteurSource:e.moteurSource||'',cockpitVersion:e.cockpitVersion||'',genereLe:e.genereLe,cycle:e.cycle,meteo:e.meteo,consigneSaillante:e.consigneSaillante,pilotable:{allocation:Number(e.pilotable&&e.pilotable.allocation||0),consomme:Number(e.pilotable&&e.pilotable.consomme||0),reste:Number(e.pilotable&&e.pilotable.reste||0),reparti:Number(e.pilotable&&e.pilotable.reparti||0),aVentiler:Number(e.pilotable&&e.pilotable.aVentiler||0),lignes,rouges,oranges},pluxee,contexte:{pilotableInstantT:Number(e.contexteFinancier&&e.contexteFinancier.pilotableInstantT||0),p1:Number(e.contexteFinancier&&e.contexteFinancier.p1||0),prochainCycle:Number(e.contexteFinancier&&e.contexteFinancier.prochainCycle||0),reportCbCycleSuivant:Number(e.contexteFinancier&&e.contexteFinancier.reportCbCycleSuivant||0),surplusDeficitCycleSuivant:Number(e.contexteFinancier&&e.contexteFinancier.surplusDeficitCycleSuivant||0)},performance:e.performance||{},doctrine:'Présentation directe du cockpit Cerbère validé.'};
}

function ouvrirCerbereExpress20260827(){const html=HtmlService.createTemplateFromFile('CerbereExpressMobile20260827').evaluate().setTitle('Cerbère Express');SpreadsheetApp.getUi().showSidebar(html);}
function installerMenuCerbereExpress20260827(){SpreadsheetApp.getUi().createMenu('🐺 Cerbère Express').addItem('Ouvrir Cerbère Express','ouvrirCerbereExpress20260827').addToUi();return{ok:true,version:CERBERE_EXPRESS_VIEW_VERSION,message:'Menu Cerbère Express installé dans Google Sheets.'};}
function auditerVueCerbereExpress20260827(){const v=chargerVueCerbereExpress20260827();const out={ok:!!(v&&v.ok),version:v&&v.version,moteurVersion:v&&v.moteurVersion,cycle:v&&v.cycle,meteo:v&&v.meteo,consigneSaillante:v&&v.consigneSaillante,pilotable:v&&v.pilotable?{allocation:v.pilotable.allocation,consomme:v.pilotable.consomme,reste:v.pilotable.reste,aVentiler:v.pilotable.aVentiler}:null,pluxee:v&&v.pluxee,contexte:v&&v.contexte};console.log(JSON.stringify(out));return out;}
function auditerPerformanceCerbereExpress20260827(){const t=Date.now(),v=chargerVueCerbereExpress20260827(),dureeMs=Date.now()-t;const out={ok:!!(v&&v.ok),version:CERBERE_EXPRESS_VIEW_VERSION,dureeMs,dureeSecondes:Math.round(dureeMs/100)/10,source:v&&v.performance&&v.performance.source||'snapshot/vue'};console.log('[PERF Cerbere Express] '+JSON.stringify(out));return out;}
