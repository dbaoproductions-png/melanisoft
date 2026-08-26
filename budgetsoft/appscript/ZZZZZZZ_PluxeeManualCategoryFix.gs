const PLUXEE_MANUAL_CATEGORY_FIX_VERSION='1.0.1';

/** Une catégorie explicitement choisie dans Pluxee est autoritaire. */
function normaliserOperationPluxee_(o){
  const d=dateHeurePluxee_(o.date),lib=nettoyerLibellePluxee_(o.libelle),m=Number(o.montant||0);
  if(!d||isNaN(d.getTime()))throw new Error('Date Pluxee invalide.');
  if(!lib)throw new Error('Libellé Pluxee manquant.');
  if(!Number.isFinite(m)||Math.abs(m)<.001)throw new Error('Montant Pluxee invalide.');
  const type=m>0?'rechargement':'depense';
  const explicite=String(o.categorie||'').trim();
  let cat='';
  if(type==='depense')cat=['Courses','Restaurants'].includes(explicite)?explicite:categoriePluxee_(Object.assign({},o,{libelle:lib,montant:-Math.abs(m)}));
  const iso=Utilities.formatDate(d,Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss");
  const cle=clePluxee_(iso,lib,m,type);
  return {id:o.id||Utilities.getUuid(),date:iso,libelle:lib,montant:arrondirPluxee_(type==='depense'?-Math.abs(m):Math.abs(m)),type,categorie:cat,source:String(o.source||'import'),cle_rapprochement:cle,statut:'valide',date_import:new Date().toISOString()};
}
