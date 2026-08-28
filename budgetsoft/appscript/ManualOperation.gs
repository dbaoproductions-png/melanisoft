function enregistrerOperationManuelle(operation){
  if(!operation||typeof operation!=='object')throw new Error('Opération invalide.');
  const o=Object.assign({},operation),existante=o.id?lireTable_('Operations').find(x=>String(x.id)===String(o.id)):null;
  const sourceExistante=String(existante&&existante.source_bancaire||'').trim().toLowerCase();
  const estLigneBancaire=!!existante&&sourceExistante&&sourceExistante!=='manuel';

  if(existante){
    // Les marqueurs techniques restent internes même si le commentaire métier est modifié.
    const techniques=(String(existante.commentaire||'').match(/\[(?:RECURRENCE|AUDIT_[A-Z0-9_]*|VALIDATION_RAPPROCHEMENT|AUDIT_RETRO|PDF:HELLOBANK|CARTE_DIFFEREE|CORRESPONDANCE|RAPPROCHEMENT|RAPPROCHEMENT_MANUEL|EXCEPTIONNEL_PREVISION)(?::[^\]]*)?\]/g)||[]);
    const commentaireMetier=String(o.commentaire||'').trim();
    o.commentaire=[commentaireMetier,...techniques.filter((v,i,a)=>a.indexOf(v)===i)].filter(Boolean).join(' ');
  }

  if(estLigneBancaire){
    // Une correction métier d'une ligne bancaire ne doit jamais dégrader la couche bancaire,
    // quelle que soit la source réelle actuelle (HELLOBANK_PDF, flux, pdf, etc.).
    ['source_bancaire','date_comptable','date_achat','libelle_bancaire','marchand_normalise','carte_fin','cle_rapprochement','statut_bancaire','charge_fixe_id','cree_le'].forEach(k=>o[k]=existante[k]??'');
  }else{
    // Une saisie réellement manuelle reste identifiable comme telle et pourra ensuite
    // être rapprochée/certifiée par un import bancaire réel.
    o.source_bancaire='manuel';
    o.statut_bancaire='manuel';
    o.date_comptable=o.date||existante?.date_comptable||'';
    o.date_achat='';
    o.libelle_bancaire='';
    o.marchand_normalise='';
    o.carte_fin='';
    o.charge_fixe_id=o.charge_fixe_id||existante?.charge_fixe_id||'';
    if(existante?.cree_le)o.cree_le=existante.cree_le;
    if(existante?.cle_rapprochement)o.cle_rapprochement=existante.cle_rapprochement;
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
