const BANKING_DATE_REPAIR_VERSION='1.0';

function bdrJour_(v){
  if(!v)return '';
  const d=v instanceof Date?new Date(v):new Date(v);
  if(isNaN(d))return '';
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function bdrCents_(v){return Math.round(Math.abs(Number(v||0))*100);}
function bdrNorm_(s){return normaliserTexteBanqueFiable_(s||'');}
function bdrDayDiff_(a,b){
  const da=a instanceof Date?a:new Date(a), db=b instanceof Date?b:new Date(b);
  if(isNaN(da)||isNaN(db))return 9999;
  const ua=Date.UTC(da.getFullYear(),da.getMonth(),da.getDate());
  const ub=Date.UTC(db.getFullYear(),db.getMonth(),db.getDate());
  return Math.round((ua-ub)/86400000);
}
function bdrIsCard_(o){
  const s=String((o&&(o.libelle_bancaire||o.libelle))||'');
  return /\b(?:paiement\s+)?cb\b/i.test(s)||!!(o&&o.carte_fin);
}
function bdrSignatureCard_(o){
  return [
    bdrCents_(o.montant),
    bdrJour_(o.date_achat||extraireDateAchatBanque_(o.libelle_bancaire||o.libelle)||''),
    bdrNorm_(o.marchand_normalise||marchandBanque_(o.libelle_bancaire||o.libelle,o.libelle)),
    String(o.carte_fin||extraireCarteFinBanque_(o.libelle_bancaire||o.libelle)||'')
  ].join('|');
}
function bdrScoreNonCard_(n,o){
  if(bdrCents_(n.montant)!==bdrCents_(o.montant))return -999;
  const diff=Math.abs(bdrDayDiff_(n.date_comptable||n.date,o.date_comptable||o.date));
  if(diff>2)return -999;
  let s=diff===0?35:(diff===1?30:18);
  const nl=bdrNorm_(n.libelle_bancaire||n.libelle),ol=bdrNorm_(o.libelle_bancaire||o.libelle);
  if(nl&&ol){
    if(nl===ol)s+=55;
    else if(nl.includes(ol)||ol.includes(nl))s+=42;
    else{
      const a=nl.split(' ').filter(w=>w.length>=4),bs=new Set(ol.split(' ').filter(w=>w.length>=4));
      s+=Math.min(35,a.filter(w=>bs.has(w)).length*7);
    }
  }
  return s;
}
function bdrPrepare_(lignes,compte){
  return (lignes||[]).map(x=>normaliserEntreeBancaire_(Object.assign({},x,{compte:x.compte||compte}),'flux'))
    .filter(x=>x.compte&&Number.isFinite(x.montant)&&x.date_comptable);
}

function simulerCorrectionDatesComptablesV1(lignes,compte){
  verifierInitialisation_();
  const incoming=bdrPrepare_(lignes,compte);
  const ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_)
    .filter(o=>String(o.compte||'')===String(compte));
  const used=new Set(),matches=[],ambigues=[],introuvables=[];
  const inCards={},exCards={};

  incoming.forEach((n,i)=>{if(!bdrIsCard_(n))return;const k=bdrSignatureCard_(n);(inCards[k]||(inCards[k]=[])).push({n,i});});
  ops.forEach(o=>{if(!bdrIsCard_(o))return;const k=bdrSignatureCard_(o);(exCards[k]||(exCards[k]=[])).push(o);});

  Object.keys(inCards).forEach(k=>{
    const ins=inCards[k],ex=(exCards[k]||[]).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    if(ex.length===ins.length&&ex.length){
      ins.forEach((x,j)=>{const o=ex[j];used.add(String(o.id));matches.push({n:x.n,o,raison:'CB : achat + montant + marchand + carte'});});
    }else if(ex.length){
      ambigues.push({type:'CB',signature:k,recues:ins.length,candidats:ex.length,libelle:ins[0].n.libelle_bancaire||ins[0].n.libelle,montant:ins[0].n.montant});
    }else{
      ins.forEach(x=>introuvables.push({type:'CB',n:x.n,raison:'aucun candidat CB'}));
    }
  });

  incoming.forEach(n=>{
    if(bdrIsCard_(n))return;
    const poss=ops.filter(o=>!used.has(String(o.id))&&!bdrIsCard_(o))
      .map(o=>({o,score:bdrScoreNonCard_(n,o)}))
      .filter(x=>x.score>=65).sort((a,b)=>b.score-a.score);
    if(poss.length===1||(poss.length>1&&poss[0].score-poss[1].score>=15)){
      used.add(String(poss[0].o.id));
      matches.push({n,o:poss[0].o,raison:'hors CB : montant + libellé + date proche',score:poss[0].score});
    }else if(poss.length>1){
      ambigues.push({type:'HORS_CB',libelle:n.libelle_bancaire||n.libelle,montant:n.montant,dateComptable:bdrJour_(n.date_comptable),
        candidats:poss.slice(0,5).map(x=>({id:x.o.id,libelle:x.o.libelle_bancaire||x.o.libelle,date:bdrJour_(x.o.date_comptable||x.o.date),score:x.score}))});
    }else{
      introuvables.push({type:'HORS_CB',n,raison:'aucun candidat suffisamment sûr'});
    }
  });

  const corrections=matches.filter(m=>bdrJour_(m.o.date_comptable||m.o.date)!==bdrJour_(m.n.date_comptable));
  const controle=controlerLotBancaire_(incoming,null);

  return {
    version:BANKING_DATE_REPAIR_VERSION,
    recues:(lignes||[]).length,
    exploitables:incoming.length,
    controle,
    appariees:matches.length,
    dejaBonnes:matches.length-corrections.length,
    aCorriger:corrections.length,
    ambigues:ambigues.length,
    introuvables:introuvables.length,
    pret:incoming.length===(lignes||[]).length&&matches.length===incoming.length&&ambigues.length===0&&introuvables.length===0,
    corrections:corrections.slice(0,200).map(m=>({
      id:String(m.o.id||''),libelle:String(m.o.libelle_bancaire||m.o.libelle||''),montant:Number(m.o.montant),
      ancienneDate:bdrJour_(m.o.date_comptable||m.o.date),nouvelleDate:bdrJour_(m.n.date_comptable),raison:m.raison
    })),
    detailsAmbigues:ambigues.slice(0,50),
    detailsIntrouvables:introuvables.slice(0,50).map(x=>({
      type:x.type,libelle:String(x.n.libelle_bancaire||x.n.libelle||''),montant:Number(x.n.montant),
      dateComptable:bdrJour_(x.n.date_comptable),raison:x.raison
    })),
    lectureSeule:true
  };
}

function appliquerCorrectionDatesComptablesV1(lignes,compte){
  const simulation=simulerCorrectionDatesComptablesV1(lignes,compte);
  if(!simulation.pret)throw new Error('Correction refusée : simulation non parfaite.');

  const correctionById=new Map(simulation.corrections.map(c=>[String(c.id),c]));
  const ss=SpreadsheetApp.getActiveSpreadsheet(),f=ss.getSheetByName('Operations');
  const lock=LockService.getDocumentLock();lock.waitLock(30000);
  let backup=null;
  try{
    const avant=checksumOperationsBanque_(lireOperationsBancaires_());
    const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
    backup=f.copyTo(ss).setName(('Operations_avant_dates_'+stamp).slice(0,99));
    const headers=assurerColonnesBancaires_(),idxId=headers.indexOf('id'),idxDC=headers.indexOf('date_comptable');
    if(idxId<0||idxDC<0)throw new Error('Colonnes id/date_comptable introuvables.');

    const values=f.getRange(2,1,f.getLastRow()-1,headers.length).getValues();
    let modifiees=0;
    values.forEach(row=>{
      const c=correctionById.get(String(row[idxId]||''));if(!c)return;
      const p=c.nouvelleDate.split('-').map(Number);row[idxDC]=new Date(p[0],p[1]-1,p[2],12);modifiees++;
    });
    if(modifiees!==simulation.aCorriger)throw new Error('Nombre de lignes à modifier incohérent.');
    if(values.length)f.getRange(2,1,values.length,headers.length).setValues(values);
    SpreadsheetApp.flush();

    const apres=checksumOperationsBanque_(lireOperationsBancaires_());
    if(apres.nombre!==avant.nombre||apres.ids!==avant.ids||Math.abs(apres.debits-avant.debits)>0.001||Math.abs(apres.credits-avant.credits)>0.001){
      f.clearContents();const b=backup.getDataRange().getValues();f.getRange(1,1,b.length,b[0].length).setValues(b);SpreadsheetApp.flush();
      throw new Error('Contrôle après écriture échoué : restauration automatique effectuée.');
    }
    return {ok:true,modifiees,sauvegarde:backup.getName(),avant,apres};
  }finally{lock.releaseLock();}
}
