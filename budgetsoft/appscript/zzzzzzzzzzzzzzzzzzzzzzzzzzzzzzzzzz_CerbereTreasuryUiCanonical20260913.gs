const CERBERE_TREASURY_UI_CANONICAL_20260913_VERSION='2026-09-14.1';

/**
 * Adaptateur terminal Cerbère -> trésorerie canonique.
 * L'UI historique additionne les lignes retournées au solde réel ; on lui fournit
 * donc exclusivement les flux STRICTEMENT postérieurs à la date de référence.
 * Les dates sont normalisées en YYYY-MM-DD car l'UI historique les compare comme
 * des chaînes : un timestamp du premier jour du cycle ne doit pas être exclu.
 * Cela évite tout recalcul local et aligne les cartes Cerbère sur Comptes/Dashboard.
 */
function chargerTrajectoireBanqueCerbereRapide20260903(dateCible,partCerbere){
  const r=chargerTresorerieUnifieeBudgetSoft20260907(dateCible);
  if(!r||!r.ok)return r||{ok:false,erreur:'Trésorerie unifiée indisponible.'};
  const cible=String(r.dateCible||'');
  const ref=String(r.dateReference||'');
  const lignes=[];
  (r.lignes||[]).forEach(function(l){
    const j=jourTresorerieUnifiee20260907_(l&&l.date);
    if(!!j&&!!ref&&!!cible&&j>ref&&j<=cible){
      lignes.push(Object.assign({},l,{date:j}));
    }
  });
  return {
    ok:true,
    version:CERBERE_TREASURY_UI_CANONICAL_20260913_VERSION,
    revisionBudgetSoft:r.revisionBudgetSoft||'',
    dateReference:ref,
    dateCible:cible,
    soldeReel:r.soldeReel,
    soldePrevisionnel:r.soldePrevisionnel,
    lignes:lignes,
    decompositionCanonique:r.decompositionCanonique||null,
    confiance:r.confiance||null,
    sourceBudgetSoft:'snapshot_global_projection_canonique',
    proprietaireBudgetSoft:r.proprietaireBudgetSoft||'',
    partCerbereIgnoree:true,
    doctrine:'Cerbère lit la même trajectoire canonique que Comptes ; aucun complément local.'
  };
}

function auditerTrajectoireCerbereUiCanonique20260913(){
  const cible='2026-09-27';
  const canon=chargerTresorerieUnifieeBudgetSoft20260907(cible);
  const vue=chargerTrajectoireBanqueCerbereRapide20260903(cible,0);
  let delta=0;
  (vue&&vue.lignes||[]).forEach(function(l){
    const m=Number(l&&l.montantSigne);
    if(Number.isFinite(m))delta+=m;
  });
  const reconstitue=Math.round((Number(vue&&vue.soldeReel||0)+delta)*100)/100;
  const cibleCanon=Math.round(Number(canon&&canon.soldePrevisionnel||0)*100)/100;
  const ecart=Math.round((reconstitue-cibleCanon)*100)/100;
  const datesNormalisees=(vue&&vue.lignes||[]).every(function(l){
    return /^\d{4}-\d{2}-\d{2}$/.test(String(l&&l.date||''));
  });
  const out={
    ok:!!(canon&&canon.ok&&vue&&vue.ok&&Math.abs(ecart)<=0.01&&datesNormalisees),
    version:CERBERE_TREASURY_UI_CANONICAL_20260913_VERSION,
    revisionBudgetSoft:vue&&vue.revisionBudgetSoft||'',
    dateReference:vue&&vue.dateReference||'',
    dateCible:cible,
    soldeReel:vue&&vue.soldeReel,
    soldeCanon:cibleCanon,
    soldeReconstitueUi:reconstitue,
    ecart:ecart,
    nombreLignes:(vue&&vue.lignes||[]).length,
    datesNormalisees:datesNormalisees,
    contientEpImmediat:(vue&&vue.lignes||[]).some(function(l){return String(l&&l.source||'')==='ep_immediat_estime';}),
    proprietaire:vue&&vue.proprietaireBudgetSoft||''
  };
  console.log('[AUDIT Cerbère UI trésorerie canonique] '+JSON.stringify(out));
  return out;
}
