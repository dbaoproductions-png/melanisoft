const CATEGORIES_REVENUS_COMPLEMENTAIRES_=['Concerts','SACEM','Congés spectacles','Crédit de trésorerie','Transfert de trésorerie'];

function installerCategoriesRevenusBudgetSoft(){
  verifierInitialisation_();
  const feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Categories');
  if(!feuille)throw new Error('Onglet Categories introuvable.');
  const entetes=TABLES.Categories;
  const lignes=feuille.getLastRow()>1?feuille.getRange(2,1,feuille.getLastRow()-1,entetes.length).getValues():[];
  const noms=new Set(lignes.map(r=>String(r[1]||'').trim().toLowerCase()).filter(Boolean));
  const ajoutees=[];
  CATEGORIES_REVENUS_COMPLEMENTAIRES_.forEach(nom=>{
    const cle=nom.toLowerCase();
    if(noms.has(cle))return;
    feuille.appendRow([Utilities.getUuid(),nom,'revenu','',true]);
    noms.add(cle);
    ajoutees.push(nom);
  });
  return{ok:true,ajoutees,totalAjoutees:ajoutees.length};
}
