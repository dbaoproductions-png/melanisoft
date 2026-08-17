const BUDGETSOFT_AOUT_2026_BAD_RULE_IDS_ = [
  'e04f1948-805c-4b36-a9ec-beee8ff52cc3','4413def1-d987-46dc-8d2f-cdaa286dfec5','27e8905f-711e-49f9-a870-f84af4358ea0',
  '642453a7-2c42-43a7-bd11-83067fe59c8d','e3c36b1c-44ba-474a-835e-f2194c464e2c','4448c354-849f-45a4-a35b-d2131631ab1d',
  '179a6bc4-8161-4cc9-9b13-f21a6bc773bd','ac6efc7d-da1e-48a9-a86e-584cd0cee05d','3ab5c105-77b8-45c6-877a-0b62fe5d2b17',
  '50f3e1af-fad6-41b6-8a7e-0b3de9409269','a0465383-c49c-4625-bd18-64e36b2de86d','52603826-1523-4ddb-82b0-f8609733c5a7',
  '8e18063a-7fb3-4dc3-af18-9e8999e8d756'
];

function desactiverReglesPollueesAout2026_(){
  const f=initialiserReglesCategories_();
  if(f.getLastRow()<2)return 0;
  const valeurs=f.getRange(2,1,f.getLastRow()-1,BULK_RULES_HEADERS.length).getValues();
  const idCol=BULK_RULES_HEADERS.indexOf('id'),actifCol=BULK_RULES_HEADERS.indexOf('actif'),modCol=BULK_RULES_HEADERS.indexOf('modifie_le'),motifCol=BULK_RULES_HEADERS.indexOf('motif'),catCol=BULK_RULES_HEADERS.indexOf('categorie');
  const cible=new Set(BUDGETSOFT_AOUT_2026_BAD_RULE_IDS_);
  let n=0;
  valeurs.forEach((r,i)=>{
    const motif=normaliserTexteBanque_(r[motifCol]||''),categorie=String(r[catCol]||'').trim();
    const manifestementFausse = /\bNIKE\b/.test(motif) || /DR COURRIERE|DR MOLLARD/.test(motif) || (motif==='GOOGLE'&&/Abonnements/i.test(categorie));
    if(!cible.has(String(r[idCol]||''))&&!manifestementFausse)return;
    if(String(r[actifCol]).toLowerCase()==='false')return;
    f.getRange(i+2,actifCol+1).setValue(false);
    if(modCol>=0)f.getRange(i+2,modCol+1).setValue(new Date().toISOString());
    n++;
  });
  return n;
}

function texteOperationReparation2026_(o){return normaliserTexteBanque_([o.marchand_normalise||'',o.libelle_bancaire||'',o.libelle||''].join(' '));}
function reparerCategoriesManifestesAout2026_(){
  const ops=lireTable_('Operations');
  let modifiees=0;
  const detail={intermarche:0,zara:0,interets:0,carrefourCredit:0,transport:0,nike:0,medecins:0,virementInterne:0,tisseoTickets:0,abonnementsNumeriques:0,telecom:0};
  ops.forEach(o=>{
    const texte=texteOperationReparation2026_(o),type=String(o.type||'').toLowerCase(),actuelle=String(o.categorie||'').trim(),montant=Math.abs(Number(o.montant||0));
    let cible='';
    if(type==='depense'&&/(INTERMARCHE|INTER MAGASIN|INTER GREECE)/.test(texte)){cible='Courses';detail.intermarche++;}
    else if(type==='depense'&&/ZARA INTERNET F/.test(texte)){cible='Achats personnels';detail.zara++;}
    else if(type==='depense'&&/INTERETS DEBITEURS/.test(texte)){cible='Frais bancaires';detail.interets++;}
    else if(type==='revenu'&&/CARREFOUR BANQUE/.test(texte)){cible='Crédits de trésorerie';detail.carrefourCredit++;}
    else if(type==='depense'&&/\bNIKE\b/.test(texte)){cible='Achats personnels';detail.nike++;}
    else if(type==='depense'&&/(DR COURRIERE|DR MOLLARD)/.test(texte)){cible='Santé';detail.medecins++;}
    else if(/VIREMENT INTERNE/.test(texte)){cible='Virements internes';detail.virementInterne++;}
    else if(type==='depense'&&Math.abs(montant-1.80)<0.001&&/(?:^|\s)TI(?:\s|$)/.test(texte)){cible='Transports';detail.tisseoTickets++;}
    else if(type==='depense'&&/(FOUNDIt|FOUNDIT|GOOGLE ONE|DEEZER|IONOS|FAMILO|OPENAI CHATGPT|OPODO PRIME|AMZ DIGITAL)/i.test(texte)){cible='Abonnements numériques';detail.abonnementsNumeriques++;}
    else if(type==='depense'&&/(ORANGE|BOUYGUES|SFR|FREE MOBILE|FREE TELECOM)/.test(texte)&&/^(Abonnements numériques|Abonnements|Télécommunications|Télécom \/ Internet \/ TV)?$/.test(actuelle)){cible='Télécom / Internet / TV';detail.telecom++;}
    else if(actuelle==='Transport'){cible='Transports';detail.transport++;}
    if(!cible||actuelle===cible)return;
    enregistrerLigne('Operations',Object.assign({},o,{categorie:cible,montant:Math.abs(Number(o.montant||0))}));
    modifiees++;
  });
  return{modifiees,detail};
}

function installerMemoireMarchandsAudit2026_(){
  if(typeof enregistrerCorrespondanceBancaire!=='function')return{ajoutees:0,misesAJour:0};
  const defs=[
    {motif:'INTERMARCHE',libelle:'Intermarché',categorie:'Courses',type:'depense'},
    {motif:'NIKE',libelle:'Nike',categorie:'Achats personnels',type:'depense'},
    {motif:'DR COURRIERE',libelle:'Dr Courrière',categorie:'Santé',type:'depense'},
    {motif:'DR MOLLARD',libelle:'Dr Mollard',categorie:'Santé',type:'depense'},
    {motif:'FOUNDIT',libelle:'Foundit',categorie:'Abonnements numériques',type:'depense'},
    {motif:'GOOGLE ONE',libelle:'Google One',categorie:'Abonnements numériques',type:'depense'},
    {motif:'DEEZER',libelle:'Deezer',categorie:'Abonnements numériques',type:'depense'},
    {motif:'IONOS',libelle:'Ionos',categorie:'Abonnements numériques',type:'depense'},
    {motif:'FAMILO',libelle:'Familo',categorie:'Abonnements numériques',type:'depense'},
    {motif:'OPENAI CHATGPT',libelle:'ChatGPT',categorie:'Abonnements numériques',type:'depense'},
    {motif:'OPODO PRIME',libelle:'Opodo Prime',categorie:'Abonnements numériques',type:'depense'},
    {motif:'AMZ DIGITAL',libelle:'Amazon Digital',categorie:'Abonnements numériques',type:'depense'}
  ];
  const existantes=lireCorrespondancesBancaires();let ajoutees=0,misesAJour=0;
  defs.forEach(d=>{
    const motif=normaliserTexteBanque_(d.motif),existante=existantes.find(c=>normaliserTexteBanque_(c.motif_bancaire)===motif&&!c.compte);
    if(existante){enregistrerCorrespondanceBancaire(Object.assign({},existante,{categorie:d.categorie,type:d.type,libelle_normalise:d.libelle,actif:true}));misesAJour++;}
    else{enregistrerCorrespondanceBancaire({motif_bancaire:motif,libelle_normalise:d.libelle,categorie:d.categorie,type:d.type,compte:'',actif:true,utilisations:0});ajoutees++;}
  });
  return{ajoutees,misesAJour};
}

function corrigerTypeLivretHello2026_(){
  const comptes=lireTable_('Comptes');
  let n=0;
  comptes.forEach(c=>{
    if(!/livret|epargne|épargne/i.test(String(c.nom||'')))return;
    if(String(c.type||'').toLowerCase()!=='epargne'){enregistrerLigne('Comptes',Object.assign({},c,{type:'epargne'}));n++;}
    nettoyerParametresReleveLivret2026_(String(c.id||''));
  });
  return n;
}
function nettoyerParametresReleveLivret2026_(id){
  if(!id)return 0;
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Parametres');if(!f||f.getLastRow()<2)return 0;
  const prefixes=['solde_releve_','date_solde_releve_','solde_releve_source_','solde_ouverture_premier_releve_','date_ouverture_premier_releve_','historique_releves_'];
  const valeurs=f.getRange(2,1,f.getLastRow()-1,2).getValues();let supprimees=0;
  for(let i=valeurs.length-1;i>=0;i--){if(prefixes.some(p=>String(valeurs[i][0]||'')===p+id)){f.deleteRow(i+2);supprimees++;}}
  return supprimees;
}

function compteCourantPrincipalBudgetSoft_(){
  const comptes=lireTable_('Comptes').filter(c=>convertirBooleen_(c.actif));
  return comptes.find(c=>/compte\s*(joint|courant)|compte\s*cheques?/i.test(String((c.nom||'')+' '+(c.type||'')))&&!/livret|epargne|épargne/i.test(String(c.nom||'')))||null;
}

function reparerReferenceComptePrincipalAout2026_(){
  const compte=compteCourantPrincipalBudgetSoft_();
  if(!compte)throw new Error('Compte courant principal introuvable.');
  const id=String(compte.id||'');
  const candidats=[];
  const historique=typeof lireHistoriqueReleves_==='function'?lireHistoriqueReleves_(id):[];
  (historique||[]).forEach(r=>{const d=r&&r.dateCloture?new Date(r.dateCloture):null,s=Number(r&&r.soldeCloture);if(d&&!isNaN(d)&&Number.isFinite(s))candidats.push({date:r.dateCloture,solde:s,source:'historique_imports'});});
  if(typeof RELEVES_CERTIFIES_BUDGETSOFT_!=='undefined'&&Array.isArray(RELEVES_CERTIFIES_BUDGETSOFT_)){
    RELEVES_CERTIFIES_BUDGETSOFT_.forEach(r=>{if(r&&r.fin&&Number.isFinite(Number(r.cloture)))candidats.push({date:String(r.fin)+'T12:00:00',solde:Number(r.cloture),source:'referentiel_certifie_2026'});});
  }
  candidats.sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(!candidats.length)throw new Error('Aucune référence bancaire exploitable.');
  const dernier=candidats[0];
  enregistrerParametreBudgetaire_('solde_releve_'+id,dernier.solde);
  enregistrerParametreBudgetaire_('date_solde_releve_'+id,dernier.date);
  enregistrerParametreBudgetaire_('solde_releve_source_'+id,'Réparation sécurisée '+dernier.source);
  return{compte:id,nom:compte.nom,dateCloture:dernier.date,soldeCloture:dernier.solde,source:dernier.source};
}

function auditCategorisationBudgetSoft2026(){
  verifierInitialisation_();
  const ops=lireTable_('Operations'),cats=new Map(lireTable_('Categories').map(c=>[String(c.nom||''),String(c.type||'').toLowerCase()]));
  let sansCategorie=0,categorieInconnue=0,typeIncompatible=0;
  const exemples=[];
  ops.forEach(o=>{
    const cat=String(o.categorie||'').trim(),type=String(o.type||'').toLowerCase();
    if(!cat){sansCategorie++;return;}
    if(!cats.has(cat)){categorieInconnue++;if(exemples.length<50)exemples.push({id:o.id,libelle:o.libelle,categorie:cat,probleme:'categorie_inconnue'});return;}
    const ct=cats.get(cat);
    if((ct==='depense'||ct==='revenu')&&ct!==type){typeIncompatible++;if(exemples.length<50)exemples.push({id:o.id,libelle:o.libelle,categorie:cat,type,probleme:'type_incompatible'});}
  });
  return{total:ops.length,sansCategorie,categorieInconnue,typeIncompatible,exemples};
}

function reparerBudgetSoftAout2026(){
  verifierInitialisation_();
  const architecture=typeof installerArchitectureCategoriesBudgetSoft==='function'?installerArchitectureCategoriesBudgetSoft():null;
  const resultat={
    architectureCategories:architecture,
    reglesDesactivees:desactiverReglesPollueesAout2026_(),
    categories:reparerCategoriesManifestesAout2026_(),
    memoireMarchands:installerMemoireMarchandsAudit2026_(),
    livretsCorriges:corrigerTypeLivretHello2026_(),
    reference:reparerReferenceComptePrincipalAout2026_()
  };
  resultat.audit=auditCategorisationBudgetSoft2026();
  return resultat;
}
