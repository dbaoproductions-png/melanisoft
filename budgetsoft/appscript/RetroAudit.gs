const RETRO_AUDIT_SHEET = 'Corrections_a_valider';
const RETRO_AUDIT_HEADERS = ['id','operation_id','statut','raison','confiance','libelle_actuel','libelle_propose','categorie_actuelle','categorie_proposee','type_actuel','type_propose','compte','date_operation','montant','decision','cree_le','modifie_le'];

function initialiserAuditRetro_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let f=ss.getSheetByName(RETRO_AUDIT_SHEET);
  if(!f)f=ss.insertSheet(RETRO_AUDIT_SHEET);
  if(f.getLastRow()===0)f.getRange(1,1,1,RETRO_AUDIT_HEADERS.length).setValues([RETRO_AUDIT_HEADERS]);
  f.setFrozenRows(1);
  f.getRange(1,1,1,RETRO_AUDIT_HEADERS.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#fff');
  return f;
}

function lireAuditRetro(){
  const f=initialiserAuditRetro_();
  if(f.getLastRow()<2)return [];
  return f.getRange(2,1,f.getLastRow()-1,RETRO_AUDIT_HEADERS.length).getValues().filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>Object.fromEntries(RETRO_AUDIT_HEADERS.map((h,i)=>[h,r[i] instanceof Date?r[i].toISOString():r[i]])));
}

function lancerAuditRetro(){
  verifierInitialisation_();
  initialiserCorrespondancesBancaires();
  const f=initialiserAuditRetro_();
  const operations=lireTable_('Operations').filter(o=>!String(o.commentaire||'').includes('[RECURRENCE:'));
  const correspondances=lireCorrespondancesBancaires();
  const existants=lireAuditRetro();
  const deja=new Set(existants.filter(x=>String(x.statut)==='À valider').map(x=>String(x.operation_id)));
  const ajouts=[];
  const maintenant=new Date().toISOString();

  operations.forEach(o=>{
    if(deja.has(String(o.id)))return;
    const commentaire=String(o.commentaire||'');
    const m=commentaire.match(/Libellé bancaire\s*:\s*([^\[]+)/i);
    const brut=(m?m[1]:o.libelle||'').trim();
    if(!brut)return;
    const corr=trouverCorrespondanceBancaire_(brut,o.compte,correspondances);
    const catAct=String(o.categorie||'').trim();
    const typeAct=String(o.type||'').trim().toLowerCase();
    const catRegle=suggererCategorieHelloBank_(brut,typeAct);
    const catProp=String(corr?.categorie||catRegle||'').trim();
    const typeProp=String(corr?.type||typeAct||'').trim().toLowerCase();
    const libProp=String(corr?.libelle_normalise||'').trim();
    const raisons=[];
    let confiance=0;
    if(!catAct&&catProp){raisons.push('Catégorie manquante');confiance=Math.max(confiance,corr?95:75);}
    else if(catAct&&catProp&&normaliserTexteBanque_(catAct)!==normaliserTexteBanque_(catProp)){raisons.push('Catégorie incohérente');confiance=Math.max(confiance,corr?90:65);}
    if(typeProp&&typeAct&&typeProp!==typeAct){raisons.push('Type incohérent');confiance=Math.max(confiance,corr?95:70);}
    if(libProp&&normaliserTexteBanque_(libProp)!==normaliserTexteBanque_(o.libelle||'')&&String(o.libelle||'').length>60){raisons.push('Libellé non normalisé');confiance=Math.max(confiance,85);}
    if(!raisons.length)return;
    ajouts.push({
      id:Utilities.getUuid(),operation_id:o.id,statut:'À valider',raison:raisons.join(' · '),confiance,
      libelle_actuel:o.libelle||'',libelle_propose:libProp||o.libelle||'',
      categorie_actuelle:catAct,categorie_proposee:catProp||catAct,
      type_actuel:typeAct,type_propose:typeProp||typeAct,
      compte:o.compte||'',date_operation:o.date,montant:o.montant,
      decision:'',cree_le:maintenant,modifie_le:maintenant
    });
  });
  if(ajouts.length){const lignes=ajouts.map(x=>RETRO_AUDIT_HEADERS.map(h=>x[h]==null?'':x[h]));f.getRange(f.getLastRow()+1,1,lignes.length,RETRO_AUDIT_HEADERS.length).setValues(lignes);}
  return {analysees:operations.length,nouvelles:ajouts.length,aValider:lireAuditRetro().filter(x=>String(x.statut)==='À valider').length};
}

function deciderAuditRetro(id,decision,modifications){
  const choix=String(decision||'').toLowerCase();
  if(!['appliquer','ignorer'].includes(choix))throw new Error('Décision inconnue.');
  const f=initialiserAuditRetro_(),liste=lireAuditRetro(),item=liste.find(x=>String(x.id)===String(id));
  if(!item)throw new Error('Proposition introuvable.');
  if(String(item.statut)!=='À valider')throw new Error('Cette proposition a déjà été traitée.');

  const mod=modifications&&typeof modifications==='object'?modifications:{};
  const libelleFinal=String(mod.libelle!==undefined?mod.libelle:item.libelle_propose||'').trim();
  const categorieFinale=String(mod.categorie!==undefined?mod.categorie:item.categorie_proposee||'').trim();
  const typeFinal=String(mod.type!==undefined?mod.type:item.type_propose||'').trim().toLowerCase();
  if(choix==='appliquer'){
    if(!libelleFinal)throw new Error('Le libellé proposé ne peut pas être vide.');
    if(!['depense','revenu'].includes(typeFinal))throw new Error('Le type doit être Dépense ou Revenu.');
    const op=lireTable_('Operations').find(o=>String(o.id)===String(item.operation_id));
    if(!op)throw new Error('Opération introuvable.');
    enregistrerLigne('Operations',{
      id:op.id,date:op.date,libelle:libelleFinal,categorie:categorieFinale,
      compte:op.compte,montant:Math.abs(Number(op.montant||0)),type:typeFinal,
      commentaire:[op.commentaire||'','[AUDIT_RETRO:'+item.id+']'].filter(Boolean).join(' '),cree_le:op.cree_le||''
    });
  }

  const ids=f.getRange(2,1,f.getLastRow()-1,1).getValues().flat();
  const pos=ids.findIndex(v=>String(v)===String(id));
  const ligne=pos+2,vals=f.getRange(ligne,1,1,RETRO_AUDIT_HEADERS.length).getValues()[0],obj=Object.fromEntries(RETRO_AUDIT_HEADERS.map((h,i)=>[h,vals[i]]));
  if(choix==='appliquer'){
    obj.libelle_propose=libelleFinal;
    obj.categorie_proposee=categorieFinale;
    obj.type_propose=typeFinal;
  }
  obj.statut=choix==='appliquer'?'Traité':'Ignoré';
  obj.decision=choix==='appliquer'?'Correction validée par l’utilisateur':'Proposition ignorée';
  obj.modifie_le=new Date().toISOString();
  f.getRange(ligne,1,1,RETRO_AUDIT_HEADERS.length).setValues([RETRO_AUDIT_HEADERS.map(h=>obj[h]==null?'':obj[h])]);
  return {ok:true,restant:lireAuditRetro().filter(x=>String(x.statut)==='À valider').length};
}
