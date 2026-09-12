/* Audit compact P1 — diagnostic uniquement, aucun calcul métier dupliqué. */
function auditerP1DoctrineComptableGuideVieCompact20260912(){
  const c=recalculerCerbereCockpitP1Frais20260912_();
  const p=c&&Array.isArray(c.periodes)?c.periodes[0]:null;
  const v=p&&p.v37||{};
  const k=v.cockpit20260902||{};
  const d=c&&c.diagnostic&&c.diagnostic.p1Doctrine20260912||{};
  const cf=v&&v.cft1Audit20260912||k&&k.detailActualise&&k.detailActualise.chargesFixesAudit||{};
  const resultat={
    ok:!!(c&&c.ok!==false&&p&&k),
    version:CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION,
    source:c&&c.sourceBudgetSoft||'',
    recalculFrais:!!(c&&c.sourceBudgetSoft==='recalcul_frais_p1'),
    periode:p&&p.periode||null,
    ss1:Number(d.ss1||0),
    rt1:Number(d.rt1||0),
    cft1:Number(d.cft1||0),
    cft1Brut:Number(cf.brutAvantSuspensions||0),
    suspensions:Number(cf.suspensions||0),
    het1:Number(d.het1||0),
    cbHeritees:Number(d.cbHeritees||0),
    cbHeriteesNombre:Number(d.cbHeriteesNombre||0),
    cbHeriteesExcluesCf:Number(d.cbHeriteesExcluesCf||0),
    p0:Number(d.p0||0),
    p1:Number(d.p1||0),
    consommePilotable:Number(d.consommePilotable||0),
    encoreDisponible:Number(d.restePilotable||0),
    allocations:Number(d.allocations||0),
    surplusDeficitVsP0:Number(d.surplusDeficitVsP0||0),
    surplusDeficitAVentiler:Number(d.surplusDeficitAVentiler||0)
  };
  console.log('[AUDIT P1 COMPACT 20260912] '+JSON.stringify(resultat));
  return resultat;
}
