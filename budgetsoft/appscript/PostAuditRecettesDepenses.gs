function nettoyerPostAuditRecettesDepenses18082026() {
  verifierInitialisation_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resultat = {
    reglesMigrees: 0,
    parametrePrimes: false,
    restaurantsSortiesRestantes: 0
  };

  // 1) Réparer le paramètre des mois de primes en texte non ambigu.
  const paramSheet = ss.getSheetByName('Parametres');
  if (paramSheet && paramSheet.getLastRow() >= 1) {
    const valeurs = paramSheet.getDataRange().getValues();
    const entetes = valeurs[0].map(v => String(v || '').trim());
    const idxCle = entetes.indexOf('cle');
    const idxValeur = entetes.indexOf('valeur');
    let trouve = false;
    if (idxCle >= 0 && idxValeur >= 0) {
      for (let i = 1; i < valeurs.length; i++) {
        if (String(valeurs[i][idxCle] || '').trim() === 'salaire_mois_primes') {
          paramSheet.getRange(i + 1, idxValeur + 1).setNumberFormat('@').setValue('6|11|12');
          trouve = true;
          resultat.parametrePrimes = true;
          break;
        }
      }
      if (!trouve) {
        const ligne = new Array(entetes.length).fill('');
        ligne[idxCle] = 'salaire_mois_primes';
        ligne[idxValeur] = '6|11|12';
        paramSheet.appendRow(ligne);
        paramSheet.getRange(paramSheet.getLastRow(), idxValeur + 1).setNumberFormat('@');
        resultat.parametrePrimes = true;
      }
    }
  }

  // 2) Migrer uniquement les règles encore pointées vers l'ancienne catégorie.
  const reglesSheet = ss.getSheetByName('Regles_categories');
  if (reglesSheet && reglesSheet.getLastRow() > 1) {
    const valeurs = reglesSheet.getDataRange().getValues();
    const entetes = valeurs[0].map(v => String(v || '').trim());
    const idxCategorie = entetes.indexOf('categorie');
    const idxActif = entetes.indexOf('actif');
    const idxModifie = entetes.indexOf('modifie_le');
    if (idxCategorie >= 0) {
      let changes = 0;
      for (let i = 1; i < valeurs.length; i++) {
        const categorie = String(valeurs[i][idxCategorie] || '').trim();
        const actif = idxActif < 0 ? true : !['0','false','non'].includes(String(valeurs[i][idxActif] || '').trim().toLowerCase());
        if (categorie === 'Restaurants / sorties' && actif) {
          valeurs[i][idxCategorie] = 'Restaurants';
          if (idxModifie >= 0) valeurs[i][idxModifie] = new Date();
          changes++;
        }
      }
      if (changes) {
        reglesSheet.getRange(2, 1, valeurs.length - 1, entetes.length).setValues(valeurs.slice(1));
      }
      resultat.reglesMigrees = changes;
      resultat.restaurantsSortiesRestantes = valeurs.slice(1).filter(r => String(r[idxCategorie] || '').trim() === 'Restaurants / sorties').length;
    }
  }

  SpreadsheetApp.flush();
  return resultat;
}
