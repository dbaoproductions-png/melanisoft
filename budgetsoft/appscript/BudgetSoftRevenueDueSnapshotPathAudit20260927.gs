const BUDGETSOFT_REVENUE_DUE_SNAPSHOT_PATH_AUDIT_20260927_VERSION='2026-09-27.1';

function auditerRecetteDueCheminSnapshot20260927(){
  const cibleId='22649ef5-8372-41a7-80ca-5799fdeff7d6';
  const sources=typeof chargerToutesLesDonnees==='function'?chargerToutesLesDonnees():{};
  const comptes=typeof chargerSyntheseComptes20260828==='function'?chargerSyntheseComptes20260828():null;
  const pluxee=typeof chargerPluxeeV2==='function'?chargerPluxeeV2():null;
  const maintenant=new Date();
  const finCourant=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(maintenant):new Date(maintenant.getFullYear(),maintenant.getMonth(),27);
  const finSuivant=new Date(finCourant.getFullYear(),finCourant.getMonth()+1,finCourant.getDate());
  const finBancaireSuivante=new Date(finSuivant.getFullYear(),finSuivant.getMonth()+1,0,23,59,59,999);
  const cibleSuivante=Utilities.formatDate(finSuivant,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const cibleCalculUnique=Utilities.formatDate(finBancaireSuivante,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const tresorerieComptable=typeof construireTresorerieComptableCanoniqueBudgetSoft20260906_==='function'
    ?construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,finCourant,maintenant):null;
  let cerbereBase=null;
  try{const charge=chargerCerbereBaseDepuisSourcesSnapshotBudgetSoft20260911_(sources);cerbereBase=charge&&charge.base||null;}catch(e){}
  const projectionCalculUnique=typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function'
    ?construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cibleCalculUnique,cerbereBase&&cerbereBase.ok!==false?cerbereBase:null,{comptes:comptes,tresorerieComptable:tresorerieComptable,pluxee:pluxee})
    :null;
  const projectionEtendue=projectionCalculUnique&&projectionCalculUnique.ok!==false&&typeof sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_==='function'
    ?sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_(projectionCalculUnique,cibleSuivante):projectionCalculUnique;
  function lignesCible(p){return (p&&Array.isArray(p.lignes)?p.lignes:[]).filter(function(l){return String(l&&l.sourceId||'')===cibleId;}).map(function(l){return{id:String(l.id||''),source:String(l.source||''),date:String(l.date||''),montantSigne:Number(l.montantSigne||0),occurrence:Number(l.occurrence||0),preuve:String(l.preuve||'')};});}
  const out={
    ok:!!(projectionEtendue&&lignesCible(projectionEtendue).some(function(l){return l.source==='evenement'&&l.montantSigne>0;})),
    version:BUDGETSOFT_REVENUE_DUE_SNAPSHOT_PATH_AUDIT_20260927_VERSION,
    lectureSeule:true,
    maintenant:maintenant.toISOString(),
    cibleSuivante:cibleSuivante,
    cibleCalculUnique:cibleCalculUnique,
    projectionCalculUnique:{
      ok:projectionCalculUnique&&projectionCalculUnique.ok,
      dateReference:projectionCalculUnique&&projectionCalculUnique.dateReference||'',
      dateCible:projectionCalculUnique&&projectionCalculUnique.dateCible||'',
      lignesCible:lignesCible(projectionCalculUnique),
      injectes:projectionCalculUnique&&projectionCalculUnique.evenementsCertainsDusInjectes||[]
    },
    projectionEtendue:{
      ok:projectionEtendue&&projectionEtendue.ok,
      dateReference:projectionEtendue&&projectionEtendue.dateReference||'',
      dateCible:projectionEtendue&&projectionEtendue.dateCible||'',
      lignesCible:lignesCible(projectionEtendue),
      injectesSousVue:projectionEtendue&&projectionEtendue.evenementsCertainsDusInjectesSousVue||[]
    }
  };
  console.log('[AUDIT RECETTE DUE CHEMIN SNAPSHOT 20260927] '+JSON.stringify(out));
  return out;
}
