function definitionsCategoriesAudit20082026_() {
  return {
    'Achats personnels': "Biens discrétionnaires ou achats plaisir personnels ne relevant pas directement d’une activité de loisir : vêtements courants, parfum, électronique personnelle, cosmétique, accessoires, etc.",
    'Loisirs': "Activités de loisir et toutes les dépenses directement nécessaires à leur pratique ou consommation, y compris matériel et équipement : sport, musique, livres, cinéma, VOD, spectacles, clubs, raquettes, recordage, chaussures de sport, etc.",
    'Voyages / vacances': "Toutes les dépenses directement imputables à un séjour ou week-end de loisir : hébergement, transport, restauration, courses, activités et dépenses sur place.",
    'Dépenses diverses': "Dépenses utilitaires ou nécessaires et ponctuelles ne relevant d’aucune catégorie fonctionnelle plus précise ; catégorie résiduelle à ne pas utiliser lorsqu’une catégorie métier existe."
  };
}

function assurerDefinitionsCategoriesAudit20082026_() {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Categories');
  if (!feuille) throw new Error('Onglet Categories introuvable.');
  let largeur = Math.max(feuille.getLastColumn(), 1);
  let entetes = feuille.getRange(1, 1, 1, largeur).getValues()[0].map(v => String(v || '').trim());
  let idxDefinition = entetes.indexOf('definition');
  if (idxDefinition < 0) {
    idxDefinition = largeur;
    feuille.getRange(1, idxDefinition + 1).setValue('definition');
    largeur++;
    entetes = feuille.getRange(1, 1, 1, largeur).getValues()[0].map(v => String(v || '').trim());
  }
  const idxNom = entetes.indexOf('nom');
  if (idxNom < 0) throw new Error('Colonne Categories.nom introuvable.');
  const defs = definitionsCategoriesAudit20082026_();
  const trouvees = {};
  let modifiees = 0;
  if (feuille.getLastRow() > 1) {
    const plage = feuille.getRange(2, 1, feuille.getLastRow() - 1, largeur);
    const valeurs = plage.getValues();
    valeurs.forEach(r => {
      const nom = String(r[idxNom] || '').trim();
      if (!Object.prototype.hasOwnProperty.call(defs, nom)) return;
      trouvees[nom] = true;
      if (String(r[idxDefinition] || '') !== defs[nom]) {
        r[idxDefinition] = defs[nom];
        modifiees++;
      }
    });
    if (modifiees) plage.setValues(valeurs);
  }
  const manquantes = Object.keys(defs).filter(n => !trouvees[n]);
  return {modifiees:modifiees, manquantes:manquantes, colonne:idxDefinition + 1};
}

function ajouterMarqueurAuditDepensesFonctionnelles20082026_(commentaire, marqueur) {
  const texte = String(commentaire || '').trim();
  return texte.includes(marqueur) ? texte : (texte ? texte + ' ' : '') + marqueur;
}

function decisionsHistoriquesDepensesFonctionnelles20082026_() {
  return [
    // Achat du chien : 3 paiements, dépense Animaux mais non représentative.
    {id:'147c920f-c45c-43da-a641-1d20e29550d7', categorie:'Animaux', exceptionnel:true},
    {id:'4694e07b-3e07-4bec-af9f-21e8b2f1ad37', categorie:'Animaux', exceptionnel:true},
    {id:'d96c85a5-c0e1-47e4-ab87-ffdc43115f01', categorie:'Animaux', exceptionnel:true},

    // Musique / tennis / services / maison / beauté / séjour.
    {id:'2f54de1d-4462-45ad-806d-705aeb0d82ae', categorie:'Loisirs'},
    {id:'7268884b-b5ee-420c-82a2-967df6ade9f8', categorie:'Loisirs'},
    {id:'7f140974-da5d-4f2c-813b-858c1c7f296e', categorie:'Loisirs'},
    {id:'bbfca523-6448-4970-ad70-ff0db388d97f', categorie:'Loisirs'},
    {id:'31354938-f354-476a-8244-41ef23b04e3f', categorie:'Dépenses diverses'},
    {id:'3f5bef3d-86b3-4964-ae94-af99fac12d3c', categorie:'Maison / entretien'},
    {id:'22d14fe9-1178-45f2-922b-39bd0ba93c32', categorie:'Achats personnels'},
    {id:'48246dff-b573-4071-9736-eaa0a39daca8', categorie:'Achats personnels'},
    {id:'608f317a-6845-478d-8c8b-ce3163cf496d', categorie:'Voyages / vacances'},
    {id:'5a8e69f0-835e-4751-9429-e5d0aa576c23', categorie:'Voyages / vacances'},
    {id:'15e008fb-6eea-4a26-8e9e-04694e524043', categorie:'Voyages / vacances'},

    // Amazon / Amazon Digital explicitement qualifiés pendant l'audit.
    {id:'abb840d2-530c-49d9-ba5d-53920c4fcb17', categorie:'Loisirs'},
    {id:'5ad06c21-5f42-4cbc-9d42-26a23b1c5ea3', categorie:'Loisirs'},
    {id:'583dabaa-c99d-4214-ae64-2c5b85111a48', categorie:'Santé'},
    {id:'6994106c-ae2f-4557-9307-c8b63489112f', categorie:'Loisirs'},
    {id:'a71f10ff-9c03-4d8c-9be5-816fcdc6a825', categorie:'Maison / entretien'},
    {id:'83030694-1cc8-4063-89f8-49fb054fe620', categorie:'Courses'},
    {id:'d778a26e-d5ff-498b-9796-b868ed4c9302', categorie:'Animaux'},
    {id:'f1febc27-51eb-45bd-acda-f4234b79e864', categorie:'Loisirs'},
    {id:'67a4d0d0-a9da-44c3-aa07-a5f55851dc20', categorie:'Animaux'},
    {id:'f2177593-6cc6-4632-96b2-fa2c93f1093e', categorie:'Loisirs'},
    {id:'1dd9b36a-f72e-4d49-8f59-82c0c38a29a4', categorie:'Animaux'},
    {id:'0e6ed40b-757d-43bf-b07f-e722c37d6aeb', categorie:'Loisirs'},
    {id:'bf9527e5-8ba3-4c86-8130-c8dc9211175f', categorie:'Maison / entretien'},
    {id:'a7ba52ed-50ef-4e8c-bfa0-92c83e380228', categorie:'Loisirs'},
    {id:'ad514245-d862-4c6f-868d-25fb047cf75e', categorie:'Dépenses diverses'},
    {id:'faf5b25e-d12e-42ac-a23a-39908c285f28', categorie:'Maison / entretien'},
    {id:'71690dff-5027-42fc-a140-1328cb8479ad', categorie:'Maison / entretien'},
    {id:'b93eab06-b90b-430d-8ef5-d7e248816e95', categorie:'Loisirs'},
    {id:'2d4f2a14-2759-4a2f-8574-5e07b6dab25e', categorie:'Animaux'},
    {id:'ede202bf-1505-4afc-b653-58eaaf371de1', categorie:'Loisirs'},
    {id:'fa56595b-30a1-48ab-8c10-57348e42b9da', categorie:'Loisirs'},
    {id:'e20c8f0f-0c2d-4b54-aa46-f271a5e4ba15', categorie:'Loisirs'},
    {id:'b2127c9a-0390-45d2-9ae3-ff17cc3d1678', categorie:'Animaux'},
    {id:'a1218fa3-922b-40ac-bb9d-864c33273faf', categorie:'Loisirs'},
    {id:'983249fb-59b3-40c9-af80-29b08c3d6c54', categorie:'Animaux'},
    {id:'b9c013a9-7d5b-4453-a07a-5d426f9df77d', categorie:'Animaux'},

    // Paiements Amazon/Cofidis : catégorie fonctionnelle de l'achat, frais minimes inclus.
    {id:'6907eac0-0ab5-414e-b337-8a07c15488c4', categorie:'Animaux'},
    {id:'9fe42317-e342-4fd3-8e06-86dee407b7d1', categorie:'Animaux'},
    {id:'ad3805ab-25ee-445c-86eb-5977c76aa54f', categorie:'Animaux'},
    {id:'7072f83d-da2f-4d80-a7d8-39ac8059ab27', categorie:'Animaux'},
    {id:'a7936c6d-a175-4e41-9aa0-3b52da0e6362', categorie:'Achats personnels'},
    {id:'2a16b1cc-d944-4079-801b-c1d47338a872', categorie:'Achats personnels'},
    {id:'34cc4525-fbc4-4cea-be18-d00f8dbb1002', categorie:'Achats personnels'},
    {id:'93b6104a-776a-4c46-8e92-f49f112472fc', categorie:'Achats personnels'}
  ];
}

function propositionAuditDepensesFonctionnelles20082026_(operation) {
  const l = String(operation && operation.libelle || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (l.includes('croquenote')) return {categorie:'Loisirs', raison:'musique'};
  if (l.includes('helloasso paie 30 begles')) return {categorie:'Loisirs', raison:'tennis'};
  if (l.startsWith('wix com')) return {categorie:'Dépenses diverses', raison:'service_ponctuel'};
  if (l.includes('sp avalla')) return {categorie:'Maison / entretien', raison:'maison'};
  if (l.includes('amz digital') || l.includes('amazon digital') || l.includes('amazon prime')) return {categorie:'Loisirs', raison:'culture_numerique'};
  if (l.includes('escale beaute labege') || l.includes('esthetic center toulouse')) return {categorie:'Achats personnels', raison:'beaute_personnelle'};
  return null;
}

function migrerAuditDepensesFonctionnelles20082026() {
  verifierInitialisation_();
  const version = '1.0';
  const marqueur = '[AUDIT_DEPENSES_FONCTIONNELLES_20082026]';
  const marqueurExceptionnel = '[EXCEPTIONNEL_PREVISION]';
  const definitions = assurerDefinitionsCategoriesAudit20082026_();
  const operations = lireTable_('Operations');
  const parId = Object.fromEntries(operations.map(o => [String(o.id || ''), o]));
  const decisions = decisionsHistoriquesDepensesFonctionnelles20082026_();
  let categoriesModifiees = 0;
  let exceptionnelsMarques = 0;
  const idsAbsents = [];

  decisions.forEach(d => {
    const o = parId[d.id];
    if (!o) { idsAbsents.push(d.id); return; }
    const x = Object.assign({}, o);
    let change = false;
    if (String(x.categorie || '') !== d.categorie) {
      x.categorie = d.categorie;
      x.commentaire = ajouterMarqueurAuditDepensesFonctionnelles20082026_(x.commentaire, marqueur);
      categoriesModifiees++;
      change = true;
    }
    if (d.exceptionnel && !String(x.commentaire || '').includes(marqueurExceptionnel)) {
      x.commentaire = ajouterMarqueurAuditDepensesFonctionnelles20082026_(x.commentaire, marqueurExceptionnel);
      x.commentaire = ajouterMarqueurAuditDepensesFonctionnelles20082026_(x.commentaire, marqueur);
      exceptionnelsMarques++;
      change = true;
    }
    if (change) enregistrerLigne('Operations', x);
  });

  SpreadsheetApp.flush();
  const resultat = {
    version:version,
    categoriesModifiees:categoriesModifiees,
    exceptionnelsMarques:exceptionnelsMarques,
    definitionsModifiees:definitions.modifiees,
    definitionsManquantes:definitions.manquantes,
    idsAbsents:idsAbsents,
    totalDecisions:decisions.length
  };
  console.log(JSON.stringify(resultat));
  return resultat;
}

function auditerDepensesFonctionnelles20082026() {
  verifierInitialisation_();
  const version = '1.0';
  const marqueurExceptionnel = '[EXCEPTIONNEL_PREVISION]';
  const operations = lireTable_('Operations');
  const parId = Object.fromEntries(operations.map(o => [String(o.id || ''), o]));
  const decisions = decisionsHistoriquesDepensesFonctionnelles20082026_();
  const absentes = [];
  const mauvaisesCategories = [];
  const exceptionnelsIncorrects = [];

  decisions.forEach(d => {
    const o = parId[d.id];
    if (!o) { absentes.push(d.id); return; }
    if (String(o.categorie || '') !== d.categorie) mauvaisesCategories.push({id:d.id, libelle:o.libelle, categorie:o.categorie, attendue:d.categorie});
    if (d.exceptionnel && !String(o.commentaire || '').includes(marqueurExceptionnel)) exceptionnelsIncorrects.push(d.id);
  });

  const feuilleCategories = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Categories');
  const largeur = feuilleCategories ? Math.max(feuilleCategories.getLastColumn(), 1) : 0;
  const entetes = feuilleCategories ? feuilleCategories.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim()) : [];
  const idxNom = entetes.indexOf('nom');
  const idxDef = entetes.indexOf('definition');
  const defsAttendues = definitionsCategoriesAudit20082026_();
  const defsLues = {};
  if (feuilleCategories && idxNom >= 0 && idxDef >= 0 && feuilleCategories.getLastRow() > 1) {
    feuilleCategories.getRange(2,1,feuilleCategories.getLastRow()-1,largeur).getValues().forEach(r => { defsLues[String(r[idxNom]||'').trim()] = String(r[idxDef]||''); });
  }
  const definitionsCorrectes = Object.keys(defsAttendues).every(n => defsLues[n] === defsAttendues[n]);

  const controles = {
    toutes_operations_trouvees: absentes.length === 0,
    toutes_categories_conformes: mauvaisesCategories.length === 0,
    achat_chien_3_exceptionnels: exceptionnelsIncorrects.length === 0 && decisions.filter(d=>d.exceptionnel).length === 3,
    definitions_4_categories_presentes: definitionsCorrectes,
    colonne_definition_presente: idxDef >= 0
  };
  const resultat = {
    version:version,
    ok:Object.values(controles).every(Boolean),
    controles:controles,
    compteurs:{decisions:decisions.length, absentes:absentes.length, mauvaisesCategories:mauvaisesCategories.length, exceptionnelsIncorrects:exceptionnelsIncorrects.length},
    absentes:absentes,
    mauvaisesCategories:mauvaisesCategories,
    exceptionnelsIncorrects:exceptionnelsIncorrects
  };
  console.log(JSON.stringify(resultat));
  return resultat;
}
