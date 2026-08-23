function estCompteBancaireCourantBudgetSoft_(compte){
  const texte=String((compte&&compte.nom||'')+' '+(compte&&compte.type||'')).toLowerCase();
  return /compte\s*(joint|courant)|compte\s*cheques?|courant/.test(texte)&&!/livret|epargne|épargne/.test(texte);
}

function candidatsReferenceReleveCompte_(compteId){
  const candidats=[];
  const historique=typeof lireHistoriqueReleves_==='function'?lireHistoriqueReleves_(compteId):[];
  (historique||[]).forEach(function(r){
    const d=r&&r.dateCloture?new Date(r.dateCloture):null;
    const s=r&&r.soldeCloture!==null&&r.soldeCloture!==undefined?Number(r.soldeCloture):NaN;
    if(d&&!isNaN(d)&&Number.isFinite(s))candidats.push({dateCloture:r.dateCloture,soldeCloture:s,dateOuverture:r.dateOuverture||null,soldeOuverture:r.soldeOuverture,source:'historique_imports'});
  });
  if(typeof RELEVES_CERTIFIES_BUDGETSOFT_!=='undefined'&&Array.isArray(RELEVES_CERTIFIES_BUDGETSOFT_)){
    RELEVES_CERTIFIES_BUDGETSOFT_.forEach(function(r){
      if(!r||!r.fin||!Number.isFinite(Number(r.cloture)))return;
      candidats.push({dateCloture:String(r.fin)+'T12:00:00',soldeCloture:Number(r.cloture),dateOuverture:r.debut?String(r.debut)+'T12:00:00':null,soldeOuverture:Number.isFinite(Number(r.ouverture))?Number(r.ouverture):null,source:'referentiel_certifie_2026'});
    });
  }
  return candidats;
}

function synchroniserReferenceReleveCompte_(compteId){
  const comptes=lireTable_('Comptes');
  const compte=comptes.find(c=>String(c.id||'')===String(compteId||''));
  if(!compte||!estCompteBancaireCourantBudgetSoft_(compte))return{ok:false,ignore:true,message:'Compte non courant : référence de relevé non modifiée.'};
  const candidats=candidatsReferenceReleveCompte_(String(compte.id));
  const valides=candidats.filter(r=>{const d=new Date(r.dateCloture),s=Number(r.soldeCloture);return !isNaN(d)&&Number.isFinite(s);}).sort((a,b)=>new Date(b.dateCloture)-new Date(a.dateCloture));
  if(!valides.length)return{ok:false,message:'Aucun relevé historique ou certifié exploitable.'};
  const dernier=valides[0];
  enregistrerParametreBudgetaire_('solde_releve_'+String(compte.id),Number(dernier.soldeCloture));
  enregistrerParametreBudgetaire_('date_solde_releve_'+String(compte.id),dernier.dateCloture);
  enregistrerParametreBudgetaire_('solde_releve_source_'+String(compte.id),'Synchronisation depuis '+dernier.source);
  const avecOuverture=candidats.filter(r=>{const d=r&&r.dateOuverture?new Date(r.dateOuverture):null,s=r&&r.soldeOuverture!==null&&r.soldeOuverture!==undefined?Number(r.soldeOuverture):NaN;return d&&!isNaN(d)&&Number.isFinite(s);}).sort((a,b)=>new Date(a.dateOuverture)-new Date(b.dateOuverture));
  if(avecOuverture.length){const premier=avecOuverture[0];enregistrerParametreBudgetaire_('solde_ouverture_premier_releve_'+String(compte.id),Number(premier.soldeOuverture));enregistrerParametreBudgetaire_('date_ouverture_premier_releve_'+String(compte.id),premier.dateOuverture);}
  return{ok:true,compte:String(compte.id),nom:String(compte.nom||''),dateCloture:dernier.dateCloture,soldeCloture:Number(dernier.soldeCloture),source:dernier.source};
}

function reparerDernierSoldeReleveDepuisHistorique(){
  verifierInitialisation_();
  const comptes=lireTable_('Comptes').filter(c=>convertirBooleen_(c.actif)&&estCompteBancaireCourantBudgetSoft_(c));
  const resultats=comptes.map(c=>synchroniserReferenceReleveCompte_(c.id));
  return{ok:resultats.some(r=>r&&r.ok),resultats};
}
