const CERBERE_RECETTES_CANON_VERSION = '1.1.0';
const CERBERE_RECETTES_CANON_SHEET = 'Cerbere_Recettes_Canon_V1';

/**
 * Canon de recettes de Cerbère (R0).
 * Il décrit le mois normal attendu. Le réel courant et les événements/actions
 * ne réécrivent jamais ce canon : ils le pondèrent seulement dans P1-P6.
 */
function chargerCanonRecettesCerbereV1() {
  const sh = assurerCanonRecettesCerbereV1_();
  const hs = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());
  const rows = sh.getLastRow()>1 ? sh.getRange(2,1,sh.getLastRow()-1,hs.length).getValues() : [];
  const postes = rows.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>Object.fromEntries(hs.map((h,i)=>[h,r[i]])))
    .filter(x=>String(x.actif).toLowerCase()!=='false')
    .map(x=>({
      categorie:String(x.categorie||'').trim(),
      montant:Math.max(0,Number(x.montant||0)),
      nature:String(x.nature||'structurelle'),
      ordre:Number(x.ordre||99),
      commentaire:String(x.commentaire||'')
    }))
    .filter(x=>x.categorie&&x.montant>0)
    .sort((a,b)=>a.ordre-b.ordre||a.categorie.localeCompare(b.categorie,'fr'));
  return {
    version:CERBERE_RECETTES_CANON_VERSION,
    principe:'R0 est la référence maître persistante des recettes normales ; le Plan et le réel ne la réécrivent pas.',
    postes,
    total:arrondirCerbereV3_(postes.reduce((s,x)=>s+x.montant,0))
  };
}

function assurerCanonRecettesCerbereV1_() {
  const ss=SpreadsheetApp.getActive();
  let sh=ss.getSheetByName(CERBERE_RECETTES_CANON_SHEET);
  const headers=['categorie','montant','nature','ordre','actif','commentaire'];
  if(!sh){
    sh=ss.insertSheet(CERBERE_RECETTES_CANON_SHEET);
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    const defaults=[
      ['Salaires',2455.90,'structurelle',1,true,'Revenu mensuel canonique'],
      ['France Travail',1046.93,'structurelle',2,true,'Revenu mensuel canonique'],
      ['Revenus fonciers',755.00,'structurelle',3,true,'Revenu mensuel canonique'],
      ['Cours',416.09,'variable',4,true,'Montant mensuel de référence'],
      ['Concerts',283.62,'variable',5,true,'Montant mensuel de référence']
    ];
    sh.getRange(2,1,defaults.length,headers.length).setValues(defaults);
    sh.setFrozenRows(1);
    return sh;
  }
  const current=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim()):[];
  const missing=headers.filter(h=>!current.includes(h));
  if(!current.length)sh.getRange(1,1,1,headers.length).setValues([headers]);
  else if(missing.length)sh.getRange(1,current.length+1,1,missing.length).setValues([missing]);
  sh.setFrozenRows(1);
  return sh;
}

function enregistrerCanonRecettesCerbereV1(postes) {
  postes=Array.isArray(postes)?postes:[];
  if(!postes.length)throw new Error('Aucune recette canonique à enregistrer.');
  const sh=assurerCanonRecettesCerbereV1_();
  const headers=['categorie','montant','nature','ordre','actif','commentaire'];
  const rows=postes.map((x,i)=>[
    String(x.categorie||'').trim(),Math.max(0,Number(x.montant||0)),String(x.nature||'structurelle'),
    Number(x.ordre||i+1),x.actif===false?false:true,String(x.commentaire||'')
  ]).filter(r=>r[0]);
  if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,Math.max(sh.getLastColumn(),headers.length)).clearContent();
  if(rows.length)sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  SpreadsheetApp.flush();
  try{
    if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('validation_R0');
    else{
      const props=PropertiesService.getDocumentProperties();
      props.setProperty('PLAN_DERNIER_RECALCUL',new Date().toISOString());
      props.setProperty('PLAN_DERNIERE_ORIGINE','validation_R0');
    }
  }catch(e){}
  return chargerCanonRecettesCerbereV1();
}
