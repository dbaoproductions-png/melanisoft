const CERBERE_EXPRESS_SNAPSHOT_VERSION='2026-08-27.1';
const CERBERE_EXPRESS_SNAPSHOT_PREFIX='CERBERE_EXPRESS_SNAPSHOT_';
const CERBERE_EXPRESS_SNAPSHOT_CHUNK=7000;

/**
 * Snapshot matérialisé de Cerbère Express.
 *
 * Doctrine de performance :
 * - la vue stockée est EXACTEMENT la sortie de chargerVueCerbereExpress20260827() ;
 * - aucune règle métier n'est recalculée lors d'une lecture rapide ;
 * - la validité dépend d'une empreinte des sources (classeur + propriétés document + jour civil) ;
 * - un snapshot périmé peut être affiché immédiatement puis rafraîchi en arrière-plan ;
 * - aucun cache temporel arbitraire n'est utilisé.
 */
function chargerSnapshotCerbereExpress20260827(){
  const t0=Date.now();
  const props=PropertiesService.getDocumentProperties();
  const meta=lireMetaSnapshotCerbereExpress20260827_(props);
  if(!meta){
    return {ok:true,version:CERBERE_EXPRESS_SNAPSHOT_VERSION,disponible:false,perime:true,dureeLectureMs:Date.now()-t0};
  }

  const vue=lireCorpsSnapshotCerbereExpress20260827_(props,meta);
  if(!vue){
    return {ok:true,version:CERBERE_EXPRESS_SNAPSHOT_VERSION,disponible:false,perime:true,corrompu:true,dureeLectureMs:Date.now()-t0};
  }

  const revisionCourante=empreinteSourcesCerbereExpress20260827_();
  const perime=String(meta.revision||'')!==revisionCourante;
  return {
    ok:true,
    version:CERBERE_EXPRESS_SNAPSHOT_VERSION,
    disponible:true,
    perime,
    revision:String(meta.revision||''),
    revisionCourante,
    genereLe:String(meta.genereLe||''),
    tailleCompressee:Number(meta.tailleCompressee||0),
    morceaux:Number(meta.morceaux||0),
    dureeLectureMs:Date.now()-t0,
    vue
  };
}

/**
 * Recalcule le snapshot depuis le moteur actuel puis le stocke.
 * Le moteur existant reste l'unique autorité : cette fonction ne transforme pas les montants.
 */
function rafraichirSnapshotCerbereExpress20260827(){
  const lock=LockService.getDocumentLock();
  if(!lock.tryLock(1000)){
    const courant=chargerSnapshotCerbereExpress20260827();
    return {ok:!!(courant&&courant.disponible),version:CERBERE_EXPRESS_SNAPSHOT_VERSION,rafraichissementEnCours:true,snapshot:courant};
  }

  const t0=Date.now();
  try{
    const vue=chargerVueCerbereExpress20260827();
    if(!vue||vue.ok===false)throw new Error(String(vue&&vue.erreur||'Cerbère Express indisponible'));

    const revision=empreinteSourcesCerbereExpress20260827_();
    const json=JSON.stringify(vue);
    const compresse=encoderSnapshotCerbereExpress20260827_(json);
    const morceaux=[];
    for(let i=0;i<compresse.length;i+=CERBERE_EXPRESS_SNAPSHOT_CHUNK)morceaux.push(compresse.slice(i,i+CERBERE_EXPRESS_SNAPSHOT_CHUNK));

    const props=PropertiesService.getDocumentProperties();
    supprimerAncienSnapshotCerbereExpress20260827_(props);
    morceaux.forEach((part,i)=>props.setProperty(CERBERE_EXPRESS_SNAPSHOT_PREFIX+'PART_'+i,part));
    const meta={
      version:CERBERE_EXPRESS_SNAPSHOT_VERSION,
      revision,
      genereLe:String(vue.genereLe||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss")),
      morceaux:morceaux.length,
      tailleCompressee:compresse.length
    };
    props.setProperty(CERBERE_EXPRESS_SNAPSHOT_PREFIX+'META',JSON.stringify(meta));

    // Contrôle de round-trip : ce qui sera relu doit être strictement identique à ce qui a été calculé.
    const relu=lireCorpsSnapshotCerbereExpress20260827_(props,meta);
    const roundTripOk=JSON.stringify(relu)===json;
    if(!roundTripOk){
      supprimerAncienSnapshotCerbereExpress20260827_(props);
      throw new Error('Échec du contrôle d’intégrité du snapshot Cerbère Express.');
    }

    return {
      ok:true,
      version:CERBERE_EXPRESS_SNAPSHOT_VERSION,
      revision,
      genereLe:meta.genereLe,
      morceaux:morceaux.length,
      tailleCompressee:compresse.length,
      dureeCalculMs:Date.now()-t0,
      roundTripOk:true,
      vue:relu
    };
  }finally{
    lock.releaseLock();
  }
}

/** Force la suppression du snapshot ; aucune donnée métier n'est touchée. */
function invaliderSnapshotCerbereExpress20260827(){
  const props=PropertiesService.getDocumentProperties();
  supprimerAncienSnapshotCerbereExpress20260827_(props);
  return {ok:true,version:CERBERE_EXPRESS_SNAPSHOT_VERSION};
}

/**
 * Audit court : vérifie l'intégrité du snapshot et mesure sa lecture rapide.
 * Ne recalcule PAS Cerbère complet.
 */
function auditerSnapshotCerbereExpress20260827(){
  const t0=Date.now();
  const s=chargerSnapshotCerbereExpress20260827();
  const out={
    ok:!!(s&&s.disponible&&s.vue&&s.vue.ok),
    version:CERBERE_EXPRESS_SNAPSHOT_VERSION,
    disponible:!!(s&&s.disponible),
    perime:!!(s&&s.perime),
    genereLe:s&&s.genereLe||'',
    dureeLectureMs:Date.now()-t0,
    tailleCompressee:Number(s&&s.tailleCompressee||0),
    morceaux:Number(s&&s.morceaux||0),
    cycle:s&&s.vue&&s.vue.cycle||null,
    pilotable:s&&s.vue&&s.vue.pilotable?{allocation:s.vue.pilotable.allocation,consomme:s.vue.pilotable.consomme,reste:s.vue.pilotable.reste}:null,
    meteo:s&&s.vue&&s.vue.meteo||null
  };
  console.log(JSON.stringify(out));
  return out;
}

function empreinteSourcesCerbereExpress20260827_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const fichier=DriveApp.getFileById(ss.getId());
  const modifieLe=fichier.getLastUpdated().getTime();
  const props=PropertiesService.getDocumentProperties().getProperties();
  const utiles={};
  Object.keys(props).sort().forEach(k=>{
    if(String(k).indexOf(CERBERE_EXPRESS_SNAPSHOT_PREFIX)===0)return;
    utiles[k]=props[k];
  });
  const jour=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const brut=[CERBERE_EXPRESS_SNAPSHOT_VERSION,String(modifieLe),jour,JSON.stringify(utiles)].join('|');
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,brut,Utilities.Charset.UTF_8);
  return digest.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}

function lireMetaSnapshotCerbereExpress20260827_(props){
  const raw=props.getProperty(CERBERE_EXPRESS_SNAPSHOT_PREFIX+'META');
  if(!raw)return null;
  try{
    const m=JSON.parse(raw);
    if(!m||m.version!==CERBERE_EXPRESS_SNAPSHOT_VERSION||!(Number(m.morceaux)>0))return null;
    return m;
  }catch(e){return null;}
}

function lireCorpsSnapshotCerbereExpress20260827_(props,meta){
  try{
    let raw='';
    for(let i=0;i<Number(meta.morceaux||0);i++){
      const part=props.getProperty(CERBERE_EXPRESS_SNAPSHOT_PREFIX+'PART_'+i);
      if(part==null)return null;
      raw+=part;
    }
    const json=decoderSnapshotCerbereExpress20260827_(raw);
    return JSON.parse(json);
  }catch(e){return null;}
}

function encoderSnapshotCerbereExpress20260827_(texte){
  const blob=Utilities.newBlob(String(texte||''),'application/json','cerbere-express.json');
  const gzip=Utilities.gzip(blob);
  return Utilities.base64EncodeWebSafe(gzip.getBytes());
}

function decoderSnapshotCerbereExpress20260827_(texte){
  const bytes=Utilities.base64DecodeWebSafe(String(texte||''));
  const gzip=Utilities.newBlob(bytes,'application/gzip','cerbere-express.json.gz');
  return Utilities.ungzip(gzip).getDataAsString('UTF-8');
}

function supprimerAncienSnapshotCerbereExpress20260827_(props){
  const toutes=props.getProperties();
  Object.keys(toutes).forEach(k=>{
    if(String(k).indexOf(CERBERE_EXPRESS_SNAPSHOT_PREFIX)===0)props.deleteProperty(k);
  });
}
