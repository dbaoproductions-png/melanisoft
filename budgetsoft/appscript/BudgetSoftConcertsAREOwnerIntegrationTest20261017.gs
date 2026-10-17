/** Audit sans ecriture : verification Rt1 lisse sur un objet de test. */
function testerIntegrationLissageARECerbere20261017(){
  const snap=chargerSnapshotGlobalBudgetSoft20260906();
  const e=snap&&snap.disponible&&snap.etat;
  if(!e)throw new Error('Snapshot non disponible');
  const orig=((e.modules||{}).cerbere||{}).periodes||[];
  if(!orig.length)throw new Error('Cerbere sans periodes');
  const base={ok:true,periodes:[JSON.parse(JSON.stringify(orig[0]))]};
  const avant=Number(base.periodes[0].v37.rt1);
  // Ce traitement ne modifie que la copie en memoire.
  enrichirCerbereRecettesCertainesDues20260919_(base);
  const un=base.periodes[0].v37;
  const premier=Number(un.rt1),diag=un.rt1Audit&&un.rt1Audit.lissageConcertsARE20261017||{};
  enrichirCerbereRecettesCertainesDues20260919_(base);
  const second=Number(base.periodes[0].v37.rt1);
  const soldeAvant=Number(((e.modules||{}).dashboard||{}).courtTerme&&e.modules.dashboard.courtTerme.soldeBancaire||0);
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const out={ok:diag.applique===true&&arr(premier-second)===0&&
      arr(premier)>=arr(un.rt1Audit.revenusConstatesCycle)+arr(un.rt1Audit.evenementsDus),
    lectureSeule:true,version:'2026-10-17.1',rt1Snapshot:arr(avant),
    rt1PremierPassage:arr(premier),rt1SecondPassage:arr(second),
    delta:arr(premier-avant),compensation:diag,
    soldeBancaireSnapshotNonModifie:arr(soldeAvant),
    avertissement:'Simulation sur copie de Cerbere, le snapshot publie reste inchange.'};
  console.log('[TEST INTEGRATION LISSAGE ARE CERBERE] '+JSON.stringify(out));return out;
}
