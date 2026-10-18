/** Audit court du motif de provision calcule lors de la composition du Dashboard. */
function auditerMotifPublicationProvisionCopro20261018(){
  const s=chargerSnapshotGlobalLegacyBudgetSoft20260906_();
  const e=s&&s.etat||{},c=e.modules&&e.modules.dashboard&&e.modules.dashboard.courtTerme||{};
  const o={ok:!!c.auditProvisionCopro20261018,lectureSeule:true,
    revision:String(e.revisionBudgetSoft||''),
    audit:c.auditProvisionCopro20261018||null,
    provision:c.provisionChargesNonDatees20261018||null,
    depensesAttendu:Number(c.depensesAttendues||0)};
  console.log('[MOTIF PROVISION COPRO COMPOSITION] '+JSON.stringify(o));return o;
}
