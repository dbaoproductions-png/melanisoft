/**
 * Vue patrimoniale estimee commune. Ne remplace ni les capitaux contractuels
 * ni la tresorerie. Une dette soldee reste dans le detail historique, mais 0
 * dans le passif courant. Une seule production par revision globale.
 */
function construireSituationPatrimonialeEstimeeBudgetSoft20261014_(credits,patrimoine,simulation){
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const source=credits||{},pat=patrimoine||{},sim=simulation||{};
  const parId=new Map((sim.credits||[]).map(x=>[String(x.credit_id||''),x]));
  const lignes=(source.amortissables||[]).concat(source.renouvelables||[]).map(c=>{
    const estime=parId.get(String(c.id||''));
    const enregistre=arr(Math.max(0,Number(c.capital_restant||0)));
    const utilisable=!!(estime&&estime.capital_simule_apres!=null&&estime.confiance!=='conflit');
    return {id:String(c.id||''),nom:String(c.nom||''),type:String(c.type_credit||''),
      capitalReference:enregistre,capitalEstime:utilisable?arr(Math.max(0,Number(estime.capital_simule_apres))):enregistre,
      estimationDisponible:utilisable,operationsPrisesEnCompte:utilisable?Number(estime.operations_a_rattraper||0):0,
      methode:'simulation_amortissement',confiance:utilisable?String(estime.confiance||''):'reference_conservee'};
  });
  const dettes=(source.dettes||[]).map(d=>{
    const restant=arr(Math.max(0,Number(d.capital_restant||0)));
    const soldee=restant<=0||String(d.actif).toLowerCase()==='false';
    return {id:String(d.id||''),nom:String(d.nom||''),capitalInitial:arr(Math.max(0,Number(d.montant_initial||0))),
      resteAPayer:soldee?0:restant,soldee,statut:String(d.statut||'')};
  });
  const capitalCreditsEstime=arr(lignes.reduce((s,l)=>s+l.capitalEstime,0));
  const dettesHorsCredit=arr(dettes.reduce((s,l)=>s+l.resteAPayer,0));
  const endettementTotalEstime=arr(capitalCreditsEstime+dettesHorsCredit);
  const actifs=arr(pat.totalActifs||0);
  return {ok:true,version:'2026-10-14.1',doctrine:'valeurs estimees; capitaux de reference non modifies',
    dateReference:Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd'),
    capitalCreditsEnregistre:arr(source.capitalCredits||0),capitalCreditsEstime,
    dettesHorsCredit,endettementTotalEstime,totalActifs:actifs,
    patrimoineNetEstime:arr(actifs-endettementTotalEstime),
    ecartDetteDepuisReference:arr(endettementTotalEstime-Number(source.endettementTotal||0)),
    credits:lignes,dettes,
    controles:{creditsCouverts:lignes.length,creditsEstimes:lignes.filter(l=>l.estimationDisponible).length,
      dettesSoldees:dettes.filter(d=>d.soldee).length,
      sommeCredits:arr(lignes.reduce((s,l)=>s+l.capitalEstime,0)),
      sommeDettes:arr(dettes.reduce((s,l)=>s+l.resteAPayer,0))}};
}
function auditerSituationPatrimonialeEstimeeBudgetSoft20261014(){
  const s=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
  const p=s&&s.modules&&s.modules.situationPatrimonialeEstimee;
  const c=s&&s.modules&&s.modules.credits;
  const pat=s&&s.modules&&s.modules.patrimoine;
  const a=s&&s.modules&&s.modules.analyses;
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const r={ok:!!(p&&p.ok&&c&&pat&&a),lectureSeule:true,revisionBudgetSoft:String(s&&s.revisionBudgetSoft||''),
    disponible:!!p,creditsInclus:p&&p.controles&&p.controles.creditsCouverts,
    dettesSoldees:p&&p.controles&&p.controles.dettesSoldees,
    totalDetteEstime:p&&p.endettementTotalEstime,patrimoineNetEstime:p&&p.patrimoineNetEstime,
    egaliteCredit:!!(p&&c&&arr(c.situationPatrimonialeEstimee&&c.situationPatrimonialeEstimee.endettementTotalEstime)===arr(p.endettementTotalEstime)),
    egalitePatrimoine:!!(p&&pat&&arr(pat.situationPatrimonialeEstimee&&pat.situationPatrimonialeEstimee.endettementTotalEstime)===arr(p.endettementTotalEstime)),
    egaliteAnalyses:!!(p&&a&&arr(a.situationPatrimonialeEstimee&&a.situationPatrimonialeEstimee.endettementTotalEstime)===arr(p.endettementTotalEstime))};
  console.log('[AUDIT SITUATION PATRIMONIALE ESTIMEE 20261014] '+JSON.stringify(r));
  return r;
}

function chargerSituationPatrimonialeEstimeeBudgetSoft20261014(){
  const e=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
  const m=e&&e.modules&&e.modules.situationPatrimonialeEstimee;
  if(!m||m.ok!==true)return {ok:false,erreur:'Situation patrimoniale estimee indisponible dans le snapshot global.'};
  return {ok:true,revisionBudgetSoft:String(e.revisionBudgetSoft||''),
    dateReference:m.dateReference,totalActifs:m.totalActifs,
    capitalCreditsEstime:m.capitalCreditsEstime,
    dettesHorsCredit:m.dettesHorsCredit,
    endettementTotalEstime:m.endettementTotalEstime,
    patrimoineNetEstime:m.patrimoineNetEstime};
}
