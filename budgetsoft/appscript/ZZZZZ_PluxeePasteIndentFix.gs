// Correctif du parseur copier-coller Pluxee.
// Le Markdown copié depuis l'historique Pluxee indente la plupart des lignes
// (ex. "  ##### 22/08/2026 à 14h09"). Il faut supprimer l'indentation
// avant les marqueurs Markdown, sinon seules les premières lignes non indentées
// sont reconnues.

function nettoyerLigneCollerPluxee_(s){
  return String(s||'')
    .replace(/^\s*[-*]+\s*/,'')
    .replace(/^\s*#+\s*/,'')
    .replace(/\[image\]\([^)]*\)/ig,'')
    .replace(/\s+/g,' ')
    .trim();
}
