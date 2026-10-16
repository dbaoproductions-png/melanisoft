/** Tests en lecture seule de l'exception comptable Metis. */
function testerCorrectifMetisSeulBudgetSoft20261016(){
  const original={
    id:'25e75f29-4efa-4985-859e-2636caa6b234',
    compte:'05f09474-e55b-4b64-b438-e31439514fdc',
    source_bancaire:'flux',type:'revenu',montant:156.68,
    date:'2026-09-29T10:00:00.000Z',
    date_comptable:'2026-09-28T22:00:00.000Z'
  };
  const tests=[];
  const check=(nom,operation,attendu)=>{
    const obtenu=jourComptableCanonBudgetSoft20260906_(operation);
    tests.push({nom,attendu,obtenu,ok:obtenu===attendu});
  };
  check('Metis corrige',original,'2026-09-29');
  check('Autre identifiant',Object.assign({},original,{id:'autre'}),'2026-09-28');
  check('Montant different',Object.assign({},original,{montant:156.69}),'2026-09-28');
  check('Autre compte',Object.assign({},original,{compte:'autre'}),'2026-09-28');
  check('Autre date comptable',Object.assign({},original,{date_comptable:'2026-09-27T22:00:00.000Z'}),'2026-09-27');
  check('Autre date operation',Object.assign({},original,{date:'2026-09-30T10:00:00.000Z'}),'2026-09-28');
  check('Date civile',Object.assign({},original,{date_comptable:'2026-09-29'}),'2026-09-29');
  check('Date bancaire ordinaire',Object.assign({},original,{id:'autre',date_comptable:'2026-10-01T22:00:00.000Z'}),'2026-10-01');
  const out={ok:tests.every(t=>t.ok),lectureSeule:true,tests,
    avertissement:'Tests unitaires sans ecriture. Verifier ensuite par auditerSyntheseComptes20260828 et controles intermodules.'};
  console.log('[TEST CORRECTIF METIS CIBLE] '+JSON.stringify(out));return out;
}
