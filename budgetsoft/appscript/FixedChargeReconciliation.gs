const FIXED_CHARGE_MATCH_SHEET = 'Rapprochements_charges_fixes';
const FIXED_CHARGE_MATCH_HEADERS = ['id','charge_fixe_id','operation_id','score','statut','date_operation','montant_reel','montant_attendu','ecart_montant','ecart_jours','libelle_operation','libelle_charge','compte','decision','cree_le','modifie_le'];

function initialiserRapprochementsChargesFixes_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let feuille=ss.getSheetByName(FIXED_CHARGE_MATCH_SHEET);
  if(!feuille)feuille=ss.insertSheet(FIXED_CHARGE_MATCH_SHEET);
  if(feuille.getLastRow()===0)feuille.getRange(1,1,1,FIXED_CHARGE_MATCH_HEADERS.length).setValues([FIXED_CHARGE_MATCH_HEADERS]);
  const presentes=feuille.getRange(1,1,1,Math.max(1,feuille.getLastColumn())).getValues()[0].map(v=>String(v||'').trim());
  const manquantes=FIXED_CHARGE_MATCH_HEADERS.filter(h=>!presentes.includes(h));
  if(manquantes.length)feuille.getRange(1,presentes.length+1,1,manquantes.length).setValues([manquantes]);
  feuille.setFrozenRows(1);
  feuille.getRange(1,1,1,FIXED_CHARGE_MATCH_HEADERS.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff');
  return feuille;
}

function lireRapprochementsChargesFixes(){
  const feuille=initialiserRapprochementsChargesFixes_();
  if(feuille.getLastRow()<2)return[];
  const valeurs=feuille.getRange(2,1,feuille.getLastRow()-1,FIXED_CHARGE_MATCH_HEADERS.length).getValues();
  return valeurs.filter(l=>l.some(v=>v!==''&&v!==null)).map(l=>Object.fromEntries(FIXED_CHARGE_MATCH_HEADERS.map((h,i)=>[h,l[i] instanceof Date?l[i].toISOString():l[i]])));
}

function analyserRapprochementsChargesFixes(){
  verifierInitialisation_();
  initialiserRapprochementsChargesFixes_();
  const charges=lireTable_('Charges_fixes').filter(c=>convertirBooleen_(c.actif));
  const operations=lireTable_('Operations').filter(o=>!/\[RECURRENCE:/.test(String(o.commentaire||'')));
  const existants=lireRapprochementsChargesFixes();
  const dejaTraites=new Set(existants.filter(r=>String(r.statut)!=='À valider').map(r=>String(r.charge_fixe_id)+'|'+String(r.operation_id)));
  const candidats=[];
  charges.forEach(charge=>{operations.forEach(operation=>{const cle=String(charge.id)+'|'+String(operation.id);if(dejaTraites.has(cle))return;const resultat=evaluerRapprochementChargeFixe_(charge,operation);if(!resultat||resultat.score<55)return;candidats.push(Object.assign({},resultat,{id:Utilities.getUuid(),charge_fixe_id:charge.id,operation_id:operation.id,statut:'À valider',decision:'',cree_le:new Date().toISOString(),modifie_le:new Date().toISOString()}));});});
  const meilleureParOperation=new Map();candidats.sort((a,b)=>Number(b.score)-Number(a.score)).forEach(c=>{if(!meilleureParOperation.has(String(c.operation_id)))meilleureParOperation.set(String(c.operation_id),c);});const retenus=[...meilleureParOperation.values()],feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FIXED_CHARGE_MATCH_SHEET),enAttenteExistants=existants.filter(r=>String(r.statut)==='À valider');
  if(enAttenteExistants.length){for(let i=feuille.getLastRow();i>=2;i--){const statut=String(feuille.getRange(i,FIXED_CHARGE_MATCH_HEADERS.indexOf('statut')+1).getValue());if(statut==='À valider')feuille.deleteRow(i);}}
  if(retenus.length)feuille.getRange(feuille.getLastRow()+1,1,retenus.length,FIXED_CHARGE_MATCH_HEADERS.length).setValues(retenus.map(r=>FIXED_CHARGE_MATCH_HEADERS.map(h=>r[h]??'')));
  return lireRapprochementsChargesFixes();
}

function evaluerRapprochementChargeFixe_(charge,operation){
  if(String(operation.type||'').toLowerCase()!=='depense')return null;if(String(charge.compte||'')&&String(operation.compte||'')!==String(charge.compte))return null;const opDate=new Date(operation.date),debut=charge.date_debut?new Date(charge.date_debut):null,fin=charge.date_fin?new Date(charge.date_fin):null;if(isNaN(opDate))return null;if(debut&&!isNaN(debut)&&opDate<debut)return null;if(fin&&!isNaN(fin)&&opDate>fin)return null;
  const montantReel=Math.abs(Number(operation.montant||0)),montantAttendu=Math.abs(Number(charge.montant||0));if(!Number.isFinite(montantReel)||montantReel<=0)return null;const tolerance=Math.max(Number(charge.tolerance||0.5),Math.max(1,montantAttendu*0.05)),ecartMontant=Math.abs(montantReel-montantAttendu),jourAttendu=Math.max(1,Math.min(31,Number(charge.jour_execution)||opDate.getDate())),ecartJours=Math.abs(opDate.getDate()-jourAttendu),libelleOp=String(operation.libelle||''),brut=typeof brutAudit_==='function'?brutAudit_(operation):[operation.libelle,operation.commentaire].filter(Boolean).join(' '),motifCharge=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(charge.libelle_bancaire||charge.libelle):normaliserTexteChargeFixe_(charge.libelle_bancaire||charge.libelle),motifOperation=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(brut):normaliserTexteChargeFixe_(brut),texteCharge=normaliserTexteChargeFixe_([charge.libelle,charge.libelle_bancaire].join(' ')),texteOperation=normaliserTexteChargeFixe_(brut);let scoreLibelle=0;if(motifCharge&&motifOperation&&motifCharge===motifOperation)scoreLibelle=60;else if(motifCharge&&texteOperation.includes(motifCharge))scoreLibelle=50;else if(texteCharge&&texteOperation&&(texteOperation.includes(texteCharge)||texteCharge.includes(texteOperation)))scoreLibelle=40;else scoreLibelle=similariteMotsChargeFixe_(texteCharge,texteOperation)*40;const scoreMontant=ecartMontant<=tolerance?25:Math.max(0,25-(ecartMontant/Math.max(1,montantAttendu))*100),scoreDate=ecartJours<=3?15:ecartJours<=7?10:ecartJours<=12?5:0,score=Math.round(Math.min(100,scoreLibelle+scoreMontant+scoreDate));return{score,date_operation:opDate.toISOString(),montant_reel:montantReel,montant_attendu:montantAttendu,ecart_montant:Math.round(ecartMontant*100)/100,ecart_jours:ecartJours,libelle_operation:libelleOp,libelle_charge:String(charge.libelle||''),compte:String(operation.compte||'')};
}
function normaliserTexteChargeFixe_(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function similariteMotsChargeFixe_(a,b){const A=new Set(String(a||'').split(' ').filter(x=>x.length>2)),B=new Set(String(b||'').split(' ').filter(x=>x.length>2));if(!A.size||!B.size)return 0;let commun=0;A.forEach(x=>{if(B.has(x))commun++;});return commun/Math.max(A.size,B.size);}

function deciderRapprochementChargeFixe(id,decision){if(typeof rapprocherPrevisionnelReelBudgetSoft==='function')return rapprocherPrevisionnelReelBudgetSoft({type:'charge_fixe',rapprochement_id:id,decision:decision});throw new Error('Moteur unique de rapprochement indisponible.');}

function marquerOperationRapprocheeChargeFixe_(rapprochement){
  const operations=lireTable_('Operations'),o=operations.find(x=>String(x.id)===String(rapprochement.operation_id));if(!o)return;const marqueur='[CHARGE_FIXE:'+String(rapprochement.charge_fixe_id)+']',commentaire=String(o.commentaire||'');enregistrerLigne('Operations',{id:o.id,date:o.date,libelle:o.libelle,categorie:o.categorie,compte:o.compte,montant:Math.abs(Number(o.montant||0)),type:o.type,commentaire:commentaire.includes(marqueur)?commentaire:[commentaire,marqueur].filter(Boolean).join(' '),cree_le:o.cree_le||''});
}

/**
 * Profil lecture seule des lecteurs physiques les plus coûteux vus dans Cerbère.
 * Le lecteur RAPPRO_CF courant appelle initialiserRapprochementsChargesFixes_(),
 * qui réapplique du formatage ; ce profil n'appelle volontairement PAS ce chemin.
 * Il mesure une lecture pure équivalente de RAPPRO_CF, Controles_releves,
 * Parametres et Operations, en ventilant accès feuille / dimensions / getValues /
 * mapping. Aucun write SpreadsheetApp n'est exécuté.
 */
function auditerProfilLecteursPhysiquesCerbereBudgetSoft20260912(){
  const version='2026-09-12.1',tGlobal=Date.now(),mesures=[],erreurs=[];
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  function chrono_(fn){const t=Date.now(),v=fn();return{v:v,ms:Date.now()-t};}
  function mapper_(headers,rows){return rows.filter(function(r){return r.some(function(v){return v!==''&&v!==null;});}).map(function(r){const o={};headers.forEach(function(h,i){if(h)o[h]=r[i] instanceof Date?r[i].toISOString():r[i];});return o;});}
  function profilerFeuille_(nom,headersFixes){
    const m={source:nom,etapes:{},lignes:0,colonnes:0,tailleJson:0};
    let x=chrono_(function(){return ss.getSheetByName(nom);});m.etapes.getSheetByNameMs=x.ms;const sh=x.v;
    if(!sh){m.disponible=false;mesures.push(m);return null;}
    m.disponible=true;
    x=chrono_(function(){return{r:sh.getLastRow(),c:sh.getLastColumn()};});m.etapes.dimensionsMs=x.ms;const lr=x.v.r,lc=x.v.c;m.lignes=Math.max(0,lr-1);m.colonnes=lc;
    if(lr<2||lc<1){m.resultat=[];mesures.push(m);return[];}
    let headers=headersFixes||null;
    if(headers){
      m.etapes.lectureEntetesMs=0;
    }else{
      x=chrono_(function(){return sh.getRange(1,1,1,lc).getValues()[0].map(function(v){return String(v||'').trim();});});m.etapes.lectureEntetesMs=x.ms;headers=x.v;
    }
    const largeur=headersFixes?headersFixes.length:lc;
    x=chrono_(function(){return sh.getRange(2,1,lr-1,largeur).getValues();});m.etapes.lectureValeursMs=x.ms;
    const rows=x.v;
    x=chrono_(function(){return mapper_(headers,rows);});m.etapes.mappingMs=x.ms;m.resultat=x.v;
    x=chrono_(function(){return JSON.stringify(m.resultat);});m.etapes.serialisationControleMs=x.ms;m.tailleJson=x.v.length;
    m.totalMesureMs=Object.keys(m.etapes).reduce(function(s,k){return s+Number(m.etapes[k]||0);},0);
    mesures.push(m);return m.resultat;
  }
  try{
    const rappro=profilerFeuille_(FIXED_CHARGE_MATCH_SHEET,FIXED_CHARGE_MATCH_HEADERS);
    const controles=profilerFeuille_('Controles_releves',null);
    let t=Date.now(),parametres=lireTable_('Parametres');mesures.push({source:'TABLE:Parametres via lireTable_',disponible:true,lignes:Array.isArray(parametres)?parametres.length:0,totalMesureMs:Date.now()-t});
    t=Date.now();let operations=lireTable_('Operations');mesures.push({source:'TABLE:Operations via lireTable_',disponible:true,lignes:Array.isArray(operations)?operations.length:0,totalMesureMs:Date.now()-t});
    if(typeof lireFeuilleDynamiqueCerbereV379_==='function'){
      t=Date.now();const dyn=lireFeuilleDynamiqueCerbereV379_('Rapprochements_charges_fixes');const dynMs=Date.now()-t;
      const a=JSON.stringify(rappro||[]),b=JSON.stringify((dyn||[]).map(function(o){const z={};FIXED_CHARGE_MATCH_HEADERS.forEach(function(h){z[h]=o&&Object.prototype.hasOwnProperty.call(o,h)?o[h]:'';});return z;}));
      mesures.push({source:'RAPPRO_CF comparaison lecteur dynamique pur',disponible:true,lignes:(dyn||[]).length,totalMesureMs:dynMs,identiqueAux16Colonnes:a===b});
    }
  }catch(e){erreurs.push(String(e&&e.stack||e&&e.message||e));}
  const classement=mesures.slice().sort(function(a,b){return Number(b.totalMesureMs||0)-Number(a.totalMesureMs||0);}).map(function(m){return{source:m.source,totalMesureMs:Number(m.totalMesureMs||0),lignes:Number(m.lignes||0),etapes:m.etapes||null,identiqueAux16Colonnes:m.identiqueAux16Colonnes};});
  const comparaison=mesures.find(function(m){return m.source==='RAPPRO_CF comparaison lecteur dynamique pur';});
  const out={ok:erreurs.length===0&&(!comparaison||comparaison.identiqueAux16Colonnes===true),version:version,lectureSeule:true,aucuneModification:true,perimetre:{compare:'lectures physiques Cerbère coûteuses, sans cache et sans écriture',reference:new Date().toISOString(),sourceVerite:'feuilles réelles + lecteurs purs',attention:'lireRapprochementsChargesFixes() courant n’est pas appelé car il passe par initialiserRapprochementsChargesFixes_(), qui réapplique le formatage'},mesures:mesures,classement:classement,erreurs:erreurs,dureeTotaleMs:Date.now()-tGlobal,decision:erreurs.length===0&&(!comparaison||comparaison.identiqueAux16Colonnes===true)?'PROFIL_LECTEURS_PHYSIQUES_VALIDE_POUR_CHOISIR_LEVIER':'PROFIL_LECTEURS_PHYSIQUES_INVALIDE_NE_RIEN_OPTIMISER',doctrine:'Profil uniquement. Le candidat naturel est de séparer initialisation/formatage de RAPPRO_CF et lecture pure, mais aucune intégration avant A/B strict puis gardes snapshot.'};
  console.log('[AUDIT PERF lecteurs physiques Cerbère] '+JSON.stringify(out));return out;
}
