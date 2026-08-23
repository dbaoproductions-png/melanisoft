const AUDIT_CORRECTIFS_18082026_VERSION = '2026-08-18.1';

/**
 * Correctifs sûrs issus de l'audit fonctionnel du 18/08/2026.
 * Ne supprime aucune opération et ne crée aucune opération bancaire fictive.
 * Les doublons de charges fixes non confirmés (Google One, ancienne mensualité mobile)
 * sont volontairement laissés intacts pour validation humaine.
 */
function appliquerAuditCorrectifs18082026() {
  verifierInitialisation_();
  const resultat = {
    version: AUDIT_CORRECTIFS_18082026_VERSION,
    correspondances: corrigerCorrespondancesAudit18082026_(),
    credits: corrigerTypesCreditsAudit18082026_()
  };
  return resultat;
}

function corrigerCorrespondancesAudit18082026_() {
  if (typeof lireCorrespondancesBancaires !== 'function') return { modifiees: 0, detail: [] };
  const lignes = lireCorrespondancesBancaires();
  const detail = [];
  const misesAJour = [];

  function changer(c, categorie, libelle) {
    if (!c) return;
    const copie = Object.assign({}, c);
    let change = false;
    if (categorie && String(copie.categorie || '') !== categorie) { copie.categorie = categorie; change = true; }
    if (libelle && String(copie.libelle_normalise || '') !== libelle) { copie.libelle_normalise = libelle; change = true; }
    if (change) {
      misesAJour.push(copie);
      detail.push({ motif: copie.motif_bancaire, categorie: copie.categorie, libelle: copie.libelle_normalise });
    }
  }

  lignes.forEach(c => {
    const motif = normaliserTexteBanque_(c.motif_bancaire || '');
    const lib = normaliserTexteBanque_(c.libelle_normalise || '');

    // Salaires mairie : les anciennes règles ne doivent plus recréer "Autres revenus".
    if (/PAYE0[123].*MAIRIE.*TOULOUSE|MAIRIE.*TOULOUSE.*PAYE/.test(motif + ' ' + lib)) changer(c, 'Salaires', null);

    // France Travail dispose désormais de sa catégorie dédiée.
    if (/FRANCE TRAVAIL/.test(motif + ' ' + lib)) changer(c, 'France Travail', 'France Travail');

    // Ancienne catégorie hybride supprimée lors de l'audit Restaurants/Loisirs.
    if (/ZETTLE ALZEN K/.test(motif)) changer(c, 'Restaurants', 'Zettle Alzen K');

    // Les contrats Suravenir sont des assurances, pas des crédits.
    if (/^SURAVENIR(?: |$)/.test(motif)) changer(c, 'Assurances', null);

    // TotalEnergies doit rester dans le thème énergie quelle que soit la variante du libellé.
    if (/TOTALENERGIES.*ELECTRICITE.*GAZ/.test(motif + ' ' + lib)) changer(c, 'Énergies', null);
  });

  if (misesAJour.length && typeof enregistrerCorrespondancesBancairesEnLot_ === 'function') {
    enregistrerCorrespondancesBancairesEnLot_(misesAJour);
  }
  return { modifiees: misesAJour.length, detail: detail };
}

function corrigerTypesCreditsAudit18082026_() {
  const credits = lireTable_('Credits');
  let modifiees = 0;
  const detail = [];
  credits.forEach(c => {
    const texte = normaliserTexteBanque_([c.nom || '', c.numero_pret || ''].join(' '));
    const revolving = /CARREFOUR.*PASS|ACCESSIO|FLOA.*CDISCOUNT|ONEY.*B\+|CARTE B\+/.test(texte);
    const amortissable = /\bCASDEN\b|\bCREATIS\b|^COFIDIS(?: |$)/.test(texte) && !/ACCESSIO/.test(texte);
    const cible = revolving ? 'revolving' : (amortissable ? 'amortissable' : '');
    if (!cible || String(c.type_credit || '').toLowerCase() === cible) return;
    enregistrerLigne('Credits', Object.assign({}, c, { type_credit: cible }));
    modifiees++;
    detail.push({ nom: c.nom, type_credit: cible });
  });
  return { modifiees: modifiees, detail: detail };
}
