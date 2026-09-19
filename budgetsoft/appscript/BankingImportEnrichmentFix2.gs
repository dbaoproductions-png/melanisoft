// Deuxieme passe apres test reel du PDF de fevrier.
// Nettoie les libelles carte concatenes et renforce la reutilisation prudente
// des categories deja apprises sans inventer de categorie.

function marchandCarteBudgetSoft_(texte) {
  let s = String(texte || '').replace(/\s+/g, ' ').trim();
  s = s
    .replace(/^\s*REMBOURST\s+CB\s+DU\s+\d{6}\s+/i, '')
    .replace(/^\s*(?:PAIEMENT\s+)?CB\s+DU\s+\d{6}\s+/i, '')
    .replace(/^\s*FACTURE\(S\)\s+CARTE\s+\S+\s+DU\s+\d{6}\s+/i, '')
    .replace(/^\s*DU\s+\d{6}\s+/i, '');

  // Le texte PDF peut concatener le debut de l'operation suivante.
  const suite = s.search(/\s+(?:FACTURE\(S\)\s+CARTE|REMBOURST\s+CB|PRLV\s+SEPA|VIR(?:EMENT)?\b|CHEQUE\b|DU\s+\d{6}\b)/i);
  if (suite > 0) s = s.slice(0, suite);

  s = s
    .replace(/\s+CARTE\s+\d*[Xx]+\d{4}.*$/i, '')
    .replace(/\s+(?:FRA|IRL|NLD|ESP|DEU|LUX|BEL|ITA|GBR|PRT)\s+\d+[,.]\d{2}\s*EUR.*$/i, '')
    .replace(/\s+(?:de\s+)?BNP\s+PARIBAS.*$/i, '')
    .trim();

  const propre = normaliserTexteBanqueFiable_(s).slice(0, 90);
  if (!propre || /^(facture s|facture carte|carte)$/.test(propre)) return '';
  return propre;
}

function meilleureCorrespondanceCategorieImport_(libelle, compte, type) {
  const texte = normaliserTexteBanqueFiable_(libelle);
  const motsTexte = new Set(texte.split(' ').filter(m => m.length >= 4));
  let meilleur = null;

  (correspondancesImportBudgetSoft_() || []).forEach(c => {
    if (c.actif === false || String(c.actif).toLowerCase() === 'false') return;
    if (c.compte && String(c.compte) !== String(compte)) return;
    if (c.type && String(c.type).toLowerCase() !== String(type).toLowerCase()) return;
    if (!String(c.categorie || '').trim()) return;

    const motif = normaliserTexteBanqueFiable_(c.motif_bancaire || '');
    const libNorm = normaliserTexteBanqueFiable_(c.libelle_normalise || '');
    let score = 0;
    if (motif && texte.includes(motif)) score = 1000 + motif.length;
    else if (libNorm && texte.includes(libNorm)) score = 900 + libNorm.length;
    else {
      const mots = motif.split(' ').filter(m => m.length >= 4);
      const communs = mots.filter(m => motsTexte.has(m));
      // Matching flou uniquement s'il y a au moins deux mots significatifs,
      // ou un mot tres distinctif de 7 caracteres et plus.
      if (communs.length >= 2) score = 100 + communs.length * 10 + communs.join('').length;
      else if (communs.length === 1 && communs[0].length >= 7 && mots.length <= 2) score = 80 + communs[0].length;
    }
    if (score && (!meilleur || score > meilleur.score)) meilleur = { score:score, correspondance:c };
  });

  return meilleur && meilleur.score >= 88 ? meilleur.correspondance : null;
}

function categorieImportBudgetSoft_(libelle, compte, type, categorieExistante) {
  const deja = String(categorieExistante || '').trim();
  if (deja) return deja;
  const texte = normaliserTexteBanqueFiable_(libelle);

  const regles = reglesCategoriesImportBudgetSoft_()
    .filter(r => (!r.type || r.type === type) && texte.includes(normaliserTexteBanqueFiable_(r.motif)))
    .sort((a, b) => normaliserTexteBanqueFiable_(b.motif).length - normaliserTexteBanqueFiable_(a.motif).length);
  if (regles.length) return regles[0].categorie;

  try {
    const exacte = trouverCorrespondanceBancaire_(libelle, compte, correspondancesImportBudgetSoft_());
    if (exacte && String(exacte.categorie || '').trim()) return String(exacte.categorie).trim();
  } catch (e) {}

  const apprise = meilleureCorrespondanceCategorieImport_(libelle, compte, type);
  if (apprise) return String(apprise.categorie || '').trim();

  try {
    if (typeof suggererCategorieHelloBank_ === 'function') return String(suggererCategorieHelloBank_(libelle, type) || '').trim();
  } catch (e) {}
  return '';
}
