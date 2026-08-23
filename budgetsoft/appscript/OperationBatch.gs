function categoriserOperationsParLot(ids,categorie){
  verifierInitialisation_();
  const selection=[...new Set((Array.isArray(ids)?ids:[]).map(v=>String(v||'').trim()).filter(Boolean))];
  const cible=String(categorie||'').trim();
  if(!selection.length)throw new Error('Aucune opération sélectionnée.');
  if(!cible)throw new Error('Choisissez une catégorie.');

  const categories=lireTable_('Categories');
  const ref=categories.find(c=>String(c.nom||'').trim()===cible && String(c.actif).toLowerCase()!=='false');
  if(!ref)throw new Error('Catégorie inconnue ou inactive : '+cible);

  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const feuille=ss.getSheetByName('Operations');
  if(!feuille||feuille.getLastRow()<2)throw new Error('Aucune opération enregistrée.');
  const entetes=feuille.getRange(1,1,1,feuille.getLastColumn()).getValues()[0].map(v=>String(v||'').trim());
  const idCol=entetes.indexOf('id');
  const catCol=entetes.indexOf('categorie');
  if(idCol<0||catCol<0)throw new Error('Colonnes id/categorie introuvables dans Operations.');

  const nb=feuille.getLastRow()-1;
  const idsFeuille=feuille.getRange(2,idCol+1,nb,1).getValues().flat().map(String);
  const categoriesFeuille=feuille.getRange(2,catCol+1,nb,1).getValues();
  const setIds=new Set(selection);
  let trouvees=0,modifiees=0,dejaCorrectes=0;
  for(let i=0;i<idsFeuille.length;i++){
    if(!setIds.has(idsFeuille[i]))continue;
    trouvees++;
    const actuelle=String(categoriesFeuille[i][0]||'').trim();
    if(actuelle===cible){dejaCorrectes++;continue;}
    categoriesFeuille[i][0]=cible;
    modifiees++;
  }
  if(modifiees)feuille.getRange(2,catCol+1,nb,1).setValues(categoriesFeuille);
  return{selectionnees:selection.length,trouvees,modifiees,dejaCorrectes,categorie:cible};
}
