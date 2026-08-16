const BUDGETSOFT_VERSION = '0.8-lab';

const TABLES = {
  Parametres: ['cle', 'valeur'],
  Comptes: ['id', 'nom', 'type', 'solde_initial', 'actif'],
  Operations: [
    'id', 'date', 'libelle', 'categorie', 'compte', 'montant', 'type', 'commentaire', 'cree_le', 'modifie_le',
    'source_bancaire', 'date_comptable', 'date_achat', 'libelle_bancaire', 'marchand_normalise',
    'carte_fin', 'cle_rapprochement', 'statut_bancaire', 'charge_fixe_id'
  ],
  Charges_fixes: [
    'id', 'libelle', 'categorie', 'compte', 'montant', 'type', 'jour_execution', 'date_debut', 'date_fin', 'actif',
    'commentaire', 'frequence', 'libelle_bancaire', 'tolerance', 'nature',
    'dernier_rapprochement_id', 'dernier_rapprochement_date', 'dernier_montant_reel', 'statut_rapprochement'
  ],
  Budget: ['id', 'mois', 'type', 'poste', 'prevu', 'reel'],
  Actifs: ['id', 'nom', 'type', 'valeur', 'date_valeur'],
  Dettes: ['id', 'nom', 'capital_restant', 'mensualite', 'taux', 'date_fin'],
  Credits: ['id', 'nom', 'capital_restant', 'mensualite', 'taux', 'date_debut', 'date_fin', 'numero_pret', 'prochaine_echeance', 'echeances_restantes', 'commentaire'],
  Objectifs: ['id', 'nom', 'montant_cible', 'montant_actuel', 'date_cible', 'statut'],
  Categories: ['id', 'nom', 'type', 'couleur', 'actif']
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('BudgetSoft')
    .addItem('Initialiser / mettre à jour','initialiserBudgetSoft')
    .addItem('Vérifier la configuration','verifierConfiguration')
    .addToUi();
}
function doGet(){return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('BudgetSoft').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function inclure(nomFichier){return HtmlService.createHtmlOutputFromFile(nomFichier).getContent();}
function initialiserBudgetSoft(){const ss=SpreadsheetApp.getActiveSpreadsheet();Object.entries(TABLES).forEach(([nom,entetes])=>{let feuille=ss.getSheetByName(nom);if(!feuille)feuille=ss.insertSheet(nom);if(feuille.getLastRow()===0)feuille.getRange(1,1,1,entetes.length).setValues([entetes]);else{const largeur=Math.max(feuille.getLastColumn(),1),presentes=feuille.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim()),manquantes=entetes.filter(e=>!presentes.includes(e));if(manquantes.length)feuille.getRange(1,largeur+1,1,manquantes.length).setValues([manquantes]);}feuille.setFrozenRows(1);feuille.getRange(1,1,1,entetes.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff');feuille.autoResizeColumns(1,entetes.length);});ajouterDonneesInitiales_();mettreAJourVersion_();PropertiesService.getDocumentProperties().setProperty('BUDGETSOFT_INITIALISE','true');SpreadsheetApp.getUi().alert('BudgetSoft est initialisé et à jour (version '+BUDGETSOFT_VERSION+').');}
function verifierConfiguration(){const ss=SpreadsheetApp.getActiveSpreadsheet(),manquantes=Object.keys(TABLES).filter(n=>!ss.getSheetByName(n)),colonnesManquantes=[];Object.entries(TABLES).forEach(([nom,entetes])=>{const f=ss.getSheetByName(nom);if(!f||f.getLastRow()===0)return;const largeur=Math.max(f.getLastColumn(),1),presentes=f.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim());entetes.filter(e=>!presentes.includes(e)).forEach(e=>colonnesManquantes.push(nom+'.'+e));});let message='Configuration valide. BudgetSoft est prêt.';if(manquantes.length)message='Onglets manquants : '+manquantes.join(', ');else if(colonnesManquantes.length)message='Colonnes manquantes : '+colonnesManquantes.join(', ');SpreadsheetApp.getUi().alert(message);return{ok:!manquantes.length&&!colonnesManquantes.length,manquantes,colonnesManquantes};}

/**
 * Lecture pure : les Charges_fixes sont un référentiel prévisionnel.
 * Elles ne créent jamais de ligne dans Operations.
 */
function chargerToutesLesDonnees(){
  verifierInitialisation_();
  const resultat={};
  Object.keys(TABLES).forEach(n=>resultat[n]=lireTable_(n));
  resultat.meta={version:BUDGETSOFT_VERSION,chargeLe:new Date().toISOString(),generation:{creees:0,ignorees:0,erreurs:[],mode:'charges_non_materialisees'}};
  return resultat;
}

function lireTable(nom){verifierNomTable_(nom);verifierInitialisation_();return lireTable_(nom);}
function enregistrerLigne(nom,ligne){verifierNomTable_(nom);verifierInitialisation_();if(!ligne||typeof ligne!=='object')throw new Error('Donnée invalide.');const feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom),entetes=TABLES[nom],maintenant=new Date().toISOString(),copie=Object.assign({},ligne);if(nom==='Comptes'){copie.nom=String(copie.nom||'').trim();if(!copie.nom)throw new Error('Le nom du compte est obligatoire.');copie.type=String(copie.type||'courant').trim();copie.solde_initial=convertirNombre_(copie.solde_initial);copie.actif=convertirBooleen_(copie.actif);}if(nom==='Operations')normaliserOperation_(copie);if(nom==='Charges_fixes')normaliserChargeFixe_(copie);if(entetes.includes('id')&&!copie.id)copie.id=Utilities.getUuid();if(entetes.includes('cree_le')&&!copie.cree_le)copie.cree_le=maintenant;if(entetes.includes('modifie_le'))copie.modifie_le=maintenant;const verrou=LockService.getDocumentLock();verrou.waitLock(10000);try{const idIndex=entetes.indexOf('id');let ligneCible=-1;if(idIndex>=0&&copie.id&&feuille.getLastRow()>1){const ids=feuille.getRange(2,idIndex+1,feuille.getLastRow()-1,1).getValues().flat(),position=ids.findIndex(id=>String(id)===String(copie.id));if(position>=0)ligneCible=position+2;}const valeurs=entetes.map(cle=>normaliserValeur_(copie[cle]));if(ligneCible>0)feuille.getRange(ligneCible,1,1,entetes.length).setValues([valeurs]);else feuille.appendRow(valeurs);}finally{verrou.releaseLock();}return copie;}
function normaliserChargeFixe_(copie){copie.libelle=String(copie.libelle||'').trim();copie.compte=String(copie.compte||'').trim();copie.categorie=String(copie.categorie||'').trim();copie.type=String(copie.type||'depense').toLowerCase();copie.montant=Math.abs(convertirNombre_(copie.montant));copie.jour_execution=Math.max(1,Math.min(31,parseInt(copie.jour_execution,10)||1));copie.date_debut=copie.date_debut?dateLocaleBudgetSoft_(copie.date_debut):new Date();copie.date_fin=copie.date_fin?dateLocaleBudgetSoft_(copie.date_fin):'';copie.actif=convertirBooleen_(copie.actif);copie.frequence=normaliserFrequence_(copie.frequence);copie.libelle_bancaire=String(copie.libelle_bancaire||'').trim();copie.tolerance=copie.tolerance===''||copie.tolerance==null?0.50:Math.abs(convertirNombre_(copie.tolerance));copie.nature=String(copie.nature||'Autre').trim();copie.statut_rapprochement=String(copie.statut_rapprochement||'À rapprocher');if(!copie.libelle||!copie.compte)throw new Error('Le libellé et le compte sont obligatoires.');if(!copie.libelle_bancaire)throw new Error('Le libellé bancaire est obligatoire.');if(isNaN(copie.date_debut.getTime()))throw new Error('La date de début est invalide.');if(copie.date_fin instanceof Date&&isNaN(copie.date_fin.getTime()))throw new Error('La date de fin est invalide.');if(copie.date_fin instanceof Date&&copie.date_fin<copie.date_debut)throw new Error('La date de fin doit être postérieure à la date de début.');}

/**
 * Compatibilité historique : cette fonction est volontairement neutralisée.
 * Une charge fixe n'est jamais une opération réelle.
 */
function genererChargesFixes(){return{creees:0,ignorees:0,erreurs:[],desactive:true,message:'Les charges fixes sont prévisionnelles et doivent être rapprochées des opérations bancaires réelles.'};}
function calculerEcheancesJusqua_(charge,debut,fin,limite){if(limite<debut)return[];const borne=fin&&fin<limite?fin:limite,frequence=normaliserFrequence_(charge.frequence),jour=Number(charge.jour_execution)||debut.getDate(),resultats=[];let curseur;if(frequence==='Quotidienne'){curseur=new Date(debut);while(curseur<=borne){resultats.push(new Date(curseur));curseur.setDate(curseur.getDate()+1);}return resultats;}if(frequence==='Hebdomadaire'){curseur=new Date(debut);while(curseur<=borne){resultats.push(new Date(curseur));curseur.setDate(curseur.getDate()+7);}return resultats;}const pasMois={Mensuelle:1,Trimestrielle:3,Semestrielle:6,Annuelle:12}[frequence]||1;curseur=creerDateMensuelle_(debut.getFullYear(),debut.getMonth(),jour);if(curseur<debut)curseur=creerDateMensuelle_(debut.getFullYear(),debut.getMonth()+pasMois,jour);while(curseur<=borne){resultats.push(new Date(curseur));curseur=creerDateMensuelle_(curseur.getFullYear(),curseur.getMonth()+pasMois,jour);}return resultats;}
function creerDateMensuelle_(annee,mois,jour){const premier=new Date(annee,mois,1),dernierJour=new Date(premier.getFullYear(),premier.getMonth()+1,0).getDate();return new Date(premier.getFullYear(),premier.getMonth(),Math.min(Math.max(1,jour),dernierJour),12);}
function normaliserFrequence_(valeur){const texte=String(valeur||'Mensuelle').trim().toLowerCase(),c={quotidienne:'Quotidienne',quotidien:'Quotidienne',hebdomadaire:'Hebdomadaire',hebdo:'Hebdomadaire',mensuelle:'Mensuelle',mensuel:'Mensuelle',trimestrielle:'Trimestrielle',trimestriel:'Trimestrielle',semestrielle:'Semestrielle',semestriel:'Semestrielle',annuelle:'Annuelle',annuel:'Annuelle'};return c[texte]||'Mensuelle';}
function cleRecurrence_(id,date){return String(id)+':'+Utilities.formatDate(date,Session.getScriptTimeZone(),'yyyy-MM-dd');}
function extraireMarqueur_(commentaire){const match=String(commentaire||'').match(/\[RECURRENCE:([^\]]+)\]/);return match?match[1]:'';}
function debutJour_(date){return new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);}
function finJour_(date){return new Date(date.getFullYear(),date.getMonth(),date.getDate(),23,59,59,999);}
function supprimerLigne(nom,id){verifierNomTable_(nom);verifierInitialisation_();const entetes=TABLES[nom],idIndex=entetes.indexOf('id');if(idIndex<0)throw new Error('Cette table ne comporte pas d’identifiant.');const feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);if(feuille.getLastRow()<2)return false;const ids=feuille.getRange(2,idIndex+1,feuille.getLastRow()-1,1).getValues().flat(),position=ids.findIndex(v=>String(v)===String(id));if(position<0)return false;feuille.deleteRow(position+2);return true;}
function lireTable_(nom){const feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);if(!feuille||feuille.getLastRow()<2)return[];const entetes=TABLES[nom],valeurs=feuille.getRange(2,1,feuille.getLastRow()-1,entetes.length).getValues();return valeurs.filter(l=>l.some(v=>v!==''&&v!==null)).map(l=>Object.fromEntries(entetes.map((cle,i)=>[cle,serialiserValeur_(l[i])])));}
function normaliserOperation_(copie){copie.libelle=String(copie.libelle||copie.libelle_bancaire||'').trim();copie.compte=String(copie.compte||'').trim();copie.categorie=String(copie.categorie||'').trim();copie.type=String(copie.type||'depense').toLowerCase();copie.date=dateLocaleBudgetSoft_(copie.date||copie.date_comptable||new Date());if(!copie.libelle)throw new Error('Le libellé est obligatoire.');if(!copie.compte)throw new Error('Le compte est obligatoire.');if(isNaN(copie.date.getTime()))throw new Error('La date est invalide.');const montant=Math.abs(convertirNombre_(copie.montant));copie.montant=copie.type==='depense'?-montant:montant;if(copie.date_comptable)copie.date_comptable=formatDateLocaleBudgetSoft_(dateLocaleBudgetSoft_(copie.date_comptable));if(copie.date_achat)copie.date_achat=formatDateLocaleBudgetSoft_(dateLocaleBudgetSoft_(copie.date_achat));copie.source_bancaire=String(copie.source_bancaire||'');copie.libelle_bancaire=String(copie.libelle_bancaire||'').trim();copie.marchand_normalise=String(copie.marchand_normalise||'').trim();copie.carte_fin=String(copie.carte_fin||'').trim();copie.cle_rapprochement=String(copie.cle_rapprochement||'').trim();copie.statut_bancaire=String(copie.statut_bancaire||'').trim();copie.charge_fixe_id=String(copie.charge_fixe_id||'').trim();}

function dateLocaleBudgetSoft_(valeur){
  if(valeur instanceof Date)return new Date(valeur.getFullYear(),valeur.getMonth(),valeur.getDate(),12);
  const s=String(valeur||'').trim();
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
  m=s.match(/^(\d{2})[.\/]([0-1]\d)[.\/](\d{4})$/);if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12);
  const d=new Date(valeur);return isNaN(d)?d:new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);
}
function formatDateLocaleBudgetSoft_(date){return Utilities.formatDate(dateLocaleBudgetSoft_(date),Session.getScriptTimeZone(),'yyyy-MM-dd');}

function ajouterDonneesInitiales_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(),categories=ss.getSheetByName('Categories');
  if(categories.getLastRow()>1){
    const valeurs=categories.getRange(2,1,categories.getLastRow()-1,TABLES.Categories.length).getValues();
    let banqueExiste=valeurs.some(r=>String(r[1]||'').trim().toLowerCase()==='banque');
    for(let i=valeurs.length-1;i>=0;i--){if(String(valeurs[i][1]||'').trim().toLowerCase()==='banque'){if(banqueExiste){categories.deleteRow(i+2);banqueExiste=false;}}}
  }
}
function mettreAJourVersion_(){const ss=SpreadsheetApp.getActiveSpreadsheet();let f=ss.getSheetByName('Parametres');if(!f)return;const lignes=lireTable_('Parametres');const existant=lignes.find(x=>String(x.cle)==='version');if(existant)enregistrerLigne('Parametres',{cle:'version',valeur:BUDGETSOFT_VERSION});else f.appendRow(['version',BUDGETSOFT_VERSION]);}
function convertirNombre_(v){if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(String(v??'').replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:0;}
function convertirBooleen_(v){return v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0'&&String(v).toLowerCase()!=='non';}
function serialiserValeur_(v){if(v instanceof Date)return v.toISOString();return v;}
function normaliserValeur_(v){return v instanceof Date?v:v==null?'':v;}
function verifierNomTable_(nom){if(!TABLES[nom])throw new Error('Table inconnue : '+nom);}
function verifierInitialisation_(){const ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss.getSheetByName('Parametres'))throw new Error('BudgetSoft n’est pas initialisé.');}
