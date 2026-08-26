const MIGRATION_NETTOYAGE_HET1_20260826_VERSION='1.0.0';

/**
 * Migration ciblée des reclassements métier déjà décidés.
 * - Carrefour Banque 148,28 + 53,29 -> Courses
 * - Virement à Lou 20,00 -> Divers
 * - Tabac 2,70 + La Poste 3,10 + Tolosan 12,90 -> Divers
 *
 * Ne crée ni ne modifie aucune charge fixe.
 * Les CF probables sont auditées séparément avant toute persistance.
 */
function migrerClassementsHEt1Decides20260826(){
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');
  if(!sh)throw new Error('Feuille Operations introuvable.');
  const lastRow=sh.getLastRow(),lastCol=sh.getLastColumn();
  if(lastRow<2)throw new Error('Feuille Operations vide.');
  const headers=sh.getRange(1,1,1,lastCol).getValues()[0].map(v=>String(v||'').trim());
  const idx={};headers.forEach((h,i)=>idx[h]=i);
  ['categorie','montant'].forEach(h=>{if(idx[h]==null)throw new Error('Colonne Operations manquante : '+h);});
  const dateCols=['date_comptable','date','date_operation','date_banque','date_valeur'].filter(h=>idx[h]!=null);
  const libCols=['libelle','libelle_bancaire','description'].filter(h=>idx[h]!=null);
  if(!dateCols.length||!libCols.length)throw new Error('Colonnes date/libellé insuffisantes.');
  const vals=sh.getRange(2,1,lastRow-1,lastCol).getValues(),tz=Session.getScriptTimeZone()||'Europe/Paris';
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const iso=row=>{for(const h of dateCols){const v=row[idx[h]];if(v===''||v==null)continue;const d=v instanceof Date?v:new Date(v);if(!isNaN(d.getTime()))return Utilities.formatDate(d,tz,'yyyy-MM-dd');}return'';};
  const lib=row=>norm(libCols.map(h=>row[idx[h]]).join(' '));
  const cibles=[
    {date:'2026-07-31',montant:148.28,contient:'carrefour banque',categorie:'Courses'},
    {date:'2026-08-03',montant:53.29,contient:'carrefour banque',categorie:'Courses'},
    {date:'2026-08-20',montant:20.00,contient:'virement a lou',categorie:'Divers'},
    {date:'2026-08-31',montant:2.70,contient:'tabac le midivi',categorie:'Divers',dateAchat:'2026-08-12'},
    {date:'2026-08-31',montant:3.10,contient:'laposte l314460',categorie:'Divers',dateAchat:'2026-08-14'},
    {date:'2026-08-31',montant:12.90,contient:'tolosan',categorie:'Divers',dateAchat:'2026-08-12'}
  ];
  const dateAchatIdx=idx.date_achat;
  const trouves=[];
  cibles.forEach(c=>{
    const matches=[];
    vals.forEach((row,i)=>{
      const d=iso(row),m=Math.abs(Number(row[idx.montant]||0)),t=lib(row);
      if(d!==c.date||Math.abs(m-c.montant)>.011||t.indexOf(c.contient)<0)return;
      if(c.dateAchat&&dateAchatIdx!=null){const v=row[dateAchatIdx],dd=v instanceof Date?v:new Date(v);const ai=!isNaN(dd.getTime())?Utilities.formatDate(dd,tz,'yyyy-MM-dd'):'';if(ai!==c.dateAchat)return;}
      matches.push({row:i+2,ancienne:String(row[idx.categorie]||'').trim(),cible:c});
    });
    if(matches.length!==1)throw new Error('Garde-fou : '+c.date+' '+c.montant.toFixed(2)+' '+c.contient+' -> '+matches.length+' correspondance(s). Aucune écriture.');
    trouves.push(matches[0]);
  });
  const aModifier=trouves.filter(x=>x.ancienne!==x.cible.categorie);
  aModifier.forEach(x=>sh.getRange(x.row,idx.categorie+1).setValue(x.cible.categorie));
  console.log('=== MIGRATION CLASSEMENTS HEt1 DECIDES ===');
  console.log('Version : '+MIGRATION_NETTOYAGE_HET1_20260826_VERSION);
  trouves.forEach(x=>console.log(x.cible.date+' | '+x.cible.montant.toFixed(2)+' EUR | '+x.ancienne+' -> '+x.cible.categorie+(x.ancienne===x.cible.categorie?' (déjà conforme)':'')));
  console.log('Lignes modifiées : '+aModifier.length+' / '+trouves.length);
  console.log('VERDICT : OK — uniquement les classements décidés ont été touchés.');
  return {ok:true,version:MIGRATION_NETTOYAGE_HET1_20260826_VERSION,modifications:aModifier.length,lignes:trouves};
}

/**
 * Audit lecture seule des CF probables restantes. Cherche des candidats uniques dans Charges_fixes
 * sans créer ni modifier de CF et sans toucher Operations.
 */
function auditerCandidatsCfHEt1Decides20260826(){
  const operations=Array.isArray(lireTable_('Operations'))?lireTable_('Operations'):[];
  const charges=Array.isArray(lireTable_('Charges_fixes'))?lireTable_('Charges_fixes'):[];
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const dateIso=o=>{const v=o&&(o.date_comptable||o.date||o.date_operation||o.date_banque||o.date_valeur);if(!v)return'';const d=v instanceof Date?v:new Date(v);return isNaN(d.getTime())?'':Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');};
  const lib=o=>norm([o&&o.libelle,o&&o.libelle_bancaire,o&&o.description].filter(Boolean).join(' '));
  const specs=[
    {nom:'Carrefour PASS mensualité',date:'2026-08-05',montant:168,op:'carrefour banque',cat:'credits revolving'},
    {nom:'Avanssur 12,90',date:'2026-07-29',montant:12.90,op:'avanssur',cat:'assurances'},
    {nom:'Avanssur 20,84',date:'2026-07-29',montant:20.84,op:'avanssur',cat:'assurances'},
    {nom:'Avanssur 21,90',date:'2026-07-29',montant:21.90,op:'avanssur',cat:'assurances'},
    {nom:'Google CB 2,99',date:'2026-07-31',montant:2.99,op:'google',cat:'abonnements numeriques'},
    {nom:'Google One 1,99 #1',date:'2026-07-31',montant:1.99,op:'google one',cat:'abonnements numeriques'},
    {nom:'Amazon Digital 3,99',date:'2026-07-31',montant:3.99,op:'amazon digital',cat:'abonnements numeriques'},
    {nom:'Google One CB 1,99 septembre',date:'2026-08-31',montant:1.99,op:'google one',cat:'abonnements numeriques'}
  ];
  console.log('=== AUDIT CANDIDATS CF HEt1 DECIDES ===');
  console.log('Mode : LECTURE SEULE');
  const resultats=[];
  specs.forEach(s=>{
    const ops=operations.filter(o=>dateIso(o)===s.date&&Math.abs(Math.abs(Number(o&&o.montant||0))-s.montant)<.011&&lib(o).indexOf(s.op)>=0);
    let candidats=[];
    if(ops.length===1&&typeof reconnaitreChargeFixeCommune_==='function'){
      const r=reconnaitreChargeFixeCommune_(ops[0],charges,typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[]);
      if(r&&r.charge_fixe_id)candidats=[{id:r.charge_fixe_id,libelle:String(r.charge&&r.charge.libelle||''),source:r.source,score:r.score}];
    }
    if(!candidats.length){
      candidats=charges.filter(c=>{
        const cm=Math.abs(Number(c&&c.montant||0)),ct=norm([c&&c.libelle,c&&c.libelle_bancaire,c&&c.categorie].filter(Boolean).join(' '));
        return Math.abs(cm-s.montant)<.011&&(ct.indexOf(s.op)>=0||ct.indexOf(s.cat)>=0);
      }).map(c=>({id:String(c&&c.id||''),libelle:String(c&&c.libelle||c&&c.libelle_bancaire||''),source:'montant+texte',score:null}));
    }
    const statut=ops.length!==1?'OPERATION_NON_UNIQUE':candidats.length===1?'CANDIDAT_UNIQUE':candidats.length===0?'AUCUN_CANDIDAT':'PLUSIEURS_CANDIDATS';
    console.log(s.nom+' | op='+ops.length+' | candidats='+candidats.length+' | '+statut+' | '+JSON.stringify(candidats));
    resultats.push({spec:s,operations:ops.length,candidats,statut});
  });
  console.log('=== FIN AUDIT CANDIDATS CF ===');
  return {ok:true,lectureSeule:true,version:MIGRATION_NETTOYAGE_HET1_20260826_VERSION,resultats};
}
