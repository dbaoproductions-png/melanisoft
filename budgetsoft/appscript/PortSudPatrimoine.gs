const PORT_SUD_PATRIMOINE_VERSION = '1.0';

function ajouterPatrimoinePortSud2026(){
  verifierInitialisation_();
  const actifs=lireTable_('Actifs');
  const dateValeur=new Date('2026-08-16T12:00:00');
  const biens=[
    {
      nom:'Port Sud — grand appartement F3/4',
      type:'Immobilier',
      valeur:320000,
      date_valeur:dateValeur
    },
    {
      nom:'Port Sud — petit appartement F2/3',
      type:'Immobilier',
      valeur:242000,
      date_valeur:dateValeur
    }
  ];
  biens.forEach(bien=>{
    const nom=String(bien.nom).toLowerCase();
    const existant=actifs.find(a=>String(a.nom||'').trim().toLowerCase()===nom);
    enregistrerLigne('Actifs',Object.assign({},existant||{},bien));
  });
  return chargerPatrimoine();
}
