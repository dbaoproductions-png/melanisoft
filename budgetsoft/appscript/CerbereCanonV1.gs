const CERBERE_CANON_V1_VERSION = '1.0.1';

/** Budget canonique prévisionnel. N'écrit jamais dans les opérations réelles. */
function chargerCanonCerbereV1() {
  const sh = assurerCanonCerbereV1_();
  const rows = lireCanonCerbereV1_(sh)
    .filter(r => String(r.actif).toLowerCase() !== 'false')
    .sort((a,b) => Number(a.ordre||99)-Number(b.ordre||99));
  const pluxee = rows.reduce((s,r)=>s+Number(r.pluxee||0),0);
  const monetaire = rows.reduce((s,r)=>s+Number(r.monetaire||0),0);
  return {
    version:CERBERE_CANON_V1_VERSION,
    principe:'Une hausse doit être compensée : le total pilotable ne se crée pas.',
    pluxeeMensuel:154,
    moisSansPluxee:5,
    epargneProtegee:50,
    postes:rows.map(r=>({categorie:String(r.categorie||''),monetaire:Number(r.monetaire||0),pluxee:Number(r.pluxee||0),nature:String(r.nature||'ajustable'),ordre:Number(r.ordre||99),protege:String(r.protege).toLowerCase()==='true'})),
    totaux:{monetaire:monetaire,pluxee:pluxee,total:monetaire+pluxee}
  };
}

function enregistrerCanonCerbereV1(postes) {
  if (!Array.isArray(postes) || !postes.length) throw new Error('Aucun poste canonique à enregistrer.');
  const sh = assurerCanonCerbereV1_();
  const existants = lireCanonCerbereV1_(sh);
  const map = {};
  existants.forEach((r,i)=>map[String(r.categorie||'').trim()]={row:i+2,data:r});
  postes.forEach((p,i)=>{
    const cat=String(p.categorie||'').trim(); if(!cat)return;
    const old=map[cat]&&map[cat].data||{};
    const protege=String(old.protege).toLowerCase()==='true';
    let mon=Math.max(0,Number(p.monetaire||0)), plu=Math.max(0,Number(p.pluxee||0));
    if(protege){mon=Number(old.monetaire||0);plu=Number(old.pluxee||0);}
    const vals=[cat,arrondirCerbereCanon_(mon),arrondirCerbereCanon_(plu),String(old.nature||p.nature||'ajustable'),Number(old.ordre||p.ordre||i+1),protege,true];
    if(map[cat]) sh.getRange(map[cat].row,1,1,7).setValues([vals]); else sh.appendRow(vals);
  });
  SpreadsheetApp.flush();
  return chargerCanonCerbereV1();
}

function lireCanonCerbereV1_(sh){
  const last=sh.getLastRow(); if(last<2)return [];
  const headers=sh.getRange(1,1,1,7).getValues()[0].map(String);
  return sh.getRange(2,1,last-1,7).getValues().map(vals=>{const o={};headers.forEach((h,i)=>o[h]=vals[i]);return o;});
}

function assurerCanonCerbereV1_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error('Classeur BudgetSoft introuvable.');
  let sh=ss.getSheetByName('Cerbere_Canon_V1');
  if(sh)return sh;
  sh=ss.insertSheet('Cerbere_Canon_V1');
  sh.getRange(1,1,1,7).setValues([['categorie','monetaire','pluxee','nature','ordre','protege','actif']]);
  const d=[['Courses',656,94,'essentiel',1,false,true],['Santé',50,0,'essentiel',2,false,true],['Animaux',50,0,'ajustable',3,false,true],['Maison / entretien',0,0,'ajustable',4,false,true],['Voitures',95,0,'ajustable',5,false,true],['Transports',39,0,'essentiel',6,false,true],['Restaurants',79,60,'discretionnaire',7,false,true],['Loisirs',100,0,'discretionnaire',8,false,true],['Achats personnels',200,0,'discretionnaire',9,false,true],['Épargne',50,0,'protection',10,true,true],['Projet',0,0,'solde',11,false,true]];
  sh.getRange(2,1,d.length,7).setValues(d); sh.setFrozenRows(1); return sh;
}
function arrondirCerbereCanon_(n){return Math.round(Number(n||0)*100)/100;}
