function reparerDernierSoldeReleveDepuisHistorique(){
  verifierInitialisation_();
  const comptes=lireTable_('Comptes');
  const resultats=[];
  comptes.forEach(function(compte){
    const id=String(compte.id||'');
    if(!id)return;
    const historique=typeof lireHistoriqueReleves_==='function'?lireHistoriqueReleves_(id):[];
    const valides=(historique||[]).filter(function(r){
      const d=r&&r.dateCloture?new Date(r.dateCloture):null;
      const s=r&&r.soldeCloture!==null&&r.soldeCloture!==undefined?Number(r.soldeCloture):NaN;
      return d&&!isNaN(d)&&Number.isFinite(s);
    }).sort(function(a,b){return new Date(b.dateCloture)-new Date(a.dateCloture);});
    if(!valides.length){
      resultats.push({compte:id,nom:String(compte.nom||''),ok:false,message:'Aucun relevé historique exploitable.'});
      return;
    }
    const dernier=valides[0];
    enregistrerParametreBudgetaire_('solde_releve_'+id,Number(dernier.soldeCloture));
    enregistrerParametreBudgetaire_('date_solde_releve_'+id,dernier.dateCloture);
    const plusAnciens=valides.slice().sort(function(a,b){return new Date(a.dateOuverture||a.dateCloture)-new Date(b.dateOuverture||b.dateCloture);});
    const premier=plusAnciens[0];
    if(premier&&premier.dateOuverture&&premier.soldeOuverture!==null&&premier.soldeOuverture!==undefined){
      enregistrerParametreBudgetaire_('solde_ouverture_premier_releve_'+id,Number(premier.soldeOuverture));
      enregistrerParametreBudgetaire_('date_ouverture_premier_releve_'+id,premier.dateOuverture);
    }
    resultats.push({compte:id,nom:String(compte.nom||''),ok:true,dateCloture:dernier.dateCloture,soldeCloture:Number(dernier.soldeCloture)});
  });
  return {ok:resultats.some(function(r){return r.ok;}),resultats:resultats};
}
