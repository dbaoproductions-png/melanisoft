const CONSEILLER_VERSION = '1.7-snapshot-2026-09-21';

function construireConseillerFinancierSource20260921_(ctx) {
  ctx=ctx||{};
  const analyse=ctx.analyse||{};
  const creditsModule=ctx.credits||{};
  const objectifs=Array.isArray(ctx.objectifs)?ctx.objectifs:[];
  const charges=(Array.isArray(ctx.charges)?ctx.charges:[]).filter(c=>convertirBooleen_(c.actif));

  const capitalRestant=Math.max(0,Number(creditsModule.capitalRestant!=null?creditsModule.capitalRestant:creditsModule.endettementTotal||0));
  const mensualites=Math.max(0,Number(creditsModule.mensualites||0));
  const chargesMensuelles=charges.reduce((s,c)=>s+equivalentMensuelConseiller_(c),0);
  const indicateurs=analyse&&analyse.indicateurs||{};
  const revenusMoyens=Number(indicateurs.revenusMoyens||0);
  const depensesMoyennes=Number(indicateurs.depensesMoyennes||0);
  const epargneMoyenne=revenusMoyens-depensesMoyennes;
  const tauxEndettement=revenusMoyens>0?Math.round((mensualites/revenusMoyens)*1000)/10:0;
  const poidsChargesFixes=revenusMoyens>0?Math.round((chargesMensuelles/revenusMoyens)*1000)/10:0;
  const recommandations=construireRecommandationsConseiller_({analyse,objectifs,revenusMoyens,depensesMoyennes,epargneMoyenne,tauxEndettement,poidsChargesFixes,capitalRestant});
  const score=calculerScoreConseiller_({analyse,revenusMoyens,epargneMoyenne,tauxEndettement,poidsChargesFixes});
  return{
    ok:true,
    version:CONSEILLER_VERSION,
    score,
    niveau:score>=75?'Solide':score>=55?'À consolider':score>=35?'Fragile':'Prioritaire',
    synthese:syntheseConseiller_(score,epargneMoyenne,indicateurs.evolutionDepenses),
    indicateurs:{revenusMoyens,depensesMoyennes,epargneMoyenne,tauxEndettement,poidsChargesFixes,capitalRestant},
    recommandations,
    categories:(analyse.categories||[]).slice(0,6),
    alertesBudget:(analyse.alertes||[]).slice(0,5),
    objectifsActifs:objectifs.filter(o=>String(o.statut||'').toLowerCase()!=='terminé').length,
    confidentialite:'Diagnostic calculé uniquement dans votre classeur Google Sheets. Aucune donnée bancaire n’est transmise à un service externe.',
    sourceBudgetSoft:'constructeur_snapshot'
  };
}

function chargerConseillerFinancier() {
  const global=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'?lireModuleSnapshotGlobalBudgetSoft20260906_('conseiller'):null;
  if(global)return global;
  return{ok:false,version:CONSEILLER_VERSION,sourceBudgetSoft:'snapshot_global_indisponible',erreur:'Conseiller absent du snapshot global.'};
}

function simulerEconomiesConseiller(pourcentage) {
  const donnees = chargerConseillerFinancier();
  const taux = Math.max(1, Math.min(50, Number(pourcentage || 10)));
  const variables = donnees.categories.filter(c => !/logement|crédit|impôt|assurance/i.test(String(c.nom)));
  const base = variables.reduce((s, c) => s + Number(c.montant || 0), 0);
  const economie = base * taux / 100;
  return {
    pourcentage: taux,
    baseVariable: base,
    economieMensuelle: economie,
    economieAnnuelle: economie * 12,
    nouvelleEpargne: donnees.indicateurs.epargneMoyenne + economie,
    categories: variables
  };
}

function equivalentMensuelConseiller_(charge) {
  const montant = Math.abs(Number(charge.montant || 0));
  const frequence = String(charge.frequence || 'Mensuelle').toLowerCase();
  if (frequence.indexOf('quotid') >= 0) return montant * 30.4;
  if (frequence.indexOf('hebdo') >= 0) return montant * 52 / 12;
  if (frequence.indexOf('trimes') >= 0) return montant / 3;
  if (frequence.indexOf('semes') >= 0) return montant / 6;
  if (frequence.indexOf('ann') >= 0) return montant / 12;
  return montant;
}

function calculerScoreConseiller_(d) {
  let score = 50;
  if (d.revenusMoyens > 0) {
    const tauxEpargne = d.epargneMoyenne / d.revenusMoyens * 100;
    score += Math.max(-25, Math.min(25, tauxEpargne));
  } else score -= 20;
  if (d.tauxEndettement > 35) score -= Math.min(25, (d.tauxEndettement - 35) * 1.5);
  else if (d.tauxEndettement > 0 && d.tauxEndettement <= 25) score += 8;
  if (d.poidsChargesFixes > 70) score -= 15;
  else if (d.poidsChargesFixes < 50) score += 5;
  score -= Math.min(15, (d.analyse.alertes || []).length * 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function construireRecommandationsConseiller_(d) {
  const liste = [];
  if (d.revenusMoyens <= 0) liste.push({ priorite: 'haute', titre: 'Compléter les revenus', texte: 'Les revenus disponibles ne permettent pas encore un diagnostic fiable. Vérifiez la catégorisation des salaires et autres entrées.' });
  if (d.epargneMoyenne < 0) liste.push({ priorite: 'haute', titre: 'Rétablir un solde positif', texte: 'Les dépenses moyennes dépassent les revenus. Commencez par réduire les dépenses variables et vérifier les charges fixes.' });
  else if (d.revenusMoyens > 0 && d.epargneMoyenne / d.revenusMoyens < 0.1) liste.push({ priorite: 'moyenne', titre: 'Créer une marge de sécurité', texte: 'L’épargne moyenne est inférieure à 10 % des revenus. Une réduction progressive des dépenses variables renforcerait le budget.' });
  else liste.push({ priorite: 'basse', titre: 'Préserver la capacité d’épargne', texte: 'La période moyenne dégage une marge positive. Affectez-en une partie aux objectifs prioritaires et à l’épargne de précaution.' });
  if (d.tauxEndettement > 35) liste.push({ priorite: 'haute', titre: 'Surveiller l’endettement', texte: 'Les mensualités représentent plus de 35 % des revenus moyens. Évitez une nouvelle échéance et étudiez en priorité les crédits les plus coûteux.' });
  if (d.poidsChargesFixes > 65) liste.push({ priorite: 'moyenne', titre: 'Alléger les charges fixes', texte: 'Les charges récurrentes absorbent une part importante des revenus. Passez en revue assurances, télécoms et abonnements.' });
  (d.analyse.alertes || []).slice(0, 3).forEach(a => liste.push({ priorite: 'moyenne', titre: 'Enveloppe dépassée : ' + a.poste, texte: 'Le réalisé dépasse le prévu de ' + Math.round(Math.abs(a.ecart)) + ' €. Ajustez l’enveloppe ou la dépense sur la prochaine période.' }));
  if (d.objectifs.length && d.epargneMoyenne > 0) liste.push({ priorite: 'basse', titre: 'Automatiser les projets', texte: 'Programmez un virement vers l’objectif prioritaire juste après le salaire, dans la limite de la marge moyenne disponible.' });
  return liste.slice(0, 7);
}

function syntheseConseiller_(score, epargne, evolution) {
  const tendance = evolution > 5 ? 'Les dépenses progressent sensiblement.' : evolution < -5 ? 'Les dépenses sont orientées à la baisse.' : 'Les dépenses restent globalement stables.';
  const marge = epargne >= 0 ? 'La période moyenne reste positive.' : 'La période moyenne est déficitaire.';
  return marge + ' ' + tendance + ' Indice de situation : ' + score + '/100.';
}
