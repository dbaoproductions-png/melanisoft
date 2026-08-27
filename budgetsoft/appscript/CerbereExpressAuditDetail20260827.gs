const CERBERE_EXPRESS_AUDIT_DETAIL_VERSION = '2026-08-27.1';

/**
 * Audit détaillé LECTURE SEULE du moteur Cerbère Express.
 * Objectif : expliquer les masses réellement comptées avant toute nouvelle correction.
 * Ne modifie aucune feuille ni propriété.
 */
function auditerDetailCerbereExpress20260827() {
  const express = chargerCerbereExpress20260827();
  const cerbere = chargerCerbereV374();
  if (!express || express.ok === false) return express;
  if (!cerbere || cerbere.ok === false) return cerbere;

  const p = Array.isArray(cerbere.periodes) ? cerbere.periodes[0] : null;
  if (!p || !p.periode) throw new Error('Période courante Cerbère introuvable.');

  const maintenant = new Date();
  const debut = dateExpress_(p.periode.debut);
  const fin = dateExpress_(p.periode.fin);
  const cats = new Set((p.enveloppes || []).map(x => String(x && x.categorie || '').trim()).filter(Boolean));

  const operationsBrutes = lireTable_('Operations') || [];
  const operations = typeof dedoublonnerOperationsCartesBudgetSoft_ === 'function'
    ? dedoublonnerOperationsCartesBudgetSoft_(operationsBrutes)
    : operationsBrutes;
  const charges = lireTable_('Charges_fixes') || [];
  const rapprochements = typeof lireRapprochementsChargesFixes === 'function' ? (lireRapprochementsChargesFixes() || []) : [];
  const liensCf = typeof construireLiensChargesFixesCommuns_ === 'function'
    ? construireLiensChargesFixesCommuns_(operations, charges, rapprochements)
    : {};

  const incluses = [];
  const parCategorie = {};
  const parSource = {};
  let total = 0;
  let nbCbStructurees = 0;
  let montantCbStructurees = 0;
  let nbNonCb = 0;
  let montantNonCb = 0;

  operations.forEach(o => {
    const montant = Number(o && o.montant || 0);
    if (!Number.isFinite(montant) || montant >= 0) return;
    const categorie = String(o && o.categorie || '').trim();
    if (!cats.has(categorie)) return;
    const d = dateAchatExpress_(o);
    if (!d || d > maintenant || !dansCycleExpress_(d, debut, fin)) return;

    const id = String(o && o.id || '').trim();
    const cfId = String((liensCf && liensCf[id]) || o && o.charge_fixe_id || '').trim();
    if (cfId) return;

    const a = Math.abs(montant);
    const cb = typeof estCarteStructureeBudgetSoft_ === 'function'
      ? !!estCarteStructureeBudgetSoft_(o, montant)
      : !!String(o && o.date_achat || '').trim();
    const src = String(o && o.source_bancaire || o && o.source || '').trim() || '(sans source)';
    const libelle = String(o && (o.libelle_bancaire || o.libelle || o.details) || '').trim();
    const dateComptable = dateExpress_(o && o.date_comptable);
    const dateAchat = typeof dateAchatMetierBudgetSoft_ === 'function' ? dateAchatMetierBudgetSoft_(o) : dateExpress_(o && o.date_achat);

    total += a;
    parCategorie[categorie] = Number(parCategorie[categorie] || 0) + a;
    parSource[src] = Number(parSource[src] || 0) + a;
    if (cb) { nbCbStructurees++; montantCbStructurees += a; }
    else { nbNonCb++; montantNonCb += a; }

    incluses.push({
      id,
      categorie,
      montant:arrExpress_(a),
      dateExpress:formatDateExpress_(d),
      dateAchat:dateAchat ? formatDateExpress_(dateAchat) : '',
      dateComptable:dateComptable ? formatDateExpress_(dateComptable) : '',
      cbStructuree:cb,
      carteFin:String(o && o.carte_fin || ''),
      source:src,
      statutBancaire:String(o && o.statut_bancaire || ''),
      type:String(o && o.type || ''),
      libelle
    });
  });

  Object.keys(parCategorie).forEach(k => parCategorie[k] = arrExpress_(parCategorie[k]));
  Object.keys(parSource).forEach(k => parSource[k] = arrExpress_(parSource[k]));
  incluses.sort((a,b)=>b.montant-a.montant);

  const comparaisonCerbere = (p.enveloppes || []).map(x => {
    const cat = String(x && x.categorie || '').trim();
    const expressReel = arrExpress_(parCategorie[cat] || 0);
    const reelImpute = arrExpress_(Number(x && x.reelImpute || 0));
    const reelNet = arrExpress_(Number(x && (x.reelNetPrevisionnel != null ? x.reelNetPrevisionnel : x.reelImpute) || 0));
    return {
      categorie:cat,
      p0:arrExpress_(Number(x && x.canon || 0)),
      p1:arrExpress_(Number(x && x.prevu || 0)),
      expressDateAchat:expressReel,
      cerbereReelImpute:reelImpute,
      cerbereReelNet:reelNet,
      ecartExpressVsCerbereNet:arrExpress_(expressReel-reelNet)
    };
  });

  const topParCategorie = {};
  Array.from(cats).forEach(cat => {
    topParCategorie[cat] = incluses.filter(x=>x.categorie===cat).slice(0,12);
  });

  const out = {
    ok:true,
    version:CERBERE_EXPRESS_AUDIT_DETAIL_VERSION,
    lectureSeule:true,
    cycle:{debut:formatDateExpress_(debut),fin:formatDateExpress_(fin)},
    synthese:{
      operationsSource:operationsBrutes.length,
      operationsApresDedoublonnage:operations.length,
      depensesIncluses:incluses.length,
      montantInclus:arrExpress_(total),
      cbStructurees:{nombre:nbCbStructurees,montant:arrExpress_(montantCbStructurees)},
      nonCb:{nombre:nbNonCb,montant:arrExpress_(montantNonCb)}
    },
    parCategorie,
    parSource,
    comparaisonCerbere,
    top20:incluses.slice(0,20),
    topParCategorie
  };
  console.log(JSON.stringify(out));
  return out;
}
