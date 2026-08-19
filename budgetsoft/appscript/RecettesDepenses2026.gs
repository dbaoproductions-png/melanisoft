const MODELE_RECETTES_DEPENSES_VERSION = '2026-08-19.1';

function texteMetier2026_(o) {
  return normaliserTexteBanque_([o.marchand_normalise || '', o.libelle_bancaire || '', o.libelle || ''].join(' '));
}

function dateMetier2026_(v) {
  const d = v instanceof Date ? new Date(v) : new Date(v);
  return isNaN(d) ? null : d;
}

function cleMoisMetier2026_(v) {
  const d = dateMetier2026_(v);
  if (!d) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Europe/Paris', 'yyyy-MM');
}

function lireParametresMetier2026_() {
  return Object.fromEntries(lireTable_('Parametres').map(p => [String(p.cle || ''), p.valeur]));
}

function nombreParamMetier2026_(p, cle, defaut) {
  const n = Number(p[cle]);
  return isFinite(n) ? n : defaut;
}

function enregistrerParamMetier2026_(cle, valeur) {
  enregistrerLigne('Parametres', { cle: cle, valeur: valeur });
}

function assurerCategorieMetier2026_(nom, type) {
  const categories = lireTable_('Categories');
  const existante = categories.find(c => String(c.nom || '').trim() === nom);
  if (existante) {
    if (String(existante.type || '').toLowerCase() !== type || String(existante.actif) === '0') {
      enregistrerLigne('Categories', Object.assign({}, existante, { type: type, actif: true }));
    }
    return existante.id;
  }
  const ligne = { id: Utilities.getUuid(), nom: nom, type: type, couleur: '', actif: true };
  enregistrerLigne('Categories', ligne);
  return ligne.id;
}

function desactiverCategorieMetier2026_(nom) {
  const c = lireTable_('Categories').find(x => String(x.nom || '').trim() === nom);
  if (c && String(c.actif) !== '0') enregistrerLigne('Categories', Object.assign({}, c, { actif: false }));
}

function assurerRegleMetier2026_(motif, categorie, type) {
  const regles = lireTable_('Regles_categories');
  const cle = String(motif || '').trim().toLowerCase();
  const existante = regles.find(r => String(r.motif || '').trim().toLowerCase() === cle && String(r.type || '').toLowerCase() === type);
  const maintenant = new Date();
  if (existante) {
    if (String(existante.categorie || '') !== categorie || String(existante.actif) === '0') {
      enregistrerLigne('Regles_categories', Object.assign({}, existante, { categorie: categorie, actif: true, modifie_le: maintenant }));
    }
    return;
  }
  enregistrerLigne('Regles_categories', {
    id: Utilities.getUuid(), motif: motif, categorie: categorie, type: type,
    actif: true, cree_le: maintenant, modifie_le: maintenant
  });
}

function cibleCorrectionMetier2026_(o) {
  const texte = texteMetier2026_(o);
  const type = String(o.type || '').toLowerCase();
  const actuelle = String(o.categorie || '').trim();
  const montant = Math.abs(Number(o.montant || 0));

  if (type === 'revenu') {
    if (/(MAIRIE DE TOULOUSE|TOULOUSE.*PAYE|PAYE.*TOULOUSE)/.test(texte)) return 'Salaires';
    if (/CRICAO/.test(texte)) return 'Concerts';
    if (/CONGES SPECTACLES/.test(texte)) return 'Congés spectacles';
    if (/SPEDIDAM/.test(texte)) return 'Droits artistiques';
    if (/CASC SVP/.test(texte)) return 'Avantages employeur';
    if (/C\.P\.A\.M|\bCPAM\b/.test(texte)) return 'Remboursements santé';
    if (/MORGANE/.test(texte) && /LOYER/.test(texte)) return 'Revenus fonciers';
    if (/REMISE.*CHEQUE/.test(texte) && Math.abs(montant - 30) < .01) return 'Revenus fonciers';
  }

  if (type !== 'depense') return '';

  if (/JONAK/.test(texte)) return 'Achats personnels';
  if (/(CLINIQUE DU PAY|VIEUX CHATEAU|CASTELMAUROU)/.test(texte)) {
    if (Math.abs(montant - 730) < .01) return 'Santé';
    if (montant <= 6) return 'Restaurants';
  }
  if (/KLARNA.*NORAUTO|NORAUTO.*KLARNA/.test(texte)) return 'Voitures';
  if (/SOSTRENE GRENE/.test(texte)) return 'Maison / entretien';
  if (/SPIRALE CASTANET|\bJPC\b|SUMUP ATELIER/.test(texte)) return 'Courses';
  if (/TERRA NOVA|LOVISA/.test(texte)) return 'Achats personnels';
  if (/LA CYCLERIE/.test(texte)) return 'Voyages / vacances';
  if (/ZETTLE LES JAR|LES JARDINS DE/.test(texte)) return 'Restaurants';
  if (/INTERSPORT/.test(texte)) return 'Loisirs';
  if (/BILLETWEB|WEEZEVENT|PATHE|VEO MURET|PISCINE.*RAMONVILLE|ENTREE NATURIST|BOUTIQUE USC|STUDIO HOP|COMPAGNIE DE LODEVE|ESTHETIC CENTER|ESCALE BEAUTE/.test(texte)) return 'Loisirs';
  if (/SCT INST EMIS MOTIF/.test(texte) && (Math.abs(montant - 45) < .01 || Math.abs(montant - 60) < .01)) return 'Loisirs';

  if (actuelle === 'Restaurants / sorties') return 'Restaurants';
  return '';
}

function appliquerCorrectifsRecettesDepenses18082026() {
  verifierInitialisation_();
  assurerCategorieMetier2026_('Restaurants', 'depense');
  assurerCategorieMetier2026_('Droits artistiques', 'revenu');
  assurerCategorieMetier2026_('Avantages employeur', 'revenu');

  enregistrerParamMetier2026_('modele_recettes_depenses_version', MODELE_RECETTES_DEPENSES_VERSION);
  enregistrerParamMetier2026_('loyer_reference_mensuel', 750);
  enregistrerParamMetier2026_('loyer_reference_depuis', '2026-08-13');
  enregistrerParamMetier2026_('garage_reference_mensuel', 30);
  enregistrerParamMetier2026_('salaire_mois_primes', '6,11,12');
  // Depuis le 19/08/2026, le salaire Patrick est le virement net réellement crédité après PAS.
  // Aucun retraitement de remboursement professionnel n'est soustrait du virement salarial.
  enregistrerParamMetier2026_('salaire_regle', 'net_bancaire_apres_pas');
  enregistrerParamMetier2026_('pluxee_montant_mensuel', 154);
  enregistrerParamMetier2026_('pluxee_mois_carence', 5);
  enregistrerParamMetier2026_('pluxee_depenses_observees_5m', 655.43);
  enregistrerParamMetier2026_('pluxee_courses_observees_5m', 449.38);
  enregistrerParamMetier2026_('pluxee_restaurants_observees_5m', 206.05);
  enregistrerParamMetier2026_('pluxee_depenses_observees_3m', 315.17);
  enregistrerParamMetier2026_('pluxee_depenses_estimees_12m', 1573.03);

  [
    ['sodex', 'Restaurants', 'depense'], ['nyx', 'Restaurants', 'depense'],
    ['billetweb', 'Loisirs', 'depense'], ['weezevent', 'Loisirs', 'depense'], ['pathe', 'Loisirs', 'depense'],
    ['intersport', 'Loisirs', 'depense'], ['jonak', 'Achats personnels', 'depense'],
    ['zettle les jar', 'Restaurants', 'depense'], ['les jardins de', 'Restaurants', 'depense'],
    ['spirale castanet', 'Courses', 'depense'], ['sumup atelier', 'Courses', 'depense'],
    ['mairie de toulouse', 'Salaires', 'revenu'], ['conges spectacles', 'Congés spectacles', 'revenu'],
    ['spedidam', 'Droits artistiques', 'revenu'], ['casc svp', 'Avantages employeur', 'revenu'],
    ['c.p.a.m', 'Remboursements santé', 'revenu'], ['cpam', 'Remboursements santé', 'revenu']
  ].forEach(r => assurerRegleMetier2026_(r[0], r[1], r[2]));

  const ops = lireTable_('Operations');
  let modifiees = 0;
  const detail = {};
  ops.forEach(o => {
    const cible = cibleCorrectionMetier2026_(o);
    const actuelle = String(o.categorie || '').trim();
    if (!cible || cible === actuelle) return;
    enregistrerLigne('Operations', Object.assign({}, o, { categorie: cible, montant: Math.abs(Number(o.montant || 0)) }));
    modifiees++;
    detail[cible] = (detail[cible] || 0) + 1;
  });

  desactiverCategorieMetier2026_('Restaurants / sorties');
  return {
    version: MODELE_RECETTES_DEPENSES_VERSION,
    operationsModifiees: modifiees,
    detail: detail,
    auditTypes: typeof auditTypesOperationsBudgetSoft2026 === 'function' ? auditTypesOperationsBudgetSoft2026() : null
  };
}

function borneAnalyseMetier2026_(operations, mois) {
  const dates = operations.map(o => dateMetier2026_(o.date)).filter(Boolean).sort((a, b) => a - b);
  const fin = dates.length ? dates[dates.length - 1] : new Date();
  const debut = new Date(fin.getFullYear(), fin.getMonth() - Math.max(1, mois) + 1, 1);
  debut.setHours(0, 0, 0, 0);
  fin.setHours(23, 59, 59, 999);
  return { debut: debut, fin: fin };
}

function opsFenetreMetier2026_(operations, mois) {
  const b = borneAnalyseMetier2026_(operations, mois);
  return { borne: b, operations: operations.filter(o => { const d = dateMetier2026_(o.date); return d && d >= b.debut && d <= b.fin; }) };
}

function estCategorieRevenuEconomique2026_(cat, typeCategorie) {
  if (String(typeCategorie || '').toLowerCase() !== 'revenu') return false;
  return !['Remboursements santé'].includes(String(cat || '').trim());
}

function producteurRevenu2026_(cat) {
  if (cat === 'Salaires') return 'Patrick';
  if (['France Travail','Cours','Concerts','Congés spectacles','SACEM','Droits artistiques','Avantages employeur'].includes(cat)) return 'Madame';
  if (cat === 'Revenus fonciers') return 'Foyer';
  return 'Foyer';
}

function estRevenuStructurel2026_(cat) {
  return ['Salaires','France Travail','Cours','Concerts','Congés spectacles','SACEM','Droits artistiques','Revenus fonciers'].includes(cat);
}

function estRevenuVariable2026_(cat) {
  return ['France Travail','Cours','Concerts','Congés spectacles','SACEM','Droits artistiques','Revenus divers','Autres revenus','Avantages employeur'].includes(cat);
}

function construireAnalyseRecettes2026_(operations, categoriesRef) {
  const p = lireParametresMetier2026_();
  const types = Object.fromEntries(categoriesRef.map(c => [String(c.nom || '').trim(), String(c.type || '').toLowerCase()]));
  const fenetres = {};

  [3,6,12].forEach(nb => {
    const f = opsFenetreMetier2026_(operations, nb);
    let economiques = 0, structurels = 0, variables = 0, sauvetages = 0;
    const producteurs = { Patrick: 0, Madame: 0, Foyer: 0 };
    const sources = {};
    const moisSauvetage = new Set();

    f.operations.forEach(o => {
      const montant = Number(o.montant || 0);
      const cat = String(o.categorie || '').trim();
      if (montant > 0 && cat === 'Crédits de trésorerie') {
        sauvetages += montant;
        moisSauvetage.add(cleMoisMetier2026_(o.date));
        return;
      }
      if (montant <= 0 || !estCategorieRevenuEconomique2026_(cat, types[cat])) return;
      // Règle Patrick : le montant bancaire crédité est déjà le net disponible après PAS.
      const net = montant;
      economiques += net;
      if (estRevenuStructurel2026_(cat)) structurels += net;
      if (estRevenuVariable2026_(cat)) variables += net;
      const prod = producteurRevenu2026_(cat);
      producteurs[prod] += net;
      sources[cat || 'Autres'] = (sources[cat || 'Autres'] || 0) + net;
    });

    fenetres[nb] = {
      mois: nb, debut: f.borne.debut, fin: f.borne.fin,
      revenusEconomiques: economiques,
      moyenneMensuelle: economiques / nb,
      revenusStructurels: structurels,
      revenusVariables: variables,
      partVariable: economiques > 0 ? variables / economiques * 100 : 0,
      producteurs: producteurs,
      sources: Object.entries(sources).map(([nom,montant]) => ({nom:nom,montant:montant})).sort((a,b)=>b.montant-a.montant),
      remboursementsProfessionnelsNeutralises: 0,
      creditsTresorerie: sauvetages,
      moisAvecSauvetage: moisSauvetage.size,
      dependanceCredit: economiques > 0 ? sauvetages / economiques * 100 : 0
    };
  });

  const salaires = operations.filter(o => Number(o.montant || 0) > 0 && String(o.categorie || '') === 'Salaires').sort((a,b)=>dateMetier2026_(b.date)-dateMetier2026_(a.date));
  const salaireReference = salaires.length ? Number(salaires[0].montant || 0) : 0;

  return {
    version: MODELE_RECETTES_DEPENSES_VERSION,
    fenetres: fenetres,
    references: {
      salairePatrick: salaireReference,
      loyerAppartement: nombreParamMetier2026_(p, 'loyer_reference_mensuel', 750),
      garage: nombreParamMetier2026_(p, 'garage_reference_mensuel', 30),
      pluxeeMensuel: nombreParamMetier2026_(p, 'pluxee_montant_mensuel', 154),
      pluxeeMoisCarence: nombreParamMetier2026_(p, 'pluxee_mois_carence', 5),
      moisPrimesSalaire: String(p.salaire_mois_primes || '6,11,12')
    }
  };
}

function pluxeeFenetre2026_(nb, p) {
  const total5 = nombreParamMetier2026_(p, 'pluxee_depenses_observees_5m', 655.43);
  const courses5 = nombreParamMetier2026_(p, 'pluxee_courses_observees_5m', 449.38);
  const restos5 = nombreParamMetier2026_(p, 'pluxee_restaurants_observees_5m', 206.05);
  const ratioCourses = total5 > 0 ? courses5 / total5 : .686;
  let total = 0, mode = 'observé';
  if (nb === 3) total = nombreParamMetier2026_(p, 'pluxee_depenses_observees_3m', 315.17);
  else if (nb === 6) total = total5;
  else { total = nombreParamMetier2026_(p, 'pluxee_depenses_estimees_12m', 1573.03); mode = 'estimé'; }
  return { total: total, courses: total * ratioCourses, restaurants: total * (1-ratioCourses), mode: mode };
}

function construireAnalyseDepenses2026_(operations, categoriesRef, chargesFixes) {
  const p = lireParametresMetier2026_();
  const fenetres = {};
  [3,6,12].forEach(nb => {
    const f = opsFenetreMetier2026_(operations, nb);
    const dep = f.operations.filter(o => Number(o.montant || 0) < 0);
    const montantCat = cat => dep.filter(o => String(o.categorie || '').trim() === cat).reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0);
    const santeOps = dep.filter(o => String(o.categorie || '').trim() === 'Santé');
    const couverture = santeOps.filter(o => /MNT|AUDIENS/.test(texteMetier2026_(o))).reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0);
    const santeBrute = santeOps.reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0);
    const rembSante = f.operations.filter(o => Number(o.montant||0)>0 && String(o.categorie||'').trim()==='Remboursements santé').reduce((s,o)=>s+Number(o.montant||0),0);
    const pluxee = pluxeeFenetre2026_(nb, p);
    const coursesBanque = montantCat('Courses');
    const restaurantsBanque = montantCat('Restaurants');
    const themes = {
      'Logement': montantCat('Logements'),
      'Alimentation / quotidien': coursesBanque + pluxee.courses + montantCat('Dépenses diverses'),
      'Transport': montantCat('Transports') + montantCat('Voitures'),
      'Santé nette': Math.max(0, santeBrute - rembSante),
      'Assurances': montantCat('Assurances'),
      'Crédits / financement': montantCat('Crédits') + montantCat('Crédits revolving'),
      'Frais professionnels': montantCat('Frais professionnels'),
      'Loisirs / consommation': montantCat('Loisirs') + restaurantsBanque + pluxee.restaurants + montantCat('Voyages / vacances') + montantCat('Achats personnels'),
      'Impôts': montantCat('Impôts'),
      'Énergie': montantCat('Énergies'),
      'Abonnements / numérique': montantCat('Télécom / Internet / TV') + montantCat('Abonnements numériques')
    };
    fenetres[nb] = {
      mois: nb, debut: f.borne.debut, fin: f.borne.fin,
      alimentation: {
        coursesBanque: coursesBanque, restaurantsBanque: restaurantsBanque,
        pluxeeCourses: pluxee.courses, pluxeeRestaurants: pluxee.restaurants,
        pluxeeTotal: pluxee.total, pluxeeMode: pluxee.mode,
        coursesReelles: coursesBanque + pluxee.courses,
        restaurantsReels: restaurantsBanque + pluxee.restaurants,
        totalReel: coursesBanque + restaurantsBanque + pluxee.total
      },
      sante: {
        soinsEtCouvertureBruts: santeBrute,
        couvertureMntAudiens: couverture,
        soinsBruts: Math.max(0, santeBrute - couverture),
        remboursements: rembSante,
        coutNet: Math.max(0, santeBrute - rembSante)
      },
      themes: Object.entries(themes).map(([nom,montant])=>({nom:nom,montant:montant})).sort((a,b)=>b.montant-a.montant)
    };
  });

  const fixesActives = chargesFixes.filter(c => String(c.actif) !== '0');
  const montantFixeMensuel = fixesActives.reduce((s,c) => {
    const m = Math.abs(Number(c.montant || 0));
    const freq = String(c.frequence || 'Mensuelle').toLowerCase();
    if (freq.indexOf('mens') >= 0) return s + m;
    if (freq.indexOf('trim') >= 0) return s + m / 3;
    if (freq.indexOf('ann') >= 0) return s + m / 12;
    return s + m;
  }, 0);

  const dernierMontant = motif => {
    const l = operations.filter(o => Number(o.montant||0)<0 && motif.test(texteMetier2026_(o))).sort((a,b)=>dateMetier2026_(b.date)-dateMetier2026_(a.date));
    return l.length ? Math.abs(Number(l[0].montant||0)) : 0;
  };

  return {
    version: MODELE_RECETTES_DEPENSES_VERSION,
    fenetres: fenetres,
    fixes: {
      montantMensuelReference: montantFixeMensuel,
      nombre: fixesActives.length,
      couvertureSanteActuelle: dernierMontant(/MNT/) + dernierMontant(/AUDIENS/)
    },
    nomenclature: {
      dimensions: ['catégorie','thème','fixe/variable','contraint/arbitrable','brut/net'],
      note: 'Première version analytique : les regroupements seront affinés pendant les prochains audits.'
    }
  };
}