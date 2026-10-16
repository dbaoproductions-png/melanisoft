/** Diagnostic non destructif du decallage de date du virement Metis. */
function auditerDateBruteMetisBudgetSoft20261016(){
  verifierInitialisation_();
  const id='25e75f29-4efa-4985-859e-2636caa6b234';
  const ops=lireTable_('Operations'),o=ops.find(x=>String(x.id||'')===id);
  if(!o){const r={ok:false,lectureSeule:true,erreur:'Operation non trouvee'};console.log('[AUDIT DATE METIS] '+JSON.stringify(r));return r;}
  const dec=v=>({type:v instanceof Date?'Date':typeof v,valeur:v instanceof Date?(isNaN(v.getTime())?'Date invalide':v.toISOString()):String(v==null?'':v),
    jourCanon:jourCanonBudgetSoft20260906_(v)});
  const resultat={ok:true,lectureSeule:true,version:'2026-10-16.1',id,
    date:dec(o.date),dateComptable:dec(o.date_comptable),
    jourComptableCanon:jourComptableCanonBudgetSoft20260906_(o),
    compte:String(o.compte||''),type:String(o.type||''),montant:Number(o.montant||0),
    sourceBancaire:String(o.source_bancaire||''),statutBancaire:String(o.statut_bancaire||'')};
  console.log('[AUDIT DATE METIS] '+JSON.stringify(resultat));
  return resultat;
}
