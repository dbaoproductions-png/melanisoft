/*
 * BudgetSoft — audit intermodule des charges fixes — 2026-09-22.
 *
 * But : vérifier que tous les modules consomment la même vérité de rattachement
 * Réel -> Charge fixe. Lecture seule. Aucune correction n'est appliquée ici.
 *
 * Modules comparés :
 * - Operations / Rapprochements : liens persistés (preuve)
 * - Charges fixes : vue Review (si disponible)
 * - Coeur commun de reconnaissance
 * - Analyses
 * - Cerbère snapshot : sémantique explicite utilisée par le builder canonique
 *
 * La projection future et le Dashboard restent propriétaires de la PREVISION ;
 * ils ne doivent pas réinventer les liens historiques du Réel.
 */
const BUDGETSOFT_CF_INTERMODULE_AUDIT_20260922_VERSION='2026-09-22.1';

function mapLiensPersistesCfIntermodule20260922_(operations,rapprochements){
  const out={};
  (operations||[]).forEach(function(o){
    const id=String(o&&o.id||'').trim();if(!id)return;
    const cf=typeof idCfPersisteCommun_==='function'?String(idCfPersisteCommun_(o,rapprochements)||'').trim():'';
    if(cf)out[id]=cf;
  });
  return out;
}

function mapLiensCerbereSnapshotCfIntermodule20260922_(operations,rapprochements){
  const rap={};
  (rapprochements||[]).forEach(function(r){
    let ok=false;
    if(typeof rapprochementValideCfSnapshotBuild20260914_==='function')ok=rapprochementValideCfSnapshotBuild20260914_(r);
    else ok=/valid|rapproch/i.test(String(r&&r.statut||r&&r.decision||''));
    if(!ok)return;
    const op=String(r&&r.operation_id||'').trim(),cf=String(r&&r.charge_fixe_id||'').trim();
    if(op&&cf)rap[op]=cf;
  });
  const out={};
  (operations||[]).forEach(function(o){
    const id=String(o&&o.id||'').trim();if(!id)return;
    const cf=String(o&&o.charge_fixe_id||'').trim()||String(rap[id]||'');
    if(cf)out[id]=cf;
  });
  return out;
}

function mapLiensReviewCfIntermodule20260922_(operations){
  const out={};
  if(typeof chargeFixeLieeOperation20260828_!=='function')return out;
  (operations||[]).forEach(function(o){
    const id=String(o&&o.id||'').trim();if(!id)return;
    let cf='';try{cf=String(chargeFixeLieeOperation20260828_(o)||'').trim();}catch(e){cf='';}
    if(cf)out[id]=cf;
  });
  return out;
}

function auditerChargesFixesIntermoduleBudgetSoft20260922(nombrePeriodes){
  const nb=[3,6,12].includes(parseInt(nombrePeriodes,10))?parseInt(nombrePeriodes,10):6;
  const operations0=lireTable_('Operations')||[];
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'
    ?dedoublonnerOperationsCartesBudgetSoft_(operations0):operations0;
  const charges=lireTable_('Charges_fixes')||[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  const idsCharges=new Set(charges.map(function(c){return String(c&&c.id||'').trim();}).filter(Boolean));

  const persistes=mapLiensPersistesCfIntermodule20260922_(operations,rapprochements);
  const cerbere=mapLiensCerbereSnapshotCfIntermodule20260922_(operations,rapprochements);
  const review=mapLiensReviewCfIntermodule20260922_(operations);
  const commun=typeof construireLiensChargesFixesCommuns_==='function'
    ?construireLiensChargesFixesCommuns_(operations,charges,rapprochements):{};
  const analyses=typeof construireLiensChargesFixesAnalyseSeries20260922_==='function'
    ?construireLiensChargesFixesAnalyseSeries20260922_(operations):{};

  const ids=new Set(
    Object.keys(persistes).concat(Object.keys(cerbere),Object.keys(review),Object.keys(commun),Object.keys(analyses))
  );
  const details=[];
  ids.forEach(function(opId){
    const o=operations.find(function(x){return String(x&&x.id||'').trim()===opId;})||{};
    const row={
      operation_id:opId,
      date:String(o&&o.date_comptable||o&&o.date||''),
      montant:Number(o&&o.montant||0),
      categorie:String(o&&o.categorie||''),
      libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
      persiste:String(persistes[opId]||''),
      chargesReview:String(review[opId]||''),
      coeurCommun:String(commun[opId]||''),
      analyses:String(analyses[opId]||''),
      cerbereSnapshot:String(cerbere[opId]||'')
    };
    const vals=[row.persiste,row.chargesReview,row.coeurCommun,row.analyses,row.cerbereSnapshot].filter(Boolean);
    row.idsDistincts=Array.from(new Set(vals));
    row.orphelin=row.persiste&&!idsCharges.has(row.persiste);
    row.ecartIntermodule=row.idsDistincts.length>1;
    row.inferenceSansPreuve=!!(!row.persiste&&(row.coeurCommun||row.analyses||row.chargesReview));
    if(row.orphelin||row.ecartIntermodule||row.inferenceSansPreuve)details.push(row);
  });

  const analysesExtra=details.filter(function(x){return x.analyses&&!x.persiste;});
  const communExtra=details.filter(function(x){return x.coeurCommun&&!x.persiste;});
  const reviewExtra=details.filter(function(x){return x.chargesReview&&!x.persiste;});
  const orphelins=details.filter(function(x){return x.orphelin;});
  const divergences=details.filter(function(x){return x.ecartIntermodule;});

  let snapshot=null,dashboard=null;
  try{
    const s=typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():null;
    const e=s&&s.etat||{};
    snapshot={
      disponible:!!(s&&s.disponible),
      revisionBudgetSoft:String(e&&e.revisionBudgetSoft||''),
      cerbereOwnerVersion:String(e&&e.modules&&e.modules.cerbere&&e.modules.cerbere.diagnostic&&e.modules.cerbere.diagnostic.cfSnapshotBuild20260914&&e.modules.cerbere.diagnostic.cfSnapshotBuild20260914.version||'')
    };
    const d=e&&e.modules&&e.modules.dashboard||null;
    if(d)dashboard={present:true,sourcePrelevements:String(d&&d.courtTerme&&d.courtTerme.sourcePrelevements||''),proprietaireSoldes:String(d&&d.provenance&&d.provenance.soldesPrevisionnels||'')};
  }catch(e){}

  const out={
    ok:orphelins.length===0&&divergences.length===0&&communExtra.length===0&&analysesExtra.length===0&&reviewExtra.length===0,
    lectureSeule:true,
    version:BUDGETSOFT_CF_INTERMODULE_AUDIT_20260922_VERSION,
    doctrine:'Une seule vérité de rattachement Réel -> Charge_fixe doit être partagée par Operations/Rapprochements, Charges fixes, Cerbère et Analyses. Dashboard et projection ne recalculent pas ce rattachement historique.',
    modules:{
      operationsRapprochements:{role:'preuve persistée',liens:Object.keys(persistes).length},
      chargesFixesReview:{role:'lecture métier',liens:Object.keys(review).length},
      coeurCommun:{role:'reconnaissance transversale',liens:Object.keys(commun).length},
      analyses:{role:'historique réel',liens:Object.keys(analyses).length},
      cerbereSnapshot:{role:'réel explicite remplaçant la prévision',liens:Object.keys(cerbere).length},
      dashboard:{role:'consommateur Cerbère/projection',etat:dashboard},
      snapshotGlobal:snapshot
    },
    synthese:{
      operationsComparees:ids.size,
      divergencesIntermodules:divergences.length,
      liensOrphelins:orphelins.length,
      coeurCommunSansPreuve:communExtra.length,
      analysesSansPreuve:analysesExtra.length,
      reviewSansPreuve:reviewExtra.length
    },
    details:details
  };
  console.log('[AUDIT CHARGES FIXES INTERMODULE 20260922] '+JSON.stringify(out));
  console.log('[CF INTERMODULE] operations='+ids.size
    +' divergences='+divergences.length
    +' orphelins='+orphelins.length
    +' communSansPreuve='+communExtra.length
    +' analysesSansPreuve='+analysesExtra.length
    +' reviewSansPreuve='+reviewExtra.length);
  details.forEach(function(x,i){
    console.log('[CF INTERMODULE '+String(i+1).padStart(3,'0')+'] '
      +x.operation_id+' | '+x.montant+' | P='+x.persiste
      +' | R='+x.chargesReview+' | C='+x.coeurCommun
      +' | A='+x.analyses+' | S='+x.cerbereSnapshot
      +' | '+(x.orphelin?'ORPHELIN ':'')+(x.inferenceSansPreuve?'SANS_PREUVE ':'')+(x.ecartIntermodule?'DIVERGENCE':''));
  });
  return out;
}
