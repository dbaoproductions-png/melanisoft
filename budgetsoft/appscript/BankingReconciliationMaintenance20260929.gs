/*
 * Maintenance ponctuelle de la réconciliation Hello bank! du 29/09/2026.
 * Les fonctions sont conservées pour traçabilité/rejeu contrôlé ; elles ne sont
 * pas des propriétaires métier et ne doivent être appelées par aucune interface.
 */

function certifierSoldeHelloBankCompteJoint20260929(){
  const r=certifierSoldeBancaireObserveBudgetSoft20260929(null,2860.22,null);
  console.log('[CERTIFICATION SOLDE HELLOBANK 20260929] '+JSON.stringify(r));
  return r;
}

function restaurerTraceEcartReconciliationCompteJoint20260929(){
  verifierInitialisation_();
  const comptes=lireTable_('Comptes').filter(function(x){return convertirBooleen_(x.actif);});
  const compte=comptes.find(estCompteBancaireCourantBudgetSoft_);
  if(!compte)throw new Error('Compte courant introuvable.');
  const id=String(compte.id),ecartHistorique=-50;
  const params=Object.fromEntries(lireTable_('Parametres').map(function(p){return[String(p.cle),p.valeur];}));
  const solde=Number(String(params['solde_releve_'+id]||'').replace(',','.'));
  const jour=String(params['date_solde_releve_'+id]||'').slice(0,10);
  if(Math.abs(solde-2860.22)>.005||jour!=='2026-09-28'){
    throw new Error('Restauration refusée : la référence bancaire canonique attendue 2860,22 € au 28/09/2026 n est pas active.');
  }
  enregistrerParametreBudgetaire_('solde_releve_ecart_reconciliation_'+id,ecartHistorique);
  enregistrerParametreBudgetaire_('solde_releve_ecart_reconciliation_initial_'+id,ecartHistorique);
  enregistrerParametreBudgetaire_('solde_releve_ecart_derniere_certification_'+id,0);
  const out={
    ok:true,version:'2026-09-29.1',
    compte:{id:id,nom:String(compte.nom||'')},
    soldeCanonique:solde,dateReference:jour,
    ecartHistoriqueRestaure:ecartHistorique,
    ecartDerniereCertification:0,
    doctrine:'Restauration de la preuve historique uniquement ; aucun solde et aucune opération ne sont modifiés.'
  };
  console.log('[RESTAURATION TRACE ECART RECONCILIATION 20260929] '+JSON.stringify(out));
  return out;
}
