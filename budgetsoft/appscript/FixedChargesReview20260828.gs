const FIXED_CHARGES_REVIEW_20260828_VERSION='2026-08-28.2';
const FIXED_CHARGES_SNAPSHOT_PREFIX_20260828='FIXED_CHARGES_SNAPSHOT_20260828_';
const FIXED_CHARGES_SNAPSHOT_CHUNK_20260828=7800;

function cycle28DepuisDate20260828_(date){
  const d=date instanceof Date?new Date(date):new Date(date);
  if(isNaN(d))return null;
  const y=d.getFullYear(),m=d.getMonth(),j=d.getDate();
  const debut=j>=28?new Date(y,m,28,12):new Date(y,m-1,28,12);
  const fin=new Date(debut.getFullYear(),debut.getMonth()+1,27,23,59,59,999);
  return {debut,fin,cle:Utilities.formatDate(debut,Session.getScriptTimeZone(),'yyyy-MM-dd')};
}

function cyclePrecedent20260828_(cycle){
  const ref=new Date(cycle.debut.getFullYear(),cycle.debut.getMonth()-1,28,12);
  return cycle28DepuisDate20260828_(ref);
}

function equivalentMensuelChargeFixe20260828_(c){
  const m=Math.abs(Number(c.montant||0));
  switch(String(c.frequence||'Mensuelle').toLowerCase()){
    case'quotidienne':return m*30.4375;
    case'hebdomadaire':return m*52/12;
    case'trimestrielle':return m/3;
    case'semestrielle':return m/6;
    case'annuelle':return m/12;
    default:return m;
  }
}

function operationReelleChargeFixe20260828_(o){
  return !/\[RECURRENCE:/.test(String(o.commentaire||''));
}

function dateComptableOperation20260828_(o){
  const d=new Date(o.date_comptable||o.date);
  return isNaN(d)?null:d;
}

function chargeFixeLieeOperation20260828_(o){
  const direct=String(o.charge_fixe_id||'').trim();
  if(direct)return direct;
  const m=String(o.commentaire||'').match(/\[CHARGE_FIXE:([^\]]+)\]/);
  return m?String(m[1]):'';
}

function empreinteChargesFixes20260828_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const fOps=ss.getSheetByName('Operations'),fCf=ss.getSheetByName('Charges_fixes');
  const opRows=fOps?Math.max(0,fOps.getLastRow()-1):0,cfRows=fCf?Math.max(0,fCf.getLastRow()-1):0;
  let derniereOp='';
  if(fOps&&opRows>0){
    const h=TABLES.Operations,cols=['id','date','date_comptable','charge_fixe_id'].map(k=>h.indexOf(k)+1).filter(x=>x>0);
    const row=fOps.getLastRow();
    derniereOp=cols.map(c=>serialiserValeur_(fOps.getRange(row,c).getValue())).join('|');
  }
  return [opRows,cfRows,derniereOp].join('§');
}

function supprimerSnapshotChargesFixes20260828_(){
  const p=PropertiesService.getDocumentProperties();
  const meta=JSON.parse(p.getProperty(FIXED_CHARGES_SNAPSHOT_PREFIX_20260828+'META')||'null');
  if(meta&&meta.chunks){for(let i=0;i<meta.chunks;i++)p.deleteProperty(FIXED_CHARGES_SNAPSHOT_PREFIX_20260828+i);}
  p.deleteProperty(FIXED_CHARGES_SNAPSHOT_PREFIX_20260828+'META');
}

function enregistrerSnapshotChargesFixes20260828_(data,empreinte){
  const p=PropertiesService.getDocumentProperties(),texte=JSON.stringify(data),chunks=[];
  for(let i=0;i<texte.length;i+=FIXED_CHARGES_SNAPSHOT_CHUNK_20260828)chunks.push(texte.slice(i,i+FIXED_CHARGES_SNAPSHOT_CHUNK_20260828));
  supprimerSnapshotChargesFixes20260828_();
  chunks.forEach((c,i)=>p.setProperty(FIXED_CHARGES_SNAPSHOT_PREFIX_20260828+i,c));
  p.setProperty(FIXED_CHARGES_SNAPSHOT_PREFIX_20260828+'META',JSON.stringify({version:FIXED_CHARGES_REVIEW_20260828_VERSION,chunks:chunks.length,empreinte,genereLe:new Date().toISOString()}));
}

function lireSnapshotChargesFixes20260828_(empreinte){
  const p=PropertiesService.getDocumentProperties();
  let meta=null;
  try{meta=JSON.parse(p.getProperty(FIXED_CHARGES_SNAPSHOT_PREFIX_20260828+'META')||'null');}catch(e){return null;}
  if(!meta||meta.version!==FIXED_CHARGES_REVIEW_20260828_VERSION||meta.empreinte!==empreinte||!meta.chunks)return null;
  let texte='';for(let i=0;i<meta.chunks;i++){const c=p.getProperty(FIXED_CHARGES_SNAPSHOT_PREFIX_20260828+i);if(c==null)return null;texte+=c;}
  try{const data=JSON.parse(texte);data._performance=Object.assign({},data._performance||{},{source:'snapshot',lectureSnapshot:true});return data;}catch(e){return null;}
}

function construireChargesFixesReview20260828_(){
  const t0=Date.now();
  verifierInitialisation_();
  const charges=lireTable_('Charges_fixes');
  const comptes=lireTable_('Comptes');
  const categories=lireTable_('Categories');
  const operations=lireTable_('Operations').filter(operationReelleChargeFixe20260828_);
  const dates=operations.map(dateComptableOperation20260828_).filter(Boolean);
  const derniereDate=dates.length?new Date(Math.max.apply(null,dates.map(d=>d.getTime()))):new Date();
  const cycleCourant=cycle28DepuisDate20260828_(derniereDate),cyclePrecedent=cyclePrecedent20260828_(cycleCourant);
  const reelParCharge={};let reelCourant=0,reelPrecedent=0;
  operations.forEach(o=>{
    const id=chargeFixeLieeOperation20260828_(o);if(!id)return;
    const d=dateComptableOperation20260828_(o);if(!d)return;
    const m=Math.abs(Number(o.montant||0));if(!Number.isFinite(m))return;
    if(!reelParCharge[id])reelParCharge[id]={courant:0,precedent:0};
    if(d>=cycleCourant.debut&&d<=cycleCourant.fin){reelParCharge[id].courant+=m;reelCourant+=m;}
    else if(d>=cyclePrecedent.debut&&d<=cyclePrecedent.fin){reelParCharge[id].precedent+=m;reelPrecedent+=m;}
  });
  const actives=charges.filter(c=>convertirBooleen_(c.actif));
  const lignes=charges.map(c=>{
    const r=reelParCharge[String(c.id)]||{},precedent=Number(r.precedent||0),courant=Number(r.courant||0),reference=Math.abs(Number(c.montant||0));
    const tolerance=Math.max(Number(c.tolerance||.5),Math.max(1,reference*.05));
    return Object.assign({},c,{reel_cycle_precedent:precedent?Math.round(precedent*100)/100:null,reel_cycle_courant:courant?Math.round(courant*100)/100:null,ecart_precedent:precedent?Math.round((precedent-reference)*100)/100:null,alerte_precedent:!!precedent&&Math.abs(precedent-reference)>tolerance});
  });
  return {ok:true,version:FIXED_CHARGES_REVIEW_20260828_VERSION,Charges_fixes:lignes,Comptes:comptes,Categories:categories,synthese:{chargesActives:actives.length,montantMensuel:Math.round(actives.reduce((s,c)=>s+equivalentMensuelChargeFixe20260828_(c),0)*100)/100,reelCyclePrecedent:Math.round(reelPrecedent*100)/100,reelCycleCourant:Math.round(reelCourant*100)/100},cycles:{courant:{debut:formatDateLocaleBudgetSoft_(cycleCourant.debut),fin:formatDateLocaleBudgetSoft_(cycleCourant.fin)},precedent:{debut:formatDateLocaleBudgetSoft_(cyclePrecedent.debut),fin:formatDateLocaleBudgetSoft_(cyclePrecedent.fin)},derniereDateBanque:formatDateLocaleBudgetSoft_(derniereDate)},_performance:{serveurMs:Date.now()-t0,source:'complet',charges:charges.length,operations:operations.length}};
}

function chargerChargesFixesReview20260828(){
  const t0=Date.now();
  verifierInitialisation_();
  const empreinte=empreinteChargesFixes20260828_();
  const snapshot=lireSnapshotChargesFixes20260828_(empreinte);
  if(snapshot){snapshot._performance=Object.assign({},snapshot._performance||{},{serveurMs:Date.now()-t0,source:'snapshot'});return snapshot;}
  const data=construireChargesFixesReview20260828_();
  enregistrerSnapshotChargesFixes20260828_(data,empreinte);
  return data;
}

function sauvegarderChargeFixeReview20260828(charge){
  if(!charge||typeof charge!=='object')throw new Error('Charge fixe invalide.');
  const existante=charge.id?lireTable_('Charges_fixes').find(c=>String(c.id)===String(charge.id)):null;
  const fusion=Object.assign({},existante||{},charge);
  ['dernier_rapprochement_id','dernier_rapprochement_date','dernier_montant_reel','statut_rapprochement'].forEach(k=>{if(existante&&charge[k]===undefined)fusion[k]=existante[k];});
  enregistrerLigne('Charges_fixes',fusion);supprimerSnapshotChargesFixes20260828_();
  return chargerChargesFixesReview20260828();
}

function supprimerChargeFixeReview20260828(id){
  const ok=supprimerLigne('Charges_fixes',id);supprimerSnapshotChargesFixes20260828_();
  return Object.assign({supprimee:ok},chargerChargesFixesReview20260828());
}

function chargerPropositionsRapprochementChargesFixes20260828(){
  const t0=Date.now();verifierInitialisation_();
  const charges=lireTable_('Charges_fixes').filter(c=>convertirBooleen_(c.actif));
  const operations=lireTable_('Operations').filter(operationReelleChargeFixe20260828_);
  const dates=operations.map(dateComptableOperation20260828_).filter(Boolean);
  const derniere=dates.length?new Date(Math.max.apply(null,dates.map(d=>d.getTime()))):new Date();
  const courant=cycle28DepuisDate20260828_(derniere),precedent=cyclePrecedent20260828_(courant),debutRecherche=precedent.debut;
  const historique=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  const traites=new Set(historique.filter(r=>String(r.statut)!=='À valider').map(r=>String(r.charge_fixe_id)+'|'+String(r.operation_id))),candidats=[];
  const opsCandidates=operations.filter(o=>{if(chargeFixeLieeOperation20260828_(o))return false;const d=dateComptableOperation20260828_(o);return d&&d>=debutRecherche&&d<=courant.fin;});
  charges.forEach(charge=>opsCandidates.forEach(operation=>{const cle=String(charge.id)+'|'+String(operation.id);if(traites.has(cle))return;const clone=Object.assign({},operation,{date:operation.date_comptable||operation.date});const r=evaluerRapprochementChargeFixe_(charge,clone);if(!r||r.score<55)return;candidats.push(Object.assign({},r,{charge_fixe_id:String(charge.id),operation_id:String(operation.id)}));}));
  const meilleure=new Map();candidats.sort((a,b)=>Number(b.score)-Number(a.score)).forEach(c=>{if(!meilleure.has(c.operation_id))meilleure.set(c.operation_id,c)});
  const propositions=[...meilleure.values()];return {ok:true,propositions,nombre:propositions.length,_performance:{serveurMs:Date.now()-t0,operationsCandidates:opsCandidates.length,comparaisons:charges.length*opsCandidates.length}};
}

function deciderRapprochementChargeFixeRapide20260828(chargeId,operationId,decision){
  verifierInitialisation_();const choix=String(decision||'').toLowerCase();if(!['valider','ignorer'].includes(choix))throw new Error('Décision inconnue.');
  const charges=lireTable_('Charges_fixes'),charge=charges.find(c=>String(c.id)===String(chargeId));if(!charge)throw new Error('Charge fixe introuvable.');
  const fOps=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations'),hOps=TABLES.Operations,idxId=hOps.indexOf('id'),ids=fOps.getRange(2,idxId+1,Math.max(0,fOps.getLastRow()-1),1).getValues().flat();
  const p=ids.findIndex(v=>String(v)===String(operationId));if(p<0)throw new Error('Opération introuvable.');
  const ligne=p+2,valeurs=fOps.getRange(ligne,1,1,hOps.length).getValues()[0],operation=Object.fromEntries(hOps.map((h,i)=>[h,serialiserValeur_(valeurs[i])]));
  if(choix==='valider'){
    const colLien=hOps.indexOf('charge_fixe_id')+1,colStatut=hOps.indexOf('statut_bancaire')+1;if(colLien>0)fOps.getRange(ligne,colLien).setValue(String(chargeId));if(colStatut>0&&String(operation.source_bancaire||'').toLowerCase()!=='manuel')fOps.getRange(ligne,colStatut).setValue('rapprochee_charge_fixe');
    const fCf=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Charges_fixes'),hCf=TABLES.Charges_fixes,idsCf=fCf.getRange(2,hCf.indexOf('id')+1,Math.max(0,fCf.getLastRow()-1),1).getValues().flat(),pc=idsCf.findIndex(v=>String(v)===String(chargeId));
    if(pc>=0){const no=pc+2,d=dateComptableOperation20260828_(operation),m=Math.abs(Number(operation.montant||0));[['dernier_rapprochement_id',operationId],['dernier_rapprochement_date',d?formatDateLocaleBudgetSoft_(d):''],['dernier_montant_reel',m],['statut_rapprochement','Rapprochée']].forEach(([k,v])=>{const c=hCf.indexOf(k)+1;if(c>0)fCf.getRange(no,c).setValue(v)});}
  }
  if(typeof initialiserRapprochementsChargesFixes_==='function'){
    const f=initialiserRapprochementsChargesFixes_(),h=FIXED_CHARGE_MATCH_HEADERS,d=dateComptableOperation20260828_(operation),m=Math.abs(Number(operation.montant||0)),att=Math.abs(Number(charge.montant||0));
    const row={id:Utilities.getUuid(),charge_fixe_id:chargeId,operation_id:operationId,score:'',statut:choix==='valider'?'Validé':'Ignoré',date_operation:d?d.toISOString():'',montant_reel:m,montant_attendu:att,ecart_montant:Math.round(Math.abs(m-att)*100)/100,ecart_jours:'',libelle_operation:String(operation.libelle||''),libelle_charge:String(charge.libelle||''),compte:String(operation.compte||''),decision:choix==='valider'?'Rapproché à l’opération réelle':'Proposition ignorée',cree_le:new Date().toISOString(),modifie_le:new Date().toISOString()};f.getRange(f.getLastRow()+1,1,1,h.length).setValues([h.map(k=>row[k]??'')]);
  }
  if(choix==='valider')supprimerSnapshotChargesFixes20260828_();
  const d=dateComptableOperation20260828_(operation),cycleCourant=cycle28DepuisDate20260828_(new Date()),cycleOp=d?cycle28DepuisDate20260828_(d):null;
  return {ok:true,decision:choix,charge_fixe_id:String(chargeId),operation_id:String(operationId),montant:Math.abs(Number(operation.montant||0)),date:d?d.toISOString():'',cycle:cycleOp?cycleOp.cle:'',cycleCourant:cycleCourant?cycleCourant.cle:''};
}
