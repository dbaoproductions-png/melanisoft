const AUDIT_AVANSSUR_12XX_20260912_VERSION='1.0.0';

/**
 * Audit lecture seule ciblé sur la 3e série Avanssur autour de 12-13 EUR.
 * Objectif : ne pas confondre la série Avanssur historique avec Tolosan,
 * et identifier une éventuelle charge fixe existante, active ou inactive.
 */
function auditerAvanssur12xxCompact20260912(){
  const operations=Array.isArray(lireTable_('Operations'))?lireTable_('Operations'):[];
  const charges=Array.isArray(lireTable_('Charges_fixes'))?lireTable_('Charges_fixes'):[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const montant=o=>Math.round(Math.abs(Number(o&&o.montant||0))*100)/100;
  const compactCf=charges.filter(c=>{const m=montant(c);return m>=11&&m<=14;}).map(c=>({
    id:String(c.id||''),libelle:String(c.libelle||''),categorie:String(c.categorie||''),montant:montant(c),actif:c.actif,jour_execution:c.jour_execution
  }));
  const avanssur12=operations.filter(o=>/avanssur/.test(norm([o&&o.libelle,o&&o.libelle_bancaire].filter(Boolean).join(' ')))&&montant(o)>=11&&montant(o)<=14).map(o=>({
    id:String(o.id||''),date:String(o.date_comptable||o.date||''),libelle:String(o.libelle||o.libelle_bancaire||''),categorie:String(o.categorie||''),montant:montant(o),charge_fixe_id:String(o.charge_fixe_id||'')
  }));
  const idsOps={};avanssur12.forEach(o=>idsOps[o.id]=true);
  const rappro=(rapprochements||[]).filter(r=>idsOps[String(r&&r.operation_id||'')]).map(r=>({
    operation_id:String(r.operation_id||''),charge_fixe_id:String(r.charge_fixe_id||''),statut:String(r.statut||r.decision||''),score:r.score==null?null:Number(r.score)
  }));
  const resultat={ok:true,lectureSeule:true,version:AUDIT_AVANSSUR_12XX_20260912_VERSION,chargesFixes11a14:compactCf,avanssur11a14:avanssur12,rapprochementsCanoniques:rappro};
  console.log('[AUDIT AVANSSUR 12XX COMPACT 20260912] '+JSON.stringify(resultat));
  return resultat;
}
