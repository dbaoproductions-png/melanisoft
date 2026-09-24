/*
 * BudgetSoft — audit de contention / lecture du snapshot global — 2026-09-24.
 * LECTURE SEULE : aucune reconstruction, aucune invalidation, aucune écriture de données.
 */
const BUDGETSOFT_SNAPSHOT_CONTENTION_AUDIT_20260924_VERSION='2026-09-24.1';

function auditerContentionSnapshotBudgetSoft20260924(){
  const t0=Date.now(),out={
    ok:true,
    lectureSeule:true,
    version:BUDGETSOFT_SNAPSHOT_CONTENTION_AUDIT_20260924_VERSION,
    verrou:{},
    stockage:{},
    chargeurPublic:{},
    triggers:[]
  };

  // 1. Le verrou de reconstruction est-il détenu maintenant ?
  const lock=LockService.getDocumentLock();
  const tl=Date.now();
  let acquis=false;
  try{
    acquis=lock.tryLock(50);
    out.verrou={libre:acquis,attenteMs:Date.now()-tl,interpretation:acquis?'aucune reconstruction ne détient le DocumentLock au moment du test':'DocumentLock occupé : reconstruction/écriture concurrente probable'};
  }catch(e){
    out.verrou={libre:null,attenteMs:Date.now()-tl,erreur:String(e&&e.message||e)};
  }finally{
    if(acquis){try{lock.releaseLock();}catch(e){}}
  }

  // 2. Lecture brute et chronométrée des DocumentProperties du snapshot.
  const props=PropertiesService.getDocumentProperties();
  const prefix=typeof BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX!=='undefined'?BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX:'BUDGETSOFT_GLOBAL_SNAPSHOT_';
  let metaRaw='',countRaw='',meta=null,count=0;
  try{
    let t=Date.now();metaRaw=props.getProperty(prefix+'META')||'';out.stockage.metaMs=Date.now()-t;
    t=Date.now();countRaw=props.getProperty(prefix+'COUNT')||'';out.stockage.countMs=Date.now()-t;
    try{meta=metaRaw?JSON.parse(metaRaw):null;}catch(e){out.stockage.metaJsonErreur=String(e&&e.message||e);}
    count=Math.max(Number(countRaw||0),Number(meta&&meta.morceaux||0));
    out.stockage.meta=meta;
    out.stockage.count=count;
    out.stockage.metaPresente=!!metaRaw;
  }catch(e){
    out.ok=false;
    out.stockage.erreurLectureEntete=String(e&&e.message||e);
  }

  const parts=[],bruts=[];let totalChars=0,lecturePartsMs=0,complet=true;
  if(count>0){
    for(let i=0;i<count;i++){
      const t=Date.now();let p=null,err='';
      try{p=props.getProperty(prefix+'PART_'+i);}catch(e){err=String(e&&e.message||e);}
      const ms=Date.now()-t;lecturePartsMs+=ms;
      if(p==null){complet=false;}else{totalChars+=p.length;bruts.push(p);}
      parts.push({index:i,ms:ms,present:p!=null,taille:p?p.length:0,erreur:err});
      if(err){out.ok=false;complet=false;}
    }
  }
  out.stockage.lecturePartsMs=lecturePartsMs;
  out.stockage.totalChars=totalChars;
  out.stockage.complet=complet&&count>0&&bruts.length===count;
  out.stockage.partPlusLente=parts.length?parts.slice().sort(function(a,b){return b.ms-a.ms;})[0]:null;
  out.stockage.partsLentes=parts.filter(function(x){return x.ms>=100;}).sort(function(a,b){return b.ms-a.ms;}).slice(0,20);

  // 3. Décompression / JSON : permet de distinguer coût stockage et coût décodage.
  if(out.stockage.complet){
    try{
      const zip=bruts.join('');
      const td=Date.now();
      const json=typeof decoderEtatGlobalBudgetSoft20260906_==='function'
        ?decoderEtatGlobalBudgetSoft20260906_(zip)
        :Utilities.ungzip(Utilities.newBlob(Utilities.base64DecodeWebSafe(zip),'application/gzip')).getDataAsString('UTF-8');
      out.stockage.decodeMs=Date.now()-td;
      out.stockage.tailleJson=json.length;
      const tj=Date.now(),etat=JSON.parse(json);out.stockage.parseJsonMs=Date.now()-tj;
      out.stockage.revisionDecodee=String(etat&&etat.revisionBudgetSoft||'');
      out.stockage.genereLe=String(etat&&etat.genereLe||'');
      out.stockage.publie=!!(etat&&etat.publie);
      out.stockage.modules=etat&&etat.modules?Object.keys(etat.modules):[];
    }catch(e){
      out.ok=false;
      out.stockage.erreurDecode=String(e&&e.message||e);
    }
  }

  // 4. Chargeur public exact utilisé par les consommateurs, s'il est présent.
  if(typeof chargerSnapshotGlobalBudgetSoft20260906==='function'){
    const tc=Date.now();
    try{
      const s=chargerSnapshotGlobalBudgetSoft20260906();
      out.chargeurPublic={
        ok:!!(s&&s.ok!==false),
        ms:Date.now()-tc,
        disponible:!!(s&&s.disponible),
        corrompu:!!(s&&s.corrompu),
        revisionBudgetSoft:String(s&&s.revisionBudgetSoft||s&&s.etat&&s.etat.revisionBudgetSoft||''),
        genereLe:String(s&&s.genereLe||s&&s.etat&&s.etat.genereLe||'')
      };
    }catch(e){
      out.ok=false;
      out.chargeurPublic={ok:false,ms:Date.now()-tc,erreur:String(e&&e.message||e)};
    }
  }else out.chargeurPublic={ok:false,absent:true};

  // 5. Déclencheurs susceptibles de reconstruire automatiquement.
  try{
    out.triggers=ScriptApp.getProjectTriggers().map(function(t){
      return{handler:String(t.getHandlerFunction&&t.getHandlerFunction()||''),source:String(t.getTriggerSource&&t.getTriggerSource()||''),id:String(t.getUniqueId&&t.getUniqueId()||'')};
    }).filter(function(x){return /budgetsoft|snapshot|actualiser/i.test(x.handler);});
  }catch(e){out.triggersErreur=String(e&&e.message||e);}

  out.dureeMs=Date.now()-t0;
  out.diagnostic={
    reconstructionProbable:out.verrou.libre===false,
    lectureStockageLente:Number(out.stockage.lecturePartsMs||0)>=1000||!!out.stockage.erreurLectureEntete||!!out.stockage.partsLentes&&out.stockage.partsLentes.length>0,
    decodeLent:Number(out.stockage.decodeMs||0)>=1000,
    snapshotIndisponible:out.chargeurPublic&&out.chargeurPublic.disponible===false,
    snapshotIncomplet:out.stockage.complet===false
  };
  console.log('[AUDIT CONTENTION SNAPSHOT BUDGETSOFT 20260924] '+JSON.stringify(out));
  return out;
}
