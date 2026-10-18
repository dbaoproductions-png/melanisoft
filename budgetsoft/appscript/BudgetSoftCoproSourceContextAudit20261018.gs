/** Audit strictement en lecture seule des gardes telles que calculees par le compositeur source Dashboard. */
function auditerContexteSourceProvisionCopro20261018(){
 const z=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),e=z&&z.etat||{},m=e.modules||{},cer=m.cerbere||{},tres=m.tresorerieComptable||{};
 if(!e.ok||!e.publie)throw Error('Snapshot publie indisponible');
 const reference=dateDashboardSynthese20260907_(tres.dateReference||new Date());
 const cycles=cyclesDashboardSynthese20260907_(cer,reference),cc=cycles.courant;
 const iso=isoDashboardSynthese20260907_;
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1',d=cer.diagnostic&&cer.diagnostic.p1Doctrine20260912||{};
 const ligne=((d.cft1Audit||{}).lignes||[]).find(x=>String(x&&x.id||'')===id)||null;
 const a=iso(cc.debut),b=iso(cc.fin);
 const p=((m.projectionEtendue||{}).lignes||[]).filter(x=>String(x&&x.sourceId||'')===id);
 const f=p.filter(x=>{const date=dateDashboardSynthese20260907_(x.date),demain=new Date(reference);demain.setDate(demain.getDate()+1);return date&&date>=demain&&date<=cc.fin});
 const out={lectureSeule:true,version:'2026-10-18.1',revision:String(e.revisionBudgetSoft||''),
  dateReferenceBrute:String(tres.dateReference||''),referenceCompositeur:iso(reference),
  debutCerbereBrut:String((cer.periodes||[])[0]&&((cer.periodes[0].periode||cer.periodes[0]).debut)||''),
  finCerbereBrut:String((cer.periodes||[])[0]&&((cer.periodes[0].periode||cer.periodes[0]).fin)||''),
  debutCompositeur:a,finCompositeur:b,
  debutPublie:String(m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.debut||''),
  finPublie:String(m.dashboard&&m.dashboard.courtTerme&&m.dashboard.courtTerme.fin||''),
  gardes:{cycleCible:a==='2026-09-28'&&b==='2026-10-27',ligne:!!ligne,
   occurrence:!!ligne&&Number(ligne.occurrences)===1,
   montant:!!ligne&&Math.abs(Number(ligne.retenu||0)-550)<.01,
   reel:ligne&&ligne.reel,
   projectionFutureDansCycle:f.length>0},
  sourcesDisponibles:!!m.sources,
  note:'Les gardes de dates sont calculees ici avec les memes fonctions que le compositeur Dashboard; aucune donnee modifiee.'};
 console.log('[AUDIT CONTEXTE SOURCE PROVISION COPRO] '+JSON.stringify(out));return out;
}
