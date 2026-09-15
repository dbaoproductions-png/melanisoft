const CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION='2026-09-15.6';
const CREDIT_AMORTIZATION_SHEET_20260915='Amortissements_credits';
const CREDIT_AMORTIZATION_HEADERS_20260915=['id','credit_id','credit_nom','charge_fixe_id','operation_id','date_operation','montant_echeance','part_capital','part_interets','part_assurance','capital_avant','capital_apres','echeances_avant','echeances_apres','prochaine_echeance_avant','prochaine_echeance_apres','methode','statut','version','date_traitement'];

function arrCreditAmort20260915_(n){return Math.round(Number(n||0)*100)/100;}
function texteCreditAmort20260915_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function nombreCreditAmort20260915_(v){const n=Number(String(v==null?'':v).replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:0;}

function assurerJournalAmortissementsCredits20260915_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();let sh=ss.getSheetByName(CREDIT_AMORTIZATION_SHEET_20260915);
  if(!sh)sh=ss.insertSheet(CREDIT_AMORTIZATION_SHEET_20260915);
  if(sh.getLastRow()===0)sh.getRange(1,1,1,CREDIT_AMORTIZATION_HEADERS_20260915.length).setValues([CREDIT_AMORTIZATION_HEADERS_20260915]);
  const largeur=Math.max(1,sh.getLastColumn()),presentes=sh.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim()),manquantes=CREDIT_AMORTIZATION_HEADERS_20260915.filter(h=>!presentes.includes(h));
  if(manquantes.length)sh.getRange(1,largeur+1,1,manquantes.length).setValues([manquantes]);
  sh.setFrozenRows(1);return sh;
}

function lireJournalAmortissementsCredits20260915_(){
  const sh=assurerJournalAmortissementsCredits20260915_();if(sh.getLastRow()<2)return[];
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(v=>String(v||'').trim()),rows=sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
  return rows.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>{const o={};h.forEach((k,i)=>{if(k)o[k]=r[i] instanceof Date?r[i].toISOString():r[i];});return o;});
}

function tokensCreditAmort20260915_(v){return new Set(texteCreditAmort20260915_(v).split(' ').filter(x=>x.length>=4&&!['CREDIT','PRELEVEMENT','MENSUALITE','ECHEANCE','CARTE','BANQUE'].includes(x)));}
function scoreCreditCharge20260915_(charge,credit){
  const tc=texteCreditAmort20260915_([charge&&charge.libelle,charge&&charge.libelle_bancaire,charge&&charge.commentaire].join(' '));
  const tr=texteCreditAmort20260915_([credit&&credit.nom,credit&&credit.numero_pret,credit&&credit.commentaire].join(' '));
  const marques=[['ACCESSIO','ACCESSIO'],['CASDEN','CASDEN'],['CREATIS','CREATIS'],['CARREFOUR PASS','CARREFOUR PASS'],['FLOA','FLOA'],['CDISCOUNT','CDISCOUNT'],['ONEY','ONEY']];
  for(const pair of marques)if(tc.includes(pair[0])&&tr.includes(pair[1]))return 100;
  if(tc.includes('COFIDIS')&&tr.includes('COFIDIS')&&!tc.includes('ACCESSIO')&&!tr.includes('ACCESSIO'))return 95;
  const a=tokensCreditAmort20260915_(tc),b=tokensCreditAmort20260915_(tr);let commun=0;a.forEach(x=>{if(b.has(x))commun++;});
  const montantCharge=Math.abs(Number(charge&&charge.montant||0)),mens=Math.abs(Number(credit&&credit.mensualite||0)),proche=mens>0&&Math.abs(montantCharge-mens)<=Math.max(1,mens*.04);
  return commun*20+(proche?15:0);
}

function trouverCreditPourChargeFixe20260915_(charge,credits){
  const candidats=(credits||[]).map(c=>({credit:c,score:scoreCreditCharge20260915_(charge,c)})).filter(x=>x.score>=35).sort((a,b)=>b.score-a.score);
  if(!candidats.length)return{ok:false,raison:'aucun_credit_correspondant',candidats:[]};
  if(candidats.length>1&&candidats[0].score===candidats[1].score)return{ok:false,raison:'credit_ambigu',candidats:candidats.slice(0,3).map(x=>({id:x.credit.id,nom:x.credit.nom,score:x.score}))};
  return{ok:true,credit:candidats[0].credit,score:candidats[0].score};
}

function tauxMensuelCredit20260915_(credit){
  const commentaire=String(credit&&credit.commentaire||''),mTna=commentaire.match(/(?:TNA|TAUX\s+NOMINAL)[^0-9]{0,12}(\d+(?:[,.]\d+)?)\s*%/i);
  if(mTna){const annuel=nombreCreditAmort20260915_(mTna[1])/100;return{tauxMensuel:annuel/12,methode:'TNA/12',tauxAnnuel:annuel};}
  const annuel=Math.max(0,Number(credit&&credit.taux||0))/100;
  return{tauxMensuel:annuel>0?Math.pow(1+annuel,1/12)-1:0,methode:'TAEG_effectif_mensualise',tauxAnnuel:annuel};
}

function montantExpliciteAvantLibelleCredit20260915_(texte,libelle){
  const source=String(texte||'');
  const patterns={
    capital:/(\d+(?:[,.]\d+)?)\s*€?\s*(?:de\s+|d['’]\s*)capital\b/i,
    interets:/(\d+(?:[,.]\d+)?)\s*€?\s*(?:d['’]\s*|de\s+)int[éeê]r[éeê]ts?\b/i,
    assurance:/(\d+(?:[,.]\d+)?)\s*€?\s*(?:d['’]\s*|de\s+)assurance\b/i
  };
  const m=source.match(patterns[libelle]);
  return m?nombreCreditAmort20260915_(m[1]):null;
}

function dateOperationCredit20260915_(operation){
  if(!operation)return null;const d=new Date(operation.date_comptable||operation.date||operation.date_operation||0);return isNaN(d)?null:d;
}
function memeJourCredit20260915_(a,b){return !!(a&&b)&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function dateVentilationCommentaireCredit20260915_(texte){
  const source=String(texte||'');
  const motifs=[/(?:prochain\s+pr[ée]l[èe]vement|[ée]ch[ée]ance)(?:\s+du)?\s*(\d{1,2})\/(\d{1,2})\/(20\d{2})[^.]{0,180}(?:capital|int[éeê]r[éeê]ts?|assurance)/i,/(\d{1,2})\/(\d{1,2})\/(20\d{2})[^.]{0,180}(?:capital|int[éeê]r[éeê]ts?|assurance)/i];
  for(const r of motifs){const m=source.match(r);if(m){const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12);if(!isNaN(d))return d;}}
  return null;
}

function ventilationExpliciteCredit20260915_(credit,montantOperation,operation){
  const montant=arrCreditAmort20260915_(Math.abs(Number(montantOperation||0)));
  if(!credit||montant<=0)return null;
  const champs=[['part_capital','part_interets','part_assurance'],['capital_echeance','interets_echeance','assurance_echeance']];
  for(const c of champs){
    const brutCap=credit[c[0]],brutInt=credit[c[1]],brutAss=credit[c[2]],aPresent=brutAss!==''&&brutAss!=null;
    if(brutCap!==''&&brutCap!=null&&brutInt!==''&&brutInt!=null){
      const cap=Math.max(0,nombreCreditAmort20260915_(brutCap)),interets=Math.max(0,nombreCreditAmort20260915_(brutInt)),assurance=aPresent?Math.max(0,nombreCreditAmort20260915_(brutAss)):Math.max(0,Number(credit.assurance_mensuelle||0)),total=arrCreditAmort20260915_(cap+interets+assurance);
      if(Math.abs(total-montant)<=Math.max(.02,montant*.01))return{partCapital:arrCreditAmort20260915_(cap),partInterets:arrCreditAmort20260915_(interets),partAssurance:arrCreditAmort20260915_(assurance),methode:'ventilation_explicitement_structuree'};
    }
  }
  const texte=[credit.commentaire,credit.cout_restant_precision].filter(Boolean).join(' ');if(!texte)return null;
  const dateVentilation=dateVentilationCommentaireCredit20260915_(texte),dateOp=dateOperationCredit20260915_(operation);
  if(dateVentilation&&dateOp&&!memeJourCredit20260915_(dateVentilation,dateOp))return null;
  const capApres=texte.match(/(?:dont\s+)?(?:part\s+de\s+)?capital(?:\s+rembourse|\s+amorti)?[^0-9]{0,24}(\d+(?:[,.]\d+)?)\s*€?/i);
  const intApres=texte.match(/int[éeê]r[éeê]ts?[^0-9]{0,24}(\d+(?:[,.]\d+)?)\s*€?/i);
  const assApres=texte.match(/assurance[^0-9]{0,24}(\d+(?:[,.]\d+)?)\s*€?/i);
  const capAvant=montantExpliciteAvantLibelleCredit20260915_(texte,'capital'),intAvant=montantExpliciteAvantLibelleCredit20260915_(texte,'interets'),assAvant=montantExpliciteAvantLibelleCredit20260915_(texte,'assurance');
  const cap=capAvant!=null?capAvant:(capApres?nombreCreditAmort20260915_(capApres[1]):null),interets=intAvant!=null?intAvant:(intApres?nombreCreditAmort20260915_(intApres[1]):null);if(cap==null||interets==null)return null;
  const assurance=assAvant!=null?assAvant:(assApres?nombreCreditAmort20260915_(assApres[1]):Math.max(0,Number(credit.assurance_mensuelle||0))),total=arrCreditAmort20260915_(Math.max(0,cap)+Math.max(0,interets)+Math.max(0,assurance));
  if(Math.abs(total-montant)>Math.max(.02,montant*.01))return null;
  return{partCapital:arrCreditAmort20260915_(Math.max(0,cap)),partInterets:arrCreditAmort20260915_(Math.max(0,interets)),partAssurance:arrCreditAmort20260915_(Math.max(0,assurance)),methode:dateVentilation?'ventilation_explicite_commentaire_datee':'ventilation_explicite_commentaire'};
}

function prochaineEcheanceApresPaiement20260915_(credit,dateOperation){
  if(!credit||!credit.prochaine_echeance)return'';let d=new Date(credit.prochaine_echeance),op=new Date(dateOperation||0);if(isNaN(d)||isNaN(op))return credit.prochaine_echeance;
  while(d<=op){const jour=d.getDate(),x=new Date(d.getFullYear(),d.getMonth()+1,1,12),dernier=new Date(x.getFullYear(),x.getMonth()+1,0).getDate();d=new Date(x.getFullYear(),x.getMonth(),Math.min(jour,dernier),12);}
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}

function calculerAmortissementCredit20260915_(credit,operation){
  const capital=Math.max(0,Number(credit&&credit.capital_restant||0)),montant=Math.abs(Number(operation&&operation.montant||0));
  const exactCasden=typeof ventilationEcheancierCasden20260915_==='function'?ventilationEcheancierCasden20260915_(credit,operation):null;
  if(exactCasden){const partCapital=Math.min(capital,Math.max(0,exactCasden.partCapital));return{montant:arrCreditAmort20260915_(montant),partCapital:arrCreditAmort20260915_(partCapital),partInterets:arrCreditAmort20260915_(exactCasden.partInterets),partAssurance:arrCreditAmort20260915_(exactCasden.partAssurance),capitalAvant:arrCreditAmort20260915_(capital),capitalApres:arrCreditAmort20260915_(capital-partCapital),capitalApresTheorique:arrCreditAmort20260915_(exactCasden.capitalApresTheorique),methode:exactCasden.methode};}
  const explicite=ventilationExpliciteCredit20260915_(credit,montant,operation);
  if(explicite){const partCapital=Math.min(capital,Math.max(0,explicite.partCapital));return{montant:arrCreditAmort20260915_(montant),partCapital:arrCreditAmort20260915_(partCapital),partInterets:arrCreditAmort20260915_(explicite.partInterets),partAssurance:arrCreditAmort20260915_(explicite.partAssurance),capitalAvant:arrCreditAmort20260915_(capital),capitalApres:arrCreditAmort20260915_(capital-partCapital),methode:explicite.methode};}
  const assurance=Math.min(montant,Math.max(0,Number(credit&&credit.assurance_mensuelle||0))),tx=tauxMensuelCredit20260915_(credit),interets=Math.min(Math.max(0,montant-assurance),arrCreditAmort20260915_(capital*tx.tauxMensuel)),partCapital=Math.min(capital,Math.max(0,arrCreditAmort20260915_(montant-assurance-interets)));
  return{montant:arrCreditAmort20260915_(montant),partCapital,partInterets:arrCreditAmort20260915_(interets),partAssurance:arrCreditAmort20260915_(assurance),capitalAvant:arrCreditAmort20260915_(capital),capitalApres:arrCreditAmort20260915_(capital-partCapital),methode:tx.methode};
}

function appliquerAmortissementCreditDepuisRapprochement20260915_(chargeId,operationId){
  verifierInitialisation_();const cid=String(chargeId||''),oid=String(operationId||'');if(!cid||!oid)return{ok:false,applique:false,raison:'identifiants_manquants'};
  const lock=LockService.getDocumentLock();lock.waitLock(10000);let resultat;
  try{
    const journal=lireJournalAmortissementsCredits20260915_(),deja=journal.find(x=>String(x.operation_id)===oid&&String(x.statut)==='applique');if(deja)return{ok:true,applique:false,duplique:true,operation_id:oid,credit_id:String(deja.credit_id||'')};
    const charge=lireTable_('Charges_fixes').find(x=>String(x.id)===cid),operation=lireTable_('Operations').find(x=>String(x.id)===oid);if(!charge||!operation)return{ok:false,applique:false,raison:!charge?'charge_introuvable':'operation_introuvable'};
    const nature=texteCreditAmort20260915_([charge.nature,charge.categorie,charge.libelle].join(' '));if(!/CREDIT|CASDEN|CREATIS|COFIDIS|ACCESSIO|ONEY|FLOA|CDISCOUNT|CARREFOUR/.test(nature))return{ok:true,applique:false,raison:'charge_non_credit'};
    const credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():(typeof lireCreditsEtendus_==='function'?lireCreditsEtendus_():lireTable_('Credits')),liaison=trouverCreditPourChargeFixe20260915_(charge,credits);if(!liaison.ok)return Object.assign({ok:true,applique:false,charge_fixe_id:cid,operation_id:oid},liaison);
    const credit=liaison.credit,calc=calculerAmortissementCredit20260915_(credit,operation);if(calc.partCapital<=0)return{ok:true,applique:false,raison:'aucun_capital_amorti',credit_id:credit.id,calcul:calc};
    const avantEch=Math.max(0,parseInt(credit.echeances_restantes,10)||0),type=String(credit.type_credit||'amortissable').toLowerCase(),apresEch=type==='revolving'?avantEch:Math.max(0,avantEch-(avantEch>0?1:0)),dateOp=operation.date_comptable||operation.date||new Date(),next=prochaineEcheanceApresPaiement20260915_(credit,dateOp),cible=Object.assign({},credit,{capital_restant:calc.capitalApres,echeances_restantes:apresEch,prochaine_echeance:next||credit.prochaine_echeance});
    if(typeof enregistrerCreditEtendu_==='function')enregistrerCreditEtendu_(cible);else enregistrerLigne('Credits',cible);
    const sh=assurerJournalAmortissementsCredits20260915_(),row={id:Utilities.getUuid(),credit_id:credit.id,credit_nom:credit.nom,charge_fixe_id:cid,operation_id:oid,date_operation:dateOp,montant_echeance:calc.montant,part_capital:calc.partCapital,part_interets:calc.partInterets,part_assurance:calc.partAssurance,capital_avant:calc.capitalAvant,capital_apres:calc.capitalApres,echeances_avant:avantEch,echeances_apres:apresEch,prochaine_echeance_avant:credit.prochaine_echeance||'',prochaine_echeance_apres:next||'',methode:calc.methode,statut:'applique',version:CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION,date_traitement:new Date().toISOString()};
    sh.getRange(sh.getLastRow()+1,1,1,CREDIT_AMORTIZATION_HEADERS_20260915.length).setValues([CREDIT_AMORTIZATION_HEADERS_20260915.map(h=>row[h]??'')]);
    resultat={ok:true,applique:true,version:CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION,credit_id:String(credit.id||''),credit_nom:String(credit.nom||''),charge_fixe_id:cid,operation_id:oid,scoreLiaison:liaison.score,calcul:calc,echeancesAvant:avantEch,echeancesApres:apresEch,prochaineEcheance:next||credit.prochaine_echeance||''};
  }finally{lock.releaseLock();}
  if(resultat&&resultat.applique&&typeof reconstruireSnapshotGlobalSyntheseBudgetSoft20260907==='function'){try{const s=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('rapprochement_credit');resultat.snapshot={ok:!!(s&&s.ok),revisionBudgetSoft:String(s&&s.revisionBudgetSoft||''),message:String(s&&s.message||'')};}catch(e){resultat.snapshot={ok:false,erreur:String(e&&e.message||e)};}}
  return resultat;
}

function auditerAmortissementsCredits20260915(){
  const lignes=lireJournalAmortissementsCredits20260915_(),credits=typeof lireCreditsEtendusV2_==='function'?lireCreditsEtendusV2_():[],out={ok:true,version:CREDIT_AMORTIZATION_INTERMODULE_20260915_VERSION,nombre:lignes.length,derniers:lignes.slice(-10).map(x=>({credit:x.credit_nom,operation_id:x.operation_id,montant:Number(x.montant_echeance||0),capital:Number(x.part_capital||0),interets:Number(x.part_interets||0),assurance:Number(x.part_assurance||0),capital_apres:Number(x.capital_apres||0),methode:x.methode})),credits:credits.map(c=>({nom:c.nom,capital_restant:Number(c.capital_restant||0),echeances_restantes:Number(c.echeances_restantes||0),prochaine_echeance:c.prochaine_echeance||''}))};console.log('[AUDIT AMORTISSEMENTS CREDITS 20260915] '+JSON.stringify(out));return out;
}
