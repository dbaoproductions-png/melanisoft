/* Audit combiné Cerbère / Charges_fixes — 2026-09-15.
 * Fournit dans le journal d'exécution le contenu du snapshot canonique CF
 * et la vue effectivement servie par l'endpoint public Cerbère.
 */
const CERBERE_CF_AUDIT_COMPLET_20260915_VERSION='2026-09-15.1';

function auditerCerbereCfComplet20260915(){
  const snapshot=typeof auditerCfSnapshotConstruit20260914==='function'
    ?auditerCfSnapshotConstruit20260914()
    :{ok:false,erreur:'auditerCfSnapshotConstruit20260914 indisponible'};
  const endpoint=typeof auditerEndpointCanoniqueCerbere20260914==='function'
    ?auditerEndpointCanoniqueCerbere20260914()
    :{ok:false,erreur:'auditerEndpointCanoniqueCerbere20260914 indisponible'};
  const out={
    ok:!!(snapshot&&snapshot.ok&&endpoint&&endpoint.ok),
    version:CERBERE_CF_AUDIT_COMPLET_20260915_VERSION,
    snapshot:snapshot||null,
    endpoint:endpoint||null
  };
  console.log('[AUDIT CERBERE CF COMPLET 20260915] '+JSON.stringify(out));
  return out;
}
