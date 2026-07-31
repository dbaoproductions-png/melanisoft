function testerMoteurCycles() {
  const tests = [];
  function verifier(nom, condition) { tests.push({ nom, succes: Boolean(condition) }); }
  const date = new Date(2026, 6, 12);
  verifier('Fin de mois CB', dateDebitCarte_(date).getDate() === 31);
  verifier('Détection carte', estOperationCarte_({ libelle: 'FACTURE CARTE RESTAURANT' }));
  verifier('Détection salaire', estOperationSalaire_({ libelle: 'SALAIRE MAIRIE', montant: 2500 }));
  const periode = calculerCycleDepuisSalaire_(new Date(2026, 7, 10), [
    { date: new Date(2026, 6, 28), libelle: 'SALAIRE', montant: 2500 },
    { date: new Date(2026, 7, 28), libelle: 'SALAIRE', montant: 2500 }
  ], 28);
  verifier('Cycle sur salaire réel', new Date(periode.debut).getDate() === 28 && new Date(periode.fin).getDate() === 27);
  const echecs = tests.filter(t => !t.succes);
  if (echecs.length) throw new Error(echecs.map(t => t.nom).join(', '));
  return { succes: true, tests: tests.length };
}
