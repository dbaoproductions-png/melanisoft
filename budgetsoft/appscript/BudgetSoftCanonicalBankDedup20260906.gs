const BUDGETSOFT_CANONICAL_BANK_DEDUP_VERSION='2026-09-06.1';

function baseCleRapprochementBudgetSoft20260906_(o){
  const c=String(o&&o.cle_rapprochement||'').trim();
  if(!c)return'';
  const i=c.indexOf('|ID:');
  return i>=0?c.slice(0,i):c;
}
function estCbFluxCanoniqueBudgetSoft20260906_(o){
  if(String(o&&o.source_bancaire||'').toLowerCase()!=='flux')return false;
  if(String(o&&o.carte_fin||'').trim())return true;
  return /\b(?:paiement\s+)?cb\b|\bcarte\b/i.test(String(o&&o.libelle_bancaire||o&&o.libelle||''));
}
function scoreDoublonBancaireCanoniqueBudgetSoft20260906_(o,base){
  const p=String(base||'').split('|');
  const comptaAttendue=p.length>2?p[2]:'';
  const achatAttendu=p.length>3?p[3]:'';
  const jourCompta=typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):'';
  const jourAchat=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(o&&o.date_achat):'';
  let s=0;
  if(comptaAttendue&&jourCompta===comptaAttendue)s+=100;
  if(achatAttendu&&jourAchat===achatAttendu)s+=40;
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
 * Déduplication canonique des doublons bancaires stricts.
 * On ne fusionne que des lignes CB de source flux partageant exactement la même
 * clé bancaire de rapprochement hors suffixe technique |ID:. Le compteur 1/2,2/2
 * fait partie de la clé et protège donc les achats réellement répétés.
 */
function dedoublonnerOperationsCartesBudgetSoft_(operations){
  const src=Array.isArray(operations)?operations:[];
  const groupes=new Map(),sansCle=[];
  src.forEach((o,index)=>{
    const base=estCbFluxCanoniqueBudgetSoft20260906_(o)?baseCleRapprochementBudgetSoft20260906_(o):'';
    if(!base||!/^HB\|FLOW\|/i.test(base)){sansCle.push({o,index});return;}
    if(!groupes.has(base))groupes.set(base,[]);
    groupes.get(base).push({o,index});
  });
  const gardes=sansCle.slice();
  groupes.forEach((items,base)=>{
    if(items.length===1){gardes.push(items[0]);return;}
    const tries=items.slice().sort((a,b)=>scoreDoublonBancaireCanoniqueBudgetSoft20260906_(b.o,base)-scoreDoublonBancaireCanoniqueBudgetSoft20260906_(a.o,base)||b.index-a.index);
    const gagnant=tries[0];
    gardes.push({o:fusionnerMetadonneesDoublonsBudgetSoft20260906_(gagnant.o,items.map(x=>x.o)),index:gagnant.index});
  });
  gardes.sort((a,b)=>a.index-b.index);
  return gardes.map(x=>x.o);
}

function auditerDedoublonnageBancaireCanoniqueBudgetSoft20260906(){
  const src=lireTable_('Operations')||[],dedup=dedoublonnerOperationsCartesBudgetSoft_(src);
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const somme=xs=>arr(xs.reduce((s,o)=>s+Number(o&&o.montant||0),0));
  const r={ok:true,version:BUDGETSOFT_CANONICAL_BANK_DEDUP_VERSION,source:src.length,canonique:dedup.length,doublonsExclus:src.length-dedup.length,netSource:somme(src),netCanonique:somme(dedup),ecartNet:arr(somme(dedup)-somme(src))};
  console.log(JSON.stringify(r));return r;
}
