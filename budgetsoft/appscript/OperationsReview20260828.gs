const OPERATIONS_REVIEW_20260828_VERSION='2026-08-28.1';

function normaliserCleChargeDepuisOperation20260828_(o){
  const compte=String(o&&o.compte||'').trim();
  const categorie=String(o&&o.categorie||'').trim();
  const marchand=String(o&&o.marchand_normalise||'').trim();
  const bancaire=String(o&&o.libelle_bancaire||'').trim();
  const libelle=String(o&&o.libelle||'').trim();
  let motif=marchand;
  if(!motif&&typeof extraireMotifStableBanque_==='function')motif=extraireMotifStableBanque_(bancaire||libelle);
  if(!motif&&typeof normaliserTexteBanque_==='function')motif=normaliserTexteBanque_(bancaire||libelle);
  motif=String(motif||bancaire||libelle).trim();
  return [compte,categorie,motif].join('|');
}

function modeValeur20260828_(valeurs){
  const m=new Map();(valeurs||[]).filter(v=>String(v||'').trim()).forEach(v=>{const k=String(v).trim();m.set(k,(m.get(k)||0)+1);});
  return [...m.entries()].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length)[0]?.[0]||'';
}

function mediane20260828_(nombres){
  const xs=(nombres||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);if(!xs.length)return 0;const i=Math.floor(xs.length/2);return xs.length%2?xs[i]:(xs[i-1]+xs[i])/2;
}

function frequenceDepuisDates20260828_(dates){
  const xs=(dates||[]).map(d=>dateLocaleBudgetSoft_(d)).filter(d=>d&&!isNaN(d.getTime())).sort((a,b)=>a-b);
  if(xs.length<2)return'Mensuelle';
  const ecarts=[];for(let i=1;i<xs.length;i++)ecarts.push(Math.round((xs[i]-xs[i-1])/86400000));
  const med=mediane20260828_(ecarts);
  if(med<=9)return'Hebdomadaire';
  if(med>=75&&med<=105)return'Trimestrielle';
  if(med>=150&&med<=210)return'Semestrielle';
  if(med>=300)return'Annuelle';
  return'Mensuelle';
}

function construireGroupesChargesSelection20260828_(ids){
  const selection=new Set((Array.isArray(ids)?ids:[]).map(String));
  if(!selection.size)throw new Error('Aucune opération sélectionnée.');
  const operations=lireTable_('Operations').filter(o=>selection.has(String(o.id)));
  const depenses=operations.filter(o=>String(o.type||'').toLowerCase()==='depense'||Number(o.montant||0)<0);
  if(!depenses.length)throw new Error('La sélection ne contient aucune dépense pouvant devenir une charge fixe.');
  const charges=lireTable_('Charges_fixes');
  const groupes=new Map();
  depenses.forEach(o=>{
    const cle=normaliserCleChargeDepuisOperation20260828_(o);if(!groupes.has(cle))groupes.set(cle,[]);groupes.get(cle).push(o);
  });
  return [...groupes.entries()].map(([cle,ops])=>{
    const dates=ops.map(o=>o.date_comptable||o.date).filter(Boolean);
    const datesTriees=dates.map(d=>dateLocaleBudgetSoft_(d)).filter(d=>!isNaN(d.getTime())).sort((a,b)=>a-b);
    const libelle=modeValeur20260828_(ops.map(o=>o.libelle))||modeValeur20260828_(ops.map(o=>o.marchand_normalise));
    const libelleBancaire=modeValeur20260828_(ops.map(o=>o.libelle_bancaire))||libelle;
    const compte=String(ops[0].compte||''),categorie=String(ops[0].categorie||'');
    const motif=typeof normaliserTexteBanque_==='function'?normaliserTexteBanque_(libelleBancaire||libelle):String(libelleBancaire||libelle).toUpperCase();
    const doublon=charges.find(c=>{
      if(String(c.compte||'')!==compte)return false;
      const b=typeof normaliserTexteBanque_==='function'?normaliserTexteBanque_(c.libelle_bancaire||c.libelle||''):String(c.libelle_bancaire||c.libelle||'').toUpperCase();
      return b&&motif&&(b===motif||b.includes(motif)||motif.includes(b));
    });
    const jours=datesTriees.map(d=>String(d.getDate()));
    return{
      cle,
      operationIds:ops.map(o=>String(o.id)),
      nombre:ops.length,
      libelle,
      libelle_bancaire:libelleBancaire,
      compte,
      categorie,
      montant:Math.round(mediane20260828_(ops.map(o=>Math.abs(Number(o.montant||0))))*100)/100,
      frequence:frequenceDepuisDates20260828_(dates),
      jour_execution:Number(modeValeur20260828_(jours)||1),
      date_debut:datesTriees.length?formatDateLocaleBudgetSoft_(datesTriees[0]):formatDateLocaleBudgetSoft_(new Date()),
      dernier_date:datesTriees.length?formatDateLocaleBudgetSoft_(datesTriees[datesTriees.length-1]):'',
      doublonChargeId:doublon?String(doublon.id):'',
      doublonLibelle:doublon?String(doublon.libelle||''):''
    };
  }).sort((a,b)=>b.nombre-a.nombre||a.libelle.localeCompare(b.libelle,'fr'));
}

function previsualiserChargesFixesDepuisOperations20260828(ids){
  verifierInitialisation_();
  const groupes=construireGroupesChargesSelection20260828_(ids);
  return{ok:true,version:OPERATIONS_REVIEW_20260828_VERSION,groupes,nombreGroupes:groupes.length,operations:groupes.reduce((s,g)=>s+g.nombre,0),doublons:groupes.filter(g=>g.doublonChargeId).length};
}

function creerChargesFixesDepuisOperations20260828(ids,clesGroupes){
  verifierInitialisation_();
  const autorisees=new Set((Array.isArray(clesGroupes)?clesGroupes:[]).map(String));
  if(!autorisees.size)throw new Error('Aucun groupe sélectionné.');
  const groupes=construireGroupesChargesSelection20260828_(ids).filter(g=>autorisees.has(String(g.cle)));
  if(!groupes.length)throw new Error('Aucun groupe valide à créer.');
  const feuilleOps=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');
  const entetes=TABLES.Operations,idxId=entetes.indexOf('id'),idxCharge=entetes.indexOf('charge_fixe_id'),idxStatut=entetes.indexOf('statut_bancaire');
  const nb=feuilleOps.getLastRow()-1;
  const valeurs=nb>0?feuilleOps.getRange(2,1,nb,entetes.length).getValues():[];
  const parId=new Map(valeurs.map((r,i)=>[String(r[idxId]),i]));
  let creees=0,liees=0,ignoreesDoublon=0;
  groupes.forEach(g=>{
    if(g.doublonChargeId){ignoreesDoublon++;return;}
    const ops=lireTable_('Operations').filter(o=>g.operationIds.includes(String(o.id)));
    const derniere=ops.slice().sort((a,b)=>new Date(b.date_comptable||b.date)-new Date(a.date_comptable||a.date))[0]||{};
    const charge=enregistrerLigne('Charges_fixes',{
      libelle:g.libelle||g.libelle_bancaire,
      categorie:g.categorie,
      compte:g.compte,
      montant:g.montant,
      type:'depense',
      jour_execution:g.jour_execution,
      date_debut:g.date_debut,
      date_fin:'',
      actif:true,
      commentaire:'Créée depuis '+g.nombre+' opération(s) sélectionnée(s).',
      frequence:g.frequence,
      libelle_bancaire:g.libelle_bancaire||g.libelle,
      tolerance:0.50,
      nature:'Autre',
      dernier_rapprochement_id:derniere.cle_rapprochement||derniere.id||'',
      dernier_rapprochement_date:derniere.date_comptable||derniere.date||'',
      dernier_montant_reel:Math.abs(Number(derniere.montant||g.montant||0)),
      statut_rapprochement:'Rapprochée'
    });
    creees++;
    g.operationIds.forEach(id=>{
      const i=parId.get(String(id));if(i==null)return;
      valeurs[i][idxCharge]=charge.id;
      const source=String(valeurs[i][entetes.indexOf('source_bancaire')]||'').toLowerCase();
      if(idxStatut>=0&&source&&source!=='manuel')valeurs[i][idxStatut]='rapprochee_charge_fixe';
      liees++;
    });
  });
  if(liees&&nb>0)feuilleOps.getRange(2,1,nb,entetes.length).setValues(valeurs);
  return{ok:true,version:OPERATIONS_REVIEW_20260828_VERSION,creees,operationsLiees:liees,ignoreesDoublon};
}

function auditerOperationsReview20260828(){
  verifierInitialisation_();
  const ops=lireTable_('Operations'),tech=ops.filter(o=>/\[(?:AUDIT_|VALIDATION_RAPPROCHEMENT:|AUDIT_RETRO:|RECURRENCE:)/.test(String(o.commentaire||''))).length;
  const sources={};ops.forEach(o=>{const s=String(o.source_bancaire||'').trim()||'(vide)';sources[s]=(sources[s]||0)+1;});
  const r={ok:true,version:OPERATIONS_REVIEW_20260828_VERSION,operations:ops.length,marqueursTechniques:tech,sources};console.log(JSON.stringify(r));return r;
}
