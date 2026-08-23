const BANKING_POST_JULY15_RESET_VERSION='1.0';

function bprDate_(v){if(!v)return null;const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d)?null:d;}
function bprRound_(n){return Math.round(Number(n||0)*100)/100;}
function bprSigned_(o){const m=Math.abs(Number(o.montant||0));return String(o.type||'').toLowerCase()==='depense'?-m:m;}

/**
 * Simulation en lecture seule de la remise à zéro des opérations POSTÉRIEURES au 15/07/2026.
 * Le 15/07/2026 est conservé intégralement.
 */
function simulerRemiseAZeroApres15Juillet(){
  verifierInitialisation_();
  const limite=new Date(2026,6,15,23,59,59,999);
  const ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_);
  const aConserver=[],aSupprimer=[];let debits=0,credits=0;
  ops.forEach(o=>{
    const d=bprDate_(o.date_comptable||o.date);
    if(d&&d>limite){aSupprimer.push(o);const s=bprSigned_(o);if(s<0)debits+=Math.abs(s);else credits+=s;}
    else aConserver.push(o);
  });
  return{
    version:BANKING_POST_JULY15_RESET_VERSION,
    totalAvant:ops.length,
    conservees:aConserver.length,
    supprimees:aSupprimer.length,
    debitsSupprimes:bprRound_(debits),
    creditsSupprimes:bprRound_(credits),
    totalApres:aConserver.length,
    limite:'2026-07-15T23:59:59',
    lectureSeule:true,
    exemples:aSupprimer.slice(0,50).map(o=>({id:String(o.id||''),date:(bprDate_(o.date_comptable||o.date)||'').toString(),libelle:String(o.libelle_bancaire||o.libelle||''),montant:Number(o.montant||0)}))
  };
}

/**
 * Application transactionnelle. Crée une sauvegarde complète avant écriture,
 * ne conserve que les opérations <= 15/07/2026, puis contrôle nombre/IDs/totaux.
 */
function appliquerRemiseAZeroApres15Juillet(){
  verifierInitialisation_();
  const simulation=simulerRemiseAZeroApres15Juillet();
  if(!simulation.supprimees)throw new Error('Aucune opération postérieure au 15/07/2026 à supprimer.');
  const ss=SpreadsheetApp.getActiveSpreadsheet(),f=ss.getSheetByName('Operations');
  if(!f)throw new Error('Feuille Operations introuvable.');
  const lock=LockService.getDocumentLock();lock.waitLock(30000);let backup=null;
  try{
    const headers=assurerColonnesBancaires_(),ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_),limite=new Date(2026,6,15,23,59,59,999);
    const conservees=ops.filter(o=>{const d=bprDate_(o.date_comptable||o.date);return !d||d<=limite;});
    const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
    backup=f.copyTo(ss).setName(('Operations_avant_reset_1507_'+stamp).slice(0,99));
    const vals=conservees.map(o=>serialiserOpBancaire_(o,headers));
    f.clearContents();f.getRange(1,1,1,headers.length).setValues([headers]);if(vals.length)f.getRange(2,1,vals.length,headers.length).setValues(vals);SpreadsheetApp.flush();
    const apres=checksumOperationsBanque_(lireOperationsBancaires_());
    if(apres.nombre!==simulation.totalApres||apres.ids!==apres.nombre){
      f.clearContents();const b=backup.getDataRange().getValues();f.getRange(1,1,b.length,b[0].length).setValues(b);SpreadsheetApp.flush();
      throw new Error('Contrôle après reset échoué : restauration automatique effectuée.');
    }
    return{ok:true,sauvegarde:backup.getName(),simulation,apres};
  }finally{lock.releaseLock();}
}
