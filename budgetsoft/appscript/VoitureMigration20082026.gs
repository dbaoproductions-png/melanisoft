const AUDIT_VOITURES_20082026_VERSION = '1.0';
const AUDIT_VOITURES_MARQUEUR_MIGRATION = '[AUDIT_VOITURES_20082026]';
const AUDIT_VOITURES_MARQUEUR_EXCEPTIONNEL = '[EXCEPTIONNEL_PREVISION]';

function propositionAuditVoitures20082026_(o) {
  const l = String(o && o.libelle || '').toLowerCase();
  const m = Math.abs(Number(o && o.montant || 0));
  if (l.includes('areas toulouse')) return {categorie:'Restauration'};
  if (l.includes('relais toulouse')) return {categorie:'Restauration'};
  if (l.includes('dyneff arzn') && m <= 10) return {categorie:'Restauration'};
  if (l.includes('station total ger') && m <= 10) return {categorie:'Restauration'};
  if (l.includes('relais ramonville') && m <= 10) return {categorie:'Restauration'};
  if (l.includes('stationnement b agde')) return {categorie:'Voitures'};
  return null;
}

function ajouterMarqueurCommentaireVoiture_(commentaire, marqueur) {
  const t = String(commentaire || '').trim();
  return t.includes(marqueur) ? t : (t ? t + ' ' : '') + marqueur;
}

function migrerAuditVoitures20082026() {
  verifierInitialisation_();
  const ops = lireTable_('Operations');
  let reclassees = 0, exceptionnelles = 0;
  ops.forEach(o => {
    const x = Object.assign({}, o);
    const p = propositionAuditVoitures20082026_(o);
    let change = false;
    if (p && String(o.categorie || '') !== p.categorie) {
      x.categorie = p.categorie;
      x.commentaire = ajouterMarqueurCommentaireVoiture_(x.commentaire, AUDIT_VOITURES_MARQUEUR_MIGRATION);
      reclassees++; change = true;
    }
    const l = String(o.libelle || '').toLowerCase();
    const m = Math.abs(Number(o.montant || 0));
    const d = new Date(o.date_comptable || o.date);
    const asf147 = l.includes('autoroutes') && Math.abs(m - 147) < 0.005 && !isNaN(d) && d.getFullYear() === 2025 && d.getMonth() === 8 && d.getDate() === 19;
    if (asf147 && !String(x.commentaire || '').includes(AUDIT_VOITURES_MARQUEUR_EXCEPTIONNEL)) {
      x.commentaire = ajouterMarqueurCommentaireVoiture_(x.commentaire, AUDIT_VOITURES_MARQUEUR_EXCEPTIONNEL);
      exceptionnelles++; change = true;
    }
    if (change) enregistrerLigne('Operations', x);
  });
  SpreadsheetApp.flush();
  return {version:AUDIT_VOITURES_20082026_VERSION, reclassees, exceptionnelles};
}

function auditerVoitures20082026() {
  verifierInitialisation_();
  const ops = lireTable_('Operations');
  const anomalies = [];
  let asf147 = false;
  ops.forEach(o => {
    const p = propositionAuditVoitures20082026_(o);
    if (p && String(o.categorie || '') !== p.categorie) anomalies.push({id:o.id, libelle:o.libelle, montant:o.montant, categorie:o.categorie, attendue:p.categorie});
    const l = String(o.libelle || '').toLowerCase();
    const m = Math.abs(Number(o.montant || 0));
    const d = new Date(o.date_comptable || o.date);
    if (l.includes('autoroutes') && Math.abs(m - 147) < 0.005 && !isNaN(d) && d.getFullYear() === 2025 && d.getMonth() === 8 && d.getDate() === 19) asf147 = String(o.commentaire || '').includes(AUDIT_VOITURES_MARQUEUR_EXCEPTIONNEL);
  });
  return {version:AUDIT_VOITURES_20082026_VERSION, ok:anomalies.length === 0 && asf147, controles:{reclassements_valides:anomalies.length === 0, asf_147_exceptionnel:asf147}, anomalies};
}
