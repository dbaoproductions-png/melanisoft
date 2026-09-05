const BANKING_SAFETY_V2='2.9';

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
function estPdfDefinitifV27_(o){return String(o&&o.source_bancaire||'').toLowerCase()==='pdf'&&String(o&&o.statut_bancaire||'').toLowerCase()==='definitif';}
function contexteCategoriesFluxV27_(ops){
  if(typeof propositionCategorieOperation_!=='function'||typeof indexCategoriesIntelligentes_!=='function')return null;
  const index=indexCategoriesIntelligentes_(),corr=typeof lireCorrespondancesBancaires==='function'?lireCorrespondancesBancaires():[],regles=typeof lireReglesCategories==='function'?lireReglesCategories():[],historique=typeof construireHistoriqueCategories_==='function'?construireHistoriqueCategories_(ops,index):null;
  return{index,corr,regles,historique};
}
function propositionCategorieFluxV27_(o,ctx){
  if(!ctx)return null;
  const texte=normaliserTexteBanqueFiable_([o.marchand_normalise||'',o.libelle_bancaire||'',o.libelle||''].join(' '));
  const estRevenu=String(o.type||'').toLowerCase()==='revenu'||Number(o.montant||0)>0;
  if(estRevenu&&/\bCOFIDIS\b/.test(texte)&&/(DEMANDE.*FINANCEMENT|FINANCEMENT.*REV)/.test(texte)){
    const cle=typeof normaliserTexteBanque_==='function'?normaliserTexteBanque_('Crédits de trésorerie'):'credits de tresorerie';
    if(ctx.index.has(cle))return{categorie:'Crédits de trésorerie',source:'heuristique_financement'};
  }
  if(/\bVELO\s+TOULOUSE\b/.test(texte)){
    const cle=typeof normaliserTexteBanque_==='function'?normaliserTexteBanque_('Transports'):'transports';
    if(ctx.index.has(cle))return{categorie:'Transports',source:'heuristique_velo_toulouse'};
  }
  const p=propositionCategorieOperation_(o,ctx.corr,ctx.regles,ctx.index,ctx.historique);
  if(!p||p.statut!=='propose'||!p.best||!p.best.categorie)return null;
  return{categorie:String(p.best.categorie),source:String(p.best.source||'intelligence')};
}
// Le normaliseur commun peut recalculer les champs dérivés. Pour le flux HelloBank,
// on réapplique après normalisation les valeurs déjà extraites par le pont V3.4 :
// N reste la source brute, O/P/C sont des enrichissements, M reste vide sans vraie date d'achat.
function preparerFluxV23_(lignes,compte){return(lignes||[]).map(x=>{const avaitAchat=!!x.date_achat;const n=normaliserEntreeBancaire_(Object.assign({},x,{compte:x.compte||compte}),'flux');if(!avaitAchat){n.date_achat='';n.date=n.date_comptable;}if(x.libelle_bancaire)n.libelle_bancaire=x.libelle_bancaire;if(x.marchand_normalise)n.marchand_normalise=x.marchand_normalise;else if(typeof hb3Contrepartie_==='function'&&n.libelle_bancaire)n.marchand_normalise=hb3Contrepartie_(n.libelle_bancaire);if(x.carte_fin)n.carte_fin=x.carte_fin;else if(typeof hb3CarteFin_==='function'&&n.libelle_bancaire)n.carte_fin=hb3CarteFin_(n.libelle_bancaire);if(x.libelle)n.libelle=x.libelle;return n;}).filter(x=>x.compte&&Number.isFinite(x.montant)&&x.date_comptable);}

function planifierSnapshotV23_(incoming,ops,compte){
  const existants=ops.filter(o=>String(o.compte)===String(compte)),groupIn={},groupEx={};
  incoming.forEach((n,i)=>{const k=empreinteExacteV23_(n);(groupIn[k]||(groupIn[k]=[])).push({n,i});});
  existants.forEach(o=>{const k=empreinteExacteV23_(o);(groupEx[k]||(groupEx[k]=[])).push(o);});
  const used=new Set(),protegesAmbigus=new Set(),matches=[],ambigues=[],nouvelles=[],absorbees=[];
  Object.keys(groupIn).forEach(k=>{
    const ins=groupIn[k],cands=(groupEx[k]||[]).slice().sort((a,b)=>{const ar=estRecurrenceV23_(a)?0:1,br=estRecurrenceV23_(b)?0:1;if(ar!==br)return ar-br;return String(a.id).localeCompare(String(b.id));});
    if(cands.length>=ins.length){ins.forEach((x,j)=>{const o=cands[j];used.add(String(o.id));matches.push({n:x.n,o,raison:'empreinte bancaire exacte'});});return;}
    ins.forEach((x,j)=>{
      if(j<cands.length){const o=cands[j];used.add(String(o.id));matches.push({n:x.n,o,raison:'empreinte bancaire exacte'});return;}
      const possibles=existants.filter(o=>!used.has(String(o.id))&&!protegesAmbigus.has(String(o.id))&&centimesBanque_(o.montant)===centimesBanque_(x.n.montant)&&dateJourV23_(o.date_comptable||o.date)===dateJourV23_(x.n.date_comptable||x.n.date)).map(o=>({o,score:scoreMatchBancaire_(x.n,o)})).filter(c=>c.score>=60).sort((a,b)=>b.score-a.score);
      if(possibles.length===1){used.add(String(possibles[0].o.id));matches.push({n:x.n,o:possibles[0].o,raison:'date + montant + score unique'});}
      else if(possibles.length>1){possibles.forEach(c=>protegesAmbigus.add(String(c.o.id)));ambigues.push({n:x.n,candidates:possibles.slice(0,5),raison:'plusieurs candidats résiduels'});}
      else nouvelles.push({n:x.n,raison:'aucune correspondance'});
    });
  });
  matches.forEach(m=>{existants.forEach(o=>{if(used.has(String(o.id))||protegesAmbigus.has(String(o.id))||!estRecurrenceV23_(o))return;if(centimesBanque_(o.montant)!==centimesBanque_(m.n.montant))return;if(dateJourV23_(o.date_comptable||o.date)!==dateJourV23_(m.n.date_comptable||m.n.date))return;if(!identiteProcheV23_(o.libelle_bancaire||o.libelle,m.n.libelle_bancaire||m.n.libelle))return;used.add(String(o.id));absorbees.push({placeholder:o,cible:m.o,n:m.n});});});
  const dates=incoming.map(n=>dateJourV23_(n.date_comptable||n.date)).filter(Boolean).sort(),minDate=dates[0]||'',maxDate=dates[dates.length-1]||'';
  const orphelines=existants.filter(o=>{const id=String(o.id),d=dateJourV23_(o.date_comptable||o.date),src=String(o.source_bancaire||'').toLowerCase();if(!d||d<minDate||d>maxDate||used.has(id)||protegesAmbigus.has(id))return false;return estRecurrenceV23_(o)||src==='flux';});
  return{matches,nouvelles,ambigues,absorbees,orphelines,protegesAmbigus:[...protegesAmbigus],minDate,maxDate};
}

function analyserFluxBancaireAvantImportV2(lignes,compte){
  const recues=(lignes||[]).length,incoming=preparerFluxV23_(lignes,compte),rejetes=Math.max(0,recues-incoming.length),ctl=controlerLotBancaire_(incoming,null),ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),p=planifierSnapshotV23_(incoming,ops,compte),ctx=contexteCategoriesFluxV27_(ops);
  const detailsNouvelles=p.nouvelles.slice(0,30).map(a=>{const pc=propositionCategorieFluxV27_(a.n,ctx);return{date:dateJourV23_(a.n.date_comptable||a.n.date),montant:a.n.montant,libelle:a.n.libelle_bancaire||a.n.libelle,categorieProposee:pc?pc.categorie:'',sourceCategorie:pc?pc.source:''};});
  return{version:BANKING_SAFETY_V2,controle:ctl,recues,exploitables:incoming.length,rejetes,existantes:p.matches.length,nouvelles:p.nouvelles.length,ambigues:p.ambigues.length,protegeesPdf:p.matches.filter(m=>estPdfDefinitifV27_(m.o)).length,placeholders:p.absorbees.length,orphelines:p.orphelines.length,pret:rejetes===0,pretPartiel:rejetes===0&&p.ambigues.length>0,detailsNouvelles,detailsExistantes:p.matches.slice(0,30).map(m=>({date:dateJourV23_(m.n.date_comptable||m.n.date),montant:m.n.montant,libelle:m.n.libelle_bancaire||m.n.libelle,sourceExistante:m.o.source_bancaire||'',statutExistant:m.o.statut_bancaire||'',categorieExistante:m.o.categorie||'',protegeePdf:estPdfDefinitifV27_(m.o)})),detailsAmbigues:p.ambigues.slice(0,20).map(a=>({libelle:a.n.libelle_bancaire,montant:a.n.montant,raison:a.raison,candidats:a.candidates.map(c=>({id:c.o.id,libelle:c.o.libelle_bancaire||c.o.libelle,score:c.score}))})),detailsOrphelines:p.orphelines.slice(0,30).map(o=>({id:o.id,date:dateJourV23_(o.date_comptable||o.date),montant:o.montant,libelle:o.libelle_bancaire||o.libelle,recurrence:estRecurrenceV23_(o)}))};
}

function importerFluxBancaireControleV2(lignes,compte){
  const incoming=preparerFluxV23_(lignes,compte),ctl=controlerLotBancaire_(incoming,null);if(!ctl.nombre)throw new Error('Aucune opération exploitable.');
  const lock=LockService.getDocumentLock();lock.waitLock(30000);let backup=null;
  try{
    const ss=SpreadsheetApp.getActiveSpreadsheet(),f=ss.getSheetByName('Operations'),headers=assurerColonnesBancaires_(),ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),avant=checksumOperationsBanque_(ops),p=planifierSnapshotV23_(incoming,ops,compte),ctx=contexteCategoriesFluxV27_(ops);
    backup=creerSauvegardeOperationsSecurite_('import flux');
    const supprimer=new Set(p.absorbees.map(x=>String(x.placeholder.id)).concat(p.orphelines.map(x=>String(x.id))));
    const matchById=new Map(p.matches.map(m=>[String(m.o.id),m]));
    const nouveaux=[];let protegeesPdf=0,modifieesExistantes=0,categorisees=0;
    const out=ops.filter(o=>!supprimer.has(String(o.id))).map(o=>{
      const m=matchById.get(String(o.id));if(!m)return o;
      if(estPdfDefinitifV27_(o)){protegeesPdf++;return o;}
      const n=m.n,comment=[String(o.commentaire||''),String(n.commentaire||'')].filter(Boolean).join(' ');
      const maj=Object.assign({},o,{date:n.date,date_comptable:n.date_comptable,date_achat:n.date_achat,libelle:n.libelle||o.libelle,libelle_bancaire:n.libelle_bancaire,marchand_normalise:n.marchand_normalise,carte_fin:n.carte_fin,source_bancaire:'flux',statut_bancaire:'provisoire',commentaire:comment,modifie_le:new Date()});
      maj.cle_rapprochement=cleTransactionUnique_(maj);modifieesExistantes++;return maj;
    });
    p.nouvelles.forEach(a=>{const now=new Date(),n=a.n,nouveau=Object.assign({id:Utilities.getUuid(),categorie:'',commentaire:'',cree_le:now,modifie_le:now},n),pc=propositionCategorieFluxV27_(n,ctx);if(pc&&pc.categorie){nouveau.categorie=pc.categorie;categorisees++;}nouveau.cle_rapprochement=cleTransactionUnique_(nouveau);out.push(nouveau);nouveaux.push(nouveau.id);});
    const vals=out.map(o=>serialiserOpBancaire_(o,headers));f.clearContents();f.getRange(1,1,1,headers.length).setValues([headers]);if(vals.length)f.getRange(2,1,vals.length,headers.length).setValues(vals);f.setFrozenRows(1);SpreadsheetApp.flush();
    const apresOps=lireOperationsBancaires_(),apres=checksumOperationsBanque_(apresOps),attendu=avant.nombre-p.absorbees.length-p.orphelines.length+p.nouvelles.length;const cles=apresOps.map(o=>String(o.cle_rapprochement||'').trim()).filter(Boolean);
    if(apres.nombre!==attendu||apres.ids!==apres.nombre||cles.length!==new Set(cles).size){f.clearContents();const bv=backup.getDataRange().getValues();f.getRange(1,1,bv.length,bv[0].length).setValues(bv);SpreadsheetApp.flush();throw new Error('Contrôle après écriture échoué ; restauration automatique effectuée.');}
    return{bloque:false,recues:incoming.length,remplacees:modifieesExistantes,existantes:p.matches.length,protegeesPdf,creees:p.nouvelles.length,categorisees,ambiguesIgnorees:p.ambigues.length,placeholdersSupprimes:p.absorbees.length,orphelinesSupprimees:p.orphelines.length,controle:ctl,sauvegarde:backup.getName(),totalApres:apres.nombre};
  }finally{lock.releaseLock();}
}