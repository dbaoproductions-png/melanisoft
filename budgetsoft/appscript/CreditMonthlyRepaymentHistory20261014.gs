/**
 * Remboursements mensuels constates : exclusivement operations bancaires
 * passees, rapprochees aux credits ou aux dettes hors credit.
 * Les flux ne sont jamais deduits a nouveau du capital estime.
 */
function chargerHistoriqueRemboursementsCredits20261014(){
  verifierInitialisation_();
  const today=new Date(),zone=Session.getScriptTimeZone();
  const aujourdhui=Utilities.formatDate(today,zone,'yyyy-MM-dd');
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const credits=lireCreditsEtendusV2_();
  const rapprochements=rapprochementsCreditsValidesRattrapage20260915_();
  const montantParMois={};
  const compter=(op,category)=>{
    const d=new Date(op&&((op.date_comptable||op.date)||op.date_operation)||0);
    if(isNaN(d))return;
    const date=Utilities.formatDate(d,zone,'yyyy-MM-dd');
    if(date>aujourdhui)return;
    const mois=date.slice(0,7);
    const montant=Number(op.montant||0);
    if(!Number.isFinite(montant)||montant>=0)return;
    if(!montantParMois[mois])montantParMois[mois]={credits:0,dettes:0};
    montantParMois[mois][category]+=Math.abs(montant);
  };
  const idsComptes=new Set();
  rapprochements.forEach(r=>{
    const liaison=trouverCreditRattrapageCofidis20261012_(r,credits);
    if(!liaison||!liaison.ok||!r.operation)return;
    const id=String(r.operation.id||'');
    if(!id||idsComptes.has(id))return;
    idsComptes.add(id);compter(r.operation,'credits');
  });
  const ops=lireTable_('Operations'),parId=new Map(ops.map(o=>[String(o.id||''),o]));
  const dettes=typeof lireDettesV2_==='function'?lireDettesV2_():lireTable_('Dettes');
  dettes.forEach(d=>{
    const ids=typeof idsOperationsRapprocheesDetteV2_==='function'?idsOperationsRapprocheesDetteV2_(d):[];
    ids.forEach(id=>{
      if(idsComptes.has(id))return;
      const op=parId.get(String(id));
      if(!op)return;
      idsComptes.add(id);compter(op,'dettes');
    });
  });
  const mois=[];
  for(let i=11;i>=0;i--){
    const d=new Date(today.getFullYear(),today.getMonth()-i,1,12);
    const key=Utilities.formatDate(d,zone,'yyyy-MM');
    const p=montantParMois[key]||{credits:0,dettes:0};
    mois.push({mois:key,credits:arr(p.credits),dettes:arr(p.dettes),total:arr(p.credits+p.dettes)});
  }
  return {ok:true,version:'2026-10-14.1',lectureSeule:true,reference:aujourdhui,mois,
    couverture:'operations rapprochees uniquement; les dettes marquees payees sans operation rapprochee sont absentes du graphique'};
}
