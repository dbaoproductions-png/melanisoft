/** Explication compacte des recettes attendues publiees (Rt1). Lecture seule. */
function auditerOrigineRecettesAttenduesCycle20261016(){
  const s=chargerSnapshotGlobalBudgetSoft20260906(),e=s&&s.disponible&&s.etat,m=e&&e.modules||{};
  const cer=m.cerbere||{},p=Array.isArray(cer.periodes)?cer.periodes[0]||{}:{},v=p.v37||{},a=v.rt1Audit||{};
  const dash=m.dashboard||{},ct=dash.courtTerme||{},rnd=n=>Number.isFinite(Number(n))?Math.round(Number(n)*100)/100:null;
  const canon=a.canonEffectifParCategorie||{};
  const postes=Object.keys(canon).map(k=>({categorie:k,canonCycle:rnd(canon[k]&&canon[k].cycle),reel:rnd(canon[k]&&canon[k].reel),retenu:rnd(canon[k]&&canon[k].retenu)}));
  const rt1=rnd(v.rt1),constate=rnd(ct.revenusConstates),attenduDashboard=rnd(ct.revenusAttendus);
  const out={ok:!!e&&!!p&&rt1!==null,lectureSeule:true,version:'2026-10-16.1',
    revision:String(e&&e.revisionBudgetSoft||''),periode:p.periode||{},
    rt1,attenduDashboard,constateDashboard:constate,ecartAttenduMoinsConstate:rt1===null||constate===null?null:rnd(rt1-constate),
    mode:String(a.modeCycleCourant||''),canonEffectifParCategorie:postes,
    socle:rnd(a.socle),horsR0:rnd(a.horsR0),planCycle:rnd(a.planCycle!=null?a.planCycle:a.plan),
    reelCerbere:rnd(a.revenusConstatesCycle),detailReelCerbere:a.revenusConstatesDetail||{},
    rt1AvantPlancher:rnd(a.ancienRt1),plancherReelPlusDus:rnd(a.plancherReelPlusEvenementsDus),
    evenementsDus:rnd(a.evenementsDus),evenementsDusDetail:Array.isArray(a.evenementsDusDetail)?a.evenementsDusDetail:[],
    complementCanonImplicite:rnd(a.complementCanonR0Implicite),
    avertissement:'Valeurs publiees dans le snapshot ; aucun recalcul, aucune ecriture.'};
  console.log('[AUDIT ORIGINE RT1] '+JSON.stringify(out));return out;
}
