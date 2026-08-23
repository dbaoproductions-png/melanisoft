// Compatibilité de transport google.script.run pour le module Analyses.
// Le moteur peut produire des objets Date imbriqués dans les périodes ;
// google.script.run ne les transporte pas de manière fiable vers le navigateur.
// Cette enveloppe convertit donc le résultat en structure JSON pure sans toucher aux calculs.

function chargerAnalysesBudgetairesSerialisable(nombrePeriodes) {
  const resultat = chargerAnalysesBudgetaires(nombrePeriodes);
  return JSON.parse(JSON.stringify(resultat));
}

function diagnostiquerTransportAnalyses19082026() {
  const t0 = Date.now();
  const resultat = chargerAnalysesBudgetairesSerialisable(6);
  const resume = {
    ok: true,
    ms: Date.now() - t0,
    version: resultat && resultat.version,
    periodes: resultat && resultat.periodes ? resultat.periodes.length : 0,
    courante: resultat && resultat.courante ? {
      debut: resultat.courante.debut,
      fin: resultat.courante.fin,
      revenus: resultat.courante.revenus,
      depenses: resultat.courante.depenses
    } : null,
    recettes: !!(resultat && resultat.recettes),
    depensesDetail: !!(resultat && resultat.depensesDetail)
  };
  console.log(JSON.stringify(resume, null, 2));
  return resume;
}
