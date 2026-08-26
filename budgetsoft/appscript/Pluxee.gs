const PLUXEE_VERSION='1.0.0';
const PLUXEE_SHEET='Pluxee';
const PLUXEE_HEADERS=['id','date','libelle','montant','type','categorie','source','cle_rapprochement','statut','date_import'];
const PLUXEE_SOLDE_INITIAL_DEFAUT=177.42;
const PLUXEE_DATE_REFERENCE_DEFAUT='2025-12-17';

/**
 * Pluxee est un registre affecté, séparé de la banque :
 * - recharge > 0 : augmente uniquement le solde Pluxee ;
 * - dépense < 0 : diminue le solde Pluxee et alimente Courses/Restaurants ;
 * - aucun mouvement Pluxee ne modifie la trésorerie Hello bank ;
 * - aucun rapprochement de charge fixe ;
 * - débit immédiat : la date d'opération est la date d'imputation.
 */
function initialiserPluxee(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let f=ss.getSheetByName(PLUXEE_SHEET);
  if(!f)f=ss.insertSheet(PLUXEE_SHEET);
  if(f.getLastRow()===0)f.getRange(1,1,1,PLUXEE_HEADERS.length).setValues([PLUXEE_HEADERS]);
  else{
    const presents=f.getRange(1,1,1,Math.max(1,f.getLastColumn())).getValues()[0].map(v=>String(v||'').trim());
    const manquants=PLUXEE_HEADERS.filter(h=>!presents.includes(h));
    if(manquants.length)f.getRange(1,presents.length+1,1,manquants.length).setValues([manquants]);
  }
  f.setFrozenRows(1);
  f.getRange(1,1,1,PLUXEE_HEADERS.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff');
  f.autoResizeColumns(1,PLUXEE_HEADERS.length);
  const p=PropertiesService.getDocumentProperties();
  if(!p.getProperty('PLUXEE_SOLDE_INITIAL'))p.setProperty('PLUXEE_SOLDE_INITIAL',String(PLUXEE_SOLDE_INITIAL_DEFAUT));
  if(!p.getProperty('PLUXEE_DATE_REFERENCE'))p.setProperty('PLUXEE_DATE_REFERENCE',PLUXEE_DATE_REFERENCE_DEFAUT);
  return chargerPluxee();
}

function lirePluxee_(){
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PLUXEE_SHEET);
  if(!f||f.getLastRow()<2)return[];
  const vals=f.getRange(2,1,f.getLastRow()-1,PLUXEE_HEADERS.length).getValues();
  return vals.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>Object.fromEntries(PLUXEE_HEADERS.map((h,i)=>[h,serialiserValeur_(r[i])])));
}

function chargerPluxee(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss.getSheetByName(PLUXEE_SHEET))return initialiserPluxee();
  const ops=lirePluxee_();
  const props=PropertiesService.getDocumentProperties();
  const initial=Number(props.getProperty('PLUXEE_SOLDE_INITIAL')||PLUXEE_SOLDE_INITIAL_DEFAUT);
  const dateRef=props.getProperty('PLUXEE_DATE_REFERENCE')||PLUXEE_DATE_REFERENCE_DEFAUT;
  const mouvements=ops.filter(o=>String(o.statut||'valide').toLowerCase()!=='refuse');
  const net=arrondirPluxee_(mouvements.reduce((s,o)=>s+Number(o.montant||0),0));
  const solde=arrondirPluxee_(initial+net);
  const depenses=mouvements.filter(o=>Number(o.montant)<0);
  const parCategorie={Courses:0,Restaurants:0,'À classer':0};
  depenses.forEach(o=>{const c=['Courses','Restaurants'].includes(String(o.categorie||''))?String(o.categorie):'À classer';parCategorie[c]+=Math.abs(Number(o.montant||0));});
  Object.keys(parCategorie).forEach(k=>parCategorie[k]=arrondirPluxee_(parCategorie[k]));
  return {ok:true,version:PLUXEE_VERSION,soldeInitial:arrondirPluxee_(initial),dateReference:dateRef,netMouvements:net,solde,operations:ops.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)),depensesParCategorie:parCategorie,nombreOperations:ops.length};
}

function definirSoldeInitialPluxee(montant,dateReference){
  const n=Number(String(montant).replace(',','.'));
  if(!Number.isFinite(n))throw new Error('Solde initial Pluxee invalide.');
  const d=formatDateLocaleBudgetSoft_(dateLocaleBudgetSoft_(dateReference||PLUXEE_DATE_REFERENCE_DEFAUT));
  const p=PropertiesService.getDocumentProperties();p.setProperty('PLUXEE_SOLDE_INITIAL',String(arrondirPluxee_(n)));p.setProperty('PLUXEE_DATE_REFERENCE',d);return chargerPluxee();
}

function analyserCollerPluxee(texte){
  initialiserPluxee();
  const brut=parserCollerPluxee_(texte);
  return analyserLotPluxee_(brut,'copier_coller');
}

function importerCollerPluxee(texte){
  initialiserPluxee();
  const analyse=analyserLotPluxee_(parserCollerPluxee_(texte),'copier_coller');
  if(analyse.ambigues)throw new Error('Import Pluxee bloqué : '+analyse.ambigues+' ligne(s) ambiguë(s).');
  const aAjouter=analyse.details.filter(x=>x.statutImport==='nouvelle').map(x=>x.operation);
  ajouterPluxeeEnLot_(aAjouter);
  const etat=chargerPluxee();
  return Object.assign({},analyse,{importees:aAjouter.length,soldeApresImport:etat.solde});
}

function enregistrerPluxeeManuel(donnee){
  initialiserPluxee();donnee=donnee||{};
  const montant=Math.abs(Number(String(donnee.montant||0).replace(',','.'))),type=String(donnee.type||'depense').toLowerCase();
  if(!(montant>0))throw new Error('Montant Pluxee invalide.');
  const op=normaliserOperationPluxee_({date:donnee.date||new Date(),libelle:donnee.libelle||'',montant:type==='rechargement'?montant:-montant,type:type==='rechargement'?'rechargement':'depense',categorie:donnee.categorie||'',source:'manuel',statut:'valide'});
  const existantes=new Set(lirePluxee_().map(o=>String(o.cle_rapprochement||'')));
  if(existantes.has(op.cle_rapprochement))return{ok:true,doublon:true,operation:op,etat:chargerPluxee()};
  ajouterPluxeeEnLot_([op]);return{ok:true,doublon:false,operation:op,etat:chargerPluxee()};
}

function mettreAJourCategoriePluxee(id,categorie){
  const c=String(categorie||'').trim();if(c&&!['Courses','Restaurants'].includes(c))throw new Error('Pluxee n’accepte que Courses ou Restaurants.');
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PLUXEE_SHEET);if(!f||f.getLastRow()<2)throw new Error('Registre Pluxee vide.');
  const ids=f.getRange(2,1,f.getLastRow()-1,1).getValues().flat(),i=ids.findIndex(v=>String(v)===String(id));if(i<0)throw new Error('Opération Pluxee introuvable.');
  f.getRange(i+2,PLUXEE_HEADERS.indexOf('categorie')+1).setValue(c);return chargerPluxee();
}

function analyserLotPluxee_(operations,source){
  const exist=lirePluxee_(),cles=new Set(exist.map(o=>String(o.cle_rapprochement||''))),details=[];let nouvelles=0,existantes=0,refusees=0,ambigues=0;
  operations.forEach((brut,i)=>{
    if(brut.refuse){refusees++;details.push({index:i+1,statutImport:'refusee',raison:brut.raison||'Transaction refusée',operation:brut});return;}
    try{
      const op=normaliserOperationPluxee_(Object.assign({},brut,{source:source||brut.source||'import'}));
      if(cles.has(op.cle_rapprochement)){existantes++;details.push({index:i+1,statutImport:'existante',operation:op});return;}
      nouvelles++;cles.add(op.cle_rapprochement);details.push({index:i+1,statutImport:'nouvelle',operation:op});
    }catch(e){ambigues++;details.push({index:i+1,statutImport:'ambigue',raison:e.message,operation:brut});}
  });
  return {ok:ambigues===0,version:PLUXEE_VERSION,detectees:operations.length,nouvelles,existantes,refusees,ambigues,details};
}

function normaliserOperationPluxee_(o){
  const d=dateHeurePluxee_(o.date),lib=nettoyerLibellePluxee_(o.libelle),m=Number(o.montant||0);
  if(!d||isNaN(d.getTime()))throw new Error('Date Pluxee invalide.');if(!lib)throw new Error('Libellé Pluxee manquant.');if(!Number.isFinite(m)||Math.abs(m)<.001)throw new Error('Montant Pluxee invalide.');
  const type=m>0?'rechargement':'depense';let cat='';
  if(type==='depense')cat=categoriePluxee_(Object.assign({},o,{libelle:lib,montant:-Math.abs(m)}));
  const iso=Utilities.formatDate(d,Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss");
  const cle=clePluxee_(iso,lib,m,type);
  return {id:o.id||Utilities.getUuid(),date:iso,libelle:lib,montant:arrondirPluxee_(type==='depense'?-Math.abs(m):Math.abs(m)),type,categorie:cat,source:String(o.source||'import'),cle_rapprochement:cle,statut:'valide',date_import:new Date().toISOString()};
}

function categoriePluxee_(o){
  const lib=normaliserTexteBanque_(o.libelle||'');
  if(/^restauration$/.test(lib))return'Restaurants';
  try{
    const index=indexCategoriesIntelligentes_(),ops=lireTable_('Operations'),hist=construireHistoriqueCategories_(ops,index),regles=typeof lireReglesCategories==='function'?lireReglesCategories():[],corr=typeof lireCorrespondancesBancaires==='function'?lireCorrespondancesBancaires():[];
    const fake={date:o.date,libelle:o.libelle,libelle_bancaire:o.libelle,marchand_normalise:o.libelle,montant:-Math.abs(Number(o.montant||0)),type:'depense',compte:'PLUXEE'};
    const p=propositionCategorieOperation_(fake,corr,regles,index,hist),c=p&&p.statut==='propose'?String(p.best.categorie||''):'';
    if(['Courses','Restaurants'].includes(c))return c;
  }catch(e){}
  return'';
}

function parserCollerPluxee_(texte){
  const lignes=String(texte||'').replace(/\r/g,'\n').split(/\n+/).map(nettoyerLigneCollerPluxee_).filter(Boolean),out=[];
  for(let i=0;i<lignes.length;i++){
    const md=lignes[i].match(/^(\d{2}\/\d{2}\/\d{4})(?:\s+à\s+(\d{1,2})h(\d{2}))?$/i);if(!md)continue;
    let lib='';for(let j=i-1;j>=0;j--){const x=lignes[j];if(!x||estBruitCollerPluxee_(x))continue;if(/^[-+]?\d/.test(x)&&/€/.test(x))continue;if(/^\d{2}\/\d{2}\/\d{4}/.test(x))break;lib=x;break;}
    let montant=null,raison='';for(let j=i+1;j<Math.min(lignes.length,i+6);j++){const x=lignes[j];if(/solde insuffisant|pas encore partenaire pluxee/i.test(x))raison=x;const mm=montantPluxeeDepuisTexte_(x);if(mm!==null){montant=mm;break;}if(/^\d{2}\/\d{2}\/\d{4}/.test(x))break;}
    if(montant===null||!lib)continue;
    const date=md[1]+' '+String(md[2]||'12').padStart(2,'0')+':'+String(md[3]||'00').padStart(2,'0');
    out.push({date,libelle:lib,montant,refuse:!!raison,raison});
  }
  return out;
}

function nettoyerLigneCollerPluxee_(s){return String(s||'').replace(/^[-*]+\s*/,'').replace(/^#+\s*/,'').replace(/\[image\]\([^)]*\)/ig,'').replace(/\s+/g,' ').trim();}
function estBruitCollerPluxee_(s){return /^image$/i.test(s)||/assets\/svg|ic-transaction|ic-monet|ic-angle/i.test(s)||/^\d+\s+titres?\s+de\s+/i.test(s);}
function montantPluxeeDepuisTexte_(s){const m=String(s||'').replace(/[\u00a0\u202f]/g,' ').match(/([+-])\s*([\d ]+(?:[,.]\d{2})?)\s*€/);if(!m)return null;const n=Number(m[2].replace(/ /g,'').replace(',','.'));return Number.isFinite(n)?(m[1]==='-'?-n:n):null;}
function nettoyerLibellePluxee_(s){return String(s||'').replace(/\s+/g,' ').trim().replace(/^NaN$/i,'Transaction refusée');}
function dateHeurePluxee_(v){if(v instanceof Date)return new Date(v.getTime());const s=String(v||'').trim();let m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||12),Number(m[5]||0),0);m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2}))?/);if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]||12),Number(m[5]||0),0);const d=new Date(v);return isNaN(d)?null:d;}
function clePluxee_(iso,lib,m,type){return['PLUXEE',String(iso),String(Math.round(Math.abs(Number(m))*100)),normaliserTexteBanque_(lib),type].join('|');}
function ajouterPluxeeEnLot_(ops){if(!ops.length)return;const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PLUXEE_SHEET);const vals=ops.map(o=>PLUXEE_HEADERS.map(h=>o[h]));f.getRange(f.getLastRow()+1,1,vals.length,PLUXEE_HEADERS.length).setValues(vals);}
function arrondirPluxee_(n){return Math.round((Number(n)||0)*100)/100;}
