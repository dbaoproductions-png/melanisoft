const MIGRATION_CARREFOUR_BANQUE_AOUT_2026_VERSION='1.0.0';

/**
 * Migration ciblée et idempotente des opérations Carrefour Banque du cycle août 2026.
 * Doctrine utilisateur : la mensualité revolving Carrefour PASS est 168,00 € ;
 * les autres débits Carrefour Banque du cycle sont des courses.
 *
 * Cette fonction modifie UNIQUEMENT la colonne categorie de deux opérations identifiées :
 * - 2026-07-31 : 148,28 € -> Courses
 * - 2026-08-03 : 53,29 € -> Courses
 * Elle ne touche pas au débit de 168,00 € ni aux autres opérations.
 */
function migrerCarrefourBanqueAout2026(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sh=ss.getSheetByName('Operations');
  if(!sh)throw new Error('Feuille Operations introuvable.');
  if(sh.getLastRow()<2)throw new Error('Feuille Operations vide.');

  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(v=>String(v||'').trim());
  const idx={};headers.forEach((h,i)=>idx[h]=i);
  ['categorie','montant'].forEach(h=>{if(idx[h]==null)throw new Error('Colonne Operations manquante : '+h);});

  const dateCols=['date_operation','date','date_comptable','date_banque','date_valeur'].filter(h=>idx[h]!=null);
  const libCols=['libelle','libelle_bancaire','description'].filter(h=>idx[h]!=null);
  if(!dateCols.length)throw new Error('Aucune colonne de date reconnue dans Operations.');
  if(!libCols.length)throw new Error('Aucune colonne de libellé reconnue dans Operations.');

  const vals=sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
  const tz=Session.getScriptTimeZone()||'Europe/Paris';
  const cible={
    '2026-07-31|148.28':true,
    '2026-08-03|53.29':true
  };
  const modifs=[];

  function dateIso_(row){
    for(const h of dateCols){
      const v=row[idx[h]];if(v===''||v==null)continue;
      const d=v instanceof Date?v:new Date(v);if(!isNaN(d.getTime()))return Utilities.formatDate(d,tz,'yyyy-MM-dd');
    }
    return'';
  }
  function libelle_(row){return libCols.map(h=>String(row[idx[h]]||'')).join(' ').toLowerCase();}

  vals.forEach((row,i)=>{
    const d=dateIso_(row),m=Math.abs(Number(row[idx.montant]||0));
    const key=d+'|'+m.toFixed(2);
    if(!cible[key])return;
    if(libelle_(row).indexOf('carrefour banque')<0)return;
    const ancienne=String(row[idx.categorie]||'').trim();
    if(ancienne==='Courses')return;
    modifs.push({row:i+2,date:d,montant:m,ancienne:ancienne,nouvelle:'Courses'});
  });

  if(modifs.length!==2){
    console.log('Migration annulée : attendu 2 opérations, trouvé '+modifs.length+'.');
    console.log(JSON.stringify(modifs));
    throw new Error('Garde-fou : nombre inattendu d\'opérations Carrefour Banque à migrer. Aucune écriture effectuée.');
  }

  modifs.forEach(x=>sh.getRange(x.row,idx.categorie+1).setValue('Courses'));

  console.log('=== MIGRATION CARREFOUR BANQUE AOUT 2026 ===');
  console.log('Version : '+MIGRATION_CARREFOUR_BANQUE_AOUT_2026_VERSION);
  modifs.forEach(x=>console.log(x.date+' | '+x.montant.toFixed(2)+' EUR | '+x.ancienne+' -> Courses'));
  console.log('168,00 EUR : non modifié, reste mensualité revolving.');
  console.log('VERDICT : OK — 2 opérations reclassées, aucune autre ligne touchée.');
  return {ok:true,version:MIGRATION_CARREFOUR_BANQUE_AOUT_2026_VERSION,modifications:modifs};
}
