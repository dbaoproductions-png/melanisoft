const AUDIT_COHERENCE_FINAL_19082026_VERSION = '2026-08-20.5';

/**
 * Contrôle transversal non destructif des chiffres critiques de BudgetSoft.
 * Le sens du flux est porté par Operations.type ; la nature économique est portée par Categories.type.
 */
function auditerCoherenceFinale19082026() {
  verifierInitialisation_();
  const dashboard = chargerDashboardReelV2();
  const analyses = chargerAnalysesBudgetairesV23(6);
  const credits = chargerCreditsEtDettesV2();

  const courantD = dashboard && dashboard.courtTerme ? dashboard.courtTerme : {};
  const courantA = analyses && analyses.courante ? analyses.courante : {};
  const suivant = dashboard && dashboard.cycleSuivant ? dashboard.cycleSuivant : {};
  const arr = n => Math.round(Number(n || 0) * 100) / 100;
  const jourLocal = v => { const d = new Date(v); return isNaN(d) ? null : d.getDate(); };
  const ecartCycleCourant = arr(Number(courantA.solde || 0) - Number(courantD.epargne || 0));
  const margeRecalculee = suivant.salaireAttendu == null ? null : arr(Number(suivant.salaireAttendu || 0) - Number(suivant.chargesFixes || 0) - Number(suivant.cbDifferees || 0));
  const ecartMarge = margeRecalculee == null ? null : arr(Number(suivant.marge || 0) - margeRecalculee);

  const renouvelables = (credits.renouvelables || []).map(c => ({nom:c.nom,encours:arr(c.capital_restant),coutRestant:arr(c.cout_restant),plafond:arr(c.plafond_credit),disponible:arr(c.disponible_credit),assurance:arr(c.assurance_mensuelle)}));
  const dettesActives = (credits.dettesActives || []).map(d => ({nom:d.nom,creancier:d.creancier,categorie:d.categorie_dette,restant:arr(d.capital_restant),statut:d.statut,sourceCle:d.source_cle}));
  const totalDettesAudit = arr(dettesActives.reduce((s,d)=>s+Number(d.restant||0),0));
  const totalEndettementRecalcule = arr(Number(credits.capitalCredits||0)+totalDettesAudit);

  const categoriesRef=lireTable_('Categories');
  const typesCategories=Object.fromEntries(categoriesRef.map(c=>[String(c.nom||'').trim(),String(c.type||'').toLowerCase()]));
  const natureCategorie=o=>typesCategories[String(o.categorie||'').trim()]||'';
  const estEconomique=o=>['revenu','depense'].includes(natureCategorie(o));
  const estTresorerie=o=>natureCategorie(o)==='tresorerie';
  const estAuto=o=>/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||''));

  const debutCycle=new Date(courantD.debut||courantA.debut),finCycle=new Date(courantD.fin||courantA.fin),refDashboard=new Date(courantD.dateReference||dashboard.referenceImport||finCycle),refAnalyse=new Date(analyses.dateReference||courantA.constateJusquAu||finCycle);
  if(!isNaN(debutCycle))debutCycle.setHours(0,0,0,0);if(!isNaN(finCycle))finCycle.setHours(23,59,59,999);if(!isNaN(refDashboard))refDashboard.setHours(23,59,59,999);if(!isNaN(refAnalyse))refAnalyse.setHours(23,59,59,999);

  const operationsDifferentielles=lireTable_('Operations').map(o=>{
    let enrichie=o;try{enrichie=typeof enrichirDepuisCommentaireBanque_==='function'?enrichirDepuisCommentaireBanque_(o):o;}catch(e){}
    const d=new Date(enrichie.date_comptable||enrichie.date),montantSigne=Number(enrichie.montant||0),montantAbs=Math.abs(montantSigne),nature=natureCategorie(enrichie),dansCycle=!isNaN(d)&&d>=debutCycle&&d<=finCycle;
    // Dashboard et Analyses doivent désormais utiliser exactement les mêmes flux économiques.
    const dashboardIncluse=dansCycle&&!estAuto(enrichie)&&d<=refDashboard&&montantAbs>0&&estEconomique(enrichie)&&((nature==='revenu'&&montantSigne>0)||(nature==='depense'&&montantSigne<0));
    const analyseIncluse=dansCycle&&d<=refAnalyse&&!estTresorerie(enrichie)&&estEconomique(enrichie)&&Number.isFinite(montantSigne)&&montantSigne!==0&&((nature==='revenu'&&montantSigne>0)||(nature==='depense'&&montantSigne<0));
    const contributionDashboard=dashboardIncluse?montantSigne:0,contributionAnalyse=analyseIncluse?montantSigne:0,delta=arr(contributionAnalyse-contributionDashboard);if(Math.abs(delta)<.005)return null;
    const raisons=[];if(dashboardIncluse&&!analyseIncluse){if(d>refAnalyse)raisons.push('postérieure à la date de référence Analyses');if(estTresorerie(enrichie))raisons.push('trésorerie');}if(!dashboardIncluse&&analyseIncluse){if(estAuto(enrichie))raisons.push('récurrence automatique exclue du Dashboard');if(d>refDashboard)raisons.push('postérieure à la date de référence Dashboard');}return{id:String(enrichie.id||''),date:isNaN(d)?null:d.toISOString(),libelle:String(enrichie.libelle_bancaire||enrichie.libelle||''),montant:montantSigne,type:String(enrichie.type||''),natureCategorie:nature,categorie:String(enrichie.categorie||''),compte:String(enrichie.compte||''),dashboardIncluse,analyseIncluse,contributionDashboard:arr(contributionDashboard),contributionAnalyse:arr(contributionAnalyse),deltaAnalyseMoinsDashboard:delta,raisons};
  }).filter(Boolean).sort((a,b)=>new Date(a.date)-new Date(b.date));

  const sommeDiagnostic=arr(operationsDifferentielles.reduce((s,o)=>s+Number(o.deltaAnalyseMoinsDashboard||0),0)),clesDettes=new Set(dettesActives.map(d=>d.sourceCle));
  const controles={cycle28_27_dashboard:jourLocal(courantD.debut)===28&&jourLocal(courantD.fin)===27,cycle28_27_analyse:jourLocal(courantA.debut)===28&&jourLocal(courantA.fin)===27,dashboard_analyse_courant_identiques:Math.abs(ecartCycleCourant)<.01,marge_suivante_retombe:ecartMarge==null||Math.abs(ecartMarge)<.01,credits_7:(credits.amortissables||[]).length+(credits.renouvelables||[]).length===7,renouvelables_4:(credits.renouvelables||[]).length===4,champs_reserves_renseignes:renouvelables.every(c=>Number(c.plafond||0)>0),dettes_structurelles_3:clesDettes.has('conservatoire-studio-42-20')&&clesDettes.has('conservatoire-scolarite-400')&&clesDettes.has('dentiste-protheses-800'),dettes_hors_credit_1242_20:Math.abs(totalDettesAudit-1242.20)<.01,endettement_total_retombe:Math.abs(totalEndettementRecalcule-Number(credits.endettementTotal||0))<.01,capital_total_positif:Number(credits.endettementTotal||credits.capitalRestant||0)>0};
  const resultat={version:AUDIT_COHERENCE_FINAL_19082026_VERSION,ok:Object.values(controles).every(Boolean),controles,ecarts:{resultatCycleAnalyseMoinsDashboard:ecartCycleCourant,margeAfficheeMoinsMargeRecalculee:ecartMarge,sommeOperationsDifferentielles:sommeDiagnostic,diagnosticRetombe:Math.abs(sommeDiagnostic-ecartCycleCourant)<.01,endettementAfficheMoinsRecalcule:arr(Number(credits.endettementTotal||0)-totalEndettementRecalcule)},diagnosticDashboardAnalyses:{dateReferenceDashboard:isNaN(refDashboard)?null:refDashboard.toISOString(),dateReferenceAnalyses:isNaN(refAnalyse)?null:refAnalyse.toISOString(),nombreOperationsDifferentielles:operationsDifferentielles.length,operations:operationsDifferentielles},dashboard:{cycleCourant:{debut:courantD.debut,fin:courantD.fin,dateReference:courantD.dateReference,resultat:courantD.epargne},cycleSuivant:{debut:suivant.debut,fin:suivant.fin,salaireAttendu:suivant.salaireAttendu,cbDifferees:suivant.cbDifferees,chargesFixes:suivant.chargesFixes,nombreCharges:suivant.nombreCharges,marge:suivant.marge},detailFixesSuivants:suivant.detailFixes||[]},analyses:{version:analyses.version,dateReference:analyses.dateReference,resultatCourant:courantA.solde,revenusCourants:courantA.revenus,depensesCourantes:courantA.depenses},credits:{version:credits.version,capitalCredits:arr(credits.capitalCredits),dettesHorsCredit:arr(credits.dettesHorsCredit),endettementTotal:arr(credits.endettementTotal),coutRestantTotal:arr(credits.coutRestant),encoursRenouvelable:arr(credits.capitalRenouvelable),coutRenouvelable:arr(credits.coutRenouvelable),dettes:dettesActives,renouvelables}};
  console.log(JSON.stringify(resultat,null,2));return resultat;
}
