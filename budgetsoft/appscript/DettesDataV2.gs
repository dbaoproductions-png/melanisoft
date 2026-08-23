const DETTES_DATA_V2_VERSION = '1.0-2026-08-20';

const DETTES_STRUCTURELLES_20082026 = [
  {
    source_cle: 'conservatoire-studio-42-20',
    nom: 'Studio Conservatoire',
    creancier: 'Conservatoire',
    categorie_dette: 'Conservatoire',
    montant_initial: 42.20,
    capital_restant: 42.20,
    mensualite: 0,
    taux: 0,
    date_echeance: '',
    statut: 'a_payer',
    priorite: 'non_definie',
    commentaire: 'Dette hors crédit communiquée le 20/08/2026.',
    actif: true
  },
  {
    source_cle: 'conservatoire-scolarite-400',
    nom: 'Frais de scolarité Conservatoire',
    creancier: 'Conservatoire',
    categorie_dette: 'Conservatoire',
    montant_initial: 400,
    capital_restant: 400,
    mensualite: 0,
    taux: 0,
    date_echeance: '',
    statut: 'a_payer',
    priorite: 'non_definie',
    commentaire: 'Dette hors crédit communiquée le 20/08/2026.',
    actif: true
  },
  {
    source_cle: 'dentiste-protheses-800',
    nom: 'Dentiste (prothèses)',
    creancier: 'Dentiste',
    categorie_dette: 'Santé',
    montant_initial: 800,
    capital_restant: 800,
    mensualite: 0,
    taux: 0,
    date_echeance: '',
    statut: 'a_payer',
    priorite: 'non_definie',
    commentaire: 'Dette hors crédit communiquée le 20/08/2026.',
    actif: true
  }
];

function assurerTableDettesV2_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let f = ss.getSheetByName('Dettes');
  if (!f) f = ss.insertSheet('Dettes');

  const colonnes = [
    'id', 'source_cle', 'nom', 'creancier', 'categorie_dette',
    'montant_initial', 'capital_restant', 'mensualite', 'taux',
    'date_echeance', 'statut', 'priorite', 'commentaire', 'actif'
  ];

  let entetes = f.getLastColumn() > 0
    ? f.getRange(1, 1, 1, Math.max(1, f.getLastColumn())).getValues()[0].map(v => String(v || '').trim())
    : [];
  const vide = !entetes.some(Boolean);
  if (vide) {
    f.getRange(1, 1, 1, colonnes.length).setValues([colonnes]);
    entetes = colonnes.slice();
  } else {
    colonnes.forEach(c => {
      if (entetes.indexOf(c) < 0) {
        f.getRange(1, entetes.length + 1).setValue(c);
        entetes.push(c);
      }
    });
  }
  return { feuille: f, entetes: entetes };
}

function migrerDettesStructurelles20082026_() {
  const t = assurerTableDettesV2_();
  const f = t.feuille;
  const entetes = t.entetes;
  const index = Object.fromEntries(entetes.map((h, i) => [h, i]));
  const valeurs = f.getLastRow() > 1 ? f.getRange(2, 1, f.getLastRow() - 1, entetes.length).getValues() : [];

  DETTES_STRUCTURELLES_20082026.forEach(modele => {
    let pos = valeurs.findIndex(l => String(l[index.source_cle] || '').trim() === modele.source_cle);
    if (pos < 0) {
      const ligne = Array(entetes.length).fill('');
      ligne[index.id] = Utilities.getUuid();
      Object.keys(modele).forEach(k => { if (index[k] !== undefined) ligne[index[k]] = modele[k]; });
      f.appendRow(ligne);
      valeurs.push(ligne);
    } else {
      const numeroLigne = pos + 2;
      Object.keys(modele).forEach(k => {
        if (index[k] === undefined) return;
        const cellule = f.getRange(numeroLigne, index[k] + 1);
        // Les montants structurels sont restaurés seulement si la cellule est vide ;
        // une mise à jour ultérieure (paiement partiel, statut, échéance...) est conservée.
        const actuel = cellule.getValue();
        if (actuel === '' || actuel === null) cellule.setValue(modele[k]);
      });
    }
  });
  SpreadsheetApp.flush();
  return lireDettesV2_();
}

function lireDettesV2_() {
  const t = assurerTableDettesV2_();
  const f = t.feuille;
  if (f.getLastRow() < 2) return [];
  const valeurs = f.getRange(2, 1, f.getLastRow() - 1, t.entetes.length).getValues();
  return valeurs.filter(l => l.some(v => v !== '' && v !== null)).map(l => {
    const o = {};
    t.entetes.forEach((h, i) => { if (h) o[h] = serialiserValeur_(l[i]); });
    return o;
  });
}

function chargerDettesHorsCreditV2() {
  migrerDettesStructurelles20082026_();
  const dettes = lireDettesV2_();
  const actives = dettes.filter(d => String(d.actif).toLowerCase() !== 'false' && Number(d.capital_restant || 0) > 0);
  return {
    version: DETTES_DATA_V2_VERSION,
    lignes: dettes,
    actives: actives,
    nombreActives: actives.length,
    totalRestant: Math.round(actives.reduce((s, d) => s + Math.abs(Number(d.capital_restant || 0)), 0) * 100) / 100
  };
}
