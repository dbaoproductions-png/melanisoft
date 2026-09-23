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


function auditerLiensOrphelinsChargesFixesIntermodule20260922(){
  const operations=lireTable_('Operations')||[];
  const charges=lireTable_('Charges_fixes')||[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  const idsCharges=new Set(charges.map(function(c){return String(c&&c.id||'').trim();}).filter(Boolean));

  const orphelins=[];
  operations.forEach(function(o){
    const opId=String(o&&o.id||'').trim();if(!opId)return;
    const cf=typeof idCfPersisteCommun_==='function'?String(idCfPersisteCommun_(o,rapprochements)||'').trim():String(o&&o.charge_fixe_id||'').trim();
    if(!cf||idsCharges.has(cf))return;
    const brut=String(o&&o.libelle_bancaire||o&&o.libelle||'');
    const motif=typeof extraireMotifStableBanque_==='function'?String(extraireMotifStableBanque_(brut)||''):'';
    const candidats=charges.map(function(ch){
      let evalR=null;
      try{
        if(typeof evaluerRapprochementChargeFixeSouple20260829_==='function')evalR=evaluerRapprochementChargeFixeSouple20260829_(ch,o,{derniereDate:new Date()});
        else if(typeof evaluerRapprochementChargeFixe_==='function')evalR=evaluerRapprochementChargeFixe_(ch,o);
      }catch(e){evalR=null;}
      const lib=String(ch&&ch.libelle||'');
      const bank=String(ch&&ch.libelle_bancaire||'');
      return{
        id:String(ch&&ch.id||''),
        libelle:lib,
        categorie:String(ch&&ch.categorie||''),
        actif:typeof convertirBooleen_==='function'?convertirBooleen_(ch&&ch.actif):!!(ch&&ch.actif),
        montant:Number(ch&&ch.montant||0),
        libelle_bancaire:bank,
        score:evalR?Number(evalR.score||0):0,
        ecart_montant:evalR?Number(evalR.ecart_montant||0):null,
        similarite_crediteur:evalR&&evalR.similarite_crediteur!=null?Number(evalR.similarite_crediteur):null
      };
    }).sort(function(a,b){return Number(b.score||0)-Number(a.score||0);}).slice(0,5);

    const raps=rapprochements.filter(function(r){return String(r&&r.operation_id||'').trim()===opId;}).map(function(r){
      return{id:String(r&&r.id||''),charge_fixe_id:String(r&&r.charge_fixe_id||''),statut:String(r&&r.statut||''),decision:String(r&&r.decision||'')};
    });

    orphelins.push({
      operation_id:opId,
      ancien_charge_fixe_id:cf,
      date:String(o&&o.date_comptable||o&&o.date||''),
      montant:Number(o&&o.montant||0),
      categorie:String(o&&o.categorie||''),
      libelle:brut,
      motif_bancaire_stable:motif,
      rapprochements:raps,
      meilleursCandidats:candidats
    });
  });

  const groupes={};
  orphelins.forEach(function(x){
    const k=String(x.ancien_charge_fixe_id||'');
    if(!groupes[k])groupes[k]=[];
    groupes[k].push(x);
  });

  const out={
    ok:orphelins.length===0,
    lectureSeule:true,
    version:BUDGETSOFT_CF_INTERMODULE_AUDIT_20260922_VERSION,
    nombreOrphelins:orphelins.length,
    groupes:Object.keys(groupes).map(function(id){return{ancien_charge_fixe_id:id,nombre:groupes[id].length,operations:groupes[id]};}),
    doctrine:'Aucune réparation automatique : chaque lien orphelin doit être qualifié à partir du libellé bancaire, du mandat/émetteur, du montant et des rapprochements persistés.'
  };
  console.log('[AUDIT LIENS ORPHELINS CF INTERMODULE 20260922] '+JSON.stringify(out));
  orphelins.forEach(function(x,i){
    console.log('[CF ORPHELIN '+String(i+1).padStart(2,'0')+'] '
      +x.operation_id+' | '+x.montant+' | '+x.categorie+' | ancien='+x.ancien_charge_fixe_id
      +' | '+x.libelle
      +' | candidats='+x.meilleursCandidats.map(function(c){return c.id+':'+c.libelle+':'+c.score;}).join(' ; '));
  });
  return out;
}


function auditerHistoriqueChargesFixesNonRapprochees20260922(nombrePeriodes){
  const nb=[3,6,12].includes(parseInt(nombrePeriodes,10))?parseInt(nombrePeriodes,10):6;
  const analyse=typeof chargerAnalysesBudgetairesV23==='function'?chargerAnalysesBudgetairesV23(nb):null;
  const periodes=analyse&&Array.isArray(analyse.periodes)?analyse.periodes:[];
  const operations0=lireTable_('Operations')||[];
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'
    ?dedoublonnerOperationsCartesBudgetSoft_(operations0):operations0;
  const charges=(lireTable_('Charges_fixes')||[]).filter(function(c){
    return typeof convertirBooleen_==='function'?convertirBooleen_(c&&c.actif):!!(c&&c.actif);
  });
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  const persist=mapLiensPersistesCfIntermodule20260922_(operations,rapprochements);

  function idxPeriode_(d){
    if(!d)return-1;
    return periodes.findIndex(function(p){
      const a=dateAnalyseSeries20260922_(p&&p.debut),z=dateAnalyseSeries20260922_(p&&p.fin);
      return !!(a&&z&&d>=a&&d<=z);
    });
  }
  function score_(c,o){
    let r=null;
    try{
      if(typeof evaluerRapprochementChargeFixeSouple20260829_==='function')r=evaluerRapprochementChargeFixeSouple20260829_(c,o,{derniereDate:new Date()});
      else if(typeof evaluerRapprochementChargeFixe_==='function')r=evaluerRapprochementChargeFixe_(c,o);
    }catch(e){r=null;}
    return r;
  }

  const lignes=charges.map(function(c){
    const id=String(c&&c.id||'').trim();
    const trouves=[];
    operations.forEach(function(o){
      const opId=String(o&&o.id||'').trim(),m=Number(o&&o.montant||0);
      if(!opId||m>=0||persist[opId])return;
      const d=typeof dateOperationCouranteBudgetSoft_==='function'
        ?dateOperationCouranteBudgetSoft_(o)
        :dateAnalyseSeries20260922_(o&&o.date_comptable||o&&o.date);
      const pi=idxPeriode_(d); if(pi<0)return;
      const r=score_(c,o); if(!r)return;
      const sc=Number(r.score||0);
      if(sc<80)return;
      trouves.push({
        periode:clePeriodeAnalyseSeries20260922_(periodes[pi]),
        operation_id:opId,
        date:d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
        montant:Math.abs(m),
        categorie:String(o&&o.categorie||''),
        libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
        score:sc,
        ecart_montant:r.ecart_montant==null?null:Number(r.ecart_montant),
        similarite_crediteur:r.similarite_crediteur==null?null:Number(r.similarite_crediteur)
      });
    });
    trouves.sort(function(a,b){return a.periode.localeCompare(b.periode)||b.score-a.score;});
    return{
      id:id,
      libelle:String(c&&c.libelle||''),
      categorie:String(c&&c.categorie||''),
      montantReference:Math.abs(Number(c&&c.montant||0)),
      candidats:trouves,
      nombreCandidats:trouves.length
    };
  }).filter(function(x){return x.nombreCandidats>0;});

  const out={
    ok:true,
    lectureSeule:true,
    version:BUDGETSOFT_CF_INTERMODULE_AUDIT_20260922_VERSION,
    revisionBudgetSoft:analyse&&analyse.revisionBudgetSoft||'',
    periodes:periodes.map(function(p){return clePeriodeAnalyseSeries20260922_(p);}),
    chargesAvecCandidats:lignes.length,
    doctrine:'Candidats historiques non persistés, score >= 80 uniquement. Aucun rattachement automatique : validation charge par charge et opération par opération requise.',
    lignes:lignes
  };
  console.log('[AUDIT HISTORIQUE CF NON RAPPROCHEES 20260922] '+JSON.stringify(out));
  lignes.forEach(function(x,i){
    console.log('[CF HIST '+String(i+1).padStart(2,'0')+'] '+x.libelle+' | '+x.categorie+' | ref='+x.montantReference+' | candidats='+x.nombreCandidats);
    x.candidats.forEach(function(o){
      console.log('  '+o.periode+' | '+o.operation_id+' | '+o.montant+' | score='+o.score+' | '+o.libelle);
    });
  });
  return out;
}


function auditerIdentitesChargesFixesAmbigues20260923(){
  const charges=lireTable_('Charges_fixes')||[];
  const operations=lireTable_('Operations')||[];
  const norm=function(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();};
  const groupes=[
    {nom:'Suravenir',charge:/suravenir/i,operation:/SURAVENIR/i},
    {nom:'Google One',charge:/google one/i,operation:/GOOGLE ONE/i},
    {nom:'DGFIP',charge:/impot|d\.?g\.?f\.?i\.?p/i,operation:/D\.G\.F\.I\.P\.|IMPOT/i},
    {nom:'Bouygues / NRJ Mobile',charge:/emetteur fr35zzz418323|bouygues|nrj/i,operation:/BOUYGUES TELECOM|NRJ MOBILE/i},
    {nom:'Oney',charge:/oney/i,operation:/ONEY BANQUE ACCORD/i},
    {nom:'Floa',charge:/floa/i,operation:/FLOA/i},
    {nom:'Carrefour Banque',charge:/carrefour banque/i,operation:/CARREFOUR BANQUE/i}
  ];
  const out={ok:true,lectureSeule:true,version:'2026-09-23.1',groupes:[]};
  groupes.forEach(function(g){
    const cs=charges.filter(function(c){
      return g.charge.test(String(c&&c.libelle||''))||g.charge.test(String(c&&c.libelle_bancaire||''));
    }).map(function(c){
      return{
        id:String(c&&c.id||''),
        libelle:String(c&&c.libelle||''),
        categorie:String(c&&c.categorie||''),
        actif:typeof convertirBooleen_==='function'?convertirBooleen_(c&&c.actif):!!(c&&c.actif),
        montant:Number(c&&c.montant||0),
        jour_execution:Number(c&&c.jour_execution||0),
        date_debut:String(c&&c.date_debut||''),
        date_fin:String(c&&c.date_fin||''),
        libelle_bancaire:String(c&&c.libelle_bancaire||''),
        motif_bancaire_stable:typeof extraireMotifStableBanque_==='function'?String(extraireMotifStableBanque_(c&&c.libelle_bancaire||c&&c.libelle)||''):''
      };
    });
    const os=operations.filter(function(o){
      const brut=String(o&&o.libelle_bancaire||o&&o.libelle||'');
      return g.operation.test(brut);
    }).map(function(o){
      return{
        id:String(o&&o.id||''),
        date:String(o&&o.date_comptable||o&&o.date||''),
        montant:Number(o&&o.montant||0),
        categorie:String(o&&o.categorie||''),
        charge_fixe_id:String(o&&o.charge_fixe_id||''),
        libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
        motif_bancaire_stable:typeof extraireMotifStableBanque_==='function'?String(extraireMotifStableBanque_(o&&o.libelle_bancaire||o&&o.libelle)||''):''
      };
    });
    out.groupes.push({nom:g.nom,charges:cs,operations:os});
    console.log('[CF IDENTITE '+g.nom+'] charges='+JSON.stringify(cs));
    os.forEach(function(o){console.log('  OP '+o.id+' | '+o.date+' | '+o.montant+' | cf='+o.charge_fixe_id+' | '+o.libelle);});
  });
  return out;
}
