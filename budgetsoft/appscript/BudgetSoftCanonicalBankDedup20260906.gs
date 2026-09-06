const BUDGETSOFT_CANONICAL_BANK_DEDUP_VERSION='2026-09-06.2';

function baseCleRapprochementBudgetSoft20260906_(o){
  const c=String(o&&o.cle_rapproment||o&&o.cle_rapprochement||'').trim();
  if(!c)return'';
  const i=c.indexOf('|ID:');
  return i>=0?c.slice(0,i):c;
}
function estCbFluxCanoniqueBudgetSoft20260906_(o){
  if(String(o&&o.source_bancaire||'').toLowerCase()!=='flux')return false;
  if(String(o&&o.carte_fin||'').trim())return true;
  return /\b(?:paiement\s+)?cb\b|\bcarte\b/i.test(String(o&&o.libelle_bancaire||o&&o.libelle||''));
}
function infosCleRapprochementBudgetSoft20260906_(base){
  const p=String(base||'').split('|');
  return{dateComptableAttendue:p.length>2?p[2]:'',dateAchatAttendue:p.length>3?p[3]:''};
}
function scoreDoublonBancaireCanoniqueBudgetSoft20260906_(o,base){
  const info=infosCleRapprochementBudgetSoft20260906_(base);
  const jourCompta=typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):'';
  const jourAchat=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(o&&o.date_achat):'';
  let s=0;
  if(info.dateComptableAttendue&&jourCompta===info.dateComptableAttendue)s+=100;
  if(info.dateAchatAttendue&&jourAchat===info.dateAchatAttendue)s+=40;
  if(/^paiement\s+cb\b/i.test(String(o&&o.libelle_bancaire||'')))s+=20;
  const statut=String(o&&o.statut_bancaire||'').toLowerCase();
  if(statut==='definitif')s+=30;
  if(statut==='rapprochee_charge_fixe')s+=10;
  if(String(o&&o.charge_fixe_id||'').trim())s+=5;
  if(String(o&&o.categorie||'').trim())s+=2;
  return s;
}
function fusionnerMetadonneesDoublonsBudgetSoft20260906_(gagnant,groupe){
  const out=Object.assign({},gagnant);
  ['categorie','charge_fixe_id','commentaire','marchand_normalise','carte_fin'].forEach(k=>{
    if(String(out[k]||'').trim())return;
    const x=(groupe||[]).find(o=>String(o&&o[k]||'').trim());
    if(x)out[k]=x[k];
  });
  return out;
}

/**
 * Déduplication canonique prudente des doublons CB de flux.
 *
 * Une clé bancaire identique ne suffit PAS à conclure à un doublon : plusieurs
 * achats réels peuvent avoir le même marchand, le même montant, la même carte et
 * la même date (ex. plusieurs trajets VélôToulouse). On ne neutralise donc qu'une
 * "ombre" inter-dates : un groupe partage la même clé HB|FLOW, au moins une ligne
 * porte la date comptable attendue inscrite dans la clé et au moins une autre porte
 * une date comptable différente. La ligne sur la date attendue est canonique ; les
 * représentations décalées sont exclues. Les multiplicités strictement sur la même
 * date sont conservées intégralement.
 */
function dedoublonnerOperationsCartesBudgetSoft_(operations){
  const src=Array.isArray(operations)?operations:[];
  const groupes=new Map(),gardes=[];
  src.forEach((o,index)=>{
    const base=estCbFluxCanoniqueBudgetSoft20260906_(o)?baseCleRapprochementBudgetSoft20260906_(o):'';
    if(!base||!/^HB\|FLOW\|/i.test(base)){gardes.push({o,index});return;}
    if(!groupes.has(base))groupes.set(base,[]);
    groupes.get(base).push({o,index});
  });
  groupes.forEach((items,base)=>{
    if(items.length===1){gardes.push(items[0]);return;}
    const info=infosCleRapprochementBudgetSoft20260906_(base);
    const avecJour=items.map(x=>({o:x.o,index:x.index,jour:typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(x.o):''}));
    const canoniques=avecJour.filter(x=>info.dateComptableAttendue&&x.jour===info.dateComptableAttendue);
    const ombres=avecJour.filter(x=>info.dateComptableAttendue&&x.jour&&x.jour!==info.dateComptableAttendue);

    // Aucun couple canonique/ombre inter-dates : on conserve toutes les lignes.
    if(!canoniques.length||!ombres.length){avecJour.forEach(x=>gardes.push({o:x.o,index:x.index}));return;}

    // S'il existe plusieurs opérations réelles sur la date canonique, elles restent
    // toutes distinctes. On ne supprime que les représentations datées ailleurs.
    const tries=canoniques.slice().sort((a,b)=>scoreDoublonBancaireCanoniqueBudgetSoft20260906_(b.o,base)-scoreDoublonBancaireCanoniqueBudgetSoft20260906_(a.o,base)||b.index-a.index);
    const principal=tries[0];
    const fusion=fusionnerMetadonneesDoublonsBudgetSoft20260906_(principal.o,avecJour.map(x=>x.o));
    canoniques.forEach(x=>gardes.push({o:x.index===principal.index?fusion:x.o,index:x.index}));
  });
  gardes.sort((a,b)=>a.index-b.index);
  return gardes.map(x=>x.o);
}

function auditerDedoublonnageBancaireCanoniqueBudgetSoft20260906(){
  const src=lireTable_('Operations')||[],dedup=dedoublonnerOperationsCartesBudgetSoft_(src);
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const somme=xs=>arr(xs.reduce((s,o)=>s+Number(o&&o.montant||0),0));
  const r={ok:true,version:BUDGETSOFT_CANONICAL_BANK_DEDUP_VERSION,source:src.length,canonique:dedup.length,doublonsExclus:src.length-dedup.length,netSource:somme(src),netCanonique:somme(dedup),ecartNet:arr(somme(dedup)-somme(src)),doctrine:'ombres CB inter-dates uniquement ; multiplicités même date conservées'};
  console.log(JSON.stringify(r));return r;
}
