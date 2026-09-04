const DETTES_DATA_V2_VERSION = '1.1-2026-09-04';

const DETTES_STRUCTURELLES_20082026 = [
  {source_cle:'conservatoire-studio-42-20',nom:'Studio Conservatoire',creancier:'Conservatoire',categorie_dette:'Conservatoire',montant_initial:42.20,capital_restant:42.20,mensualite:0,taux:0,date_echeance:'',statut:'a_payer',priorite:'non_definie',commentaire:'Dette hors crédit communiquée le 20/08/2026.',actif:true},
  {source_cle:'conservatoire-scolarite-400',nom:'Frais de scolarité Conservatoire',creancier:'Conservatoire',categorie_dette:'Conservatoire',montant_initial:400,capital_restant:400,mensualite:0,taux:0,date_echeance:'',statut:'a_payer',priorite:'non_definie',commentaire:'Dette hors crédit communiquée le 20/08/2026.',actif:true},
  {source_cle:'dentiste-protheses-800',nom:'Dentiste (prothèses)',creancier:'Dentiste',categorie_dette:'Santé',montant_initial:800,capital_restant:800,mensualite:0,taux:0,date_echeance:'',statut:'a_payer',priorite:'non_definie',commentaire:'Dette hors crédit communiquée le 20/08/2026.',actif:true}
];

const DETTES_V2_COLONNES = ['id','source_cle','nom','creancier','categorie_dette','montant_initial','capital_restant','mensualite','taux','date_echeance','statut','priorite','commentaire','actif'];

function assurerTableDettesV2_() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let f=ss.getSheetByName('Dettes');
  if(!f) f=ss.insertSheet('Dettes');
  let entetes=f.getLastColumn()>0?f.getRange(1,1,1,Math.max(1,f.getLastColumn())).getValues()[0].map(v=>String(v||'').trim()):[];
  if(!entetes.some(Boolean)){f.getRange(1,1,1,DETTES_V2_COLONNES.length).setValues([DETTES_V2_COLONNES]);entetes=DETTES_V2_COLONNES.slice();}
  else {
    const manquantes=DETTES_V2_COLONNES.filter(c=>!entetes.includes(c));
    if(manquantes.length){f.getRange(1,entetes.length+1,1,manquantes.length).setValues([manquantes]);entetes=entetes.concat(manquantes);}
  }
  return {feuille:f,entetes};
}

/** Migration historique explicite uniquement. Ne jamais appeler cette fonction pendant un simple chargement. */
function migrerDettesStructurelles20082026_() {
  const t=assurerTableDettesV2_(),f=t.feuille,entetes=t.entetes,index=Object.fromEntries(entetes.map((h,i)=>[h,i]));
  const valeurs=f.getLastRow()>1?f.getRange(2,1,f.getLastRow()-1,entetes.length).getValues():[];
  const ajouts=[];
  DETTES_STRUCTURELLES_20082026.forEach(modele=>{
    const existe=valeurs.some(l=>String(l[index.source_cle]||'').trim()===modele.source_cle);
    if(existe)return;
    const ligne=Array(entetes.length).fill('');ligne[index.id]=Utilities.getUuid();Object.keys(modele).forEach(k=>{if(index[k]!==undefined)ligne[index[k]]=modele[k];});
    ajouts.push(ligne);valeurs.push(ligne);
  });
  if(ajouts.length)f.getRange(f.getLastRow()+1,1,ajouts.length,entetes.length).setValues(ajouts);
  return {ok:true,ajoutees:ajouts.length};
}
function migrerDettesStructurelles20082026(){verifierInitialisation_();const r=migrerDettesStructurelles20082026_();return Object.assign({},r,{dettes:lireDettesV2_()});}

function lireDettesV2_() {
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dettes');
  if(!f||f.getLastRow()<2)return [];
  const largeur=Math.max(1,f.getLastColumn()),entetes=f.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim());
  const valeurs=f.getRange(2,1,f.getLastRow()-1,largeur).getValues();
  return valeurs.filter(l=>l.some(v=>v!==''&&v!==null)).map(l=>{const o={};entetes.forEach((h,i)=>{if(h)o[h]=serialiserValeur_(l[i]);});return o;});
}

function enregistrerDetteV2(d){
  verifierInitialisation_();d=d||{};const t=assurerTableDettesV2_(),f=t.feuille,hs=t.entetes;
  const nom=String(d.nom||'').trim();if(!nom)throw new Error('Le nom de la dette est obligatoire.');
  const capital=Math.max(0,convertirNombre_(d.capital_restant||0));
  const objet={
    id:String(d.id||'').trim()||Utilities.getUuid(),source_cle:String(d.source_cle||'').trim(),nom,
    creancier:String(d.creancier||'').trim(),categorie_dette:String(d.categorie_dette||'').trim(),
    montant_initial:Math.max(0,convertirNombre_(d.montant_initial!=null?d.montant_initial:capital)),capital_restant:capital,
    mensualite:Math.max(0,convertirNombre_(d.mensualite||0)),taux:Math.max(0,convertirNombre_(d.taux||0)),
    date_echeance:d.date_echeance?new Date(d.date_echeance):'',statut:String(d.statut||(capital>0?'a_payer':'payee')).trim(),
    priorite:String(d.priorite||'non_definie').trim(),commentaire:String(d.commentaire||'').trim(),actif:d.actif===false||String(d.actif).toLowerCase()==='false'?false:true
  };
  if(capital<=0){objet.statut='payee';objet.actif=false;}
  const idCol=hs.indexOf('id');let ligne=-1;
  if(idCol>=0&&f.getLastRow()>1){const ids=f.getRange(2,idCol+1,f.getLastRow()-1,1).getValues().flat();const p=ids.findIndex(v=>String(v)===objet.id);if(p>=0)ligne=p+2;}
  const vals=hs.map(h=>objet[h]!==undefined?normaliserValeur_(objet[h]):'');
  if(ligne>0)f.getRange(ligne,1,1,hs.length).setValues([vals]);else f.appendRow(vals);
  if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('dette-v2');
  return objet;
}

function cloturerDetteV2(id){
  const d=lireDettesV2_().find(x=>String(x.id)===String(id));if(!d)throw new Error('Dette introuvable.');
  d.capital_restant=0;d.statut='payee';d.actif=false;return enregistrerDetteV2(d);
}
function reactiverDetteV2(id){
  const d=lireDettesV2_().find(x=>String(x.id)===String(id));if(!d)throw new Error('Dette introuvable.');
  d.actif=true;if(Number(d.capital_restant||0)<=0)d.capital_restant=Math.max(0,Number(d.montant_initial||0));d.statut='a_payer';return enregistrerDetteV2(d);
}
function supprimerDetteV2(id){supprimerLigne('Dettes',id);if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('suppression-dette-v2');return{ok:true,id:String(id)};}

function chargerDettesHorsCreditV2() {
  const dettes=lireDettesV2_(),actives=dettes.filter(d=>String(d.actif).toLowerCase()!=='false'&&Number(d.capital_restant||0)>0);
  return {version:DETTES_DATA_V2_VERSION,lignes:dettes,actives,nombreActives:actives.length,totalRestant:Math.round(actives.reduce((s,d)=>s+Math.abs(Number(d.capital_restant||0)),0)*100)/100};
}
