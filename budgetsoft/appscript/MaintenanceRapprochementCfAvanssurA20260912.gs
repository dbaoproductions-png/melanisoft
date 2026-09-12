/*
 * Maintenance ONE-SHOT — rapprochement CF intermodule Avanssur A.
 *
 * Doctrine :
 * - Operations reste le propriétaire du réel bancaire ;
 * - Charges_fixes reste le référentiel prévisionnel ;
 * - Rapprochements_charges_fixes porte la décision canonique ;
 * - aucun correctif local Cerbère.
 *
 * La fonction refuse toute écriture si les préconditions métier connues
 * (opération, montant, date, ancien lien B, charge A unique) ne sont pas remplies.
 */
const MAINT_RAPPRO_CF_AVANSSUR_A_20260912_VERSION='2026-09-12.1';

function reparerRapprochementCfAvanssurA20260912(){
  const OP_ID='d3c5df17-d65a-4383-8a05-341fdc684eab';
  const CF_B_ID='433feb19-297f-41fa-80fa-d7e64e40ae36';
  const MONTANT_ATTENDU=12.85;
  const DATE_ATTENDUE='2026-08-28';
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    if(typeof lierOperationChargeFixe_!=='function')throw new Error('Primitive canonique lierOperationChargeFixe_ indisponible.');
    if(typeof initialiserRapprochementsChargesFixes_!=='function'||typeof lireRapprochementsChargesFixes!=='function')throw new Error('Propriétaire Rapprochements_charges_fixes indisponible.');

    const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const actif=v=>{const s=String(v==null?'':v).trim().toLowerCase();return v===true||s==='true'||s==='1'||s==='oui'||s==='actif';};
    const dateIso=v=>{const d=v instanceof Date?v:new Date(v);return isNaN(d.getTime())?'':Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');};
    const arr=n=>Math.round(Number(n||0)*100)/100;

    const operations=lireTable_('Operations')||[];
    const op=operations.find(o=>String(o&&o.id||'').trim()===OP_ID);
    if(!op)throw new Error('ABANDON : opération Avanssur 12,85 introuvable : '+OP_ID);
    const montant=arr(Math.abs(Number(op.montant||0)));
    const date=dateIso(op.date_comptable||op.date||op.date_operation);
    const ancienCf=String(op.charge_fixe_id||'').trim();
    if(Math.abs(montant-MONTANT_ATTENDU)>.001)throw new Error('ABANDON : montant opération inattendu : '+montant+' au lieu de 12.85.');
    if(date!==DATE_ATTENDUE)throw new Error('ABANDON : date opération inattendue : '+date+' au lieu de '+DATE_ATTENDUE+'.');
    if(ancienCf!==CF_B_ID)throw new Error('ABANDON : charge_fixe_id courant inattendu : '+ancienCf+' (attendu Avanssur B '+CF_B_ID+').');

    const charges=lireTable_('Charges_fixes')||[];
    const candidatesA=charges.filter(c=>{
      const t=norm([c&&c.libelle,c&&c.libelle_bancaire].filter(Boolean).join(' '));
      const m=Math.abs(Number(c&&c.montant||0));
      return actif(c&&c.actif)&&/avanssur/.test(t)&&/(^| )a( |$)/.test(t)&&Number.isFinite(m)&&m>=11&&m<=14;
    });
    if(candidatesA.length!==1)throw new Error('ABANDON : '+candidatesA.length+' charge(s) fixe(s) Avanssur A active(s) trouvée(s), attendu exactement 1.');
    const cfA=candidatesA[0],cfAId=String(cfA.id||'').trim();
    if(!cfAId)throw new Error('ABANDON : Avanssur A sans id.');
    if(cfAId===CF_B_ID)throw new Error('ABANDON : Avanssur A porte par erreur le même id que B.');

    const feuille=initialiserRapprochementsChargesFixes_();
    const rappro=lireRapprochementsChargesFixes()||[];
    const pourOp=rappro.filter(r=>String(r&&r.operation_id||'').trim()===OP_ID);
    const validesB=pourOp.filter(r=>String(r&&r.charge_fixe_id||'').trim()===CF_B_ID&&/^valid/i.test(norm(r&&r.statut||'')));
    if(validesB.length!==1){
      throw new Error('ABANDON : rapprochement canonique validé B pour cette opération = '+validesB.length+' ; attendu exactement 1.');
    }
    const r=validesB[0],rId=String(r.id||'').trim();
    if(!rId)throw new Error('ABANDON : rapprochement canonique sans id.');

    // Prépare la nouvelle photographie du rapprochement avec le moteur de scoring existant.
    const evalA=typeof evaluerRapprochementChargeFixe_==='function'?evaluerRapprochementChargeFixe_(cfA,op):null;
    const modifications={
      charge_fixe_id:cfAId,
      statut:'Validé',
      decision:'Rapproché à l’opération réelle — correction Avanssur A 2026-09-12',
      libelle_charge:String(cfA.libelle||''),
      montant_attendu:Math.abs(Number(cfA.montant||0)),
      montant_reel:montant,
      modifie_le:new Date().toISOString()
    };
    if(evalA){
      ['score','date_operation','ecart_montant','ecart_jours','libelle_operation','compte'].forEach(k=>{if(evalA[k]!=null)modifications[k]=evalA[k];});
    }else{
      modifications.ecart_montant=arr(Math.abs(montant-Math.abs(Number(cfA.montant||0))));
    }

    // Trouve la ligne canonique et la réécrit sans créer de second propriétaire.
    const idCol=FIXED_CHARGE_MATCH_HEADERS.indexOf('id');
    if(idCol<0)throw new Error('ABANDON : schéma rapprochements sans colonne id.');
    const ids=feuille.getLastRow()>1?feuille.getRange(2,idCol+1,feuille.getLastRow()-1,1).getValues().flat():[];
    const pos=ids.findIndex(v=>String(v).trim()===rId);
    if(pos<0)throw new Error('ABANDON : ligne du rapprochement canonique introuvable.');
    const no=pos+2;
    const vals=feuille.getRange(no,1,1,FIXED_CHARGE_MATCH_HEADERS.length).getValues()[0];
    const objet=Object.fromEntries(FIXED_CHARGE_MATCH_HEADERS.map((h,i)=>[h,vals[i]]));
    if(String(objet.operation_id||'').trim()!==OP_ID||String(objet.charge_fixe_id||'').trim()!==CF_B_ID)throw new Error('ABANDON : la ligne canonique a changé depuis la lecture ; aucune écriture.');

    // 1) lien réel -> CF via la primitive canonique existante.
    if(!lierOperationChargeFixe_(OP_ID,cfAId))throw new Error('Échec écriture Operations.charge_fixe_id.');

    // 2) décision canonique de rapprochement : même ligne, nouvelle CF.
    Object.assign(objet,modifications);
    feuille.getRange(no,1,1,FIXED_CHARGE_MATCH_HEADERS.length).setValues([FIXED_CHARGE_MATCH_HEADERS.map(h=>objet[h]==null?'':objet[h])]);

    // 3) marqueur historique de commentaire : remplace seulement l'ancien marqueur B.
    const opSheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');
    const headers=TABLES.Operations;
    const opIdCol=headers.indexOf('id')+1,commentCol=headers.indexOf('commentaire')+1;
    let commentaireAvant='',commentaireApres='';
    if(opSheet&&opIdCol>0&&commentCol>0&&opSheet.getLastRow()>1){
      const opIds=opSheet.getRange(2,opIdCol,opSheet.getLastRow()-1,1).getValues().flat();
      const opPos=opIds.findIndex(v=>String(v).trim()===OP_ID);
      if(opPos>=0){
        commentaireAvant=String(opSheet.getRange(opPos+2,commentCol).getValue()||'');
        const reAncien=new RegExp('\\[CHARGE_FIXE:'+CF_B_ID.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\]','g');
        commentaireApres=commentaireAvant.replace(reAncien,'').replace(/\s{2,}/g,' ').trim();
        const nouveau='[CHARGE_FIXE:'+cfAId+']';
        if(!commentaireApres.includes(nouveau))commentaireApres=[commentaireApres,nouveau].filter(Boolean).join(' ');
        opSheet.getRange(opPos+2,commentCol).setValue(commentaireApres);
      }
    }

    if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('maintenance-rapprochement-cf-avanssur-a');

    // Relecture de preuve intermodule.
    const opApres=(lireTable_('Operations')||[]).find(o=>String(o&&o.id||'').trim()===OP_ID)||{};
    const rApres=(lireRapprochementsChargesFixes()||[]).find(x=>String(x&&x.id||'').trim()===rId)||{};
    const ok=String(opApres.charge_fixe_id||'').trim()===cfAId&&String(rApres.charge_fixe_id||'').trim()===cfAId&&String(rApres.operation_id||'').trim()===OP_ID&&/^valid/i.test(norm(rApres.statut||''));
    const out={
      ok:ok,
      version:MAINT_RAPPRO_CF_AVANSSUR_A_20260912_VERSION,
      oneShot:true,
      operation:{id:OP_ID,date:date,montant:montant,ancienChargeFixeId:CF_B_ID,nouveauChargeFixeId:cfAId,chargeFixeIdApres:String(opApres.charge_fixe_id||'')},
      chargeA:{id:cfAId,libelle:String(cfA.libelle||''),montant:Math.abs(Number(cfA.montant||0))},
      rapprochement:{id:rId,chargeFixeIdApres:String(rApres.charge_fixe_id||''),statut:String(rApres.statut||''),decision:String(rApres.decision||'')},
      commentaire:{avant:commentaireAvant,apres:commentaireApres},
      doctrine:'Une décision canonique de rapprochement, consommée intermodule ; aucun correctif local Cerbère.'
    };
    console.log('[MAINT RAPPRO CF AVANSSUR A 20260912] '+JSON.stringify(out));
    if(!ok)throw new Error('Écriture effectuée mais relecture de preuve incohérente : '+JSON.stringify(out));
    return out;
  }finally{lock.releaseLock();}
}
