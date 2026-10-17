/** Audit lecture seule : isolation du lissage ARE par rapport aux mouvements de tresorerie. */
function auditerIsolationLissageAREProjection20261017(){
  const charge=chargerSnapshotGlobalLegacyBudgetSoft20260906_();
  const etat=charge&&charge.disponible&&charge.etat;
  if(!etat||etat.ok!==true||etat.publie!==true)throw new Error('Snapshot publie indisponible');
  const m=etat.modules||{},c=m.cerbere||{},p=(c.periodes||[])[0]||{},v=p.v37||{},
    d=m.dashboard&&m.dashboard.courtTerme||{},proj=m.projectionEtendue||{},
    l=Array.isArray(proj.lignes)?proj.lignes:[],diag=v.rt1Audit&&v.rt1Audit.lissageConcertsARE20261017||{};
  const arr=n=>Number.isFinite(Number(n))?Math.round(Number(n)*100)/100:null;
  const suspects=l.filter(x=>/lissage|compensation.*(are|france)|france.*compensation/i.test(
    String(x.source||'')+' '+String(x.libelle||'')+' '+String(x.nom||'')+' '+String(x.preuve||'')));
  const out={lectureSeule:true,version:'2026-10-17.1',revision:String(etat.revisionBudgetSoft||''),
    snapshotPublie:etat.publie===true,projectionValide:proj.ok!==false,
    rt1Cerbere:arr(v.rt1),rt1Dashboard:arr(d.revenusAttendus),
    ajustementEconomiqueRt1:arr(diag.compensationAppliquee),
    soldeDashboard:arr(d.soldeBancaire),
    soldeSnapshotComptes:arr(m.comptes&&m.comptes.synthese&&m.comptes.synthese.disponible),
    chargesFixesCerbere:arr(v.cft1),
    projection:{nombreLignes:l.length,revenusRecurrents:l.filter(x=>x.source==='revenu_recurrent'&&Number(x.montantSigne||0)>0).length,
      mouvementsSuspects:suspects.slice(0,12).map(x=>({source:String(x.source||''),date:String(x.date||''),montant:arr(x.montantSigne),libelle:String(x.libelle||'').slice(0,70)})),
      totalMouvementsSuspects:suspects.length,
      contratOk:!!(proj.decompositionCanonique&&proj.decompositionCanonique.ok)},
    ecartCerbereDashboard:arr(Number(v.rt1||0)-Number(d.revenusAttendus||0)),
    note:'Projection calculee en amont du lissage Rt1; aucun debit ARE ne doit etre ajoute. Absence de correspondance textuelle ne demontre pas seule absence de compensation masquee.'};
  out.ok=out.projectionValide&&out.ecartCerbereDashboard===0&&
    out.soldeDashboard===out.soldeSnapshotComptes&&out.projection.contratOk&&out.projection.totalMouvementsSuspects===0;
  console.log('[AUDIT ISOLATION ARE PROJECTION] '+JSON.stringify(out));return out;
}
