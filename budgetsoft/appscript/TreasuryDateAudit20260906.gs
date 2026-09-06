const BUDGETSOFT_TREASURY_DATE_AUDIT_VERSION='2026-09-06.1';

function auditerFluxComptablesDateBudgetSoft20260906(dateCible){
  const jour=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(dateCible):String(dateCible||'');
  if(!jour)throw new Error('Date cible invalide.');
  const ops=lireTable_('Operations')||[];
  const lignes=ops.filter(o=>typeof jourComptableCanonBudgetSoft20260906_==='function'&&jourComptableCanonBudgetSoft20260906_(o)===jour).map(o=>({
    id:String(o&&o.id||''),
    date_comptable:jour,
    date_achat:typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(o&&o.date_achat):String(o&&o.date_achat||''),
    libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),
    montant:Number(o&&o.montant||0),
    type:String(o&&o.type||''),
    compte:String(o&&o.compte||''),
    source_bancaire:String(o&&o.source_bancaire||''),
    statut_bancaire:String(o&&o.statut_bancaire||''),
    charge_fixe_id:String(o&&o.charge_fixe_id||''),
    recurrence:/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||''))
  }));
  const prisesParTresorerie=lignes.filter(x=>!x.recurrence);
  const somme=xs=>Math.round(xs.reduce((s,x)=>s+Number(x.montant||0),0)*100)/100;
  const debits=Math.round(lignes.filter(x=>Number(x.montant)<0).reduce((s,x)=>s+Math.abs(Number(x.montant||0)),0)*100)/100;
  const credits=Math.round(lignes.filter(x=>Number(x.montant)>0).reduce((s,x)=>s+Math.abs(Number(x.montant||0)),0)*100)/100;
  const parSource={};
  lignes.forEach(x=>{const k=(x.source_bancaire||'sans_source')+'|'+(x.statut_bancaire||'sans_statut');if(!parSource[k])parSource[k]={nombre:0,net:0};parSource[k].nombre++;parSource[k].net=Math.round((parSource[k].net+Number(x.montant||0))*100)/100;});
  const r={ok:true,version:BUDGETSOFT_TREASURY_DATE_AUDIT_VERSION,date:jour,nombre:lignes.length,debits,credits,net:somme(lignes),netPrisParTresorerie:somme(prisesParTresorerie),recurrencesExclues:lignes.length-prisesParTresorerie.length,parSource,lignes};
  console.log(JSON.stringify(r));return r;
}

function auditerFlux07092026BudgetSoft(){return auditerFluxComptablesDateBudgetSoft20260906('2026-09-07');}
