/*
 * Diagnostics historiques du chantier de réconciliation bancaire de septembre 2026.
 *
 * Ces fonctions sont conservées pour traçabilité et reproduction d'incidents, mais
 * ne font plus partie du chemin normal d'audit. L'audit de non-régression actif est
 * auditerProprietairesTresorerieIntermodules20260928() dans
 * BudgetSoftTreasuryOwnerIntermoduleAudit20260928.gs.
 *
 * Aucun de ces diagnostics ne doit être appelé par une interface ou un snapshot.
 */

function auditerVirementEpargneSs1BudgetSoft20260928(){
  const ops=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];
  const params=typeof lireTable_==='function'?(lireTable_('Parametres')||[]):[];
  const comptes=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():null;
  const compteJoint=(comptes&&Array.isArray(comptes.comptes)?comptes.comptes:[]).find(function(x){return /compte joint/i.test(String(x&&x.nom||''));})||null;
  const compteId=String(compteJoint&&compteJoint.id||'');
  const cibleDebut='2026-09-25',cibleFin='2026-09-29';
  function jourOp(o){
    const jc=typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):'';
    const jm=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(o&&o.date):'';
    return {comptable:jc,mouvement:jm};
  }
  const lignes=ops.filter(function(o){
    if(compteId&&String(o&&o.compte||'')!==compteId)return false;
    const j=jourOp(o),a=j.mouvement||j.comptable;
    return !!a&&a>=cibleDebut&&a<=cibleFin;
  }).map(function(o){
    const j=jourOp(o),statut=String(o&&o.statut_bancaire||'').trim().toLowerCase();
    const refJour='2026-08-15';
    const apresReference=!!j.comptable&&j.comptable>refJour;
    const provisoireJourReference=/provisoire/.test(statut)&&!!j.mouvement&&j.mouvement>=refJour&&!!j.comptable&&j.comptable<=refJour;
    return {
      id:String(o&&o.id||''),
      montant:Number(o&&o.montant||0),
      type:String(o&&o.type||''),
      categorie:String(o&&o.categorie||''),
      compte:String(o&&o.compte||''),
      date:String(o&&o.date||''),
      date_comptable:String(o&&o.date_comptable||''),
      jourMouvement:j.mouvement,
      jourComptable:j.comptable,
      statut_bancaire:String(o&&o.statut_bancaire||''),
      source_bancaire:String(o&&o.source_bancaire||''),
      libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
      inclusionSelonReference1508:apresReference||provisoireJourReference,
      motifInclusion:apresReference?'jour_comptable_apres_reference':(provisoireJourReference?'provisoire_jour_mouvement':'exclu')
    };
  });
  const refs=params.filter(function(p){
    const k=String(p&&p.cle||'');
    return compteId&&(k==='solde_releve_'+compteId||k==='date_solde_releve_'+compteId||k==='solde_releve_source_'+compteId);
  }).map(function(p){return{cle:String(p&&p.cle||''),valeur:p&&p.valeur};});
  const out={
    ok:true,lectureSeule:true,version:'2026-09-29.1',
    doctrine:'Audit ciblé 25-29/09 du compte joint : le virement vers Epargne doit rester une sortie bancaire du compte courant.',
    compteJoint:compteJoint,
    references:refs,
    fenetre:{debut:cibleDebut,fin:cibleFin},
    lignes:lignes
  };
  console.log('[AUDIT VIREMENT EPARGNE SS1 CIBLE 20260929] '+JSON.stringify(out));
  return out;
}


function auditerReconciliationCompteJointDepuisReference20260929(){
  const opsSource=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];
  const ops=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'
    ?dedoublonnerOperationsCartesBudgetSoft_(opsSource)
    :opsSource;
  const params=typeof lireTable_==='function'?(lireTable_('Parametres')||[]):[];
  const comptesBruts=typeof lireTable_==='function'?(lireTable_('Comptes')||[]):[];
  const compte=comptesBruts.find(function(x){return /compte joint/i.test(String(x&&x.nom||''));})||null;
  const id=String(compte&&compte.id||'');
  const soldeRef=Number((params.find(function(p){return String(p&&p.cle||'')==='solde_releve_'+id;})||{}).valeur);
  const dateRefBrute=(params.find(function(p){return String(p&&p.cle||'')==='date_solde_releve_'+id;})||{}).valeur;
  const jourRef=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(dateRefBrute):'';

  function construire(ensemble){
    const lignes=[]; let cumul=0;
    ensemble.forEach(function(brut){
      if(String(brut&&brut.compte||'')!==id)return;
      if(/\[RECURRENCE:[^\]]+\]/.test(String(brut&&brut.commentaire||'')))return;
      let o=brut;
      if(!(o&&o.date_comptable)&&typeof enrichirDepuisCommentaireBanque_==='function'){
        try{o=enrichirDepuisCommentaireBanque_(brut)||brut;}catch(e){o=brut;}
      }
      const jour=typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):'';
      const jourAuj=typeof jourReferenceCanonBudgetSoft20260906_==='function'?jourReferenceCanonBudgetSoft20260906_(new Date()):Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
      if(!jour||!jourRef||jour<=jourRef||jour>jourAuj)return;
      const type=String(o&&o.type||'').toLowerCase();
      if(type!=='revenu'&&type!=='depense')return;
      const brutMontant=Math.abs(Number(o&&o.montant||0));
      if(!Number.isFinite(brutMontant)||brutMontant<=0)return;
      const montant=type==='depense'?-brutMontant:brutMontant;
      cumul+=montant;
      lignes.push({
        id:String(o&&o.id||''),jour:jour,type:type,categorie:String(o&&o.categorie||''),
        montant:Math.round(montant*100)/100,
        libelle:String(o&&o.libelle_bancaire||o&&o.libelle||'')
      });
    });
    return {cumul:Math.round(cumul*100)/100,lignes:lignes};
  }

  const brut=construire(opsSource),dedup=construire(ops);
  const epargneBrut=brut.lignes.filter(function(x){return x.id==='d16768b1-1195-4524-a90f-f2000bde8e54'||(/epargne|épargne/i.test(x.categorie)&&Math.abs(x.montant+50)<.011);});
  const epargneDedup=dedup.lignes.filter(function(x){return x.id==='d16768b1-1195-4524-a90f-f2000bde8e54'||(/epargne|épargne/i.test(x.categorie)&&Math.abs(x.montant+50)<.011);});
  const idsDedup=new Set(dedup.lignes.map(function(x){return x.id;}));
  const exclus=brut.lignes.filter(function(x){return !idsDedup.has(x.id);});

  const synth=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():null;
  const compteSynth=(synth&&Array.isArray(synth.comptes)?synth.comptes:[]).find(function(x){return String(x&&x.id||'')===id;})||null;
  const soldeReconstruit=Math.round((soldeRef+dedup.cumul)*100)/100;
  const out={
    ok:true,lectureSeule:true,version:'2026-09-29.4',
    doctrine:'Le propriétaire des comptes travaille sur les opérations dédupliquées. Tout virement sortant reste une sortie bancaire ; sa catégorie analytique ne neutralise pas son montant.',
    reference:{solde:soldeRef,date:jourRef},
    brut:{nombre:brut.lignes.length,totalMouvements:brut.cumul},
    dedup:{nombre:dedup.lignes.length,totalMouvements:dedup.cumul,soldeReconstruit:soldeReconstruit},
    soldeSynthese:compteSynth&&Number(compteSynth.soldeReel),
    ecartSyntheseVsDedup:compteSynth?Math.round((Number(compteSynth.soldeReel)-soldeReconstruit)*100)/100:null,
    virementEpargne:{brut:epargneBrut,dedup:epargneDedup,conserve:epargneDedup.length>0},
    doublonsExclus:{nombre:exclus.length,lignes:exclus}
  };
  console.log('[AUDIT RECONCILIATION COMPTE JOINT DEDUP 20260929] '+JSON.stringify(out));
  return out;
}


function auditerEcart50CompteJoint20260929(){
  const opsSource=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];
  const ops=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'
    ?dedoublonnerOperationsCartesBudgetSoft_(opsSource)
    :opsSource;
  const params=typeof lireTable_==='function'?(lireTable_('Parametres')||[]):[];
  const comptes=typeof lireTable_==='function'?(lireTable_('Comptes')||[]):[];
  const compte=comptes.find(function(x){return /compte joint/i.test(String(x&&x.nom||''));})||null;
  const id=String(compte&&compte.id||'');
  const dateRefBrute=(params.find(function(p){return String(p&&p.cle||'')==='date_solde_releve_'+id;})||{}).valeur;
  const jourRef=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(dateRefBrute):'';
  const jourAuj=typeof jourReferenceCanonBudgetSoft20260906_==='function'
    ?jourReferenceCanonBudgetSoft20260906_(new Date())
    :Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');

  const lignes=[];
  ops.forEach(function(brut){
    if(String(brut&&brut.compte||'')!==id)return;
    if(/\[RECURRENCE:[^\]]+\]/.test(String(brut&&brut.commentaire||'')))return;
    let o=brut;
    if(!(o&&o.date_comptable)&&typeof enrichirDepuisCommentaireBanque_==='function'){
      try{o=enrichirDepuisCommentaireBanque_(brut)||brut;}catch(e){o=brut;}
    }
    const jour=typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):'';
    if(!jour||!jourRef||jour<=jourRef||jour>jourAuj)return;
    const type=String(o&&o.type||'').toLowerCase();
    if(type!=='revenu'&&type!=='depense')return;
    const brutMontant=Math.abs(Number(o&&o.montant||0));
    if(!Number.isFinite(brutMontant)||brutMontant<=0)return;
    const signe=type==='depense'?-brutMontant:brutMontant;
    const txt=String((o&&o.libelle_bancaire||o&&o.libelle||'')+' '+(o&&o.categorie||'')).toLowerCase();
    if(Math.abs(brutMontant-50)<.011||/virement|virt |vir /.test(txt)){
      lignes.push({
        id:String(o&&o.id||''),
        jour:jour,
        type:type,
        categorie:String(o&&o.categorie||''),
        montant:Math.round(signe*100)/100,
        source_bancaire:String(o&&o.source_bancaire||''),
        statut_bancaire:String(o&&o.statut_bancaire||''),
        libelle:String(o&&o.libelle_bancaire||o&&o.libelle||'')
      });
    }
  });
  const plus50=lignes.filter(function(x){return Math.abs(Number(x.montant)-50)<.011;});
  const moins50=lignes.filter(function(x){return Math.abs(Number(x.montant)+50)<.011;});
  const virementsSortants=lignes.filter(function(x){return Number(x.montant)<0&&/virement|virt |vir /i.test(String(x.libelle||''));});
  const virementsEntrants=lignes.filter(function(x){return Number(x.montant)>0&&/virement|virt |vir /i.test(String(x.libelle||''));});
  const out={
    ok:true,lectureSeule:true,version:'2026-09-29.1',
    doctrine:'Recherche ciblée de l écart résiduel de 50 euros après réconciliation exacte du compte joint.',
    fenetre:{apres:jourRef,jusqua:jourAuj},
    plus50:plus50,
    moins50:moins50,
    virementsSortants:virementsSortants,
    virementsEntrants:virementsEntrants
  };
  console.log('[AUDIT ECART 50 COMPTE JOINT 20260929] '+JSON.stringify(out));
  return out;
}
