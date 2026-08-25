const CERBERE_RECETTES_CANON_VERSION = '1.2.0';
const CERBERE_RECETTES_CANON_SHEET = 'Cerbere_Recettes_Canon_V1';

/**
 * Canon de recettes de Cerbère (R0).
 * Il décrit le mois normal attendu. Le réel courant et les événements/actions
 * ne réécrivent jamais ce canon : ils le pondèrent seulement dans P1-P6.
 *
 * Depuis 1.2, une ligne peut conserver une transition de référence :
 * - montant_precedent : valeur valable avant date_effet ;
 * - date_effet : premier jour de cycle où le nouveau montant devient la norme.
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
      commentaire:String(x.commentaire||''),
      montant_precedent:(x.montant_precedent===''||x.montant_precedent==null)?null:Math.max(0,Number(x.montant_precedent||0)),
      date_effet:normaliserDateCanonRecettes_(x.date_effet)
    }))
    .filter(x=>x.categorie&&x.montant>0)
    .sort((a,b)=>a.ordre-b.ordre||a.categorie.localeCompare(b.categorie,'fr'));
  return {
    version:CERBERE_RECETTES_CANON_VERSION,
    principe:'R0 est la référence maître persistante des recettes normales ; le Plan et le réel ne la réécrivent pas. Les changements datés conservent la référence antérieure pour les cycles déjà ouverts.',
    postes,
    total:arrondirCerbereV3_(postes.reduce((s,x)=>s+x.montant,0))
  };
}

function assurerCanonRecettesCerbereV1_() {
  const ss=SpreadsheetApp.getActive();
  let sh=ss.getSheetByName(CERBERE_RECETTES_CANON_SHEET);
  const headers=['categorie','montant','nature','ordre','actif','commentaire','montant_precedent','date_effet'];
  if(!sh){
    sh=ss.insertSheet(CERBERE_RECETTES_CANON_SHEET);
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    const defaults=[
      ['Salaires',2455.90,'structurelle',1,true,'Revenu mensuel canonique','',''],
      ['France Travail',1046.93,'structurelle',2,true,'Revenu mensuel canonique','',''],
      ['Revenus fonciers',780.00,'structurelle',3,true,'750 € logement + 30 € garage à partir du cycle de septembre 2026',755.00,'2026-08-28'],
      ['Cours',416.09,'variable',4,true,'Montant mensuel de référence','',''],
      ['Concerts',283.62,'variable',5,true,'Montant mensuel de référence','','']
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
  const headers=['categorie','montant','nature','ordre','actif','commentaire','montant_precedent','date_effet'];

  // Préserve l'historique daté si l'ancienne UI ne renvoie pas encore ces champs.
  const oldHs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());
  const oldRows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,oldHs.length).getValues():[];
  const oldByCat={};
  oldRows.forEach(r=>{
    const o=Object.fromEntries(oldHs.map((h,i)=>[h,r[i]]));
    const cat=String(o.categorie||'').trim();if(cat)oldByCat[cat]=o;
  });

  const rows=postes.map((x,i)=>{
    const cat=String(x.categorie||'').trim(),old=oldByCat[cat]||{};
    const prev=x.montant_precedent!==undefined?x.montant_precedent:old.montant_precedent;
    const effet=x.date_effet!==undefined?x.date_effet:old.date_effet;
    return [
      cat,Math.max(0,Number(x.montant||0)),String(x.nature||'structurelle'),
      Number(x.ordre||i+1),x.actif===false?false:true,String(x.commentaire||''),
      (prev===''||prev==null)?'':Math.max(0,Number(prev||0)),
      normaliserDateCanonRecettes_(effet)
    ];
  }).filter(r=>r[0]);
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

/**
 * Migration ponctuelle et idempotente du canon existant.
 * - nouveau R0 Revenus fonciers : 780 € ;
 * - ancien canon : 755 € ;
 * - nouveau canon applicable à partir du cycle qui ouvre le 28/08/2026.
 */
function migrerR0RevenusFonciers780_20260825(){
  const sh=assurerCanonRecettesCerbereV1_();
  const hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());
  const iCat=hs.indexOf('categorie'),iMont=hs.indexOf('montant'),iCom=hs.indexOf('commentaire'),iPrev=hs.indexOf('montant_precedent'),iEff=hs.indexOf('date_effet');
  if(iCat<0||iMont<0||iPrev<0||iEff<0)throw new Error('Schéma R0 1.2 incomplet.');
  const n=Math.max(0,sh.getLastRow()-1),rows=n?sh.getRange(2,1,n,hs.length).getValues():[];
  let trouve=false;
  rows.forEach((r,j)=>{
    if(String(r[iCat]||'').trim().toLowerCase()==='revenus fonciers'){
      const row=j+2;
      sh.getRange(row,iMont+1).setValue(780);
      sh.getRange(row,iPrev+1).setValue(755);
      sh.getRange(row,iEff+1).setValue('2026-08-28');
      if(iCom>=0)sh.getRange(row,iCom+1).setValue('750 € logement + 30 € garage à partir du cycle de septembre 2026');
      trouve=true;
    }
  });
  if(!trouve)throw new Error('Ligne Revenus fonciers introuvable dans R0.');
  SpreadsheetApp.flush();
  try{if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('migration_R0_foncier_780_datee');}catch(e){}
  return chargerCanonRecettesCerbereV1();
}

function normaliserDateCanonRecettes_(v){
  if(!v)return '';
  if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v))return Utilities.formatDate(v,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');
  const s=String(v).trim();
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];
  const f=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(f)return f[3]+'-'+String(f[2]).padStart(2,'0')+'-'+String(f[1]).padStart(2,'0');
  return s;
}
