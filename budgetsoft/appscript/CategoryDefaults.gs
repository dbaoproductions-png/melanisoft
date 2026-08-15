const CATEGORIES_BUDGETSOFT_CIBLES_ = [
  // Dépenses
  {nom:'Logements',type:'depense'},
  {nom:'Courses',type:'depense'},
  {nom:'Transports',type:'depense'},
  {nom:'Santé',type:'depense'},
  {nom:'Loisirs',type:'depense'},
  {nom:'Restaurants / sorties',type:'depense'},
  {nom:'Voyages / vacances',type:'depense'},
  {nom:'Maison / entretien',type:'depense'},
  {nom:'Frais professionnels',type:'depense'},
  {nom:'Crédits',type:'depense'},
  {nom:'Crédits revolving',type:'depense'},
  {nom:'Assurances',type:'depense'},
  {nom:'Télécommunications',type:'depense'},
  {nom:'Abonnements',type:'depense'},
  {nom:'Impôts',type:'depense'},
  {nom:'Animaux',type:'depense'},
  {nom:'Frais bancaires',type:'depense'},
  {nom:'Voitures',type:'depense'},
  {nom:'Achats personnels',type:'depense'},
  {nom:'Énergies',type:'depense'},

  // Revenus
  {nom:'Salaires',type:'revenu'},
  {nom:'France Travail',type:'revenu'},
  {nom:'Cours',type:'revenu'},
  {nom:'Concerts',type:'revenu'},
  {nom:'SACEM',type:'revenu'},
  {nom:'Congés spectacles',type:'revenu'},
  {nom:'Revenus fonciers',type:'revenu'},
  {nom:'Remboursements santé',type:'revenu'},
  {nom:'Prestations / aides',type:'revenu'},
  {nom:'Revenus divers',type:'revenu'},
  {nom:'Autres revenus',type:'revenu'},

  // Mouvements qui modifient la trésorerie mais ne constituent pas un revenu/dépense économique
  {nom:'Crédits de trésorerie',type:'tresorerie'},
  {nom:'Virements internes',type:'tresorerie'},

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
  'bricolage':'Maison / entretien',
  'voiture':'Voitures',
  'énergie':'Énergies',
  'energie':'Énergies',
  'crédit revolving':'Crédits revolving',
  'credit revolving':'Crédits revolving',
  'crédits revolving':'Crédits revolving',
  'credits revolving':'Crédits revolving',
  'crédit de trésorerie':'Crédits de trésorerie',
  'credit de tresorerie':'Crédits de trésorerie',
  'transfert de trésorerie':'Virements internes',
  'transfert de tresorerie':'Virements internes'
};

function cleCategorieBudgetSoft_(valeur){return String(valeur||'').trim().toLowerCase();}
function categorieCibleBudgetSoft_(nom){const brut=String(nom||'').trim();return RENOMMAGES_CATEGORIES_BUDGETSOFT_[cleCategorieBudgetSoft_(brut)]||brut;}
function typeCategorieCibleBudgetSoft_(nom,typeActuel){const cible=CATEGORIES_BUDGETSOFT_CIBLES_.find(c=>cleCategorieBudgetSoft_(c.nom)===cleCategorieBudgetSoft_(nom));return cible?cible.type:String(typeActuel||'').trim();}
function migrerReferencesCategoriesBudgetSoft_(renommages){const ss=SpreadsheetApp.getActiveSpreadsheet();const feuilles=['Operations','Charges_fixes','Correspondances_bancaires','Regles_categories'];let cellulesModifiees=0;feuilles.forEach(nomFeuille=>{const f=ss.getSheetByName(nomFeuille);if(!f||f.getLastRow()<2||f.getLastColumn()<1)return;const entetes=f.getRange(1,1,1,f.getLastColumn()).getValues()[0].map(v=>String(v||'').trim());const index=entetes.indexOf('categorie');if(index<0)return;const plage=f.getRange(2,index+1,f.getLastRow()-1,1);const valeurs=plage.getValues();let change=false;valeurs.forEach(r=>{const avant=String(r[0]||'').trim();if(!avant)return;const apres=renommages[cleCategorieBudgetSoft_(avant)]||avant;if(apres!==avant){r[0]=apres;cellulesModifiees++;change=true;}});if(change)plage.setValues(valeurs);});return cellulesModifiees;}
function installerArchitectureCategoriesBudgetSoft(){verifierInitialisation_();const ss=SpreadsheetApp.getActiveSpreadsheet();const feuille=ss.getSheetByName('Categories');if(!feuille)throw new Error('Onglet Categories introuvable.');const entetes=TABLES.Categories;const lignes=feuille.getLastRow()>1?feuille.getRange(2,1,feuille.getLastRow()-1,entetes.length).getValues():[];const renommages={};Object.entries(RENOMMAGES_CATEGORIES_BUDGETSOFT_).forEach(([ancien,nouveau])=>renommages[ancien]=nouveau);const referencesModifiees=migrerReferencesCategoriesBudgetSoft_(renommages);const parNom=new Map();const renommees=[];lignes.forEach(r=>{const ancienNom=String(r[1]||'').trim();if(!ancienNom)return;const nouveauNom=categorieCibleBudgetSoft_(ancienNom);if(nouveauNom!==ancienNom)renommees.push({de:ancienNom,vers:nouveauNom});const type=typeCategorieCibleBudgetSoft_(nouveauNom,r[2]);const cle=cleCategorieBudgetSoft_(nouveauNom);const existante=parNom.get(cle);const objet={id:r[0]||Utilities.getUuid(),nom:nouveauNom,type,couleur:r[3]||'',actif:r[4]!==false&&String(r[4]).toLowerCase()!=='false'};if(!existante){parNom.set(cle,objet);return;}if(!existante.couleur&&objet.couleur)existante.couleur=objet.couleur;existante.actif=existante.actif||objet.actif;if(!existante.type&&objet.type)existante.type=objet.type;});const ajoutees=[];CATEGORIES_BUDGETSOFT_CIBLES_.forEach(c=>{const cle=cleCategorieBudgetSoft_(c.nom);if(parNom.has(cle)){parNom.get(cle).type=c.type;return;}parNom.set(cle,{id:Utilities.getUuid(),nom:c.nom,type:c.type,couleur:'',actif:true});ajoutees.push(c.nom);});const ordre=new Map(CATEGORIES_BUDGETSOFT_CIBLES_.map((c,i)=>[cleCategorieBudgetSoft_(c.nom),i]));const finales=[...parNom.values()].sort((a,b)=>{const ia=ordre.has(cleCategorieBudgetSoft_(a.nom))?ordre.get(cleCategorieBudgetSoft_(a.nom)):999;const ib=ordre.has(cleCategorieBudgetSoft_(b.nom))?ordre.get(cleCategorieBudgetSoft_(b.nom)):999;return ia-ib||a.nom.localeCompare(b.nom,'fr');});if(feuille.getLastRow()>1)feuille.getRange(2,1,feuille.getLastRow()-1,Math.max(feuille.getLastColumn(),entetes.length)).clearContent();if(finales.length)feuille.getRange(2,1,finales.length,entetes.length).setValues(finales.map(c=>[c.id,c.nom,c.type,c.couleur,c.actif]));feuille.setFrozenRows(1);feuille.autoResizeColumns(1,entetes.length);return{ok:true,categories:finales.length,ajoutees,renommees,referencesModifiees,tresorerie:CATEGORIES_BUDGETSOFT_CIBLES_.filter(c=>c.type==='tresorerie').map(c=>c.nom)};}
function installerCategoriesRevenusBudgetSoft(){return installerArchitectureCategoriesBudgetSoft();}
