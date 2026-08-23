const HELLOBANK_CLIPBOARD_V3='3.4';

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

function hb3CarteFin_(texte){
  const s=String(texte||'');
  const m=s.match(/\b(?:CARTE|CARD)\s+\d{0,8}[Xx*]{4,}(\d{4})\b/i)||s.match(/\b\d{0,8}[Xx*]{4,}(\d{4})\b/);
  return m?m[1]:'';
}
function hb3Contrepartie_(texte){
  const brut=String(texte||'').replace(/\s+/g,' ').trim();if(!brut)return'';
  let m;
  if(/^paiement\s+cb\b/i.test(brut)){
    let s=brut.replace(/^paiement\s+cb\s+du\s+\d{6}\s+/i,'');
    s=s.replace(/\s+carte\s+\d{0,8}[Xx*]{4,}\d{4}.*$/i,'').replace(/\s+(?:fra|irl|nld|esp|deu)\s+\d+[,.]\d{2}\s*eur.*$/i,'').trim();
    return normaliserTexteBanqueFiable_(s).slice(0,90);
  }
  m=brut.match(/^virement\s+instantane\s+emis\b.*?\/ben\s+(.+?)(?:\s+\/refdo\b|\s+\/refben\b|$)/i);
  if(m)return normaliserTexteBanqueFiable_(m[1]).slice(0,90);
  m=brut.match(/^virement(?:\s+instantane)?\s+recu\b.*?\/de\s+(.+?)(?:\s+\/ref\b|\s+\/motif\b|$)/i);
  if(m)return normaliserTexteBanqueFiable_(m[1]).slice(0,90);
  m=brut.match(/^virement\s+\/de\s+(.+?)(?:\s+\/motif\b|\s+\/ref\b|$)/i);
  if(m)return normaliserTexteBanqueFiable_(m[1]).slice(0,90);
  m=brut.match(/^prelevement\s+(.+?)(?:\s+ech\/|$)/i);
  if(m)return normaliserTexteBanqueFiable_(m[1]).slice(0,90);
  if(/^retrait\s+distributeur\b/i.test(brut)){
    m=brut.match(/\b(?:banque|bnp|credit|cr[eé]dit)\s+(.+?)(?:\s+\d{6,}|$)/i);
    return normaliserTexteBanqueFiable_(m?m[0]:'retrait distributeur').slice(0,90);
  }
  if(/^remise\s+cheques?\b/i.test(brut))return 'remise cheques';
  if(/^commissions?\b/i.test(brut))return normaliserTexteBanqueFiable_(brut.replace(/^commissions?\s+/i,'')).slice(0,90);
  const fallback=normaliserTexteBanqueFiable_(marchandBanque_(brut,brut)||'').slice(0,90);
  return fallback||normaliserTexteBanqueFiable_(brut).slice(0,90);
}
function hb3LibelleLisible_(texte,contrepartie){
  const brut=String(texte||'').trim(),cp=String(contrepartie||'').trim();
  const joli=cp?(typeof titreLibelle==='function'?titreLibelle(cp):cp):'';
  if(/^virement\s+instantane\s+emis\b/i.test(brut)&&joli)return 'Virement à '+joli;
  if(/^virement(?:\s+instantane)?\s+recu\b/i.test(brut)&&joli)return 'Virement reçu de '+joli;
  if(/^virement\s+\/de\b/i.test(brut)&&joli)return 'Virement reçu de '+joli;
  if(/^prelevement\b/i.test(brut)&&joli)return 'Prélèvement '+joli;
  if(/^retrait\s+distributeur\b/i.test(brut))return joli&&joli!=='Retrait Distributeur'?'Retrait '+joli:'Retrait distributeur';
  if(/^remise\s+cheques?\b/i.test(brut))return 'Remise de chèques';
  if(/^commissions?\b/i.test(brut)&&joli)return 'Commission '+joli;
  return joli||(typeof titreLibelle==='function'?titreLibelle(brut):brut);
}

// Le parseur V3 historique reste disponible pour les variantes contenant explicitement
// "Débitée/Créditée le". Le copier-coller courant de Hello bank est toutefois mieux
// découpé par analyserCollerHelloBank(), qui sait gérer les en-têtes de jours.
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
      const carte=hb3CarteFin_(lib),contrepartie=hb3Contrepartie_(lib),libelleLisible=hb3LibelleLisible_(lib,contrepartie);
      out.push({compte:String(compte||''),date:da||dc,date_achat:da,date_comptable:dc,libelle_bancaire:lib,libelle:libelleLisible,marchand_normalise:contrepartie,carte_fin:carte,montant:signed,type:signed<0?'depense':'revenu',source_bancaire:'flux',statut_bancaire:'provisoire'});
      lib='';continue;
    }
    lib=s;
  }
  return out;
}

// Pont V3.4 : on conserve le découpage éprouvé du parseur HelloBankPaste (199 lignes
// sur le jeu de test), puis on enrichit sans toucher au libellé bancaire brut N.
function analyserCollerHelloBankEnrichiV34(texte,compte){
  const legacy=analyserCollerHelloBank(texte,compte),lignes=(legacy.lignes||[]).map(x=>{
    const brut=String(x.libelle||'').trim();
    const dc=String(x.date||'');
    const da=String(x.dateAchat||'')||isoJourBanque_(hb3Achat_(brut));
    const cp=hb3Contrepartie_(brut),carte=hb3CarteFin_(brut);
    const signed=String(x.type||'').toLowerCase()==='depense'?-Math.abs(Number(x.montant||0)):Math.abs(Number(x.montant||0));
    return {date:da||dc,date_comptable:dc,date_achat:da||'',libelle:hb3LibelleLisible_(brut,cp),libelle_bancaire:brut,marchand_normalise:cp,carte_fin:carte,montant:signed,type:signed<0?'depense':'revenu',compte:String(compte||''),source_bancaire:'flux',statut_bancaire:'provisoire'};
  });
  return {version:HELLOBANK_CLIPBOARD_V3,lignes:lignes,total:lignes.length,legacy:{total:legacy.total,importables:legacy.importables,doublons:legacy.doublons,avantReleve:legacy.avantReleve}};
}

function hb3Identity_(o){
  const amount=centimesBanque_(o.montant),achat=isoJourBanque_(o.date_achat||o.date),carte=String(o.carte_fin||''),march=normaliserTexteBanqueFiable_(o.marchand_normalise||hb3Contrepartie_(o.libelle_bancaire||o.libelle)).replace(/\s/g,'').slice(0,60);
  if(carte)return ['CB',String(o.compte||''),achat,amount,carte,march].join('|');
  const raw=normaliserTexteBanqueFiable_(o.libelle_bancaire||o.libelle).replace(/\s/g,'').slice(0,120);
  return ['OP',String(o.compte||''),isoJourBanque_(o.date_comptable||o.date),amount,raw].join('|');
}

function hb3ReparerEnrichissementFlux_(lignes,compte){
  const signatures={};
  (lignes||[]).forEach(o=>{const k=[isoJourBanque_(o.date_comptable||o.date),centimesBanque_(o.montant),normaliserTexteBanqueFiable_(o.libelle_bancaire||o.libelle)].join('|');signatures[k]=(signatures[k]||0)+1;});
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations'),headers=assurerColonnesBancaires_(),ops=lireOperationsBancaires_();let n=0;
  ops.forEach(o=>{
    if(String(o.compte||'')!==String(compte||''))return;
    if(String(o.source_bancaire||'').toLowerCase()!=='flux'||String(o.statut_bancaire||'').toLowerCase()!=='provisoire')return;
    const k=[isoJourBanque_(o.date_comptable||o.date),centimesBanque_(o.montant),normaliserTexteBanqueFiable_(o.libelle_bancaire||o.libelle)].join('|');if(!signatures[k])return;
    const brut=String(o.libelle_bancaire||'').trim(),da=hb3Achat_(brut)||'',cp=hb3Contrepartie_(brut);
    o.date_achat=da;o.date=da||o.date_comptable||o.date;o.carte_fin=hb3CarteFin_(brut);o.marchand_normalise=cp;o.libelle=hb3LibelleLisible_(brut,cp);
    if(typeof cleTransactionUnique_==='function')o.cle_rapprochement=cleTransactionUnique_(o);else o.cle_rapprochement=cleBanqueFiable_(o,1,1)+'|ID:'+String(o.id||Utilities.getUuid());n++;
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
  const res=upsertOperationsBancairesTransactionnel(nouvelles,compte,'flux',null),enrichies=hb3ReparerEnrichissementFlux_(nouvelles,compte);
  return Object.assign({ok:true,existantes:sim.existantes,enrichies:enrichies},res);
}
