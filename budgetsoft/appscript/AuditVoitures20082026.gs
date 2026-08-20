const AUDIT_VOITURES_20082026_VERSION = '1.0';

// Décisions validées pendant l'audit du 20/08/2026.
// Les identifiants rendent la migration historique déterministe et idempotente.
const AUDIT_VOITURES_RECLASSEMENTS_20082026 = [
  { id:'1822327b-c902-414f-9d94-483937241309', categorie:'Restauration', motif:'AREAS Toulouse - achat hors carburant' },
  { id:'125abe9b-7b81-4fe1-a79f-6c91855c82f7', categorie:'Restauration', motif:'AREAS Toulouse - achat hors carburant' },
  { id:'d1a80e23-3157-4d97-a73c-8360261de7c6', categorie:'Restauration', motif:'AREAS Toulouse - achat hors carburant' },
  { id:'ce71315a-d8b3-4c5a-b0ea-b82daab6e454', categorie:'Restauration', motif:'Relais Toulouse - petit achat' },
  { id:'263a2c59-6d26-4596-a46c-058f5277ca46', categorie:'Restauration', motif:'Dyneff ARZN - petit achat 1,50 EUR' },
  { id:'522ad57b-bad2-47be-8e3a-d98d174690ce', categorie:'Restauration', motif:'Station Total GER - petit achat 6,40 EUR' },
  { id:'8002ec78-17fc-4c7f-bbff-0c8f8a8afacd', categorie:'Restauration', motif:'Relais Ramonville - petit achat 4 EUR' },
  { id:'11caaddb-6c19-4e91-9689-02cee4fc0254', categorie:'Voitures', motif:'Stationnement B Agde' }
];
const AUDIT_VOITURES_EXCEPTIONNEL_20082026 = '9735076e-a9e2-4ef9-897a-766934ec5d01';
const AUDIT_VOITURES_MARQUEUR_EXCEPTIONNEL = '[AUDIT:VOITURE:EXCEPTIONNEL]';
const AUDIT_VOITURES_MARQUEUR_MIGRATION = '[AUDIT:VOITURE:20082026]';

function ajouterMarqueurCommentaireVoiture_(commentaire, marqueur) {
  const c = String(commentaire || '').trim();
  return c.includes(marqueur) ? c : (c ? c + ' ' : '') + marqueur;
}

function migrerAuditVoitures20082026() {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const parId = new Map(operations.map(o => [String(o.id), o]));
  let reclassees = 0, dejaCorrectes = 0, exceptionnellesMarquees = 0;
  const absentes = [];

  AUDIT_VOITURES_RECLASSEMENTS_20082026.forEach(c => {
    const o = parId.get(c.id);
    if (!o) { absentes.push(c.id); return; }
    const categorieCorrecte = String(o.categorie || '') === c.categorie;
    const commentaire = ajouterMarqueurCommentaireVoiture_(o.commentaire, AUDIT_VOITURES_MARQUEUR_MIGRATION);
    if (categorieCorrecte && commentaire === String(o.commentaire || '').trim()) { dejaCorrectes++; return; }
    enregistrerLigne('Operations', Object.assign({}, o, {
      categorie: c.categorie,
      commentaire: commentaire,
      montant: Math.abs(Number(o.montant || 0))
    }));
    if (categorieCorrecte) dejaCorrectes++; else reclassees++;
  });

  const exceptionnelle = parId.get(AUDIT_VOITURES_EXCEPTIONNEL_20082026);
  if (!exceptionnelle) absentes.push(AUDIT_VOITURES_EXCEPTIONNEL_20082026);
  else {
    const commentaire = ajouterMarqueurCommentaireVoiture_(exceptionnelle.commentaire, AUDIT_VOITURES_MARQUEUR_EXCEPTIONNEL);
    if (commentaire !== String(exceptionnelle.commentaire || '').trim()) {
      enregistrerLigne('Operations', Object.assign({}, exceptionnelle, {
        commentaire: ajouterMarqueurCommentaireVoiture_(commentaire, AUDIT_VOITURES_MARQUEUR_MIGRATION),
        montant: Math.abs(Number(exceptionnelle.montant || 0))
      }));
      exceptionnellesMarquees++;
    }
  }

  const resultat = { version:AUDIT_VOITURES_20082026_VERSION, reclassees, dejaCorrectes, exceptionnellesMarquees, absentes, ok:absentes.length===0 };
  console.log(JSON.stringify(resultat));
  return resultat;
}

/**
 * Règles structurelles pour les prochains imports.
 * Elles sont volontairement prudentes : un petit achat en station n'est pas
 * assimilé au carburant, tandis que les montants de carburant restent Voitures.
 */
function propositionAuditVoitures20082026_(o) {
  if (!o || String(o.type || '').toLowerCase() !== 'depense') return null;
  const texte = normaliserTexteBanque_([o.marchand_normalise || '', o.libelle_bancaire || '', o.libelle || ''].join(' '));
  const montant = Math.abs(Number(o.montant || 0));
  if (!Number.isFinite(montant)) return null;

  if (texte.includes('STATIONNEMENT B AGDE')) return { categorie:'Voitures', type:'depense', score:170, source:'audit_voitures', motif:'STATIONNEMENT B AGDE' };
  if (texte.includes('AREAS TOULOUSE')) return { categorie:'Restauration', type:'depense', score:170, source:'audit_voitures', motif:'AREAS TOULOUSE' };
  if (texte.includes('RELAIS TOULOUSE')) return { categorie:'Restauration', type:'depense', score:170, source:'audit_voitures', motif:'RELAIS TOULOUSE' };
  if (texte.includes('DYNEFF ARZN') && montant <= 5) return { categorie:'Restauration', type:'depense', score:170, source:'audit_voitures', motif:'DYNEFF ARZN <= 5 EUR' };
  if (texte.includes('STATION TOTAL GER') && montant <= 10) return { categorie:'Restauration', type:'depense', score:170, source:'audit_voitures', motif:'STATION TOTAL GER <= 10 EUR' };
  if (texte.includes('RELAIS RAMONVIL') && montant <= 10) return { categorie:'Restauration', type:'depense', score:170, source:'audit_voitures', motif:'RELAIS RAMONVILLE <= 10 EUR' };
  return null;
}

function auditerVoitures20082026() {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const parId = new Map(operations.map(o => [String(o.id), o]));
  const controles = {};
  const details = [];

  AUDIT_VOITURES_RECLASSEMENTS_20082026.forEach(c => {
    const o = parId.get(c.id);
    const ok = !!o && String(o.categorie || '') === c.categorie;
    controles['categorie_' + c.id] = ok;
    details.push({ id:c.id, libelle:o ? o.libelle : '', montant:o ? Number(o.montant || 0) : null, attendu:c.categorie, obtenu:o ? o.categorie : 'ABSENTE', ok });
  });
  const ex = parId.get(AUDIT_VOITURES_EXCEPTIONNEL_20082026);
  controles.asf_147_exceptionnel = !!ex && String(ex.categorie || '') === 'Voitures' && String(ex.commentaire || '').includes(AUDIT_VOITURES_MARQUEUR_EXCEPTIONNEL);

  const depensesVoiture = operations.filter(o => String(o.categorie || '') === 'Voitures' && Number(o.montant || 0) < 0);
  const totalVoitures = Math.round(depensesVoiture.reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0)*100)/100;
  const totalExceptionnel = Math.round(depensesVoiture.filter(o=>String(o.commentaire||'').includes(AUDIT_VOITURES_MARQUEUR_EXCEPTIONNEL)).reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0)*100)/100;
  const totalCourant = Math.round((totalVoitures-totalExceptionnel)*100)/100;

  const resultat = {
    version:AUDIT_VOITURES_20082026_VERSION,
    ok:Object.values(controles).every(Boolean),
    controles,
    details,
    synthese:{ totalVoitures, totalExceptionnel, totalCourant, nombreOperationsVoitures:depensesVoiture.length }
  };
  console.log(JSON.stringify(resultat));
  return resultat;
}
