const BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION='2026-09-06.1';
const BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX='BUDGETSOFT_GLOBAL_SNAPSHOT_';
const BUDGETSOFT_GLOBAL_SNAPSHOT_CHUNK=7000;
const BUDGETSOFT_HISTORY_SHEET='BudgetSoft_History';

/**
 * Etat global atomique BudgetSoft.
 * Objectif : une seule révision cohérente consommable par toutes les vues.
 * Les modules conservent leurs moteurs métier ; l'orchestrateur ne réimplémente
 * aucune formule transversale. Il ne fait que collecter les sorties canoniques
 * au sein d'un même contexte de lecture.
 */
function reconstruireSnapshotGlobalBudgetSoft20260906(origine){
  verifierInitialisation_();
  const lock=LockService.getDocumentLock();
  if(!lock.tryLock(3000))return{ok:false,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,enCours:true,message:'Une reconstruction BudgetSoft est déjà en cours.'};
  const t0=Date.now();
  try{
    const construire=function(){
      const genereLe=new Date().toISOString();
      const modules={};
      const erreurs=[];
      function prendre(nom,fn){
        try{const v=typeof fn==='function'?fn():null;modules[nom]=v;return v;}
        catch(e){erreurs.push({module:nom,erreur:String(e&&e.message||e)});modules[nom]={ok:false,erreur:String(e&&e.message||e)};return modules[nom];}
      }

      // Sources maîtres lues une seule fois grâce au contexte de lecture partagé.
      const sources=prendre('sources',()=>chargerToutesLesDonnees());
      const comptes=prendre('comptes',()=>typeof chargerSyntheseComptes20260828==='function'?chargerSyntheseComptes20260828():null);
      const credits=prendre('credits',()=>typeof chargerCreditsEtDettesV2==='function'?chargerCreditsEtDettesV2():null);
      const dashboard=prendre('dashboard',()=>typeof chargerDashboardReel==='function'?chargerDashboardReel():null);
      const patrimoine=prendre('patrimoine',()=>typeof chargerPatrimoine==='function'?chargerPatrimoine():null);
      const tresorerie=prendre('tresorerieFinCycle',()=>typeof chargerTresorerieFinCycle20260830==='function'?chargerTresorerieFinCycle20260830():null);
      const cerbere=prendre('cerbere',()=>typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null);
      const cerbereExpress=prendre('cerbereExpress',()=>typeof chargerVueCerbereExpressSansContexte20260827_==='function'?chargerVueCerbereExpressSansContexte20260827_():null);

      const revision=empreinteRevisionGlobaleBudgetSoft20260906_(genereLe,modules);
      return serialiserEtatGlobalBudgetSoft20260906_({
        ok:erreurs.length===0,
        version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,
        versionDoctrine:'2026-09-06',
        revisionBudgetSoft:revision,
        genereLe,
        origine:String(origine||'manuel'),
        erreurs,
        modules,
        performance:{dureeMs:Date.now()-t0}
      });
    };

    const etat=typeof avecContexteLectureBudgetSoft20260827_==='function'
      ?avecContexteLectureBudgetSoft20260827_('budgetsoft-global-snapshot',construire)
      :construire();

    if(!etat||!etat.revisionBudgetSoft)throw new Error('Etat global BudgetSoft invalide.');
    ecrireSnapshotGlobalBudgetSoft20260906_(etat);
    archiverEtatBudgetSoftSiNecessaire20260906_(etat,String(origine||'manuel'));
    return Object.assign({},etat,{performance:Object.assign({},etat.performance||{},{dureeTotaleMs:Date.now()-t0})});
  }finally{lock.releaseLock();}
}

function chargerSnapshotGlobalBudgetSoft20260906(){
  const props=PropertiesService.getDocumentProperties();
  const rawMeta=props.getProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'META');
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
    tresorerie:modules&&modules.tresorerieFinCycle&&modules.tresorerieFinCycle.version||'',cerbere:modules&&modules.cerbere&&modules.cerbere.version||'',
    cerbereExpress:modules&&modules.cerbereExpress&&modules.cerbereExpress.version||''
  }});
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,brut,Utilities.Charset.UTF_8);
  return digest.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('').slice(0,20);
}

function serialiserEtatGlobalBudgetSoft20260906_(v){if(v instanceof Date)return v.toISOString();if(Array.isArray(v))return v.map(serialiserEtatGlobalBudgetSoft20260906_);if(v&&typeof v==='object'){const r={};Object.keys(v).forEach(k=>r[k]=serialiserEtatGlobalBudgetSoft20260906_(v[k]));return r;}return v;}
function encoderEtatGlobalBudgetSoft20260906_(texte){return Utilities.base64EncodeWebSafe(Utilities.gzip(Utilities.newBlob(String(texte||''),'application/json','budgetsoft-global.json')).getBytes());}
function decoderEtatGlobalBudgetSoft20260906_(texte){return Utilities.ungzip(Utilities.newBlob(Utilities.base64DecodeWebSafe(String(texte||'')),'application/gzip','budgetsoft-global.json.gz')).getDataAsString('UTF-8');}

/**
 * Historisation analytique compacte : on fige les sorties canoniques de la révision,
 * sans recalculer le passé. Un enregistrement quotidien au maximum, plus les
 * événements explicitement significatifs.
 */
function archiverEtatBudgetSoftSiNecessaire20260906_(etat,origine){
  if(!etat||!etat.revisionBudgetSoft)return;
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName(BUDGETSOFT_HISTORY_SHEET);
  if(!sh){sh=ss.insertSheet(BUDGETSOFT_HISTORY_SHEET);sh.getRange(1,1,1,18).setValues([['date_snapshot','revision','origine','version_doctrine','solde_reel','solde_previsionnel_fin_cycle','cb_deja_engagee','p1','reste_pilotable','capital_amortissable','encours_revolving','dettes_hors_credit','patrimoine_net','revenus_cycle','depenses_cycle','pluxee','erreurs','json_compact']]);sh.setFrozenRows(1);}
  const aujourd=Utilities.formatDate(new Date(etat.genereLe),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const evenement=/import|mutation|cloture|crédit|credit|dette|plan|p0|manuel_force/i.test(String(origine||''));
  if(!evenement&&sh.getLastRow()>1){const dates=sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues().flat();if(dates.includes(aujourd))return;}

  const m=etat.modules||{},comptes=m.comptes||{},tres=m.tresorerieFinCycle||{},cerb=m.cerbereExpress||{},cred=m.credits||{},pat=m.patrimoine||{},dash=m.dashboard||{};
  const amort=Array.isArray(cred.amortissables)?cred.amortissables.reduce((s,c)=>s+Math.abs(Number(c.capital_restant||0)),0):null;
  const rev=Number.isFinite(Number(cred.capitalRenouvelable))?Number(cred.capitalRenouvelable):null;
  const soldeReel=Number.isFinite(Number(tres.soldeReel))?Number(tres.soldeReel):(Number.isFinite(Number(comptes.soldeTotal))?Number(comptes.soldeTotal):null);
  const compact={cycle:cerb.cycle||null,contexte:cerb.contexte||null,credits:{capitalRenouvelable:rev,capitalAmortissable:amort},patrimoine:{net:pat.patrimoineNet},dashboard:{courtTerme:dash.courtTerme||null}};
  sh.appendRow([
    aujourd,etat.revisionBudgetSoft,String(origine||''),etat.versionDoctrine||'',soldeReel,
    Number.isFinite(Number(tres.soldePrevisionnel))?Number(tres.soldePrevisionnel):'',
    Number.isFinite(Number(cerb.contexte&&cerb.contexte.cbDejaEngageeM1))?Number(cerb.contexte.cbDejaEngageeM1):'',
    Number.isFinite(Number(cerb.contexte&&cerb.contexte.p1))?Number(cerb.contexte.p1):'',
    Number.isFinite(Number(cerb.pilotable&&cerb.pilotable.reste))?Number(cerb.pilotable.reste):'',
    amort==null?'':Math.round(amort*100)/100,rev==null?'':Math.round(rev*100)/100,
    Number.isFinite(Number(cred.dettesHorsCredit))?Number(cred.dettesHorsCredit):'',
    Number.isFinite(Number(pat.patrimoineNet))?Number(pat.patrimoineNet):'',
    Number.isFinite(Number(dash.courtTerme&&dash.courtTerme.revenusConstates))?Number(dash.courtTerme.revenusConstates):'',
    Number.isFinite(Number(dash.courtTerme&&dash.courtTerme.depensesConstatees))?Number(dash.courtTerme.depensesConstatees):'',
    Number.isFinite(Number(cerb.pluxee&&cerb.pluxee.soldeReel))?Number(cerb.pluxee.soldeReel):'',
    (etat.erreurs||[]).length,JSON.stringify(compact)
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

function auditerSnapshotGlobalBudgetSoft20260906(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  if(!s.disponible)return s;
  const e=s.etat,m=e.modules||{};
  return{ok:e.ok,version:e.version,revisionBudgetSoft:e.revisionBudgetSoft,genereLe:e.genereLe,erreurs:e.erreurs||[],clesModules:Object.keys(m),
    credits:m.credits?{capitalCredits:m.credits.capitalCredits,capitalRenouvelable:m.credits.capitalRenouvelable,amortissables:(m.credits.amortissables||[]).length,renouvelables:(m.credits.renouvelables||[]).length}:null,
    tresorerie:m.tresorerieFinCycle?{soldeReel:m.tresorerieFinCycle.soldeReel,soldePrevisionnel:m.tresorerieFinCycle.soldePrevisionnel,dateCible:m.tresorerieFinCycle.dateCible}:null,
    cerbereExpress:m.cerbereExpress?{contexte:m.cerbereExpress.contexte,pilotable:m.cerbereExpress.pilotable}:null,
    patrimoine:m.patrimoine?{patrimoineNet:m.patrimoine.patrimoineNet,totalDettes:m.patrimoine.totalDettes}:null};
}
