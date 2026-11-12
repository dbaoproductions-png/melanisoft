/**
 * Exécuteur distant des audits BudgetSoft TEST.
 * Ne retourne que des indicateurs non financiers; empreintes et données brutes
 * restent dans Apps Script. Le relevé avant/après vérifie les opérations.
 */
const BUDGETSOFT_AUDIT_REMOTE_VERSION_20261112 = '2026-11-12.1';

function executerAuditRegressionBudgetSoft20261112() {
  const debut = Date.now();
  const props = PropertiesService.getScriptProperties();
  const maintenant = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  function canonique(v) {
    if (v === null || v === undefined) return v;
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(canonique);
    if (typeof v !== 'object') return v;
    const out = {};
    Object.keys(v).sort().forEach(function(k) {
      if (/^(duree.?ms|generatedat|generele|timestamp|horodatage|revisionbudgetsoft)$/i.test(k)) return;
      if (/^(timings?|performance|performancepost35|performancev37)$/i.test(k)) return;
      out[k] = canonique(v[k]);
    });
    return out;
  }

  function empreinte(v) {
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(canonique(v)),
      Utilities.Charset.UTF_8
    );
    return Utilities.base64EncodeWebSafe(bytes);
  }

  function operations() {
    const rows = lireTable_('Operations') || [];
    return {
      count: rows.length,
      ids: empreinte(rows.map(function(x) { return String(x && x.id || ''); }).sort())
    };
  }

  function sources() {
    const d = chargerToutesLesDonnees();
    const safe = {};
    Object.keys(d || {}).sort().forEach(function(k) {
      if (Array.isArray(d[k])) safe[k] = d[k];
    });
    if (typeof lirePluxee_ === 'function') safe.pluxee = lirePluxee_() || [];
    return empreinte(safe);
  }

  let opsAvant, sourceAvant, dureeSnapshotMs = null, dureeAuditMs = null;
  let resultatSnapshot = null, resultatAudit = null, exceptionType = '';
  try {
    opsAvant = operations();
    sourceAvant = sources();
    resultatSnapshot = reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('audit_regression_distant');
    dureeSnapshotMs = Number(resultatSnapshot && resultatSnapshot.performance && resultatSnapshot.performance.dureeMs);
    if (!Number.isFinite(dureeSnapshotMs)) dureeSnapshotMs = null;
    if (resultatSnapshot && resultatSnapshot.ok === true && resultatSnapshot.publie === true) {
      const tAudit = Date.now();
      resultatAudit = auditerToutesDonneesAnalysesBudgetSoft20261108();
      dureeAuditMs = Number(resultatAudit && resultatAudit.dureeMs);
      if (!Number.isFinite(dureeAuditMs)) dureeAuditMs = Date.now() - tAudit;
    }
  } catch (e) {
    exceptionType = String(e && e.name || 'Error').slice(0, 40);
  }

  let opsApres, sourceApres;
  try { opsApres = operations(); } catch (e) { opsApres = null; exceptionType = exceptionType || 'ReadOperationsError'; }
  try { sourceApres = sources(); } catch (e) { sourceApres = null; exceptionType = exceptionType || 'ReadSourcesError'; }

  const sourceStable = !!(sourceAvant && sourceApres && sourceAvant === sourceApres);
  const operationsStable = !!(opsAvant && opsApres &&
    opsAvant.count === opsApres.count && opsAvant.ids === opsApres.ids);
  const snapshotOk = !!(resultatSnapshot && resultatSnapshot.ok === true && resultatSnapshot.publie === true);
  const auditOk = !!(resultatAudit && resultatAudit.ok === true);
  const signatureResultat = resultatSnapshot && resultatSnapshot.modules
    ? empreinte(resultatSnapshot.modules) : '';

  const keyDate = 'budgetsoft.audit.last.date';
  const keySource = 'budgetsoft.audit.last.source';
  const keyResult = 'budgetsoft.audit.last.result';
  const keyDuration = 'budgetsoft.audit.last.duration';
  const memeEntree = props.getProperty(keyDate) === maintenant &&
    props.getProperty(keySource) === sourceAvant;
  const resultatIdentique = memeEntree && !!signatureResultat &&
    props.getProperty(keyResult) === signatureResultat;
  const dureePrecedente = memeEntree ? Number(props.getProperty(keyDuration)) : NaN;
  const gainPct = Number.isFinite(dureePrecedente) && dureePrecedente > 0 &&
    Number.isFinite(dureeSnapshotMs)
      ? Math.round((1 - dureeSnapshotMs / dureePrecedente) * 1000) / 10
      : null;

  if (snapshotOk && auditOk && sourceStable && operationsStable && signatureResultat) {
    props.setProperties({
      'budgetsoft.audit.last.date': maintenant,
      'budgetsoft.audit.last.source': sourceApres,
      'budgetsoft.audit.last.result': signatureResultat,
      'budgetsoft.audit.last.duration': String(dureeSnapshotMs || '')
    }, false);
  }

  return {
    ok: snapshotOk && auditOk && sourceStable && operationsStable && !exceptionType,
    version: BUDGETSOFT_AUDIT_REMOTE_VERSION_20261112,
    dateLocale: maintenant,
    actualisation: {
      ok: snapshotOk,
      dureeMs: dureeSnapshotMs,
      gainVsExecutionComparablePct: gainPct,
      objectifReduction30Atteint: gainPct === null ? null : gainPct >= 30
    },
    audit: resultatAudit ? {
      ok: auditOk,
      version: String(resultatAudit.version || ''),
      totalControles: Number(resultatAudit.totalControles || 0),
      controlesReussis: Number(resultatAudit.controlesReussis || 0),
      erreurs: Number(resultatAudit.nombreErreurs || 0),
      avertissements: Number(resultatAudit.nombreAvertissements || 0),
      dureeMs: dureeAuditMs
    } : { ok: false },
    coherenceFinanciere: {
      comparableMemeDateEtSources: memeEntree && sourceStable,
      resultatsIdentiques: resultatIdentique
    },
    integriteOperations: {
      stableAvantApres: operationsStable
    },
    sourcesStablesPendantAudit: sourceStable,
    erreurExecution: !!exceptionType,
    typeErreur: exceptionType || null,
    dureeTotaleMs: Date.now() - debut
  };
}
