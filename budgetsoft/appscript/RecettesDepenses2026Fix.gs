function assurerTableReglesCategories2026_() {
  const entetes = ['id', 'motif', 'categorie', 'type', 'actif', 'cree_le', 'modifie_le'];
  TABLES.Regles_categories = entetes;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let feuille = ss.getSheetByName('Regles_categories');
  if (!feuille) feuille = ss.insertSheet('Regles_categories');
  if (feuille.getLastRow() === 0) {
    feuille.getRange(1, 1, 1, entetes.length).setValues([entetes]);
  } else {
    const largeur = Math.max(feuille.getLastColumn(), 1);
    const presentes = feuille.getRange(1, 1, 1, largeur).getValues()[0].map(v => String(v || '').trim());
    const manquantes = entetes.filter(e => !presentes.includes(e));
    if (manquantes.length) feuille.getRange(1, largeur + 1, 1, manquantes.length).setValues([manquantes]);
  }
  feuille.setFrozenRows(1);
  feuille.getRange(1, 1, 1, entetes.length).setFontWeight('bold').setBackground('#147d64').setFontColor('#ffffff');
  return true;
}

function appliquerCorrectifsRecettesDepenses18082026_v2() {
  assurerTableReglesCategories2026_();
  return appliquerCorrectifsRecettesDepenses18082026();
}
