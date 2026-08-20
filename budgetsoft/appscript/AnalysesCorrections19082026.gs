const ANALYSES_CORRECTIONS_19082026_VERSION = '2.5';

function famillesAnalytiquesAnalyse2026_(categoriesRef){
  const map={};
  (categoriesRef||[]).forEach(c=>{const nom=String(c.nom||'').trim(),fam=String(c.famille_analytique||'').trim();if(nom)map[nom]=fam||nom;});
  map['Gaz']='Énergies';map['Électricité']='Énergies';map['Énergies']='Énergies';
  return map;
}
function familleAnalytiqueAnalyse2026_(nom,map){const n=String(nom||'').trim()||'Sans catégorie';return (map&&map[n])||n;}

function enrichirCoutsNetsAnalyseFinale2026_(resultat, operations, categoriesRef){
  if(!resultat||!resultat.depensesDetail||!resultat.depensesDetail.fenetres)return resultat;
  [3,6,12].forEach(nb=>{
    const fd=resultat.depensesDetail.fenetres[String(nb)]||resultat.depensesDetail.fenetres[nb];if(!fd)return;
    let fops=[];
    try{fops=typeof opsFenetreMetier2026_==='function'?opsFenetreMetier2026_(operations,nb).operations:operations;}catch(e){fops=operations||[];}
    const energieBrute=fops.filter(o=>Number(o.montant||0)<0&&['Énergies','Électricité','Gaz'].includes(String(o.categorie||'').trim())).reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0);
    const remboursementsEnergie=fops.filter(o=>Number(o.montant||0)>0&&String(o.categorie||'').trim()==='Remboursements'&&/TOTAL\s*ENERG|TOTALENERG/i.test(String((o.marchand_normalise||'')+' '+(o.libelle_bancaire||'')+' '+(o.libelle||'')))).reduce((s,o)=>s+Number(o.montant||0),0);
    const coutNet=Math.max(0,energieBrute-remboursementsEnergie);
    fd.energie={brut:energieBrute,remboursements:remboursementsEnergie,coutNet:coutNet};
    if(Array.isArray(fd.themes)){
      const idx=fd.themes.findIndex(x=>/énerg|energ/i.test(String(x.nom||'')));
      const item={nom:'Énergies nettes',montant:coutNet};
      if(idx>=0)fd.themes[idx]=item;else fd.themes.push(item);
    }
  });
  return resultat;
}

/**
 * Version consolidée de l'analyse :
 * - cycles BudgetSoft 28 inclus -> 27 inclus ;
 * - période courante arrêtée à la dernière date bancaire connue ;
 * - catégories de type trésorerie exclues du résultat économique ;
 * - Gaz + Électricité regroupés sous Énergies dans la vue générale ;
 * - remboursements santé neutralisés des revenus et déduits du coût Santé ;
 * - remboursements TotalEnergies déduits du coût net Énergies dans l'analyse détaillée.
 */
function chargerAnalysesBudgetairesV23(nombrePeriodes) {
  const resultat = chargerAnalysesBudgetaires(nombrePeriodes);
  if (!resultat || !Array.isArray(resultat.periodes) || !resultat.periodes.length) return resultat;

  const operationsBrutes = lireTable_('Operations');
  const categoriesRef = lireTable_('Categories');
  const typesCategories = Object.fromEntries(categoriesRef.map(c => [String(c.nom || '').trim(), String(c.type || '').toLowerCase()]));
  const familles=famillesAnalytiquesAnalyse2026_(categoriesRef);
  const estTresorerie = o => typesCategories[String(o.categorie||'').trim()] === 'tresorerie';

  const maintenantReel = new Date();
  const finAujourdHui = bornerDateBancaireFinJour_(maintenantReel) || maintenantReel;
  const operations = operationsBrutes.map(o => {const x=Object.assign({},o);x.date_analyse=x.date_comptable||x.date;return x;});
  const datesConnues = operations.map(o=>new Date(o.date_analyse)).filter(d=>!isNaN(d)&&dateBancaireConnueAuJour_(d,maintenantReel)).sort((a,b)=>b-a);
  const referenceBrute = datesConnues.length ? datesConnues[0] : maintenantReel;
  const reference = debutJourBancaireBudgetSoft_(referenceBrute) || referenceBrute;
  const finReference = bornerDateBancaireFinJour_(reference) || finAujourdHui;

  const courante = resultat.periodes[resultat.periodes.length-1];
  const debutCourant=new Date(courante.debut),finCourant=new Date(courante.fin),borneCourante=finReference<finCourant?finReference:finCourant;
  const mouvementsCourants=operations.filter(o=>{const d=new Date(o.date_analyse);return !isNaN(d)&&d>=debutCourant&&d<=borneCourante;});
  const budgetairesCourants=mouvementsCourants.filter(o=>!estTresorerie(o));
  const revenusCourants=budgetairesCourants.filter(o=>Number(o.montant||0)>0&&typesCategories[String(o.categorie||'').trim()]==='revenu').reduce((s,o)=>s+Number(o.montant||0),0);
  const depensesCourantes=budgetairesCourants.filter(o=>Number(o.montant||0)<0&&typesCategories[String(o.categorie||'').trim()]==='depense').reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0);
  const tresorerieCourante=mouvementsCourants.filter(estTresorerie).reduce((s,o)=>s+Number(o.montant||0),0);

  courante.revenus=revenusCourants;courante.depenses=depensesCourantes;courante.solde=revenusCourants-depensesCourantes;courante.tauxEpargne=revenusCourants>0?Math.round(((revenusCourants-depensesCourantes)/revenusCourants)*1000)/10:0;courante.tresorerie=tresorerieCourante;courante.operations=budgetairesCourants.length;courante.constateJusquAu=reference.toISOString();courante.periodeComplete=borneCourante>=finCourant;resultat.courante=courante;

  const categoriesMap={};
  budgetairesCourants.filter(o=>Number(o.montant||0)<0&&typesCategories[String(o.categorie||'').trim()]==='depense').forEach(o=>{const cat=familleAnalytiqueAnalyse2026_(o.categorie,familles);categoriesMap[cat]=(categoriesMap[cat]||0)+Math.abs(Number(o.montant||0));});
  const totalDepenses=Object.values(categoriesMap).reduce((s,v)=>s+v,0);
  resultat.categories=Object.entries(categoriesMap).map(([nom,montant])=>({nom,montant,part:totalDepenses>0?Math.round((montant/totalDepenses)*1000)/10:0})).sort((a,b)=>b.montant-a.montant);

  const moyenne=cle=>resultat.periodes.length?resultat.periodes.reduce((s,p)=>s+Number(p[cle]||0),0)/resultat.periodes.length:0;
  const precedente=resultat.periodes.length>1?resultat.periodes[resultat.periodes.length-2]:null;
  resultat.indicateurs=Object.assign({},resultat.indicateurs||{},{revenusMoyens:moyenne('revenus'),depensesMoyennes:moyenne('depenses'),epargneMoyenne:moyenne('solde'),tauxEpargneMoyen:moyenne('revenus')>0?Math.round((moyenne('solde')/moyenne('revenus'))*1000)/10:0,evolutionDepenses:precedente&&precedente.depenses>0?Math.round(((courante.depenses-precedente.depenses)/precedente.depenses)*1000)/10:0,mouvementTresorerieMoyen:moyenne('tresorerie')});

  const operationsMetierConstat=operations.filter(o=>{const d=new Date(o.date_analyse);return !isNaN(d)&&d<=finReference;}).map(o=>Object.assign({},o,{date:o.date_analyse}));
  if(typeof alignerAnalysesSurPeriodes2026_==='function'){const alignees=alignerAnalysesSurPeriodes2026_(resultat.recettes,resultat.depensesDetail,operationsMetierConstat,categoriesRef,resultat.periodes);resultat.recettes=alignees.recettes;resultat.depensesDetail=alignees.depensesDetail;}
  if(resultat.depensesDetail&&typeof enrichirAnalyseFinancement2026_==='function')resultat.depensesDetail=enrichirAnalyseFinancement2026_(resultat.depensesDetail,operationsMetierConstat,resultat.periodes);
  enrichirCoutsNetsAnalyseFinale2026_(resultat,operationsMetierConstat,categoriesRef);

  resultat.version=ANALYSES_CORRECTIONS_19082026_VERSION;resultat.dateReference=reference.toISOString();
  resultat.diagnostic=Object.assign({},resultat.diagnostic||{},{periodeAnalyse:'cycle budgétaire 28 inclus -> 27 inclus',periodeCourante:'constatée jusqu’à la dernière date bancaire connue',datesBancairesCompareesAuJourCivil:true,operationsFuturesExclues:true,tresorerieExclueDuResultatEconomique:true,regroupementAnalytique:'Gaz + Électricité → Énergies',coutsNets:'Santé et Énergies'});
  return JSON.parse(JSON.stringify(resultat));
}
