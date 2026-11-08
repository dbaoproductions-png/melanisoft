/**
 * Contrôle en lecture seule : Crédits (soldes de référence), Patrimoine et
 * Analyses (estimation commune). Ne reconstruit ni snapshot ni écrit de ligne.
 * Aucun montant personnel codé dans le dépôt.
 */
const BUDGETSOFT_CREDITS_PATRIMOINE_ANALYSES_AUDIT_VERSION_20261108='2026-11-08.1';

function auditerCoherenceCreditsPatrimoineAnalyses20261108(){
  const arr=function(n){return Math.round((Number(n)+Number.EPSILON)*100)/100;};
  const erreur=[],controles={};
  function verifier(nom,condition,detail){
    controles[nom]=!!condition;
    if(!condition)erreur.push({controle:nom,detail:String(detail||'Valeurs discordantes ou indisponibles')});
  }
  function nombre(obj,cle){
    if(!obj||obj[cle]===null||obj[cle]===undefined||obj[cle]==='')return null;
    const n=Number(obj[cle]);return Number.isFinite(n)?arr(n):null;
  }
  function egaux(a,b){
    return a!==null&&b!==null&&Math.abs(a-b)<=.01;
  }
  function somme(xs,key){return arr((xs||[]).reduce(function(total,x){return total+Number(x&&x[key]||0);},0));}
  function prendre(source){
    if(!source)return null;
    return {
      capitalCreditsEstime:nombre(source,'capitalCreditsEstime'),
      dettesHorsCredit:nombre(source,'dettesHorsCredit'),
      endettementTotalEstime:nombre(source,'endettementTotalEstime'),
      patrimoineNetEstime:nombre(source,'patrimoineNetEstime')
    };
  }

  // Le snapshot déjà publié est l'unique source commune ; ne jamais le reconstruire.
  const s=chargerSnapshotGlobalBudgetSoft20260906();
  const etat=s&&s.disponible&&s.etat||null;
  const modules=etat&&etat.modules||{};
  const c=modules.credits||null,p=modules.patrimoine||null,a=modules.analyses||null;
  const estime=modules.situationPatrimonialeEstimee||null;
  const revision=String(etat&&etat.revisionBudgetSoft||'');

  verifier('snapshot_publie_non_perime',
    !!(s&&s.disponible&&s.perime!==true&&etat&&etat.ok===true&&etat.publie===true&&revision),
    'Le snapshot global doit être publié et non périmé.');
  verifier('modules_presents',!!(c&&p&&a&&estime&&estime.ok===true),
    'Crédits, Patrimoine, Analyses ou estimation commune absents du snapshot.');

  const actifsCredits=Array.isArray(c&&c.amortissables)?c.amortissables:[];
  const revCredits=Array.isArray(c&&c.renouvelables)?c.renouvelables:[];
  const fiches=lireCreditsEtendusV2_();
  const fAmort=fiches.filter(x=>String(x.type_credit||'amortissable').toLowerCase()!=='revolving');
  const fRev=fiches.filter(x=>String(x.type_credit||'amortissable').toLowerCase()==='revolving');
  const chiffres={
    classeur:{
      nombreCredits:fiches.length,
      capitalAmortissables:somme(fAmort,'capital_restant'),
      capitalRenouvelables:somme(fRev,'capital_restant'),
      capitalTotal:somme(fiches,'capital_restant'),
      mensualitesTotal:somme(fiches,'mensualite')
    },
    credits:{
      nombreCredits:actifsCredits.length+revCredits.length,
      capitalAmortissables:nombre(c,'capitalAmortissable'),
      capitalRenouvelables:nombre(c,'capitalRenouvelable'),
      capitalTotal:nombre(c,'capitalCredits'),
      mensualitesTotal:nombre(c,'mensualitesCredits'),
      dettesHorsCredit:nombre(c,'dettesHorsCredit'),
      endettementTotal:nombre(c,'endettementTotal')
    },
    patrimoine:{
      capitalCredits:nombre(p,'totalCredits'),
      dettesHorsCredit:nombre(p,'totalDettesHorsCredit'),
      endettementTotal:nombre(p,'totalDettes'),
      actifs:nombre(p,'totalActifs'),
      patrimoineNet:nombre(p,'patrimoineNet')
    },
    estimationCommune:prendre(estime),
    estimationCredits:prendre(c&&c.situationPatrimonialeEstimee),
    estimationPatrimoine:prendre(p&&p.situationPatrimonialeEstimee),
    estimationAnalyses:prendre(a&&a.situationPatrimonialeEstimee)
  };

  verifier('sept_credits_enregistres',chiffres.classeur.nombreCredits===7,
    'Le nombre de crédits attendus dans le référentiel est de sept.');
  verifier('source_credits_capital',
    egaux(chiffres.classeur.capitalTotal,chiffres.credits.capitalTotal),
    'Le total de la feuille Credits diffère du module Crédits publié.');
  verifier('source_credits_amortissables',
    egaux(chiffres.classeur.capitalAmortissables,chiffres.credits.capitalAmortissables),
    'Capital des prêts amortissables différent.');
  verifier('source_credits_revolving',
    egaux(chiffres.classeur.capitalRenouvelables,chiffres.credits.capitalRenouvelables),
    'Encours renouvelable différent.');
  verifier('source_credits_mensualites',
    egaux(chiffres.classeur.mensualitesTotal,chiffres.credits.mensualitesTotal),
    'Mensualités différentes entre feuille et snapshot.');
  verifier('credit_equation_capital',
    egaux(chiffres.credits.capitalTotal,arr(Number(chiffres.credits.capitalAmortissables)+Number(chiffres.credits.capitalRenouvelables))),
    'Le total des crédits diffère de la somme amortissables + renouvelables.');
  verifier('credit_equation_endettement',
    egaux(chiffres.credits.endettementTotal,
      arr(Number(chiffres.credits.capitalTotal)+Number(chiffres.credits.dettesHorsCredit))),
    'Endettement total incohérent dans Crédits.');
  verifier('patrimoine_vs_credits_reference',
    egaux(chiffres.patrimoine.endettementTotal,chiffres.credits.endettementTotal),
    'L’endettement canonique de Patrimoine diverge de celui de Crédits.');
  verifier('patrimoine_equation_net',
    egaux(chiffres.patrimoine.patrimoineNet,
      arr(Number(chiffres.patrimoine.actifs)-Number(chiffres.patrimoine.endettementTotal))),
    'Patrimoine net incohérent avec les actifs moins les dettes.');
  verifier('estimation_presente',!!chiffres.estimationCommune,
    'Estimation patrimoniale commune absente.');
  ['capitalCreditsEstime','dettesHorsCredit','endettementTotalEstime','patrimoineNetEstime'].forEach(function(champ){
    const canon=nombre(chiffres.estimationCommune,champ);
    ['Credits','Patrimoine','Analyses'].forEach(function(nom){
      verifier('estimation_'+champ+'_'+nom.toLowerCase(),
        egaux(canon,nombre(chiffres['estimation'+nom],champ)),
        'L’estimation '+champ+' de '+nom+' ne correspond pas au snapshot commun.');
    });
  });
  verifier('estimation_equation_endettement',
    chiffres.estimationCommune&&egaux(chiffres.estimationCommune.endettementTotalEstime,
      arr(Number(chiffres.estimationCommune.capitalCreditsEstime)+Number(chiffres.estimationCommune.dettesHorsCredit))),
    'Endettement estimé ≠ crédits estimés + dettes hors crédit.');
  verifier('estimation_vs_reference_dettes_hors_credit',
    chiffres.estimationCommune&&egaux(chiffres.estimationCommune.dettesHorsCredit,
      chiffres.credits.dettesHorsCredit),
    'Les dettes hors crédit diffèrent entre base et estimation.');

  // Contrôler aussi les API réellement utilisées par les interfaces.
  const uiCredits=chargerCreditsEtDettesV2();
  const uiPatrimoine=chargerCreditsPatrimoineIntegres20260915();
  const uiAnalyses=chargerAnalysesBudgetairesV23(6);
  const uiEstimationAnalyses=chargerSituationPatrimonialeEstimeeBudgetSoft20261014();
  const ui={
    creditsRevision:String(uiCredits&&uiCredits.revisionBudgetSoft||''),
    patrimoineRevision:String(uiPatrimoine&&uiPatrimoine.revisionBudgetSoft||''),
    analysesRevision:String(uiAnalyses&&uiAnalyses.revisionBudgetSoft||''),
    estimationAnalysesRevision:String(uiEstimationAnalyses&&uiEstimationAnalyses.revisionBudgetSoft||''),
    estimationAnalyses:prendre(uiEstimationAnalyses),
    creditSource:String(uiCredits&&uiCredits.sourceBudgetSoft||''),
    patrimoineSource:String(uiPatrimoine&&uiPatrimoine.sourceBudgetSoft||''),
    analysesSource:String(uiAnalyses&&uiAnalyses.sourceBudgetSoft||'')
  };
  verifier('api_trois_revisions_identiques',!!revision&&
    [ui.creditsRevision,ui.patrimoineRevision,ui.analysesRevision,ui.estimationAnalysesRevision]
      .every(function(x){return x===revision;}),
    'Une interface consomme une autre révision du snapshot.');
  verifier('api_sources_snapshot',ui.creditSource==='snapshot_global'&&
    ui.patrimoineSource==='snapshot_global'&&ui.analysesSource==='snapshot_global',
    'Une interface n’utilise pas le snapshot global frais.');
  ['capitalCreditsEstime','dettesHorsCredit','endettementTotalEstime','patrimoineNetEstime'].forEach(function(champ){
    verifier('api_analyses_'+champ,
      egaux(nombre(ui.estimationAnalyses,champ),nombre(chiffres.estimationCommune,champ)),
      'Le panneau Analyses ne reçoit pas la même valeur pour '+champ+'.');
  });
  const resultat={ok:erreur.length===0,lectureSeule:true,version:BUDGETSOFT_CREDITS_PATRIMOINE_ANALYSES_AUDIT_VERSION_20261108,
    revisionBudgetSoft:revision,genereLe:String(etat&&etat.genereLe||''),
    source:'snapshot_global_et_lecture_classeur',chiffres,ui,controles,
    nombreControles:Object.keys(controles).length,nombreEchecs:erreur.length,erreurs:erreur,
    note:'Un capital estimé après rapprochements peut différer du capital enregistré : cette différence est normale si elle est justifiée. Cet audit compare les montants dans chaque périmètre équivalent.'};
  console.log('[AUDIT COHERENCE CREDITS PATRIMOINE ANALYSES 20261108] '+JSON.stringify(resultat));
  return resultat;
}
