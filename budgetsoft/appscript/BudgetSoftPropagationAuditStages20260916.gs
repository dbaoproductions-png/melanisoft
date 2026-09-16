const BUDGETSOFT_PROPAGATION_STAGES_20260916_VERSION='2026-09-16.1';

/**
 * Etape 1 volontairement courte : reconstruit le snapshot global, sans lancer
 * l'audit frais avant ni après. L'ancien enchaînement dépassait la limite Apps Script
 * lorsque le snapshot était périmé, car Dashboard + Cerbère + Express recalculaient
 * chacun depuis les sources avant même que la reconstruction ne commence.
 */
function reconstruireSnapshotPropagationBudgetSoft20260916(){
  const t0=Date.now();
  const r=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('audit_propagation_stage_rebuild_20260916');
  const out={
    ok:!!(r&&r.ok),
    version:BUDGETSOFT_PROPAGATION_STAGES_20260916_VERSION,
    publie:!!(r&&r.publie),
    revisionBudgetSoft:r&&r.revisionBudgetSoft||'',
    origine:r&&r.origine||'',
    dureeMs:Date.now()-t0,
    erreurs:r&&r.erreurs||[],
    uniteTresorerie:r&&r.uniteTresorerie||null,
    coherence:r&&r.coherence||null
  };
  console.log('[REBUILD PROPAGATION BUDGETSOFT 20260916] '+JSON.stringify(out));
  return out;
}

/**
 * Etape 2 : ne doit être lancée qu'après une reconstruction publiée.
 * Si le snapshot est encore périmé, on s'arrête immédiatement : aucun fallback
 * frais lourd n'est déclenché par cet audit.
 */
function auditerSnapshotPubliePropagationBudgetSoft20260916(){
  const t0=Date.now();
  const fraicheur=auditerFraicheurSnapshotGlobalBudgetSoft20260916();
  if(!fraicheur||fraicheur.perime===true||fraicheur.disponible!==true){
    const out={
      ok:false,
      version:BUDGETSOFT_PROPAGATION_STAGES_20260916_VERSION,
      raison:'SNAPSHOT_NON_PUBLIE_OU_PERIME',
      fraicheur:fraicheur||null,
      dureeMs:Date.now()-t0
    };
    console.log('[AUDIT SNAPSHOT PUBLIE PROPAGATION 20260916] '+JSON.stringify(out));
    return out;
  }

  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat||null;
  const m=e&&e.modules||{};
  const revision=String(e&&e.revisionBudgetSoft||'');
  const comptes=m.comptes||{},dash=m.dashboard||{},cer=m.cerbere||{},exp=m.cerbereExpress||{},pat=m.patrimoine||{},anal=m.analyses||{};
  const disponible=Number(comptes&&comptes.synthese&&comptes.synthese.disponible);
  const soldeDashboard=Number(dash&&dash.courtTerme&&dash.courtTerme.soldeBancaire);
  const patrimoineNet=Number(pat&&pat.patrimoineNet);
  const controles=[];
  function ctl(code,ok,detail){controles.push({code:code,ok:!!ok,detail:String(detail||'')});}

  ctl('SNAPSHOT_PUBLIE',!!(e&&e.ok===true&&e.publie===true&&revision),'révision '+revision);
  ctl('COMPTES_DASHBOARD_MEME_SOLDE',Number.isFinite(disponible)&&Number.isFinite(soldeDashboard)&&Math.abs(disponible-soldeDashboard)<=.01,'comptes '+disponible+' / dashboard '+soldeDashboard);
  ctl('CERBERE_PRESENT',!!(cer&&cer.ok!==false&&Array.isArray(cer.periodes)&&cer.periodes.length>=2),'périodes '+(cer&&cer.periodes&&cer.periodes.length||0));
  ctl('CERBERE_EXPRESS_PRESENT',!!(exp&&exp.ok!==false),'ok '+!!(exp&&exp.ok!==false));
  ctl('ANALYSES_PRESENTES',!!(anal&&anal.ok!==false&&anal.variantes),'variantes '+Object.keys(anal&&anal.variantes||{}).join(','));
  ctl('PATRIMOINE_PRESENT',Number.isFinite(patrimoineNet),'patrimoine net '+patrimoineNet);

  const out={
    ok:controles.every(function(x){return x.ok;}),
    version:BUDGETSOFT_PROPAGATION_STAGES_20260916_VERSION,
    revisionBudgetSoft:revision,
    genereLe:e&&e.genereLe||'',
    origine:e&&e.origine||'',
    valeurs:{
      comptesDisponible:Number.isFinite(disponible)?Math.round(disponible*100)/100:null,
      dashboardSolde:Number.isFinite(soldeDashboard)?Math.round(soldeDashboard*100)/100:null,
      dashboardRevenus:Number(dash&&dash.courtTerme&&dash.courtTerme.revenusConstates||0),
      dashboardDepenses:Number(dash&&dash.courtTerme&&dash.courtTerme.depensesConstatees||0),
      dashboardPilotable:Number(dash&&dash.courtTerme&&dash.courtTerme.pilotableDisponible||0),
      cerbereP1Reste:Number(cer&&cer.periodes&&cer.periodes[0]&&cer.periodes[0].resteBudgetPilotable||0),
      cerbereP2Reste:Number(cer&&cer.periodes&&cer.periodes[1]&&cer.periodes[1].resteBudgetPilotable||0),
      patrimoineNet:Number.isFinite(patrimoineNet)?Math.round(patrimoineNet*100)/100:null
    },
    controles:controles,
    dureeMs:Date.now()-t0
  };
  console.log('[AUDIT SNAPSHOT PUBLIE PROPAGATION 20260916] '+JSON.stringify(out));
  return out;
}

/**
 * Compatibilité : l'ancien nom n'enchaîne plus audit frais + rebuild + audit frais.
 * Il ne fait désormais que la reconstruction pour rester sous la limite d'exécution.
 */
function reconstruireEtAuditerPropagationBudgetSoft20260916(){
  return reconstruireSnapshotPropagationBudgetSoft20260916();
}
