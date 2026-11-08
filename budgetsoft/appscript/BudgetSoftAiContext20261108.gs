/**
 * Contexte familial et professionnel destiné au Conseiller IA BudgetSoft.
 * Stockage privé dans les propriétés du document Google Sheets associé.
 * AUCUN résumé personnel n'est inclus dans le dépôt GitHub.
 *
 * Taille volontairement limitée (propriété Apps Script ~9 Ko).
 * Contrôle de révision pour éviter l'écrasement entre deux navigateurs.
 */
const BUDGETSOFT_IA_CONTEXTE_20261108_VERSION='2026-11-08.1';
const BUDGETSOFT_IA_CONTEXTE_CLE_20261108='BUDGETSOFT_IA_CONTEXTE_FOYER_V1';
const BUDGETSOFT_IA_CONTEXTE_DATE_20261108='BUDGETSOFT_IA_CONTEXTE_FOYER_UPDATED_V1';
const BUDGETSOFT_IA_CONTEXTE_MAX_OCTETS_20261108=7800;

function empreinteContexteIaBudgetSoft20261108_(v){
  const octets=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v||''),Utilities.Charset.UTF_8);
  return octets.map(x=>('0'+(x&255).toString(16)).slice(-2)).join('');
}
function lireContexteIaBudgetSoft20261108(){
  const p=PropertiesService.getDocumentProperties();
  if(!p)throw new Error('Propriétés du document indisponibles.');
  const texte=p.getProperty(BUDGETSOFT_IA_CONTEXTE_CLE_20261108)||'';
  return{
    ok:true,version:BUDGETSOFT_IA_CONTEXTE_20261108_VERSION,
    texte,empreinte:empreinteContexteIaBudgetSoft20261108_(texte),
    modifieLe:p.getProperty(BUDGETSOFT_IA_CONTEXTE_DATE_20261108)||'',
    stockage:'proprietes_document',
    rappel:'Ce texte est privé au projet Google Apps Script, mais peut être copié manuellement vers une IA.'
  };
}
function enregistrerContexteIaBudgetSoft20261108(texte,empreintePrevue){
  if(typeof texte!=='string')throw new Error('Le contexte doit être du texte.');
  const nbOctets=Utilities.newBlob(texte,'text/plain').getBytes().length;
  if(nbOctets>BUDGETSOFT_IA_CONTEXTE_MAX_OCTETS_20261108)
    throw new Error('Contexte trop long ('+nbOctets+' octets) ; limite : '+BUDGETSOFT_IA_CONTEXTE_MAX_OCTETS_20261108+'.');
  const lock=LockService.getDocumentLock()||LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    const p=PropertiesService.getDocumentProperties();
    if(!p)throw new Error('Propriétés du document indisponibles.');
    const actuel=p.getProperty(BUDGETSOFT_IA_CONTEXTE_CLE_20261108)||'';
    if(String(empreintePrevue||'')!==empreinteContexteIaBudgetSoft20261108_(actuel))
      throw new Error('Conflit : le contexte a été modifié depuis son chargement. Copie ton texte, puis recharge le contexte.');
    if(texte===actuel)return{
      ok:true,modifie:false,empreinte:empreinteContexteIaBudgetSoft20261108_(actuel),
      modifieLe:p.getProperty(BUDGETSOFT_IA_CONTEXTE_DATE_20261108)||'',tailleOctets:nbOctets
    };
    p.setProperty(BUDGETSOFT_IA_CONTEXTE_CLE_20261108,texte);
    const date=new Date().toISOString();
    p.setProperty(BUDGETSOFT_IA_CONTEXTE_DATE_20261108,date);
    // Éviter de journaliser un texte pouvant contenir des données sensibles.
    return{ok:true,modifie:true,
      empreinte:empreinteContexteIaBudgetSoft20261108_(texte),
      modifieLe:date,tailleOctets:nbOctets};
  }finally{
    lock.releaseLock();
  }
}
function auditerContexteIaBudgetSoft20261108(){
  const r=lireContexteIaBudgetSoft20261108();
  const out={ok:r.ok,version:r.version,stockage:r.stockage,
    textePresent:!!r.texte,longueur:r.texte.length,empreinte:r.empreinte,
    modifieLe:r.modifieLe};
  console.log('[AUDIT CONTEXTE IA BUDGETSOFT 20261108] '+JSON.stringify(out));
  return out;
}
