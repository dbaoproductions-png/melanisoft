/**
 * Diagnostic lecture seule de la queue CB a la bascule du 28 octobre 2026.
 * Ne force jamais un residuel nul et ne change pas la trajectoire canonique.
 */
function auditerQueueCb31OctobreBudgetSoft20261028(){
 const cible='2026-12-31';
 const p=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cible);
 const g=verifierGardeCbMultiCycleDepuisProjectionBudgetSoft20260910_(p,new Date(2026,11,27,12,0,0,0));
 const date='2026-10-31',jour=v=>{
  const d=new Date(v||0);return isNaN(d.getTime())?'':Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
 };
 const lignes=Array.isArray(p&&p.lignes)?p.lignes:[];
 const cb=lignes.filter(x=>jour(x.date)===date&&
  (x.source==='debit_cb_estime'||x.source==='operation_future'||/cb/i.test(String(x.libelle||''))));
 const diags=p&&p.diagnostic20260831&&p.diagnostic20260831.enveloppePilotable20260913||{};
 const cycles=Array.isArray(diags.cycles)?diags.cycles:[];
 const anciens=cycles.filter(x=>String(x.dateDebit||'')===date);
 const dates=Array.isArray(g.datesAttendues)?g.datesAttendues:[];
 const manquants=Array.isArray(g.erreurs)?g.erreurs.filter(x=>x.code==='CB_DEBIT_CYCLE_NON_COUVERT'):[];
 const dernier=chargerSnapshotGlobalLegacyBudgetSoft20260906_();
 const etat=dernier&&dernier.etat||{},mods=etat.modules||{};
 const precedente=mods.gardeCbMultiCycle||{};
 const ancienOct=(precedente.publiees||[]).filter(x=>jour(x.date)===date);
 const out={ok:!!(p&&p.ok),lectureSeule:true,aucuneModification:true,
  reference:String(p&&p.dateReference||''),cible,revisionDernierSnapshot:String(etat.revisionBudgetSoft||''),
  dernierSnapshotOk:etat.ok===true,projectionLignesOctobre:cb.map(x=>({
   id:String(x.id||''),source:String(x.source||''),date:jour(x.date),
   montant:Number(x.montantSigne||0),certitude:String(x.certitude||'')
  })),
  octobreDansDatesControlees:dates.includes(date),diagnosticOctobreCourant:anciens,
  preuveAnterieureOctobre:ancienOct.map(x=>({
   date:jour(x.date),montant:Number(x.montant||0),partEp:Number(x.partEp||0),
   ownerCb:String(x.ownerCb||'')
  })),
  erreursNonCouvertes:manquants.map(x=>({date:x.date,code:x.code})),
  decision:anciens.length?'DIAGNOSTIC_ACTUEL_PRESENT':
   ancienOct.length?'ANCIENNE_PROVISION_A_RAPPROCHER_AVEC_REEL_CB':
   'OBLIGATION_OCTOBRE_SANS_PREUVE_SUFFISANTE',
  aucuneInjectionCb:true,publicationNonForcee:true};
 console.log('[AUDIT QUEUE CB 31 OCTOBRE] '+JSON.stringify(out));return out;
}