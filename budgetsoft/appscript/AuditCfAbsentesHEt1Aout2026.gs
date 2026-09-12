const AUDIT_CF_ABSENTES_HET1_20260826_VERSION='1.2.0';

/**
 * Audit LECTURE SEULE des vraies charges fixes candidates relevées dans HEt1.
 * But : documenter l'opération et rechercher l'historique comparable dans Operations
 * ainsi que les entrées Charges_fixes avant toute création/modification de lien.
 *
 * IMPORTANT : aucune écriture ; aucune règle Cerbère spécifique.
 * Usage : auditerCfAbsentesHEt1Aout2026()
 */
function auditerCfAbsentesHEt1Aout2026(){
  const operations=Array.isArray(lireTable_('Operations'))?lireTable_('Operations'):[];
  const charges=Array.isArray(lireTable_('Charges_fixes'))?lireTable_('Charges_fixes'):[];
  const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const tz=Session.getScriptTimeZone()||'Europe/Paris';
  const dateIso=o=>{const v=o&&(o.date_comptable||o.date||o.date_operation||o.date_banque||o.date_valeur);if(!v)return'';const d=v instanceof Date?v:new Date(v);return isNaN(d.getTime())?'':Utilities.formatDate(d,tz,'yyyy-MM-dd');};
  const texte=o=>norm([o&&o.libelle,o&&o.libelle_bancaire,o&&o.description,o&&o.categorie].filter(Boolean).join(' '));
  const montant=o=>Math.round(Math.abs(Number(o&&o.montant||0))*100)/100;

  const familles=[
    {nom:'Carrefour PASS mensualité 168',match:o=>/carrefour banque/.test(texte(o))&&Math.abs(montant(o)-168)<.011},
    {nom:'Avanssur',match:o=>/avanssur/.test(texte(o))},
    {nom:'Floa',match:o=>/\bfloa\b/.test(texte(o))},
    {nom:'Google 2,99',match:o=>/google/.test(texte(o))&&Math.abs(montant(o)-2.99)<.011},
    {nom:'Amazon Digital 3,99',match:o=>/amazon digital/.test(texte(o))&&Math.abs(montant(o)-3.99)<.011}
  ];

  console.log('=== AUDIT DETAILLE CF ABSENTES HEt1 ===');
  console.log('Version : '+AUDIT_CF_ABSENTES_HET1_20260826_VERSION);
  console.log('Mode : LECTURE SEULE — aucune feuille modifiee');
  const sortie=[];

  familles.forEach(f=>{
    const ops=operations.filter(f.match).sort((a,b)=>dateIso(a).localeCompare(dateIso(b)));
    const cfs=charges.filter(c=>f.match(c));
    console.log('--- '+f.nom+' ---');
    console.log('Operations historiques : '+ops.length+' | Charges_fixes correspondantes : '+cfs.length);
    ops.forEach((o,i)=>console.log('OP '+(i+1)+' | '+dateIso(o)+' | '+montant(o).toFixed(2)+' EUR | '+String(o.categorie||'')+' | '+String(o.libelle||o.libelle_bancaire||'')+' | id='+String(o.id||'')+' | charge_fixe_id='+String(o.charge_fixe_id||'')));
    cfs.forEach((c,i)=>console.log('CF '+(i+1)+' | '+montant(c).toFixed(2)+' EUR | '+String(c.categorie||'')+' | '+String(c.libelle||c.libelle_bancaire||'')+' | id='+String(c.id||'')));
    sortie.push({famille:f.nom,operations:ops.map(o=>({id:String(o.id||''),date:dateIso(o),montant:montant(o),categorie:String(o.categorie||''),libelle:String(o.libelle||o.libelle_bancaire||''),charge_fixe_id:String(o.charge_fixe_id||'')})),chargesFixes:cfs.map(c=>({id:String(c.id||''),montant:montant(c),categorie:String(c.categorie||''),libelle:String(c.libelle||c.libelle_bancaire||'')}))});
  });

  console.log('=== FIN AUDIT DETAILLE CF ABSENTES ===');
  return {ok:true,lectureSeule:true,version:AUDIT_CF_ABSENTES_HET1_20260826_VERSION,sortie};
}

/**
 * Audit intermodule ciblé Avanssur.
 * Vérifie le propriétaire canonique du rapprochement sans aucune écriture :
 * - référentiel Charges_fixes ;
 * - Operations.charge_fixe_id ;
 * - table canonique de rapprochements si elle est disponible.
 */
function auditerRapprochementIntermoduleAvanssur20260912(){
  const CF_1290='5f1a2b1a-dc1a-4366-9a37-f1cd2e823c1c';
  const CF_B='433feb19-297f-41fa-80fa-d7e64e40ae36';
  const CF_C='7b48a001-708b-4a3d-a390-3f420a2f0c58';
  const OP_1285='d3c5df17-d65a-4383-8a05-341fdc684eab';
  const operations=Array.isArray(lireTable_('Operations'))?lireTable_('Operations'):[];
  const charges=Array.isArray(lireTable_('Charges_fixes'))?lireTable_('Charges_fixes'):[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  const idsCf=[CF_1290,CF_B,CF_C];
  const chargesCible=charges.filter(c=>idsCf.indexOf(String(c&&c.id||''))>=0).map(c=>({
    id:String(c.id||''),libelle:String(c.libelle||''),categorie:String(c.categorie||''),montant:Math.abs(Number(c.montant||0)),actif:c.actif,jour_execution:c.jour_execution
  }));
  const opsCible=operations.filter(o=>String(o&&o.id||'')===OP_1285||idsCf.indexOf(String(o&&o.charge_fixe_id||''))>=0).map(o=>({
    id:String(o.id||''),date:String(o.date_comptable||o.date||''),libelle:String(o.libelle||o.libelle_bancaire||''),categorie:String(o.categorie||''),montant:Math.abs(Number(o.montant||0)),charge_fixe_id:String(o.charge_fixe_id||'')
  }));
  const rapprochementsCible=(rapprochements||[]).filter(r=>String(r&&r.operation_id||'')===OP_1285||idsCf.indexOf(String(r&&r.charge_fixe_id||''))>=0).map(r=>({
    operation_id:String(r.operation_id||''),charge_fixe_id:String(r.charge_fixe_id||''),statut:String(r.statut||r.decision||''),score:r.score==null?null:Number(r.score)
  }));
  const op1285=opsCible.find(o=>o.id===OP_1285)||null;
  const resultat={
    ok:true,lectureSeule:true,version:AUDIT_CF_ABSENTES_HET1_20260826_VERSION,
    ids:{cf1290:CF_1290,cfB:CF_B,cfC:CF_C,op1285:OP_1285},
    charge1290:chargesCible.find(c=>c.id===CF_1290)||null,
    chargeB:chargesCible.find(c=>c.id===CF_B)||null,
    chargeC:chargesCible.find(c=>c.id===CF_C)||null,
    operation1285:op1285,
    operationsLiees:opsCible,
    rapprochementsCanoniques:rapprochementsCible,
    diagnostic:{
      operation1285LieeA:String(op1285&&op1285.charge_fixe_id||''),
      cibleHistorique1290Existe:!!chargesCible.find(c=>c.id===CF_1290),
      tableRapprochementsDisponible:typeof lireRapprochementsChargesFixes==='function',
      nombreRapprochementsCibles:rapprochementsCible.length
    }
  };
  console.log('[AUDIT RAPPRO CF INTERMODULE AVANSSUR 20260912] '+JSON.stringify(resultat));
  return resultat;
}
