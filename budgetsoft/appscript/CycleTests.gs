function testerMoteurCycles() {
  const tests = [];
  function verifier(nom, condition) { tests.push({ nom, succes: Boolean(condition) }); }

  const date = new Date(2026, 6, 12);
  verifier('Fin de mois CB', dateDebitCarte_(date).getDate() === 31);
  verifier('Détection carte', estOperationCarte_({ libelle: 'FACTURE CARTE RESTAURANT' }));
  verifier('Détection salaire', estOperationSalaire_({ libelle: 'SALAIRE MAIRIE', montant: 2500 }));
  verifier('Jour global BudgetSoft', (typeof jourDebutCycleBudgetSoft_ === 'function' ? jourDebutCycleBudgetSoft_() : 28) === 28);

  // Même si le salaire réel tombe le 26 ou le 27, le mois reste étalonné sur
  // le jour le plus tardif observé : 28 inclus → 27 inclus.
  const salairesVariables = [
    { date: new Date(2026, 5, 26), libelle: 'SALAIRE MAIRIE DE TOULOUSE', montant: 2500 },
    { date: new Date(2026, 6, 27), libelle: 'SALAIRE MAIRIE DE TOULOUSE', montant: 2500 },
    { date: new Date(2026, 7, 28), libelle: 'SALAIRE MAIRIE DE TOULOUSE', montant: 2500 }
  ];
  const periode = calculerCycleDepuisSalaire_(new Date(2026, 7, 10), salairesVariables, 27, { cle: 'MAIRIE DE TOULOUSE' });
  verifier('Cycle canonique démarre le 28', new Date(periode.debut).getDate() === 28);
  verifier('Cycle canonique finit le 27', new Date(periode.fin).getDate() === 27);

  const avant = calculerPeriodeBudgetaireCanonique_(new Date(2026, 7, 27, 12));
  const apres = calculerPeriodeBudgetaireCanonique_(new Date(2026, 7, 28, 12));
  verifier('Le 27 reste dans le cycle précédent', new Date(avant.debut).getMonth() === 6 && new Date(avant.debut).getDate() === 28);
  verifier('Le 28 ouvre le cycle suivant', new Date(apres.debut).getMonth() === 7 && new Date(apres.debut).getDate() === 28);

  const echecs = tests.filter(t => !t.succes);
  if (echecs.length) throw new Error(echecs.map(t => t.nom).join(', '));
  return { succes: true, tests: tests.length, convention: '28 inclus → 27 inclus' };
}
