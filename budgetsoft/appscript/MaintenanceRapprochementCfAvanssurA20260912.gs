/*
 * Maintenance ONE-SHOT — rapprochement CF intermodule Avanssur A.
 *
 * Doctrine :
 * - Operations reste le propriétaire du réel bancaire ;
 * - Charges_fixes reste le référentiel prévisionnel ;
 * - Rapprochements_charges_fixes porte la décision canonique ;
 * - aucun correctif local Cerbère.
 *
 * Cas runtime confirmé le 12/09/2026 :
 * - l'opération 12,85 EUR est déjà correctement liée à Avanssur A dans Operations ;
 * - le rapprochement canonique validé pointe encore vers Avanssur B.
 * La maintenance répare donc la divergence intermodule sans recréer de moteur.
 */
const MAINT_RAPPRO_CF_AVANSSUR_A_20260912_VERSION='2026-09-12.2';

function reparerRapprochementCfAvanssurA20260912(){
  const OP_ID='d3c5df17-d65a-4383-8a05-341fdc684eab';
  const CF_A_ID='2aa5491a-b8a4-4fce-bc44-2df6ae79f59e';
  const CF_B_ID='433feb19-297f-41fa-80fa-d7e64e40ae36';
  const MONTANT_ATTENDU=12.85;
  const DATE_ATTENDUE='2026-08-28';
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    if(typeof initialiserRapprochementsChargesFixes_!=='function'||typeof lireRapprochementsChargesFixes!=='function')throw new Error('Propriétaire Rapprochements_charges_fixes indisponible.');
    if(typeof lierOperationChargeFixe_!=='function')throw new Error('Primitive canonique lierOperationChargeFixe_ indisponible.');

    const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const actif=v=>{const s=String(v==null?'':v).trim().toLowerCase();return v===true||s==='true'||s==='1'||s==='oui'||s==='actif';};
    const arr=n=>Math.round(Number(n||0)*100)/100;
    const dateIso=v=>{const d=v instanceof Date?v:new Date(v);return isNaN(d.getTime())?'':Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');};

    const operations=lireTable_('Operations')||[];
    const op=operations.find(o=>String(o&&o.id||'').trim()===OP_ID);
    if(!op)throw new Error('ABANDON : opération Avanssur 12,85 introuvable.');
    const montant=arr(Math.abs(Number(op.montant||0)));
    const date=dateIso(op.date_comptable||op.date||op.date_operation);
    if(Math.abs(montant-MONTANT_ATTENDU)>.001)throw new Error('ABANDON : montant inattendu : '+montant+'.');
    if(date!==DATE_ATTENDUE)throw new Error('ABANDON : date inattendue : '+date+'.');

    const charges=lireTable_('Charges_fixes')||[];
    const cfA=charges.find(c=>String(c&&c.id||'').trim()===CF_A_ID);
    if(!cfA)throw new Error('ABANDON : Avanssur A introuvable : '+CF_A_ID);
    if(!actif(cfA.actif))throw new Error('ABANDON : Avanssur A n’est pas active.');
    if(!/avanssur/.test(norm([cfA.libelle,cfA.libelle_bancaire].filter(Boolean).join(' '))))throw new Error('ABANDON : l’ID Avanssur A ne porte pas un libellé Avanssur.');
    if(Math.abs(Math.abs(Number(cfA.montant||0))-12.85)>.01)throw new Error('ABANDON : montant de référence Avanssur A inattendu : '+cfA.montant+'.');

    const cfCourant=String(op.charge_fixe_id||'').trim();
    if(cfCourant!==CF_A_ID&&cfCourant!==CF_B_ID)throw new Error('ABANDON : charge_fixe_id courant inattendu : '+cfCourant+'.');

    const feuille=initialiserRapprochementsChargesFixes_();
    const rappro=lireRapprochementsChargesFixes()||[];
    const pourOp=rappro.filter(r=>String(r&&r.operation_id||'').trim()===OP_ID);
    const valides=pourOp.filter(r=>/^valid/i.test(norm(r&&r.statut||'')));
    if(valides.length!==1)throw new Error('ABANDON : rapprochements validés pour cette opération = '+valides.length+' ; attendu exactement 1.');
    const r=valides[0],rId=String(r.id||'').trim(),rCf=String(r.charge_fixe_id||'').trim();
    if(!rId)throw new Error('ABANDON : rapprochement canonique sans id.');
    if(rCf!==CF_B_ID&&rCf!==CF_A_ID)throw new Error('ABANDON : rapprochement validé pointe vers un ID inattendu : '+rCf+'.');

    // Si tout est déjà aligné, on sort proprement sans écriture.
    if(cfCourant===CF_A_ID&&rCf===CF_A_ID){
      const out={ok:true,dejaAligne:true,version:MAINT_RAPPRO_CF_AVANSSUR_A_20260912_VERSION,operation_id:OP_ID,charge_fixe_id:CF_A_ID,rapprochement_id:rId};
      console.log('[MAINT RAPPRO CF AVANSSUR A 20260912] '+JSON.stringify(out));
      return out;
    }

    // 1) Operations doit pointer vers A. Si c'est déjà le cas, aucune réécriture inutile.
    if(cfCourant!==CF_A_ID){
      if(!lierOperationChargeFixe_(OP_ID,CF_A_ID))throw new Error('Échec écriture Operations.charge_fixe_id.');
    }

    // 2) Réécrit LA décision canonique existante vers A, sans créer de seconde ligne.
    const idCol=FIXED_CHARGE_MATCH_HEADERS.indexOf('id');
    const ids=feuille.getLastRow()>1?feuille.getRange(2,idCol+1,feuille.getLastRow()-1,1).getValues().flat():[];
    const pos=ids.findIndex(v=>String(v).trim()===rId);
    if(pos<0)throw new Error('ABANDON : ligne canonique introuvable.');
    const no=pos+2;
    const vals=feuille.getRange(no,1,1,FIXED_CHARGE_MATCH_HEADERS.length).getValues()[0];
    const objet=Object.fromEntries(FIXED_CHARGE_MATCH_HEADERS.map((h,i)=>[h,vals[i]]));
    if(String(objet.operation_id||'').trim()!==OP_ID)throw new Error('ABANDON : la ligne canonique a changé depuis la lecture.');
    const evalA=typeof evaluerRapprochementChargeFixe_==='function'?evaluerRapprochementChargeFixe_(cfA,op):null;
    objet.charge_fixe_id=CF_A_ID;
    objet.statut='Validé';
    objet.decision='Rapproché à l’opération réelle — correction intermodule Avanssur A 2026-09-12';
    objet.libelle_charge=String(cfA.libelle||'');
    objet.montant_attendu=Math.abs(Number(cfA.montant||0));
    objet.montant_reel=montant;
    objet.modifie_le=new Date().toISOString();
    if(evalA){['score','date_operation','ecart_montant','ecart_jours','libelle_operation','compte'].forEach(k=>{if(evalA[k]!=null)objet[k]=evalA[k];});}
    feuille.getRange(no,1,1,FIXED_CHARGE_MATCH_HEADERS.length).setValues([FIXED_CHARGE_MATCH_HEADERS.map(h=>objet[h]==null?'':objet[h])]);

    // 3) Nettoie le marqueur historique dans le commentaire de l'opération.
    const opSheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');
    const headers=TABLES.Operations;
    const opIdCol=headers.indexOf('id')+1,commentCol=headers.indexOf('commentaire')+1;
    if(opSheet&&opIdCol>0&&commentCol>0&&opSheet.getLastRow()>1){
      const opIds=opSheet.getRange(2,opIdCol,opSheet.getLastRow()-1,1).getValues().flat();
      const opPos=opIds.findIndex(v=>String(v).trim()===OP_ID);
      if(opPos>=0){
        let c=String(opSheet.getRange(opPos+2,commentCol).getValue()||'');
        c=c.replace(new RegExp('\\[CHARGE_FIXE:'+CF_B_ID.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\]','g'),'').replace(/\s{2,}/g,' ').trim();
        const marqueurA='[CHARGE_FIXE:'+CF_A_ID+']';
        if(!c.includes(marqueurA))c=[c,marqueurA].filter(Boolean).join(' ');
        opSheet.getRange(opPos+2,commentCol).setValue(c);
      }
    }

    if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('maintenance-rapprochement-cf-avanssur-a');

    // Relecture de preuve intermodule.
    const opApres=(lireTable_('Operations')||[]).find(o=>String(o&&o.id||'').trim()===OP_ID)||{};
    const rApres=(lireRapprochementsChargesFixes()||[]).find(x=>String(x&&x.id||'').trim()===rId)||{};
    const ok=String(opApres.charge_fixe_id||'').trim()===CF_A_ID&&String(rApres.charge_fixe_id||'').trim()===CF_A_ID&&String(rApres.operation_id||'').trim()===OP_ID&&/^valid/i.test(norm(rApres.statut||''));
    const out={ok:ok,version:MAINT_RAPPRO_CF_AVANSSUR_A_20260912_VERSION,operation:{id:OP_ID,chargeFixeIdAvant:cfCourant,chargeFixeIdApres:String(opApres.charge_fixe_id||'')},chargeA:{id:CF_A_ID,libelle:String(cfA.libelle||''),montant:Number(cfA.montant||0)},rapprochement:{id:rId,chargeFixeIdAvant:rCf,chargeFixeIdApres:String(rApres.charge_fixe_id||''),statut:String(rApres.statut||'')},doctrine:'Une décision canonique de rapprochement, consommée intermodule ; aucun correctif local Cerbère.'};
    console.log('[MAINT RAPPRO CF AVANSSUR A 20260912] '+JSON.stringify(out));
    if(!ok)throw new Error('Écriture effectuée mais relecture intermodule incohérente : '+JSON.stringify(out));
    return out;
  }finally{lock.releaseLock();}
}
