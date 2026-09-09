const BUDGETSOFT_SNAPSHOT_CONSUMPTION_AUDIT_VERSION='2026-09-09.1';

function auditerConsommationSnapshotGlobalBudgetSoft20260906(){
  const resultats={},erreurs=[];
  function mesurer(nom,fn){
    const t0=Date.now();
    try{
      const r=fn();
      const out={ok:!!r,dureeMs:Date.now()-t0,source:r&&((r.performance&&r.performance.source)||r.sourceBudgetSoft)||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',version:r&&r.version||''};
      resultats[nom]=out;return out;
    }catch(e){const out={ok:false,dureeMs:Date.now()-t0,erreur:String(e&&e.message||e)};resultats[nom]=out;erreurs.push({module:nom,erreur:out.erreur});return out;}
  }
  const c=mesurer('comptes',()=>chargerSyntheseComptes20260828());
  const cr=mesurer('credits',()=>chargerCreditsEtDettesV2());
  const p=mesurer('patrimoine',()=>chargerPatrimoine());
  const ce=mesurer('cerbereExpress',()=>chargerVueCerbereExpress20260827());
  const revisions=[c,cr,p,ce].map(x=>x&&x.revisionBudgetSoft).filter(Boolean);
  const unique=[...new Set(revisions)];
  if(unique.length!==1)erreurs.push({module:'transversal',erreur:'Les écrans ne consomment pas tous la même révision globale.',revisions:unique});
  [c,cr,p,ce].forEach((x,i)=>{const nom=['comptes','credits','patrimoine','cerbereExpress'][i];if(x&&x.source!=='snapshot_global')erreurs.push({module:nom,erreur:'Source non globale : '+String(x.source||'')});});
  const out={ok:erreurs.length===0,version:BUDGETSOFT_SNAPSHOT_CONSUMPTION_AUDIT_VERSION,revisionBudgetSoft:unique.length===1?unique[0]:'',resultats,erreurs};
  console.log(JSON.stringify(out));return out;
}

/**
 * Audit transversal des consommateurs sensibles du snapshot global.
 * Il ne recalcule aucune vérité métier : il agrège les audits propriétaires déjà
 * présents afin de vérifier qu'ils convergent vers une même révision BudgetSoft.
 */
function auditerConsommateursTransversauxSnapshotBudgetSoft20260909(){
  const t0=Date.now(),resultats={},erreurs=[];
  function lancer(nom,nomFonction){
    const fn=globalThis[nomFonction];
    if(typeof fn!=='function'){
      const r={ok:false,disponible:false,erreur:'Fonction absente : '+nomFonction};
      resultats[nom]=r;erreurs.push({module:nom,erreur:r.erreur});return r;
    }
    try{
      const r=fn()||{};
      const out={ok:r.ok===true,disponible:true,version:r.version||'',revisionBudgetSoft:r.revisionBudgetSoft||'',dureeMs:null};
      resultats[nom]=out;
      if(!out.ok)erreurs.push({module:nom,erreur:'Audit non vert',version:out.version});
      return out;
    }catch(e){
      const r={ok:false,disponible:true,erreur:String(e&&e.message||e)};
      resultats[nom]=r;erreurs.push({module:nom,erreur:r.erreur});return r;
    }
  }

  const coeur=lancer('consommationCoeur','auditerConsommationSnapshotGlobalBudgetSoft20260906');
  const unite=lancer('uniteTresorerie','auditerUniteTresorerieBudgetSoft20260907');
  const dashboard=lancer('dashboard','auditerDashboardSyntheseBudgetSoft20260907');
  const cerbere=lancer('cerbere','auditerConsommateursCerbereClassique20260909');
  const express=lancer('cerbereExpress','auditerConsommateursSnapshotCerbereExpress20260909');
  const treasury=lancer('treasuryForecast','auditerConsommateursTreasuryForecast20260909');

  const revisions=Object.keys(resultats).map(k=>String(resultats[k]&&resultats[k].revisionBudgetSoft||'')).filter(Boolean);
  const uniques=[...new Set(revisions)];
  if(uniques.length>1)erreurs.push({module:'revisionBudgetSoft',erreur:'Plusieurs révisions détectées parmi les consommateurs.',revisions:uniques});

  // Modules secondaires explicitement hors prévisionnel : ils peuvent lire les tables
  // pour produire de l'historique ou du descriptif, mais ne doivent pas devenir une
  // source de solde bancaire prévisionnel.
  const secondaires={
    conseiller:{fonction:'chargerConseillerFinancier',role:'analyse historique / recommandations',autoriseHorsSnapshot:true},
    engagementsBancaires:{fonction:'chargerEngagementsBancairesFuturs',role:'détail descriptif des engagements du cycle',autoriseHorsSnapshot:true}
  };

  const out={
    ok:erreurs.length===0,
    version:BUDGETSOFT_SNAPSHOT_CONSUMPTION_AUDIT_VERSION,
    revisionBudgetSoft:uniques.length===1?uniques[0]:'',
    dureeMs:Date.now()-t0,
    resultats:resultats,
    secondaires:secondaires,
    controles:{auditsSensiblesVerts:erreurs.filter(e=>e.module!=='revisionBudgetSoft').length===0,revisionUnique:uniques.length<=1,aucuneNouvelleVeriteMetier:true},
    erreurs:erreurs
  };
  console.log('[AUDIT transversal consommateurs snapshot] '+JSON.stringify(out));
  return out;
}
