/** Diagnostic bref et lecture seule : DGFIP 169/194 EUR octobre 2026. */
function auditerDgfipOctobreConcis20261017(){
  verifierInitialisation_();
  const ops=lireTable_('Operations')||[];
  const montants=[169,194];
  const lignes=ops.filter(o=>{
    const t=[o.libelle,o.libelle_bancaire,o.commentaire].join(' ');
    const date=String(o.date_comptable||o.date||'');
    return /^2026-10/.test(date)&&montants.some(m=>Math.abs(Math.abs(Number(o.montant||0))-m)<.01)&&
      /d[\s.\-]*g[\s.\-]*f[\s.\-]*i[\s.\-]*p|imp[oô]t|impo\b/i.test(t);
  }).map(o=>({id:String(o.id||''),montant:Math.abs(Number(o.montant||0)),
    date:String(o.date||'').slice(0,16),dateComptable:String(o.date_comptable||'').slice(0,16),
    source:String(o.source||''),statut:String(o.statut||''),chargeFixeId:String(o.charge_fixe_id||''),
    mandat:(String(o.libelle_bancaire||o.libelle||'').match(/(?:NN)?FR46ZZZ005002M\d+/i)||[])[0]||'',
    libelle:String(o.libelle_bancaire||o.libelle||'').slice(0,100)}));
  const snap=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),etat=snap&&snap.etat||{},m=etat.modules||{};
  const d=m.dashboard&&m.dashboard.courtTerme||{},pre=d.detailsCartes&&d.detailsCartes.prelevements||[];
  const annonces=pre.filter(x=>montants.some(n=>Math.abs(Math.abs(Number(x.montant||0))-n)<.01)&&
    /d[\s.\-]*g[\s.\-]*f[\s.\-]*i[\s.\-]*p|imp[oô]t|impo\b/i.test(String(x.libelle||''))))
    .map(x=>({id:String(x.id||''),montant:Number(x.montant||0),date:String(x.date||''),
      libelle:String(x.libelle||'').slice(0,100)}));
  const out={ok:true,lectureSeule:true,revision:String(etat.revisionBudgetSoft||''),
    operationsOctobre:lignes,prelevementsAffiches:annonces,
    note:'Aucune operation ni prevision modifiee; comparer id, montant, date et mandat.'};
  console.log('[DGFIP OCTOBRE CONCIS] '+JSON.stringify(out));return out;
}
