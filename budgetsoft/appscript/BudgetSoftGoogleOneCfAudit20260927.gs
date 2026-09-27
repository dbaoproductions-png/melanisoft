const BUDGETSOFT_GOOGLE_ONE_CF_AUDIT_20260927_VERSION='2026-09-27.1';

function auditerGoogleOneChargesFixes20260927(){
  const charges=(lireTable_('Charges_fixes')||[]).filter(function(c){
    return /google\s*one/i.test(String(c&&c.libelle||'')+' '+String(c&&c.libelle_bancaire||''));
  });
  const operations=lireTable_('Operations')||[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];

  const idsCharges=new Set(charges.map(function(c){return String(c&&c.id||'').trim();}).filter(Boolean));
  const liensValides={};
  (rapprochements||[]).forEach(function(r){
    const opId=String(r&&r.operation_id||'').trim();
    const cfId=String(r&&r.charge_fixe_id||'').trim();
    if(!opId||!cfId||!idsCharges.has(cfId))return;
    let valide=true;
    if(typeof rapprochementValideCfSnapshotBuild20260914_==='function'){
      valide=rapprochementValideCfSnapshotBuild20260914_(r);
    }else{
      const s=String(r&&r.statut||r&&r.decision||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      valide=(s==='valide'||s==='rapproche'||s==='rapprochee')&&s!=='a valider';
    }
    if(valide)liensValides[opId]=cfId;
  });

  const detailsCharges=charges.map(function(c){
    const id=String(c&&c.id||'').trim();
    const ops=operations.filter(function(o){
      const opId=String(o&&o.id||'').trim();
      const direct=String(o&&o.charge_fixe_id||'').trim();
      const marqueur=String(o&&o.commentaire||'').match(/\[CHARGE_FIXE:([^\]]+)\]/i);
      const parCommentaire=marqueur&&marqueur[1]?String(marqueur[1]).trim():'';
      const persiste=direct||parCommentaire||(opId&&liensValides[opId]||'');
      return persiste===id;
    }).map(function(o){
      return {
        id:String(o&&o.id||''),
        date:String(o&&o.date_comptable||o&&o.date||''),
        dateAchat:String(o&&o.date_achat||''),
        montant:Number(o&&o.montant||0),
        libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
        categorie:String(o&&o.categorie||''),
        compte:String(o&&o.compte||''),
        charge_fixe_id:String(o&&o.charge_fixe_id||''),
        commentaire:String(o&&o.commentaire||'')
      };
    });
    const totalReel=Math.round(ops.reduce(function(s,o){return s+Math.abs(Number(o&&o.montant||0));},0)*100)/100;
    return {
      charge:{
        id:id,
        libelle:String(c&&c.libelle||''),
        libelle_bancaire:String(c&&c.libelle_bancaire||''),
        montant:Number(c&&c.montant||0),
        jour_execution:Number(c&&c.jour_execution||0),
        actif:c&&c.actif
      },
      nombreOperations:ops.length,
      totalReel:totalReel,
      operations:ops
    };
  });

  const operationsGoogle=operations.filter(function(o){
    return /google\s*one/i.test(String(o&&o.libelle_bancaire||'')+' '+String(o&&o.libelle||'')+' '+String(o&&o.marchand_normalise||''));
  }).map(function(o){
    const opId=String(o&&o.id||'').trim();
    const direct=String(o&&o.charge_fixe_id||'').trim();
    const marqueur=String(o&&o.commentaire||'').match(/\[CHARGE_FIXE:([^\]]+)\]/i);
    const parCommentaire=marqueur&&marqueur[1]?String(marqueur[1]).trim():'';
    const cfId=direct||parCommentaire||(opId&&liensValides[opId]||'');
    return {
      id:opId,
      date:String(o&&o.date_comptable||o&&o.date||''),
      dateAchat:String(o&&o.date_achat||''),
      montant:Number(o&&o.montant||0),
      libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
      charge_fixe_id:cfId,
      rattacheeAChargeGoogleOne:idsCharges.has(cfId)
    };
  });

  const idsOps=new Set();
  const doublons=[];
  operationsGoogle.forEach(function(o){
    const cle=[String(o.dateAchat||o.date||''),Math.abs(Number(o.montant||0)).toFixed(2),String(o.libelle||'').toLowerCase().replace(/\s+/g,' ').trim()].join('|');
    if(idsOps.has(cle))doublons.push(o);
    else idsOps.add(cle);
  });

  const nonRattachees=operationsGoogle.filter(function(o){return !o.rattacheeAChargeGoogleOne;});
  const totalCharges=Math.round(charges.reduce(function(s,c){return s+Math.abs(Number(c&&c.montant||0));},0)*100)/100;

  const out={
    ok:charges.length===2,
    version:BUDGETSOFT_GOOGLE_ONE_CF_AUDIT_20260927_VERSION,
    lectureSeule:true,
    nombreChargesGoogleOne:charges.length,
    totalPrevisionMensuelle:totalCharges,
    charges:detailsCharges,
    operationsGoogleOne:operationsGoogle,
    operationsGoogleOneNonRattachees:nonRattachees,
    doublonsPotentiels:doublons,
    controle:{
      deuxAbonnementsAttendus:charges.length===2,
      aucuneOperationGoogleOneNonRattachee:nonRattachees.length===0,
      aucunDoublonPotentiel:doublons.length===0
    },
    doctrine:'Deux abonnements Google One distincts doivent rester deux charges fixes distinctes ; une operation reelle ne doit etre rattachee qu au bon abonnement et ne doit pas etre agregee silencieusement sur l autre.'
  };
  console.log('[AUDIT GOOGLE ONE CF 20260927] '+JSON.stringify(out));
  return out;
}
