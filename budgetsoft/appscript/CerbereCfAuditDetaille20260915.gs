/* BudgetSoft — audit détaillé de la composition CF2 publiée dans le snapshot global. */
const CERBERE_CF_AUDIT_DETAILLE_20260915_VERSION='2026-09-15.1';

function auditerCerbereCf2Detaille20260915(){
  const s=typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():null;
  const e=s&&s.etat||{};
  const c=e&&e.modules&&e.modules.cerbere||{};
  const d=c&&c.diagnostic||{};
  const p2=d&&d.p2Doctrine20260913||{};
  const a=p2&&p2.cft2Audit||{};
  const lignes=Array.isArray(a.lignes)?a.lignes:[];
  const totalLignes=Math.round(lignes.reduce((s,l)=>s+Number(l&&l.retenu||0),0)*100)/100;
  const out={
    ok:!!(s&&s.disponible&&e&&e.ok===true),
    version:CERBERE_CF_AUDIT_DETAILLE_20260915_VERSION,
    revisionBudgetSoft:String(e&&e.revisionBudgetSoft||''),
    cf2:Number(p2&&p2.cft2||0),
    brutAvantSuspensions:Number(a&&a.brutAvantSuspensions||0),
    suspensions:Number(a&&a.suspensions||0),
    totalLignes:totalLignes,
    ownerVersion:String(a&&a.ownerVersion||''),
    nombreLignes:lignes.length,
    lignes:lignes.map(function(l){return{
      id:String(l&&l.id||''),
      libelle:String(l&&l.libelle||''),
      frequence:String(l&&l.frequence||''),
      occurrences:Number(l&&l.occurrences||0),
      prevu:Number(l&&l.prevu||0),
      reel:l&&l.reel==null?null:Number(l.reel),
      retenu:Number(l&&l.retenu||0),
      source:String(l&&l.source||'')
    };})
  };
  console.log('[AUDIT CERBERE CF2 DETAILLE 20260915] '+JSON.stringify(out));
  lignes.forEach(function(l,i){
    console.log('[CF2 '+String(i+1).padStart(2,'0')+'] '+JSON.stringify({id:l&&l.id||'',libelle:l&&l.libelle||'',frequence:l&&l.frequence||'',occurrences:Number(l&&l.occurrences||0),prevu:Number(l&&l.prevu||0),reel:l&&l.reel==null?null:Number(l.reel),retenu:Number(l&&l.retenu||0),source:l&&l.source||''}));
  });
  return out;
}
