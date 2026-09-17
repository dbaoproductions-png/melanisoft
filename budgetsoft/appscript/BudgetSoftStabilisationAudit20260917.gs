const BUDGETSOFT_STABILISATION_AUDIT_20260917_VERSION='2026-09-17.1';

function auditerSocleStabilisationBudgetSoft20260917(){
  const t0=Date.now();
  const controles=[];

  let ops=null,cer=null;
  try{ops=chargerOperationsLeger20260828();}
  catch(e){ops={ok:false,erreur:String(e&&e.message||e)};}
  try{cer=chargerCerbereCockpitCanonique20260914();}
  catch(e){cer={ok:false,erreur:String(e&&e.message||e)};}

  const toutes=ops&&Array.isArray(ops.Operations)?ops.Operations:[];
  const reelles=ops&&Array.isArray(ops.Operations_reelles)?ops.Operations_reelles:[];
  const futures=ops&&Array.isArray(ops.Operations_futures)?ops.Operations_futures:[];
  const indatées=ops&&Array.isArray(ops.Operations_indatees)?ops.Operations_indatees:[];

  controles.push({
    code:'OPERATIONS_LECTURE_SEULE',
    ok:!!(ops&&ops.ok!==false&&ops.meta&&ops.meta.lectureSeule===true&&ops._performance&&ops._performance.lectureSeule===true&&Number(ops._performance.snapshotMs||0)===0),
    detail:'lectureSeule='+String(!!(ops&&ops.meta&&ops.meta.lectureSeule))+' ; snapshotMs='+String(ops&&ops._performance&&ops._performance.snapshotMs)
  });
  controles.push({
    code:'OPERATIONS_REEL_FUTUR_AFFICHABLES',
    ok:!!(ops&&ops.ok!==false&&toutes.length===reelles.length+futures.length+indatées.length&&futures.length>0),
    detail:'affichées '+toutes.length+' = réelles '+reelles.length+' + futures '+futures.length+' + indatées '+indatées.length
  });
  controles.push({
    code:'CERBERE_ENDPOINT_DISPONIBLE',
    ok:!!(cer&&cer.ok!==false&&Array.isArray(cer.periodes)&&cer.periodes.length>=2),
    detail:'source='+String(cer&&cer.sourceBudgetSoft||'')+' ; fallback='+String(!!(cer&&cer.fallbackEndpointCanonique))+' ; périodes='+String(cer&&Array.isArray(cer.periodes)?cer.periodes.length:0)+' ; erreur='+String(cer&&cer.erreur||'')
  });

  const out={
    ok:controles.every(c=>c.ok),
    version:BUDGETSOFT_STABILISATION_AUDIT_20260917_VERSION,
    lectureSeule:true,
    dureeMs:Date.now()-t0,
    controles,
    operations:{affichees:toutes.length,reelles:reelles.length,futures:futures.length,indatees:indatées.length,version:ops&&ops.meta&&ops.meta.version||'',source:ops&&ops.meta&&ops.meta.source||''},
    cerbere:{ok:!!(cer&&cer.ok!==false),source:String(cer&&cer.sourceBudgetSoft||''),revisionBudgetSoft:String(cer&&cer.revisionBudgetSoft||''),fallback:!!(cer&&cer.fallbackEndpointCanonique),raisonFallback:String(cer&&cer.raisonFallbackEndpointCanonique||''),versionEndpoint:String(cer&&cer.versionEndpointCanonique||''),erreur:String(cer&&cer.erreur||'')}
  };
  console.log('[AUDIT SOCLE STABILISATION BUDGETSOFT 20260917] '+JSON.stringify(out));
  return out;
}
