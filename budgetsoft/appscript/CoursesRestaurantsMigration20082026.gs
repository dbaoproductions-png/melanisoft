function normaliserLibelleAuditCoursesRestaurants20082026_(valeur) {
  return String(valeur || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function estOperationAubagne20082026_(o) {
  const texte = normaliserLibelleAuditCoursesRestaurants20082026_([
    o && o.libelle,
    o && o.commentaire,
    o && o.libelle_bancaire,
    o && o.libelle_brut
  ].filter(Boolean).join(' '));
  return /(^| )aubagne( |$)/.test(texte);
}

function propositionAuditCoursesRestaurants20082026_(o) {
  const l = normaliserLibelleAuditCoursesRestaurants20082026_(o && o.libelle);

  // Priorité métier : lorsqu'Aubagne est explicitement présent dans les données
  // de l'opération, la dépense est professionnelle avant toute règle commerçant.
  if (estOperationAubagne20082026_(o)) return {categorie:'Frais professionnels', raison:'aubagne_explicitement_professionnel'};

  // Décisions validées pendant l'audit du 20/08/2026.
  if (/^jpc(?: toulouse)?$/.test(l)) return {categorie:'Restaurants', raison:'jpc_restaurant'};
  if (l === 'sarl trait toulouse' || l === 'sarl trait') return {categorie:'Dépenses diverses', raison:'trait_depenses_diverses'};

  return null;
}

function ajouterMarqueurAuditCoursesRestaurants20082026_(commentaire) {
  const marqueur = '[AUDIT_COURSES_RESTAURANTS_20082026]';
  const t = String(commentaire || '').trim();
  return t.includes(marqueur) ? t : (t ? t + ' ' : '') + marqueur;
}

function migrerAuditCoursesRestaurants20082026() {
  verifierInitialisation_();
  const version = '1.0';
  const ops = lireTable_('Operations');
  let jpcVersRestaurants = 0;
  let traitVersDiverses = 0;
  let aubagneVersFraisProfessionnels = 0;

  ops.forEach(o => {
    const p = propositionAuditCoursesRestaurants20082026_(o);
    if (!p || String(o.categorie || '') === p.categorie) return;

    const x = Object.assign({}, o, {
      categorie: p.categorie,
      commentaire: ajouterMarqueurAuditCoursesRestaurants20082026_(o.commentaire)
    });
    enregistrerLigne('Operations', x);

    if (p.raison === 'jpc_restaurant') jpcVersRestaurants++;
    else if (p.raison === 'trait_depenses_diverses') traitVersDiverses++;
    else if (p.raison === 'aubagne_explicitement_professionnel') aubagneVersFraisProfessionnels++;
  });

  SpreadsheetApp.flush();
  const resultat = {
    version: version,
    jpcVersRestaurants: jpcVersRestaurants,
    traitVersDepensesDiverses: traitVersDiverses,
    aubagneVersFraisProfessionnels: aubagneVersFraisProfessionnels,
    totalModifie: jpcVersRestaurants + traitVersDiverses + aubagneVersFraisProfessionnels
  };
  console.log(JSON.stringify(resultat));
  return resultat;
}

function auditerCoursesRestaurants20082026() {
  verifierInitialisation_();
  const version = '1.0';
  const ops = lireTable_('Operations');
  const anomalies = [];
  let jpcVues = 0;
  let jpcMontant = 0;
  let traitVues = 0;
  let traitMontant = 0;
  let aubagneExplicites = 0;
  let aubagneHorsFraisPro = 0;

  ops.forEach(o => {
    const l = normaliserLibelleAuditCoursesRestaurants20082026_(o.libelle);
    const montant = Math.abs(Number(o.montant || 0));
    const p = propositionAuditCoursesRestaurants20082026_(o);

    if (/^jpc(?: toulouse)?$/.test(l)) {
      jpcVues++;
      jpcMontant += montant;
    }
    if (l === 'sarl trait toulouse' || l === 'sarl trait') {
      traitVues++;
      traitMontant += montant;
    }
    if (estOperationAubagne20082026_(o)) {
      aubagneExplicites++;
      if (String(o.categorie || '') !== 'Frais professionnels') aubagneHorsFraisPro++;
    }

    if (p && String(o.categorie || '') !== p.categorie) {
      anomalies.push({
        id:o.id,
        libelle:o.libelle,
        montant:o.montant,
        categorie:o.categorie,
        attendue:p.categorie,
        raison:p.raison
      });
    }
  });

  const controles = {
    jpc_6_operations_restaurants: jpcVues === 6 && Math.abs(jpcMontant - 103) < 0.01 && !anomalies.some(a => a.raison === 'jpc_restaurant'),
    trait_1_operation_42_depenses_diverses: traitVues === 1 && Math.abs(traitMontant - 42) < 0.01 && !anomalies.some(a => a.raison === 'trait_depenses_diverses'),
    aubagne_explicitement_frais_professionnels: aubagneExplicites > 0 && aubagneHorsFraisPro === 0,
    aucune_anomalie_regles_structurelles: anomalies.length === 0
  };
  const resultat = {
    version:version,
    ok:Object.values(controles).every(Boolean),
    controles:controles,
    compteurs:{
      jpc:jpcVues,
      montantJpc:Math.round(jpcMontant * 100) / 100,
      trait:traitVues,
      montantTrait:Math.round(traitMontant * 100) / 100,
      aubagneExplicites:aubagneExplicites,
      aubagneHorsFraisProfessionnels:aubagneHorsFraisPro
    },
    anomalies:anomalies
  };
  console.log(JSON.stringify(resultat));
  return resultat;
}
