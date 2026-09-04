const ANALYSES_CORRECTIONS_19082026_VERSION = '2.6';

function famillesAnalytiquesAnalyse2026_(categoriesRef){
  const map={};
  (categoriesRef||[]).forEach(c=>{const nom=String(c.nom||'').trim(),fam=String(c.famille_analytique||'').trim();if(nom)map[nom]=fam||nom;});
  map['Gaz']='Énergies';map['Électricité']='Énergies';map['Énergies']='Énergies';
  return map;
}
function familleAnalytiqueAnalyse2026_(nom,map){const n=String(nom||'').trim()||'Sans catégorie';return (map&&map[n])||n;}
function actifAnalyse20260904_(v){if(typeof convertirBooleen_==='function')return convertirBooleen_(v);if(v===false||v===0||v===null||v===undefined)return false;const s=String(v).trim().toLowerCase();return !['0','false','non','no','inactif','inactive'].includes(s);}
function dateAnalyse20260904_(v){const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d)?null:d;}
function texteAnalyse20260904_(o){if(typeof texteMetier2026_==='function')return texteMetier2026_(o);return String([o&&o.marchand_normalise||'',o&&o.libelle_bancaire||'',o&&o.libelle||''].join(' ')).toUpperCase();}
function montantMensuelChargeAnalyse20260904_(c){const m=Math.abs(Number(c&&c.montant||0)),f=String(c&&c.frequence||'Mensuelle').toLowerCase();if(f.indexOf('ann')>=0)return m/12;if(f.indexOf('trim')>=0)return m/3;if(f.indexOf('sem')>=0)return m*52/12;if(f.indexOf('hebdo')>=0)return m*52/12;if(f.indexOf('bimes')>=0)return m/2;if(f.indexOf('semes')>=0)return m/6;return m;}
function periodeAnalyseDecalee20260904_(debutCourant,recul){const d=new Date(debutCourant.getFullYear(),debutCourant.getMonth()-recul,jourDebutCycleBudgetSoft_(),12,0,0,0);return calculerPeriodeBudgetaireCanonique_(d);}
function estTresorerieAnalyse20260904_(o,types){const cat=String(o&&o.categorie||'').trim();return String(o&&o.type||'').toLowerCase()==='tresorerie'||String(types&&types[cat]||'').toLowerCase()==='tresorerie'||cat==='Crédits de trésorerie'||cat==='Virements internes';}
function estRevenuEconomiqueAnalyse20260904_(cat,type){if(typeof estCategorieRevenuEconomique2026_==='function')return estCategorieRevenuEconomique2026_(cat,type);return String(type||'').toLowerCase()==='revenu'&&String(cat||'').trim()!=='Remboursements santé';}
function producteurAnalyse20260904_(cat){return typeof producteurRevenu2026_==='function'?producteurRevenu2026_(cat):(cat==='Salaires'?'Patrick':cat==='Revenus fonciers'?'Foyer':'Madame');}
function structurelAnalyse20260904_(cat){return typeof estRevenuStructurel2026_==='function'?estRevenuStructurel2026_(cat):['Salaires','France Travail','Cours','Concerts','Congés spectacles','SACEM','Droits artistiques','Revenus fonciers'].includes(cat);}
function variableAnalyse20260904_(cat){return typeof estRevenuVariable2026_==='function'?estRevenuVariable2026_(cat):['France Travail','Cours','Concerts','Congés spectacles','SACEM','Droits artistiques','Revenus divers','Autres revenus','Avantages employeur'].includes(cat);}

/**
 * Moteur Analyses consolidé 2.6.
 * Une seule passe de lecture et une seule construction analytique par requête UI.
 * Doctrine : cycles 28 inclus -> 27 inclus ; fenêtre courante arrêtée à la dernière
 * date bancaire connue ; Pluxee séparé de la trésorerie mais intégré aux dépenses
 * de consommation détaillées ; flux de trésorerie exclus du résultat économique.
 */
function chargerAnalysesBudgetairesV23(nombrePeriodes){
  verifierInitialisation_();
  const t0=Date.now();
  const nbDemande=parseInt(nombrePeriodes,10),nb=[3,6,12].includes(nbDemande)?nbDemande:6;
  const operationsBrutes=lireTable_('Operations')||[];
  const budgets=lireTable_('Budget')||[];
  const parametres=lireTable_('Parametres')||[];
  const categoriesRef=lireTable_('Categories')||[];
  const chargesFixes=lireTable_('Charges_fixes')||[];
  let pluxeeOps=[];try{pluxeeOps=typeof lirePluxee_==='function'?lirePluxee_():[];}catch(e){pluxeeOps=[];}
  const tLecture=Date.now();

  const types=Object.fromEntries(categoriesRef.map(c=>[String(c.nom||'').trim(),String(c.type||'').toLowerCase()]));
  const familles=famillesAnalytiquesAnalyse2026_(categoriesRef);
  const params=Object.fromEntries(parametres.map(p=>[String(p.cle||''),p.valeur]));
  const maintenant=new Date();
  const finAujourdhui=bornerDateBancaireFinJour_(maintenant)||maintenant;
  const operations=operationsBrutes.map(o=>{const x=Object.assign({},o);x.date_analyse=x.date_comptable||x.date;return x;});
  const datesConnues=operations.map(o=>dateAnalyse20260904_(o.date_analyse)).filter(d=>d&&dateBancaireConnueAuJour_(d,maintenant)).sort((a,b)=>b-a);
  const referenceBrute=datesConnues.length?datesConnues[0]:maintenant;
  const reference=debutJourBancaireBudgetSoft_(referenceBrute)||referenceBrute;
  const finReference=bornerDateBancaireFinJour_(reference)||finAujourdhui;
  const periodeCouranteCanon=calculerPeriodeBudgetaireCanonique_(reference);
  const debutCourant=new Date(periodeCouranteCanon.debut);

  const periodes=[];
  for(let recul=nb-1;recul>=0;recul--){
    const p=periodeAnalyseDecalee20260904_(debutCourant,recul),debut=new Date(p.debut),fin=new Date(p.fin),borne=fin<finReference?fin:finReference;
    let revenus=0,depenses=0,tresorerie=0,nOps=0;
    operations.forEach(o=>{
      const d=dateAnalyse20260904_(o.date_analyse);if(!d||d<debut||d>borne)return;
      const m=Number(o.montant||0),cat=String(o.categorie||'').trim(),typeCat=types[cat]||'';
      if(estTresorerieAnalyse20260904_(o,types)){tresorerie+=m;return;}
      if(m>0&&estRevenuEconomiqueAnalyse20260904_(cat,typeCat)){revenus+=m;nOps++;return;}
      if(m<0&&typeCat==='depense'){depenses+=Math.abs(m);nOps++;}
    });
    periodes.push({cle:p.cle,libelle:p.libelle,debut:p.debut,fin:p.fin,revenus,depenses,solde:revenus-depenses,tauxEpargne:revenus>0?Math.round(((revenus-depenses)/revenus)*1000)/10:0,tresorerie,operations:nOps,constateJusquAu:(borne<fin?reference:null),periodeComplete:borne>=fin});
  }

  const courante=periodes[periodes.length-1];
  const debutFenetre=new Date(periodes[0].debut),finFenetre=new Date(periodes[periodes.length-1].fin),borneFenetre=finFenetre<finReference?finFenetre:finReference;
  const opsFenetre=operations.filter(o=>{const d=dateAnalyse20260904_(o.date_analyse);return d&&d>=debutFenetre&&d<=borneFenetre;});
  const opsCourantes=operations.filter(o=>{const d=dateAnalyse20260904_(o.date_analyse);return d&&d>=new Date(courante.debut)&&d<=borneFenetre;});

  const categoriesMap={};
  opsCourantes.forEach(o=>{const m=Number(o.montant||0),cat=String(o.categorie||'').trim();if(m>=0||types[cat]!=='depense'||estTresorerieAnalyse20260904_(o,types))return;const fam=familleAnalytiqueAnalyse2026_(cat,familles);categoriesMap[fam]=(categoriesMap[fam]||0)+Math.abs(m);});
  const totalDepenses=Object.values(categoriesMap).reduce((s,v)=>s+v,0);
  const categories=Object.entries(categoriesMap).map(([nom,montant])=>({nom,montant,part:totalDepenses>0?Math.round((montant/totalDepenses)*1000)/10:0})).sort((a,b)=>b.montant-a.montant);

  const budgetCourant=budgets.filter(b=>String(b.mois)===String(courante.cle)&&String(b.type).toLowerCase()==='depense'&&types[String(b.poste||'').trim()]!=='tresorerie');
  const alertes=budgetCourant.map(b=>{const poste=String(b.poste||'').trim(),reel=poste==='Énergies'?(categoriesMap['Énergies']||0):(categoriesMap[familleAnalytiqueAnalyse2026_(poste,familles)]||0),prevu=Number(b.prevu||0);return{poste,prevu,reel,ecart:prevu-reel,taux:prevu>0?Math.round(reel/prevu*100):0};}).filter(a=>a.prevu>0&&a.reel>a.prevu).sort((a,b)=>a.ecart-b.ecart);

  let revenusEconomiques=0,revenusStructurels=0,revenusVariables=0,creditsTresorerie=0;
  const producteurs={Patrick:0,Madame:0,Foyer:0},sources={},periodesSauvetage=new Set();
  const depParCat={},depOps=[];let rembSante=0,rembEnergie=0;
  opsFenetre.forEach(o=>{
    const m=Number(o.montant||0),cat=String(o.categorie||'').trim(),typeCat=types[cat]||'';
    if(m>0&&cat==='Crédits de trésorerie'){
      creditsTresorerie+=m;
      const d=dateAnalyse20260904_(o.date_analyse),idx=periodes.findIndex(p=>d>=new Date(p.debut)&&d<=new Date(p.fin));if(idx>=0)periodesSauvetage.add(idx);
      return;
    }
    if(m>0&&cat==='Remboursements santé'){rembSante+=m;return;}
    if(m>0&&cat==='Remboursements'&&/TOTAL\s*ENERG|TOTALENERG/i.test(texteAnalyse20260904_(o))){rembEnergie+=m;return;}
    if(m>0&&estRevenuEconomiqueAnalyse20260904_(cat,typeCat)){
      revenusEconomiques+=m;if(structurelAnalyse20260904_(cat))revenusStructurels+=m;if(variableAnalyse20260904_(cat))revenusVariables+=m;
      const prod=producteurAnalyse20260904_(cat);producteurs[prod]=(producteurs[prod]||0)+m;sources[cat||'Autres']=(sources[cat||'Autres']||0)+m;return;
    }
    if(m<0&&typeCat==='depense'&&!estTresorerieAnalyse20260904_(o,types)){const v=Math.abs(m);depParCat[cat]=(depParCat[cat]||0)+v;depOps.push(o);}
  });

  const dernierSalaire=operations.filter(o=>Number(o.montant||0)>0&&String(o.categorie||'').trim()==='Salaires'&&dateAnalyse20260904_(o.date_analyse)<=finReference).sort((a,b)=>dateAnalyse20260904_(b.date_analyse)-dateAnalyse20260904_(a.date_analyse))[0];
  const recettes={version:'2026-09-04.1',fenetres:{},references:{salairePatrick:dernierSalaire?Number(dernierSalaire.montant||0):0,loyerAppartement:Number(params.loyer_reference_mensuel||750),garage:Number(params.garage_reference_mensuel||30),pluxeeMensuel:Number(params.pluxee_montant_mensuel||154),pluxeeMoisCarence:Number(params.pluxee_mois_carence||5),moisPrimesSalaire:String(params.salaire_mois_primes||'6,11,12')}};
  recettes.fenetres[nb]={mois:nb,debut:debutFenetre,fin:borneFenetre,revenusEconomiques,moyenneMensuelle:revenusEconomiques/nb,revenusStructurels,revenusVariables,partVariable:revenusEconomiques>0?revenusVariables/revenusEconomiques*100:0,producteurs,sources:Object.entries(sources).map(([nom,montant])=>({nom,montant})).sort((a,b)=>b.montant-a.montant),remboursementsProfessionnelsNeutralises:0,creditsTresorerie,moisAvecSauvetage:periodesSauvetage.size,dependanceCredit:revenusEconomiques>0?creditsTresorerie/revenusEconomiques*100:0,alignementPeriodes:'2026-09-04.1'};

  const pluxeeValides=pluxeeOps.filter(o=>String(o.statut||'valide').toLowerCase()!=='refuse'&&Number(o.montant||0)<0).filter(o=>{const d=dateAnalyse20260904_(o.date);return d&&d>=debutFenetre&&d<=borneFenetre;});
  let pluxeeCourses=0,pluxeeRestaurants=0,pluxeeAClasser=0;
  pluxeeValides.forEach(o=>{const v=Math.abs(Number(o.montant||0)),c=String(o.categorie||'').trim();if(c==='Courses')pluxeeCourses+=v;else if(c==='Restaurants')pluxeeRestaurants+=v;else pluxeeAClasser+=v;});
  const coursesBanque=Number(depParCat['Courses']||0),restaurantsBanque=Number(depParCat['Restaurants']||0);
  const santeOps=depOps.filter(o=>String(o.categorie||'').trim()==='Santé'),santeBrute=santeOps.reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0),couverture=santeOps.filter(o=>/MNT|AUDIENS/.test(texteAnalyse20260904_(o))).reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0);
  const montantCat=cat=>Number(depParCat[cat]||0);
  const energieBrute=montantCat('Énergies')+montantCat('Électricité')+montantCat('Gaz'),energieNette=Math.max(0,energieBrute-rembEnergie);
  const sortiesFinancement=montantCat('Crédits')+montantCat('Crédits revolving');
  const ratioCapital=typeof ANALYSE_FINANCEMENT_RATIO_CAPITAL!=='undefined'?Number(ANALYSE_FINANCEMENT_RATIO_CAPITAL):0.6688142827;
  const capitalRembourseEstime=sortiesFinancement*ratioCapital,coutFinancementEstime=Math.max(0,sortiesFinancement-capitalRembourseEstime),desendettementNetEstime=capitalRembourseEstime-creditsTresorerie;
  const themes={
    'Crédits / financement':sortiesFinancement,
    'Alimentation / quotidien':coursesBanque+pluxeeCourses+montantCat('Dépenses diverses'),
    'Loisirs / consommation':montantCat('Loisirs')+restaurantsBanque+pluxeeRestaurants+montantCat('Voyages / vacances')+montantCat('Achats personnels'),
    'Santé nette':Math.max(0,santeBrute-rembSante),
    'Impôts':montantCat('Impôts'),
    'Logement':montantCat('Logements'),
    'Abonnements / numérique':montantCat('Télécom / Internet / TV')+montantCat('Abonnements numériques'),
    'Frais professionnels':montantCat('Frais professionnels'),
    'Transport':montantCat('Transports')+montantCat('Voitures'),
    'Assurances':montantCat('Assurances'),
    'Énergies nettes':energieNette
  };
  const themesListe=Object.entries(themes).map(([nom,montant])=>({nom,montant})).sort((a,b)=>b.montant-a.montant),idxFin=themesListe.findIndex(x=>x.nom==='Crédits / financement');
  const ajoutsFin=[{nom:'Capital remboursé estimé',montant:capitalRembourseEstime},{nom:'Réinjections de crédit',montant:creditsTresorerie},{nom:'Désendettement net estimé',montant:desendettementNetEstime}];
  if(idxFin>=0)themesListe.splice(idxFin+1,0,...ajoutsFin);else themesListe.unshift({nom:'Crédits / financement',montant:sortiesFinancement},...ajoutsFin);

  const fixesActives=chargesFixes.filter(c=>actifAnalyse20260904_(c.actif));
  const depensesDetail={version:'2026-09-04.1',fenetres:{},fixes:{montantMensuelReference:fixesActives.reduce((s,c)=>s+montantMensuelChargeAnalyse20260904_(c),0),nombre:fixesActives.length,couvertureSanteActuelle:0},financement:{version:'2026-09-04.1',estimation:true,calibration:{ratioCapital}},nomenclature:{dimensions:['catégorie','thème','fixe/variable','contraint/arbitrable','brut/net'],note:'Analyse consolidée sur les cycles BudgetSoft.'}};
  const dernierMontant=motif=>{const l=operations.filter(o=>Number(o.montant||0)<0&&motif.test(texteAnalyse20260904_(o))&&dateAnalyse20260904_(o.date_analyse)<=finReference).sort((a,b)=>dateAnalyse20260904_(b.date_analyse)-dateAnalyse20260904_(a.date_analyse));return l.length?Math.abs(Number(l[0].montant||0)):0;};
  depensesDetail.fixes.couvertureSanteActuelle=dernierMontant(/MNT/)+dernierMontant(/AUDIENS/);
  depensesDetail.fenetres[nb]={mois:nb,debut:debutFenetre,fin:borneFenetre,alimentation:{coursesBanque,restaurantsBanque,pluxeeCourses,pluxeeRestaurants,pluxeeTotal:pluxeeCourses+pluxeeRestaurants,pluxeeMode:'observé dans le registre Pluxee',pluxeeAClasser,coursesReelles:coursesBanque+pluxeeCourses,restaurantsReels:restaurantsBanque+pluxeeRestaurants,totalReel:coursesBanque+restaurantsBanque+pluxeeCourses+pluxeeRestaurants},sante:{soinsEtCouvertureBruts:santeBrute,couvertureMntAudiens:couverture,soinsBruts:Math.max(0,santeBrute-couverture),remboursements:rembSante,coutNet:Math.max(0,santeBrute-rembSante)},energie:{brut:energieBrute,remboursements:rembEnergie,coutNet:energieNette},financement:{version:'2026-09-04.1',debut:debutFenetre,fin:borneFenetre,sortiesFinancement,capitalRembourseEstime,coutFinancementEstime,reinjectionsTresorerie:creditsTresorerie,desendettementNetEstime,ratioCapitalEstime:ratioCapital,estimation:true,methode:'Fenêtre alignée sur les cycles affichés ; part de capital conservée comme estimation faute de ventilation historique capital/intérêts fiable.'},themes:themesListe,alignementPeriodes:'2026-09-04.1'};

  const moyenne=cle=>periodes.length?periodes.reduce((s,p)=>s+Number(p[cle]||0),0)/periodes.length:0,precedente=periodes.length>1?periodes[periodes.length-2]:null;
  const indicateurs={revenusMoyens:moyenne('revenus'),depensesMoyennes:moyenne('depenses'),epargneMoyenne:moyenne('solde'),tauxEpargneMoyen:moyenne('revenus')>0?Math.round((moyenne('solde')/moyenne('revenus'))*1000)/10:0,evolutionDepenses:precedente&&precedente.depenses>0?Math.round(((courante.depenses-precedente.depenses)/precedente.depenses)*1000)/10:0,mouvementTresorerieMoyen:moyenne('tresorerie')};

  const resultat={version:ANALYSES_CORRECTIONS_19082026_VERSION,periodes,courante,categories,alertes,recettes,depensesDetail,indicateurs,dateReference:reference.toISOString(),diagnostic:{sourceOperations:'Operations',dateFlux:'date_comptable puis date',periodeAnalyse:'cycle budgétaire 28 inclus -> 27 inclus',periodeCourante:'cycle contenant la dernière date bancaire connue',datesBancairesCompareesAuJourCivil:true,operationsFuturesExclues:true,tresorerieExclueDuResultatEconomique:true,pluxee:'registre réel séparé de la banque ; Courses/Restaurants intégrés à la consommation détaillée',pluxeeAClasser,chargesFixesActives:fixesActives.length,regroupementAnalytique:'Gaz + Électricité → Énergies',coutsNets:'Santé et Énergies',financement:'capital remboursé encore estimé',dettesHorsCredit:'encours exclu des dépenses ; seuls les paiements réels apparaissent via leur catégorie'},performance:{lectureMs:tLecture-t0,calculMs:Date.now()-tLecture,totalMs:Date.now()-t0,lecturesPrincipales:6,ancienMoteurRelance:false}};
  return JSON.parse(JSON.stringify(resultat));
}

/** Compatibilité : ancien enrichisseur conservé pour les appels externes éventuels. */
function enrichirCoutsNetsAnalyseFinale2026_(resultat){return resultat;}
