// Correctif du parseur copier-coller Pluxee.
// Les puces Markdown doivent être supprimées sans retirer le signe d'un montant
// négatif (ex. "-1,20 €"). Un tiret n'est donc considéré comme une puce que
// lorsqu'il est suivi d'un espace.

function nettoyerLigneCollerPluxee_(s){
  return String(s||'')
    .replace(/^\s*(?:[*•]+\s*|[-–—]+\s+)/,'')
    .replace(/^\s*#+\s*/,'')
    .replace(/\[image\]\([^)]*\)/ig,'')
    .replace(/\s+/g,' ')
    .trim();
}
