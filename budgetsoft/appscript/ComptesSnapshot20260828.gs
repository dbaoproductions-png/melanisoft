const COMPTES_SNAPSHOT_20260828_VERSION='2026-08-28.1';
const COMPTES_SNAPSHOT_20260828_PREFIX='COMPTES_SNAPSHOT_20260828_';

/**
 * Snapshot très léger de la vue Comptes.
 * - la donnée stockée est exactement la sortie de construireSyntheseComptes20260828_();
 * - l'ouverture normale ne relit pas Operations si le snapshot est valide ;
 * - l'empreinte dépend du classeur, du jour civil et des seules propriétés Pluxee utiles ;
 * - un snapshot périmé peut être affiché immédiatement puis rafraîchi en arrière-plan.
 */
function chargerSnapshotComptes20260828(){
  const t0=Date.now();
  const props=PropertiesService.getDocumentProperties();
  const raw=props.getProperty(COMPTES_SNAPSHOT_20260828_PREFIX+'DATA');
  const metaRaw=props.getProperty(COMPTES_SNAPSHOT_20260828_PREFIX+'META');
  if(!raw||!metaRaw)return{ok:true,version:COMPTES_SNAPSHOT_20260828_VERSION,disponible:false,perime:true,dureeLectureMs:Date.now()-t0};
  try{
    const meta=JSON.parse(metaRaw),vue=JSON.parse(raw);
    if(!meta||meta.version!==COMPTES_SNAPSHOT_20260828_VERSION||!vue||vue.ok!==true)throw new Error('snapshot invalide');
    const revisionCourante=empreinteSourcesComptes20260828_();
    return{
      ok:true,version:COMPTES_SNAPSHOT_20260828_VERSION,disponible:true,
      perime:String(meta.revision||'')!==revisionCourante,
      revision:String(meta.revision||''),revisionCourante,
      genereLe:String(meta.genereLe||''),dureeLectureMs:Date.now()-t0,vue:vue
    };
  }catch(e){
    return{ok:true,version:COMPTES_SNAPSHOT_20260828_VERSION,disponible:false,perime:true,corrompu:true,dureeLectureMs:Date.now()-t0};
  }
}

function rafraichirSnapshotComptes20260828(){
  const lock=LockService.getDocumentLock();
  if(!lock.tryLock(1000))return{ok:false,version:COMPTES_SNAPSHOT_20260828_VERSION,rafraichissementEnCours:true};
  const t0=Date.now();
  try{
    const vue=construireSyntheseComptes20260828_();
    if(!vue||vue.ok!==true)throw new Error('Synthèse Comptes indisponible.');
    const meta={
      version:COMPTES_SNAPSHOT_20260828_VERSION,
      revision:empreinteSourcesComptes20260828_(),
      genereLe:Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss")
    };
    const props=PropertiesService.getDocumentProperties();
    props.setProperty(COMPTES_SNAPSHOT_20260828_PREFIX+'DATA',JSON.stringify(vue));
    props.setProperty(COMPTES_SNAPSHOT_20260828_PREFIX+'META',JSON.stringify(meta));
    const relu=JSON.parse(props.getProperty(COMPTES_SNAPSHOT_20260828_PREFIX+'DATA')||'null');
    if(JSON.stringify(relu)!==JSON.stringify(vue))throw new Error('Échec du contrôle du snapshot Comptes.');
    return{ok:true,version:COMPTES_SNAPSHOT_20260828_VERSION,dureeCalculMs:Date.now()-t0,genereLe:meta.genereLe,vue:relu};
  }finally{lock.releaseLock();}
}

function invaliderSnapshotComptes20260828(){
  const props=PropertiesService.getDocumentProperties();
  props.deleteProperty(COMPTES_SNAPSHOT_20260828_PREFIX+'DATA');
  props.deleteProperty(COMPTES_SNAPSHOT_20260828_PREFIX+'META');
  return{ok:true,version:COMPTES_SNAPSHOT_20260828_VERSION};
}

function auditerSnapshotComptes20260828(){
  const s=chargerSnapshotComptes20260828();
  const out={
    ok:!!(s&&s.disponible&&s.vue&&s.vue.ok),version:COMPTES_SNAPSHOT_20260828_VERSION,
    disponible:!!(s&&s.disponible),perime:!!(s&&s.perime),genereLe:s&&s.genereLe||'',
    dureeLectureMs:Number(s&&s.dureeLectureMs||0),
    synthese:s&&s.vue&&s.vue.synthese||null,comptes:s&&s.vue&&s.vue.comptes?s.vue.comptes.length:0
  };
  console.log(JSON.stringify(out));return out;
}

function empreinteSourcesComptes20260828_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const modifieLe=DriveApp.getFileById(ss.getId()).getLastUpdated().getTime();
  const props=PropertiesService.getDocumentProperties();
  const pluxeeInitial=props.getProperty('PLUXEE_SOLDE_INITIAL')||'';
  const pluxeeDate=props.getProperty('PLUXEE_DATE_REFERENCE')||'';
  const jour=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const brut=[COMPTES_SNAPSHOT_20260828_VERSION,String(modifieLe),jour,pluxeeInitial,pluxeeDate].join('|');
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,brut,Utilities.Charset.UTF_8);
  return digest.map(function(b){return('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
}
