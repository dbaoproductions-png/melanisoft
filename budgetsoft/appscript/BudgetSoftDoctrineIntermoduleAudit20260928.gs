const BUDGETSOFT_DOCTRINE_INTERMODULE_AUDIT_20260928_VERSION='2026-09-28.2';

function auditerOssatureDoctrinesBudgetSoft20260928(){
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const e=s&&s.disponible&&s.etat||null,m=e&&e.modules||{};
  const comptes=m.comptes||{},proj=m.projectionEtendue||{},cer=m.cerbere||{},dash=m.dashboard||{},c=dash.courtTerme||{};
  const p=cer&&Array.isArray(cer.periodes)?cer.periodes[0]:null,v=p&&p.v37||{},cockpit=v.cockpit20260902||{},per=p&&p.periode||p||{};
  const debut=new Date(per.debut||0),fin=new Date(per.fin||0),ref=new Date(proj.dateReference||new Date());
  const cibleSs1=new Date(debut);cibleSs1.setDate(cibleSs1.getDate()-1);cibleSs1.setHours(23,59,59,999);
  const soldeReel=Number(comptes&&comptes.synthese&&comptes.synthese.disponible);
  const operations=lireTable_('Operations')||[];
  const ss1Canon=typeof soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_==='function'
    ?soldeHistoriqueCompteCourantCanoniqueBudgetSoft20260928_(cibleSs1,{soldeReel:soldeReel,comptes:comptes.comptes||[],operations:operations,dateReference:ref})
    :null;
  const mi=new Date(debut.getTime()+Math.floor((fin.getTime()-debut.getTime())/2));
  const pointMi=typeof pointProjectionTresorerieUnifiee20260907_==='function'?pointProjectionTresorerieUnifiee20260907_(proj,mi):null;
  const pointFin=typeof pointProjectionTresorerieUnifiee20260907_==='function'?pointProjectionTresorerieUnifiee20260907_(proj,fin):null;
  const jr=function(x){return Utilities.formatDate(new Date(x),Session.getScriptTimeZone(),'yyyy-MM-dd');};
  const jRef=jr(ref),jDeb=jr(debut),jFin=jr(fin);
  const lignes=(proj.lignes||[]).filter(function(x){const j=jr(x&&x.date);return j>jRef&&j<=jFin;});
  const revenusProjection=lignes.filter(function(x){return Number(x&&x.montantSigne||0)>0;});
  const revenusRecurrents=revenusProjection.filter(function(x){return String(x&&x.source||'')==='revenu_recurrent';});
  const recettesProj=Math.round(revenusProjection.reduce(function(a,x){return a+Number(x&&x.montantSigne||0);},0)*100)/100;
  const recettesRec=Math.round(revenusRecurrents.reduce(function(a,x){return a+Number(x&&x.montantSigne||0);},0)*100)/100;
  const eq=function(a,b){return Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=.01;};
  const canonParCategorie=v&&v.rt1Audit&&v.rt1Audit.canonEffectifParCategorie||{};
  const reelParCategorie=v&&v.rt1Audit&&v.rt1Audit.reelParCategorie||{};
  const categoriesR0=Object.keys(canonParCategorie).filter(function(k){return Number(canonParCategorie[k]&&canonParCategorie[k].retenu||0)>0;});
  const couvertes=new Set(revenusRecurrents.map(function(x){return String(x&&x.categorie||x&&x.libelle||'').trim();}).filter(Boolean));
  Object.keys(reelParCategorie).forEach(function(k){if(Number(reelParCategorie[k]||0)>0)couvertes.add(String(k));});
  const categoriesR0Manquantes=categoriesR0.filter(function(k){return !couvertes.has(String(k));});
  const cbHeritees=Number(cockpit.cbHeriteesCycle||0),het1=Number(v.het1||0),ss1=Number(v.ss1||0),rt1=Number(v.rt1||0),cft1=Number(v.cft1||0);
  const p1Recompose=Math.max(0,Math.round((ss1+rt1-cft1-het1-cbHeritees)*100)/100);
  const p1Publie=Number(cockpit.pSoutenable!=null?cockpit.pSoutenable:cockpit.p1Total);
  const controles={
    snapshotDisponible:!!(e&&e.ok===true),
    dateReferenceCourante:String(proj.dateReference||'')===Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd'),
    projectionOwnerCanonique:String(proj.proprietaireBudgetSoft||'')==='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907'&&String(proj.moteurSousJacent||'')==='chargerTresoreriePrevisionnelle20260901',
    soldeJourJAligne:eq(c.soldeBancaire,soldeReel),
    ss1AligneCanon:eq(v.ss1,ss1Canon),
    dashboardSs1Aligne:eq(c.soldeInitialReference,v.ss1),
    recettesReevalueesAlignees:eq(c.revenusReevaluees,v.rt1)&&eq(c.revenusAttendus,v.rt1),
    chargesFixesReevalueesAlignees:eq(c.chargesFixesReevaluees,v.cft1),
    milieuAligneProjection:eq(c.soldeMiCycle,pointMi),
    finAligneeProjection:eq(c.soldeFinCycle,pointFin),
    revenusRecurrentsCyclePresents:revenusRecurrents.length>0,
    couvertureR0Complete:categoriesR0Manquantes.length===0,
    p1RecomposeDepuisOwners:eq(p1Publie,p1Recompose)
  };
  const out={
    ok:Object.keys(controles).every(function(k){return controles[k]===true;}),
    version:BUDGETSOFT_DOCTRINE_INTERMODULE_AUDIT_20260928_VERSION,
    revisionBudgetSoft:e&&e.revisionBudgetSoft||'',
    cycle:{debut:jDeb,fin:jFin,dateReference:jRef},
    pointsReference:{
      soldeJourJ:{dashboard:c.soldeBancaire,comptes:soldeReel},
      soldeInitial:{dashboard:c.soldeInitialReference,cerbere:v.ss1,canon27:ss1Canon,statut:v.ss1Statut||''},
      milieu:{dashboard:c.soldeMiCycle,projection:pointMi},
      fin:{dashboard:c.soldeFinCycle,projection:pointFin}
    },
    constructionCycle:{
      recettesReevaluees:{dashboard:c.revenusReevaluees,attendues:c.revenusAttendus,cerbereRt1:v.rt1,projectionFuture:recettesProj,projectionRecurrents:recettesRec,nombreRecurrents:revenusRecurrents.length},
      chargesFixesReevaluees:{dashboard:c.chargesFixesReevaluees,cerbereCft1:v.cft1,reference:c.chargesFixesReference}
    },
    p1:{valeur:p1Publie,recompose:p1Recompose,ss1:ss1,rt1:rt1,cft1:cft1,het1:het1,cbHeritees:cbHeritees},
    projection:{proprietaire:String(proj.proprietaireBudgetSoft||''),moteurSousJacent:String(proj.moteurSousJacent||''),categoriesR0Attendues:categoriesR0,categoriesR0Manquantes:categoriesR0Manquantes},
    controles:controles,
    revenusRecurrents:revenusRecurrents.map(function(x){return{date:jr(x.date),libelle:String(x.libelle||''),categorie:String(x.categorie||''),montant:Number(x.montantSigne||0),preuve:String(x.preuve||'')};})
  };
  console.log('[AUDIT OSSATURE DOCTRINES BUDGETSOFT 20260928] '+JSON.stringify(out));
  return out;
}
