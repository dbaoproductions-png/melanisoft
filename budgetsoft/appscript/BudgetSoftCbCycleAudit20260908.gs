const BUDGETSOFT_CB_CYCLE_AUDIT_20260908_VERSION='2026-09-08.1';

function arrAuditCbCycleBudgetSoft20260908_(n){return Math.round((Number(n)||0)*100)/100;}
function dateIsoJourAuditCbCycleBudgetSoft20260908_(d){
  return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function sommeAuditCbCycleBudgetSoft20260908_(lignes){
  return arrAuditCbCycleBudgetSoft20260908_((lignes||[]).reduce((s,x)=>s+Number(x&&x.montantSigne||0),0));
}
function resumeLignesAuditCbCycleBudgetSoft20260908_(lignes){
  return (lignes||[]).map(x=>({
    source:x.source||'',sourceId:x.sourceId||'',date:x.date||'',libelle:x.libelle||'',categorie:x.categorie||'',
    montant:arrAuditCbCycleBudgetSoft20260908_(x.montantSigne),preuve:x.preuve||'',charge_fixe_id:x.charge_fixe_id||''
  }));
}

/**
 * Audit métier du cycle CB suivant.
 * On distingue strictement :
 *  1. opérations CB certaines déjà connues ;
 *  2. charges fixes réglées par CB ;
 *  3. reste Cerbère du cycle ;
 *  4. queue estimée 28-fin de mois.
 *
 * La cible bancaire est volontairement le 31/10 afin d'inclure le débit différé
 * associé au cycle Cerbère qui se termine le 27/10.
 */
function auditerCycleCbSuivant27102026BudgetSoft20260908(){
  const dateFinCycle='2026-10-27';
  const dateDebit='2026-10-31';
  const r=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateDebit);
  const lignes=Array.isArray(r&&r.lignes)?r.lignes:[];
  const erreurs=[];

  const cbCertaines=lignes.filter(x=>x.source==='operation_future'&&typeof estCbTresorerieCanonique20260907_==='function'&&estCbTresorerieCanonique20260907_(x));
  const chargesFixesCb=lignes.filter(x=>x.source==='charge_fixe'&&typeof estCbTresorerieCanonique20260907_==='function'&&estCbTresorerieCanonique20260907_(x));
  const estimations=lignes.filter(x=>x.source==='debit_cb_estime');
  const estimationCycle=estimations.find(x=>dateIsoJourAuditCbCycleBudgetSoft20260908_(x.date)===dateDebit)||estimations[estimations.length-1]||null;

  const partCerbere=arrAuditCbCycleBudgetSoft20260908_(estimationCycle&&estimationCycle.partCerbere||0);
  const partFinMois=arrAuditCbCycleBudgetSoft20260908_(estimationCycle&&estimationCycle.partFinMois||0);
  const complementEstime=arrAuditCbCycleBudgetSoft20260908_(Math.abs(Number(estimationCycle&&estimationCycle.montantSigne||0)));

  if(estimationCycle&&Math.abs(complementEstime-arrAuditCbCycleBudgetSoft20260908_(partCerbere+partFinMois))>.01){
    erreurs.push({code:'CB_RESIDUEL_FORMULE',message:'Le complément CB estimé ne correspond pas à partCerbere + partFinMois.',complementEstime,partCerbere,partFinMois});
  }

  // Détection de doublons structurels : une même charge fixe ne doit pas exister à la fois
  // comme charge_fixe CB et comme operation_future certaine si cette dernière la remplace déjà.
  const doublonsChargeFixe=[];
  chargesFixesCb.forEach(cf=>{
    cbCertaines.forEach(op=>{
      const idCf=String(cf.sourceId||cf.charge_fixe_id||'');
      const idOp=String(op.charge_fixe_id||'');
      if(idCf&&idOp&&idCf===idOp){
        doublonsChargeFixe.push({chargeFixeId:idCf,chargeFixe:cf.libelle||'',operation:op.libelle||'',montantChargeFixe:cf.montantSigne,montantOperation:op.montantSigne});
      }
    });
  });
  if(doublonsChargeFixe.length)erreurs.push({code:'CB_DOUBLE_COMPTE_CF_OPERATION',message:'Une charge fixe CB est aussi présente comme opération future certaine.',doublons:doublonsChargeFixe});

  const totalCertainEngage=arrAuditCbCycleBudgetSoft20260908_(Math.abs(sommeAuditCbCycleBudgetSoft20260908_(cbCertaines)));
  const totalChargesFixesCb=arrAuditCbCycleBudgetSoft20260908_(Math.abs(sommeAuditCbCycleBudgetSoft20260908_(chargesFixesCb)));
  const totalCbExplique=arrAuditCbCycleBudgetSoft20260908_(totalCertainEngage+totalChargesFixesCb+partCerbere+partFinMois);

  const out={
    ok:!!(r&&r.ok)&&erreurs.length===0,
    version:BUDGETSOFT_CB_CYCLE_AUDIT_20260908_VERSION,
    proprietaire:r&&r.proprietaireBudgetSoft||'',
    dateReference:r&&r.dateReference||'',
    dateFinCycle,dateDebit,
    soldeReel:r&&r.soldeReel,
    soldePrevisionnelAuDebit:r&&r.soldePrevisionnel,
    blocs:{
      operationsCbCertaines:{montant:totalCertainEngage,nombre:cbCertaines.length,lignes:resumeLignesAuditCbCycleBudgetSoft20260908_(cbCertaines)},
      chargesFixesCb:{montant:totalChargesFixesCb,nombre:chargesFixesCb.length,lignes:resumeLignesAuditCbCycleBudgetSoft20260908_(chargesFixesCb)},
      resteCerbere:{montant:partCerbere,moteur:estimationCycle&&estimationCycle.moteurCerbere||''},
      queue28FinMois:{montant:partFinMois},
      complementCbEstime:{montant:complementEstime,date:estimationCycle&&estimationCycle.date||'',preuve:estimationCycle&&estimationCycle.preuve||''}
    },
    totalCbExplique,
    controles:{
      formuleComplementOk:!estimationCycle||Math.abs(complementEstime-arrAuditCbCycleBudgetSoft20260908_(partCerbere+partFinMois))<=.01,
      doublonsChargeFixeOperation:doublonsChargeFixe.length,
      aucunDoubleCompteChargeFixe:doublonsChargeFixe.length===0
    },
    erreurs
  };
  console.log('[AUDIT Cycle CB suivant 27-10] '+JSON.stringify(out));
  return out;
}
