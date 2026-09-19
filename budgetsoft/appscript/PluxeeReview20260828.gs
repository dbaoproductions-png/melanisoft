const PLUXEE_REVIEW_20260828_VERSION='2026-08-28.1';

/**
 * Initialisation Pluxee idempotente et légère.
 * Le formatage/autoresize n'est exécuté qu'à la création de la feuille ou
 * lorsqu'un changement de schéma est réellement nécessaire.
 */
function initialiserPluxee(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let f=ss.getSheetByName(PLUXEE_SHEET);
  let structureModifiee=false;
  if(!f){
    f=ss.insertSheet(PLUXEE_SHEET);
    structureModifiee=true;
  }
  if(f.getLastRow()===0){
    f.getRange(1,1,1,PLUXEE_HEADERS.length).setValues([PLUXEE_HEADERS]);
    structureModifiee=true;
  }else{
    const presents=f.getRange(1,1,1,Math.max(1,f.getLastColumn())).getValues()[0].map(v=>String(v||'').trim());
    const manquants=PLUXEE_HEADERS.filter(h=>!presents.includes(h));
    if(manquants.length){
      f.getRange(1,presents.length+1,1,manquants.length).setValues([manquants]);
      structureModifiee=true;
    }
  }
  if(structureModifiee){
    f.setFrozenRows(1);
    f.getRange(1,1,1,PLUXEE_HEADERS.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff');
    f.autoResizeColumns(1,PLUXEE_HEADERS.length);
  }
  const p=PropertiesService.getDocumentProperties();
  if(!p.getProperty('PLUXEE_SOLDE_INITIAL'))p.setProperty('PLUXEE_SOLDE_INITIAL',String(PLUXEE_SOLDE_INITIAL_DEFAUT));
  if(!p.getProperty('PLUXEE_DATE_REFERENCE'))p.setProperty('PLUXEE_DATE_REFERENCE',PLUXEE_DATE_REFERENCE_DEFAUT);
  return chargerPluxee();
}

function auditerPluxeeReview20260828(){
  const t0=Date.now();
  const ops=lirePluxee_();
  const t1=Date.now();
  const depenses=ops.filter(o=>Number(o.montant)<0&&String(o.statut||'valide').toLowerCase()!=='refuse');
  const aClasser=depenses.filter(o=>!['Courses','Restaurants'].includes(String(o.categorie||'').trim()));
  const categoriesNonCanoniques=depenses.filter(o=>{
    const c=String(o.categorie||'').trim();
    if(!c)return false;
    return !['Courses','Restaurants'].includes(c);
  }).map(o=>({id:o.id,date:o.date,libelle:o.libelle,montant:o.montant,categorie:o.categorie,source:o.source}));
  const statutsNonStandards=ops.filter(o=>{
    const s=String(o.statut||'valide').trim().toLowerCase();
    return !['valide','refuse'].includes(s);
  }).map(o=>({id:o.id,date:o.date,libelle:o.libelle,montant:o.montant,statut:o.statut,source:o.source}));
  const groupes={};
  ops.forEach(o=>{
    if(String(o.statut||'valide').toLowerCase()==='refuse')return;
    const cle=clePluxee_(o.date,o.libelle,o.montant,o.type);
    (groupes[cle]||(groupes[cle]=[])).push(o);
  });
  const doublons=Object.entries(groupes).filter(([,v])=>v.length>1).map(([cle,v])=>({cle,n:v.length,ids:v.map(o=>o.id),sources:v.map(o=>o.source)}));
  const etat=chargerPluxee();
  const t2=Date.now();
  const montantAClasser=arrondirPluxee_(aClasser.reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0));
  const sources={};ops.forEach(o=>{const s=String(o.source||'').trim()||'inconnue';sources[s]=(sources[s]||0)+1;});
  const out={
    ok:aClasser.length===0&&categoriesNonCanoniques.length===0&&statutsNonStandards.length===0&&doublons.length===0,
    version:PLUXEE_REVIEW_20260828_VERSION,
    nombreOperations:ops.length,
    nombreDepenses:depenses.length,
    aClasser:{nombre:aClasser.length,montant:montantAClasser,operations:aClasser.map(o=>({id:o.id,date:o.date,libelle:o.libelle,montant:o.montant,categorie:o.categorie,source:o.source}))},
    categoriesNonCanoniques,
    statutsNonStandards,
    doublons,
    sources,
    solde:etat.solde,
    depensesParCategorie:etat.depensesParCategorie,
    performance:{lectureRegistreMs:t1-t0,calculEtatMs:t2-t1,totalMs:t2-t0}
  };
  console.log(JSON.stringify(out));
  return out;
}

function mesurerChargementPluxee20260828(){
  const t0=Date.now();
  const e=chargerPluxee();
  const out={ok:true,version:PLUXEE_REVIEW_20260828_VERSION,dureeMs:Date.now()-t0,nombreOperations:e.nombreOperations,solde:e.solde};
  console.log(JSON.stringify(out));
  return out;
}
