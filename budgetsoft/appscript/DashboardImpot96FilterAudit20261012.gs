function auditerFiltrageImpot96Dashboard20261012(){
  verifierInitialisation_();
  const id='b8b84363-088b-4b09-91c8-e645d5105930';
  const operations=lireTable_('Operations')||[];
  const bank=lireOperationsBancaires_()||[];
  const sources=typeof chargerToutesLesDonnees==='function'?chargerToutesLesDonnees():null;
  const sourceOps=sources&&sources.Operations||[];
  const d=chargerDashboardSyntheseBudgetSoft20260907();
  const c=d&&d.courtTerme||{};
  const ctx=typeof chargerTresorerieComptableBudgetSoft20260906_==='function'?null:null;
  function detail(o){
    if(!o)return null;
    const date=String(o.date_comptable||o.date||'');
    const commentaire=String(o.commentaire||'');
    const source=String(o.source_bancaire||'');
    return{id:String(o.id||''),date,libelle:String(o.libelle_bancaire||o.libelle||''),montant:Number(o.montant||0),
      type:String(o.type||''),compte:String(o.compte||''),source_bancaire:source,
      recurrence:/\[RECURRENCE:[^\]]+\]/.test(commentaire),
      canoniqueReelle:typeof operationReelleCanoniqueBudgetSoft20260906_==='function'?operationReelleCanoniqueBudgetSoft20260906_(o):null,
      carte:estCarteDashboardSynthese20260907_(o),
      signe:signeDashboardSynthese20260907_(o),
      commentaire:commentaire.slice(0,280)};
  }
  const chercher=xs=>(xs||[]).filter(o=>String(o.id||'')===id).map(detail);
  const a=chercher(operations),b=chercher(bank),s=chercher(sourceOps);
  const out={ok:true,lectureSeule:true,version:'2026-10-12.2',
    idCible:id,tableOperations:a,operationsBancaires:b,sourceSnapshot:s,
    cartePrelevements:(c.detailsCartes&&c.detailsCartes.prelevements||[]).filter(o=>String(o.id||'')===id),
    carteDepensesAttendue:(c.detailsCartes&&c.detailsCartes.depenses&&c.detailsCartes.depenses.attendues||[]).filter(o=>String(o.id||o.sourceId||'')===id),
    totalPrelevements:c.prelevements,nombrePrelevements:c.nombrePrelevements};
  console.log('[AUDIT FILTRAGE IMPOT96 DASHBOARD 20261012] '+JSON.stringify(out));return out;
}