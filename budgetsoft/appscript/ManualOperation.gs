function enregistrerOperationManuelle(operation){
  if(!operation||typeof operation!=='object')throw new Error('Opération invalide.');
  const o=Object.assign({},operation),existante=o.id?lireTable_('Operations').find(x=>String(x.id)===String(o.id)):null;
  if(existante&&['pdf','flux'].includes(String(existante.source_bancaire||'').toLowerCase())){
    // Une correction manuelle d'une ligne bancaire ne doit pas effacer ses métadonnées de rapprochement.
    ['source_bancaire','date_comptable','date_achat','libelle_bancaire','marchand_normalise','carte_fin','cle_rapprochement','statut_bancaire','charge_fixe_id','cree_le'].forEach(k=>o[k]=existante[k]??'');
  }else{
    // Une saisie réellement manuelle n'est ni un flux provisoire ni une écriture certifiée par PDF.
    o.source_bancaire='manuel';
    o.statut_bancaire='manuel';
    o.date_comptable=o.date||'';
    o.date_achat='';
    o.libelle_bancaire='';
    o.marchand_normalise='';
    o.carte_fin='';
    o.charge_fixe_id=o.charge_fixe_id||'';
  }
  const saved=enregistrerLigne('Operations',o);
  if(!existante){
    // La clé n'est qu'un identifiant technique : elle reste unique sans prétendre à un rapprochement bancaire.
    const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations'),h=TABLES.Operations,idCol=h.indexOf('id')+1,qCol=h.indexOf('cle_rapprochement')+1;
    const ids=f.getRange(2,idCol,f.getLastRow()-1,1).getValues().flat(),p=ids.findIndex(v=>String(v)===String(saved.id));
    if(p>=0)f.getRange(p+2,qCol).setValue('MANUEL|ID:'+saved.id);
    saved.cle_rapprochement='MANUEL|ID:'+saved.id;
  }
  // Si l'opération correspond à une charge fixe connue, les données de référence
  // suivent automatiquement la correction (montant, catégorie, compte, libellé),
  // sans toucher à la fréquence ni au calendrier prévisionnel.
  if(existante&&typeof synchroniserChargeFixeDepuisOperation_==='function'){
    const synchro=synchroniserChargeFixeDepuisOperation_(saved);
    if(synchro&&synchro.charge)saved.charge_fixe_id=synchro.charge.id;
  }
  return saved;
}
