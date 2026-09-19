const PLUXEE_RECHARGE_DEDUPE_REPAIR_VERSION='2026-08-27.1';

/**
 * Doctrine de dédoublonnage Pluxee :
 * - une dépense reste identifiée à la minute + libellé + montant ;
 * - un rechargement est identifié par date civile + montant uniquement.
 *
 * Le site Pluxee ne fournit pas d'heure pour les rechargements alors que le PDF
 * peut en fournir une. L'heure n'est donc pas un attribut métier fiable pour eux.
 */
function clePluxee_(iso,lib,m,type){
  const t=String(type||'').toLowerCase();
  const cents=String(Math.round(Math.abs(Number(m)||0)*100));
  const s=String(iso||'');
  if(t==='rechargement'){
    const jour=s.match(/^(\d{4}-\d{2}-\d{2})/);
    return ['PLUXEE','RECHARGEMENT',jour?jour[1]:s.slice(0,10),cents].join('|');
  }
  const minute=s.replace(/(T\d{2}:\d{2}).*$/,'$1');
  return ['PLUXEE',minute,cents,normaliserTexteBanque_(lib),t].join('|');
}

/**
 * Recalcule les clés existantes à partir des données métier au lieu de faire
 * confiance à d'anciennes clés éventuellement construites avec une autre règle.
 * Cela rend le dédoublonnage PDF <-> copier-coller compatible avec l'historique.
 */
function analyserLotPluxee_(operations,source){
  const exist=lirePluxee_();
  const cles=new Set(exist.map(o=>clePluxee_(o.date,o.libelle,o.montant,o.type)));
  const details=[];
  let nouvelles=0,existantes=0,refusees=0,ambigues=0;
  const contexte=typeof contexteCategorisationPluxee_==='function'?contexteCategorisationPluxee_():null;

  (operations||[]).forEach((brut,i)=>{
    if(brut.refuse){
      refusees++;
      details.push({index:i+1,statutImport:'refusee',raison:brut.raison||'Transaction refusée',operation:brut});
      return;
    }
    try{
      const op=typeof normaliserOperationPluxeeAvecContexte_==='function'
        ? normaliserOperationPluxeeAvecContexte_(Object.assign({},brut,{source:source||brut.source||'import'}),contexte)
        : normaliserOperationPluxee_(Object.assign({},brut,{source:source||brut.source||'import'}));
      const cle=clePluxee_(op.date,op.libelle,op.montant,op.type);
      op.cle_rapprochement=cle;
      if(cles.has(cle)){
        existantes++;
        details.push({index:i+1,statutImport:'existante',operation:op});
        return;
      }
      nouvelles++;
      cles.add(cle);
      details.push({index:i+1,statutImport:'nouvelle',operation:op});
    }catch(e){
      ambigues++;
      details.push({index:i+1,statutImport:'ambigue',raison:e.message,operation:brut});
    }
  });
  return {ok:ambigues===0,version:PLUXEE_VERSION,detectees:(operations||[]).length,nouvelles,existantes,refusees,ambigues,details};
}

/**
 * Nettoyage ponctuel et sûr de l'historique existant.
 * Ne touche qu'aux rechargements valides ayant même date civile et même montant.
 * Préférence de conservation : copier-coller, puis manuel, puis PDF.
 * Les autres opérations Pluxee ne sont jamais supprimées.
 */
function reparerDoublonsRechargementsPluxee20260827(){
  initialiserPluxee();
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PLUXEE_SHEET);
  if(!f||f.getLastRow()<2)return{ok:true,version:PLUXEE_RECHARGE_DEDUPE_REPAIR_VERSION,groupesDoublons:0,supprimees:0,montantSupprime:0,solde:chargerPluxee().solde};

  const valeurs=f.getRange(2,1,f.getLastRow()-1,PLUXEE_HEADERS.length).getValues();
  const idx=Object.fromEntries(PLUXEE_HEADERS.map((h,i)=>[h,i]));
  const groupes=new Map();

  valeurs.forEach((r,pos)=>{
    const type=String(r[idx.type]||'').toLowerCase();
    const statut=String(r[idx.statut]||'valide').toLowerCase();
    if(type!=='rechargement'||statut==='refuse')return;
    const date=r[idx.date] instanceof Date
      ? Utilities.formatDate(r[idx.date],Session.getScriptTimeZone(),'yyyy-MM-dd')
      : (String(r[idx.date]||'').match(/^(\d{4}-\d{2}-\d{2})/)||[])[1];
    const montant=Math.round(Math.abs(Number(r[idx.montant])||0)*100);
    if(!date||!montant)return;
    const cle=date+'|'+montant;
    if(!groupes.has(cle))groupes.set(cle,[]);
    groupes.get(cle).push({pos,row:r,source:String(r[idx.source]||'').toLowerCase()});
  });

  const rangSource=s=>s==='copier_coller'?0:s==='manuel'?1:s==='pdf'?2:3;
  const aSupprimer=[];
  let groupesDoublons=0,montantSupprime=0;

  groupes.forEach(g=>{
    if(g.length<2)return;
    groupesDoublons++;
    g.sort((a,b)=>rangSource(a.source)-rangSource(b.source)||a.pos-b.pos);
    const garder=g[0];
    const date=garder.row[idx.date] instanceof Date
      ? Utilities.formatDate(garder.row[idx.date],Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss")
      : String(garder.row[idx.date]||'');
    garder.row[idx.cle_rapprochement]=clePluxee_(date,garder.row[idx.libelle],garder.row[idx.montant],garder.row[idx.type]);
    f.getRange(garder.pos+2,idx.cle_rapprochement+1).setValue(garder.row[idx.cle_rapprochement]);
    g.slice(1).forEach(x=>{
      aSupprimer.push(x.pos+2);
      montantSupprime+=Math.abs(Number(x.row[idx.montant])||0);
    });
  });

  aSupprimer.sort((a,b)=>b-a).forEach(ligne=>f.deleteRow(ligne));

  // Canonise aussi les clés des rechargements restants pour les futurs imports.
  if(f.getLastRow()>1){
    const vals=f.getRange(2,1,f.getLastRow()-1,PLUXEE_HEADERS.length).getValues();
    vals.forEach((r,pos)=>{
      if(String(r[idx.type]||'').toLowerCase()!=='rechargement')return;
      const date=r[idx.date] instanceof Date
        ? Utilities.formatDate(r[idx.date],Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss")
        : String(r[idx.date]||'');
      const cle=clePluxee_(date,r[idx.libelle],r[idx.montant],r[idx.type]);
      if(String(r[idx.cle_rapprochement]||'')!==cle)f.getRange(pos+2,idx.cle_rapprochement+1).setValue(cle);
    });
  }

  const etat=chargerPluxee();
  const resultat={
    ok:true,
    version:PLUXEE_RECHARGE_DEDUPE_REPAIR_VERSION,
    groupesDoublons,
    supprimees:aSupprimer.length,
    montantSupprime:arrondirPluxee_(montantSupprime),
    soldeApres:etat.solde,
    nombreOperationsApres:etat.nombreOperations
  };
  console.log(JSON.stringify(resultat));
  return resultat;
}

function auditerDedupeRechargementsPluxee20260827(){
  initialiserPluxee();
  const ops=lirePluxee_().filter(o=>String(o.type||'').toLowerCase()==='rechargement'&&String(o.statut||'valide').toLowerCase()!=='refuse');
  const groupes={};
  ops.forEach(o=>{const cle=clePluxee_(o.date,o.libelle,o.montant,o.type);(groupes[cle]||(groupes[cle]=[])).push({id:o.id,date:o.date,montant:o.montant,source:o.source});});
  const doublons=Object.entries(groupes).filter(([,v])=>v.length>1).map(([cle,lignes])=>({cle,lignes}));
  const etat=chargerPluxee();
  const resultat={ok:doublons.length===0,version:PLUXEE_RECHARGE_DEDUPE_REPAIR_VERSION,solde:etat.solde,nombreOperations:etat.nombreOperations,nombreGroupesDoublons:doublons.length,doublons};
  console.log(JSON.stringify(resultat));
  return resultat;
}
