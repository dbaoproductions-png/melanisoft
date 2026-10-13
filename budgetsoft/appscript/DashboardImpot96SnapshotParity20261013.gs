function auditerPariteImpot96Dashboard20261013(){
  const id='b8b84363-088b-4b09-91c8-e645d5105930';
  const sources=chargerToutesLesDonnees();
  const comptes=construireSyntheseComptes20260828_();
  const actifs=(comptes.comptes||[]).filter(estCompteCourantCanoniqueBudgetSoft20260906_);
  const ids=new Set();
  actifs.forEach(c=>{ids.add(String(c.id));ids.add(String(c.nom));});
  const ops=dedoublonnerOperationsCartesBudgetSoft_(sources.Operations||[]);
  const op=ops.find(o=>String(o.id)===id);
  const dashboard=chargerDashboardSyntheseBudgetSoft20260907();
  const c=dashboard.courtTerme||{};
  const date=op?dateDashboardSynthese20260907_(op.date_comptable||op.date):null;
  const ref=dateDashboardSynthese20260907_(c.dateReference);
  const fin=dateDashboardSynthese20260907_(c.fin);
  const eligible=!!op&&!!date&&ids.has(String(op.compte))&&operationReelleCanoniqueBudgetSoft20260906_(op)&&date>ref&&date<=fin&&signeDashboardSynthese20260907_(op)<0&&!estCarteDashboardSynthese20260907_(op);
  const present=(c.detailsCartes&&c.detailsCartes.prelevements||[]).some(x=>String(x.id)===id);
  const out={ok:true,lectureSeule:true,source:dashboard.sourceBudgetSoft,version:dashboard.version,
    revision:dashboard.revisionBudgetSoft,dateReference:c.dateReference,fin:c.fin,
    trouve:!!op,compteAutorise:!!op&&ids.has(String(op.compte)),eligible,present,
    prelevements:c.prelevements,nombrePrelevements:c.nombrePrelevements,
    anomalie:eligible&&!present?'snapshot_ou_composition_divergente':!eligible?'filtre_source':'aucune'};
  console.log('[PARITE IMPOT96 DASHBOARD 20261013] '+JSON.stringify(out));
  return out;
}
