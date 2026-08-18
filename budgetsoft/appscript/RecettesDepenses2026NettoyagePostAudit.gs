function nettoyerPostAuditRecettesDepenses18082026() {
  verifierInitialisation_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maintenant = new Date().toISOString();
  const resultat = { reglesMigrees: 0, parametrePrimes: false, bikiniModifie: 0 };

  // 1. Les anciennes règles Restaurants / sorties doivent viser Restaurants.
  const fr = ss.getSheetByName('Regles_categories');
  if (fr && fr.getLastRow() > 1) {
    const valeurs = fr.getDataRange().getValues();
    const entetes = valeurs[0].map(String);
    const iCat = entetes.indexOf('categorie');
    const iActif = entetes.indexOf('actif');
    const iMod = entetes.indexOf('modifie_le');
    let change = false;
    for (let r = 1; r < valeurs.length; r++) {
      const actif = iActif < 0 || valeurs[r][iActif] === true || String(valeurs[r][iActif]).toLowerCase() === 'true' || String(valeurs[r][iActif]) === '1';
      if (actif && String(valeurs[r][iCat] || '').trim() === 'Restaurants / sorties') {
        valeurs[r][iCat] = 'Restaurants';
        if (iMod >= 0) valeurs[r][iMod] = maintenant;
        resultat.reglesMigrees++;
        change = true;
      }
    }
    if (change) fr.getRange(2, 1, valeurs.length - 1, valeurs[0].length).setValues(valeurs.slice(1));
  }

  // 2. Stocker les mois de primes comme texte non ambigu.
  const fp = ss.getSheetByName('Parametres');
  if (fp && fp.getLastRow() > 1) {
    const valeurs = fp.getDataRange().getValues();
    const entetes = valeurs[0].map(String);
    const iCle = entetes.indexOf('cle');
    const iVal = entetes.indexOf('valeur');
    for (let r = 1; r < valeurs.length; r++) {
      if (String(valeurs[r][iCle] || '').trim() === 'salaire_mois_primes') {
        fp.getRange(r + 1, iVal + 1).setNumberFormat('@').setValue('6|11|12');
        resultat.parametrePrimes = true;
        break;
      }
    }
  }

  // 3. Le Bikini : aucune règle globale. Les CB restaurant restent Restaurants ; le Wero concert déjà Loisirs reste inchangé.
  // On ne modifie volontairement aucune opération Bikini ici.

  return resultat;
}
