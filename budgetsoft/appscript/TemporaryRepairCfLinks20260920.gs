/**
 * TEMPORAIRE — 2026-09-20
 * Annule uniquement les 7 liaisons charge_fixe_id créées à tort par la
 * maintenance CF du 20/09/2026. Aucune heuristique : ciblage par ID exact.
 *
 * À supprimer immédiatement après exécution validée.
 */
function annulerSeptLiaisonsCfErroneesTemp20260920(){
  verifierInitialisation_();

  const IDS = [
    'ab07cfa2-6603-45e3-9456-d2a82b51d3ca',
    '1b105e7c-7990-4d7b-9fa1-d4fbda6f73f8',
    'dd883d4e-c187-4c26-9b9b-ad6f71b55439',
    '49af6e8a-9e56-475e-acf7-bedf01366488',
    '629f4122-3f6e-47e3-a09f-ebee29bf51ac',
    '50ec8153-5251-4766-9cac-c09986083ebc',
    '370523e1-2a13-4ec8-a0cb-b1a84211a577'
  ];
  const AUTORISEES = new Set(['charge_fixe_id','statut_bancaire','modifie_le']);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const opsSheet = ss.getSheetByName('Operations');
  const backupSheet = ss.getSheetByName('Operations_sauvegarde_securite');
  if(!opsSheet || !backupSheet) throw new Error('Operations ou Operations_sauvegarde_securite introuvable.');

  const headers = assurerColonnesBancaires_();
  const lire = function(sh){
    if(sh.getLastRow()<2) return [];
    const vals = sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues();
    return vals.map(function(row){
      const o={};
      headers.forEach(function(h,i){o[h]=row[i];});
      return o;
    }).filter(function(o){return String(o.id||'').trim();});
  };

  const avantCourant = lire(opsSheet);
  const sauvegarde = lire(backupSheet);
  const courantParId = new Map(avantCourant.map(function(o){return [String(o.id),o];}));
  const backupParId = new Map(sauvegarde.map(function(o){return [String(o.id),o];}));

  const details=[];
  IDS.forEach(function(id){
    const c=courantParId.get(id), b=backupParId.get(id);
    if(!c || !b) throw new Error('ID cible absent de Operations ou de la sauvegarde : '+id);

    const diffs=[];
    headers.forEach(function(h){
      const cv=c[h] instanceof Date ? c[h].getTime() : String(c[h]??'');
      const bv=b[h] instanceof Date ? b[h].getTime() : String(b[h]??'');
      if(cv!==bv) diffs.push(h);
    });
    const inattendues=diffs.filter(function(h){return !AUTORISEES.has(h);});
    if(inattendues.length){
      throw new Error('STOP '+id+' : différences inattendues avec la sauvegarde : '+inattendues.join(', '));
    }
    if(String(c.charge_fixe_id||'')===String(b.charge_fixe_id||'') &&
       String(c.statut_bancaire||'')===String(b.statut_bancaire||'')){
      throw new Error('STOP '+id+' : la ligne ne présente plus la liaison fautive attendue.');
    }

    details.push({
      id:id,
      libelle:String(c.libelle_bancaire||c.libelle||''),
      montant:Number(c.montant||0),
      chargeFixeAvant:String(c.charge_fixe_id||''),
      chargeFixeRestauree:String(b.charge_fixe_id||''),
      statutAvant:String(c.statut_bancaire||''),
      statutRestaure:String(b.statut_bancaire||'')
    });
  });

  const horodate = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
  const copie = opsSheet.copyTo(ss).setName('Operations_avant_annulation_cf_'+horodate);

  const idxId=headers.indexOf('id'), idxCf=headers.indexOf('charge_fixe_id'),
        idxStatut=headers.indexOf('statut_bancaire'), idxMod=headers.indexOf('modifie_le');
  if([idxId,idxCf,idxStatut,idxMod].some(function(i){return i<0;})) throw new Error('Colonnes requises introuvables.');

  const vals=opsSheet.getRange(2,1,opsSheet.getLastRow()-1,headers.length).getValues();
  let modifiees=0;
  vals.forEach(function(row){
    const id=String(row[idxId]||'');
    if(!IDS.includes(id)) return;
    const b=backupParId.get(id);
    row[idxCf]=b.charge_fixe_id||'';
    row[idxStatut]=b.statut_bancaire||'';
    row[idxMod]=b.modifie_le||'';
    modifiees++;
  });
  if(modifiees!==IDS.length) throw new Error('Nombre de lignes préparées incohérent : '+modifiees+'/'+IDS.length);

  opsSheet.getRange(2,1,vals.length,headers.length).setValues(vals);
  SpreadsheetApp.flush();

  const apres=lire(opsSheet), apresParId=new Map(apres.map(function(o){return [String(o.id),o];}));
  const erreurs=[];
  IDS.forEach(function(id){
    const a=apresParId.get(id), b=backupParId.get(id);
    ['charge_fixe_id','statut_bancaire','modifie_le'].forEach(function(h){
      const av=a[h] instanceof Date ? a[h].getTime() : String(a[h]??'');
      const bv=b[h] instanceof Date ? b[h].getTime() : String(b[h]??'');
      if(av!==bv) erreurs.push(id+' '+h);
    });
  });
  if(apres.length!==avantCourant.length) erreurs.push('cardinal Operations modifié');
  if(erreurs.length){
    opsSheet.clearContents();
    const restore=copie.getDataRange().getValues();
    opsSheet.getRange(1,1,restore.length,restore[0].length).setValues(restore);
    opsSheet.setFrozenRows(1);
    SpreadsheetApp.flush();
    throw new Error('Contrôle post-écriture échoué ; restauration automatique effectuée : '+erreurs.join(' | '));
  }

  let snapshot=null;
  if(typeof reconstruireSnapshotGlobalBudgetSoft20260906==='function'){
    snapshot=reconstruireSnapshotGlobalBudgetSoft20260906('annulation_cf_erronees_20260920');
  }

  const resultat={
    ok:true,
    temporaire:true,
    modifiees:modifiees,
    sauvegardeAvantCorrection:copie.getName(),
    details:details,
    snapshot:snapshot?{
      ok:!!snapshot.ok,
      publie:!!snapshot.publie,
      revisionBudgetSoft:snapshot.revisionBudgetSoft||'',
      erreurs:snapshot.erreurs||[]
    }:null
  };
  Logger.log(JSON.stringify(resultat));
  return resultat;
}
