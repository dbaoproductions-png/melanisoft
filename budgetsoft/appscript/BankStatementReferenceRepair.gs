function reparerDernierSoldeReleveDepuisHistorique(){
  verifierInitialisation_();
  const comptes=lireTable_('Comptes');
  const resultats=[];

  comptes.forEach(function(compte){
    const id=String(compte.id||'');
    if(!id)return;

    const candidats=[];

    // 1. Historique réellement mémorisé par les imports PDF.
    const historique=typeof lireHistoriqueReleves_==='function'?lireHistoriqueReleves_(id):[];
    (historique||[]).forEach(function(r){
      const d=r&&r.dateCloture?new Date(r.dateCloture):null;
      const s=r&&r.soldeCloture!==null&&r.soldeCloture!==undefined?Number(r.soldeCloture):NaN;
      if(d&&!isNaN(d)&&Number.isFinite(s)){
        candidats.push({dateCloture:r.dateCloture,soldeCloture:s,dateOuverture:r.dateOuverture||null,soldeOuverture:r.soldeOuverture,source:'historique_imports'});
      }
    });

    // 2. Chaîne bancaire 2026 déjà certifiée dans BudgetSoft. Elle est
    // indispensable pour réparer un classeur dont l'historique_releves a été
    // créé après les premiers imports et ne contient donc pas tous les relevés.
    if(typeof RELEVES_CERTIFIES_BUDGETSOFT_!=='undefined'&&Array.isArray(RELEVES_CERTIFIES_BUDGETSOFT_)){
      RELEVES_CERTIFIES_BUDGETSOFT_.forEach(function(r){
        if(!r||!r.fin||!Number.isFinite(Number(r.cloture)))return;
        candidats.push({
          dateCloture:String(r.fin)+'T12:00:00',
          soldeCloture:Number(r.cloture),
          dateOuverture:r.debut?String(r.debut)+'T12:00:00':null,
          soldeOuverture:Number.isFinite(Number(r.ouverture))?Number(r.ouverture):null,
          source:'referentiel_certifie_2026'
        });
      });
    }

    const valides=candidats.filter(function(r){
      const d=new Date(r.dateCloture),s=Number(r.soldeCloture);
      return !isNaN(d)&&Number.isFinite(s);
    }).sort(function(a,b){return new Date(b.dateCloture)-new Date(a.dateCloture);});

    if(!valides.length){
      resultats.push({compte:id,nom:String(compte.nom||''),ok:false,message:'Aucun relevé historique ou certifié exploitable.'});
      return;
    }

    const dernier=valides[0];
    enregistrerParametreBudgetaire_('solde_releve_'+id,Number(dernier.soldeCloture));
    enregistrerParametreBudgetaire_('date_solde_releve_'+id,dernier.dateCloture);
    enregistrerParametreBudgetaire_('solde_releve_source_'+id,'Réparation depuis '+dernier.source);

    // Pour la base historique, on cherche au contraire le point d'ouverture
    // le plus ancien disponible, afin que l'analyse 12 mois puisse remonter.
    const avecOuverture=candidats.filter(function(r){
      const d=r&&r.dateOuverture?new Date(r.dateOuverture):null;
      const s=r&&r.soldeOuverture!==null&&r.soldeOuverture!==undefined?Number(r.soldeOuverture):NaN;
      return d&&!isNaN(d)&&Number.isFinite(s);
    }).sort(function(a,b){return new Date(a.dateOuverture)-new Date(b.dateOuverture);});

    if(avecOuverture.length){
      const premier=avecOuverture[0];
      enregistrerParametreBudgetaire_('solde_ouverture_premier_releve_'+id,Number(premier.soldeOuverture));
      enregistrerParametreBudgetaire_('date_ouverture_premier_releve_'+id,premier.dateOuverture);
    }

    resultats.push({
      compte:id,
      nom:String(compte.nom||''),
      ok:true,
      dateCloture:dernier.dateCloture,
      soldeCloture:Number(dernier.soldeCloture),
      source:dernier.source
    });
  });

  return {ok:resultats.some(function(r){return r.ok;}),resultats:resultats};
}
