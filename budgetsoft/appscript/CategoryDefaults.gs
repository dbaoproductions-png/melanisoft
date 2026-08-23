const CATEGORIES_BUDGETSOFT_CIBLES_ = [
  // Dépenses économiques
  {nom:'Logements',type:'depense'},
  {nom:'Courses',type:'depense'},
  {nom:'Transports',type:'depense'},
  {nom:'Santé',type:'depense'},
  {nom:'Loisirs',type:'depense',definition:"Activités de loisir et dépenses directement nécessaires à leur pratique ou consommation : sport, musique, livres, cinéma, VOD, spectacles, clubs et équipement associé."},
  {nom:'Restaurants',type:'depense'},
  {nom:'Voyages / vacances',type:'depense',definition:"Dépenses directement imputables à un séjour ou week-end de loisir : hébergement, transport, restauration, courses, activités et dépenses sur place."},
  {nom:'Maison / entretien',type:'depense'},
  {nom:'Frais professionnels',type:'depense'},
  {nom:'Crédits',type:'depense'},
  {nom:'Crédits revolving',type:'depense'},
  {nom:'Assurances',type:'depense'},
  {nom:'Télécom / Internet / TV',type:'depense'},
  {nom:'Abonnements numériques',type:'depense'},
  {nom:'Impôts',type:'depense'},
  {nom:'Animaux',type:'depense'},
  {nom:'Frais bancaires',type:'depense'},
  {nom:'Voitures',type:'depense'},
  {nom:'Achats personnels',type:'depense',definition:"Biens discrétionnaires ou achats plaisir personnels ne relevant pas directement d’une activité de loisir : vêtements courants, parfum, électronique personnelle, cosmétique, accessoires, etc."},
  {nom:'Argent de poche',type:'depense',definition:"Sommes versées directement aux enfants pour leurs dépenses personnelles et leur autonomie financière."},
  {nom:'Énergies',type:'depense',definition:"Famille analytique regroupant les dépenses d’électricité et de gaz.",famille_analytique:'Énergies'},
  {nom:'Électricité',type:'depense',definition:"Dépenses d’électricité du foyer.",famille_analytique:'Énergies'},
  {nom:'Gaz',type:'depense',definition:"Dépenses de gaz du foyer.",famille_analytique:'Énergies'},
  {nom:'Dépenses diverses',type:'depense',definition:"Dépenses utilitaires ou nécessaires et ponctuelles ne relevant d’aucune catégorie fonctionnelle plus précise ; catégorie résiduelle à ne pas utiliser lorsqu’une catégorie métier existe."},

  // Revenus économiques
  {nom:'Salaires',type:'revenu'},
  {nom:'France Travail',type:'revenu'},
  {nom:'Cours',type:'revenu'},
  {nom:'Concerts',type:'revenu'},
  {nom:'SACEM',type:'revenu'},
  {nom:'Congés spectacles',type:'revenu'},
  {nom:'Droits artistiques',type:'revenu'},
  {nom:'Avantages employeur',type:'revenu',definition:"Avantages, participations et aides liés à l’employeur ou au statut professionnel, hors salaire."},
  {nom:'Revenus fonciers',type:'revenu'},
  {nom:'Prestations / aides',type:'revenu'},
  {nom:'Revenus divers',type:'revenu'},
  {nom:'Autres revenus',type:'revenu'},

  // Mouvements de trésorerie : ils affectent le solde bancaire mais jamais le résultat économique.
  {nom:'Crédits de trésorerie',type:'tresorerie',definition:"Apports de trésorerie issus d’un financement ou d’espèces réinjectées sur le compte ; exclus des revenus économiques."},
  {nom:'Virements internes',type:'tresorerie',definition:"Transferts entre comptes du foyer ; exclus des revenus et dépenses économiques."},
  {nom:'Remboursements',type:'tresorerie',definition:"Remboursements et régularisations qui ne constituent pas un revenu économique ; conservés comme mouvements de trésorerie."},
  {nom:'Remboursements santé',type:'tresorerie',definition:"Remboursements CPAM, mutuelles et soins ; exclus des revenus économiques et déduits du coût brut Santé dans l’analyse."},

  // Épargne
  {nom:'Épargne',type:'epargne'}
];

const RENOMMAGES_CATEGORIES_BUDGETSOFT_ = {
  'logement':'Logements',
  'transport':'Transports',
  'revenus':'Autres revenus',
  'banque':'Frais bancaires',
  'frais bancaires':'Frais bancaires',
  'salaire':'Salaires',
  'divers':'Revenus divers',
  'dépense diverse':'Dépenses diverses',
  'depense diverse':'Dépenses diverses',
  'dépenses diverses':'Dépenses diverses',
  'depenses diverses':'Dépenses diverses',
  'bricolage':'Maison / entretien',
  'voiture':'Voitures',
  'énergie':'Énergies',
  'energie':'Énergies',
  'restaurants / sorties':'Restaurants',
  'restaurant / sorties':'Restaurants',
  'restaurant':'Restaurants',
  'abonnement':'Abonnements numériques',
  'abonnements':'Abonnements numériques',
  'abonnement numérique':'Abonnements numériques',
  'abonnement numerique':'Abonnements numériques',
  'abonnements numériques':'Abonnements numériques',
  'abonnements numeriques':'Abonnements numériques',
  'télécommunications':'Télécom / Internet / TV',
  'telecommunications':'Télécom / Internet / TV',
  'télécom':'Télécom / Internet / TV',
  'telecom':'Télécom / Internet / TV',
  'internet / tv':'Télécom / Internet / TV',
  'crédit revolving':'Crédits revolving',
  'credit revolving':'Crédits revolving',
  'crédits revolving':'Crédits revolving',
  'credits revolving':'Crédits revolving',
  'crédit de trésorerie':'Crédits de trésorerie',
  'credit de tresorerie':'Crédits de trésorerie',
  'transfert de trésorerie':'Virements internes',
  'transfert de tresorerie':'Virements internes',
  'remboursement santé':'Remboursements santé',
  'remboursement sante':'Remboursements santé'
};

function cleCategorieBudgetSoft_(valeur){return String(valeur||'').trim().toLowerCase();}
function categorieCibleBudgetSoft_(nom){const brut=String(nom||'').trim();return RENOMMAGES_CATEGORIES_BUDGETSOFT_[cleCategorieBudgetSoft_(brut)]||brut;}
function definitionCategorieCibleBudgetSoft_(nom){const cible=CATEGORIES_BUDGETSOFT_CIBLES_.find(c=>cleCategorieBudgetSoft_(c.nom)===cleCategorieBudgetSoft_(nom));return cible?String(cible.definition||''):'';}
function familleCategorieCibleBudgetSoft_(nom){const cible=CATEGORIES_BUDGETSOFT_CIBLES_.find(c=>cleCategorieBudgetSoft_(c.nom)===cleCategorieBudgetSoft_(nom));return cible?String(cible.famille_analytique||''):'';}
function typeCategorieCibleBudgetSoft_(nom,typeActuel){const cible=CATEGORIES_BUDGETSOFT_CIBLES_.find(c=>cleCategorieBudgetSoft_(c.nom)===cleCategorieBudgetSoft_(nom));return cible?cible.type:String(typeActuel||'').trim().toLowerCase();}

function migrerReferencesCategoriesBudgetSoft_(renommages){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const specifications=[
    ['Operations','categorie'],['Charges_fixes','categorie'],['Correspondances_bancaires','categorie'],['Regles_categories','categorie'],
    ['Budget','poste'],['Corrections_a_valider','categorie_actuelle'],['Corrections_a_valider','categorie_proposee']
  ];
  let cellulesModifiees=0;
  specifications.forEach(([nomFeuille,nomColonne])=>{
    const f=ss.getSheetByName(nomFeuille);if(!f||f.getLastRow()<2||f.getLastColumn()<1)return;
    const entetes=f.getRange(1,1,1,f.getLastColumn()).getValues()[0].map(v=>String(v||'').trim());
    const index=entetes.indexOf(nomColonne);if(index<0)return;
    const plage=f.getRange(2,index+1,f.getLastRow()-1,1),valeurs=plage.getValues();let change=false;
    valeurs.forEach(r=>{const avant=String(r[0]||'').trim();if(!avant)return;const apres=renommages[cleCategorieBudgetSoft_(avant)]||avant;if(apres!==avant){r[0]=apres;cellulesModifiees++;change=true;}});
    if(change)plage.setValues(valeurs);
  });
  return cellulesModifiees;
}

function installerArchitectureCategoriesBudgetSoft(){
  verifierInitialisation_();
  const ss=SpreadsheetApp.getActiveSpreadsheet(),feuille=ss.getSheetByName('Categories');
  if(!feuille)throw new Error('Onglet Categories introuvable.');
  const entetesAttendues=TABLES.Categories;
  let largeur=Math.max(feuille.getLastColumn(),1),entetes=feuille.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim());
  entetesAttendues.filter(e=>!entetes.includes(e)).forEach(e=>{largeur++;feuille.getRange(1,largeur).setValue(e);});
  largeur=Math.max(feuille.getLastColumn(),largeur);entetes=feuille.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim());
  const idxId=entetes.indexOf('id'),idxNom=entetes.indexOf('nom'),idxType=entetes.indexOf('type'),idxCouleur=entetes.indexOf('couleur'),idxActif=entetes.indexOf('actif'),idxDefinition=entetes.indexOf('definition'),idxFamille=entetes.indexOf('famille_analytique');
  if([idxId,idxNom,idxType,idxActif,idxDefinition,idxFamille].some(i=>i<0))throw new Error('Schéma Categories incomplet.');

  const renommages=Object.assign({},RENOMMAGES_CATEGORIES_BUDGETSOFT_),referencesModifiees=migrerReferencesCategoriesBudgetSoft_(renommages);
  const lignes=feuille.getLastRow()>1?feuille.getRange(2,1,feuille.getLastRow()-1,largeur).getValues():[],parNom=new Map(),renommees=[];
  lignes.forEach(r=>{
    const ancien=String(r[idxNom]||'').trim();if(!ancien)return;
    const nom=categorieCibleBudgetSoft_(ancien);if(nom!==ancien)renommees.push({de:ancien,vers:nom});
    const cle=cleCategorieBudgetSoft_(nom),objet={id:r[idxId]||Utilities.getUuid(),nom,type:typeCategorieCibleBudgetSoft_(nom,r[idxType]),couleur:idxCouleur>=0?r[idxCouleur]||'':'',actif:true,definition:String(r[idxDefinition]||''),famille_analytique:String(r[idxFamille]||'')};
    if(!parNom.has(cle)){parNom.set(cle,objet);return;}
    const ex=parNom.get(cle);if(!ex.couleur&&objet.couleur)ex.couleur=objet.couleur;if(!ex.definition&&objet.definition)ex.definition=objet.definition;if(!ex.famille_analytique&&objet.famille_analytique)ex.famille_analytique=objet.famille_analytique;
  });

  const ajoutees=[];
  CATEGORIES_BUDGETSOFT_CIBLES_.forEach(c=>{
    const cle=cleCategorieBudgetSoft_(c.nom),ex=parNom.get(cle);
    if(ex){ex.nom=c.nom;ex.type=c.type;ex.actif=true;if(c.definition)ex.definition=c.definition;if(c.famille_analytique)ex.famille_analytique=c.famille_analytique;else ex.famille_analytique='';return;}
    parNom.set(cle,{id:Utilities.getUuid(),nom:c.nom,type:c.type,couleur:'',actif:true,definition:c.definition||'',famille_analytique:c.famille_analytique||''});ajoutees.push(c.nom);
  });

  // À ce stade, le référentiel stabilisé est autoritaire : les anciennes catégories fusionnées
  // ou expérimentales ne sont pas réécrites dans la feuille.
  const cibles=new Set(CATEGORIES_BUDGETSOFT_CIBLES_.map(c=>cleCategorieBudgetSoft_(c.nom)));
  const finales=[...parNom.values()].filter(c=>cibles.has(cleCategorieBudgetSoft_(c.nom)));
  const ordre=new Map(CATEGORIES_BUDGETSOFT_CIBLES_.map((c,i)=>[cleCategorieBudgetSoft_(c.nom),i]));
  finales.sort((a,b)=>(ordre.get(cleCategorieBudgetSoft_(a.nom))??999)-(ordre.get(cleCategorieBudgetSoft_(b.nom))??999)||a.nom.localeCompare(b.nom,'fr'));

  if(feuille.getLastRow()>1)feuille.getRange(2,1,feuille.getLastRow()-1,largeur).clearContent();
  if(finales.length){const sortie=finales.map(c=>{const r=new Array(largeur).fill('');r[idxId]=c.id;r[idxNom]=c.nom;r[idxType]=c.type;if(idxCouleur>=0)r[idxCouleur]=c.couleur;r[idxActif]=true;r[idxDefinition]=c.definition||'';r[idxFamille]=c.famille_analytique||'';return r;});feuille.getRange(2,1,sortie.length,largeur).setValues(sortie);}
  feuille.setFrozenRows(1);feuille.autoResizeColumns(1,largeur);
  return{ok:true,version:'2026-08-20-final',categories:finales.length,ajoutees,renommees,referencesModifiees,tresorerie:CATEGORIES_BUDGETSOFT_CIBLES_.filter(c=>c.type==='tresorerie').map(c=>c.nom),definitions:CATEGORIES_BUDGETSOFT_CIBLES_.filter(c=>c.definition).map(c=>c.nom),familles:CATEGORIES_BUDGETSOFT_CIBLES_.filter(c=>c.famille_analytique).map(c=>({nom:c.nom,famille:c.famille_analytique}))};
}
function installerCategoriesRevenusBudgetSoft(){return installerArchitectureCategoriesBudgetSoft();}
