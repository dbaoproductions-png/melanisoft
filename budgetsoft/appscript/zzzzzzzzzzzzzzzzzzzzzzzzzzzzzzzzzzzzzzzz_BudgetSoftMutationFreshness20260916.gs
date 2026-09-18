const BUDGETSOFT_MUTATION_FRESHNESS_20260916_VERSION='2026-09-17.2';
const BUDGETSOFT_GLOBAL_DIRTY_AT_20260916='BUDGETSOFT_GLOBAL_SNAPSHOT_DIRTY_LE';
const BUDGETSOFT_GLOBAL_DIRTY_ORIGIN_20260916='BUDGETSOFT_GLOBAL_SNAPSHOT_DIRTY_ORIGINE';

function marquerSnapshotGlobalBudgetSoftObsolete20260916_(origine){
  const p=PropertiesService.getDocumentProperties(),maintenant=new Date().toISOString();
  p.setProperty(BUDGETSOFT_GLOBAL_DIRTY_AT_20260916,maintenant);
  p.setProperty(BUDGETSOFT_GLOBAL_DIRTY_ORIGIN_20260916,String(origine||'mutation'));
  return{ok:true,version:BUDGETSOFT_MUTATION_FRESHNESS_20260916_VERSION,obsoleteDepuis:maintenant,origine:String(origine||'mutation')};
}

function compteLignesSourceSnapshot20260916_(nom){
  try{const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(String(nom||''));return f?Math.max(0,f.getLastRow()-1):0;}catch(e){return null;}
}

function diagnostiquerPeremptionSnapshot20260916_(etat){
  const p=PropertiesService.getDocumentProperties(),dirtyAt=p.getProperty(BUDGETSOFT_GLOBAL_DIRTY_AT_20260916)||'',dirtyOrigin=p.getProperty(BUDGETSOFT_GLOBAL_DIRTY_ORIGIN_20260916)||'';
  const genereLe=String(etat&&etat.genereLe||'');
  const raisons=[];
  if(dirtyAt&&(!genereLe||dirtyAt>genereLe))raisons.push({code:'MUTATION_APRES_SNAPSHOT',dirtyAt,genereLe,origine:dirtyOrigin});
  const attendues=etat&&etat.modules&&etat.modules.sourceMeta&&etat.modules.sourceMeta.tables||{};
  ['Operations','Charges_fixes','Comptes','Parametres','Categories','Credits','Dettes','Actifs'].forEach(nom=>{
    if(!Object.prototype.hasOwnProperty.call(attendues,nom))return;
    const courant=compteLignesSourceSnapshot20260916_(nom),attendu=Number(attendues[nom]);
    if(courant!==null&&Number.isFinite(attendu)&&courant!==attendu)raisons.push({code:'NOMBRE_LIGNES_SOURCE_MODIFIE',table:nom,attendu,courant});
  });
  return{perime:raisons.length>0,raisons,dirtyAt,dirtyOrigin,genereLe};
}

/**
 * Override terminal du chargeur global : une révision publiée n'est plus servie
 * si une mutation métier lui est postérieure ou si le volume d'une table source
 * a changé. Les consommateurs snapshot-first retombent alors sur leur moteur frais.
 */
function chargerSnapshotGlobalBudgetSoft20260906(){
  const props=PropertiesService.getDocumentProperties(),rawMeta=props.getProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'META');
  if(!rawMeta)return{ok:true,disponible:false,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION};
  try{
    const meta=JSON.parse(rawMeta),n=Number(meta.morceaux||0);if(!n)return{ok:true,disponible:false,corrompu:true,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION};
    let raw='';for(let i=0;i<n;i++){const part=props.getProperty(BUDGETSOFT_GLOBAL_SNAPSHOT_PREFIX+'PART_'+i);if(part==null)throw new Error('Snapshot incomplet');raw+=part;}
    const etat=JSON.parse(decoderEtatGlobalBudgetSoft20260906_(raw));
    const fraicheur=diagnostiquerPeremptionSnapshot20260916_(etat);
    if(fraicheur.perime)return{ok:true,disponible:false,perime:true,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,revisionBudgetSoft:etat.revisionBudgetSoft||'',genereLe:etat.genereLe||'',fraicheur};
    return{ok:true,disponible:true,perime:false,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,revisionBudgetSoft:etat.revisionBudgetSoft,genereLe:etat.genereLe,etat,fraicheur};
  }catch(e){return{ok:false,disponible:false,corrompu:true,version:BUDGETSOFT_GLOBAL_SNAPSHOT_VERSION,erreur:String(e&&e.message||e)};}
}

function auditerFraicheurSnapshotGlobalBudgetSoft20260916(){
  const r=chargerSnapshotGlobalBudgetSoft20260906();
  const out={ok:r.ok===true,version:BUDGETSOFT_MUTATION_FRESHNESS_20260916_VERSION,disponible:!!r.disponible,perime:!!r.perime,revisionBudgetSoft:r.revisionBudgetSoft||'',genereLe:r.genereLe||'',fraicheur:r.fraicheur||null};
  console.log('[FRAICHEUR SNAPSHOT GLOBAL 20260916] '+JSON.stringify(out));return out;
}

/** Mutation générique : toute table qui alimente les cartes globales périme le snapshot. */
function enregistrerLigne(nom,ligne){
  verifierNomTable_(nom);verifierInitialisation_();if(!ligne||typeof ligne!=='object')throw new Error('Donnée invalide.');
  const feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom),entetes=TABLES[nom],maintenant=new Date().toISOString(),copie=Object.assign({},ligne);
  if(nom==='Comptes'){copie.nom=String(copie.nom||'').trim();if(!copie.nom)throw new Error('Le nom du compte est obligatoire.');copie.type=String(copie.type||'courant').trim();copie.solde_initial=convertirNombre_(copie.solde_initial);copie.actif=convertirBooleen_(copie.actif);}
  if(nom==='Operations')normaliserOperation_(copie);if(nom==='Charges_fixes')normaliserChargeFixe_(copie);
  if(entetes.includes('id')&&!copie.id)copie.id=Utilities.getUuid();if(entetes.includes('cree_le')&&!copie.cree_le)copie.cree_le=maintenant;if(entetes.includes('modifie_le'))copie.modifie_le=maintenant;
  const verrou=LockService.getDocumentLock();verrou.waitLock(10000);
  try{
    const idIndex=entetes.indexOf('id');let ligneCible=-1;
    if(idIndex>=0&&copie.id&&feuille.getLastRow()>1){const ids=feuille.getRange(2,idIndex+1,feuille.getLastRow()-1,1).getValues().flat(),position=ids.findIndex(id=>String(id)===String(copie.id));if(position>=0)ligneCible=position+2;}
    const valeurs=entetes.map(cle=>normaliserValeur_(copie[cle]));if(ligneCible>0)feuille.getRange(ligneCible,1,1,entetes.length).setValues([valeurs]);else feuille.appendRow(valeurs);
  }finally{verrou.releaseLock();}
  if(['Operations','Charges_fixes','Comptes','Parametres','Categories','Credits','Dettes','Actifs','Budget'].includes(String(nom)))marquerSnapshotGlobalBudgetSoftObsolete20260916_('enregistrerLigne:'+String(nom));
  return copie;
}

function supprimerLigne(nom,id){
  verifierNomTable_(nom);verifierInitialisation_();const entetes=TABLES[nom],idIndex=entetes.indexOf('id');if(idIndex<0)throw new Error('Cette table ne comporte pas d’identifiant.');
  const feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);if(feuille.getLastRow()<2)return false;
  const ids=feuille.getRange(2,idIndex+1,feuille.getLastRow()-1,1).getValues().flat(),position=ids.findIndex(v=>String(v)===String(id));if(position<0)return false;
  feuille.deleteRow(position+2);
  if(['Operations','Charges_fixes','Comptes','Parametres','Categories','Credits','Dettes','Actifs','Budget'].includes(String(nom)))marquerSnapshotGlobalBudgetSoftObsolete20260916_('supprimerLigne:'+String(nom));
  return true;
}

/** La catégorisation modifie Cerbère/analyses mais jamais les flux financiers. */
function categoriserOperationsParLot(ids,categorie){
  verifierInitialisation_();
  const selection=[...new Set((Array.isArray(ids)?ids:[]).map(v=>String(v||'').trim()).filter(Boolean))];const cible=String(categorie||'').trim();
  if(!selection.length)throw new Error('Aucune opération sélectionnée.');if(!cible)throw new Error('Choisissez une catégorie.');
  const categories=lireTable_('Categories'),ref=categories.find(c=>String(c.nom||'').trim()===cible&&String(c.actif).toLowerCase()!=='false');if(!ref)throw new Error('Catégorie inconnue ou inactive : '+cible);
  const feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');if(!feuille||feuille.getLastRow()<2)throw new Error('Aucune opération enregistrée.');
  const entetes=feuille.getRange(1,1,1,feuille.getLastColumn()).getValues()[0].map(v=>String(v||'').trim()),idCol=entetes.indexOf('id'),catCol=entetes.indexOf('categorie');if(idCol<0||catCol<0)throw new Error('Colonnes id/categorie introuvables dans Operations.');
  const nb=feuille.getLastRow()-1,idsFeuille=feuille.getRange(2,idCol+1,nb,1).getValues().flat().map(String),categoriesFeuille=feuille.getRange(2,catCol+1,nb,1).getValues(),setIds=new Set(selection);let trouvees=0,modifiees=0,dejaCorrectes=0;
  for(let i=0;i<idsFeuille.length;i++){if(!setIds.has(idsFeuille[i]))continue;trouvees++;const actuelle=String(categoriesFeuille[i][0]||'').trim();if(actuelle===cible){dejaCorrectes++;continue;}categoriesFeuille[i][0]=cible;modifiees++;}
  if(modifiees){feuille.getRange(2,catCol+1,nb,1).setValues(categoriesFeuille);marquerSnapshotGlobalBudgetSoftObsolete20260916_('categorisation_operations_par_lot');}
  return{selectionnees:selection.length,trouvees,modifiees,dejaCorrectes,categorie:cible};
}

/**
 * Propriétaire interne de fraîcheur pour l'écriture Cerbère.
 * Le moteur métier reste dans CerbereConsolidation.gs ; cette couche ne fait
 * qu'ajouter l'invalidation du snapshot global après une sauvegarde réussie.
 */
function sauvegarderPilotageCerbereAvecFraicheur20260917_(d){
  if(typeof sauvegarderPilotageCerbereMoteur20260903_!=='function')throw new Error('Moteur de sauvegarde Cerbère indisponible.');
  const r=sauvegarderPilotageCerbereMoteur20260903_(d);
  marquerSnapshotGlobalBudgetSoftObsolete20260916_('cerbere-pilotage-p1');
  return r;
}
