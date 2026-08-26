const PLUXEE_PDF_VERSION='1.0.0';

/** Les opérations PDF sont extraites dans le navigateur via PDF.js puis normalisées ici. */
function analyserPdfPluxee(operations){
  initialiserPluxee();
  if(!Array.isArray(operations)||!operations.length)throw new Error('Aucune opération Pluxee détectée dans le PDF.');
  return analyserLotPluxee_(normaliserLotPdfPluxee_(operations),'pdf');
}

function importerPdfPluxee(operations){
  initialiserPluxee();
  if(!Array.isArray(operations)||!operations.length)throw new Error('Aucune opération Pluxee détectée dans le PDF.');
  const analyse=analyserLotPluxee_(normaliserLotPdfPluxee_(operations),'pdf');
  if(analyse.ambigues)throw new Error('Import PDF Pluxee bloqué : '+analyse.ambigues+' ligne(s) ambiguë(s).');
  const aAjouter=analyse.details.filter(x=>x.statutImport==='nouvelle').map(x=>x.operation);
  ajouterPluxeeEnLot_(aAjouter);
  const etat=chargerPluxee();
  return Object.assign({},analyse,{versionPdf:PLUXEE_PDF_VERSION,importees:aAjouter.length,soldeApresImport:etat.solde});
}

function normaliserLotPdfPluxee_(operations){
  return operations.map(o=>{
    const montant=Number(o&&o.montant||0),libelle=String(o&&o.libelle||'').trim();
    const refuse=Math.abs(montant)<.001||/merchant name unavailable/i.test(libelle);
    return {date:o&&o.date,libelle:montant>0&&/^pluxee$/i.test(libelle)?'Rechargement':libelle,montant,refuse,raison:refuse?'Transaction refusée / montant nul dans le relevé PDF':''};
  });
}

function auditerPluxee20260826(){
  const e=chargerPluxee(),cible=126.32,ecart=Math.round((Number(e.solde||0)-cible)*100)/100;
  const r={ok:Math.abs(ecart)<.011,version:PLUXEE_VERSION,dateControle:'2026-08-26',soldeInitial:e.soldeInitial,dateReference:e.dateReference,nombreOperations:e.nombreOperations,soldeCalcule:e.solde,soldePluxeeObserve:cible,ecart};
  console.log(JSON.stringify(r));return r;
}
