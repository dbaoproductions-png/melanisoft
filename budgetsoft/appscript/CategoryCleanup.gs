function fusionnerCategoriesBancaires(){
  verifierInitialisation_();
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const alias=new Set(['frais bancaires','opérations bancaires','operations bancaires','opération bancaire','operation bancaire']);
  let categoriesModifiees=0,operationsModifiees=0,correspondancesModifiees=0;

  const cat=ss.getSheetByName('Categories');
  if(cat&&cat.getLastRow()>1){
    const vals=cat.getRange(2,1,cat.getLastRow()-1,TABLES.Categories.length).getValues();
    let banqueIndex=vals.findIndex(r=>String(r[1]||'').trim().toLowerCase()==='banque');
    for(let i=vals.length-1;i>=0;i--){
      const nom=String(vals[i][1]||'').trim().toLowerCase();
      if(!alias.has(nom))continue;
      if(banqueIndex<0){cat.getRange(i+2,2).setValue('Banque');banqueIndex=i;categoriesModifiees++;}
      else{cat.deleteRow(i+2);categoriesModifiees++;if(i<banqueIndex)banqueIndex--;}
    }
  }

  const ops=ss.getSheetByName('Operations');
  if(ops&&ops.getLastRow()>1){
    const c=TABLES.Operations.indexOf('categorie')+1,plage=ops.getRange(2,c,ops.getLastRow()-1,1),vals=plage.getValues();
    vals.forEach(r=>{if(alias.has(String(r[0]||'').trim().toLowerCase())){r[0]='Banque';operationsModifiees++;}});
    if(operationsModifiees)plage.setValues(vals);
  }

  try{
    const f=ss.getSheetByName(BANK_MAPPING_SHEET);
    if(f&&f.getLastRow()>1){
      const c=BANK_MAPPING_HEADERS.indexOf('categorie')+1,plage=f.getRange(2,c,f.getLastRow()-1,1),vals=plage.getValues();
      vals.forEach(r=>{if(alias.has(String(r[0]||'').trim().toLowerCase())){r[0]='Banque';correspondancesModifiees++;}});
      if(correspondancesModifiees)plage.setValues(vals);
    }
  }catch(e){}

  return {ok:true,categoriesModifiees,operationsModifiees,correspondancesModifiees};
}
