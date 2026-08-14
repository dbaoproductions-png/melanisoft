const FIXED_CHARGE_MATCH_SHEET = 'Rapprochements_charges_fixes';
const FIXED_CHARGE_MATCH_HEADERS = ['id','charge_fixe_id','operation_id','score','statut','date_operation','montant_reel','montant_attendu','ecart_montant','ecart_jours','libelle_operation','libelle_charge','compte','decision','cree_le','modifie_le'];

function initialiserRapprochementsChargesFixes_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let feuille=ss.getSheetByName(FIXED_CHARGE_MATCH_SHEET);
  if(!feuille)feuille=ss.insertSheet(FIXED_CHARGE_MATCH_SHEET);
  if(feuille.getLastRow()===0)feuille.getRange(1,1,1,FIXED_CHARGE_MATCH_HEADERS.length).setValues([FIXED_CHARGE_MATCH_HEADERS]);
  const presentes=feuille.getRange(1,1,1,Math.max(1,feuille.getLastColumn())).getValues()[0].map(v=>String(v||'').trim());
  const manquantes=FIXED_CHARGE_MATCH_HEADERS.filter(h=>!presentes.includes(h));
  if(manquantes.length)feuille.getRange(1,presentes.length+1,1,manquantes.length).setValues([manquantes]);
  feuille.setFrozenRows(1);
  feuille.getRange(1,1,1,FIXED_CHARGE_MATCH_HEADERS.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff');
  return feuille;
}

function lireRapprochementsChargesFixes(){
  const feuille=initialiserRapprochementsChargesFixes_();
  if(feuille.getLastRow()<2)return[];
  const valeurs=feuille.getRange(2,1,feuille.getLastRow()-1,FIXED_CHARGE_MATCH_HEADERS.length).getValues();
  return valeurs.filter(l=>l.some(v=>v!==''&&v!==null)).map(l=>Object.fromEntries(FIXED_CHARGE_MATCH_HEADERS.map((h,i)=>[h,l[i] instanceof Date?l[i].toISOString():l[i]])));
}

function analyserRapprochementsChargesFixes(){
  verifierInitialisation_();
  initialiserRapprochementsChargesFixes_();
  const charges=lireTable_('Charges_fixes').filter(c=>convertirBooleen_(c.actif));
  const operations=lireTable_('Operations').filter(o=>!/[RECURRENCE:/.test(String(o.commentaire||'')));
  const existants=lireRapprochementsChargesFixes();
  const dejaTraites=new Set(existants.filter(r=>String(r.statut)!=='À valider').map(r=>String(r.charge_fixe_id)+'|'+String(r.operation_id)));
  const candidats=[];

  charges.forEach(charge=>{
    operations.forEach(operation=>{
      const cle=String(charge.id)+'|'+String(operation.id);
      if(dejaTraites.has(cle))return;
      const resultat=evaluerRapprochementChargeFixe_(charge,operation);
      if(!resultat||resultat.score<55)return;
      candidats.push(Object.assign({},resultat,{id:Utilities.getUuid(),charge_fixe_id:charge.id,operation_id:operation.id,statut:'À valider',decision:'',cree_le:new Date().toISOString(),modifie_le:new Date().toISOString()}));
    });
  });

  const meilleureParOperation=new Map();
  candidats.sort((a,b)=>Number(b.score)-Number(a.score)).forEach(c=>{
    if(!meilleureParOperation.has(String(c.operation_id)))meilleureParOperation.set(String(c.operation_id),c);
  });
  const retenus=[...meilleureParOperation.values()];
  const feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FIXED_CHARGE_MATCH_SHEET);
  const enAttenteExistants=existants.filter(r=>String(r.statut)==='À valider');
  if(enAttenteExistants.length){
    for(let i=feuille.getLastRow();i>=2;i--){
      const statut=String(feuille.getRange(i,FIXED_CHARGE_MATCH_HEADERS.indexOf('statut')+1).getValue());
      if(statut==='À valider')feuille.deleteRow(i);
    }
  }
  if(retenus.length){
    feuille.getRange(feuille.getLastRow()+1,1,retenus.length,FIXED_CHARGE_MATCH_HEADERS.length).setValues(retenus.map(r=>FIXED_CHARGE_MATCH_HEADERS.map(h=>r[h]??'')));
  }
  return lireRapprochementsChargesFixes();
}

function evaluerRapprochementChargeFixe_(charge,operation){
  if(String(operation.type||'').toLowerCase()!=='depense')return null;
  if(String(charge.compte||'')&&String(operation.compte||'')!==String(charge.compte))return null;
  const opDate=new Date(operation.date),debut=charge.date_debut?new Date(charge.date_debut):null,fin=charge.date_fin?new Date(charge.date_fin):null;
  if(isNaN(opDate))return null;
  if(debut&&!isNaN(debut)&&opDate<debut)return null;
  if(fin&&!isNaN(fin)&&opDate>fin)return null;

  const montantReel=Math.abs(Number(operation.montant||0)),montantAttendu=Math.abs(Number(charge.montant||0));
  if(!Number.isFinite(montantReel)||montantReel<=0)return null;
  const tolerance=Math.max(Number(charge.tolerance||0.5),Math.max(1,montantAttendu*0.05));
  const ecartMontant=Math.abs(montantReel-montantAttendu);
  const jourAttendu=Math.max(1,Math.min(31,Number(charge.jour_execution)||opDate.getDate()));
  const ecartJours=Math.abs(opDate.getDate()-jourAttendu);
  const libelleOp=String(operation.libelle||'');
  const brut=typeof brutAudit_==='function'?brutAudit_(operation):[operation.libelle,operation.commentaire].filter(Boolean).join(' ');
  const motifCharge=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(charge.libelle_bancaire||charge.libelle):normaliserTexteChargeFixe_(charge.libelle_bancaire||charge.libelle);
  const motifOperation=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(brut):normaliserTexteChargeFixe_(brut);
  const texteCharge=normaliserTexteChargeFixe_([charge.libelle,charge.libelle_bancaire].join(' '));
  const texteOperation=normaliserTexteChargeFixe_(brut);
  let scoreLibelle=0;
  if(motifCharge&&motifOperation&&motifCharge===motifOperation)scoreLibelle=60;
  else if(motifCharge&&texteOperation.includes(motifCharge))scoreLibelle=50;
  else if(texteCharge&&texteOperation&&(texteOperation.includes(texteCharge)||texteCharge.includes(texteOperation)))scoreLibelle=40;
  else scoreLibelle=similariteMotsChargeFixe_(texteCharge,texteOperation)*40;
  const scoreMontant=ecartMontant<=tolerance?25:Math.max(0,25-(ecartMontant/Math.max(1,montantAttendu))*100);
  const scoreDate=ecartJours<=3?15:ecartJours<=7?10:ecartJours<=12?5:0;
  const score=Math.round(Math.min(100,scoreLibelle+scoreMontant+scoreDate));
  return {score,date_operation:opDate.toISOString(),montant_reel:montantReel,montant_attendu:montantAttendu,ecart_montant:Math.round(ecartMontant*100)/100,ecart_jours:ecartJours,libelle_operation:libelleOp,libelle_charge:String(charge.libelle||''),compte:String(operation.compte||'')};
}

function normaliserTexteChargeFixe_(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function similariteMotsChargeFixe_(a,b){const A=new Set(String(a||'').split(' ').filter(x=>x.length>2)),B=new Set(String(b||'').split(' ').filter(x=>x.length>2));if(!A.size||!B.size)return 0;let commun=0;A.forEach(x=>{if(B.has(x))commun++;});return commun/Math.max(A.size,B.size);}

function deciderRapprochementChargeFixe(id,decision){
  verifierInitialisation_();
  const choix=String(decision||'').toLowerCase();
  if(!['valider','ignorer'].includes(choix))throw new Error('Décision inconnue.');
  const feuille=initialiserRapprochementsChargesFixes_();
  const indexId=FIXED_CHARGE_MATCH_HEADERS.indexOf('id'),ids=feuille.getLastRow()>1?feuille.getRange(2,indexId+1,feuille.getLastRow()-1,1).getValues().flat():[];
  const pos=ids.findIndex(v=>String(v)===String(id));if(pos<0)throw new Error('Rapprochement introuvable.');
  const no=pos+2,valeurs=feuille.getRange(no,1,1,FIXED_CHARGE_MATCH_HEADERS.length).getValues()[0],objet=Object.fromEntries(FIXED_CHARGE_MATCH_HEADERS.map((h,i)=>[h,valeurs[i]]));
  objet.statut=choix==='valider'?'Validé':'Ignoré';objet.decision=choix==='valider'?'Rapproché à l’opération réelle':'Proposition ignorée';objet.modifie_le=new Date().toISOString();
  feuille.getRange(no,1,1,FIXED_CHARGE_MATCH_HEADERS.length).setValues([FIXED_CHARGE_MATCH_HEADERS.map(h=>objet[h]??'')]);
  if(choix==='valider')marquerOperationRapprocheeChargeFixe_(objet);
  return objet;
}

function marquerOperationRapprocheeChargeFixe_(rapprochement){
  const operations=lireTable_('Operations'),o=operations.find(x=>String(x.id)===String(rapprochement.operation_id));
  if(!o)return;
  const marqueur='[CHARGE_FIXE:'+String(rapprochement.charge_fixe_id)+']';
  const commentaire=String(o.commentaire||'');
  enregistrerLigne('Operations',{id:o.id,date:o.date,libelle:o.libelle,categorie:o.categorie,compte:o.compte,montant:Math.abs(Number(o.montant||0)),type:o.type,commentaire:commentaire.includes(marqueur)?commentaire:[commentaire,marqueur].filter(Boolean).join(' '),cree_le:o.cree_le||''});
}
