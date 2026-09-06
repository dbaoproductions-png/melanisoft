const BUDGETSOFT_REAL_BALANCE_DUPLICATE_AUDIT_VERSION='2026-09-06.1';

function normaliserLibelleAuditDoublonBudgetSoft20260906_(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}

function auditerDoublonsSoldeReelBudgetSoft20260906(){
  const ops=lireTable_('Operations')||[];
  const cibleCompte='05f09474-e55b-4b64-b438-e31439514fdc';
  const lignes=ops.filter(o=>String(o&&o.compte||'')===cibleCompte).map(o=>({
    id:String(o&&o.id||''),
    jour:typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):'',
    date_achat:typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(o&&o.date_achat||o&&o.date):'',
    libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),
    libelle_bancaire:String(o&&o.libelle_bancaire||''),
    montant:Number(o&&o.montant||0),
    source_bancaire:String(o&&o.source_bancaire||''),
    statut_bancaire:String(o&&o.statut_bancaire||''),
    cle_rapprochement:String(o&&o.cle_rapprochement||''),
    carte_fin:String(o&&o.carte_fin||'')
  })).filter(x=>x.jour>='2026-08-28'&&x.jour<='2026-08-31');

  const suspects=lignes.filter(x=>x.jour==='2026-08-29'&&Math.abs(x.montant+4)<.001||x.jour==='2026-08-29'&&Math.abs(x.montant+21.99)<.001);
  const correspondances=[];
  suspects.forEach(s=>{
    const lab=normaliserLibelleAuditDoublonBudgetSoft20260906_(s.libelle_bancaire||s.libelle);
    const marchands=lab.split(' ').filter(Boolean);
    const candidats=lignes.filter(x=>x.id!==s.id&&Math.abs(Number(x.montant)-Number(s.montant))<.001).map(x=>{
      const lx=normaliserLibelleAuditDoublonBudgetSoft20260906_(x.libelle_bancaire||x.libelle);
      const motsCommuns=marchands.filter(m=>m.length>=4&&lx.includes(m));
      return Object.assign({},x,{motsCommuns,scoreLibelle:motsCommuns.length});
    }).sort((a,b)=>b.scoreLibelle-a.scoreLibelle||String(a.jour).localeCompare(String(b.jour)));
    correspondances.push({suspect:s,candidats});
  });

  const parJour={};
  lignes.forEach(x=>{if(!parJour[x.jour])parJour[x.jour]={nombre:0,net:0};parJour[x.jour].nombre++;parJour[x.jour].net=Math.round((parJour[x.jour].net+x.montant)*100)/100;});
  const r={ok:true,version:BUDGETSOFT_REAL_BALANCE_DUPLICATE_AUDIT_VERSION,fenetre:['2026-08-28','2026-08-31'],parJour,suspects,correspondances};
  console.log(JSON.stringify(r));
  return r;
}
