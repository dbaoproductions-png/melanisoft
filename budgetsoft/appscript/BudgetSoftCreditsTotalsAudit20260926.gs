const BUDGETSOFT_CREDITS_TOTALS_AUDIT_20260926_VERSION='2026-09-26.1';

function arrCreditsTotals20260926_(n){return Math.round((Number(n)||0)*100)/100;}
function sommeCreditsTotals20260926_(xs,champ){return arrCreditsTotals20260926_((xs||[]).reduce((s,x)=>s+Math.max(0,Number(x&&x[champ]||0)),0));}

function auditerTotauxEtDisponiblesCredits20260926(){
  const frais=typeof construireCreditsEtDettesV2_==='function'?construireCreditsEtDettesV2_():null;
  const snap=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'?lireModuleSnapshotGlobalBudgetSoft20260906_('credits'):null;
  const credits=Array.isArray(frais&&frais.lignes)?frais.lignes.filter(x=>String(x&&x.table||'')==='Credits'):[];
  const amort=credits.filter(c=>String(c&&c.type_credit||'')!=='revolving');
  const rev=credits.filter(c=>String(c&&c.type_credit||'')==='revolving');
  const dettes=Array.isArray(frais&&frais.dettesActives)?frais.dettesActives:[];

  const calc={
    amortissables:{
      capital:sommeCreditsTotals20260926_(amort,'capital_restant'),
      mensualites:sommeCreditsTotals20260926_(amort,'mensualite'),
      cout:sommeCreditsTotals20260926_(amort,'cout_restant'),
      echeances:Math.round(amort.reduce((s,c)=>s+Math.max(0,Number(c&&c.echeances_restantes||0)),0))
    },
    renouvelables:{
      capital:sommeCreditsTotals20260926_(rev,'capital_restant'),
      mensualites:sommeCreditsTotals20260926_(rev,'mensualite'),
      cout:sommeCreditsTotals20260926_(rev,'cout_restant'),
      plafond:sommeCreditsTotals20260926_(rev,'plafond_credit'),
      disponible:sommeCreditsTotals20260926_(rev,'disponible_credit'),
      assurance:sommeCreditsTotals20260926_(rev,'assurance_mensuelle')
    },
    dettes:{
      restant:sommeCreditsTotals20260926_(dettes,'capital_restant'),
      mensualites:sommeCreditsTotals20260926_(dettes,'mensualite')
    }
  };

  let journal=[];
  try{journal=typeof lireJournalAmortissementsCredits20260915_==='function'?lireJournalAmortissementsCredits20260915_():[];}catch(e){journal=[];}
  const journalRev=(journal||[]).filter(x=>String(x&&x.statut||'')==='applique'&&rev.some(c=>String(c.id||'')===String(x.credit_id||'')));
  const parCredit=rev.map(c=>{
    const id=String(c.id||''),lignes=journalRev.filter(x=>String(x.credit_id||'')===id);
    const tracees=lignes.filter(x=>x.disponible_avant!==''&&x.disponible_avant!=null&&x.disponible_apres!==''&&x.disponible_apres!=null);
    const dernier=tracees.length?tracees[tracees.length-1]:null;
    const attenduDernier=dernier?arrCreditsTotals20260926_(dernier.disponible_apres):null;
    const actuel=arrCreditsTotals20260926_(c.disponible_credit);
    return{
      id:id,nom:String(c.nom||''),encours:arrCreditsTotals20260926_(c.capital_restant),
      plafond:arrCreditsTotals20260926_(c.plafond_credit),disponible:actuel,
      operationsAmorties:lignes.length,operationsAvecTraceDisponible:tracees.length,
      dernierDisponibleApres:attenduDernier,
      derniereOperationId:dernier?String(dernier.operation_id||''):'',
      coherentDerniereTrace:dernier?Math.abs(actuel-attenduDernier)<=.01:true
    };
  });

  const controles={
    amortCapital:Math.abs(calc.amortissables.capital-Number(frais&&frais.capitalAmortissable||0))<=.01,
    amortMensualites:Math.abs(calc.amortissables.mensualites-Number(frais&&frais.mensualitesAmortissables||0))<=.01,
    amortCout:Math.abs(calc.amortissables.cout-Number(frais&&frais.coutAmortissable||0))<=.01,
    revCapital:Math.abs(calc.renouvelables.capital-Number(frais&&frais.capitalRenouvelable||0))<=.01,
    revMensualites:Math.abs(calc.renouvelables.mensualites-Number(frais&&frais.mensualitesRenouvelables||0))<=.01,
    revCout:Math.abs(calc.renouvelables.cout-Number(frais&&frais.coutRenouvelable||0))<=.01,
    revPlafond:Math.abs(calc.renouvelables.plafond-Number(frais&&frais.plafondRenouvelable||0))<=.01,
    revDisponible:Math.abs(calc.renouvelables.disponible-Number(frais&&frais.disponibleRenouvelable||0))<=.01,
    revAssurance:Math.abs(calc.renouvelables.assurance-Number(frais&&frais.assuranceRenouvelable||0))<=.01,
    dettesRestant:Math.abs(calc.dettes.restant-Number(frais&&frais.dettesHorsCredit||0))<=.01,
    dettesMensualites:Math.abs(calc.dettes.mensualites-Number(frais&&frais.mensualitesDettes||0))<=.01,
    sommeIndividuelsDisponible:Math.abs(calc.renouvelables.disponible-parCredit.reduce((s,x)=>s+x.disponible,0))<=.01,
    tracesDisponiblesCoherentes:parCredit.every(x=>x.coherentDerniereTrace),
    snapshotPresent:!!snap
  };

  if(snap){
    controles.snapshotDisponibleRenouvelable=Math.abs(Number(snap.disponibleRenouvelable||0)-calc.renouvelables.disponible)<=.01;
    controles.snapshotCapitalRenouvelable=Math.abs(Number(snap.capitalRenouvelable||0)-calc.renouvelables.capital)<=.01;
  }

  const out={
    ok:Object.keys(controles).every(k=>controles[k]===true),
    version:BUDGETSOFT_CREDITS_TOTALS_AUDIT_20260926_VERSION,
    lectureSeule:true,
    revisionBudgetSoft:String(snap&&snap.revisionBudgetSoft||''),
    totauxCalcules:calc,
    totauxPublies:frais?{
      capitalAmortissable:Number(frais.capitalAmortissable||0),
      mensualitesAmortissables:Number(frais.mensualitesAmortissables||0),
      coutAmortissable:Number(frais.coutAmortissable||0),
      capitalRenouvelable:Number(frais.capitalRenouvelable||0),
      mensualitesRenouvelables:Number(frais.mensualitesRenouvelables||0),
      coutRenouvelable:Number(frais.coutRenouvelable||0),
      plafondRenouvelable:Number(frais.plafondRenouvelable||0),
      disponibleRenouvelable:Number(frais.disponibleRenouvelable||0),
      assuranceRenouvelable:Number(frais.assuranceRenouvelable||0),
      dettesHorsCredit:Number(frais.dettesHorsCredit||0),
      mensualitesDettes:Number(frais.mensualitesDettes||0)
    }:null,
    revolving:parCredit,
    journal:{nombreOperationsRevolving:journalRev.length,nombreAvecTraceDisponible:journalRev.filter(x=>x.disponible_apres!==''&&x.disponible_apres!=null).length},
    controles:controles,
    doctrine:'Chaque remboursement de revolving validé via le rapprochement de sa charge fixe diminue l’encours du capital remboursé et augmente le disponible du même montant, plafonné au plafond de réserve. Le total disponible publié est la somme exacte des disponibles individuels.'
  };
  console.log('[AUDIT TOTAUX ET DISPONIBLES CREDITS 20260926] '+JSON.stringify(out));
  return out;
}
