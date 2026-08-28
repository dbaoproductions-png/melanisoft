const OPERATIONS_SNAPSHOT_20260828_VERSION='2026-08-28.1';
const OPERATIONS_SNAPSHOT_20260828_PREFIX='OPERATIONS_SNAPSHOT_20260828_';
const OPERATIONS_SNAPSHOT_20260828_CHUNK=7800;
const OPERATIONS_SNAPSHOT_20260828_RECENTES=180;

function compacteOperationSnapshot20260828_(o){
  return{
    id:String(o.id||''),
    date:o.date||'',
    libelle:String(o.libelle||''),
    categorie:String(o.categorie||''),
    compte:String(o.compte||''),
    montant:Number(o.montant||0),
    type:String(o.type||''),
    commentaire:String(o.commentaire||''),
    source_bancaire:String(o.source_bancaire||''),
    date_comptable:o.date_comptable||'',
    date_achat:o.date_achat||'',
    libelle_bancaire:String(o.libelle_bancaire||''),
    marchand_normalise:String(o.marchand_normalise||''),
    statut_bancaire:String(o.statut_bancaire||''),
    charge_fixe_id:String(o.charge_fixe_id||'')
  };
}

function serialisableSnapshot20260828_(v){
  if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');
  if(Array.isArray(v))return v.map(serialisableSnapshot20260828_);
  if(v&&typeof v==='object'){
    const r={};Object.keys(v).forEach(k=>r[k]=serialisableSnapshot20260828_(v[k]));return r;
  }
  return v;
}

function construireSnapshotOperations20260828_(operations,comptes,categories){
  const ops=(operations||[]).slice().sort((a,b)=>{
    const da=new Date(a.date_comptable||a.date||0),db=new Date(b.date_comptable||b.date||0);
    return db-da;
  });
  let revenus=0,depenses=0,sansCategorie=0;
  ops.forEach(o=>{
    const m=Number(o.montant||0);
    if(m>0)revenus+=m;else if(m<0)depenses+=Math.abs(m);
    if(!String(o.categorie||'').trim())sansCategorie++;
  });
  return serialisableSnapshot20260828_({
    ok:true,
    version:OPERATIONS_SNAPSHOT_20260828_VERSION,
    genereLe:Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss"),
    totalOperations:ops.length,
    resume:{revenus,depenses,solde:revenus-depenses,sansCategorie},
    Operations:ops.slice(0,OPERATIONS_SNAPSHOT_20260828_RECENTES).map(compacteOperationSnapshot20260828_),
    Comptes:(comptes||[]),
    Categories:(categories||[]),
    meta:{version:'0.8-lab',source:'operations_snapshot'}
  });
}

function ecrireSnapshotOperations20260828_(snapshot){
  const props=PropertiesService.getDocumentProperties();
  const json=JSON.stringify(snapshot||{});
  const chunks=[];
  for(let i=0;i<json.length;i+=OPERATIONS_SNAPSHOT_20260828_CHUNK)chunks.push(json.slice(i,i+OPERATIONS_SNAPSHOT_20260828_CHUNK));
  const ancien=Number(props.getProperty(OPERATIONS_SNAPSHOT_20260828_PREFIX+'COUNT')||0);
  props.setProperty(OPERATIONS_SNAPSHOT_20260828_PREFIX+'COUNT',String(chunks.length));
  chunks.forEach((c,i)=>props.setProperty(OPERATIONS_SNAPSHOT_20260828_PREFIX+'DATA_'+i,c));
  for(let i=chunks.length;i<ancien;i++)props.deleteProperty(OPERATIONS_SNAPSHOT_20260828_PREFIX+'DATA_'+i);
  return chunks.length;
}

function chargerSnapshotOperations20260828(){
  const t0=Date.now();
  const props=PropertiesService.getDocumentProperties();
  const n=Number(props.getProperty(OPERATIONS_SNAPSHOT_20260828_PREFIX+'COUNT')||0);
  if(!n)return{ok:true,version:OPERATIONS_SNAPSHOT_20260828_VERSION,disponible:false,dureeLectureMs:Date.now()-t0};
  try{
    let json='';for(let i=0;i<n;i++){const c=props.getProperty(OPERATIONS_SNAPSHOT_20260828_PREFIX+'DATA_'+i);if(c==null)throw new Error('snapshot incomplet');json+=c;}
    const s=JSON.parse(json);
    if(!s||s.version!==OPERATIONS_SNAPSHOT_20260828_VERSION)throw new Error('version snapshot incompatible');
    return Object.assign({disponible:true,dureeLectureMs:Date.now()-t0},s);
  }catch(e){
    return{ok:true,version:OPERATIONS_SNAPSHOT_20260828_VERSION,disponible:false,corrompu:true,dureeLectureMs:Date.now()-t0};
  }
}

function memoriserSnapshotOperations20260828(operations,comptes,categories){
  const t0=Date.now();
  const snapshot=construireSnapshotOperations20260828_(operations,comptes,categories);
  const chunks=ecrireSnapshotOperations20260828_(snapshot);
  return{ok:true,version:OPERATIONS_SNAPSHOT_20260828_VERSION,chunks,dureeMs:Date.now()-t0,totalOperations:snapshot.totalOperations,genereLe:snapshot.genereLe};
}

function rafraichirSnapshotOperations20260828(){
  verifierInitialisation_();
  return memoriserSnapshotOperations20260828(lireTable_('Operations'),lireTable_('Comptes'),lireTable_('Categories'));
}

function invaliderSnapshotOperations20260828(){
  const props=PropertiesService.getDocumentProperties();
  const n=Number(props.getProperty(OPERATIONS_SNAPSHOT_20260828_PREFIX+'COUNT')||0);
  props.deleteProperty(OPERATIONS_SNAPSHOT_20260828_PREFIX+'COUNT');
  for(let i=0;i<n;i++)props.deleteProperty(OPERATIONS_SNAPSHOT_20260828_PREFIX+'DATA_'+i);
  return{ok:true,version:OPERATIONS_SNAPSHOT_20260828_VERSION};
}

function auditerSnapshotOperations20260828(){
  const s=chargerSnapshotOperations20260828();
  const r={ok:!!s.disponible,version:OPERATIONS_SNAPSHOT_20260828_VERSION,disponible:!!s.disponible,dureeLectureMs:Number(s.dureeLectureMs||0),genereLe:s.genereLe||'',totalOperations:Number(s.totalOperations||0),operationsEmbarquees:Array.isArray(s.Operations)?s.Operations.length:0};
  console.log(JSON.stringify(r));return r;
}
