/**
 * Audit et reparation conservative des doublons exacts Pluxee.
 * Sauvegarde integrale de la feuille avant la moindre suppression.
 * Seules les lignes partageant la meme cle PERSISTEE et les memes
 * montant/type/libelle sont considerees ; aucun rapprochement flou.
 */
const PLUXEE_DEDOUBLONNAGE_20261012_VERSION='2026-10-12.1';

function preparerDoublonsDepensesPluxee20261012_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const f=ss.getSheetByName(PLUXEE_SHEET);
  if(!f||f.getLastRow()<2)return{feuille:f,groupes:[],supprimer:[],montant:0};
  const valeurs=f.getRange(2,1,f.getLastRow()-1,PLUXEE_HEADERS.length).getValues();
  const ix=Object.fromEntries(PLUXEE_HEADERS.map((x,i)=>[x,i]));
  const groupes=new Map();
  valeurs.forEach((r,pos)=>{
    const cle=String(r[ix.cle_rapprochement]||'').trim();
    const montant=Number(r[ix.montant]);
    const type=String(r[ix.type]||'').trim().toLowerCase();
    const statut=String(r[ix.statut]||'valide').toLowerCase();
    if(!cle.startsWith('PLUXEE|')||type!=='depense'||statut==='refuse'||!(montant<0))return;
    const identite=[cle,Math.round(montant*100),type,String(r[ix.libelle]||'').trim().toLowerCase()].join('|');
    if(!groupes.has(identite))groupes.set(identite,[]);
    groupes.get(identite).push({ligne:pos+2,id:String(r[ix.id]||''),libelle:String(r[ix.libelle]||''),date:r[ix.date] instanceof Date?Utilities.formatDate(r[ix.date],Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm"):String(r[ix.date]||''),montant:montant,categorie:String(r[ix.categorie]||''),source:String(r[ix.source]||'')});
  });
  const resultats=[],supprimer=[];
  let montant=0;
  groupes.forEach((g,cle)=>{
    if(g.length<2)return;
    const tries=g.slice().sort((a,b)=>(b.categorie?1:0)-(a.categorie?1:0)||a.ligne-b.ligne);
    const garder=tries[0],doublons=tries.slice(1);
    doublons.forEach(x=>{supprimer.push(x.ligne);montant+=Math.abs(x.montant)});
    resultats.push({cle,libelle:garder.libelle,date:garder.date,montant:garder.montant,nombre:g.length,garder:garder.ligne,supprimer:doublons.map(x=>x.ligne),ids:g.map(x=>x.id)});
  });
  return{feuille:f,groupes:resultats,supprimer,montant:Math.round(montant*100)/100};
}

function auditerDoublonsDepensesPluxee20261012(){
  const p=preparerDoublonsDepensesPluxee20261012_();
  const result={ok:true,lectureSeule:true,version:PLUXEE_DEDOUBLONNAGE_20261012_VERSION,
    groupes:p.groupes.length,lignesSurnumeraires:p.supprimer.length,
    depensesCompteeesEnTrop:p.montant,details:p.groupes};
  console.log('[AUDIT DOUBLONS PLUXEE 20261012] '+JSON.stringify(result));
  return result;
}

/** Action explicite : sauvegarde complete, puis supprime les doublons exacts. */
function reparerDoublonsDepensesPluxee20261012(){
  const lock=LockService.getDocumentLock();
  if(!lock.tryLock(15000))throw new Error('Une autre maintenance Pluxee est en cours.');
  try{
    const p=preparerDoublonsDepensesPluxee20261012_();
    if(!p.supprimer.length){
      const r={ok:true,modifie:false,supprimees:0,montant:0};
      console.log('[REPARATION DOUBLONS PLUXEE 20261012] '+JSON.stringify(r));
      return r;
    }
    const ss=SpreadsheetApp.getActiveSpreadsheet();
    const nom='Backup_Pluxee_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
    const backup=p.feuille.copyTo(ss);
    backup.setName(nom);
    const avant=p.feuille.getLastRow();
    p.supprimer.sort((a,b)=>b-a).forEach(n=>p.feuille.deleteRow(n));
    if(p.feuille.getLastRow()!==avant-p.supprimer.length)throw new Error('Nombre de lignes final incoherent : restaurer la sauvegarde '+nom);
    if(typeof marquerSnapshotGlobalBudgetSoftObsolete20260916_==='function')marquerSnapshotGlobalBudgetSoftObsolete20260916_('pluxee_doublons_20261012');
    const r={ok:true,modifie:true,version:PLUXEE_DEDOUBLONNAGE_20261012_VERSION,
      sauvegarde:nom,groupes:p.groupes.length,supprimees:p.supprimer.length,
      depensesEnTropCorrigees:p.montant,soldePluxee:chargerPluxeeSource20260918_().solde};
    console.log('[REPARATION DOUBLONS PLUXEE 20261012] '+JSON.stringify(r));
    return r;
  }finally{lock.releaseLock();}
}
