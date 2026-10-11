/**
 * Regression sans acces aux donnees : aucune mutation.
 * Controle la distinction preuve bancaire / recurrence previsionnelle.
 */
function testerRecurrenceBancaireReelleBudgetSoft20261011(){
  const cas=[
    {nom:'Flux bancaire rapproche recurrence',o:{source_bancaire:'flux',statut_bancaire:'rapprochee_charge_fixe',commentaire:'[RECURRENCE:CF-01]'},attendu:true},
    {nom:'PDF bancaire rapproche recurrence',o:{source_bancaire:'pdf',commentaire:'[RECURRENCE:CF-02]'},attendu:true},
    {nom:'Prevision seule',o:{commentaire:'[RECURRENCE:CF-03]'},attendu:false},
    {nom:'Operation manuelle sans recurrence',o:{source_bancaire:'manuel',commentaire:''},attendu:true},
    {nom:'Operation manuelle recurrente',o:{source_bancaire:'manuel',commentaire:'[RECURRENCE:CF-04]'},attendu:false}
  ];
  const resultats=cas.map(function(c){
    const recu=operationReelleCanoniqueBudgetSoft20260906_(c.o);
    return{cas:c.nom,attendu:c.attendu,recu:recu,ok:recu===c.attendu};
  });
  const r={ok:resultats.every(x=>x.ok),lectureSeule:true,version:'2026-10-11.1',resultats:resultats};
  console.log('[TEST RECURRENCE BANCAIRE REELLE] '+JSON.stringify(r));
  if(!r.ok)throw new Error('Regression recurrence bancaire : '+JSON.stringify(r));
  return r;
}
