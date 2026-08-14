const BANKING_LOG_SHEET='Journal_imports_bancaires';
const BANKING_LOG_HEADERS=['horodatage','source','compte','recues','remplacees','creees','ambigues','debits_lot','credits_lot','sauvegarde','statut','detail'];
function journalBanque_(data){const ss=SpreadsheetApp.getActiveSpreadsheet();let f=ss.getSheetByName(BANKING_LOG_SHEET);if(!f){f=ss.insertSheet(BANKING_LOG_SHEET);f.getRange(1,1,1,BANKING_LOG_HEADERS.length).setValues([BANKING_LOG_HEADERS]);f.setFrozenRows(1);if(!f.isSheetHidden())f.hideSheet();}f.appendRow(BANKING_LOG_HEADERS.map(h=>data[h]??''));}

function estMemeMouvementDefinitifPdf_(n,o){
  if(String(o.statut_bancaire||'').toLowerCase()!=='definitif')return false;
  if(String(o.source_bancaire||'').toLowerCase()!=='pdf')return false;
  if(centimesBanque_(o.montant)!==centimesBanque_(n.montant))return false;
  const nc=isoJourBanque_(n.date_comptable||n.date),oc=isoJourBanque_(o.date_comptable||o.date);
  if(!nc||!oc||nc!==oc)return false;
  const na=isoJourBanque_(n.date_achat||n.date),oa=isoJourBanque_(o.date_achat||o.date);
  if(na&&oa&&na!==oa)return false;
  const nl=normaliserTexteBanqueFiable_(n.libelle_bancaire||n.libelle),ol=normaliserTexteBanqueFiable_(o.libelle_bancaire||o.libelle);
  if(nl&&ol&&nl!==ol)return false;
  const ncFin=String(n.carte_fin||''),ocFin=String(o.carte_fin||'');
  if(ncFin&&ocFin&&ncFin!==ocFin)return false;
  return true;
}

function candidatsBancairesTransaction_(n,ops,used,source){
  return ops.filter(o=>{
    if(used.has(o._row))return false;
    if(String(o.compte)!==String(n.compte))return false;
    if(centimesBanque_(o.montant)!==centimesBanque_(n.montant))return false;
    if(source==='pdf'){
      const statut=String(o.statut_bancaire||'').toLowerCase();
      if(statut==='definitif'&&!estMemeMouvementDefinitifPdf_(n,o))return false;
    }
    return true;
  }).map(o=>({o,score:scoreMatchBancaire_(n,o),memeAchat:isoJourBanque_(n.date_achat||n.date)===isoJourBanque_(o.date_achat||o.date),memeCompta:isoJourBanque_(n.date_comptable||n.date)===isoJourBanque_(o.date_comptable||o.date)})).sort((a,b)=>b.score-a.score);
}

function planifierUpsertBancaire_(incoming,ops,source){
  const used=new Set(),actions=[];
  incoming.forEach(n=>{
    const all=candidatsBancairesTransaction_(n,ops,used,source),forts=all.filter(c=>c.score>=60),best=forts[0],second=forts[1];
    if(best&&best.score>=75&&(!second||best.score-second.score>=8)){
      used.add(best.o._row);
      actions.push({kind:'replace',n,o:best.o,score:best.score});
      return;
    }
    const plausibles=all.filter(c=>c.memeAchat||c.memeCompta||c.score>=45).slice(0,5);
    if(plausibles.length){actions.push({kind:'ambiguous',n,candidates:plausibles});return;}
    actions.push({kind:'create',n});
  });
  return actions;
}
function checksumOperationsBanque_(ops){let deb=0,cred=0;const ids=new Set();ops.forEach(o=>{const m=Number(o.montant||0);if(m<0)deb+=Math.abs(m);else cred+=m;if(o.id)ids.add(String(o.id));});return{nombre:ops.length,debits:Math.round(deb*100)/100,credits:Math.round(cred*100)/100,ids:ids.size};}
function diagnosticTexteTransaction_(v){const s=String(v==null?'':v);return JSON.stringify(s)+' [len='+s.length+']';}
function verifierActionsAppliquees_(actions,opsApres){const byId=new Map(opsApres.map(o=>[String(o.id),o])),erreurs=[];actions.filter(a=>a.kind!=='ambiguous').forEach(a=>{let o;if(a.kind==='replace')o=byId.get(String(a.o.id));else o=byId.get(String(a.newId));if(!o){erreurs.push('Opération absente après écriture : '+(a.kind==='replace'?a.o.id:a.newId));return;}if(centimesBanque_(o.montant)!==centimesBanque_(a.n.montant))erreurs.push('Montant différent après écriture : '+o.id);if(isoJourBanque_(o.date_comptable)!==isoJourBanque_(a.n.date_comptable))erreurs.push('Date comptable différente après écriture : '+o.id);if(isoJourBanque_(o.date_achat)!==isoJourBanque_(a.n.date_achat))erreurs.push('Date achat différente après écriture : '+o.id);const attendu=String(a.n.libelle_bancaire||'').trim(),relu=String(o.libelle_bancaire||'').trim();if(relu!==attendu)erreurs.push('Libellé bancaire différent après écriture : '+o.id+' | AVANT='+diagnosticTexteTransaction_(attendu)+' | APRES='+diagnosticTexteTransaction_(relu));});return erreurs;}
function upsertOperationsBancairesTransactionnel(lignes,compte,source,meta){source=source==='pdf'?'pdf':'flux';const incoming=(lignes||[]).map(x=>normaliserEntreeBancaire_(Object.assign({},x,{compte:x.compte||compte}),source)).filter(x=>x.compte&&Number.isFinite(x.montant)&&x.date_comptable);if(!incoming.length)return{recues:0,creees:0,remplacees:0,ambigues:0,ignorees:0,bloque:false};const lot=controlerLotBancaire_(incoming,source==='pdf'?meta:null);if(!lot.ok)throw new Error('Lot bancaire refusé : '+lot.erreurs.join(' '));const lock=LockService.getDocumentLock();lock.waitLock(30000);let backup=null;try{const ss=SpreadsheetApp.getActiveSpreadsheet(),f=ss.getSheetByName('Operations'),headers=assurerColonnesBancaires_(),ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),avant=checksumOperationsBanque_(ops),actions=planifierUpsertBancaire_(incoming,ops,source),amb=actions.filter(a=>a.kind==='ambiguous');if(source==='pdf'&&amb.length){journalBanque_({horodatage:new Date(),source,compte,recues:incoming.length,remplacees:actions.filter(a=>a.kind==='replace').length,creees:actions.filter(a=>a.kind==='create').length,ambigues:amb.length,debits_lot:lot.debits,credits_lot:lot.credits,statut:'BLOQUE',detail:'Rapprochements ambigus — aucune écriture'});return{recues:incoming.length,creees:actions.filter(a=>a.kind==='create').length,remplacees:actions.filter(a=>a.kind==='replace').length,ambigues:amb.length,ignorees:0,bloque:true,message:'Import PDF bloqué : '+amb.length+' rapprochement(s) ambigu(s). Aucune écriture effectuée.',detailsAmbigus:amb.slice(0,20).map(a=>({libelle:a.n.libelle_bancaire,montant:a.n.montant,date_achat:isoJourBanque_(a.n.date_achat),candidats:a.candidates.map(c=>({id:c.o.id,libelle:c.o.libelle_bancaire||c.o.libelle,score:c.score}))}))};}
if(source==='pdf')backup=creerSauvegardeOperationsSecurite_('import PDF');const parRow=new Map(ops.map((o,i)=>[o._row,i]));actions.forEach(a=>{if(a.kind==='ambiguous')return;if(a.kind==='replace'){const idx=parRow.get(a.o._row),old=ops[idx],n=a.n;if(source==='flux'&&String(old.statut_bancaire)==='definitif'){a.kind='ignored-definitive';return;}const out=Object.assign({},old,{date:n.date,date_comptable:n.date_comptable,date_achat:n.date_achat,libelle:n.libelle||old.libelle,libelle_bancaire:n.libelle_bancaire,marchand_normalise:n.marchand_normalise,carte_fin:n.carte_fin,source_bancaire:n.source_bancaire,statut_bancaire:n.statut_bancaire,modifie_le:new Date()});out.cle_rapprochement=cleBanqueFiable_(out,1,1);ops[idx]=out;}else if(a.kind==='create'){const now=new Date(),out=Object.assign({id:Utilities.getUuid(),categorie:'',commentaire:'',cree_le:now,modifie_le:now},a.n);out.cle_rapprochement=cleBanqueFiable_(out,1,1);a.newId=out.id;ops.push(out);}});
const values=ops.map(o=>serialiserOpBancaire_(o,headers));f.clearContents();f.getRange(1,1,1,headers.length).setValues([headers]);if(values.length)f.getRange(2,1,values.length,headers.length).setValues(values);f.setFrozenRows(1);SpreadsheetApp.flush();const apresOps=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),apres=checksumOperationsBanque_(apresOps),erreurs=verifierActionsAppliquees_(actions,apresOps);const expectedCreates=actions.filter(a=>a.kind==='create').length;if(apres.nombre!==avant.nombre+expectedCreates)erreurs.push('Nombre total inattendu après écriture.');if(apres.ids!==apres.nombre)erreurs.push('Identifiants non uniques après écriture.');if(erreurs.length){if(backup){f.clearContents();const bv=backup.getDataRange().getValues();f.getRange(1,1,bv.length,bv[0].length).setValues(bv);SpreadsheetApp.flush();}throw new Error('Contrôle transactionnel échoué'+(backup?' ; restauration effectuée':'')+' : '+erreurs.slice(0,10).join(' '));}
const remp=actions.filter(a=>a.kind==='replace').length,crea=expectedCreates,ign=actions.filter(a=>a.kind==='ambiguous'||a.kind==='ignored-definitive').length;journalBanque_({horodatage:new Date(),source,compte,recues:incoming.length,remplacees:remp,creees:crea,ambigues:actions.filter(a=>a.kind==='ambiguous').length,debits_lot:lot.debits,credits_lot:lot.credits,sauvegarde:backup?backup.getName():'',statut:'OK',detail:'Écriture en bloc + contrôle après écriture'});return{recues:incoming.length,creees:crea,remplacees:remp,ambigues:actions.filter(a=>a.kind==='ambiguous').length,ignorees:ign,bloque:false,controle:lot,sauvegarde:backup?backup.getName():''};}catch(e){journalBanque_({horodatage:new Date(),source,compte,recues:incoming.length,debits_lot:lot.debits,credits_lot:lot.credits,sauvegarde:backup?backup.getName():'',statut:'ERREUR',detail:e.message});throw e;}finally{lock.releaseLock();}}
