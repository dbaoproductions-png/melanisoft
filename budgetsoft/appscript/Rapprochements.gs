function deciderRapprochementBancaire(id, decision) {
  verifierInitialisation_();
  initialiserRapprochementsAValider_();
  const choix = String(decision || '').trim().toLowerCase();
  if (!['fusionner', 'conserver', 'ignorer'].includes(choix)) throw new Error('Décision de rapprochement inconnue.');
  const rapprochement = trouverRapprochementParId_(id);
  if (!rapprochement) throw new Error('Proposition de rapprochement introuvable.');
  if (String(rapprochement.statut || '') !== 'À valider') throw new Error('Cette proposition a déjà été traitée.');
  if (choix === 'fusionner') {fusionnerOperationsRapprochement_(rapprochement);mettreAJourRapprochement_(rapprochement.id,{statut:'Traité',decision:'Fusionné'});}
  else if (choix === 'conserver') mettreAJourRapprochement_(rapprochement.id,{statut:'Traité',decision:'Conserver les deux'});
  else mettreAJourRapprochement_(rapprochement.id,{statut:'Ignoré',decision:'Proposition ignorée'});
  return {ok:true,id:rapprochement.id,decision:choix,restant:lireRapprochementsAValider().filter(r=>String(r.statut)==='À valider').length};
}
function fusionnerOperationsRapprochement_(rapprochement) {const operations=lireTable_('Operations'),manuelle=operations.find(o=>String(o.id)===String(rapprochement.operation_manuelle_id)),importee=operations.find(o=>String(o.id)===String(rapprochement.operation_importee_id));if(!manuelle)throw new Error('La saisie manuelle à fusionner n’existe plus.');if(!importee)throw new Error('L’opération bancaire à fusionner n’existe plus.');const commentaire=[importee.commentaire||'',manuelle.commentaire||'','[VALIDATION_RAPPROCHEMENT:'+rapprochement.id+']'].filter(Boolean).join(' '),fusion=Object.assign({},importee,{id:importee.id,libelle:manuelle.libelle||importee.libelle,categorie:manuelle.categorie||importee.categorie,commentaire,cree_le:importee.cree_le||manuelle.cree_le||''});enregistrerLigne('Operations',fusion);supprimerLigne('Operations',manuelle.id);}
function trouverRapprochementParId_(id){return lireRapprochementsAValider().find(r=>String(r.id)===String(id))||null;}
function mettreAJourRapprochement_(id,modifications){const feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RAPPROCHEMENTS_SHEET);if(!feuille||feuille.getLastRow()<2)throw new Error('Aucune proposition de rapprochement disponible.');const idIndex=RAPPROCHEMENTS_HEADERS.indexOf('id'),ids=feuille.getRange(2,idIndex+1,feuille.getLastRow()-1,1).getValues().flat(),position=ids.findIndex(v=>String(v)===String(id));if(position<0)throw new Error('Proposition de rapprochement introuvable.');const numeroLigne=position+2,valeurs=feuille.getRange(numeroLigne,1,1,RAPPROCHEMENTS_HEADERS.length).getValues()[0],objet=Object.fromEntries(RAPPROCHEMENTS_HEADERS.map((h,i)=>[h,valeurs[i]]));Object.assign(objet,modifications||{},{modifie_le:new Date().toISOString()});feuille.getRange(numeroLigne,1,1,RAPPROCHEMENTS_HEADERS.length).setValues([RAPPROCHEMENTS_HEADERS.map(h=>objet[h]==null?'':objet[h])]);return objet;}

/** Point d'entrée unique des rapprochements PREVISIONNEL ↔ REEL. */
function rapprocherPrevisionnelReelBudgetSoft(d){
  d=d||{};const type=String(d.type||'').trim().toLowerCase();
  if(type==='evenement')return rapprocherEvenementBudgetSoft_(d.previsionnel_id||d.event_id,d.operation_id);
  if(type==='imprevu_categorie')return reclasserOperationRapprochementBudgetSoft_(d.operation_id,d.categorie);
  if(type==='charge_fixe')return deciderRapprochementChargeFixeBudgetSoft_(d.rapprochement_id||d.id,d.decision||'valider');
  if(type==='dette'){
    const detteId=d.dette_id||d.previsionnel_id||d.id;
    return d.operation_id?rapprocherDetteOperationV2_(detteId,d.operation_id):rapprocherDetteMontantV2_(detteId,d.montant,d.date||d.date_paiement);
  }
  throw new Error('Type de rapprochement prévisionnel/réel inconnu : '+type);
}
function listerCandidatsRapprochementBudgetSoft(d){
  d=d||{};const type=String(d.type||'').trim().toLowerCase();
  if(type==='dette')return serialiserCerberePourClient_(listerCandidatsRapprochementDetteV2_(d.dette_id||d.previsionnel_id||d.id));
  if(type!=='evenement')return serialiserCerberePourClient_([]);
  assurerPlanActionsV4_();
  const eventId=String(d.previsionnel_id||d.event_id||'').trim(),ev=lireFeuilleDynamiquePlan_('Plan_Evenements').find(x=>String(x.id)===eventId);
  if(!ev)throw new Error('Événement introuvable.');
  const occ=(typeof occurrencesEvenementEtatBudgetSoft20260922_==='function'?occurrencesEvenementEtatBudgetSoft20260922_(ev):occurrencesEvenementV4_(ev)).filter(o=>!o.rapprochee);
  if(!occ.length)return serialiserCerberePourClient_([]);
  const cat=String(ev.categorie||''),nature=String(ev.type||'').trim().toLowerCase();
  const utilises=new Set();
  try{const m=lireRapprochementsOccurrencesEvenementBudgetSoft20260922_(ev);Object.keys(m||{}).forEach(k=>{const id=String(m[k]&&m[k].operation_id||'');if(id)utilises.add(id);});}catch(e){}
  let ops=lireTable_('Operations').filter(o=>{
    const m=Number(o.montant||0),id=String(o.id||'');
    if(utilises.has(id))return false;
    if(nature==='recette')return m>0;
    if(nature==='depense'||nature==='dépense')return m<0;
    return m!==0;
  });
  ops=ops.map(o=>{
    const om=Math.abs(Number(o.montant||0)),od=new Date(o.date_comptable||o.date||o.date_operation||0);
    let best=null;
    occ.forEach(x=>{
      const xd=new Date(x.date||0),jours=!isNaN(xd)&&!isNaN(od)?Math.abs(od-xd)/86400000:99;
      const score=Math.abs(om-Math.abs(Number(x.montant||0)))+(jours*2)+(cat&&String(o.categorie||'')!==cat?50:0);
      if(!best||score<best.score)best={index:Number(x.index||1),date:x.date||'',montant:Number(x.montant||0),score:score};
    });
    return{id:o.id||'',libelle:o.libelle||o.libelle_bancaire||'',montant:Number(o.montant||0),date:o.date_comptable||o.date||o.date_operation||'',categorie:o.categorie||'',score:best?best.score:9999,occurrence_cible:best?best.index:null,montant_occurrence:best?best.montant:null,date_occurrence:best?best.date:''};
  }).sort((a,b)=>a.score-b.score).slice(0,15);
  return serialiserCerberePourClient_(ops);
}
function rapprocherEvenementBudgetSoft_(eventId,operationId){
  assurerPlanActionsV4_();
  const ev=lireFeuilleDynamiquePlan_('Plan_Evenements').find(x=>String(x.id)===String(eventId));
  if(!ev)throw new Error('Événement introuvable.');
  let op=lireTable_('Operations').find(x=>String(x.id)===String(operationId));
  if(!op)throw new Error('Opération introuvable.');

  const catOperation=String(op.categorie||'').trim(),catEvenement=String(ev.categorie||'').trim();
  if(!catOperation&&catEvenement){op=Object.assign({},op,{categorie:catEvenement});enregistrerLigne('Operations',op);}

  const etats=typeof occurrencesEvenementEtatBudgetSoft20260922_==='function'?occurrencesEvenementEtatBudgetSoft20260922_(ev):occurrencesEvenementV4_(ev).map(o=>Object.assign({},o,{rapprochee:false}));
  const fractionne=yesPlanV4_(ev.fractionne)&&etats.length>1;
  if(!fractionne){
    ev.operation_reelle_id=operationId;
    ev.montant_reel=Math.abs(Number(op.montant||0));
    ev.date_realisation=op.date_comptable||op.date||op.date_operation||'';
    ev.rapprochement_statut='Rapproché';ev.statut='Rapproché';
    upsertDynamiquePlanV4_('Plan_Evenements',ev);
    recalculerPlanBudgetSoft_('rapprochement_evenement');
    return{ok:true,type:'evenement',previsionnel_id:String(eventId),operation_id:String(operationId),occurrence:1,complet:true,categorie_operation:String(op.categorie||''),categorie_heritee:!catOperation&&!!catEvenement};
  }

  const map=typeof lireRapprochementsOccurrencesEvenementBudgetSoft20260922_==='function'?lireRapprochementsOccurrencesEvenementBudgetSoft20260922_(ev):{};
  const dejaUtilise=Object.keys(map).some(k=>String(map[k]&&map[k].operation_id||'')===String(operationId));
  if(dejaUtilise)throw new Error('Cette opération est déjà rapprochée d’une occurrence de cet événement.');
  const libres=etats.filter(o=>!o.rapprochee);
  if(!libres.length)throw new Error('Toutes les occurrences de cet événement sont déjà rapprochées.');
  const od=new Date(op.date_comptable||op.date||op.date_operation||0),om=Math.abs(Number(op.montant||0));
  let cible=null;
  libres.forEach(o=>{
    const d=new Date(o.date||0),jours=!isNaN(d)&&!isNaN(od)?Math.abs(od-d)/86400000:99;
    const score=Math.abs(om-Math.abs(Number(o.montant||0)))+jours*2;
    if(!cible||score<cible.score)cible={o:o,score:score};
  });
  const idx=String(cible.o.index),dateReelle=op.date_comptable||op.date||op.date_operation||'';
  map[idx]={operation_id:String(operationId),montant_reel:om,date_realisation:dateReelle,rapproche_le:new Date().toISOString()};
  ev.rapprochements_occurrences_json=JSON.stringify(map);
  const occFinal=etats.map(o=>Object.assign({},o,{rapprochee:!!map[String(o.index)]}));
  const complet=occFinal.every(o=>o.rapprochee);
  const valeurs=Object.keys(map).map(k=>map[k]).filter(Boolean);
  ev.operation_reelle_id='';
  ev.montant_reel=Math.round(valeurs.reduce((s,x)=>s+Math.abs(Number(x.montant_reel||0)),0)*100)/100;
  ev.date_realisation=valeurs.map(x=>String(x.date_realisation||'')).sort().slice(-1)[0]||'';
  ev.rapprochement_statut=complet?'Rapproché':'Partiel';
  ev.statut=complet?'Rapproché':'Partiellement rapproché';
  upsertDynamiquePlanV4_('Plan_Evenements',ev);
  recalculerPlanBudgetSoft_('rapprochement_evenement_occurrence');
  return{ok:true,type:'evenement',previsionnel_id:String(eventId),operation_id:String(operationId),occurrence:Number(cible.o.index),occurrences:Number(cible.o.total),complet:complet,restantes:occFinal.filter(o=>!o.rapprochee).length,categorie_operation:String(op.categorie||''),categorie_heritee:!catOperation&&!!catEvenement};
}
function reclasserOperationRapprochementBudgetSoft_(operationId,nouvelleCategorie){const id=String(operationId||'').trim(),cat=String(nouvelleCategorie||'').trim();if(!id||!cat)throw new Error('Opération ou catégorie manquante.');const sh=SpreadsheetApp.getActive().getSheetByName('Operations');if(!sh)throw new Error('Feuille Operations introuvable.');const values=sh.getDataRange().getValues();if(!values.length)throw new Error('Feuille Operations vide.');const headers=values[0].map(x=>String(x||'').trim()),idCol=headers.indexOf('id'),catCol=headers.indexOf('categorie');if(idCol<0||catCol<0)throw new Error('Colonnes id/categorie introuvables.');for(let i=1;i<values.length;i++){if(String(values[i][idCol]||'').trim()!==id)continue;sh.getRange(i+1,catCol+1).setValue(cat);if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('rapprochement-imprevu-categorie');return{ok:true,type:'imprevu_categorie',operation_id:id,categorie:cat};}throw new Error('Opération introuvable : '+id);}
function deciderRapprochementChargeFixeBudgetSoft_(id,decision){verifierInitialisation_();const choix=String(decision||'').toLowerCase();if(!['valider','ignorer'].includes(choix))throw new Error('Décision inconnue.');const feuille=initialiserRapprochementsChargesFixes_(),indexId=FIXED_CHARGE_MATCH_HEADERS.indexOf('id'),ids=feuille.getLastRow()>1?feuille.getRange(2,indexId+1,feuille.getLastRow()-1,1).getValues().flat():[],pos=ids.findIndex(v=>String(v)===String(id));if(pos<0)throw new Error('Rapprochement charge fixe introuvable.');const no=pos+2,valeurs=feuille.getRange(no,1,1,FIXED_CHARGE_MATCH_HEADERS.length).getValues()[0],objet=Object.fromEntries(FIXED_CHARGE_MATCH_HEADERS.map((h,i)=>[h,valeurs[i]]));objet.statut=choix==='valider'?'Validé':'Ignoré';objet.decision=choix==='valider'?'Rapproché à l’opération réelle':'Proposition ignorée';objet.modifie_le=new Date().toISOString();feuille.getRange(no,1,1,FIXED_CHARGE_MATCH_HEADERS.length).setValues([FIXED_CHARGE_MATCH_HEADERS.map(h=>objet[h]??'')]);if(choix==='valider'){marquerOperationRapprocheeChargeFixe_(objet);if(typeof appliquerAmortissementCreditDepuisRapprochement20260915_==='function')appliquerAmortissementCreditDepuisRapprochement20260915_(objet.charge_fixe_id,objet.operation_id);}if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('rapprochement-charge-fixe');return Object.assign({ok:true,type:'charge_fixe'},objet);}




/**
 * Migration historique canonique Réel -> Charge_fixe.
 * Réservée aux reprises de données prouvées : écrit Operations + marqueur +
 * Rapprochements_charges_fixes, sans rejouer les effets métier contemporains
 * (notamment amortissement de crédit).
 */
function migrerLienHistoriqueChargeFixeBudgetSoft_(operationId,chargeFixeId,motif){
  const opId=String(operationId||'').trim(),cfId=String(chargeFixeId||'').trim();
  if(!opId||!cfId)throw new Error('Migration CF historique : identifiants manquants.');
  const charges=lireTable_('Charges_fixes')||[];
  const charge=charges.find(function(c){return String(c&&c.id||'').trim()===cfId;});
  if(!charge)throw new Error('Migration CF historique : charge introuvable '+cfId);

  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');
  if(!sh)throw new Error('Migration CF historique : feuille Operations introuvable.');
  const h=TABLES.Operations,idxId=h.indexOf('id'),idxCf=h.indexOf('charge_fixe_id'),idxCom=h.indexOf('commentaire'),idxStat=h.indexOf('statut_bancaire');
  if(idxId<0||idxCf<0)throw new Error('Migration CF historique : colonnes Operations requises absentes.');
  const ids=sh.getLastRow()>1?sh.getRange(2,idxId+1,sh.getLastRow()-1,1).getValues().flat():[];
  const pos=ids.findIndex(function(v){return String(v||'').trim()===opId;});
  if(pos<0)throw new Error('Migration CF historique : opération introuvable '+opId);
  const no=pos+2,vals=sh.getRange(no,1,1,h.length).getValues()[0];
  const op=Object.fromEntries(h.map(function(k,i){return[k,serialiserValeur_(vals[i])];}));
  if(Number(op.montant||0)>=0)throw new Error('Migration CF historique : opération non débitrice '+opId);

  const avant=String(vals[idxCf]||'').trim();
  sh.getRange(no,idxCf+1).setValue(cfId);
  if(idxCom>=0){
    let com=String(sh.getRange(no,idxCom+1).getValue()||'');
    com=com.replace(/\[CHARGE_FIXE:[^\]]+\]/g,'').replace(/\s{2,}/g,' ').trim();
    com=[com,'[CHARGE_FIXE:'+cfId+']'].filter(Boolean).join(' ');
    sh.getRange(no,idxCom+1).setValue(com);
  }
  if(idxStat>=0)sh.getRange(no,idxStat+1).setValue('rapprochee_charge_fixe');

  const fr=initialiserRapprochementsChargesFixes_(),rh=FIXED_CHARGE_MATCH_HEADERS;
  let rows=fr.getLastRow()>1?fr.getRange(2,1,fr.getLastRow()-1,rh.length).getValues():[];
  const io=rh.indexOf('operation_id'),ic=rh.indexOf('charge_fixe_id'),is=rh.indexOf('statut');
  const matches=[];
  rows.forEach(function(r,i){if(String(r[io]||'').trim()===opId)matches.push({i:i,r:r});});
  let cible=matches.find(function(x){return !/^ignor/i.test(String(x.r[is]||''));})||null;
  const evalR=typeof evaluerRapprochementChargeFixe_==='function'?evaluerRapprochementChargeFixe_(charge,Object.assign({},op,{date:op.date_comptable||op.date})):null;
  const objet={
    id:cible?String(cible.r[rh.indexOf('id')]||''):Utilities.getUuid(),
    charge_fixe_id:cfId,
    operation_id:opId,
    score:evalR&&evalR.score!=null?evalR.score:'',
    statut:'Validé',
    date_operation:evalR&&evalR.date_operation||String(op.date_comptable||op.date||''),
    montant_reel:Math.abs(Number(op.montant||0)),
    montant_attendu:Math.abs(Number(charge.montant||0)),
    ecart_montant:evalR&&evalR.ecart_montant!=null?evalR.ecart_montant:'',
    ecart_jours:evalR&&evalR.ecart_jours!=null?evalR.ecart_jours:'',
    libelle_operation:String(op.libelle_bancaire||op.libelle||''),
    libelle_charge:String(charge.libelle||''),
    compte:String(op.compte||''),
    decision:'Migration historique intermodule — '+String(motif||'preuve bancaire'),
    cree_le:cible?String(cible.r[rh.indexOf('cree_le')]||''):new Date().toISOString(),
    modifie_le:new Date().toISOString()
  };
  if(cible)fr.getRange(cible.i+2,1,1,rh.length).setValues([rh.map(function(k){return objet[k]==null?'':objet[k];})]);
  else fr.getRange(fr.getLastRow()+1,1,1,rh.length).setValues([rh.map(function(k){return objet[k]==null?'':objet[k];})]);

  return{ok:true,operation_id:opId,charge_fixe_id:cfId,charge_fixe_id_avant:avant,rapprochement_id:objet.id};
}
