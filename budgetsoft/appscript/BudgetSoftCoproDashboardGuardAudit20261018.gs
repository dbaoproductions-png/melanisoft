/** Diagnostic read-only des gardes du provisionnement copro (snapshot publie). */
function auditerGardesProvisionCoproDashboard20261018(){
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const s=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),e=s&&s.etat||{},m=e.modules||{};
 const c=m.dashboard&&m.dashboard.courtTerme||{},cer=m.cerbere||{},diag=cer.diagnostic&&cer.diagnostic.p1Doctrine20260912||{};
 const lignes=diag.cft1Audit&&diag.cft1Audit.lignes||[];
 const ligne=lignes.find(x=>String(x&&x.id||'')===id);
 const projections=(m.projectionEtendue&&m.projectionEtendue.lignes||[]).filter(x=>String(x&&x.sourceId||'')===id||String(x&&x.id||'').indexOf('cf:'+id+':')===0);
 const datesFuture=projections.filter(x=>String(x.date||'').slice(0,10)>=String(c.dateReference||'')&&String(x.date||'').slice(0,10)<=String(c.fin||''));
 const details=c.detailsCartes||{};
 const postes=(details.depenses&&details.depenses.attendues||[]).filter(x=>String(x.id||'').indexOf('provision-copro-20261018:')===0);
 const out={ok:true,lectureSeule:true,revision:String(e.revisionBudgetSoft||''),
 cycle:{debut:c.debut,fin:c.fin,reference:c.dateReference},
 gardes:{cycleAudite:c.debut==='2026-09-28'&&c.fin==='2026-10-27',
 lignePresente:!!ligne,uneOccurrence:!!ligne&&Number(ligne.occurrences)===1,
 retenu550:!!ligne&&Math.abs(Number(ligne.retenu||0)-550)<=.01,
 aucunReelDansLigne:!!ligne&&(ligne.reel==null||Math.abs(Number(ligne.reel||0))<=.01),
 projectionFutureDansCycle:datesFuture.length>0},
 preuveLigne:ligne||null,projection:projections.map(x=>({date:x.date,montant:x.montantSigne})),
 nombreProvisionsAffichees:postes.length,champProvision:c.provisionChargesNonDatees20261018||null,
 provenance:(m.dashboard||{}).provenance||{},
 remarque:'Ce diagnostic compare les gardes visibles au snapshot. Si toutes sont vraies mais aucun montant publie, inspecter la composition / transformation du Dashboard.'};
 console.log('[AUDIT GARDES COPRO DASHBOARD] '+JSON.stringify(out));return out;
}
