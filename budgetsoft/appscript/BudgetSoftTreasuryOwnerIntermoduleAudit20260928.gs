const BUDGETSOFT_TREASURY_OWNER_INTERMODULE_AUDIT_20260928_VERSION='2026-09-29.2';

function arrTreasuryOwnerAudit20260928_(n){return Math.round(Number(n||0)*100)/100;}
function ecartTreasuryOwnerAudit20260928_(a,b){return arrTreasuryOwnerAudit20260928_(Number(a||0)-Number(b||0));}

function auditerProprietairesTresorerieIntermodules20260928(){
  const t0=Date.now();
  if(typeof chargerSnapshotGlobalBudgetSoft20260906!=='function'){
    throw new Error('Snapshot global BudgetSoft indisponible.');
  }
  const charge=chargerSnapshotGlobalBudgetSoft20260906();
  const etat=charge&&charge.disponible&&charge.etat||null;
  if(!etat||etat.ok!==true){
    throw new Error('Aucune révision globale BudgetSoft publiée et valide à auditer.');
  }
  const modules=etat.modules||{};
  const cerbere=modules.cerbere||null;
  const dashboard=modules.dashboard||null;
  const projection=modules.projectionEtendue||null;
  const comptes=modules.comptes||null;

  const p0=cerbere&&Array.isArray(cerbere.periodes)?cerbere.periodes[0]:null;
  const v0=p0&&p0.v37||{};
  const periode=p0&&p0.periode||p0||{};
  const debut=periode&&periode.debut?new Date(periode.debut):null;
  const frontiere=debut&&!isNaN(debut.getTime())?new Date(debut):null;
  if(frontiere){frontiere.setDate(frontiere.getDate()-1);frontiere.setHours(23,59,59,999);}

  const lignesComptes=Array.isArray(comptes&&comptes.comptes)?comptes.comptes:[];
  const compteCourant=lignesComptes.find(function(x){
    if(typeof estCompteCourantCanoniqueBudgetSoft20260906_==='function'){
      return estCompteCourantCanoniqueBudgetSoft20260906_(x);
    }
    const t=String((x&&x.nom||'')+' '+(x&&x.type||'')).toLowerCase();
    return /courant|compte\s*(joint|cheques?)/.test(t)&&!/livret|epargne|épargne/.test(t);
  })||null;
  const soldeReelCompte=compteCourant&&Number(compteCourant.soldeReel);
  const dateReferenceCompte=compteCourant&&compteCourant.dateSolde||'';

  let operations=[];
  try{operations=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];}catch(e){operations=[];}
  const ss1Canonique=frontiere&&compteCourant&&typeof soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_==='function'
    ?Number(soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_(frontiere,{
      soldeReel:soldeReelCompte,
      comptes:[compteCourant],
      operations:operations,
      dateReference:dateReferenceCompte||new Date()
    }))
    :NaN;
  const ss1=Number(v0&&v0.ss1);

  const d0=dashboard&&dashboard.courtTerme||{};
  const dashboardSs1=Number(d0.soldeInitialReference);
  const dashboardRt1=Number(d0.revenusAttendus);
  const rt1=Number(v0&&v0.rt1);

  const lignes=Array.isArray(projection&&projection.lignes)?projection.lignes:[];
  const revenusRecurrents=lignes.filter(function(x){
    return String(x&&x.source||'')==='revenu_recurrent'&&Number(x&&x.montantSigne||0)>0;
  });
  const salaire=v0&&v0.salaireOuverture||{};
  const ajustementSalaire=Number(salaire&&salaire.ajustementSS1||0);

  const controles={
    snapshotUniqueValide:!!(etat&&etat.ok===true&&etat.revisionBudgetSoft),
    ss1CanoniqueDisponible:Number.isFinite(ss1Canonique),
    ss1CerbereEgalCanon:Number.isFinite(ss1Canonique)&&Number.isFinite(ss1)&&Math.abs(ss1-ss1Canonique)<.011,
    dashboardLitSs1Cerbere:Number.isFinite(dashboardSs1)&&Number.isFinite(ss1)&&Math.abs(dashboardSs1-ss1)<.011,
    dashboardLitRt1Cerbere:Number.isFinite(dashboardRt1)&&Number.isFinite(rt1)&&Math.abs(dashboardRt1-rt1)<.011,
    salaireNeModifiePasSs1:Math.abs(ajustementSalaire)<.011,
    projectionCanoniqueDisponible:!!(projection&&projection.ok!==false),
    revenusRecurrentsNonFiltres:revenusRecurrents.length>0
  };
  const ok=Object.keys(controles).every(function(k){return controles[k]===true;});

  const out={
    ok:ok,
    lectureSeule:true,
    version:'2026-09-29.2',
    revisionBudgetSoft:String(etat.revisionBudgetSoft||''),
    dureeMs:Date.now()-t0,
    doctrine:'Audit sans recalcul métier : une seule révision globale publiée est lue ; SS1 est recomposé depuis le solde bancaire canonique de cette révision et les opérations réelles jusqu à sa date de référence.',
    proprietaires:{
      snapshot:'chargerSnapshotGlobalBudgetSoft20260906',
      ss1:'soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_',
      trajectoire:'modules.projectionEtendue du snapshot',
      recettes:'modules.cerbere.periodes[0].v37.rt1',
      dashboard:'modules.dashboard, consommateur uniquement'
    },
    frontiere:frontiere?Utilities.formatDate(frontiere,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
    referenceBancaire:{
      compte:compteCourant?String(compteCourant.nom||''):'',
      soldeReel:arrTreasuryOwnerAudit20260928_(soldeReelCompte),
      dateReference:String(dateReferenceCompte||''),
      source:String(compteCourant&&compteCourant.sourceSolde||'')
    },
    valeurs:{
      ss1Canonique:arrTreasuryOwnerAudit20260928_(ss1Canonique),
      ss1Cerbere:arrTreasuryOwnerAudit20260928_(ss1),
      ecartSs1:ecartTreasuryOwnerAudit20260928_(ss1,ss1Canonique),
      dashboardSs1:arrTreasuryOwnerAudit20260928_(dashboardSs1),
      rt1Cerbere:arrTreasuryOwnerAudit20260928_(rt1),
      revenusAttendusDashboard:arrTreasuryOwnerAudit20260928_(dashboardRt1),
      ajustementSs1Salaire:arrTreasuryOwnerAudit20260928_(ajustementSalaire),
      revenusRecurrentsProjection:revenusRecurrents.length,
      totalRevenusRecurrentsProjection:arrTreasuryOwnerAudit20260928_(revenusRecurrents.reduce(function(s,x){return s+Number(x.montantSigne||0);},0))
    },
    controles:controles,
    versions:{
      cerbere:String(cerbere&&cerbere.version||''),
      dashboard:String(dashboard&&dashboard.version||''),
      projection:String(projection&&projection.version||'')
    }
  };
  console.log('[AUDIT PROPRIETAIRES TRESORERIE INTERMODULES 20260929 SNAPSHOT UNIQUE] '+JSON.stringify(out));
  return out;
}


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
