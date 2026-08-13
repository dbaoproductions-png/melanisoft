const BANKING_SAFETY_V2='2.1';

function restaurerOperationsDepuisSauvegardeV2(nom){
  const ss=SpreadsheetApp.getActiveSpreadsheet(),src=ss.getSheetByName(String(nom||'')),dst=ss.getSheetByName('Operations');
  if(!src||!dst)throw new Error('Sauvegarde ou feuille Operations introuvable.');
  if(!/^Operations_(?:backup|avant_flux|avant_restauration)_\d{8}_\d{6}$/.test(src.getName()))throw new Error('Nom de sauvegarde refusé.');
  const lock=LockService.getDocumentLock();lock.waitLock(30000);
  try{
    const avant=checksumOperationsBanque_(lireOperationsBancaires_());
    const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
    const secours=dst.copyTo(ss).setName(('Operations_avant_restauration_'+stamp).slice(0,99));
    const vals=src.getDataRange().getValues();dst.clearContents();dst.getRange(1,1,vals.length,vals[0].length).setValues(vals);SpreadsheetApp.flush();
    const apresOps=lireOperationsBancaires_(),apres=checksumOperationsBanque_(apresOps);
    if(apres.ids!==apres.nombre){dst.clearContents();const sv=secours.getDataRange().getValues();dst.getRange(1,1,sv.length,sv[0].length).setValues(sv);SpreadsheetApp.flush();throw new Error('Restauration refusée : IDs non uniques ; état précédent rétabli.');}
    return{ok:true,sauvegardeSource:src.getName(),sauvegardeSecours:secours.getName(),avant,apres};
  }finally{lock.releaseLock();}
}

function memeCompteV2_(a,b){return String(a||'').trim()===String(b||'').trim();}
function empreinteTexteV2_(o){return normaliserTexteBanqueFiable_(o.libelle_bancaire||o.details||o.libelle||'').replace(/\s+/g,' ').trim();}
function candidatV2_(n,o){
  if(!memeCompteV2_(n.compte,o.compte)||centimesBanque_(n.montant)!==centimesBanque_(o.montant))return null;
  const na=isoJourBanque_(n.date_achat||n.date),oa=isoJourBanque_(o.date_achat||o.date),nc=isoJourBanque_(n.date_comptable||n.date),oc=isoJourBanque_(o.date_comptable||o.date);
  const achat=!!na&&na===oa,compta=!!nc&&nc===oc;
  const nt=empreinteTexteV2_(n),ot=empreinteTexteV2_(o),texteExact=!!nt&&nt===ot;
  const nm=normaliserTexteBanqueFiable_(n.marchand_normalise||n.libelle),om=normaliserTexteBanqueFiable_(o.marchand_normalise||o.libelle);
  const marchand=!!nm&&!!om&&(nm===om||nm.includes(om)||om.includes(nm));
  const carte=!!n.carte_fin&&!!o.carte_fin&&String(n.carte_fin)===String(o.carte_fin);
  const score=scoreMatchBancaire_(n,o)+(texteExact?100:0);
  return{o,score,achat,compta,marchand,carte,texteExact};
}
function planifierFluxV2_(incoming,ops){
  const used=new Set(),actions=[];
  incoming.forEach(n=>{
    const all=ops.filter(o=>!used.has(o._row)).map(o=>candidatV2_(n,o)).filter(Boolean).sort((a,b)=>b.score-a.score);
    const txt=all.filter(c=>c.texteExact);
    if(txt.length===1){used.add(txt[0].o._row);actions.push({kind:'replace',n,o:txt[0].o,score:txt[0].score,raison:'libellé bancaire exact + montant'});return;}
    if(txt.length>1){
      const txtDate=txt.filter(c=>c.achat||c.compta);
      if(txtDate.length===1){used.add(txtDate[0].o._row);actions.push({kind:'replace',n,o:txtDate[0].o,score:txtDate[0].score,raison:'libellé bancaire exact + montant + date'});return;}
      actions.push({kind:'ambiguous',n,candidates:(txtDate.length?txtDate:txt).slice(0,5),raison:'libellé bancaire et montant répétés'});return;
    }
    const exacts=all.filter(c=>(c.achat||c.compta)&&(c.marchand||c.carte));
    if(exacts.length===1){used.add(exacts[0].o._row);actions.push({kind:'replace',n,o:exacts[0].o,score:exacts[0].score,raison:'date+montant+identité'});return;}
    if(exacts.length>1){actions.push({kind:'ambiguous',n,candidates:exacts.slice(0,5),raison:'plusieurs correspondances fortes'});return;}
    const dates=all.filter(c=>c.achat||c.compta);
    if(dates.length===1){used.add(dates[0].o._row);actions.push({kind:'replace',n,o:dates[0].o,score:dates[0].score,raison:'date+montant uniques'});return;}
    if(dates.length>1){actions.push({kind:'ambiguous',n,candidates:dates.slice(0,5),raison:'même date et montant plusieurs fois'});return;}
    const forts=all.filter(c=>c.score>=75);
    if(forts.length===1){used.add(forts[0].o._row);actions.push({kind:'replace',n,o:forts[0].o,score:forts[0].score,raison:'score fort unique'});return;}
    if(all.length){actions.push({kind:'ambiguous',n,candidates:all.slice(0,5),raison:'montant déjà présent sans identité suffisante'});return;}
    actions.push({kind:'create',n,raison:'aucun montant correspondant'});
  });
  return actions;
}
function preparerFluxV2_(lignes,compte){
  const recus=(lignes||[]),valides=[],rejetes=[];
  recus.forEach((x,i)=>{const n=normaliserEntreeBancaire_(Object.assign({},x,{compte:x.compte||compte}),'flux');if(n.compte&&Number.isFinite(n.montant)&&n.date_comptable)valides.push(n);else rejetes.push({index:i+1,libelle:x.libelle_bancaire||x.details||x.libelle||'',montant:x.montant||'',raison:!n.date_comptable?'date comptable absente':(!n.compte?'compte absent':'montant invalide')});});
  return{valides,rejetes,recuesBrutes:recus.length};
}
function analyserFluxBancaireAvantImportV2(lignes,compte){
  const prep=preparerFluxV2_(lignes,compte),incoming=prep.valides,ctl=controlerLotBancaire_(incoming,null),ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),actions=planifierFluxV2_(incoming,ops);
  const amb=actions.filter(a=>a.kind==='ambiguous'),crea=actions.filter(a=>a.kind==='create'),remp=actions.filter(a=>a.kind==='replace');
  return{version:BANKING_SAFETY_V2,controle:ctl,recues:incoming.length,recuesBrutes:prep.recuesBrutes,rejetees:prep.rejetes.length,detailsRejetees:prep.rejetes,existantes:remp.length,nouvelles:crea.length,ambigues:amb.length,pret:amb.length===0&&prep.rejetes.length===0,detailsNouvelles:crea.slice(0,20).map(a=>({date:isoJourBanque_(a.n.date_achat||a.n.date),montant:a.n.montant,libelle:a.n.libelle_bancaire})),detailsAmbigues:amb.slice(0,20).map(a=>({date:isoJourBanque_(a.n.date_achat||a.n.date),montant:a.n.montant,libelle:a.n.libelle_bancaire,raison:a.raison,candidats:a.candidates.map(c=>({id:c.o.id,date:isoJourBanque_(c.o.date_achat||c.o.date),libelle:c.o.libelle_bancaire||c.o.libelle,score:c.score}))}))};
}
function importerFluxBancaireControleV2(lignes,compte){
  const prep=preparerFluxV2_(lignes,compte),incoming=prep.valides;if(prep.rejetes.length)throw new Error('Import refusé : '+prep.rejetes.length+' ligne(s) rejetée(s) au pré-contrôle.');const ctl=controlerLotBancaire_(incoming,null);if(!ctl.nombre)throw new Error('Aucune opération exploitable.');
  const lock=LockService.getDocumentLock();lock.waitLock(30000);let backup=null;
  try{
    const ss=SpreadsheetApp.getActiveSpreadsheet(),f=ss.getSheetByName('Operations'),headers=assurerColonnesBancaires_(),ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),avant=checksumOperationsBanque_(ops),actions=planifierFluxV2_(incoming,ops),amb=actions.filter(a=>a.kind==='ambiguous');
    if(amb.length)return{recues:incoming.length,creees:actions.filter(a=>a.kind==='create').length,remplacees:actions.filter(a=>a.kind==='replace').length,ambigues:amb.length,bloque:true,message:'Import bloqué : '+amb.length+' ambiguïté(s). Aucune écriture.'};
    const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');backup=f.copyTo(ss).setName(('Operations_avant_flux_'+stamp).slice(0,99));
    const parRow=new Map(ops.map((o,i)=>[o._row,i]));actions.forEach(a=>{if(a.kind==='replace'){const idx=parRow.get(a.o._row),old=ops[idx],n=a.n;if(String(old.statut_bancaire)==='definitif'){a.kind='ignored-definitive';return;}ops[idx]=Object.assign({},old,{date:n.date,date_comptable:n.date_comptable,date_achat:n.date_achat,libelle_bancaire:n.libelle_bancaire,marchand_normalise:n.marchand_normalise,carte_fin:n.carte_fin,source_bancaire:'flux',statut_bancaire:'provisoire',modifie_le:new Date()});}else{const now=new Date(),out=Object.assign({id:Utilities.getUuid(),categorie:'',commentaire:'',cree_le:now,modifie_le:now},a.n);a.newId=out.id;ops.push(out);}});
    const vals=ops.map(o=>serialiserOpBancaire_(o,headers));f.clearContents();f.getRange(1,1,1,headers.length).setValues([headers]);if(vals.length)f.getRange(2,1,vals.length,headers.length).setValues(vals);SpreadsheetApp.flush();
    const apresOps=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),apres=checksumOperationsBanque_(apresOps),expected=actions.filter(a=>a.kind==='create').length,err=[];
    if(apres.nombre!==avant.nombre+expected)err.push('nombre');if(apres.ids!==apres.nombre)err.push('IDs');
    if(err.length){f.clearContents();const bv=backup.getDataRange().getValues();f.getRange(1,1,bv.length,bv[0].length).setValues(bv);SpreadsheetApp.flush();throw new Error('Contrôle après écriture échoué ('+err.join(', ')+') ; restauration automatique effectuée.');}
    return{recues:incoming.length,creees:expected,remplacees:actions.filter(a=>a.kind==='replace').length,ambigues:0,ignorees:actions.filter(a=>a.kind==='ignored-definitive').length,bloque:false,controle:ctl,sauvegarde:backup.getName()};
  }finally{lock.releaseLock();}
}
