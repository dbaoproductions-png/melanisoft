const BUDGETSOFT_SNAPSHOT_CONSUMPTION_AUDIT_VERSION='2026-09-06.1';

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
