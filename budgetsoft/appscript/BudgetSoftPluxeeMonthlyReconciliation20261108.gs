/**
 * Diagnostic en lecture seule : rapprocher le registre Pluxee du relevé
 * de l'application couvrant le 28/03/2026 au 31/10/2026.
 * Les références mensuelles réelles restent dans la conversation utilisateur,
 * et ne sont pas incorporées à ce fichier GitHub.
 * Ne modifie ni les catégories, ni le solde initial, ni le snapshot.
 */
const BUDGETSOFT_PLUXEE_MONTHLY_RECON_20261108_VERSION='2026-11-08.1';

function auditerRapprochementMensuelPluxee20261108(){
  const debut='2026-03-28',fin='2026-10-31';
  const tz=Session.getScriptTimeZone();
  const jour=function(v){
    if(v==null||v==='')return'';
    const d=v instanceof Date?new Date(v.getTime()):new Date(v);
    return Number.isFinite(d.getTime())?Utilities.formatDate(d,tz,'yyyy-MM-dd'):'';
  };
  const euros=function(v){return Math.round((Number(v)||0)*100)/100;};
  const arr=function(v){return euros(v);};
  const operations=typeof lirePluxee_==='function'?lirePluxee_():null;
  if(!Array.isArray(operations))throw new Error('Registre Pluxee inaccessible en lecture seule.');
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss.getSheetByName('Pluxee'))throw new Error('La feuille Pluxee n’existe pas ; audit interrompu sans création.');
  const properties=PropertiesService.getDocumentProperties();
  const soldeInitial=Number(properties.getProperty('PLUXEE_SOLDE_INITIAL')||
    (typeof PLUXEE_SOLDE_INITIAL_DEFAUT!=='undefined'?PLUXEE_SOLDE_INITIAL_DEFAUT:0));
  const dateReference=String(properties.getProperty('PLUXEE_DATE_REFERENCE')||
    (typeof PLUXEE_DATE_REFERENCE_DEFAUT!=='undefined'?PLUXEE_DATE_REFERENCE_DEFAUT:''));
  if(!Number.isFinite(soldeInitial))throw new Error('Solde initial invalide.');
  const lignes=operations.map(function(o){
    return{
      id:String(o&&o.id||''),date:jour(o&&o.date),montant:Number(o&&o.montant),
      type:String(o&&o.type||''),statut:String(o&&o.statut||'valide').trim().toLowerCase(),
      libelle:String(o&&o.libelle||'')
    };
  });
  const invalides=lignes.filter(function(o){return !o.date||!Number.isFinite(o.montant)});
  const refuses=lignes.filter(function(o){return o.statut==='refuse'});
  const inclus=lignes.filter(function(o){
    return o.statut!=='refuse'&&o.date&&Number.isFinite(o.montant);
  });
  const avant=inclus.filter(function(o){return o.date<debut});
  const pendant=inclus.filter(function(o){return o.date>=debut&&o.date<=fin});
  const apres=inclus.filter(function(o){return o.date>fin});
  const total=function(xs){return arr(xs.reduce(function(s,o){return s+o.montant},0));};
  const compteur=function(xs){
    return{nombre:xs.length,rechargements:xs.filter(function(o){return o.montant>0}).length,
      totalRechargements:total(xs.filter(function(o){return o.montant>0})),
      nombreDepenses:xs.filter(function(o){return o.montant<0}).length,
      totalDepenses:arr(-total(xs.filter(function(o){return o.montant<0}))),
      net:total(xs)};
  };
  const soldeOuverture=arr(soldeInitial+total(avant));
  let courant=soldeOuverture;
  const mois=[];
  for(let m=3;m<=10;m++){
    const ym='2026-'+String(m).padStart(2,'0');
    const d=pendant.filter(function(o){return o.date.slice(0,7)===ym});
    const stats=compteur(d);
    courant=arr(courant+stats.net);
    mois.push({mois:ym,...stats,soldeFin: courant});
  }
  const soldeFinOctobre=arr(soldeOuverture+total(pendant));
  const soldeCalcule=arr(soldeFinOctobre+total(apres));
  const dupliqueIds=()=>{
    const ids=lignes.map(function(o){return o.id}).filter(Boolean);
    return ids.length-new Set(ids).size;
  };
  // Lire l'état affiché par le même calcul source pour prouver la cohérence
  // interne : aucun appel à initialiserPluxee ou opération d'écriture.
  const etat=typeof chargerPluxeeSource20260918_==='function'
    ?chargerPluxeeSource20260918_():null;
  const autresLignesAvantReference=inclus.filter(function(o){return dateReference&&o.date<dateReference}).length;
  const report={
    ok:invalides.length===0&&dupliqueIds()===0&&
      (!etat||Math.abs(Number(etat.solde)-soldeCalcule)<.011),
    lectureSeule:true,version:BUDGETSOFT_PLUXEE_MONTHLY_RECON_20261108_VERSION,
    borne:{debut,fin,fuseau:tz},
    source:{totalRegistre:lignes.length,statutsRefuses:refuses.length,
      invalides:invalides.length,identifiantsDoublons:dupliqueIds(),
      mouvementsAvantDateInitiale:autresLignesAvantReference},
    soldeInitial:arr(soldeInitial),dateReference,
    avant28Mars:{...compteur(avant),soldeOuverture27Mars:soldeOuverture},
    mois,
    au31Octobre:{...compteur(pendant),soldeFin:soldeFinOctobre},
    apres31Octobre:{...compteur(apres),soldeActuelCalcule:soldeCalcule},
    compteBudgetSoft:{solde:etat?Number(etat.solde):null,
      netMouvements:etat?Number(etat.netMouvements):null,
      nombreOperations:etat?Number(etat.nombreOperations):null},
    ecartInterne:etat?arr(soldeCalcule-Number(etat.solde)):null,
    consigne:'Comparer avec les relevés de l’application : aucune correction du solde initial tant que les écarts mensuels ne sont pas identifiés.'
  };
  console.log('[AUDIT PLUXEE MENSUEL BUDGETSOFT 20261108] '+JSON.stringify(report));
  return report;
}
