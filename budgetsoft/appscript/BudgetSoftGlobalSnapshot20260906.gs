const BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION='2026-09-07.1';
const BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX='BUDGETSOFT_GLOBAL_SNAPSHOT_';
const BUDGETSOFT_GLOBAL_SNAPSHOT_CHUNK=7000;
const BUDGETSOFT_HISTORY_SHEET='BudgetSoft_History';

/**
 * Etat global atomique BudgetSoft.
 * Une révision n'est publiée que si les valeurs transversales sont cohérentes.
 * Les sources brutes ne sont jamais stockées dans le snapshot : elles sont lues
 * une fois pendant la construction puis réduites en sorties canoniques.
 */
function reconstruireSnapshotGlobalBudgetSoft20260906(origine){
  verifierInitialisation_();
  const lock=LockService.getDocumentLock();
  if(!lock.tryLock(3000))return{ok:false,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,enCours:true,message:'Une reconstruction BudgetSoft est déjà en cours.'};
  const t0=Date.now();
  try{
    const construire=function(){
      const genereLe=new Date().toISOString(),modules={},erreurs=[];
      function prendre(nom,fn){
        try{const v=typeof fn==='function'?fn():null;modules[nom]=v;return v;}
        catch(e){const x={module:nom,erreur:String(e&&e.message||e)};erreurs.push(x);modules[nom]={ok:false,erreur:x.erreur};return modules[nom];}
      }

      const sources=chargerToutesLesDonnees();
      modules.sourceMeta={version:sources&&sources.meta&&sources.meta.version||'',tables:{}};
      Object.keys(sources||{}).forEach(k=>{if(Array.isArray(sources[k]))modules.sourceMeta.tables[k]=sources[k].length;});

      const comptes=prendre('comptes',()=>{
        if(typeof rafraichirSnapshotComptes20260828==='function'){
          const r=rafraichirSnapshotComptes20260828();
          return r&&r.vue?r.vue:r;
        }
        return typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828();
      });
      const credits=prendre('credits',()=>typeof chargerCreditsEtDettesV2==='function'?chargerCreditsEtDettesV2():null);
      const dashboard=prendre('dashboard',()=>typeof chargerDashboardReelV2==='function'?chargerDashboardReelV2():(typeof chargerDashboardReel==='function'?chargerDashboardReel():null));
      const patrimoine=prendre('patrimoine',()=>typeof composerPatrimoineCanoniqueBudgetSoft20260906_==='function'?composerPatrimoineCanoniqueBudgetSoft20260906_(sources,comptes,credits):chargerPatrimoine());

      // Trésorerie canonique = math comptable pure. Elle seule fait autorité pour
      // les soldes prévisionnels BudgetSoft. L'ancien moteur enrichi est conservé
      // temporairement comme projection étendue/diagnostic, jamais comme vérité.
      const cibleFinCycle=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(new Date()):new Date();
      const tresorerieComptable=prendre('tresorerieComptable',()=>typeof construireTresorerieComptableCanoniqueBudgetSoft20260906_==='function'
        ?construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,cibleFinCycle,new Date())
        :null);
      prendre('projectionEtendue',()=>typeof chargerTresorerieFinCycle20260830==='function'?chargerTresorerieFinCycle20260830():null);

      const cerbere=prendre('cerbere',()=>typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null);
      const cerbereExpress=prendre('cerbereExpress',()=>typeof chargerVueCerbereExpressSansContexte20260827_==='function'?chargerVueCerbereExpressSansContexte20260827_():null);

      const transversales=typeof construireTransversalesBudgetSoft20260906_==='function'
        ?construireTransversalesBudgetSoft20260906_(Object.assign({sources:sources},modules))
        :{};
      if(tresorerieComptable&&transversales&&transversales.tresorerie){
        transversales.tresorerie={
          version:tresorerieComptable.version||'',
          soldeReel:Number(tresorerieComptable.soldeReel),
          variationComptableCertaine:Number(tresorerieComptable.variationComptableCertaine),
          soldePrevisionnel:Number(tresorerieComptable.soldePrevisionnel),
          dateCible:tresorerieComptable.dateCible||'',
          nombreOperationsFutures:Number(tresorerieComptable.nombreOperationsFutures||0)
        };
      }

      const provisoire={modules:modules,erreurs:erreurs,transversales:transversales};
      const coherence=typeof auditerCoherenceRevisionBudgetSoft20260906_==='function'
        ?auditerCoherenceRevisionBudgetSoft20260906_(provisoire)
        :{ok:true,version:'absent',erreurs:[],avertissements:[]};
      const revision=empreinteRevisionGlobaleBudgetSoft20260906_(genereLe,modules);
      return serialiserEtatGlobalBudgetSoft20260906_({
        ok:erreurs.length===0&&coherence.ok===true,
        publie:false,
        version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,
        versionDoctrine:'2026-09-06',
        revisionBudgetSoft:revision,
        genereLe,
        origine:String(origine||'manuel'),
        erreurs,
        coherence,
        transversales,
        modules,
        performance:{dureeMs:Date.now()-t0}
      });
    };

    const etat=typeof avecContexteLectureBudgetSoft20260827_==='function'
      ?avecContexteLectureBudgetSoft20260827_('budgetsoft-global-snapshot',construire)
      :construire();

    if(!etat||!etat.revisionBudgetSoft)throw new Error('Etat global BudgetSoft invalide.');
    if(etat.ok!==true){
      etat.publie=false;
      etat.message='Nouvelle révision non publiée : l’ancienne révision cohérente reste active.';
      etat.performance=Object.assign({},etat.performance||{},{dureeTotaleMs:Date.now()-t0});
      return etat;
    }

    etat.publie=true;
    ecrireSnapshotGlobalBudgetSoft20260906_(etat);
    archiverEtatBudgetSoftSiNecessaire20260906_(etat,String(origine||'manuel'));
    return Object.assign({},etat,{performance:Object.assign({},etat.performance||{},{dureeTotaleMs:Date.now()-t0})});
  }finally{lock.releaseLock();}
}

function chargerSnapshotGlobalBudgetSoft20260906(){
  const props=PropertiesService.getDocumentProperties(),rawMeta=props.getProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'META');
  if(!rawMeta)return{ok:true,disponible:false,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION};
  try{
    const meta=JSON.parse(rawMeta),n=Number(meta.morceaux||0);if(!n)return{ok:true,disponible:false,corrompu:true,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION};
    let raw='';for(let i=0;i<n;i++){const part=props.getProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'PART_'+i);if(part==null)throw new Error('Snapshot incomplet');raw+=part;}
    const etat=JSON.parse(decoderEtatGlobalBudgetSoft20260906_(raw));
    return{ok:true,disponible:true,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,revisionBudgetSoft:etat.revisionBudgetSoft,genereLe:etat.genereLe,etat};
  }catch(e){return{ok:false,disponible:false,corrompu:true,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,erreur:String(e&&e.message||e)};}
}

function ecrireSnapshotGlobalBudgetSoft20260906_(etat){
  const props=PropertiesService.getDocumentProperties(),json=JSON.stringify(etat),zip=encoderEtatGlobalBudgetSoft20260906_(json),parts=[];
  for(let i=0;i<zip.length;i+=BUDGETSOFT_GLOBAL_SNAPSHOT_CHUNK)parts.push(zip.slice(i,i+BUDGETSOFT_GLOBAL_SNAPSHOT_CHUNK));
  const ancien=Number(props.getProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'COUNT')||0);
  parts.forEach((p,i)=>props.setProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'PART_'+i,p));
  for(let i=parts.length;i<ancien;i++)props.deleteProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'PART_'+i);
  props.setProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'COUNT',String(parts.length));
  props.setProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'META',JSON.stringify({version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,revisionBudgetSoft:etat.revisionBudgetSoft,genereLe:etat.genereLe,morceaux:parts.length,tailleCompressee:zip.length}));
}

function empreinteRevisionGlobaleBudgetSoft20260906_(genereLe,modules){
  const brut=JSON.stringify({version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,doctrine:'2026-09-06',genereLe,versions:{
    comptes:modules&&modules.comptes&&modules.comptes.version||'',credits:modules&&modules.credits&&modules.credits.version||'',
    dashboard:modules&&modules.dashboard&&modules.dashboard.versionCorrection||'',
    tresorerie:modules&&modules.tresorerieComptable&&modules.tresorerieComptable.version||'',projection:modules&&modules.projectionEtendue&&modules.projectionEtendue.version||'',
    cerbere:modules&&modules.cerbere&&modules.cerbere.version||'',cerbereExpress:modules&&modules.cerbereExpress&&modules.cerbereExpress.version||''
  }});
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,brut,Utilities.Charset.UTF_8);
  return digest.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('').slice(0,20);
}

function serialiserEtatGlobalBudgetSoft20260906_(v){if(v instanceof Date)return v.toISOString();if(Array.isArray(v))return v.map(serialiserEtatGlobalBudgetSoft20260906_);if(v&&typeof v==='object'){const r={};Object.keys(v).forEach(k=>r[k]=serialiserEtatGlobalBudgetSoft20260906_(v[k]));return r;}return v;}
function encoderEtatGlobalBudgetSoft20260906_(texte){return Utilities.base64EncodeWebSafe(Utilities.gzip(Utilities.newBlob(String(texte||''),'application/json','budgetsoft-global.json')).getBytes());}
function decoderEtatGlobalBudgetSoft20260906_(texte){return Utilities.ungzip(Utilities.newBlob(Utilities.base64DecodeWebSafe(String(texte||'')),'application/gzip','budgetsoft-global.json.gz')).getDataAsString('UTF-8');}

function archiverEtatBudgetSoftSiNecessaire20260906_(etat,origine){
  if(!etat||!etat.revisionBudgetSoft||etat.ok!==true)return;
  const ss=SpreadsheetApp.getActiveSpreadsheet();let sh=ss.getSheetByName(BUDGETSOFT_HISTORY_SHEET);
  if(!sh){sh=ss.insertSheet(BUDGETSOFT_HISTORY_SHEET);sh.getRange(1,1,1,18).setValues([['date_snapshot','revision','origine','version_doctrine','solde_reel','solde_previsionnel_fin_cycle','cb_deja_engagee','p1','reste_pilotable','capital_amortissable','encours_revolving','dettes_hors_credit','patrimoine_net','revenus_cycle','depenses_cycle','pluxee','erreurs','json_compact']]);sh.setFrozenRows(1);}
  const aujourd=Utilities.formatDate(new Date(etat.genereLe),Session.getScriptTimeZone(),'yyyy-MM-dd'),evenement=/import|mutation|cloture|crédit|credit|dette|plan|p0|manuel_force/i.test(String(origine||''));
  if(!evenement&&sh.getLastRow()>1){const dates=sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues().flat();if(dates.includes(aujourd))return;}

  const m=etat.modules||{},t=etat.transversales||{},tc=t.credits||{},tt=t.tresorerie||{},tcer=t.cerbere||{},pat=m.patrimoine||{},dash=m.dashboard||{},comptes=m.comptes||{};
  const pluxee=Number.isFinite(Number(comptes.synthese&&comptes.synthese.pluxee))?Number(comptes.synthese.pluxee):'';
  const compact={transversales:t,cycle:m.cerbereExpress&&m.cerbereExpress.cycle||null,patrimoine:{net:pat.patrimoineNet},dashboard:{courtTerme:dash.courtTerme||null}};
  sh.appendRow([
    aujourd,etat.revisionBudgetSoft,String(origine||''),etat.versionDoctrine||'',Number.isFinite(Number(tt.soldeReel))?Number(tt.soldeReel):'',Number.isFinite(Number(tt.soldePrevisionnel))?Number(tt.soldePrevisionnel):'',
    Number.isFinite(Number(tcer.cbDejaEngagee))?Number(tcer.cbDejaEngagee):'',Number.isFinite(Number(tcer.p1))?Number(tcer.p1):'',Number.isFinite(Number(tcer.restePilotable))?Number(tcer.restePilotable):'',
    Number.isFinite(Number(tc.capitalAmortissable))?Number(tc.capitalAmortissable):'',Number.isFinite(Number(tc.encoursRevolving))?Number(tc.encoursRevolving):'',Number.isFinite(Number(tc.dettesHorsCredit))?Number(tc.dettesHorsCredit):'',
    Number.isFinite(Number(pat.patrimoineNet))?Number(pat.patrimoineNet):'',Number.isFinite(Number(dash.courtTerme&&dash.courtTerme.revenusConstates))?Number(dash.courtTerme.revenusConstates):'',Number.isFinite(Number(dash.courtTerme&&dash.courtTerme.depensesConstatees))?Number(dash.courtTerme.depensesConstatees):'',
    pluxee,(etat.erreurs||[]).length,JSON.stringify(compact)
  ]);
}

function installerActualisationGlobaleBudgetSoft20260906(){
  const nom='actualiserBudgetSoftToutesLes30Minutes20260906';
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===nom).forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(nom).timeBased().everyMinutes(30).create();
  return{ok:true,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,frequenceMinutes:30};
}
function actualiserBudgetSoftToutesLes30Minutes20260906(){return reconstruireSnapshotGlobalBudgetSoft20260906('planifie_30min');}
function actualiserBudgetSoftMaintenant20260906(){return reconstruireSnapshotGlobalBudgetSoft20260906('manuel_force');}
function initialiserArchitectureSnapshotBudgetSoft20260906(){const installation=installerActualisationGlobaleBudgetSoft20260906(),etat=reconstruireSnapshotGlobalBudgetSoft20260906('initialisation');return{ok:!!(installation.ok&&etat.ok),installation,etat};}

function auditerSnapshotGlobalBudgetSoft20260906(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();if(!s.disponible)return s;const e=s.etat,m=e.modules||{};
  return{ok:e.ok,version:e.version,revisionBudgetSoft:e.revisionBudgetSoft,genereLe:e.genereLe,coherence:e.coherence,transversales:e.transversales,erreurs:e.erreurs||[],clesModules:Object.keys(m),
    dashboard:m.dashboard?{versionCorrection:m.dashboard.versionCorrection||'',sourceBudgetSoft:m.dashboard.sourceBudgetSoft||'',soldeBancaire:m.dashboard.courtTerme&&m.dashboard.courtTerme.soldeBancaire,revenusConstates:m.dashboard.courtTerme&&m.dashboard.courtTerme.revenusConstates,depensesConstatees:m.dashboard.courtTerme&&m.dashboard.courtTerme.depensesConstatees}:null,
    credits:m.credits?{capitalCredits:m.credits.capitalCredits,capitalRenouvelable:m.credits.capitalRenouvelable,amortissables:(m.credits.amortissables||[]).length,renouvelables:(m.credits.renouvelables||[]).length}:null,
    tresorerieComptable:m.tresorerieComptable?{soldeReel:m.tresorerieComptable.soldeReel,variationComptableCertaine:m.tresorerieComptable.variationComptableCertaine,soldePrevisionnel:m.tresorerieComptable.soldePrevisionnel,dateCible:m.tresorerieComptable.dateCible,nombreOperationsFutures:m.tresorerieComptable.nombreOperationsFutures}:null,
    projectionEtendue:m.projectionEtendue?{soldeReel:m.projectionEtendue.soldeReel,soldePrevisionnel:m.projectionEtendue.soldePrevisionnel,dateCible:m.projectionEtendue.dateCible}:null,
    cerbereExpress:m.cerbereExpress?{contexte:m.cerbereExpress.contexte,pilotable:m.cerbereExpress.pilotable}:null,
    patrimoine:m.patrimoine?{patrimoineNet:m.patrimoine.patrimoineNet,totalDettes:m.patrimoine.totalDettes}:null};
}
