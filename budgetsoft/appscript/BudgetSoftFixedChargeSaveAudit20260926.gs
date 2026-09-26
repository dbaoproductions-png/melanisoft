const BUDGETSOFT_FIXED_CHARGE_SAVE_AUDIT_20260926_VERSION='2026-09-26.1';

function auditerDernieresChargesFixes20260926(){
  const charges=typeof lireTable_==='function'?lireTable_('Charges_fixes'):[];
  const snap=typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():null;
  const dernieres=(charges||[]).slice(-8).reverse().map(c=>({
    id:String(c&&c.id||''),
    libelle:String(c&&c.libelle||''),
    libelle_bancaire:String(c&&c.libelle_bancaire||''),
    montant:Number(c&&c.montant||0),
    compte:String(c&&c.compte||''),
    categorie:String(c&&c.categorie||''),
    frequence:String(c&&c.frequence||''),
    date_debut:String(c&&c.date_debut||''),
    actif:String(c&&c.actif||'').toLowerCase()!=='false'
  }));
  const out={
    ok:true,
    version:BUDGETSOFT_FIXED_CHARGE_SAVE_AUDIT_20260926_VERSION,
    lectureSeule:true,
    nombreTotal:(charges||[]).length,
    dernieres:dernieres,
    snapshot:{
      disponible:!!(snap&&snap.disponible),
      perime:!!(snap&&snap.perime),
      revisionBudgetSoft:String(snap&&snap.revisionBudgetSoft||''),
      raison:snap&&snap.fraicheur&&snap.fraicheur.raison||''
    }
  };
  console.log('[AUDIT DERNIERES CHARGES FIXES 20260926] '+JSON.stringify(out));
  return out;
}
