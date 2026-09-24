/*
 * BudgetSoft — audit lecture seule des charges fixes dans Analyses — 2026-09-22.
 *
 * Objectif :
 * - vérifier chaque charge fixe, période par période ;
 * - comparer les liens utilisés par Analyses avec le coeur commun de reconnaissance ;
 * - exposer les opérations réellement comptées, leur source de liaison et les écarts ;
 * - préparer ensuite un regroupement de la courbe par categorie du référentiel Charges_fixes.
 */
const BUDGETSOFT_CF_ANALYSIS_AUDIT_20260922_VERSION='2026-09-22.1';

function sourceLienChargeFixeAudit20260922_(o,cfId,rapprochements){
  const direct=String(o&&o.charge_fixe_id||'').trim();
  if(direct&&direct===cfId)return 'Operations.charge_fixe_id';
  const com=String(o&&o.commentaire||'');
  if(com.indexOf('[CHARGE_FIXE:'+cfId+']')>=0)return 'Operations.commentaire';
  const id=String(o&&o.id||'').trim();
  const r=(rapprochements||[]).find(function(x){
    return String(x&&x.operation_id||'').trim()===id
      &&String(x&&x.charge_fixe_id||'').trim()===cfId
      &&/valid|rapproch/i.test(String(x&&x.statut||x&&x.decision||''));
  });
  return r?'Rapprochements_charges_fixes':'inference/fallback';
}

function periodeIndexCfAudit20260922_(periodes,d){
  if(!d)return-1;
  return (periodes||[]).findIndex(function(p){
    const a=dateAnalyseSeries20260922_(p&&p.debut),z=dateAnalyseSeries20260922_(p&&p.fin);
    return !!(a&&z&&d>=a&&d<=z);
  });
}

function auditerChargesFixesAnalysesBudgetSoft20260922(nombrePeriodes){
  const nb=[3,6,12].includes(parseInt(nombrePeriodes,10))?parseInt(nombrePeriodes,10):6;
  const analyse=typeof chargerAnalysesBudgetairesV23==='function'?chargerAnalysesBudgetairesV23(nb):null;
  const periodes=analyse&&Array.isArray(analyse.periodes)?analyse.periodes:[];
  const charges=lireTable_('Charges_fixes')||[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];

  const opsBrutes=(lireTable_('Operations')||[]).map(function(o){
    const x=Object.assign({},o);
    if(typeof categorieCibleBudgetSoft_==='function')x.categorie=categorieCibleBudgetSoft_(x.categorie);
    return x;
  });
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'
    ?dedoublonnerOperationsCartesBudgetSoft_(opsBrutes):opsBrutes;

  const liensAnalyse=construireLiensChargesFixesAnalyseSeries20260922_(operations);
  const liensCommuns=typeof construireLiensChargesFixesCommuns_==='function'
    ?construireLiensChargesFixesCommuns_(operations,charges,rapprochements):{};

  const chargesById={};charges.forEach(function(c){
    const id=String(c&&c.id||'').trim();if(id)chargesById[id]=c;
  });

  const lignes=Object.keys(chargesById).map(function(cfId){
    const c=chargesById[cfId]||{};
    const valeursAnalyse=periodes.map(function(){return 0;});
    const valeursCommun=periodes.map(function(){return 0;});
    const opsAnalyse=[],opsCommun=[];

    operations.forEach(function(o){
      const m=Number(o&&o.montant||0);
      if(!Number.isFinite(m)||m>=0)return;
      const opId=String(o&&o.id||'').trim();
      const d=typeof dateOperationCouranteBudgetSoft_==='function'
        ?dateOperationCouranteBudgetSoft_(o)
        :dateAnalyseSeries20260922_(o&&o.date_comptable||o&&o.date);
      const idx=periodeIndexCfAudit20260922_(periodes,d);
      if(idx<0)return;

      if(String(liensAnalyse[opId]||'')===cfId){
        valeursAnalyse[idx]+=Math.abs(m);
        opsAnalyse.push({
          periode:clePeriodeAnalyseSeries20260922_(periodes[idx]),
          operation_id:opId,
          date:d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
          montant:arrAnalyseSeries20260922_(Math.abs(m)),
          libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
          categorie:String(o&&o.categorie||''),
          sourceLien:sourceLienChargeFixeAudit20260922_(o,cfId,rapprochements)
        });
      }
      if(String(liensCommuns[opId]||'')===cfId){
        valeursCommun[idx]+=Math.abs(m);
        opsCommun.push({
          periode:clePeriodeAnalyseSeries20260922_(periodes[idx]),
          operation_id:opId,
          date:d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
          montant:arrAnalyseSeries20260922_(Math.abs(m)),
          libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
          categorie:String(o&&o.categorie||''),
          sourceLien:sourceLienChargeFixeAudit20260922_(o,cfId,rapprochements)
        });
      }
    });

    valeursAnalyse.forEach(function(v,i){valeursAnalyse[i]=arrAnalyseSeries20260922_(v);});
    valeursCommun.forEach(function(v,i){valeursCommun[i]=arrAnalyseSeries20260922_(v);});

    const idsAnalyse=new Set(opsAnalyse.map(function(x){return x.operation_id;}));
    const idsCommun=new Set(opsCommun.map(function(x){return x.operation_id;}));
    const seulementAnalyse=opsAnalyse.filter(function(x){return !idsCommun.has(x.operation_id);});
    const seulementCommun=opsCommun.filter(function(x){return !idsAnalyse.has(x.operation_id);});
    const ecartsPeriodes=periodes.map(function(p,i){
      return{
        periode:clePeriodeAnalyseSeries20260922_(p),
        analyse:valeursAnalyse[i],
        coeurCommun:valeursCommun[i],
        ecart:arrAnalyseSeries20260922_(valeursAnalyse[i]-valeursCommun[i])
      };
    }).filter(function(x){return Math.abs(x.ecart)>.009;});

    const doublonsCycle={};
    opsAnalyse.forEach(function(x){doublonsCycle[x.periode]=(doublonsCycle[x.periode]||0)+1;});
    const periodesMulti=Object.keys(doublonsCycle).filter(function(k){return doublonsCycle[k]>1;})
      .map(function(k){return{periode:k,nombreOperations:doublonsCycle[k]};});

    let actif=c&&Object.prototype.hasOwnProperty.call(c,'actif')
      ?(typeof convertirBooleen_==='function'?convertirBooleen_(c.actif):!!c.actif):true;

    const alertes=[];
    if(ecartsPeriodes.length)alertes.push('ECART_MOTEUR');
    if(seulementAnalyse.length)alertes.push('LIENS_ANALYSE_SEULS');
    if(seulementCommun.length)alertes.push('LIENS_COEUR_COMMUN_SEULS');
    if(periodesMulti.length)alertes.push('PLUSIEURS_OPERATIONS_MEME_CYCLE');
    if(!String(c&&c.categorie||'').trim())alertes.push('CATEGORIE_ABSENTE');
    if(!actif&&opsAnalyse.length)alertes.push('CHARGE_INACTIVE_AVEC_REEL');

    return{
      id:cfId,
      libelle:String(c&&c.libelle||cfId),
      categorie:String(c&&c.categorie||''),
      actif:actif,
      montantReference:arrAnalyseSeries20260922_(Math.abs(Number(c&&c.montant||0))),
      periodicite:String(c&&c.periodicite||c&&c.frequence||''),
      jourExecution:c&&c.jour_execution!==undefined?c.jour_execution:'',
      compte:String(c&&c.compte||''),
      dateDebut:String(c&&c.date_debut||''),
      dateFin:String(c&&c.date_fin||''),
      valeursAnalyse:valeursAnalyse,
      valeursCoeurCommun:valeursCommun,
      operationsAnalyse:opsAnalyse,
      operationsCoeurCommun:opsCommun,
      ecartsPeriodes:ecartsPeriodes,
      seulementAnalyse:seulementAnalyse,
      seulementCoeurCommun:seulementCommun,
      periodesMulti:periodesMulti,
      alertes:alertes
    };
  }).sort(function(a,b){
    const aa=a.alertes.length?0:1,bb=b.alertes.length?0:1;
    if(aa!==bb)return aa-bb;
    return String(a.categorie+' '+a.libelle).localeCompare(String(b.categorie+' '+b.libelle),'fr');
  });

  const idsCharges=new Set(Object.keys(chargesById));
  const liensVersChargeAbsente=[];
  Object.keys(liensAnalyse).forEach(function(opId){
    const cfId=String(liensAnalyse[opId]||'');
    if(cfId&&!idsCharges.has(cfId)){
      const o=operations.find(function(x){return String(x&&x.id||'')===opId;})||{};
      liensVersChargeAbsente.push({operation_id:opId,charge_fixe_id:cfId,montant:Number(o&&o.montant||0),libelle:String(o&&o.libelle_bancaire||o&&o.libelle||'')});
    }
  });

  const out={
    ok:lignes.every(function(x){return !x.alertes.includes('ECART_MOTEUR');})&&liensVersChargeAbsente.length===0,
    lectureSeule:true,
    version:BUDGETSOFT_CF_ANALYSIS_AUDIT_20260922_VERSION,
    versionSeries:typeof BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION!=='undefined'?BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION:'',
    sourceAnalyse:analyse&&analyse.sourceBudgetSoft||'',
    revisionBudgetSoft:analyse&&analyse.revisionBudgetSoft||'',
    doctrine:'Audit charge par charge : série Analyses vs coeur commun de reconnaissance, sur les mêmes opérations réelles et les mêmes périodes.',
    periodes:periodes.map(function(p){return{cle:clePeriodeAnalyseSeries20260922_(p),libelle:libellePeriodeAnalyseSeries20260922_(p)};}),
    synthese:{
      charges:lignes.length,
      chargesAvecAlerte:lignes.filter(function(x){return x.alertes.length;}).length,
      ecartsMoteur:lignes.filter(function(x){return x.alertes.includes('ECART_MOTEUR');}).length,
      chargesSansCategorie:lignes.filter(function(x){return x.alertes.includes('CATEGORIE_ABSENTE');}).length,
      chargesAvecPlusieursOperationsCycle:lignes.filter(function(x){return x.alertes.includes('PLUSIEURS_OPERATIONS_MEME_CYCLE');}).length,
      liensVersChargeAbsente:liensVersChargeAbsente.length
    },
    liensVersChargeAbsente:liensVersChargeAbsente,
    lignes:lignes
  };
  console.log('[AUDIT CHARGES FIXES ANALYSES 20260922] '+JSON.stringify(out));
  return out;
}

function auditerChargeFixeAnalyseBudgetSoft20260922(chargeId,nombrePeriodes){
  const id=String(chargeId||'').trim();
  if(!id)throw new Error('chargeId requis.');
  const global=auditerChargesFixesAnalysesBudgetSoft20260922(nombrePeriodes);
  const ligne=(global.lignes||[]).find(function(x){return String(x&&x.id||'')===id;});
  if(!ligne)throw new Error('Charge fixe introuvable : '+id);
  const out={
    ok:!ligne.alertes.includes('ECART_MOTEUR'),
    lectureSeule:true,
    version:BUDGETSOFT_CF_ANALYSIS_AUDIT_20260922_VERSION,
    revisionBudgetSoft:global.revisionBudgetSoft,
    periodes:global.periodes,
    charge:ligne
  };
  console.log('[AUDIT CHARGE FIXE ANALYSES DETAIL 20260922] '+JSON.stringify(out));
  return out;
}


function auditerSyntheseChargesFixesAnalysesBudgetSoft20260922(nombrePeriodes){
  const global=auditerChargesFixesAnalysesBudgetSoft20260922(nombrePeriodes);
  const lignes=(global.lignes||[]).map(function(x){
    return{
      id:x.id,
      libelle:x.libelle,
      categorie:x.categorie,
      actif:x.actif,
      montantReference:x.montantReference,
      analyse:x.valeursAnalyse,
      coeurCommun:x.valeursCoeurCommun,
      nbOpsAnalyse:(x.operationsAnalyse||[]).length,
      nbOpsCoeurCommun:(x.operationsCoeurCommun||[]).length,
      alertes:x.alertes
    };
  });
  const out={
    ok:global.ok,
    lectureSeule:true,
    version:BUDGETSOFT_CF_ANALYSIS_AUDIT_20260922_VERSION,
    revisionBudgetSoft:global.revisionBudgetSoft,
    periodes:global.periodes,
    synthese:global.synthese,
    liensVersChargeAbsente:(global.liensVersChargeAbsente||[]).map(function(x){
      return{operation_id:x.operation_id,charge_fixe_id:x.charge_fixe_id,montant:x.montant,libelle:x.libelle};
    }),
    lignes:lignes
  };
  console.log('[AUDIT SYNTHESE CHARGES FIXES ANALYSES 20260922] '+JSON.stringify(out));
  return out;
}


function auditerTableauChargesFixesAnalysesBudgetSoft20260922(nombrePeriodes){
  const global=auditerChargesFixesAnalysesBudgetSoft20260922(nombrePeriodes);
  const lignes=global.lignes||[];
  console.log('[AUDIT TABLEAU CHARGES FIXES ANALYSES 20260922] version='+BUDGETSOFT_CF_ANALYSIS_AUDIT_20260922_VERSION
    +' revision='+String(global.revisionBudgetSoft||'')
    +' charges='+lignes.length
    +' alertes='+String(global.synthese&&global.synthese.chargesAvecAlerte||0)
    +' ecartsMoteur='+String(global.synthese&&global.synthese.ecartsMoteur||0)
    +' liensOrphelins='+String(global.synthese&&global.synthese.liensVersChargeAbsente||0));
  console.log('PERIODES | '+(global.periodes||[]).map(function(p){return p.cle;}).join(' | '));
  lignes.forEach(function(x,i){
    console.log(
      String(i+1).padStart(2,'0')+' | '
      +String(x.libelle||'')+' | cat='+String(x.categorie||'')
      +' | actif='+(x.actif?'1':'0')
      +' | ref='+String(x.montantReference||0)
      +' | A=['+(x.valeursAnalyse||[]).join(';')+']'
      +' | C=['+(x.valeursCoeurCommun||[]).join(';')+']'
      +' | opsA='+String((x.operationsAnalyse||[]).length)
      +' | opsC='+String((x.operationsCoeurCommun||[]).length)
      +' | '+((x.alertes||[]).join(',')||'OK')
    );
  });
  console.log('LIENS_ORPHELINS | '+(global.liensVersChargeAbsente||[]).map(function(x){
    return String(x.charge_fixe_id||'')+':'+String(x.operation_id||'')+':'+String(x.montant||0);
  }).join(' | '));
  return {
    ok:global.ok,
    lectureSeule:true,
    version:BUDGETSOFT_CF_ANALYSIS_AUDIT_20260922_VERSION,
    synthese:global.synthese,
    lignes:lignes.map(function(x){return{
      id:x.id,libelle:x.libelle,categorie:x.categorie,actif:x.actif,montantReference:x.montantReference,
      analyse:x.valeursAnalyse,coeurCommun:x.valeursCoeurCommun,alertes:x.alertes
    };})
  };
}


function auditerAnomaliesMetierChargesFixesAnalyse20260924(){
  const ids={
    ionos:'b4e6fe45-991c-4b9f-816d-b1fc0367415b',
    avanssurB:'433feb19-297f-41fa-80fa-d7e64e40ae36',
    avanssurC:'7b48a001-708b-4a3d-a390-3f420a2f0c58',
    casden:'1df4db60-dae6-4ecd-b4f5-98e0dfef59d4',
    carrefour:'22d488fe-6304-4bd0-ae87-28020fcd447f',
    oney:'8b29a127-0c69-47e2-89b4-7fa01dd8d772'
  };
  const ops=lireTable_('Operations')||[];
  const rs=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  const liens=typeof construireLiensChargesFixesAnalyseSeries20260922_==='function'?construireLiensChargesFixesAnalyseSeries20260922_(ops):{};
  function detail(cfId){
    return ops.filter(function(o){
      const id=String(o&&o.id||'').trim();
      return String(o&&o.charge_fixe_id||'').trim()===cfId||String(liens[id]||'')===cfId;
    }).map(function(o){
      const brut=String(o&&o.libelle_bancaire||o&&o.libelle||'');
      return{
        id:String(o&&o.id||''),
        date:String(o&&o.date_comptable||o&&o.date||''),
        montant:Number(o&&o.montant||0),
        categorie:String(o&&o.categorie||''),
        libelle:brut,
        commentaire:String(o&&o.commentaire||''),
        charge_fixe_id:String(o&&o.charge_fixe_id||''),
        mandat:(brut.match(/(?:MDT\/|MANDAT\s*)([^\s]+)/i)||[])[1]||'',
        du:(brut.match(/\bDU\s+(\d{6})\b/i)||[])[1]||'',
        libSousCompte:(brut.match(/LIB\/([^\s]+)/i)||[])[1]||''
      };
    }).sort(function(a,b){return String(a.date).localeCompare(String(b.date));});
  }
  const out={ok:true,lectureSeule:true,version:'2026-09-24.1'};
  Object.keys(ids).forEach(function(k){out[k]=detail(ids[k]);});
  console.log('[AUDIT ANOMALIES METIER CF ANALYSE 20260924] '+JSON.stringify(out));
  Object.keys(ids).forEach(function(k){
    console.log('[CF ANOMALIE '+k+'] '+out[k].map(function(x){
      return x.id+'|'+x.date+'|'+x.montant+'|mdt='+x.mandat+'|du='+x.du+'|lib='+x.libSousCompte+'|'+x.libelle;
    }).join(' || '));
  });
  return out;
}


function auditerCorrectionsMetierChargesFixes20260924(){
  const ids={
    avanssurB:'433feb19-297f-41fa-80fa-d7e64e40ae36',
    avanssurC:'7b48a001-708b-4a3d-a390-3f420a2f0c58',
    casden:'1df4db60-dae6-4ecd-b4f5-98e0dfef59d4',
    oney:'8b29a127-0c69-47e2-89b4-7fa01dd8d772',
    carrefour:'22d488fe-6304-4bd0-ae87-28020fcd447f',
    ionos:'b4e6fe45-991c-4b9f-816d-b1fc0367415b'
  };
  const ops=lireTable_('Operations')||[];
  const rs=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  function cf_(o){
    return typeof idCfPersisteCommun_==='function'
      ?String(idCfPersisteCommun_(o,rs)||'').trim()
      :String(o&&o.charge_fixe_id||'').trim();
  }
  function row_(o,action,cible,motif){
    return{
      operation_id:String(o&&o.id||''),
      date:String(o&&o.date_comptable||o&&o.date||''),
      montant:Number(o&&o.montant||0),
      charge_actuelle:cf_(o),
      action:action,
      cible:cible||'',
      motif:motif,
      libelle:String(o&&o.libelle_bancaire||o&&o.libelle||'')
    };
  }
  const corrections=[],surveillance=[];
  ops.forEach(function(o){
    const cf=cf_(o);if(!cf)return;
    const b=String(o&&o.libelle_bancaire||o&&o.libelle||''),u=b.toUpperCase();

    if(cf===ids.avanssurB && /MDT\/200016366216\/1/.test(u))
      corrections.push(row_(o,'RELIER',ids.avanssurC,'Avanssur : mandat 200016366216/1 appartient à Assurance C, pas B'));

    if(cf===ids.casden && /FRAIS PRET S0064401451/.test(u))
      corrections.push(row_(o,'DELIER','',"CASDEN : frais de prêt distinct de l'échéance mensuelle"));

    if(cf===ids.oney){
      const m=u.match(/LIB\/([A-Z]{2})\b/),sous=m&&m[1]||'';
      if(sous && sous!=='CA')
        corrections.push(row_(o,'DELIER','',"Oney : sous-flux "+sous+" distinct de l'échéance CA"));
    }

    if(cf===ids.carrefour){
      const m=Math.abs(Number(o&&o.montant||0));
      const ech=(u.match(/ECH\/(\d{2})\d{4}/)||[])[1]||'';
      const jour=Number(ech||0);
      if(!(m>=150&&m<=190&&jour>=1&&jour<=10))
        corrections.push(row_(o,'DELIER','',"Carrefour Banque : hors échéance mensuelle principale (150-190 €, échéance J01-J10)"));
    }

    if(cf===ids.ionos){
      const du=(u.match(/\bDU\s+(\d{2})(\d{2})(\d{2})\b/)||[]);
      if(du.length){
        const d=new Date(o&&o.date_comptable||o&&o.date||0);
        if(!isNaN(d)){
          const y=2000+Number(du[3]),mo=Number(du[2]);
          if(y!==d.getFullYear()||mo!==(d.getMonth()+1))
            surveillance.push(row_(o,'SURVEILLER_DATE_ECO','',"IONOS : date d'achat DU différente du mois de comptabilisation bancaire"));
        }
      }
    }
  });
  const out={ok:true,lectureSeule:true,version:'2026-09-24.2',correctionsProposees:corrections.length,surveillanceTemporelle:surveillance.length,corrections:corrections,surveillance:surveillance};
  console.log('[AUDIT CORRECTIONS METIER CF 20260924] '+JSON.stringify(out));
  corrections.forEach(function(x,i){console.log('[CF CORRECTION '+String(i+1).padStart(2,'0')+'] '+x.action+' '+x.operation_id+' | '+x.montant+' | '+x.motif+' | '+x.libelle);});
  surveillance.forEach(function(x,i){console.log('[CF SURVEILLANCE '+String(i+1).padStart(2,'0')+'] '+x.operation_id+' | '+x.montant+' | '+x.motif+' | '+x.libelle);});
  return out;
}
