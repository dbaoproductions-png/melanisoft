/** Audit du snapshot TEST publie apres provision copro. Lecture seule. */
function auditerProvisionCoproDashboardApresCorrectif20261018(){
 const x=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),e=x&&x.etat||{},m=e.modules||{};
 if(!e.ok||!e.publie)throw Error('Snapshot publie absent');
 const ct=m.dashboard&&m.dashboard.courtTerme||{},cer=m.cerbere||{},pr=m.projectionEtendue||{};
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const montant=Number(ct.provisionChargesNonDatees20261018&&ct.provisionChargesNonDatees20261018.montant||0);
 const details=ct.detailsCartes&&ct.detailsCartes.depenses&&ct.detailsCartes.depenses.attendues||[];
 const lignes=details.filter(z=>String(z.id||'')==='provision-copro-20261018:'+id);
 const audit=cer.diagnostic&&cer.diagnostic.p1Doctrine20260912||{};
 const charge=((audit.cft1Audit||{}).lignes||[]).find(z=>String(z.id||'')===id)||{};
 const projection=((pr.lignes||[]).filter(z=>String(z.sourceId||'')===id));
 const a=n=>Math.round(Number(n||0)*100)/100;
 const out={ok:montant===550&&lignes.length===1&&a(charge.retenu)===550&&projection.length===1,
 lectureSeule:true,revision:String(e.revisionBudgetSoft||''),
 cycle:{debut:ct.debut,fin:ct.fin},depensesConstates:a(ct.depensesConstatees),
 depensesAttendues:a(ct.depensesAttendues),reste:a(Number(ct.depensesAttendues||0)-Number(ct.depensesConstatees||0)),
 provisionCopro:a(montant),nombreLignesProvision:lignes.length,
 retenuDansCft1:a(charge.retenu),projectionBanque:projection.map(z=>({date:z.date,montant:a(z.montantSigne)})),
 contratProjectionValide:pr.ok!==false,
 aucuneEcritureCreee:true,
 note:'Le montant du Dashboard est economique; la projection bancaire et les operations demeurent inchangees.'};
 console.log('[AUDIT COPRO PRESENTATION DASHBOARD] '+JSON.stringify(out));return out;
}
