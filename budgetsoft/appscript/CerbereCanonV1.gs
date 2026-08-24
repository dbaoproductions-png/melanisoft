const CERBERE_CANON_V1_VERSION = '1.1.2';

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
    principe:'P0 est la référence maître persistante. P1–P6 n’enregistrent que leurs dérogations locales.',
    pluxeeMensuel:154,
    moisSansPluxee:5,
    epargneProtegee:50,
    postes:rows.map(r=>({categorie:String(r.categorie||''),monetaire:Number(r.monetaire||0),pluxee:Number(r.pluxee||0),nature:String(r.nature||'ajustable'),ordre:Number(r.ordre||99),protege:String(r.protege).toLowerCase()==='true'})),
    totaux:{monetaire:monetaire,pluxee:pluxee,total:monetaire+pluxee}
  };
}

/**
 * Valide un nouveau P0 et rebase les dérogations P1–P6.
 * Une valeur locale identique à l'ancien P0 n'était pas une vraie dérogation :
 * elle est supprimée pour que la période hérite du nouveau P0.
 * Une vraie dérogation reste propre à sa période.
 */
function enregistrerCanonCerbereV1(postes) {
  if (!Array.isArray(postes) || !postes.length) throw new Error('Aucun poste canonique à enregistrer.');
  const avant = chargerCanonCerbereV1();
  const ancienP0 = Object.fromEntries((avant.postes||[]).map(x=>[String(x.categorie||''),Number(x.monetaire||0)]));
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
  assurerPosteDiversCerbereCanon_(sh);
  const rebase=rebaserAjustementsPeriodesApresModificationP0_(ancienP0);
  SpreadsheetApp.flush();
  try{
    const props=PropertiesService.getDocumentProperties();
    props.setProperty('CERBERE_P0_DERNIERE_VALIDATION',new Date().toISOString());
    props.setProperty('CERBERE_P0_REBASE',JSON.stringify(rebase));
    if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('validation_P0');
    else{
      props.setProperty('PLAN_DERNIER_RECALCUL',new Date().toISOString());
      props.setProperty('PLAN_DERNIERE_ORIGINE','validation_P0');
    }
  } catch(e) {}
  return chargerCanonCerbereV1();
}

function rebaserAjustementsPeriodesApresModificationP0_(ancienP0){
  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName('Cerbere_Ajustements');
  if(!sh||sh.getLastRow()<2)return {supprimes:0,conserves:0};
  const hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());
  const iCat=hs.indexOf('categorie'),iMont=hs.indexOf('montant');
  if(iCat<0||iMont<0)return {supprimes:0,conserves:0};
  const rows=sh.getRange(2,1,sh.getLastRow()-1,hs.length).getValues();
  const garder=[];let supprimes=0;
  rows.forEach(r=>{
    const cat=String(r[iCat]||'').trim(),mont=Number(r[iMont]||0);
    const base=Object.prototype.hasOwnProperty.call(ancienP0,cat)?Number(ancienP0[cat]):0;
    if(Number.isFinite(mont)&&Math.abs(mont-base)<=.009)supprimes++;else garder.push(r);
  });
  sh.getRange(2,1,sh.getLastRow()-1,hs.length).clearContent();
  if(garder.length)sh.getRange(2,1,garder.length,hs.length).setValues(garder);
  return {supprimes,conserves:garder.length};
}

function lireCanonCerbereV1_(sh){
  const last=sh.getLastRow(); if(last<2)return [];
  const headers=sh.getRange(1,1,1,7).getValues()[0].map(String);
  return sh.getRange(2,1,last-1,7).getValues().map(vals=>{const o={};headers.forEach((h,i)=>o[h]=vals[i]);return o;});
}

function assurerPosteDiversCerbereCanon_(sh){
  const rows=lireCanonCerbereV1_(sh);
  const parCat=Object.fromEntries(rows.map((r,i)=>[String(r.categorie||'').trim(),{r,row:i+2}]));
  if(!parCat['Divers']) sh.appendRow(['Divers',0,0,'ajustable',10,false,true]);
  // Divers est une soupape à 0. Épargne et Projet restent après les catégories courantes.
  const last=sh.getLastRow();
  if(last<2)return;
  const vals=sh.getRange(2,1,last-1,7).getValues();
  let change=false;
  vals.forEach(r=>{
    const cat=String(r[0]||'').trim();
    if(cat==='Divers'&&Number(r[4])!==10){r[4]=10;change=true;}
    if(cat==='Épargne'&&Number(r[4])!==11){r[4]=11;change=true;}
    if(cat==='Projet'&&Number(r[4])!==12){r[4]=12;change=true;}
  });
  if(change)sh.getRange(2,1,vals.length,7).setValues(vals);
}

function assurerCanonCerbereV1_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error('Classeur BudgetSoft introuvable.');
  let sh=ss.getSheetByName('Cerbere_Canon_V1');
  if(sh){assurerPosteDiversCerbereCanon_(sh);return sh;}
  sh=ss.insertSheet('Cerbere_Canon_V1');
  sh.getRange(1,1,1,7).setValues([['categorie','monetaire','pluxee','nature','ordre','protege','actif']]);
  const d=[['Courses',656,94,'essentiel',1,false,true],['Santé',50,0,'essentiel',2,false,true],['Animaux',50,0,'ajustable',3,false,true],['Maison / entretien',0,0,'ajustable',4,false,true],['Voitures',95,0,'ajustable',5,false,true],['Transports',39,0,'essentiel',6,false,true],['Restaurants',79,60,'discretionnaire',7,false,true],['Loisirs',100,0,'discretionnaire',8,false,true],['Achats personnels',200,0,'discretionnaire',9,false,true],['Divers',0,0,'ajustable',10,false,true],['Épargne',50,0,'protection',11,true,true],['Projet',0,0,'solde',12,false,true]];
  sh.getRange(2,1,d.length,7).setValues(d); sh.setFrozenRows(1); return sh;
}
function arrondirCerbereCanon_(n){return Math.round(Number(n||0)*100)/100;}
