/**
 * BudgetSoft — détail en lecture seule des opérations bancaires sans catégorie
 * et des dépenses Pluxee non réparties entre Courses et Restaurants.
 *
 * Aucune classification automatique, aucune mutation du classeur/snapshot.
 * Les libellés et IDs sont produits seulement au moment de l'exécution
 * dans le journal privé Apps Script ; aucune donnée de l'utilisateur dans Git.
 */
const BUDGETSOFT_DETAIL_CATEGORISATION_AUDIT_20261108_VERSION='2026-11-08.1';

function auditerOperationsSansCategorieEtPluxee20261108(){
  const arr=function(n){return Math.round((Number(n)+Number.EPSILON)*100)/100;};
  const dt=function(s){
    const d=s instanceof Date?new Date(s.getTime()):new Date(s||'');
    return Number.isFinite(d.getTime())?d:null;
  };
  const jour=function(s){
    const d=dt(s);return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';
  };
  const texte=function(s){return String(s==null?'':s).trim().slice(0,220);};
  const rawOps=lireTable_('Operations')||[];
  const rawPluxee=typeof lirePluxee_==='function'?(lirePluxee_()||[]):[];
  if(!Array.isArray(rawOps)||!Array.isArray(rawPluxee))throw new Error('Tables Operations ou Pluxee illisibles.');
  const analyses3=chargerAnalysesBudgetairesV23(3);
  const analyses6=chargerAnalysesBudgetairesV23(6);
  const analyses12=chargerAnalysesBudgetairesV23(12);
  const analyses={3:analyses3,6:analyses6,12:analyses12};
  const sourceSnapshot=String(analyses3&&analyses3.sourceBudgetSoft||'');
  const revision=String(analyses3&&analyses3.revisionBudgetSoft||'');
  if(!revision||sourceSnapshot!=='snapshot_global'||[analyses6,analyses12].some(function(v){
    return !v||v.sourceBudgetSoft!=='snapshot_global'||v.revisionBudgetSoft!==revision;
  }))throw new Error('Snapshot Analyses indisponible, périmé ou différent entre les horizons.');

  const fenetres={};
  [3,6,12].forEach(function(n){
    const a=analyses[n],f=a&&a.depensesDetail&&a.depensesDetail.fenetres&&
      a.depensesDetail.fenetres[String(n)];
    const debut=dt(f&&f.debut),fin=dt(f&&f.fin);
    if(!debut||!fin||debut>fin)throw new Error('Bornes Pluxee introuvables pour '+n+' cycles.');
    fenetres[String(n)]={debut:debut,fin:fin,debutTexte:jour(debut),finTexte:jour(fin)};
  });

  // Reprendre le critère de l'audit exhaustif pour disposer exactement des
  // mêmes opérations bancaires que les 18 signalées : non nul et catégorie vide.
  const bancaires=rawOps.filter(function(o){
    return Number(o&&o.montant||0)!==0&&!String(o&&o.categorie||'').trim();
  }).map(function(o){
    const montant=arr(Number(o.montant||0));
    return {
      id:texte(o.id),date:jour(o.date_comptable||o.date),
      dateComptable:jour(o.date_comptable),dateOperation:jour(o.date),
      libelle:texte(o.libelle_bancaire||o.libelle||o.marchand_normalise||o.details),
      montant, sens:montant<0?'depense':montant>0?'entree':'zero',
      type:texte(o.type),compte:texte(o.compte),
      origine:texte(o.source||o.origine||''),
      note:'Catégorie à décider après vérification du mouvement réel (transfert, remboursement, revenu ou dépense).'
    };
  }).sort(function(a,b){return b.date.localeCompare(a.date)||a.montant-b.montant;});

  // Respecter exactement l'exclusion des lignes refusées utilisée par Analyses.
  const pluxeeNonClassees=rawPluxee.filter(function(o){
    const cat=String(o&&o.categorie||'').trim();
    return Number(o&&o.montant||0)<0&&
      String(o&&o.statut||'valide').toLowerCase()!=='refuse'&&
      cat!=='Courses'&&cat!=='Restaurants';
  }).map(function(o){
    return {id:texte(o.id),date:jour(o.date),libelle:texte(o.libelle),
      montant:arr(Math.abs(Number(o.montant))),categorieActuelle:texte(o.categorie),
      statut:texte(o.statut||'valide'),source:texte(o.source),
      decision:'Courses ou Restaurants (à vérifier sur la transaction)'};
  }).sort(function(a,b){return b.date.localeCompare(a.date)||a.montant-b.montant;});

  const recapBancaire={
    nombre:bancaires.length,
    entrees:bancaires.filter(function(x){return x.montant>0;}).length,
    depenses:bancaires.filter(function(x){return x.montant<0;}).length,
    montantEntrees:arr(bancaires.filter(x=>x.montant>0).reduce(function(s,x){return s+x.montant;},0)),
    montantDepenses:arr(bancaires.filter(x=>x.montant<0).reduce(function(s,x){return s+Math.abs(x.montant);},0)),
    attention:'Les montants positifs/négatifs ne doivent pas être automatiquement traités comme revenus/dépenses.'
  };
  const recapPluxee={
    nombreToutesDates:pluxeeNonClassees.length,
    montantToutesDates:arr(pluxeeNonClassees.reduce(function(s,x){return s+x.montant;},0)),
    fenetres:{}
  };
  [3,6,12].forEach(function(n){
    const f=fenetres[String(n)],lignes=pluxeeNonClassees.filter(function(o){
      const d=dt(o.date);return d&&d>=f.debut&&d<=f.fin;
    });
    recapPluxee.fenetres[String(n)]={
      debut:f.debutTexte,fin:f.finTexte,nombre:lignes.length,
      montant:arr(lignes.reduce(function(s,x){return s+x.montant;},0)),
      ids:lignes.map(function(x){return x.id;})
    };
  });
  const indexUnique=new Set(pluxeeNonClassees.map(function(x){return x.id;}));
  const anomalies=[];
  if(indexUnique.size!==pluxeeNonClassees.length)
    anomalies.push('IDs répétés parmi les dépenses Pluxee non classées : vérifier les doublons.');
  const attendu3=Number(analyses3&&analyses3.depensesDetail&&
    analyses3.depensesDetail.fenetres&&analyses3.depensesDetail.fenetres['3']&&
    analyses3.depensesDetail.fenetres['3'].alimentation&&
    analyses3.depensesDetail.fenetres['3'].alimentation.pluxeeAClasser||0);
  const montant3=recapPluxee.fenetres['3'].montant;
  if(attendu3>0&&Math.abs(attendu3-montant3)>.02)
    anomalies.push('La valeur Pluxee à classer affichée sur 3 cycles diffère du détail : contrôle de périmètre requis.');

  const r={
    ok:anomalies.length===0,lectureSeule:true,
    version:BUDGETSOFT_DETAIL_CATEGORISATION_AUDIT_20261108_VERSION,
    revisionBudgetSoft:revision,
    sources:{operations:rawOps.length,pluxee:rawPluxee.length},
    bancaires:{...recapBancaire,lignes:bancaires},
    pluxee:{...recapPluxee,lignes:pluxeeNonClassees},
    anomalies,
    aucuneModification:true,
    consigne:'Choisir les catégories individuellement après vérification. Pour Pluxee, utiliser Courses ou Restaurants ; ne pas importer une seconde fois les dépenses Pluxee dans Operations.'
  };
  console.log('[AUDIT DETAIL CATEGORISATION BUDGETSOFT 20261108] '+JSON.stringify(r));
  return r;
}
