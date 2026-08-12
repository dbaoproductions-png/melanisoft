function reconnaitreOperationsHelloBankCollees() {
  verifierInitialisation_();
  const correspondances = lireCorrespondancesBancaires();
  if (!correspondances.length) return { examinees: 0, reconnues: 0, modifiees: 0 };

  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');
  if (!feuille || feuille.getLastRow() < 2) return { examinees: 0, reconnues: 0, modifiees: 0 };

  const entetes = TABLES.Operations;
  const valeurs = feuille.getRange(2, 1, feuille.getLastRow() - 1, entetes.length).getValues();
  const idx = Object.fromEntries(entetes.map((h, i) => [h, i]));
  let examinees = 0, reconnues = 0, modifiees = 0;

  valeurs.forEach(ligne => {
    const commentaire = String(ligne[idx.commentaire] || '');
    if (!commentaire.includes('[HELLOBANK_COLLER]')) return;
    examinees++;

    const compte = String(ligne[idx.compte] || '');
    const libelleActuel = String(ligne[idx.libelle] || '');
    const brutMatch = commentaire.match(/Libellé bancaire\s*:\s*(.+?)(?=\s+\[CARTE_DIFFEREE:|\s+Date achat\s*:|\s+Débit prévu\s*:|$)/i);
    const libelleBrut = brutMatch ? brutMatch[1].trim() : libelleActuel;
    const correspondance = trouverCorrespondanceBancaire_(libelleBrut, compte, correspondances);
    if (!correspondance) return;
    reconnues++;

    const nouveauLibelle = String(correspondance.libelle_normalise || libelleActuel).trim();
    const nouvelleCategorie = String(correspondance.categorie || ligne[idx.categorie] || '').trim();
    const nouveauType = String(correspondance.type || ligne[idx.type] || '').trim().toLowerCase();

    let change = false;
    if (nouveauLibelle && nouveauLibelle !== libelleActuel) { ligne[idx.libelle] = nouveauLibelle; change = true; }
    if (nouvelleCategorie && nouvelleCategorie !== String(ligne[idx.categorie] || '')) { ligne[idx.categorie] = nouvelleCategorie; change = true; }
    if (nouveauType && nouveauType !== String(ligne[idx.type] || '').toLowerCase()) {
      ligne[idx.type] = nouveauType;
      const m = Math.abs(Number(ligne[idx.montant] || 0));
      ligne[idx.montant] = nouveauType === 'depense' ? -m : m;
      change = true;
    }
    if (change) {
      ligne[idx.modifie_le] = new Date().toISOString();
      modifiees++;
      correspondance.utilisations = Number(correspondance.utilisations || 0) + 1;
      correspondance.derniere_utilisation = new Date().toISOString();
    }
  });

  if (modifiees) {
    feuille.getRange(2, 1, valeurs.length, entetes.length).setValues(valeurs);
    enregistrerCorrespondancesBancairesEnLot_(correspondances);
    SpreadsheetApp.flush();
  }
  return { examinees, reconnues, modifiees };
}

function importerCollerHelloBankAvecApprentissage(lignes) {
  const resultat = importerCollerHelloBank(lignes);
  const apprentissage = reconnaitreOperationsHelloBankCollees();
  return Object.assign({}, resultat, { apprentissage });
}
