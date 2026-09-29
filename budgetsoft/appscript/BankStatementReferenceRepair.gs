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
  // Une observation bancaire explicite peut être plus récente qu'un relevé PDF.
  // Elle devient alors un ancrage canonique, sans fabriquer d'opération manquante.
  try{
    const p=Object.fromEntries(lireTable_('Parametres').map(function(x){return[String(x.cle),x.valeur];}));
    const id=String(compteId||''),source=String(p['solde_releve_source_'+id]||'');
    const d=p['date_solde_releve_'+id],s=Number(String(p['solde_releve_'+id]||'').replace(',','.'));
    if(/observation bancaire certifi[ée]e/i.test(source)&&d&&Number.isFinite(s)){
      candidats.push({dateCloture:d,soldeCloture:s,dateOuverture:null,soldeOuverture:null,source:'observation_bancaire_certifiee'});
    }
  }catch(e){}
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


function certifierSoldeBancaireObserveBudgetSoft20260929(compteId,soldeObserve,dateReference){
  verifierInitialisation_();
  const comptes=lireTable_('Comptes').filter(function(x){return convertirBooleen_(x.actif);});
  let compte=null;
  if(compteId)compte=comptes.find(function(x){return String(x.id||'')===String(compteId)||String(x.nom||'')===String(compteId);});
  if(!compte)compte=comptes.find(estCompteBancaireCourantBudgetSoft_);
  if(!compte||!estCompteBancaireCourantBudgetSoft_(compte))throw new Error('Compte courant introuvable.');
  const observe=Number(String(soldeObserve).replace(/\s/g,'').replace(',','.'));
  if(!Number.isFinite(observe))throw new Error('Solde bancaire observé invalide.');

  const id=String(compte.id),paramsAvant=Object.fromEntries(lireTable_('Parametres').map(function(p){return[String(p.cle),p.valeur];})),aujourdhui=typeof jourReferenceCanonBudgetSoft20260906_==='function'
    ?jourReferenceCanonBudgetSoft20260906_(new Date())
    :Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  let jourRef=String(dateReference||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(jourRef)){
    const source=lireTable_('Operations');
    const ops=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(source):source;
    const jours=ops.filter(function(o){
      return String(o&&o.compte||'')===id&&!/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||''));
    }).map(function(o){
      return typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):'';
    }).filter(function(j){return !!j&&j<=aujourdhui;}).sort();
    jourRef=jours.length?jours[jours.length-1]:aujourdhui;
  }
  if(jourRef>aujourdhui)throw new Error('La date de référence observée ne peut pas être future.');

  let avant=null;
  try{
    const synth=construireSyntheseComptes20260828_();
    avant=(synth.comptes||[]).find(function(x){return String(x.id||'')===id;})||null;
  }catch(e){}
  const calculeAvant=avant&&Number.isFinite(Number(avant.soldeReel))?Number(avant.soldeReel):null;
  const ecart=calculeAvant===null?null:Math.round((observe-calculeAvant)*100)/100;
  const horodatage=new Date().toISOString();

  const cleEcartHistorique='solde_releve_ecart_reconciliation_'+id;
  const cleEcartInitial='solde_releve_ecart_reconciliation_initial_'+id;
  const cleEcartDernier='solde_releve_ecart_derniere_certification_'+id;
  const precedentHistorique=Number(String(paramsAvant[cleEcartHistorique]===undefined?'':paramsAvant[cleEcartHistorique]).replace(',','.'));
  const precedentInitial=Number(String(paramsAvant[cleEcartInitial]===undefined?'':paramsAvant[cleEcartInitial]).replace(',','.'));
  const ecartNonNul=ecart!==null&&Math.abs(ecart)>=0.005;
  const historiqueAPreserver=Number.isFinite(precedentInitial)&&Math.abs(precedentInitial)>=0.005
    ?precedentInitial
    :(Number.isFinite(precedentHistorique)&&Math.abs(precedentHistorique)>=0.005
      ?precedentHistorique
      :(ecartNonNul?ecart:null));

  enregistrerParametreBudgetaire_('solde_releve_'+id,Math.round(observe*100)/100);
  enregistrerParametreBudgetaire_('date_solde_releve_'+id,jourRef+'T12:00:00');
  enregistrerParametreBudgetaire_('solde_releve_source_'+id,'Observation bancaire certifiée Hello bank! · '+horodatage);
  // Doctrine : l'écart historique prouvé ne doit jamais disparaître lors d'une
  // re-certification idempotente. Le résultat de la dernière certification est
  // conservé séparément.
  if(historiqueAPreserver!==null){
    enregistrerParametreBudgetaire_(cleEcartHistorique,historiqueAPreserver);
    enregistrerParametreBudgetaire_(cleEcartInitial,historiqueAPreserver);
  }
  enregistrerParametreBudgetaire_(cleEcartDernier,ecart===null?'':ecart);
  enregistrerParametreBudgetaire_('solde_releve_observe_le_'+id,horodatage);

  if(typeof marquerSnapshotGlobalBudgetSoftObsolete20260916_==='function'){
    marquerSnapshotGlobalBudgetSoftObsolete20260916_('certification_solde_bancaire_observe');
  }
  return{
    ok:true,version:'2026-09-29.2',
    compte:{id:id,nom:String(compte.nom||'')},
    soldeObserve:Math.round(observe*100)/100,
    dateReference:jourRef,
    soldeCalculeAvant:calculeAvant,
    ecartReconciliation:ecart,
    ecartHistoriqueConserve:historiqueAPreserver,
    source:'observation_bancaire_certifiee',
    doctrine:'Le solde bancaire observé est un ancrage canonique. L écart historique est conservé comme diagnostic et aucune opération manquante n est inventée.'
  };
}

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
