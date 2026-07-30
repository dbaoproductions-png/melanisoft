function importerOperationsHelloBank(operations, compte) {
  verifierInitialisation_();
  initialiserCorrespondancesBancaires();
  if (!Array.isArray(operations) || !operations.length) throw new Error('Aucune opération PDF à importer.');
  if (!compte) throw new Error('Choisissez le compte bancaire concerné.');

  const existantes = lireTable_('Operations');
  const cles = new Set(existantes.map(cleOperationImport_));
  const charges = lireTable_('Charges_fixes').filter(c => convertirBooleen_(c.actif));
  const correspondances = lireCorrespondancesBancaires();
  const resultats = { importees: 0, doublons: 0, rapprochees: 0, reconnues: 0, apprises: 0, erreurs: [] };

  operations.forEach((operation, index) => {
    try {
      const date = new Date(operation.date);
      const montant = convertirNombre_(operation.montant);
      const libelleBrut = nettoyerLibelleHelloBank_(operation.libelle);
      if (isNaN(date.getTime()) || !libelleBrut || !montant) throw new Error('ligne incomplète');
      const type = montant < 0 ? 'depense' : 'revenu';
      const cle = cleOperationImport_({ date, libelle: libelleBrut, montant, compte });
      if (cles.has(cle)) { resultats.doublons++; return; }

      const correspondance = trouverCorrespondanceBancaire_(libelleBrut, compte, correspondances);
      const rapprochement = rapprocherChargeFixe_(libelleBrut, Math.abs(montant), compte, charges);
      const libelleNormalise = correspondance?.libelle_normalise || rapprochement?.libelle || proposerLibelleNormalise_(libelleBrut);
      const categorie = correspondance?.categorie || rapprochement?.categorie || suggererCategorieHelloBank_(libelleBrut, type);
      const typeFinal = correspondance?.type || type;
      const marqueur = '[PDF:HELLOBANK:' + Utilities.base64EncodeWebSafe(cle).slice(0, 28) + ']';
      const commentaire = [
        'Libellé bancaire : ' + libelleBrut,
        operation.details && operation.details !== libelleBrut ? operation.details : '',
        marqueur,
        correspondance ? '[CORRESPONDANCE:' + correspondance.id + ']' : '',
        rapprochement ? '[RAPPROCHEMENT:' + rapprochement.id + ':' + rapprochement.score + ']' : ''
      ].filter(Boolean).join(' ');

      enregistrerLigne('Operations', {
        date,
        libelle: libelleNormalise,
        categorie,
        compte,
        montant: Math.abs(montant),
        type: typeFinal,
        commentaire
      });

      cles.add(cle);
      resultats.importees++;
      if (correspondance) resultats.reconnues++;
      if (rapprochement) resultats.rapprochees++;

      if (!correspondance && (categorie || rapprochement)) {
        const apprise = apprendreCorrespondanceBancaire_(
          { libelle: libelleBrut, compte },
          { libelle_normalise: libelleNormalise, categorie, type: typeFinal },
          correspondances
        );
        if (apprise) {
          correspondances.push(apprise);
          resultats.apprises++;
        }
      } else if (correspondance) {
        correspondance.utilisations = Number(correspondance.utilisations || 0) + 1;
        correspondance.derniere_utilisation = new Date().toISOString();
        enregistrerCorrespondanceBancaire(correspondance);
      }
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
    if (score >= 70 && (!meilleur || score > meilleur.score)) meilleur = { id: charge.id, libelle: charge.libelle || '', categorie: charge.categorie || '', score };
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
    [/CASDEN|COFIDIS|CREATIS|FLOA|ONEY|CARREFOUR BANQUE/i, 'Crédits'],
    [/SURAVENIR|ASSURANCE|MAIF|MACIF|AXA|ALLIANZ/i, 'Assurances'],
    [/TOTALENERGIES|EDF|ENGIE/i, 'Logement'],
    [/COMMISSIONS|FRAIS BANCAIRES|HELLO PRIME/i, 'Frais bancaires']
  ];
  const trouvee = regles.find(r => r[0].test(libelle));
  return trouvee ? trouvee[1] : '';
}

function nettoyerLibelleHelloBank_(texte) {
  return String(texte || '').replace(/\s+/g, ' ').replace(/^FACTURE\(S\) CARTE\s+\S+\s*/i, '').trim().slice(0, 160);
}

function normaliserTexteBanque_(texte) {
  return String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

function cleOperationImport_(operation) {
  const date = new Date(operation.date);
  const dateCle = isNaN(date) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return [dateCle, normaliserTexteBanque_(operation.libelle), Number(operation.montant || 0).toFixed(2), String(operation.compte || '')].join('|');
}
