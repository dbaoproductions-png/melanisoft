const BUDGETSOFT_CERBERE_CF_OCT_AUDIT_20260927_VERSION='2026-09-27.1';

function auditerChargesFixesOctobreCerbere20260927(){
  const s=typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():null;
  const e=s&&s.disponible&&s.etat?s.etat:(s&&s.etatPerime?s.etatPerime:null);
  const cer=e&&e.modules&&e.modules.cerbere||{};
  const ps=Array.isArray(cer&&cer.periodes)?cer.periodes:[];
  const p2=ps[1]||null;
  const d=cer&&cer.diagnostic&&cer.diagnostic.p2Doctrine20260913||{};
  const a=d&&d.cft2Audit||p2&&p2.v37&&p2.v37.cft1Audit20260912||{};
  const lignes=Array.isArray(a&&a.lignes)?a.lignes:[];
  const tri=lignes.slice().sort(function(x,y){return Number(y&&y.retenu||0)-Number(x&&x.retenu||0);});
  const totalRetenu=Math.round(tri.reduce(function(sum,x){return sum+Number(x&&x.retenu||0);},0)*100)/100;
  const totalPrevu=Math.round(tri.reduce(function(sum,x){return sum+Number(x&&x.prevu||0);},0)*100)/100;
  const totalReel=Math.round(tri.reduce(function(sum,x){return sum+Number(x&&x.reel||0);},0)*100)/100;
  const avecReel=tri.filter(function(x){return x&&x.reel!=null;});
  const ecarts=avecReel.map(function(x){
    return {
      libelle:String(x.libelle||''),id:String(x.id||''),occurrences:Number(x.occurrences||0),
      prevu:Number(x.prevu||0),reel:Number(x.reel||0),retenu:Number(x.retenu||0),
      ecartRetenuPrevu:Math.round((Number(x.retenu||0)-Number(x.prevu||0))*100)/100,
      source:String(x.source||'')
    };
  });
  const out={
    ok:!!(p2&&a&&a.ok!==false),
    version:BUDGETSOFT_CERBERE_CF_OCT_AUDIT_20260927_VERSION,
    lectureSeule:true,
    snapshot:{
      disponible:!!(s&&s.disponible),perime:!!(s&&s.perime),
      revisionBudgetSoft:String(e&&e.revisionBudgetSoft||''),
      genereLe:String(e&&e.genereLe||'')
    },
    periode:p2&&p2.periode||null,
    affiche:{
      cft2:Number(d&&d.cft2||p2&&p2.v37&&p2.v37.chargesFixesTotal||0),
      brutAvantSuspensions:Number(a&&a.brutAvantSuspensions||0),
      suspensions:Number(a&&a.suspensions||0)
    },
    recalculAudit:{
      totalPrevu:totalPrevu,
      totalReelExplicite:totalReel,
      totalRetenuSommeLignes:totalRetenu,
      nombreLignes:tri.length,
      nombreAvecReelExplicite:avecReel.length
    },
    lignes:tri.map(function(x){return{
      libelle:String(x.libelle||''),id:String(x.id||''),frequence:String(x.frequence||''),
      occurrences:Number(x.occurrences||0),prevu:Number(x.prevu||0),
      reel:x.reel==null?null:Number(x.reel),retenu:Number(x.retenu||0),source:String(x.source||'')
    };}),
    remplacementsReel:ecarts,
    controles:{
      sommeLignesEgaleBrut:Math.abs(totalRetenu-Number(a&&a.brutAvantSuspensions||0))<=.01,
      totalAfficheEgaleBrutMoinsSuspensions:Math.abs(Number(d&&d.cft2||0)-Math.max(0,Number(a&&a.brutAvantSuspensions||0)-Number(a&&a.suspensions||0)))<=.01
    },
    doctrine:String(a&&a.doctrine||'')
  };
  console.log('[AUDIT CF OCTOBRE CERBERE 20260927] '+JSON.stringify(out));
  return out;
}
