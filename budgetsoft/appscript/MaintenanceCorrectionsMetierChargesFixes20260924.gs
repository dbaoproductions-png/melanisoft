/*
 * BudgetSoft — correction métier historique des charges fixes — 2026-09-24.
 *
 * Reprise ciblée, fondée sur l'audit métier validé :
 * - 11 opérations Avanssur mandat 200016366216/1 : Assurance B -> Assurance C ;
 * - 19 opérations à délier (Carrefour hors échéance principale, Oney hors flux CA, frais CASDEN).
 * - IONOS : aucune écriture ici, seulement surveillance de date économique.
 */
const MAINT_CF_METIER_20260924_VERSION='2026-09-24.1';

function reparerCorrectionsMetierChargesFixes20260924(){
  const AVANSSUR_B='433feb19-297f-41fa-80fa-d7e64e40ae36';
  const AVANSSUR_C='7b48a001-708b-4a3d-a390-3f420a2f0c58';
  const RELIER=[
    '5321d128-009f-4199-afb3-83eb7ee561f7',
    '0fb5860a-c313-4722-84d1-de85b6c431e6',
    '2ac0bf6c-85cc-41cc-b043-f35d59575cb0',
    '405a13f1-4c31-4991-95f7-2b438677ca52',
    '41ed1ebc-50e5-456b-887c-affbd412889f',
    '3cdde33b-5153-46bd-884e-e412b577f334',
    '70456f32-58ee-4b0c-8588-31dd4adae9ea',
    '129261ad-f8ec-465e-81b9-e83e40b7e8df',
    'abd7f96e-620c-4343-8c0e-e6bb0fb57d4c',
    'd3c7b7df-9c7b-4e1b-94f4-2b177e6393a3',
    '6eaece49-ac11-44db-b12a-3e14ab111598'
  ];
  const DELIER=[
    '4237f55d-637e-475c-bfef-f8816aab72c8',
    'b32445f0-7500-4360-a1a2-f1d2092f39e8',
    'cd80c1b6-4c6b-42fd-a926-beb7edbc6371',
    '8097aa9b-0b98-486c-b1ae-6c34460f4f51',
    'dffce462-3295-4dd3-b3c1-b91b97f2867d',
    '77200728-77d7-403d-903e-b07e44138c33',
    '533a0f93-6539-443c-94a2-afd9e80dc530',
    'bf3a2f22-00bd-4e80-96ea-5f65ec71cde7',
    'aa5b302e-14a2-459a-a98a-3f37a04fe555',
    '9a38be53-ee93-4fbe-a0c0-7e7f6222eb79',
    '66a11648-2d9a-4970-a683-00db763fe082',
    '4987d266-b506-449f-ab04-a54c05fda48e',
    '32f72ee0-23ec-4dd9-b78b-d1b616d3b96d',
    'c0b18ffb-2ac2-4078-bd9e-0291bebdc7e7',
    '36d753ea-2576-4716-b954-848b45e6bb53',
    'dbb5c0a9-3dfb-43b0-b71a-cba58550b288',
    '23313727-ff06-4e6f-95fc-8535abc679ff',
    '7892cbd9-e5de-452d-9227-a228312f5197',
    'f612e963-a9c4-4927-96e9-83692d30e6f9'
  ];

  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const ss=SpreadsheetApp.getActiveSpreadsheet();
    const sh=ss.getSheetByName('Operations');
    if(!sh)throw new Error('Feuille Operations introuvable.');
    const h=TABLES.Operations,idxId=h.indexOf('id'),idxCf=h.indexOf('charge_fixe_id'),
      idxCom=h.indexOf('commentaire'),idxStat=h.indexOf('statut_bancaire'),idxLib=h.indexOf('libelle_bancaire');
    if(idxId<0||idxCf<0)throw new Error('Structure Operations incompatible.');
    const n=Math.max(0,sh.getLastRow()-1),rows=n?sh.getRange(2,1,n,h.length).getValues():[];
    const pos={};rows.forEach(function(r,i){pos[String(r[idxId]||'').trim()]=i;});

    const manquants=RELIER.concat(DELIER).filter(function(id){return pos[id]===undefined;});
    if(manquants.length)throw new Error('ABANDON : opérations introuvables : '+manquants.join(','));

    let relierModifies=0,relierDeja=0,delierModifies=0,delierDeja=0;
    RELIER.forEach(function(id){
      const i=pos[id],r=rows[i],actuel=String(r[idxCf]||'').trim(),lib=String(r[idxLib]||'').toUpperCase();
      if(lib.indexOf('MDT/200016366216/1')<0)throw new Error('ABANDON identité Avanssur C non prouvée : '+id);
      if(actuel===AVANSSUR_C){relierDeja++;return;}
      if(actuel!==AVANSSUR_B)throw new Error('ABANDON lien Avanssur inattendu '+id+' : '+actuel);
      r[idxCf]=AVANSSUR_C;
      if(idxCom>=0){
        let com=String(r[idxCom]||'').replace(/\[CHARGE_FIXE:[^\]]+\]/g,'').replace(/\s{2,}/g,' ').trim();
        r[idxCom]=[com,'[CHARGE_FIXE:'+AVANSSUR_C+']'].filter(Boolean).join(' ');
      }
      if(idxStat>=0)r[idxStat]='rapprochee_charge_fixe';
      relierModifies++;
    });

    DELIER.forEach(function(id){
      const i=pos[id],r=rows[i],actuel=String(r[idxCf]||'').trim();
      if(!actuel){delierDeja++;return;}
      r[idxCf]='';
      if(idxCom>=0)r[idxCom]=String(r[idxCom]||'').replace(/\[CHARGE_FIXE:[^\]]+\]/g,'').replace(/\s{2,}/g,' ').trim();
      if(idxStat>=0)r[idxStat]='definitif';
      delierModifies++;
    });

    if(n){
      sh.getRange(2,idxCf+1,n,1).setValues(rows.map(function(r){return[r[idxCf]];}));
      if(idxCom>=0)sh.getRange(2,idxCom+1,n,1).setValues(rows.map(function(r){return[r[idxCom]];}));
      if(idxStat>=0)sh.getRange(2,idxStat+1,n,1).setValues(rows.map(function(r){return[r[idxStat]];}));
    }

    const fr=initialiserRapprochementsChargesFixes_(),rh=FIXED_CHARGE_MATCH_HEADERS;
    const rn=Math.max(0,fr.getLastRow()-1),rr=rn?fr.getRange(2,1,rn,rh.length).getValues():[];
    const io=rh.indexOf('operation_id'),ic=rh.indexOf('charge_fixe_id'),is=rh.indexOf('statut'),
      idec=rh.indexOf('decision'),imod=rh.indexOf('modifie_le');
    const relSet=new Set(RELIER),delSet=new Set(DELIER),now=new Date().toISOString();
    const seenRel={};
    rr.forEach(function(r){
      const op=String(r[io]||'').trim();if(!op)return;
      if(relSet.has(op)){
        if(!seenRel[op]&&!/^ignor/i.test(String(r[is]||''))){
          r[ic]=AVANSSUR_C;r[is]='Validé';
          if(idec>=0)r[idec]='Correction métier historique — Avanssur mandat 200016366216/1';
          if(imod>=0)r[imod]=now;
          seenRel[op]=true;
        }else if(!/^ignor/i.test(String(r[is]||''))){
          r[is]='Ignoré';
          if(idec>=0)r[idec]='Doublon neutralisé par correction métier historique';
          if(imod>=0)r[imod]=now;
        }
      }else if(delSet.has(op)&&!/^ignor/i.test(String(r[is]||''))){
        r[is]='Ignoré';
        if(idec>=0)r[idec]='Correction métier historique — opération hors charge fixe';
        if(imod>=0)r[imod]=now;
      }
    });
    if(rn)fr.getRange(2,1,rn,rh.length).setValues(rr);

    if(typeof supprimerSnapshotChargesFixes20260828_==='function')supprimerSnapshotChargesFixes20260828_();
    if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('corrections-metier-cf-20260924');

    const out={
      ok:true,version:MAINT_CF_METIER_20260924_VERSION,
      relier:{total:RELIER.length,modifies:relierModifies,dejaCorrects:relierDeja},
      delier:{total:DELIER.length,modifies:delierModifies,dejaCorrects:delierDeja},
      doctrine:'Correction ciblée des 30 opérations auditées ; IONOS non modifié.'
    };
    console.log('[MAINT CORRECTIONS METIER CF 20260924] '+JSON.stringify(out));
    return out;
  }finally{lock.releaseLock();}
}
