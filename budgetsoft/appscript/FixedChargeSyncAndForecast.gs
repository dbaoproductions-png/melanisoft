const AJUSTEMENTS_CHARGES_FIXES_HEADERS = ['id','charge_fixe_id','action','date_cible','nouvelle_date','nouveau_montant','mois','commentaire','actif','cree_le','modifie_le'];

function assurerTableAjustementsChargesFixes_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let f=ss.getSheetByName('Ajustements_charges_fixes');
  if(!f)f=ss.insertSheet('Ajustements_charges_fixes');
  if(f.getLastRow()===0)f.getRange(1,1,1,AJUSTEMENTS_CHARGES_FIXES_HEADERS.length).setValues([AJUSTEMENTS_CHARGES_FIXES_HEADERS]);
  else{
    const presentes=f.getRange(1,1,1,Math.max(1,f.getLastColumn())).getValues()[0].map(v=>String(v||'').trim());
    const manquantes=AJUSTEMENTS_CHARGES_FIXES_HEADERS.filter(h=>!presentes.includes(h));
    if(manquantes.length)f.getRange(1,presentes.length+1,1,manquantes.length).setValues([manquantes]);
  }
  f.setFrozenRows(1);
  return f;
}

function lireAjustementsChargesFixes(){
  const f=assurerTableAjustementsChargesFixes_();
  if(f.getLastRow()<2)return[];
  const vals=f.getRange(2,1,f.getLastRow()-1,AJUSTEMENTS_CHARGES_FIXES_HEADERS.length).getValues();
  return vals.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>Object.fromEntries(AJUSTEMENTS_CHARGES_FIXES_HEADERS.map((h,i)=>[h,serialiserValeur_(r[i])])));
}

function enregistrerAjustementChargeFixe(a){
  if(!a||typeof a!=='object')throw new Error('Ajustement invalide.');
  const x=Object.assign({},a),actions=['reporter','ignorer','montant','exclure_mois'];
  x.id=String(x.id||'').trim()||Utilities.getUuid();
  x.charge_fixe_id=String(x.charge_fixe_id||'').trim();
  x.action=String(x.action||'').trim().toLowerCase();
  if(!x.charge_fixe_id)throw new Error('La charge fixe est obligatoire.');
  if(!actions.includes(x.action))throw new Error('Action prévisionnelle inconnue.');
  x.date_cible=x.date_cible?formatDateLocaleBudgetSoft_(dateLocaleBudgetSoft_(x.date_cible)):'';
  x.nouvelle_date=x.nouvelle_date?formatDateLocaleBudgetSoft_(dateLocaleBudgetSoft_(x.nouvelle_date)):'';
  x.nouveau_montant=x.nouveau_montant===''||x.nouveau_montant==null?'':Math.abs(convertirNombre_(x.nouveau_montant));
  x.mois=String(x.mois||'').split(/[;,\s]+/).map(v=>parseInt(v,10)).filter(v=>v>=1&&v<=12).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b).join(',');
  x.commentaire=String(x.commentaire||'').trim();x.actif=x.actif===false?false:true;
  if(x.action==='reporter'&&(!x.date_cible||!x.nouvelle_date))throw new Error('Le report nécessite une échéance d’origine et une nouvelle date.');
  if(x.action==='ignorer'&&!x.date_cible)throw new Error('L’échéance à ignorer est obligatoire.');
  if(x.action==='montant'&&(!x.date_cible||x.nouveau_montant===''))throw new Error('La date et le nouveau montant sont obligatoires.');
  if(x.action==='exclure_mois'&&!x.mois)throw new Error('Indiquez au moins un mois à exclure.');
  const f=assurerTableAjustementsChargesFixes_(),now=new Date().toISOString();
  const ids=f.getLastRow()>1?f.getRange(2,1,f.getLastRow()-1,1).getValues().flat():[],p=ids.findIndex(v=>String(v)===x.id);
  if(p>=0){const old=f.getRange(p+2,1,1,AJUSTEMENTS_CHARGES_FIXES_HEADERS.length).getValues()[0];x.cree_le=old[9]||now;}else x.cree_le=now;
  x.modifie_le=now;
  const row=AJUSTEMENTS_CHARGES_FIXES_HEADERS.map(h=>normaliserValeur_(x[h]));
  if(p>=0)f.getRange(p+2,1,1,row.length).setValues([row]);else f.appendRow(row);
  return x;
}

function supprimerAjustementChargeFixe(id){
  const f=assurerTableAjustementsChargesFixes_();if(f.getLastRow()<2)return false;
  const ids=f.getRange(2,1,f.getLastRow()-1,1).getValues().flat(),p=ids.findIndex(v=>String(v)===String(id));
  if(p<0)return false;f.deleteRow(p+2);return true;
}

function motifChargeFixeDepuisOperation_(o){
  const brut=String(o&& (o.libelle_bancaire||o.marchand_normalise||o.libelle)||'').trim();
  if(typeof extraireMotifStableBanque_==='function')return extraireMotifStableBanque_(brut);
  if(typeof normaliserTexteBanque_==='function')return normaliserTexteBanque_(brut);
  return brut.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function trouverChargeFixePourOperation_(operation){
  const charges=lireTable_('Charges_fixes');
  const id=String(operation&&operation.charge_fixe_id||'').trim();
  if(id){const liee=charges.find(c=>String(c.id)===id);if(liee)return liee;}
  const motif=motifChargeFixeDepuisOperation_(operation),compte=String(operation&&operation.compte||''),montant=Math.abs(Number(operation&&operation.montant||0));
  if(!motif)return null;
  const candidates=charges.filter(c=>{
    if(!convertirBooleen_(c.actif))return false;
    if(compte&&c.compte&&String(c.compte)!==compte)return false;
    const mc=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(c.libelle_bancaire||c.libelle):motifChargeFixeDepuisOperation_({libelle:c.libelle_bancaire||c.libelle});
    if(!mc||mc!==motif)return false;
    const attendu=Math.abs(Number(c.montant||0)),tol=Math.max(Number(c.tolerance||0.5),Math.max(1,attendu*0.15));
    return !attendu||!montant||Math.abs(attendu-montant)<=tol;
  });
  return candidates.length===1?candidates[0]:null;
}

function lierOperationChargeFixe_(operationId,chargeId){
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');if(!f||f.getLastRow()<2)return false;
  const h=TABLES.Operations,idCol=h.indexOf('id')+1,cfCol=h.indexOf('charge_fixe_id')+1;
  const ids=f.getRange(2,idCol,f.getLastRow()-1,1).getValues().flat(),p=ids.findIndex(v=>String(v)===String(operationId));
  if(p<0)return false;f.getRange(p+2,cfCol).setValue(String(chargeId||''));return true;
}

function synchroniserChargeFixeDepuisOperation_(operation){
  if(!operation||String(operation.type||'').toLowerCase()!=='depense')return{miseAJour:false,raison:'type'};
  const charge=trouverChargeFixePourOperation_(operation);if(!charge)return{miseAJour:false,raison:'aucune_charge_unique'};
  const bank=String(operation.libelle_bancaire||'').trim();
  const maj=Object.assign({},charge,{
    libelle:String(operation.libelle||charge.libelle||'').trim(),
    categorie:String(operation.categorie||charge.categorie||'').trim(),
    compte:String(operation.compte||charge.compte||'').trim(),
    montant:Math.abs(Number(operation.montant||charge.montant||0)),
    libelle_bancaire:bank||charge.libelle_bancaire||operation.libelle||''
  });
  const saved=enregistrerLigne('Charges_fixes',maj);
  if(operation.id&&!operation.charge_fixe_id)lierOperationChargeFixe_(operation.id,saved.id);
  return{miseAJour:true,charge:saved};
}

function enregistrerChargeFixeLieeOperation(operationId,charge){
  const op=lireTable_('Operations').find(o=>String(o.id)===String(operationId));
  if(!op)throw new Error('Opération source introuvable.');
  const cf=enregistrerLigne('Charges_fixes',charge);
  lierOperationChargeFixe_(op.id,cf.id);
  return{operationId:op.id,charge:cf};
}

function cleDateAjustement_(d){return Utilities.formatDate(dateLocaleBudgetSoft_(d),Session.getScriptTimeZone(),'yyyy-MM-dd');}

function calculerEcheancesChargeFixeAjustees_(charge,debut,fin,limite){
  const base=calculerEcheancesJusqua_(charge,debut,fin,limite).map(d=>({date:new Date(d),montant:Math.abs(Number(charge.montant||0)),ajustement:''}));
  const ajustements=lireAjustementsChargesFixes().filter(a=>String(a.charge_fixe_id)===String(charge.id)&&convertirBooleen_(a.actif));
  const moisExclus=new Set();
  ajustements.filter(a=>String(a.action)==='exclure_mois').forEach(a=>String(a.mois||'').split(',').forEach(m=>{const n=parseInt(m,10);if(n>=1&&n<=12)moisExclus.add(n);}));
  let ev=base.filter(e=>!moisExclus.has(e.date.getMonth()+1));
  ajustements.forEach(a=>{
    const action=String(a.action||'');if(action==='exclure_mois')return;
    const cible=String(a.date_cible||'');
    if(!cible)return;
    const idx=ev.findIndex(e=>cleDateAjustement_(e.date)===cible);
    if(action==='ignorer'){if(idx>=0)ev.splice(idx,1);return;}
    if(action==='montant'){if(idx>=0){ev[idx].montant=Math.abs(Number(a.nouveau_montant||ev[idx].montant));ev[idx].ajustement=a.id;}return;}
    if(action==='reporter'){
      if(idx>=0)ev.splice(idx,1);
      const nd=dateLocaleBudgetSoft_(a.nouvelle_date);if(!isNaN(nd)&&nd>=debut&&nd<=limite&&(!fin||nd<=fin))ev.push({date:nd,montant:Math.abs(Number(a.nouveau_montant||charge.montant||0)),ajustement:a.id});
    }
  });
  return ev.sort((a,b)=>a.date-b.date);
}
