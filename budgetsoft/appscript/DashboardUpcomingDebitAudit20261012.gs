/** Audit lecture seule des deux cartes apres reconstruction du snapshot. */
function auditerCartesPrelevementsDashboard20261012(){
  const d=chargerDashboardSyntheseBudgetSoft20260907();
  const c=d&&d.courtTerme||{},det=c.detailsCartes||{};
  const pre=det.prelevements||[],cf=det.chargesFixes||[];
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const somme=xs=>arr(xs.reduce((s,x)=>s+Math.abs(Number(x.montant||0)),0));
  const opCible='b8b84363-088b-4b09-91c8-e645d5105930';
  const imp=pre.filter(x=>String(x.id||'')===opCible||Math.abs(Math.abs(Number(x.montant||0))-96)<.01&&/imp[oô]t|dgfip|d\\.g\\.f\\.i\\.p/i.test(String(x.libelle||'')));
  const result={ok:!!d&&Math.abs(somme(pre)-Number(c.prelevements||0))<.01&&Math.abs(somme(cf)-Number(c.chargesFixes||0))<.01,
    lectureSeule:true,version:'2026-10-12.1',dateReference:c.dateReference||'',debut:c.debut||'',fin:c.fin||'',
    prelevements:{total:Number(c.prelevements||0),lignes:pre.length,somme:somme(pre),impot96:imp},
    chargesFixes:{total:Number(c.chargesFixes||0),lignes:cf.length,somme:somme(cf)},
    depensesAttendues:c.depensesAttendues,
    note:'Une operation bancaire future deja couverte par une charge fixe ne doit jamais etre ajoutee une seconde fois aux depenses attendues.'};
  console.log('[AUDIT CARTES PRELEVEMENTS 20261012] '+JSON.stringify(result));return result;
}
