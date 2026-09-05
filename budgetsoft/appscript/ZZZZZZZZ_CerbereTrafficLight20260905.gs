/*
 * Cerbère / Cerbère Express — doctrine feu tricolore 2026-09-05.
 * Vert : consommation <= avancement du cycle.
 * Orange : consommation > avancement du cycle, sans dépassement de l'allocation.
 * Rouge : allocation dépassée.
 * L'appréciation générale devient factuelle et dérivée des mêmes règles.
 */
const CERBERE_TRAFFIC_LIGHT_VERSION='2026-09-05.2';

function vigilanceExpress_(partConsommee,partTemps,reste,allocation,jour){
  const pc=Math.max(0,Number(partConsommee||0));
  const pt=Math.max(0,Math.min(1,Number(partTemps||0)));
  const alloc=Math.max(0,Number(allocation||0));
  const ecart=(pc-pt)*100;
  let niveau='vert',libelle='Rythme conforme';
  if(Number(reste||0)<-.009||pc>1.0001||(alloc<=0&&pc>0)){
    niveau='rouge';libelle='Enveloppe dépassée';
  }else if(pc>pt+.0001){
    niveau='orange';libelle='Avance sur le rythme du cycle';
  }else if(alloc<=0&&pc<=0){
    libelle='Aucune dépense';
  }
  return {niveau,libelle,ecartRythmePoints:arrExpress_(ecart),partTempsPct:arrExpress_(pt*100),message:messageVigilanceExpress_(niveau,libelle,pc,pt,reste)};
}

function appreciationCockpitCerbere20260902_(base){
  const p=base&&Array.isArray(base.periodes)?base.periodes[0]:null;
  const env=p&&Array.isArray(p.enveloppes)?p.enveloppes:[];
  const per=p&&p.periode||{};
  const debut=per.debut?new Date(per.debut):null,fin=per.fin?new Date(per.fin):null,maintenant=new Date();
  let progression=0;
  if(debut&&!isNaN(debut)&&fin&&!isNaN(fin)){
    const a=Date.UTC(debut.getFullYear(),debut.getMonth(),debut.getDate());
    const z=Date.UTC(fin.getFullYear(),fin.getMonth(),fin.getDate());
    const n=Date.UTC(maintenant.getFullYear(),maintenant.getMonth(),maintenant.getDate());
    const jours=Math.max(1,Math.round((z-a)/86400000)+1);
    const jour=Math.max(1,Math.min(jours,Math.floor((n-a)/86400000)+1));
    progression=jour/jours;
  }
  let rouges=0,oranges=0,plusRapide='';let ecartMax=-Infinity;
  env.forEach(x=>{
    const allocation=Math.max(0,Number(x&&x.prevu||0));
    const consomme=Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0)));
    const part=allocation>0?consomme/allocation:(consomme>0?Infinity:0);
    if(part>1.0001){rouges++;return;}
    const ecart=part-progression;
    if(ecart>.0001){oranges++;if(ecart>ecartMax){ecartMax=ecart;plusRapide=String(x&&x.categorie||'');}}
  });
  if(rouges>0)return{niveau:'rouge',emoji:'🔴',titre:'Enveloppe dépassée',resume:rouges+' poste'+(rouges>1?'s ont':' a')+' dépassé l’allocation prévue.',consigne:'Réduire ou réallouer le budget sur les postes dépassés.'};
  if(oranges>0)return{niveau:'orange',emoji:'🟠',titre:'Rythme supérieur au cycle',resume:oranges+' poste'+(oranges>1?'s sont':' est')+' consommé'+(oranges>1?'s':'')+' plus vite que l’avancement du cycle.',consigne:plusRapide?plusRapide+' est le poste le plus en avance sur son rythme.':'Surveiller les postes en avance sur le rythme du cycle.'};
  return{niveau:'vert',emoji:'🟢',titre:'Rythme conforme',resume:'Aucun poste ne dépasse son allocation ni l’avancement du cycle.',consigne:'Le pilotable suit le rythme prévu du cycle.'};
}

/* La révision du snapshot dépend aussi du code Express : un déploiement ne peut
 * plus laisser BudgetSoft croire qu'un ancien snapshot est encore frais. */
function empreinteSourcesCerbereExpress20260827_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(),fichier=DriveApp.getFileById(ss.getId()),modifieLe=fichier.getLastUpdated().getTime(),props=PropertiesService.getDocumentProperties().getProperties(),utiles={};
  Object.keys(props).sort().forEach(k=>{if(String(k).indexOf(CERBERE_EXPRESS_SNAPSHOT_PREFIX)===0)return;utiles[k]=props[k];});
  const jour=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const code=[CERBERE_TRAFFIC_LIGHT_VERSION,typeof CERBERE_EXPRESS_VIEW_VERSION==='undefined'?'':CERBERE_EXPRESS_VIEW_VERSION,typeof CERBERE_EXPRESS_VERSION==='undefined'?'':CERBERE_EXPRESS_VERSION].join('|');
  const brut=[CERBERE_EXPRESS_SNAPSHOT_VERSION,String(modifieLe),jour,code,JSON.stringify(utiles)].join('|');
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,brut,Utilities.Charset.UTF_8);
  return digest.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}
