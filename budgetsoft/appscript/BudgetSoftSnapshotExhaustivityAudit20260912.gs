const BUDGETSOFT_SNAPSHOT_EXHAUSTIVITY_20260912_VERSION='2026-09-12.1';

/**
 * Garde architecturale : inventaire des lecteurs réellement servis par les UI
 * BudgetSoft. Le snapshot global orchestre une révision commune ; les moteurs
 * métier restent propriétaires de leurs calculs.
 *
 * Trois statuts seulement :
 *   - DANS_SNAPSHOT
 *   - A_INTEGRER
 *   - HORS_SNAPSHOT_PAR_NATURE (réservé aux fonctions avec effets de bord)
 *
 * Tant qu'un lecteur pur est A_INTEGRER, l'audit est volontairement rouge.
 */
function manifesteLecteursSnapshotBudgetSoft20260912_(){
  return [
    {vue:'dashboard',fonction:'chargerDashboardReel',statut:'DANS_SNAPSHOT',role:'tableau de bord / synthèse'},
    {vue:'comptes',fonction:'chargerSyntheseComptes20260828',statut:'DANS_SNAPSHOT',role:'synthèse des comptes'},
    {vue:'operations',fonction:'chargerSnapshotOperations20260828',statut:'A_INTEGRER',role:'première vue Opérations ; snapshot local autonome'},
    {vue:'operations',fonction:'chargerOperationsLeger20260828',statut:'A_INTEGRER',role:'complément / repli de lecture Opérations'},
    {vue:'charges_fixes',fonction:'chargerChargesFixesReview20260829',statut:'A_INTEGRER',role:'vue Charges fixes ; snapshot local autonome'},
    {vue:'charges_fixes',fonction:'chargerPropositionsRapprochementChargesFixes20260829',statut:'A_INTEGRER',role:'propositions de rapprochement en lecture pure'},
    {vue:'plan',fonction:'chargerPlanStructureV54',statut:'A_INTEGRER',role:'structure du Plan'},
    {vue:'plan',fonction:'chargerMesuresPlanV54',statut:'A_INTEGRER',role:'mesures et gains effectifs du Plan'},
    {vue:'cerbere',fonction:'chargerCerbereV33',statut:'DANS_SNAPSHOT',role:'moteur / cockpit Cerbère servi par le snapshot'},
    {vue:'cerbere_express',fonction:'chargerVueCerbereExpress20260827',statut:'DANS_SNAPSHOT',role:'vue Cerbère Express'},
    {vue:'patrimoine',fonction:'chargerPatrimoine',statut:'DANS_SNAPSHOT',role:'patrimoine'},
    {vue:'credits',fonction:'chargerCreditsEtDettesV2',statut:'DANS_SNAPSHOT',role:'crédits et dettes'},
    {vue:'analyses',fonction:'chargerAnalysesBudgetairesV23',statut:'A_INTEGRER',role:'analyses budgétaires'},
    {vue:'ia',fonction:'chargerConseillerFinancier',statut:'A_INTEGRER',role:'conseiller financier / recommandations'},
    {vue:'engagements_bancaires',fonction:'chargerEngagementsBancairesFuturs',statut:'A_INTEGRER',role:'engagements bancaires futurs du cycle'},
    {vue:'budget_prefetch',fonction:'chargerBudgetPeriode',statut:'A_INTEGRER',role:'budget de période préchargé par l’interface'},
    {vue:'pluxee_prefetch',fonction:'chargerPluxee',statut:'A_INTEGRER',role:'registre Pluxee préchargé par l’interface'},
    {vue:'tresorerie_previsionnelle',fonction:'chargerTresorerieUnifieeBudgetSoft20260907',statut:'DANS_SNAPSHOT',role:'trésorerie prévisionnelle canonique'},
    {vue:'parametres',fonction:'',statut:'DANS_SNAPSHOT',role:'renderer client de doctrine ; aucune lecture serveur autonome identifiée'}
  ];
}

function manifesteEffetsHorsSnapshotBudgetSoft20260912_(){
  return [
    {famille:'écritures génériques',exemples:['enregistrerLigne','supprimerLigne']},
    {famille:'budget',exemples:['enregistrerBudgetPeriode','recopierBudgetPeriode']},
    {famille:'charges fixes',exemples:['sauvegarderChargeFixeReview20260828','supprimerChargeFixeReview20260828','deciderRapprochementChargeFixeRapide20260828']},
    {famille:'plan',exemples:['enregistrerActionPlanV54','enregistrerEvenementPlanV54','supprimerElementPlanV54']},
    {famille:'Pluxee',exemples:['importerCollerPluxee','enregistrerPluxeeManuel','mettreAJourCategoriePluxee']},
    {famille:'imports / réparations / validations',exemples:['fonctions dédiées des modules Import, Maintenance et audits correctifs']}
  ].map(function(x){return Object.assign({statut:'HORS_SNAPSHOT_PAR_NATURE'},x);});
}

function auditerExhaustiviteSnapshotBudgetSoft20260912(){
  const lecteurs=manifesteLecteursSnapshotBudgetSoft20260912_();
  const aIntegrer=lecteurs.filter(function(x){return x.statut==='A_INTEGRER';});
  const dansSnapshot=lecteurs.filter(function(x){return x.statut==='DANS_SNAPSHOT';});
  const fonctionsAbsentes=lecteurs.filter(function(x){
    if(!x.fonction)return false;
    try{return typeof globalThis[x.fonction]!=='function';}catch(e){return false;}
  }).map(function(x){return x.fonction;});

  let revisionBudgetSoft='';
  try{
    const etat=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'
      ?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
    revisionBudgetSoft=etat&&etat.revisionBudgetSoft||'';
  }catch(e){}

  const resultat={
    ok:aIntegrer.length===0&&fonctionsAbsentes.length===0&&!!revisionBudgetSoft,
    version:BUDGETSOFT_SNAPSHOT_EXHAUSTIVITY_20260912_VERSION,
    revisionBudgetSoft:revisionBudgetSoft,
    compteurs:{
      lecteurs:lecteurs.length,
      dansSnapshot:dansSnapshot.length,
      aIntegrer:aIntegrer.length,
      horsSnapshotParNature:manifesteEffetsHorsSnapshotBudgetSoft20260912_().length
    },
    lecteurs:lecteurs,
    aIntegrer:aIntegrer,
    horsSnapshotParNature:manifesteEffetsHorsSnapshotBudgetSoft20260912_(),
    fonctionsAbsentes:fonctionsAbsentes,
    regle:'Aucun lecteur pur d’interface ne peut rester hors de la revisionBudgetSoft commune.'
  };
  console.log('[AUDIT exhaustivite snapshot] '+JSON.stringify(resultat));
  return resultat;
}
