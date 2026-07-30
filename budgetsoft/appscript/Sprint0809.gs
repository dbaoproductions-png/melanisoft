const BUDGETSOFT_SPRINT_VERSION = '0.9.1';

function chargerConfigurationBudgetaire() {
  verifierInitialisation_();
  const parametres = lireTable_('Parametres');
  const dictionnaire = Object.fromEntries(parametres.map(p => [String(p.cle), p.valeur]));
  const jourDebut = bornerJourBudgetaire_(dictionnaire.jour_debut_mois || 28);
  const operations = lireTable_('Operations');
  return {
    version: BUDGETSOFT_SPRINT_VERSION,
    jourDebutMois: jourDebut,
    jourSalaire: bornerJourBudgetaire_(dictionnaire.jour_salaire || jourDebut),
    devise: String(dictionnaire.devise || 'EUR'),
    periodeCourante: calculerPeriodeBudgetaireAvecSalaire_(new Date(), jourDebut, operations)
  };
}

function enregistrerConfigurationBudgetaire(configuration) {
  verifierInitialisation_();
  const jourDebut = bornerJourBudgetaire_(configuration && configuration.jourDebutMois);
  const jourSalaire = bornerJourBudgetaire_(configuration && configuration.jourSalaire || jourDebut);
  enregistrerParametreSprint_('jour_debut_mois', jourDebut);
  enregistrerParametreSprint_('jour_salaire', jourSalaire);
  enregistrerParametreSprint_('version_interface', BUDGETSOFT_SPRINT_VERSION);
  return chargerConfigurationBudgetaire();
}

function calculerPeriodeBudgetaire(dateIso, jourDebut) {
  return calculerPeriodeBudgetaire_(dateIso ? new Date(dateIso) : new Date(), jourDebut);
}

function calculerPeriodeBudgetaire_(date, jourDebut) {
  return calculerPeriodeBudgetaireAvecSalaire_(date, jourDebut, []);
}

function calculerPeriodeBudgetaireAvecSalaire_(date, jourDebut, operations) {
  const jour = bornerJourBudgetaire_(jourDebut || 28);
  const reference = debutJour_(date instanceof Date && !isNaN(date) ? date : new Date());
  let debutNominal;
  let moisLibelle;

  if (reference.getDate() >= jour) {
    debutNominal = creerDateBudgetaire_(reference.getFullYear(), reference.getMonth(), jour);
    moisLibelle = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  } else {
    debutNominal = creerDateBudgetaire_(reference.getFullYear(), reference.getMonth() - 1, jour);
    moisLibelle = new Date(reference.getFullYear(), reference.getMonth(), 1);
  }

  const prochainNominal = creerDateBudgetaire_(debutNominal.getFullYear(), debutNominal.getMonth() + 1, jour);
  const debutReel = trouverSalaireAutourDate_(operations, debutNominal, 7) || debutNominal;
  const prochainSalaire = trouverSalaireAutourDate_(operations, prochainNominal, 7);
  const fin = prochainSalaire && prochainSalaire > debutReel
    ? new Date(prochainSalaire.getTime() - 1)
    : new Date(prochainNominal.getTime() - 1);

  return {
    debut: debutReel.toISOString(),
    fin: fin.toISOString(),
    cle: Utilities.formatDate(moisLibelle, Session.getScriptTimeZone(), 'yyyy-MM'),
    libelle: moisLibelle.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    jourDebut: debutReel.getDate(),
    jourReference: jour,
    debutAjusteSalaire: debutReel.getTime() !== debutNominal.getTime()
  };
}

function trouverSalaireAutourDate_(operations, dateReference, margeJours) {
  const debutFenetre = new Date(dateReference);
  debutFenetre.setDate(debutFenetre.getDate() - Math.max(0, margeJours || 0));
  const finFenetre = new Date(dateReference);
  finFenetre.setDate(finFenetre.getDate() + Math.max(0, margeJours || 0));

  const candidats = (operations || []).map(operation => {
    const date = new Date(operation.date);
    const montant = Number(operation.montant || 0);
    const texte = normaliserTexteBanque_([operation.libelle, operation.categorie, operation.commentaire].join(' '));
    const estSalaire = montant > 0 && /\b(SALAIRE|PAYE|TRAITEMENT)\b/.test(texte);
    return { date, estSalaire, ecart: Math.abs(date.getTime() - dateReference.getTime()) };
  }).filter(c => c.estSalaire && !isNaN(c.date) && c.date >= debutFenetre && c.date <= finFenetre)
    .sort((a, b) => a.ecart - b.ecart);

  return candidats.length ? debutJour_(candidats[0].date) : null;
}

function importerOperationsHelloBank(operations, compte) {
  verifierInitialisation_();
  if (!Array.isArray(operations) || !operations.length) throw new Error('Aucune opération PDF à importer.');
  if (!compte) throw new Error('Choisissez le compte bancaire concerné.');

  const existantes = lireTable_('Operations');
  const cles = new Set(existantes.map(cleOperationImport_));
  const charges = lireTable_('Charges_fixes').filter(c => convertirBooleen_(c.actif));
  const resultats = { importees: 0, doublons: 0, rapprochees: 0, erreurs: [] };

  operations.forEach((operation, index) => {
    try {
      const date = new Date(operation.date);
      const montant = convertirNombre_(operation.montant);
      const libelle = nettoyerLibelleHelloBank_(operation.libelle);
      if (isNaN(date.getTime()) || !libelle || !montant) throw new Error('ligne incomplète');
      const type = montant < 0 ? 'depense' : 'revenu';
      const cle = cleOperationImport_({ date, libelle, montant, compte });
      if (cles.has(cle)) { resultats.doublons++; return; }

      const rapprochement = rapprocherChargeFixe_(libelle, Math.abs(montant), compte, charges);
      const marqueur = '[PDF:HELLOBANK:' + Utilities.base64EncodeWebSafe(cle).slice(0, 28) + ']';
      const commentaire = [
        operation.details || '',
        marqueur,
        rapprochement ? '[RAPPROCHEMENT:' + rapprochement.id + ':' + rapprochement.score + ']' : ''
      ].filter(Boolean).join(' ');

      enregistrerLigne('Operations', {
        date,
        libelle,
        categorie: rapprochement ? rapprochement.categorie : suggererCategorieHelloBank_(libelle, type),
        compte,
        montant: Math.abs(montant),
        type,
        commentaire
      });
      cles.add(cle);
      resultats.importees++;
      if (rapprochement) resultats.rapprochees++;
    } catch (e) {
      resultats.erreurs.push('Ligne ' + (index + 1) + ' : ' + e.message);
    }
  });
  return resultats;
}

function rapprocherChargeFixe_(libelle, montant, compte, charges) {
  const normalise = normaliserTexteBanque_(libelle);
  let meilleur = null;
  charges.forEach(charge => {
    if (String(charge.compte) !== String(compte)) return;
    const attendu = normaliserTexteBanque_(charge.libelle_bancaire || charge.libelle);
    const mots = attendu.split(' ').filter(m => m.length > 2);
    const motsTrouves = mots.filter(m => normalise.includes(m)).length;
    const scoreLibelle = mots.length ? Math.round(70 * motsTrouves / mots.length) : 0;
    const tolerance = Math.max(0.01, Number(charge.tolerance) || 0.50);
    const ecart = Math.abs(Number(charge.montant) - montant);
    const scoreMontant = ecart <= tolerance ? 30 : Math.max(0, Math.round(30 - (ecart / Math.max(montant, 1)) * 100));
    const score = scoreLibelle + scoreMontant;
    if (score >= 70 && (!meilleur || score > meilleur.score)) meilleur = { id: charge.id, categorie: charge.categorie || '', score };
  });
  return meilleur;
}

function suggererCategorieHelloBank_(libelle, type) {
  if (type === 'revenu') return /SALAIRE|PAYE|FRANCE TRAVAIL|LOYER/i.test(libelle) ? 'Revenus' : '';
  const regles = [
    [/CARREFOUR|LECLERC|INTERMARCHE|ALDI|MONOPRIX|BOUCHERIE|BOULAN/i, 'Courses'],
    [/PHARMAC|QARE|MUTUELLE|SANTE|AUDIENS/i, 'Santé'],
    [/TISSEO|EFFIA|AUTOROUTE|ALVEA|TOTAL STATION/i, 'Transport'],
    [/LEROY|BRICASTE|ADEO/i, 'Logement'],
    [/FREE|SFR|BOUYGUES|MOBILE|TELECOM/i, 'Télécommunications'],
    [/D\.G\.F\.I\.P|IMPOT/i, 'Impôts'],
    [/KOZOO|VET /i, 'Animaux'],
    [/DEEZER|GOOGLE ONE|OPENAI|IONOS|OPODO PRIME|FAMILO/i, 'Abonnements'],
    [/CASDEN|COFIDIS|CREATIS|FLOA|ONEY|CARREFOUR BANQUE/i, 'Crédits']
  ];
  const trouvee = regles.find(r => r[0].test(libelle));
  return trouvee ? trouvee[1] : '';
}

function nettoyerLibelleHelloBank_(texte) {
  return String(texte || '').replace(/\s+/g, ' ').replace(/^FACTURE\(S\) CARTE\s+\S+\s*/i, '').trim().slice(0, 120);
}

function normaliserTexteBanque_(texte) {
  return String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

function cleOperationImport_(operation) {
  const date = new Date(operation.date);
  const dateCle = isNaN(date) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return [dateCle, normaliserTexteBanque_(operation.libelle), Number(operation.montant || 0).toFixed(2), String(operation.compte || '')].join('|');
}

function enregistrerParametreSprint_(cle, valeur) {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Parametres');
  const lignes = feuille.getLastRow() > 1 ? feuille.getRange(2, 1, feuille.getLastRow() - 1, 2).getValues() : [];
  const index = lignes.findIndex(l => String(l[0]).trim() === cle);
  if (index >= 0) feuille.getRange(index + 2, 2).setValue(valeur);
  else feuille.appendRow([cle, valeur]);
}

function bornerJourBudgetaire_(valeur) {
  return Math.max(1, Math.min(28, parseInt(valeur, 10) || 28));
}

function creerDateBudgetaire_(annee, mois, jour) {
  return new Date(annee, mois, Math.min(jour, new Date(annee, mois + 1, 0).getDate()));
}
