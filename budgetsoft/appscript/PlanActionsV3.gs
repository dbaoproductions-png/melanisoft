const PLAN_ACTIONS_V3_VERSION='3.0.0';

function assurerPlanActionsV3_(){
  assurerTablesPlanCerbere_();
  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName('Plan_Actions');
  const extra=['mode_impact','source_type','source_id','source_libelle','projet','date_certitude','impact_confirme','processus','version_processus'];
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());
  const missing=extra.filter(x=>!headers.includes(x));
  if(missing.length)sh.getRange(1,headers.length+1,1,missing.length).setValues([missing]);
  assurerFeuillePlan_(ss,'Plan_Action_Etapes',['id','action_id','version','ordre','libelle','date_prevue','montant_prevu','montant_reel','statut','commentaire','cree_le','modifie_le']);
  assurerFeuillePlan_(ss,'Plan_Action_Versions',['id','action_id','version','date_version','motif','total_prevu','snapshot_json']);
}

function chargerActionsPlanV3(){
  assurerPlanActionsV3_();
  const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
  const etapes=lireFeuilleDynamiquePlan_('Plan_Action_Etapes');
  const objectifs=lireTablePlanCerbere_('Plan_Objectifs');
  const versions=lireFeuilleDynamiquePlan_('Plan_Action_Versions');
  const horizons=[1,3,6,12,36,60,120];
  const enrichies=actions.map(a=>{
    const mensuel=String(a.impact_frequence)==='mensuel'?Number(a.impact_montant||0):0;
    const ponctuel=String(a.impact_frequence)==='ponctuel'?Number(a.impact_montant||0):0;
    const impacts={}; horizons.forEach(m=>impacts[m]=Math.round((mensuel*m+ponctuel)*100)/100);
    return Object.assign({},a,{etapes:etapes.filter(e=>String(e.action_id)===String(a.id)).sort((x,y)=>Number(x.ordre)-Number(y.ordre)),impacts});
  });
  return serialiserCerberePourClient_({version:PLAN_ACTIONS_V3_VERSION,actions:enrichies,objectifs,versions,horizons,gains:calculerGainsActionsV3_(enrichies)});
}

function rechercherSourceActionV3(terme){
  assurerPlanActionsV3_();
  const q=normaliserRechercheAction_(terme); if(q.length<2)return [];
  const out=[];
  lireTable_('Charges_fixes').forEach(c=>{
    const txt=normaliserRechercheAction_((c.libelle||'')+' '+(c.libelle_bancaire||''));
    if(txt.includes(q))out.push({type:'charge_fixe',id:c.id||'',libelle:c.libelle||c.libelle_bancaire||'',montant:Math.abs(Number(c.montant||c.montant_indicatif||0)),frequence:c.frequence||'Mensuelle',detail:'Charge fixe'});
  });
  lireTable_('Credits').forEach(c=>{
    const txt=normaliserRechercheAction_((c.nom||'')+' '+(c.numero_pret||''));
    if(txt.includes(q))out.push({type:'credit',id:c.id||'',libelle:c.nom||'',montant:Math.abs(Number(c.mensualite||0)),capital_restant:Math.abs(Number(c.capital_restant||0)),frequence:'Mensuelle',detail:'Crédit'});
  });
  const ops=lireTable_('Operations').filter(o=>normaliserRechercheAction_(o.libelle||'').includes(q)).sort((a,b)=>new Date(b.date_comptable||b.date||0)-new Date(a.date_comptable||a.date||0)).slice(0,12);
  ops.forEach(o=>out.push({type:'operation',id:o.id||'',libelle:o.libelle||'',montant:Math.abs(Number(o.montant||0)),date:o.date_comptable||o.date||'',detail:'Opération réelle'}));
  return serialiserCerberePourClient_(out.slice(0,20));
}

function enregistrerActionPlanV3(d){
  assurerPlanActionsV3_(); d=Object.assign({},d||{});
  d.libelle=String(d.libelle||'').trim(); if(!d.libelle)throw new Error('Le libellé de l’action est obligatoire.');
  const sh=SpreadsheetApp.getActive().getSheetByName('Plan_Actions');
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const now=new Date().toISOString();
  if(!d.id)d.id=Utilities.getUuid();
  const old=lireFeuilleDynamiquePlan_('Plan_Actions').find(x=>String(x.id)===String(d.id))||{};
  d.cree_le=old.cree_le||now; d.modifie_le=now;
  d.impact_montant=Number(d.impact_montant||0); d.impact_frequence=String(d.impact_frequence||'ponctuel');
  d.mode_impact=String(d.mode_impact||'manuel'); d.impact_confirme=d.impact_confirme===true||String(d.impact_confirme)==='true';
  d.processus=d.processus===true||String(d.processus)==='true';
  const values=headers.map(h=>normaliserValeur_(d[h]!==undefined?d[h]:old[h]));
  const ids=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,1).getValues().flat():[];
  const pos=ids.findIndex(x=>String(x)===String(d.id)); if(pos>=0)sh.getRange(pos+2,1,1,headers.length).setValues([values]); else sh.appendRow(values);
  if(Array.isArray(d.etapes))enregistrerEtapesActionV3_(d.id,d.etapes,d.motif_revision||'Plan validé');
  return chargerActionsPlanV3();
}

function enregistrerEtapesActionV3_(actionId,etapes,motif){
  const exist=lireFeuilleDynamiquePlan_('Plan_Action_Etapes').filter(e=>String(e.action_id)===String(actionId));
  const version=Math.max(0,...exist.map(e=>Number(e.version||0)))+1;
  const ss=SpreadsheetApp.getActive(), sh=ss.getSheetByName('Plan_Action_Etapes'), now=new Date().toISOString();
  etapes.filter(e=>String(e.libelle||'').trim()||Number(e.montant_prevu||0)).forEach((e,i)=>sh.appendRow([Utilities.getUuid(),actionId,version,i+1,String(e.libelle||('Étape '+(i+1))),e.date_prevue?new Date(e.date_prevue):'',Number(e.montant_prevu||0),Number(e.montant_reel||0),String(e.statut||'Prévue'),String(e.commentaire||''),now,now]));
  const snap=etapes.map((e,i)=>({ordre:i+1,libelle:e.libelle||'',date_prevue:e.date_prevue||'',montant_prevu:Number(e.montant_prevu||0),montant_reel:Number(e.montant_reel||0),statut:e.statut||'Prévue'}));
  ss.getSheetByName('Plan_Action_Versions').appendRow([Utilities.getUuid(),actionId,version,now,String(motif||'Révision'),snap.reduce((s,e)=>s+e.montant_prevu,0),JSON.stringify(snap)]);
  const a=ss.getSheetByName('Plan_Actions'), hs=a.getRange(1,1,1,a.getLastColumn()).getValues()[0].map(String), col=hs.indexOf('version_processus');
  if(col>=0){const ids=a.getRange(2,1,Math.max(0,a.getLastRow()-1),1).getValues().flat(),p=ids.findIndex(x=>String(x)===String(actionId));if(p>=0)a.getRange(p+2,col+1).setValue(version);}
}

function supprimerActionPlanV3(id){
  assurerPlanActionsV3_(); supprimerLignePlanCerbere_('Plan_Actions',id);
  ['Plan_Action_Etapes','Plan_Action_Versions'].forEach(n=>{const sh=SpreadsheetApp.getActive().getSheetByName(n);if(!sh||sh.getLastRow()<2)return;const hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),c=hs.indexOf('action_id');if(c<0)return;for(let r=sh.getLastRow();r>=2;r--)if(String(sh.getRange(r,c+1).getValue())===String(id))sh.deleteRow(r);});
  return chargerActionsPlanV3();
}

function cloturerChargeFixeDepuisActionV3(actionId,dateEffet){
  assurerPlanActionsV3_(); const a=lireFeuilleDynamiquePlan_('Plan_Actions').find(x=>String(x.id)===String(actionId));
  if(!a||a.source_type!=='charge_fixe'||!a.source_id)throw new Error('Cette action n’est pas adossée à une charge fixe.');
  if(!(a.impact_confirme===true||String(a.impact_confirme)==='true'))throw new Error('L’impact doit être confirmé avant de modifier le référentiel.');
  const sh=SpreadsheetApp.getActive().getSheetByName('Charges_fixes'), hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String), idc=hs.indexOf('id'), fc=hs.indexOf('date_fin');
  if(idc<0||fc<0)throw new Error('Colonnes Charges_fixes incompatibles.');
  const ids=sh.getRange(2,idc+1,sh.getLastRow()-1,1).getValues().flat(),p=ids.findIndex(x=>String(x)===String(a.source_id)); if(p<0)throw new Error('Charge fixe liée introuvable.');
  sh.getRange(p+2,fc+1).setValue(new Date(dateEffet||a.date_effet)); return {ok:true};
}

function lireFeuilleDynamiquePlan_(nom){const sh=SpreadsheetApp.getActive().getSheetByName(nom);if(!sh||sh.getLastRow()<2)return[];const hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());return sh.getRange(2,1,sh.getLastRow()-1,hs.length).getValues().filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>Object.fromEntries(hs.map((h,i)=>[h,serialiserValeur_(r[i])])));}
function normaliserRechercheAction_(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function calculerGainsActionsV3_(actions){let acquis=0,attendu=0;actions.forEach(a=>{const m=Number(a.impact_montant||0);if(a.impact_type!=='baisse_charge'&&a.impact_type!=='hausse_revenu')return;if(['Effective','Réalisée','Réalisé'].includes(String(a.statut)))acquis+=m;else if(!['Abandonnée','Annulée'].includes(String(a.statut)))attendu+=m;});return {mensuel_acquis:acquis,mensuel_attendu:attendu,annuel_acquis:acquis*12,annuel_attendu:attendu*12};}
