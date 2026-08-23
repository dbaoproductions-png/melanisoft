function titreLibelle(s){return String(s||'Opération bancaire').trim().toLowerCase().replace(/(^|[\s'’-])([a-zà-ÿ])/g,function(m,p,c){return p+c.toUpperCase();});}
function arrondiCentimeBanque_(n){return Math.round(Number(n||0)*100)/100;}
function controlerLotBancaire_(lignes,meta){const ops=(lignes||[]).filter(x=>x&&Number.isFinite(Number(x.montant)));const deb=arrondiCentimeBanque_(ops.filter(x=>Number(x.montant)<0).reduce((s,x)=>s+Math.abs(Number(x.montant)),0));const cred=arrondiCentimeBanque_(ops.filter(x=>Number(x.montant)>0).reduce((s,x)=>s+Number(x.montant),0));const r={nombre:ops.length,debits:deb,credits:cred,ok:true,erreurs:[]};if(meta&&Number.isFinite(Number(meta.totalDebits))&&Math.abs(deb-Number(meta.totalDebits))>0.001){r.ok=false;r.erreurs.push('Total débits : '+deb.toFixed(2)+' € au lieu de '+Number(meta.totalDebits).toFixed(2)+' €.');}if(meta&&Number.isFinite(Number(meta.totalCredits))&&Math.abs(cred-Number(meta.totalCredits))>0.001){r.ok=false;r.erreurs.push('Total crédits : '+cred.toFixed(2)+' € au lieu de '+Number(meta.totalCredits).toFixed(2)+' €.');}if(meta&&Number.isFinite(Number(meta.soldeOuverture))&&Number.isFinite(Number(meta.soldeCloture))){const calc=arrondiCentimeBanque_(Number(meta.soldeOuverture)+cred-deb);if(Math.abs(calc-Number(meta.soldeCloture))>0.001){r.ok=false;r.erreurs.push('Continuité de solde : '+calc.toFixed(2)+' € calculé au lieu de '+Number(meta.soldeCloture).toFixed(2)+' €.');}r.soldeCalcule=calc;}return r;}

/**
 * Point d'entrée réellement utilisé par BankingIntegrityUI pour l'import PDF.
 * Le contrôle de relevé est effectué AVANT toute écriture. Le solde, l'historique
 * et le journal Controles_releves ne sont enregistrés qu'après un import
 * transactionnel réussi.
 */
function importerPdfBancaireCertifie(lignes,compte,meta){
  const controle=controlerReleveAvantImport(meta,compte);
  if(!controle||controle.ok!==true)throw new Error(controle&&controle.message?controle.message:'Import bloqué : contrôle du relevé impossible.');

  const resultat=upsertOperationsBancairesTransactionnel(lignes,compte,'pdf',meta);
  if(resultat&&resultat.bloque)return resultat;

  const m=meta||{},soldeCloture=Number(m.soldeCloture),soldeOuverture=Number(m.soldeOuverture);
  if(!m.dateCloture||!Number.isFinite(soldeCloture))throw new Error('Import effectué mais relevé non certifiable : solde/date de clôture absent.');

  enregistrerParametreBudgetaire_('solde_releve_'+String(compte),soldeCloture);
  enregistrerParametreBudgetaire_('date_solde_releve_'+String(compte),m.dateCloture);

  const historique=lireHistoriqueReleves_(compte);
  const releve={dateOuverture:m.dateOuverture||null,soldeOuverture:Number.isFinite(soldeOuverture)?soldeOuverture:null,dateCloture:m.dateCloture,soldeCloture:soldeCloture,importeLe:new Date().toISOString()};
  if(releve.dateOuverture&&releve.soldeOuverture!==null&&historique.length===0){
    enregistrerParametreBudgetaire_('solde_ouverture_premier_releve_'+String(compte),releve.soldeOuverture);
    enregistrerParametreBudgetaire_('date_ouverture_premier_releve_'+String(compte),releve.dateOuverture);
  }
  const deja=historique.some(r=>String(r.dateOuverture||'')===String(releve.dateOuverture||'')&&String(r.dateCloture||'')===String(releve.dateCloture||'')&&Math.abs(Number(r.soldeCloture)-releve.soldeCloture)<0.005);
  if(!deja){historique.push(releve);historique.sort((a,b)=>new Date(a.dateOuverture||a.dateCloture||0)-new Date(b.dateOuverture||b.dateCloture||0));enregistrerHistoriqueReleves_(compte,historique);}

  enregistrerControleReleve(controle,{source:'HELLOBANK_PDF',creees:Number(resultat.creees||0),remplacees:Number(resultat.remplacees||0),recues:Number(resultat.recues||0)});
  resultat.controleReleveEnregistre=true;
  resultat.soldeCloture=soldeCloture;
  resultat.dateCloture=m.dateCloture;
  return resultat;
}

function importerFluxBancaireControle(lignes,compte){const ctl=controlerLotBancaire_(lignes,null);if(!ctl.nombre)throw new Error('Aucune opération exploitable dans le flux.');const ss=SpreadsheetApp.getActiveSpreadsheet(),f=ss.getSheetByName('Operations'),stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss'),backup=f.copyTo(ss).setName(('Operations_tmp_flux_'+stamp).slice(0,99));try{const res=upsertOperationsBancairesTransactionnel(lignes,compte,'flux',null);ss.deleteSheet(backup);return res;}catch(e){f.clearContents();const vals=backup.getDataRange().getValues();f.getRange(1,1,vals.length,vals[0].length).setValues(vals);SpreadsheetApp.flush();ss.deleteSheet(backup);throw new Error(e.message+' ; flux restauré automatiquement.');}}
function finaliserMigrationBancaire(){const lock=LockService.getDocumentLock();lock.waitLock(30000);try{const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations'),headers=assurerColonnesBancaires_(),ops=lireOperationsBancaires_();let definitives=0,provisoires=0,manuelles=0;const signatures={};ops.forEach(o=>{const txt=String(o.commentaire||'');if(/Source\s*:\s*relev[ée]|REIMPORT_PDF|RECONSTRUCTION_PDF|HELLOBANK_PDF/i.test(txt)){o.source_bancaire='pdf';o.statut_bancaire='definitif';definitives++;}else if(/HELLOBANK|HB_MATCH|CARTE_DIFFEREE/i.test(txt)){o.source_bancaire='flux';o.statut_bancaire='provisoire';provisoires++;}else{if(!o.source_bancaire)o.source_bancaire='manuel';if(!o.statut_bancaire)o.statut_bancaire='manuel';manuelles++;}enrichirDepuisCommentaireBanque_(o);const k=[isoJourBanque_(o.date_achat||o.date),centimesBanque_(o.montant),o.marchand_normalise,o.carte_fin].join('|');signatures[k]=(signatures[k]||0)+1;});const seen={};ops.forEach(o=>{const k=[isoJourBanque_(o.date_achat||o.date),centimesBanque_(o.montant),o.marchand_normalise,o.carte_fin].join('|');seen[k]=(seen[k]||0)+1;o.cle_rapprochement=cleBanqueFiable_(o,seen[k],signatures[k]);});const vals=ops.map(o=>serialiserOpBancaire_(o,headers));f.clearContents();f.getRange(1,1,1,headers.length).setValues([headers]);if(vals.length)f.getRange(2,1,vals.length,headers.length).setValues(vals);SpreadsheetApp.flush();const audit=verifierJeuOperations_(lireOperationsBancaires_());if(!audit.ok)throw new Error('Finalisation bancaire non conforme : '+audit.erreurs.join(' '));return{ok:true,definitives,provisoires,manuelles,audit};}finally{lock.releaseLock();}}
