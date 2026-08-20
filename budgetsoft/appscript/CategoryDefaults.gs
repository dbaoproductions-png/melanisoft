const CATEGORIES_BUDGETSOFT_CIBLES_ = [
  // Dépenses
  {nom:'Logements',type:'depense'},
  {nom:'Courses',type:'depense'},
  {nom:'Transports',type:'depense'},
  {nom:'Santé',type:'depense'},
  {nom:'Loisirs',type:'depense',definition:"Activités de loisir et toutes les dépenses directement nécessaires à leur pratique ou consommation, y compris matériel et équipement : sport, musique, livres, cinéma, VOD, spectacles, clubs, raquettes, recordage, chaussures de sport, etc."},
  {nom:'Restaurants / sorties',type:'depense'},
  {nom:'Voyages / vacances',type:'depense',definition:"Toutes les dépenses directement imputables à un séjour ou week-end de loisir : hébergement, transport, restauration, courses, activités et dépenses sur place."},
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
  {nom:'Énergies',type:'depense'},
  {nom:'Dépenses diverses',type:'depense',definition:"Dépenses utilitaires ou nécessaires et ponctuelles ne relevant d’aucune catégorie fonctionnelle plus précise ; catégorie résiduelle à ne pas utiliser lorsqu’une catégorie métier existe."},

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
  {nom:'Remboursements',type:'tresorerie'},

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
  'transfert de tresorerie':'Virements internes'
};

function cleCategorieBudgetSoft_(valeur){return String(valeur||'').trim().toLowerCase();}
function categorieCibleBudgetSoft_(nom){const brut=String(nom||'').trim();return RENOMMAGES_CATEGORIES_BUDGETSOFT_[cleCategorieBudgetSoft_(brut)]||brut;}
function typeCategorieCibleBudgetSoft_(nom,typeActuel){const cible=CATEGORIES_BUDGETSOFT_CIBLES_.find(c=>cleCategorieBudgetSoft_(c.nom)===cleCategorieBudgetSoft_(nom));return cible?cible.type:String(typeActuel||'').trim();}
function migrerReferencesCategoriesBudgetSoft_(renommages){const ss=SpreadsheetApp.getActiveSpreadsheet();const feuilles=['Operations','Charges_fixes','Correspondances_bancaires','Regles_categories'];let cellulesModifiees=0;feuilles.forEach(nomFeuille=>{const f=ss.getSheetByName(nomFeuille);if(!f||f.getLastRow()<2||f.getLastColumn()<1)return;const entetes=f.getRange(1,1,1,f.getLastColumn()).getValues()[0].map(v=>String(v||'').trim());const index=entetes.indexOf('categorie');if(index<0)return;const plage=f.getRange(2,index+1,f.getLastRow()-1,1);const valeurs=plage.getValues();let change=false;valeurs.forEach(r=>{const avant=String(r[0]||'').trim();if(!avant)return;const apres=renommages[cleCategorieBudgetSoft_(avant)]||avant;if(apres!==avant){r[0]=apres;cellulesModifiees++;change=true;}});if(change)plage.setValues(valeurs);});return cellulesModifiees;}
function installerArchitectureCategoriesBudgetSoft(){
  verifierInitialisation_();
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const feuille=ss.getSheetByName('Categories');
  if(!feuille)throw new Error('Onglet Categories introuvable.');
  let largeur=Math.max(feuille.getLastColumn(),1);
  let entetesActuelles=feuille.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim());
  let idxDefinition=entetesActuelles.indexOf('definition');
  if(idxDefinition<0){idxDefinition=largeur;feuille.getRange(1,idxDefinition+1).setValue('definition');largeur++;entetesActuelles=feuille.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim());}
  const idxId=entetesActuelles.indexOf('id'),idxNom=entetesActuelles.indexOf('nom'),idxType=entetesActuelles.indexOf('type'),idxCouleur=entetesActuelles.indexOf('couleur'),idxActif=entetesActuelles.indexOf('actif');
  const lignes=feuille.getLastRow()>1?feuille.getRange(2,1,feuille.getLastRow()-1,largeur).getValues():[];
  const renommages={};Object.entries(RENOMMAGES_CATEGORIES_BUDGETSOFT_).forEach(([ancien,nouveau])=>renommages[ancien]=nouveau);
  const referencesModifiees=migrerReferencesCategoriesBudgetSoft_(renommages);
  const parNom=new Map();const renommees=[];
  lignes.forEach(r=>{const ancienNom=String(r[idxNom]||'').trim();if(!ancienNom)return;const nouveauNom=categorieCibleBudgetSoft_(ancienNom);if(nouveauNom!==ancienNom)renommees.push({de:ancienNom,vers:nouveauNom});const type=typeCategorieCibleBudgetSoft_(nouveauNom,r[idxType]);const cle=cleCategorieBudgetSoft_(nouveauNom);const existante=parNom.get(cle);const objet={id:r[idxId]||Utilities.getUuid(),nom:nouveauNom,type:type,couleur:r[idxCouleur]||'',actif:r[idxActif]!==false&&String(r[idxActif]).toLowerCase()!=='false',definition:String(r[idxDefinition]||'')};if(!existante){parNom.set(cle,objet);return;}if(!existante.couleur&&objet.couleur)existante.couleur=objet.couleur;existante.actif=existante.actif||objet.actif;if(!existante.type&&objet.type)existante.type=objet.type;if(!existante.definition&&objet.definition)existante.definition=objet.definition;});
  const ajoutees=[];
  CATEGORIES_BUDGETSOFT_CIBLES_.forEach(c=>{const cle=cleCategorieBudgetSoft_(c.nom);if(parNom.has(cle)){const existante=parNom.get(cle);existante.type=c.type;if(c.definition)existante.definition=c.definition;return;}parNom.set(cle,{id:Utilities.getUuid(),nom:c.nom,type:c.type,couleur:'',actif:true,definition:c.definition||''});ajoutees.push(c.nom);});
  const ordre=new Map(CATEGORIES_BUDGETSOFT_CIBLES_.map((c,i)=>[cleCategorieBudgetSoft_(c.nom),i]));
  const finales=[...parNom.values()].sort((a,b)=>{const ia=ordre.has(cleCategorieBudgetSoft_(a.nom))?ordre.get(cleCategorieBudgetSoft_(a.nom)):999;const ib=ordre.has(cleCategorieBudgetSoft_(b.nom))?ordre.get(cleCategorieBudgetSoft_(b.nom)):999;return ia-ib||a.nom.localeCompare(b.nom,'fr');});
  if(feuille.getLastRow()>1)feuille.getRange(2,1,feuille.getLastRow()-1,largeur).clearContent();
  if(finales.length){const sortie=finales.map(c=>{const r=new Array(largeur).fill('');r[idxId]=c.id;r[idxNom]=c.nom;r[idxType]=c.type;r[idxCouleur]=c.couleur;r[idxActif]=c.actif;r[idxDefinition]=c.definition||'';return r;});feuille.getRange(2,1,sortie.length,largeur).setValues(sortie);}
  feuille.setFrozenRows(1);feuille.autoResizeColumns(1,largeur);
  return{ok:true,categories:finales.length,ajoutees,renommees,referencesModifiees,tresorerie:CATEGORIES_BUDGETSOFT_CIBLES_.filter(c=>c.type==='tresorerie').map(c=>c.nom),definitions:CATEGORIES_BUDGETSOFT_CIBLES_.filter(c=>c.definition).map(c=>c.nom)};
}
function installerCategoriesRevenusBudgetSoft(){return installerArchitectureCategoriesBudgetSoft();}
