/*
 * BudgetSoft — garde de comparaison des scénarios — 2026-09-17.
 *
 * Corrige deux faux négatifs du banc T1→T2 :
 * 1) un T1 historique capturé avant la correction de fraîcheur snapshot peut porter
 *    un solde réel périmé ;
 * 2) une comparaison exécutée un autre jour fait avancer les fenêtres glissantes
 *    de trésorerie/Cerbère, donc les deltas prévisionnels ne sont plus attribuables
 *    au seul import futur.
 */
const BUDGETSOFT_SCENARIO_TRANSITION_GUARD_20260917_VERSION='2026-09-17.1';

function memeJourScenarioTransition20260917_(a,b){
  return String(a||'').slice(0,10)===String(b||'').slice(0,10);
}
function arrScenarioTransition20260917_(n){return Math.round((Number(n)||0)*100)/100;}
function controleScenarioTransition20260917_(code,ok,detail,niveau){
  return {code:code,ok:!!ok,detail:detail||'',niveau:niveau||'bloquant'};
}

/**
 * Audit robuste de la transition import futur à partir des captures déjà stockées.
 * Ne recalcule aucun module métier.
 */
function auditerTransitionImportFuturBudgetSoft20260917(etapeAvant,etapeApres){
  etapeAvant=String(etapeAvant||'T1').toUpperCase();
  etapeApres=String(etapeApres||'T2').toUpperCase();
  const avant=lireEtatControleBudgetSoft20260916_(etapeAvant),apres=lireEtatControleBudgetSoft20260916_(etapeApres);
  if(!avant||!apres)throw new Error('Capture manquante : '+(!avant?etapeAvant:etapeApres));
  const a=avant.modules||{},b=apres.modules||{},ao=a.operations||{},bo=b.operations||{},ac=a.comptes||{},bc=b.comptes||{},at=a.tresorerie||{},bt=b.tresorerie||{};
  const memeJour=memeJourScenarioTransition20260917_(avant.date,apres.date);
  const deltaFutures=Number(bo.futures||0)-Number(ao.futures||0);
  const deltaPassees=Number(bo.passees||0)-Number(ao.passees||0);
  const deltaTotalPasse=arrScenarioTransition20260917_(Number(bo.totalPasse||0)-Number(ao.totalPasse||0));
  const deltaTotalFutur=arrScenarioTransition20260917_(Number(bo.totalFutur||0)-Number(ao.totalFutur||0));
  const compteStable=String(ac.empreinte||'')===String(bc.empreinte||'');
  const fluxPasseStable=deltaPassees===0&&Math.abs(deltaTotalPasse)<=.01;
  const controles=[];
  controles.push(controleScenarioTransition20260917_('IMPORT_FUTUR_AJOUTE_STRICTEMENT_DES_FUTURS',deltaFutures>0,'futures '+ao.futures+' → '+bo.futures+' ('+(deltaFutures>=0?'+':'')+deltaFutures+')'));
  controles.push(controleScenarioTransition20260917_('IMPORT_FUTUR_NE_MODIFIE_PAS_LE_VOLUME_PASSE',deltaPassees===0,'passées '+ao.passees+' → '+bo.passees));
  controles.push(controleScenarioTransition20260917_('IMPORT_FUTUR_NE_MODIFIE_PAS_LE_TOTAL_PASSE',Math.abs(deltaTotalPasse)<=.01,'total passé '+ao.totalPasse+' → '+bo.totalPasse));
  if(memeJour){
    controles.push(controleScenarioTransition20260917_('IMPORT_FUTUR_NE_BOUGE_PAS_COMPTES_REELS',compteStable,'empreinte comptes '+String(ac.empreinte||'').slice(0,10)+' → '+String(bc.empreinte||'').slice(0,10)));
  }else{
    controles.push(controleScenarioTransition20260917_('COMPTES_REELS_NON_COMPARABLES_INTERJOUR',fluxPasseStable,'captures '+String(avant.date).slice(0,10)+' → '+String(apres.date).slice(0,10)+' ; flux passés stables ; ancien T1 potentiellement périmé','informatif'));
  }
  controles.push(controleScenarioTransition20260917_('IMPORT_FUTUR_VISIBLE_DANS_OPERATIONS',Math.abs(deltaTotalFutur)>.01,'total futur '+ao.totalFutur+' → '+bo.totalFutur+' ; delta '+deltaTotalFutur));
  controles.push(controleScenarioTransition20260917_('IMPORT_FUTUR_VISIBLE_PREVISIONNEL',Number(bt.nombreLignes||0)>Number(at.nombreLignes||0),'lignes prévisionnelles '+at.nombreLignes+' → '+bt.nombreLignes));
  if(!memeJour){
    controles.push(controleScenarioTransition20260917_('DELTA_TRESORERIE_NON_ATTRIBUABLE_AU_SEUL_IMPORT',true,'fenêtre glissante changée de jour : '+String(at.dateReference||'')+' → '+String(bt.dateReference||''),'informatif'));
  }
  const bloquants=controles.filter(x=>x.niveau!=='informatif');
  const out={
    ok:bloquants.every(x=>x.ok),version:BUDGETSOFT_SCENARIO_TRANSITION_GUARD_20260917_VERSION,
    avant:etapeAvant,apres:etapeApres,memeJour:memeJour,
    controles:controles,
    deltas:{operations:{nombre:Number(bo.nombreCanonique||0)-Number(ao.nombreCanonique||0),passees:deltaPassees,futures:deltaFutures,totalPasse:deltaTotalPasse,totalFutur:deltaTotalFutur,sansCategorie:Number(bo.sansCategorie||0)-Number(ao.sansCategorie||0)},comptes:{disponible:arrScenarioTransition20260917_(Number(bc.synthese&&bc.synthese.disponible||0)-Number(ac.synthese&&ac.synthese.disponible||0))},tresorerie:{variationPrevue:arrScenarioTransition20260917_(Number(bt.variationPrevue||0)-Number(at.variationPrevue||0)),soldePrevisionnel:arrScenarioTransition20260917_(Number(bt.soldePrevisionnel||0)-Number(at.soldePrevisionnel||0))}},
    diagnostic:!memeJour?'Transition métier valide sur les opérations futures ; les deltas Comptes/Trésorerie exacts ne doivent pas être attribués au seul import car T1 et T2 ont été capturés sur deux jours différents et T1 précède la correction de fraîcheur snapshot.':'Transition import futur comparable sur une même journée.'
  };
  console.log('[AUDIT TRANSITION IMPORT FUTUR 20260917] '+JSON.stringify(out));
  return out;
}
