/*
 * BudgetSoft — maintenance intermodule des 12 liens orphelins Avanssur — 2026-09-22.
 *
 * Preuve :
 * - 11 opérations portent exactement le mandat Avanssur/Direct Assurance
 *   MDT 200016364616/1, qui est celui de "Prélèvement Avanssur A" ;
 * - 1 opération Tolosan ne porte aucun motif Avanssur et doit être déliée.
 *
 * La fonction est volontairement bornée aux IDs et signatures constatés par
 * l'audit du 22/09/2026. Elle abandonne dès qu'une précondition n'est plus vraie.
 */
const MAINT_CF_ORPHELINS_AVANSSUR_20260922_VERSION='2026-09-22.1';

function reparerLiensOrphelinsAvanssurIntermodule20260922(){
  const OLD_CF='5f1a2b1a-dc1a-4366-9a37-f1cd2e823c1c';
  const CF_A='2aa5491a-b8a4-4fce-bc44-2df6ae79f59e';
  const TOLOSAN_OP='cbbb5f16-a306-4f22-b1a2-2fc15e11e273';
  const IDS_AVANSSUR=[
    'dd7853a6-7e81-4917-ac63-723600484096',
    'eea74c2c-bb16-49f5-9f45-8bd2da5781d0',
    'bbb4f0e1-e23c-4ef8-af12-e83c7345cfa0',
    'a3ad5505-39e0-40a4-a473-138d20b70972',
    '6af9fb73-7d45-4c5d-9576-08d1a8ddcf27',
    'd77eb7e7-8066-432e-8203-aa236598d5a0',
    '5ae19329-59c3-48c3-aaa0-3d5bcc81874b',
    '70075a72-e1bf-459a-a8f7-b8ebf9936a9d',
    'e4798988-edb9-47e0-886a-ced0469f8019',
    'a4833fe7-4357-493b-9ce8-1d9a9864e912',
    '6eefe28f-8033-4c4d-9fb7-cf7a11c8c2f8'
  ];
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const charges=lireTable_('Charges_fixes')||[];
    const cfA=charges.find(function(c){return String(c&&c.id||'').trim()===CF_A;});
    if(!cfA)throw new Error('ABANDON : Avanssur A introuvable.');
    const bankA=String(cfA.libelle_bancaire||'').toLowerCase();
    if(bankA.indexOf('200016364616/1')<0)throw new Error('ABANDON : le mandat de Avanssur A a changé.');

    const ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('Operations');
    if(!sh)throw new Error('ABANDON : feuille Operations introuvable.');
    const h=TABLES.Operations,idxId=h.indexOf('id'),idxCf=h.indexOf('charge_fixe_id'),idxCom=h.indexOf('commentaire'),idxStat=h.indexOf('statut_bancaire');
    if(idxId<0||idxCf<0)throw new Error('ABANDON : colonnes Operations requises absentes.');
    const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues():[];
    const pos={};rows.forEach(function(r,i){pos[String(r[idxId]||'').trim()]=i;});

    const attendu=IDS_AVANSSUR.concat([TOLOSAN_OP]);
    attendu.forEach(function(id){if(pos[id]===undefined)throw new Error('ABANDON : opération attendue introuvable '+id);});

    IDS_AVANSSUR.forEach(function(id){
      const r=rows[pos[id]],cf=String(r[idxCf]||'').trim();
      if(cf!==OLD_CF&&cf!==CF_A)throw new Error('ABANDON : charge_fixe_id inattendu pour '+id+' : '+cf);
      const op=Object.fromEntries(h.map(function(k,i){return [k,serialiserValeur_(r[i])];}));
      const brut=String(op.libelle_bancaire||op.libelle||'').toLowerCase();
      if(brut.indexOf('avanssur')<0||brut.indexOf('200016364616/1')<0||brut.indexOf('direct assurance')<0)
        throw new Error('ABANDON : signature Avanssur A non prouvée pour '+id);
    });
    {
      const r=rows[pos[TOLOSAN_OP]],cf=String(r[idxCf]||'').trim();
      if(cf!==OLD_CF&&cf!=='')throw new Error('ABANDON : lien Tolosan inattendu : '+cf);
      const op=Object.fromEntries(h.map(function(k,i){return [k,serialiserValeur_(r[i])];}));
      const brut=String(op.libelle_bancaire||op.libelle||'').toLowerCase();
      if(brut.indexOf('tolosan')<0||brut.indexOf('avanssur')>=0)throw new Error('ABANDON : signature Tolosan inattendue.');
    }

    const markerOld='[CHARGE_FIXE:'+OLD_CF+']',markerA='[CHARGE_FIXE:'+CF_A+']';
    IDS_AVANSSUR.forEach(function(id){
      const no=pos[id]+2;
      sh.getRange(no,idxCf+1).setValue(CF_A);
      if(idxCom>=0){
        let com=String(sh.getRange(no,idxCom+1).getValue()||'').replace(markerOld,'').replace(/\s{2,}/g,' ').trim();
        if(com.indexOf(markerA)<0)com=[com,markerA].filter(Boolean).join(' ');
        sh.getRange(no,idxCom+1).setValue(com);
      }
      if(idxStat>=0)sh.getRange(no,idxStat+1).setValue('rapprochee_charge_fixe');
    });
    {
      const no=pos[TOLOSAN_OP]+2;
      sh.getRange(no,idxCf+1).setValue('');
      if(idxCom>=0){
        let com=String(sh.getRange(no,idxCom+1).getValue()||'').replace(markerOld,'').replace(markerA,'').replace(/\s{2,}/g,' ').trim();
        sh.getRange(no,idxCom+1).setValue(com);
      }
      if(idxStat>=0&&String(sh.getRange(no,idxStat+1).getValue()||'')==='rapprochee_charge_fixe')sh.getRange(no,idxStat+1).setValue('');
    }

    const fr=initialiserRapprochementsChargesFixes_(),rh=FIXED_CHARGE_MATCH_HEADERS;
    if(fr&&fr.getLastRow()>1){
      const vals=fr.getRange(2,1,fr.getLastRow()-1,rh.length).getValues();
      const io=rh.indexOf('operation_id'),ic=rh.indexOf('charge_fixe_id'),is=rh.indexOf('statut'),idc=rh.indexOf('decision'),im=rh.indexOf('modifie_le');
      vals.forEach(function(r,i){
        const opId=String(r[io]||'').trim(),cf=String(r[ic]||'').trim();
        if(cf!==OLD_CF)return;
        const no=i+2;
        if(IDS_AVANSSUR.indexOf(opId)>=0){
          fr.getRange(no,ic+1).setValue(CF_A);
          if(is>=0)fr.getRange(no,is+1).setValue('Validé');
          if(idc>=0)fr.getRange(no,idc+1).setValue('Migration intermodule vers Avanssur A — mandat 200016364616/1');
          if(im>=0)fr.getRange(no,im+1).setValue(new Date().toISOString());
        }else if(opId===TOLOSAN_OP){
          if(is>=0)fr.getRange(no,is+1).setValue('Ignoré');
          if(idc>=0)fr.getRange(no,idc+1).setValue('Lien orphelin supprimé — opération Tolosan sans motif Avanssur');
          if(im>=0)fr.getRange(no,im+1).setValue(new Date().toISOString());
        }else throw new Error('ABANDON : autre rapprochement vers OLD_CF détecté : '+opId);
      });
    }

    if(typeof supprimerSnapshotChargesFixes20260828_==='function')supprimerSnapshotChargesFixes20260828_();
    if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('maintenance-cf-orphelins-avanssur-20260922');

    const audit=typeof auditerChargesFixesIntermoduleBudgetSoft20260922==='function'?auditerChargesFixesIntermoduleBudgetSoft20260922(6):null;
    const out={
      ok:!!(audit&&audit.synthese&&Number(audit.synthese.liensOrphelins||0)===0&&Number(audit.synthese.divergencesIntermodules||0)===0),
      version:MAINT_CF_ORPHELINS_AVANSSUR_20260922_VERSION,
      relieesAvanssurA:IDS_AVANSSUR.length,
      delieeTolosan:TOLOSAN_OP,
      cibleAvanssurA:CF_A,
      audit:audit&&audit.synthese||null
    };
    console.log('[MAINT CF ORPHELINS AVANSSUR 20260922] '+JSON.stringify(out));
    return out;
  }finally{lock.releaseLock();}
}


function auditerEtatMaintenanceCfOrphelinsAvanssur20260922(){
  const OLD_CF='5f1a2b1a-dc1a-4366-9a37-f1cd2e823c1c';
  const CF_A='2aa5491a-b8a4-4fce-bc44-2df6ae79f59e';
  const operations=lireTable_('Operations')||[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];

  const ops=operations.filter(function(o){
    const cf=String(o&&o.charge_fixe_id||'').trim();
    const com=String(o&&o.commentaire||'');
    return cf===OLD_CF||cf===CF_A||com.indexOf('[CHARGE_FIXE:'+OLD_CF+']')>=0||com.indexOf('[CHARGE_FIXE:'+CF_A+']')>=0;
  }).map(function(o){
    return{
      id:String(o&&o.id||''),
      date:String(o&&o.date_comptable||o&&o.date||''),
      montant:Number(o&&o.montant||0),
      categorie:String(o&&o.categorie||''),
      libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
      charge_fixe_id:String(o&&o.charge_fixe_id||''),
      commentaire:String(o&&o.commentaire||'')
    };
  });

  const raps=rapprochements.filter(function(r){
    const cf=String(r&&r.charge_fixe_id||'').trim();
    return cf===OLD_CF||cf===CF_A;
  }).map(function(r){
    const opId=String(r&&r.operation_id||'').trim();
    const o=operations.find(function(x){return String(x&&x.id||'').trim()===opId;})||{};
    return{
      id:String(r&&r.id||''),
      operation_id:opId,
      charge_fixe_id:String(r&&r.charge_fixe_id||''),
      statut:String(r&&r.statut||''),
      decision:String(r&&r.decision||''),
      date_operation:String(r&&r.date_operation||''),
      montant_reel:Number(r&&r.montant_reel||0),
      operationExiste:!!(o&&o.id),
      operation_charge_fixe_id:String(o&&o.charge_fixe_id||''),
      operation_montant:Number(o&&o.montant||0),
      operation_categorie:String(o&&o.categorie||''),
      operation_libelle:String(o&&o.libelle_bancaire||o&&o.libelle||'')
    };
  });

  const out={
    ok:true,
    lectureSeule:true,
    version:MAINT_CF_ORPHELINS_AVANSSUR_20260922_VERSION,
    operationsOldCf:ops.filter(function(x){return x.charge_fixe_id===OLD_CF||x.commentaire.indexOf('[CHARGE_FIXE:'+OLD_CF+']')>=0;}).length,
    operationsCfA:ops.filter(function(x){return x.charge_fixe_id===CF_A||x.commentaire.indexOf('[CHARGE_FIXE:'+CF_A+']')>=0;}).length,
    rapprochementsOldCf:raps.filter(function(x){return x.charge_fixe_id===OLD_CF;}).length,
    rapprochementsCfA:raps.filter(function(x){return x.charge_fixe_id===CF_A;}).length,
    operations:ops,
    rapprochements:raps
  };
  console.log('[AUDIT ETAT MAINT CF ORPHELINS AVANSSUR 20260922] '+JSON.stringify(out));
  raps.forEach(function(x,i){
    console.log('[RAPPRO AVANSSUR '+String(i+1).padStart(2,'0')+'] '
      +x.operation_id+' | cf='+x.charge_fixe_id+' | statut='+x.statut
      +' | montant='+x.operation_montant+' | cat='+x.operation_categorie
      +' | '+x.operation_libelle);
  });
  return out;
}
