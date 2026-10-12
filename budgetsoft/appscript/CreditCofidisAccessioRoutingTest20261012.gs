/** Tests purement en lecture seule du routage Cofidis / Accessio. */
function testerRoutageCofidisAccessio20261012(){
  const credits=[
    {id:'COF',nom:'Cofidis',mensualite:207.89},
    {id:'ACC',nom:'Cofidis Accessio — renouvelable',mensualite:33.60},
    {id:'AUT',nom:'Creatis',mensualite:865.11}
  ];
  const cas=[
    {nom:'Cofidis 207,89',libelle:'Prelevement Cofidis',montant:-207.89,attendu:'COF'},
    {nom:'Accessio 33,60 libelle Cofidis',libelle:'Prelevement Cofidis',montant:-33.60,attendu:'ACC'},
    {nom:'Accessio 33,60',libelle:'Cofidis Accessio',montant:-33.60,attendu:'ACC'},
    {nom:'Cofidis inconnu refuse',libelle:'Cofidis',montant:-99,attendu:''},
    {nom:'Hors famille pas de sur-routage',libelle:'Creatis',montant:-865.11,attendu:'AUT'}
  ];
  const resultats=cas.map(c=>{
    const r=trouverCreditRattrapageCofidis20261012_({
      charge:{libelle:c.libelle,montant:Math.abs(c.montant)},
      operation:{libelle_bancaire:c.libelle,montant:c.montant}
    },credits);
    const id=r.ok?String(r.credit.id||''):'';
    return{cas:c.nom,attendu:c.attendu,recu:id,ok:id===c.attendu,raison:r.raison||''};
  });
  const out={ok:resultats.every(x=>x.ok),lectureSeule:true,version:'2026-10-12.1',resultats};
  console.log('[TEST ROUTAGE COFIDIS ACCESSIO 20261012] '+JSON.stringify(out));
  if(!out.ok)throw new Error('Echec regression routage Cofidis / Accessio');
  return out;
}
