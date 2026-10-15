/**
 * Trajectoire de dette estimée ancrée sur l'unique propriétaire patrimonial.
 * Reconstruction rétrograde prudente : seulement les amortissements simulés
 * après la dernière date de référence des crédits, sans extrapolation ancienne.
 * Les dettes hors crédit sont restituées à leur niveau actuel car l'historique
 * de leurs créations/variations n'est pas exhaustif.
 */
function chargerCourbeDetteEstimeeBudgetSoft20261015(){
  const e=lireEtatGlobalBudgetSoftSiDisponible20260906_();
  const m=e&&e.modules&&e.modules.situationPatrimonialeEstimee;
  if(!m||m.ok!==true)return{ok:false,erreur:'Situation patrimoniale commune indisponible'};
  const sim=simulerRattrapageAmortissementsCredits20260915();
  const date=String(m.dateReference||'').slice(0,10);
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const bases=(sim.credits||[]).map(c=>String(c.date_reference||'')).filter(Boolean);
  if(bases.length!==(m.credits||[]).length)return{ok:false,erreur:'Dates de référence des crédits incomplètes'};
  const debut=bases.reduce((a,b)=>a>b?a:b,'');
  const moisCourant=date.slice(0,7);
  const paiements=[];
  (sim.credits||[]).forEach(c=>(c.operations||[]).forEach(o=>{
    const d=String(o.date||'').slice(0,10),capital=Number(o.part_capital);
    if(d>debut&&d<=date&&Number.isFinite(capital)&&capital>=0)
      paiements.push({date:d,mois:d.slice(0,7),credit:String(c.credit||''),capital:arr(capital)});
  }));
  const dernierMoisAvant=new Date(Number(moisCourant.slice(0,4)),Number(moisCourant.slice(5,7))-1,0,12);
  const finPrecedente=Utilities.formatDate(dernierMoisAvant,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const valeurs=[];
  // Une période est démontrable seulement si elle est postérieure à TOUTES
  // les références crédit : aucun historique antérieur n'est inventé.
  if(finPrecedente>=debut){
    const amortApres=paiements.filter(o=>o.date>finPrecedente).reduce((s,o)=>s+o.capital,0);
    const creditAvant=arr(Number(m.capitalCreditsEstime)+amortApres);
    valeurs.push({date:finPrecedente,mois:finPrecedente.slice(0,7),
      creditEstime:creditAvant,detteHorsCredit:null,detteTotale:null,
      type:'capital_credits_reconstitue',amortissementDepuis:Number(arr(amortApres))});
  }
  valeurs.push({date,mois:moisCourant,creditEstime:arr(m.capitalCreditsEstime),
    detteHorsCredit:arr(m.dettesHorsCredit),detteTotale:arr(m.endettementTotalEstime),
    type:'snapshot_canonique',amortissementDepuis:0});
  const r={ok:true,version:'2026-10-15.1',lectureSeule:true,revisionBudgetSoft:String(e.revisionBudgetSoft||''),
    dateReference:date,debutPreuveCredits:debut,valeurs,
    nombreAmortissementsPrisEnCompte:paiements.length,
    detteActuelle:arr(m.endettementTotalEstime),creditActuel:arr(m.capitalCreditsEstime),
    avertissement:'Historique complet de la dette hors crédit indisponible; la série totale ne comporte que les points vérifiables. Le capital crédit antérieur est une rétro-estimation fondée uniquement sur les amortissements simulés.'};
  return r;
}
function auditerCourbeDetteEstimeeBudgetSoft20261015(){
  const r=chargerCourbeDetteEstimeeBudgetSoft20261015();
  const fin=r&&r.valeurs&&r.valeurs[r.valeurs.length-1];
  const out={ok:!!(r&&r.ok&&fin&&Math.abs(fin.detteTotale-r.detteActuelle)<.01),
    lectureSeule:true,revisionBudgetSoft:r&&r.revisionBudgetSoft||'',points:r&&r.valeurs||[],
    nombreAmortissements:r&&r.nombreAmortissementsPrisEnCompte||0,
    erreur:r&&r.erreur||'',avertissement:r&&r.avertissement||''};
  console.log('[AUDIT COURBE DETTE ESTIMEE 20261015] '+JSON.stringify(out));
  return out;
}
