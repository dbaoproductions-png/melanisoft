const CYCLE_VERSION = '2.1.0';
const CYCLE_SALARY_WORDS = ['SALAIRE','PAYE','TRAITEMENT'];
const CYCLE_CARD_WORDS = ['CARTE','CB','FACTURE CARTE','FACTURE(S) CARTE'];

function creerModeleCycle_(donnees) {
  return Object.assign({
    version: CYCLE_VERSION,
    periode: null,
    salaire: null,
    indicateurs: {},
    operations: { debitees: [], engagees: [] },
    alertes: []
  }, donnees || {});
}
