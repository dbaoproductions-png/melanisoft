const BUDGETSOFT_PROPAGATION_AUDIT_20260916_VERSION='2026-09-16.1';

function arrPropagationBudgetSoft20260916_(n){return Math.round((Number(n)||0)*100)/100;}
function lireModulePropagationBudgetSoft20260916_(nom,fn){try{return{ok:true,valeur:fn()};}catch(e){return{ok:false,erreur:String(e&&e.message||e),module:nom};}}
function digestPropagationBudgetSoft20260916_(v){const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(v==null?null:v),Utilities.Charset.UTF_8);return b.map(x=>('0'+((x<0?x+256:x).toString(16))).slice(-2)).join('').slice(0,20);}

function resumeComptesFraisPropagationBudgetSoft20260916_(){
  const r=construireSyntheseComptes20260828_();
  return{ok:r&&r.ok===true,version:r&&r.version||'',dateReferenceReel:r&&r.dateReferenceReel||'',disponible:arrPropagationBudgetSoft20260916_(r&&r.synthese&&r.synthese.disponible),epargne:arrPropagationBudgetSoft20260916_(r&&r.synthese&&r.synthese.epargne),placements:arrPropagationBudgetSoft20260916_(r&&r.synthese&&r.synthese.placements),comptes:(r&&r.comptes||[]).map(c=>({id:c.id,nom:c.nom,soldeReel:arrPropagationBudgetSoft20260916_(c.soldeReel),dateSolde:c.dateSolde,sourceSolde:c.sourceSolde}))};
}
function resumeComptesServisPropagationBudgetSoft20260916_(){
  const r=chargerSyntheseComptes20260828();
  return{ok:r&&r.ok===true,version:r&&r.version||'',source:r&&r.performance&&r.performance.source||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',disponible:arrPropagationBudgetSoft20260916_(r&&r.synthese&&r.synthese.disponible),epargne:arrPropagationBudgetSoft20260916_(r&&r.synthese&&r.synthese.epargne),placements:arrPropagationBudgetSoft20260916_(r&&r.synthese&&r.synthese.placements)};
}
function resumeTresoreriePropagationBudgetSoft20260916_(){
  const r=chargerTresoreriePrevisionnelle20260830(dateDansJoursTresorerie_(45));
  return{ok:r&&r.ok===true,version:r&&r.version||'',soldeReel:arrPropagationBudgetSoft20260916_(r&&r.soldeReel),variationPrevue:arrPropagationBudgetSoft20260916_(r&&r.variationPrevue),soldePrevisionnel:arrPropagationBudgetSoft20260916_(r&&r.soldePrevisionnel),operationsFutures:arrPropagationBudgetSoft20260916_(r&&r.resume&&r.resume.operations_futures),chargesFixes:arrPropagationBudgetSoft20260916_(r&&r.resume&&r.resume.charges_fixes),nombreLignes:(r&&r.lignes||[]).length};
}
function resumeDashboardPropagationBudgetSoft20260916_(){
  const r=chargerDashboardSyntheseV3BudgetSoft20260907(),c=r&&r.courtTerme||{},s=r&&r.cycleSuivant||{};
  return{ok:r&&r.ok!==false,version:r&&r.version||'',source:r&&r.source||r&&r.sourceBudgetSoft||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',courtTerme:{soldeBancaire:arrPropagationBudgetSoft20260916_(c.soldeBancaire),revenusConstates:arrPropagationBudgetSoft20260916_(c.revenusConstates),depensesConstatees:arrPropagationBudgetSoft20260916_(c.depensesConstatees),pilotableDisponible:arrPropagationBudgetSoft20260916_(c.pilotableDisponible),pilotableParJour:arrPropagationBudgetSoft20260916_(c.pilotableParJour)},cycleSuivant:{soldePrevisionnel:arrPropagationBudgetSoft20260916_(s.soldePrevisionnel),pilotableDisponible:arrPropagationBudgetSoft20260916_(s.pilotableDisponible)}};
}
function resumeCerberePropagationBudgetSoft20260916_(){
  const r=chargerCerbereCockpit20260902(),ps=(r&&r.periodes||[]).slice(0,2).map((p,i)=>{const c=p&&p.v37&&p.v37.cockpit20260902||{};return{index:i+1,cle:p&&p.clePilotage||'',budgetDisponible:arrPropagationBudgetSoft20260916_(p&&p.budgetDisponible),budgetReparti:arrPropagationBudgetSoft20260916_(p&&p.budgetReparti),resteBudgetPilotable:arrPropagationBudgetSoft20260916_(p&&p.resteBudgetPilotable),p1Total:arrPropagationBudgetSoft20260916_(c.p1Total),budgetPilotableActualise:arrPropagationBudgetSoft20260916_(c.budgetPilotableActualise),consommePilotable:arrPropagationBudgetSoft20260916_(c.consommePilotable),reportCbCycle:arrPropagationBudgetSoft20260916_(c.reportCbCycle),molettes:(p&&p.enveloppes||[]).map(x=>({categorie:x.categorie,prevu:arrPropagationBudgetSoft20260916_(x.prevu),reel:arrPropagationBudgetSoft20260916_(x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:x.reelImpute)}))};});
  return{ok:r&&r.ok!==false,source:r&&r.source||r&&r.sourceBudgetSoft||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',version:r&&r.version||'',periodes:ps,empreinte:digestPropagationBudgetSoft20260916_(ps)};
}
function resumeCerbereExpressPropagationBudgetSoft20260916_(){
  const r=chargerVueCerbereExpress20260827(),p=r&&r.pilotable||{},d=r&&r.decision||{};
  return{ok:r&&r.ok===true,version:r&&r.version||'',source:r&&r.sourceBudgetSoft||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',pilotable:{allocation:arrPropagationBudgetSoft20260916_(p.allocation),consomme:arrPropagationBudgetSoft20260916_(p.consomme),reste:arrPropagationBudgetSoft20260916_(p.reste),reparti:arrPropagationBudgetSoft20260916_(p.reparti)},decision:{ep:arrPropagationBudgetSoft20260916_(d.ep),epDisponible:arrPropagationBudgetSoft20260916_(d.epDisponible),prochainCycleEp:arrPropagationBudgetSoft20260916_(d.prochainCycleEp),prochainCycleCbEngagee:arrPropagationBudgetSoft20260916_(d.prochainCycleCbEngagee),prochainCycleEpDisponible:arrPropagationBudgetSoft20260916_(d.prochainCycleEpDisponible)}};
}
function resumeAnalysesPropagationBudgetSoft20260916_(){
  const r=chargerAnalysesBudgetairesV23(6),periodes=Array.isArray(r&&r.periodes)?r.periodes:[];
  return{ok:!!r,version:r&&r.version||'',source:r&&r.sourceBudgetSoft||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',nombrePeriodes:periodes.length,empreinte:digestPropagationBudgetSoft20260916_(periodes)};
}
function resumePatrimoinePropagationBudgetSoft20260916_(){
  const r=chargerCreditsPatrimoineIntegres20260915(),c=r&&r.coherence||{};
  return{ok:r&&r.ok===true,source:r&&r.sourceBudgetSoft||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',endettementTotal:arrPropagationBudgetSoft20260916_(c.endettementTotal),patrimoineTotal:arrPropagationBudgetSoft20260916_(c.patrimoineTotal),patrimoineNet:arrPropagationBudgetSoft20260916_(c.patrimoineNet),ecartDette:arrPropagationBudgetSoft20260916_(c.ecartDette),ecartNet:arrPropagationBudgetSoft20260916_(c.ecartNet)};
}

function auditerPropagationBudgetSoft20260916(){
  const fraicheur=lireModulePropagationBudgetSoft20260916_('fraicheur',auditerFraicheurSnapshotGlobalBudgetSoft20260916);
  const comptesFrais=lireModulePropagationBudgetSoft20260916_('comptes_frais',resumeComptesFraisPropagationBudgetSoft20260916_);
  const comptesServis=lireModulePropagationBudgetSoft20260916_('comptes_servis',resumeComptesServisPropagationBudgetSoft20260916_);
  const tresorerie=lireModulePropagationBudgetSoft20260916_('tresorerie',resumeTresoreriePropagationBudgetSoft20260916_);
  const dashboard=lireModulePropagationBudgetSoft20260916_('dashboard',resumeDashboardPropagationBudgetSoft20260916_);
  const cerbere=lireModulePropagationBudgetSoft20260916_('cerbere',resumeCerberePropagationBudgetSoft20260916_);
  const express=lireModulePropagationBudgetSoft20260916_('cerbere_express',resumeCerbereExpressPropagationBudgetSoft20260916_);
  const analyses=lireModulePropagationBudgetSoft20260916_('analyses',resumeAnalysesPropagationBudgetSoft20260916_);
  const patrimoine=lireModulePropagationBudgetSoft20260916_('patrimoine',resumePatrimoinePropagationBudgetSoft20260916_);
  const v=x=>x&&x.ok?x.valeur:null,cf=v(comptesFrais),cs=v(comptesServis),tr=v(tresorerie),da=v(dashboard),ce=v(cerbere),ex=v(express),pa=v(patrimoine);
  const controles=[];
  function ctl(code,ok,detail){controles.push({code,ok:!!ok,detail:String(detail||'')});}
  ctl('COMPTES_SERVIS_EGALENT_CALCUL_FRAIS',cf&&cs&&Math.abs(Number(cf.disponible)-Number(cs.disponible))<=.01,'frais '+(cf&&cf.disponible)+' / servis '+(cs&&cs.disponible)+' / source '+(cs&&cs.source));
  ctl('TRESORERIE_PART_DU_SOLDE_REEL',cf&&tr&&Math.abs(Number(cf.disponible)-Number(tr.soldeReel))<=.01,'comptes '+(cf&&cf.disponible)+' / trésorerie '+(tr&&tr.soldeReel));
  ctl('DASHBOARD_PART_DU_SOLDE_REEL',cf&&da&&Math.abs(Number(cf.disponible)-Number(da.courtTerme&&da.courtTerme.soldeBancaire))<=.01,'comptes '+(cf&&cf.disponible)+' / dashboard '+(da&&da.courtTerme&&da.courtTerme.soldeBancaire)+' / source '+(da&&da.source));
  ctl('CERBERE_DISPONIBLE',!!(ce&&ce.ok),'source '+(ce&&ce.source)+' / révision '+(ce&&ce.revisionBudgetSoft));
  ctl('CERBERE_EXPRESS_DISPONIBLE',!!(ex&&ex.ok),'source '+(ex&&ex.source)+' / révision '+(ex&&ex.revisionBudgetSoft));
  ctl('PATRIMOINE_COHERENT',pa&&Math.abs(Number(pa.ecartDette||0))<=.01&&Math.abs(Number(pa.ecartNet||0))<=.01,'écart dette '+(pa&&pa.ecartDette)+' / écart net '+(pa&&pa.ecartNet));
  const erreurs=[fraicheur,comptesFrais,comptesServis,tresorerie,dashboard,cerbere,express,analyses,patrimoine].filter(x=>!x.ok).map(x=>({module:x.module||'',erreur:x.erreur||''}));
  const out={ok:erreurs.length===0&&controles.every(x=>x.ok),version:BUDGETSOFT_PROPAGATION_AUDIT_20260916_VERSION,date:new Date().toISOString(),fraicheur:v(fraicheur),modules:{comptesFrais:cf,comptesServis:cs,tresorerie:tr,dashboard:da,cerbere:ce,cerbereExpress:ex,analyses:v(analyses),patrimoine:pa},controles,erreurs};
  console.log('[AUDIT PROPAGATION BUDGETSOFT 20260916] '+JSON.stringify(out));return out;
}

function reconstruireEtAuditerPropagationLegacyBudgetSoft20260916_(){
  const avant=auditerPropagationBudgetSoft20260916();
  const rebuild=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('audit_propagation_20260916');
  const apres=auditerPropagationBudgetSoft20260916();
  const out={ok:!!(rebuild&&rebuild.ok)&&apres.ok===true,version:BUDGETSOFT_PROPAGATION_AUDIT_20260916_VERSION,avant,rebuild:{ok:!!(rebuild&&rebuild.ok),publie:!!(rebuild&&rebuild.publie),revisionBudgetSoft:rebuild&&rebuild.revisionBudgetSoft||'',erreurs:rebuild&&rebuild.erreurs||[]},apres};
  console.log('[REBUILD + AUDIT PROPAGATION 20260916] '+JSON.stringify(out));return out;
}
