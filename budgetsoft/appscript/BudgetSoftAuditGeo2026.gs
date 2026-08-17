function reparerFraisProAubagneMarseille2026(){
  verifierInitialisation_();
  const ops=lireTable_('Operations');
  let modifiees=0;
  const detail=[];
  ops.forEach(o=>{
    const type=String(o.type||'').toLowerCase();
    const categorie=String(o.categorie||'').trim();
    if(type!=='depense'||categorie)return;
    const texte=normaliserTexteBanque_([o.marchand_normalise||'',o.libelle_bancaire||'',o.libelle||''].join(' '));
    if(!/(?:^|\s)(AUBAGNE|MARSEILLE)(?:\s|$)/.test(texte))return;
    enregistrerLigne('Operations',Object.assign({},o,{categorie:'Frais professionnels',montant:Math.abs(Number(o.montant||0))}));
    modifiees++;
    detail.push({id:o.id,date:o.date,libelle:o.libelle,montant:o.montant});
  });
  return {modifiees,detail};
}
