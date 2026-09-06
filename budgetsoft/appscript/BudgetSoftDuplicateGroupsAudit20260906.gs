const BUDGETSOFT_DUPLICATE_GROUPS_AUDIT_VERSION='2026-09-06.1';

function auditerGroupesDoublonsBancairesBudgetSoft20260906(dateDepuis){
  const ops=lireTable_('Operations')||[];
  const groupes=new Map();
  ops.forEach(o=>{
    if(typeof estCbFluxCanoniqueBudgetSoft20260906_!=='function'||!estCbFluxCanoniqueBudgetSoft20260906_(o))return;
    const base=typeof baseCleRapprochementBudgetSoft20260906_==='function'?baseCleRapprochementBudgetSoft20260906_(o):'';
    if(!base||!/^HB\|FLOW\|/i.test(base))return;
    if(!groupes.has(base))groupes.set(base,[]);
    groupes.get(base).push(o);
  });
  const depuis=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(dateDepuis||'2026-08-15'):String(dateDepuis||'2026-08-15');
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const details=[];
  let exclusTotal=0,impactTotal=0,exclusDepuis=0,impactDepuis=0;
  groupes.forEach((g,base)=>{
    if(g.length<2)return;
    const tries=g.slice().sort((a,b)=>scoreDoublonBancaireCanoniqueBudgetSoft20260906_(b,base)-scoreDoublonBancaireCanoniqueBudgetSoft20260906_(a,base));
    const gagnant=tries[0],exclus=tries.slice(1);
    const impact=arr(-exclus.reduce((s,o)=>s+Number(o&&o.montant||0),0));
    exclusTotal+=exclus.length;impactTotal=arr(impactTotal+impact);
    const toucheDepuis=exclus.some(o=>{const j=jourComptableCanonBudgetSoft20260906_(o);return j&&j>depuis;})||(()=>{const j=jourComptableCanonBudgetSoft20260906_(gagnant);return j&&j>depuis;})();
    if(toucheDepuis){exclusDepuis+=exclus.length;impactDepuis=arr(impactDepuis+impact);}
    details.push({
      baseCle:base,
      lignes:g.length,
      impactNet:impact,
      touchePeriodeDepuis:toucheDepuis,
      gagnant:{id:String(gagnant.id||''),date_comptable:jourComptableCanonBudgetSoft20260906_(gagnant),date_achat:jourCanonBudgetSoft20260906_(gagnant.date_achat),libelle:String(gagnant.libelle_bancaire||gagnant.libelle||''),montant:Number(gagnant.montant||0),carte_fin:String(gagnant.carte_fin||''),statut:String(gagnant.statut_bancaire||'')},
      exclus:exclus.map(o=>({id:String(o.id||''),date_comptable:jourComptableCanonBudgetSoft20260906_(o),date_achat:jourCanonBudgetSoft20260906_(o.date_achat),libelle:String(o.libelle_bancaire||o.libelle||''),montant:Number(o.montant||0),carte_fin:String(o.carte_fin||''),statut:String(o.statut_bancaire||'')}))
    });
  });
  details.sort((a,b)=>Number(b.touchePeriodeDepuis)-Number(a.touchePeriodeDepuis)||Math.abs(b.impactNet)-Math.abs(a.impactNet));
  const r={ok:true,version:BUDGETSOFT_DUPLICATE_GROUPS_AUDIT_VERSION,dateDepuis:depuis,groupes:details.length,doublonsExclus:exclusTotal,impactNetTotal:arr(impactTotal),doublonsExclusDepuis:exclusDepuis,impactNetDepuis:arr(impactDepuis),details};
  console.log(JSON.stringify(r));return r;
}
