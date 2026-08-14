const HELLOBANK_CLIPBOARD_V3='3.1';

function hb3Date_(s){
  const m=String(s||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);if(!m)return'';
  return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12,0,0,0);
}
function hb3Achat_(s){
  const m=String(s||'').match(/\b(?:CB\s+)?DU\s+(\d{2})(\d{2})(\d{2})\b/i);if(!m)return'';
  return new Date(2000+Number(m[3]),Number(m[2])-1,Number(m[1]),12,0,0,0);
}
function hb3Montant_(s){
  const m=String(s||'').replace(/\u00a0/g,' ').match(/([+\-−]?\s*\d[\d ]*,\d{2})\s*€/);if(!m)return NaN;
  let t=m[1].replace(/\s/g,'').replace('−','-').replace(',','.');return Number(t);
}
function hb3Ignorer_(s){return !s||/^cat[ée]gorie\s*libell[ée]\s*montant(?:\s*pointage)?$/i.test(s)||/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(s);}
function hb3Parser_(texte,compte){
  const lines=String(texte||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),out=[];let lib='';
  for(let i=0;i<lines.length;i++){
    const s=lines[i];if(hb3Ignorer_(s))continue;
    if(/^D[ée]bit[ée]e?\s+le\s+/i.test(s)||/^Cr[ée]dit[ée]e?\s+le\s+/i.test(s))continue;
    const amount=hb3Montant_(s);
    if(Number.isFinite(amount)){
      let debitLine='',j=i-1;while(j>=0&&hb3Ignorer_(lines[j]))j--;
      if(j>=0&&/^(D[ée]bit[ée]e?|Cr[ée]dit[ée]e?)\s+le\s+/i.test(lines[j])){debitLine=lines[j];j--;}
      while(j>=0&&hb3Ignorer_(lines[j]))j--;
      if(j>=0)lib=lines[j];
      const dc=hb3Date_(debitLine),da=hb3Achat_(lib)||'';
      if(!dc||!lib)continue;
      const signed=/^Cr[ée]dit/i.test(debitLine)?Math.abs(amount):-Math.abs(amount);
      const carte=extraireCarteFinBanque_(lib),marchand=marchandBanque_(lib,lib);
      out.push({compte:String(compte||''),date:da||dc,date_achat:da,date_comptable:dc,libelle_bancaire:lib,libelle:titreLibelle(marchand||lib),marchand_normalise:marchand,carte_fin:carte,montant:signed,type:signed<0?'depense':'revenu',source_bancaire:'flux',statut_bancaire:'provisoire'});
      lib='';continue;
    }
    lib=s;
  }
  return out;
}
function hb3Identity_(o){
  const amount=centimesBanque_(o.montant),achat=isoJourBanque_(o.date_achat||o.date),carte=String(o.carte_fin||''),march=normaliserTexteBanqueFiable_(o.marchand_normalise||marchandBanque_(o.libelle_bancaire,o.libelle)).replace(/\s/g,'').slice(0,60);
  if(carte)return ['CB',String(o.compte||''),achat,amount,carte,march].join('|');
  const raw=normaliserTexteBanqueFiable_(o.libelle_bancaire||o.libelle).replace(/\s/g,'').slice(0,120);
  return ['OP',String(o.compte||''),isoJourBanque_(o.date_comptable||o.date),amount,raw].join('|');
}

// Le moteur transactionnel historique complète date_achat par date_comptable lorsqu'elle
// est absente. Après écriture du flux, on rétablit la sémantique du schéma actuel :
// date_achat n'existe que lorsqu'une vraie date d'achat est fournie par le site bancaire.
function hb3ReparerDatesAchatFlux_(lignes,compte){
  const sansAchat=(lignes||[]).filter(o=>!o.date_achat&&!hb3Achat_(o.libelle_bancaire||o.libelle));
  if(!sansAchat.length)return 0;
  const signatures={};
  sansAchat.forEach(o=>{const k=[isoJourBanque_(o.date_comptable||o.date),centimesBanque_(o.montant),normaliserTexteBanqueFiable_(o.libelle_bancaire||o.libelle)].join('|');signatures[k]=(signatures[k]||0)+1;});
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations'),headers=assurerColonnesBancaires_(),ops=lireOperationsBancaires_();
  let n=0;
  ops.forEach(o=>{
    if(String(o.compte||'')!==String(compte||''))return;
    if(String(o.source_bancaire||'').toLowerCase()!=='flux'||String(o.statut_bancaire||'').toLowerCase()!=='provisoire')return;
    const k=[isoJourBanque_(o.date_comptable||o.date),centimesBanque_(o.montant),normaliserTexteBanqueFiable_(o.libelle_bancaire||o.libelle)].join('|');
    if(!signatures[k])return;
    o.date_achat='';
    o.date=o.date_comptable||o.date;
    n++;
  });
  if(n){const values=ops.map(o=>serialiserOpBancaire_(o,headers));f.clearContents();f.getRange(1,1,1,headers.length).setValues([headers]);if(values.length)f.getRange(2,1,values.length,headers.length).setValues(values);f.setFrozenRows(1);SpreadsheetApp.flush();}
  return n;
}

function analyserCollerHelloBankV3(texte,compte){
  const lignes=hb3Parser_(texte,compte),ctl=controlerLotBancaire_(lignes,null),ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),index={};
  ops.filter(o=>String(o.compte||'')===String(compte||'')).forEach(o=>{const k=hb3Identity_(o);(index[k]||(index[k]=[])).push(o);});
  let existantes=0,nouvelles=0,ambigues=0;const details=[];
  lignes.forEach(n=>{const c=index[hb3Identity_(n)]||[];if(c.length===1)existantes++;else if(c.length>1){ambigues++;details.push({libelle:n.libelle_bancaire,montant:n.montant,candidats:c.length});}else nouvelles++;});
  return {version:HELLOBANK_CLIPBOARD_V3,controle:ctl,recues:lignes.length,existantes,nouvelles,ambigues,pret:lignes.length>0&&ambigues===0,lignes:lignes.map(o=>({date:isoJourBanque_(o.date),date_achat:isoJourBanque_(o.date_achat),date_comptable:isoJourBanque_(o.date_comptable),libelle:o.libelle,libelle_bancaire:o.libelle_bancaire,marchand_normalise:o.marchand_normalise,carte_fin:o.carte_fin,montant:o.montant,type:o.type,compte:o.compte,source_bancaire:o.source_bancaire,statut_bancaire:o.statut_bancaire})),detailsAmbigues:details.slice(0,30),lectureSeule:true};
}
function importerCollerHelloBankV3(texte,compte){
  const sim=analyserCollerHelloBankV3(texte,compte);if(!sim.pret)throw new Error('Import refusé : simulation vide ou ambiguë.');
  const lignes=hb3Parser_(texte,compte),ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),existing=new Map();ops.filter(o=>String(o.compte||'')===String(compte||'')).forEach(o=>existing.set(hb3Identity_(o),o));
  const nouvelles=lignes.filter(n=>!existing.has(hb3Identity_(n)));if(!nouvelles.length)return{ok:true,creees:0,existantes:lignes.length,message:'Import idempotent : aucune nouvelle opération.'};
  const res=upsertOperationsBancairesTransactionnel(nouvelles,compte,'flux',null);
  const datesAchatVides=hb3ReparerDatesAchatFlux_(nouvelles,compte);
  return Object.assign({ok:true,existantes:sim.existantes,dates_achat_vides:datesAchatVides},res);
}
