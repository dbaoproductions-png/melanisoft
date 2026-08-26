const AUDIT_CF_ABSENTES_HET1_20260826_VERSION='1.0.0';

/**
 * Audit LECTURE SEULE des vrais AUCUN_CANDIDAT relevés dans HEt1.
 * But : documenter l'opération et rechercher l'historique comparable dans Operations
 * avant toute création/modification de Charges_fixes.
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
    ops.forEach((o,i)=>console.log('OP '+(i+1)+' | '+dateIso(o)+' | '+montant(o).toFixed(2)+' EUR | '+String(o.categorie||'')+' | '+String(o.libelle||o.libelle_bancaire||'')+' | id='+String(o.id||'')));
    cfs.forEach((c,i)=>console.log('CF '+(i+1)+' | '+montant(c).toFixed(2)+' EUR | '+String(c.categorie||'')+' | '+String(c.libelle||c.libelle_bancaire||'')+' | id='+String(c.id||'')));
    sortie.push({famille:f.nom,operations:ops.map(o=>({id:String(o.id||''),date:dateIso(o),montant:montant(o),categorie:String(o.categorie||''),libelle:String(o.libelle||o.libelle_bancaire||'')})),chargesFixes:cfs.map(c=>({id:String(c.id||''),montant:montant(c),categorie:String(c.categorie||''),libelle:String(c.libelle||c.libelle_bancaire||'')}))});
  });

  console.log('=== FIN AUDIT DETAILLE CF ABSENTES ===');
  return {ok:true,lectureSeule:true,version:AUDIT_CF_ABSENTES_HET1_20260826_VERSION,sortie};
}
