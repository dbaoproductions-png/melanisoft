function analyserImportChargesFixes(texte) {
  verifierInitialisation_();
  const lignes = parserTableauImport_(texte);
  const comptes = lireTable_('Comptes');
  const categories = lireTable_('Categories');
  const charges = lireTable_('Charges_fixes');
  const comptesParNom = indexerParNom_(comptes, 'nom');
  const categoriesParNom = indexerParNom_(categories, 'nom');
  const chargesParCle = {};
  charges.forEach(c => chargesParCle[cleImport_(c.libelle, c.compte)] = c);

  const resultat = lignes.map((ligne, index) => {
    const erreurs = [];
    const avertissements = [];
    const libelle = String(ligne.libelle || '').trim();
    const montant = convertirNombreImport_(ligne.montant);
    const jour = parseInt(ligne.jour || ligne.jour_execution, 10);
    const compteSaisi = String(ligne.compte || '').trim();
    const categorie = String(ligne.categorie || '').trim();
    const frequence = String(ligne.frequence || 'Mensuelle').trim();
    const libelleBancaire = String(ligne.libelle_bancaire || '').trim();
    const tolerance = ligne.tolerance === '' || ligne.tolerance == null
      ? 0.50
      : convertirNombreImport_(ligne.tolerance);
    const actif = convertirBooleenImport_(ligne.actif == null || ligne.actif === '' ? ligne.active : ligne.actif, true);
    const compteTrouve = comptesParNom[normaliserTexteImport_(compteSaisi)] || comptes.find(c => String(c.id) === compteSaisi);

    if (!libelle) erreurs.push('Libellé manquant');
    if (!Number.isFinite(montant) || montant <= 0) erreurs.push('Montant invalide');
    if (!jour || jour < 1 || jour > 31) erreurs.push('Jour d’échéance invalide');
    if (!compteTrouve) erreurs.push('Compte inconnu : ' + (compteSaisi || 'non renseigné'));
    if (!libelleBancaire) erreurs.push('Libellé bancaire manquant');
    if (!Number.isFinite(tolerance) || tolerance < 0) erreurs.push('Tolérance invalide');
    if (categorie && !categoriesParNom[normaliserTexteImport_(categorie)]) avertissements.push('Nouvelle catégorie : ' + categorie);

    const doublon = compteTrouve
      ? chargesParCle[cleImport_(libelle, compteTrouve.id)] || chargesParCle[cleImport_(libelle, compteTrouve.nom)]
      : null;

    return {
      numero: index + 1,
      libelle,
      montant,
      jour_execution: jour,
      compte: compteTrouve ? compteTrouve.id : compteSaisi,
      compte_nom: compteTrouve ? compteTrouve.nom : compteSaisi,
      categorie,
      frequence,
      libelle_bancaire: libelleBancaire,
      tolerance,
      actif,
      erreurs,
      avertissements,
      doublon_id: doublon ? doublon.id : '',
      action: doublon ? 'mettre_a_jour' : 'creer',
      valide: erreurs.length === 0
    };
  });

  return {
    lignes: resultat,
    total: resultat.length,
    valides: resultat.filter(l => l.valide).length,
    invalides: resultat.filter(l => !l.valide).length,
    doublons: resultat.filter(l => l.doublon_id).length,
    nouvellesCategories: [...new Set(resultat
      .flatMap(l => l.avertissements)
      .filter(a => a.indexOf('Nouvelle catégorie : ') === 0)
      .map(a => a.replace('Nouvelle catégorie : ', '')))]
  };
}

function importerChargesFixes(lignes, creerCategories) {
  verifierInitialisation_();
  if (!Array.isArray(lignes) || !lignes.length) throw new Error('Aucune ligne à importer.');
  const categoriesExistantes = indexerParNom_(lireTable_('Categories'), 'nom');
  const bilan = { creees: 0, misesAJour: 0, ignorees: 0, erreurs: [] };

  lignes.forEach((ligne, index) => {
    try {
      if (!ligne.valide || ligne.action === 'ignorer') {
        bilan.ignorees++;
        return;
      }

      const categorie = String(ligne.categorie || '').trim();
      if (categorie && creerCategories && !categoriesExistantes[normaliserTexteImport_(categorie)]) {
        enregistrerLigne('Categories', { nom: categorie, type: 'depense', couleur: '', actif: true });
        categoriesExistantes[normaliserTexteImport_(categorie)] = true;
      }

      enregistrerLigne('Charges_fixes', {
        id: ligne.doublon_id && ligne.action === 'mettre_a_jour' ? ligne.doublon_id : '',
        libelle: ligne.libelle,
        categorie,
        compte: ligne.compte,
        montant: ligne.montant,
        type: 'depense',
        jour_execution: ligne.jour_execution,
        frequence: ligne.frequence || 'Mensuelle',
        libelle_bancaire: ligne.libelle_bancaire || '',
        tolerance: Number.isFinite(Number(ligne.tolerance)) ? Number(ligne.tolerance) : 0.50,
        date_debut: new Date(),
        date_fin: '',
        actif: ligne.actif !== false,
        commentaire: 'Import BudgetSoft 0.6'
      });

      if (ligne.doublon_id && ligne.action === 'mettre_a_jour') bilan.misesAJour++;
      else bilan.creees++;
    } catch (e) {
      bilan.erreurs.push('Ligne ' + (index + 1) + ' : ' + e.message);
    }
  });

  journaliserImport_(bilan);
  return bilan;
}

function parserTableauImport_(texte) {
  const brut = String(texte || '').trim();
  if (!brut) throw new Error('Collez d’abord un tableau Excel ou CSV.');
  const lignes = brut.split(/\r?\n/).filter(l => l.trim());
  if (lignes.length < 2) throw new Error('Le tableau doit contenir une ligne d’en-têtes et au moins une charge.');
  const separateur = lignes[0].indexOf('\t') >= 0 ? '\t' : (lignes[0].indexOf(';') >= 0 ? ';' : ',');
  const entetes = lignes.shift().split(separateur).map(normaliserEnteteImport_);
  return lignes.map(l => {
    const cellules = l.split(separateur);
    return Object.fromEntries(entetes.map((h, i) => [h, cellules[i] == null ? '' : cellules[i].trim()]));
  });
}

function normaliserEnteteImport_(v) {
  const n = normaliserTexteImport_(v).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const alias = {
    libelle_charge: 'libelle',
    montant_mensuel: 'montant',
    jour_du_mois: 'jour',
    jour_d_echeance: 'jour',
    date_d_echeance: 'jour',
    echeance: 'jour',
    jour_execution: 'jour',
    nom_du_compte: 'compte',
    libelle_bancaire_de_reconnaissance: 'libelle_bancaire',
    libelle_de_reconnaissance: 'libelle_bancaire',
    mot_cle_bancaire: 'libelle_bancaire',
    marge: 'tolerance',
    active: 'actif'
  };
  return alias[n] || n;
}

function convertirNombreImport_(v) {
  const n = Number(String(v == null ? '' : v).replace(/€/g, '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.abs(n) : NaN;
}

function convertirBooleenImport_(v, valeurParDefaut) {
  if (v == null || String(v).trim() === '') return valeurParDefaut;
  const n = normaliserTexteImport_(v);
  if (['oui', 'true', '1', 'actif', 'active'].includes(n)) return true;
  if (['non', 'false', '0', 'inactif', 'inactive'].includes(n)) return false;
  return valeurParDefaut;
}

function normaliserTexteImport_(v) {
  return String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function indexerParNom_(lignes, champ) {
  return Object.fromEntries(lignes.map(l => [normaliserTexteImport_(l[champ]), l]));
}

function cleImport_(libelle, compte) {
  return normaliserTexteImport_(libelle) + '|' + normaliserTexteImport_(compte);
}

function journaliserImport_(bilan) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let feuille = ss.getSheetByName('Journal');
  if (!feuille) {
    feuille = ss.insertSheet('Journal');
    feuille.appendRow(['date', 'action', 'details', 'utilisateur']);
    feuille.setFrozenRows(1);
    feuille.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff');
  }
  feuille.appendRow([
    new Date(),
    'Import charges fixes',
    bilan.creees + ' créée(s), ' + bilan.misesAJour + ' mise(s) à jour, ' + bilan.ignorees + ' ignorée(s)',
    Session.getActiveUser().getEmail() || 'Utilisateur'
  ]);
}