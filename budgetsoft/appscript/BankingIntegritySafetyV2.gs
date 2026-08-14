const BANKING_SAFETY_V2='2.4';

function restaurerOperationsDepuisSauvegardeV2(nom){
  const ss=SpreadsheetApp.getActiveSpreadsheet(),src=ss.getSheetByName(String(nom||'')),dst=ss.getSheetByName('Operations');
  if(!src||!dst)throw new Error('Sauvegarde ou feuille Operations introuvable.');
  const nomSource=src.getName();
  if(nomSource!==BUDGETSOFT_SECURITY_BACKUP_SHEET&&!/^Operations_backup_\d{8}_\d{6}$/.test(nomSource))throw new Error('Nom de sauvegarde refusé.');
  const lock=LockService.getDocumentLock();lock.waitLock(30000);
  try{
    const secours=creerSauvegardeOperationsSecurite_('avant restauration');
    const vals=src.getDataRange().getValues();dst.clearContents();dst.getRange(1,1,vals.length,vals[0].length).setValues(vals);SpreadsheetApp.flush();
    const apres=checksumOperationsBanque_(lireOperationsBancaires_());
    if(apres.ids!==apres.nombre){dst.clearContents();const sv=secours.getDataRange().getValues();dst.getRange(1,1,sv.length,sv[0].length).setValues(sv);SpreadsheetApp.flush();throw new Error('Restauration refusée : IDs non uniques ; état précédent rétabli.');}
    return{ok:true,sauvegardeSource:nomSource,sauvegardeSecours:secours.getName(),apres};
  }finally{lock.releaseLock();}
}

function estRecurrenceV23_(o){return /\[RECURRENCE:/i.test(String(o.commentaire||''));}
function dateJourV23_(v){return isoJourBanque_(v||'');}
function empreinteExacteV23_(o){return [dateJourV23_(o.date_comptable||o.date),centimesBanque_(o.montant),normaliserTexteBanqueFiable_(o.libelle_bancaire||o.libelle)].join('|');}
function identiteProcheV23_(a,b){const x=normaliserTexteBanqueFiable_(a||''),y=normaliserTexteBanqueFiable_(b||'');if(!x||!y)return false;if(x.includes(y)||y.includes(x))return true;const ax=x.split(' ').filter(w=>w.length>=4),ay=new Set(y.split(' ').filter(w=>w.length>=4));let n=0;ax.forEach(w=>{if(ay.has(w))n++;});return n>=2;}
function preparerFluxV23_(lignes,compte){return(lignes||[]).map(x=>normaliserEntreeBancaire_(Object.assign({},x,{compte:x.compte||compte}),'flux')).filter(x=>x.compte&&Number.isFinite(x.montant)&&x.date_comptable);}

function planifierSnapshotV23_(incoming,ops,compte){
  const existants=ops.filter(o=>String(o.compte)===String(compte)),groupIn={},groupEx={};
  incoming.forEach((n,i)=>{const k=empreinteExacteV23_(n);(groupIn[k]||(groupIn[k]=[])).push({n,i});});
  existants.forEach(o=>{const k=empreinteExacteV23_(o);(groupEx[k]||(groupEx[k]=[])).push(o);});
  const used=new Set(),matches=[],ambigues=[],nouvelles=[],absorbees=[];
  Object.keys(groupIn).forEach(k=>{
    const ins=groupIn[k],cands=(groupEx[k]||[]).slice().sort((a,b)=>{const ar=estRecurrenceV23_(a)?0:1,br=estRecurrenceV23_(b)?0:1;if(ar!==br)return ar-br;return String(a.id).localeCompare(String(b.id));});
    if(cands.length>=ins.length){ins.forEach((x,j)=>{const o=cands[j];used.add(String(o.id));matches.push({n:x.n,o,raison:'empreinte bancaire exacte'});});return;}
    ins.forEach((x,j)=>{if(j<cands.length){const o=cands[j];used.add(String(o.id));matches.push({n:x.n,o,raison:'empreinte bancaire exacte'});return;}const possibles=existants.filter(o=>!used.has(String(o.id))&&centimesBanque_(o.montant)===centimesBanque_(x.n.montant)&&dateJourV23_(o.date_comptable||o.date)===dateJourV23_(x.n.date_comptable||x.n.date)).map(o=>({o,score:scoreMatchBancaire_(x.n,o)})).filter(c=>c.score>=60).sort((a,b)=>b.score-a.score);if(possibles.length===1){used.add(String(possibles[0].o.id));matches.push({n:x.n,o:possibles[0].o,raison:'date + montant + score unique'});}else if(possibles.length>1)ambigues.push({n:x.n,candidates:possibles.slice(0,5),raison:'plusieurs candidats résiduels'});else nouvelles.push({n:x.n,raison:'aucune correspondance'});});
  });
  matches.forEach(m=>{existants.forEach(o=>{if(used.has(String(o.id))||!estRecurrenceV23_(o))return;if(centimesBanque_(o.montant)!==centimesBanque_(m.n.montant))return;if(dateJourV23_(o.date_comptable||o.date)!==dateJourV23_(m.n.date_comptable||m.n.date))return;if(!identiteProcheV23_(o.libelle_bancaire||o.libelle,m.n.libelle_bancaire||m.n.libelle))return;used.add(String(o.id));absorbees.push({placeholder:o,cible:m.o,n:m.n});});});
  const dates=incoming.map(n=>dateJourV23_(n.date_comptable||n.date)).filter(Boolean).sort(),minDate=dates[0]||'',maxDate=dates[dates.length-1]||'';
  const orphelines=existants.filter(o=>{const d=dateJourV23_(o.date_comptable||o.date),src=String(o.source_bancaire||'').toLowerCase();if(!d||d<minDate||d>maxDate||used.has(String(o.id)))return false;return estRecurrenceV23_(o)||src==='flux';});
  return{matches,nouvelles,ambigues,absorbees,orphelines,minDate,maxDate};
}

function analyserFluxBancaireAvantImportV2(lignes,compte){const recues=(lignes||[]).length,incoming=preparerFluxV23_(lignes,compte),rejetes=Math.max(0,recues-incoming.length),ctl=controlerLotBancaire_(incoming,null),ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),p=planifierSnapshotV23_(incoming,ops,compte);return{version:BANKING_SAFETY_V2,controle:ctl,recues,exploitables:incoming.length,rejetes,existantes:p.matches.length,nouvelles:p.nouvelles.length,ambigues:p.ambigues.length,placeholders:p.absorbees.length,orphelines:p.orphelines.length,pret:rejetes===0&&p.ambigues.length===0,detailsAmbigues:p.ambigues.slice(0,20).map(a=>({libelle:a.n.libelle_bancaire,montant:a.n.montant,raison:a.raison,candidats:a.candidates.map(c=>({id:c.o.id,libelle:c.o.libelle_bancaire||c.o.libelle,score:c.score}))})),detailsOrphelines:p.orphelines.slice(0,30).map(o=>({id:o.id,date:dateJourV23_(o.date_comptable||o.date),montant:o.montant,libelle:o.libelle_bancaire||o.libelle,recurrence:estRecurrenceV23_(o)}))};}

function importerFluxBancaireControleV2(lignes,compte){
  const incoming=preparerFluxV23_(lignes,compte),ctl=controlerLotBancaire_(incoming,null);if(!ctl.nombre)throw new Error('Aucune opération exploitable.');
  const lock=LockService.getDocumentLock();lock.waitLock(30000);let backup=null;
  try{
    const ss=SpreadsheetApp.getActiveSpreadsheet(),f=ss.getSheetByName('Operations'),headers=assurerColonnesBancaires_(),ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),avant=checksumOperationsBanque_(ops),p=planifierSnapshotV23_(incoming,ops,compte);
    if(p.ambigues.length)return{bloque:true,message:'Import bloqué : '+p.ambigues.length+' ambiguïté(s).'};
    backup=creerSauvegardeOperationsSecurite_('import flux');
    const supprimer=new Set(p.absorbees.map(x=>String(x.placeholder.id)).concat(p.orphelines.map(x=>String(x.id))));
    const matchById=new Map(p.matches.map(m=>[String(m.o.id),m]));
    const nouveaux=[];
    const out=ops.filter(o=>!supprimer.has(String(o.id))).map(o=>{const m=matchById.get(String(o.id));if(!m)return o;const n=m.n,comment=[String(o.commentaire||''),String(n.commentaire||'')].filter(Boolean).join(' ');return Object.assign({},o,{date:n.date,date_comptable:n.date_comptable,date_achat:n.date_achat,libelle_bancaire:n.libelle_bancaire,marchand_normalise:n.marchand_normalise,carte_fin:n.carte_fin,source_bancaire:'flux',statut_bancaire:'provisoire',commentaire:comment,modifie_le:new Date()});});
    p.nouvelles.forEach(a=>{const now=new Date(),n=a.n,nouveau=Object.assign({id:Utilities.getUuid(),categorie:'',commentaire:'',cree_le:now,modifie_le:now},n);nouveau.cle_rapprochement=cleBanqueFiable_(nouveau,1,1);out.push(nouveau);nouveaux.push(nouveau.id);});
    const vals=out.map(o=>serialiserOpBancaire_(o,headers));f.clearContents();f.getRange(1,1,1,headers.length).setValues([headers]);if(vals.length)f.getRange(2,1,vals.length,headers.length).setValues(vals);SpreadsheetApp.flush();
    const apres=checksumOperationsBanque_(lireOperationsBancaires_());const attendu=avant.nombre-p.absorbees.length-p.orphelines.length+p.nouvelles.length;
    if(apres.nombre!==attendu||apres.ids!==apres.nombre){f.clearContents();const bv=backup.getDataRange().getValues();f.getRange(1,1,bv.length,bv[0].length).setValues(bv);SpreadsheetApp.flush();throw new Error('Contrôle après écriture échoué ; restauration automatique effectuée.');}
    return{bloque:false,recues:incoming.length,remplacees:p.matches.length,creees:p.nouvelles.length,placeholdersSupprimes:p.absorbees.length,orphelinesSupprimees:p.orphelines.length,controle:ctl,sauvegarde:backup.getName(),totalApres:apres.nombre};
  }finally{lock.releaseLock();}
}
