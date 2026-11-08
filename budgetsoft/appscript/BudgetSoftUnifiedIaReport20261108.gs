/**
 * Export IA consolidé, léger, fondé uniquement sur les modules de synthèse
 * déjà calculés par BudgetSoft. Ne réactive pas l'ancien export lourd isolé.
 * Le contexte est privé (propriété du document) et peut être remplacé par
 * le texte courant fourni depuis l'interface pour un export non sauvegardé.
 */
const BUDGETSOFT_IA_UNIFIEE_VERSION_20261108='2026-11-08.1';
function genererRapportIaConsolideBudgetSoft20261108(options){
  options=options||{};
  const val=typeof options.contexte==='string'?options.contexte:
    lireContexteIaBudgetSoft20261108().texte;
  if(Utilities.newBlob(val,'text/plain').getBytes().length>7800)
    throw new Error('Le texte de contexte dépasse la limite autorisée (7 800 octets).');
  const analyses={};
  [3,6,12].forEach(n=>{
    const r=chargerAnalysesBudgetairesV23(n);
    if(!r||!Array.isArray(r.periodes)||r.periodes.length!==n)
      throw new Error('Analyses '+n+' cycles indisponibles ; export annulé pour éviter des chiffres incomplets.');
    analyses[n]=r;
  });
  const rev=String(analyses[3].revisionBudgetSoft||'');
  if(!rev||[6,12].some(n=>String(analyses[n].revisionBudgetSoft||'')!==rev))
    throw new Error('Révisions Analyses incohérentes : actualise BudgetSoft avant l’export.');
  const conseiller=typeof chargerConseillerFinancier==='function'?chargerConseillerFinancier():null;
  const nums=x=>Number.isFinite(Number(x))?Number(x):0;
  const entier=x=>Math.round(nums(x)*100)/100;
  const euro=x=>entier(x).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const esc=x=>String(x||'').replace(/\r/g,'').trim();
  const lignes=[
    '# BudgetSoft — dossier pour analyse par IA',
    '',
    'Document préparatoire ; les chiffres proviennent du snapshot BudgetSoft '+rev+'.',
    'Date de génération : '+new Date().toISOString()+'.',
    '',
    '## Contexte personnel et contraintes du foyer',
    '',
    esc(val)||'[Contexte non renseigné — compléter dans l’onglet IA.]',
    '',
    '## Consignes d’analyse',
    '',
    '- Distinguer observations vérifiées, hypothèses et projections.',
    '- Ne pas assimiler mouvements de trésorerie, remboursements et emprunts à des revenus économiques.',
    '- Les cycles budgétaires vont du 28 au 27 ; les moyennes privilégient les cycles terminés.',
    '- Les dépenses Pluxee sont intégrées à Courses / Restaurants sans dupliquer les débits de banque.',
    '- Ne pas inventer de données absentes (pension, santé, droits sociaux, échéanciers ou historiques de dettes).',
    '- Comparer les décisions à court terme, jusqu’à la retraite et après celle-ci ; préserver une marge de sécurité.',
    '',
    '## Indicateurs BudgetSoft',
    ''
  ];
  const syntheses={};
  [3,6,12].forEach(n=>{
    const d=analyses[n];
    const peri=d.periodes||[];
    const cl=peri.filter(p=>p.periodeComplete!==false).length;
    const revenus=entier(peri.reduce((s,p)=>s+nums(p.revenus),0));
    const depenses=entier(peri.reduce((s,p)=>s+nums(p.depenses),0));
    const solde=entier(revenus-depenses);
    const moyenne=d.indicateurs||{};
    const courant=d.courante||{};
    const aliment=d.depensesDetail&&d.depensesDetail.fenetres&&d.depensesDetail.fenetres[String(n)]&&
      d.depensesDetail.fenetres[String(n)].alimentation||{};
    syntheses[n]={cycles:n,cyclesComplets:cl,revenus,depenses,solde,
      revenuMoyenCycleComplet:entier(moyenne.revenusMoyens),
      depenseMoyenneCycleComplet:entier(moyenne.depensesMoyennes),
      coursesAvecPluxee:entier(aliment.coursesReelles),restaurantsAvecPluxee:entier(aliment.restaurantsReels),
      dateReference:d.dateReference||null,
      cycleCourant:{debut:courant.debut||'',fin:courant.fin||'',complet:courant.periodeComplete===true}};
    lignes.push('### '+n+' cycles ('+cl+' terminés)');
    lignes.push('- Revenus économiques : '+euro(revenus)+'.');
    lignes.push('- Dépenses économiques : '+euro(depenses)+'.');
    lignes.push('- Solde économique : '+euro(solde)+'.');
    lignes.push('- Moyennes par cycle complet : revenus '+euro(moyenne.revenusMoyens)+
      ', dépenses '+euro(moyenne.depensesMoyennes)+'.');
    lignes.push('- Consommation alimentaire (fenêtre, inclut Pluxee) : Courses '+
      euro(aliment.coursesReelles)+', Restaurants '+euro(aliment.restaurantsReels)+'.');
    lignes.push('');
  });
  if(conseiller&&conseiller.ok){
    const c=conseiller.indicateurs||{};
    lignes.push('### Diagnostic Conseiller IA (snapshot)');
    lignes.push('- Score indicatif : '+nums(conseiller.score)+'/100 — '+esc(conseiller.niveau)+'.');
    lignes.push('- Capital restant des financements suivis : '+euro(c.capitalRestant)+'.');
    lignes.push('- Mensualités suivies : '+euro(c.mensualites||0)+'.');
    lignes.push('- Taux d’endettement calculé : '+nums(c.tauxEndettement)+' % (selon le périmètre du module).');
    const conseils=(conseiller.recommandations||[]).slice(0,7);
    conseils.forEach(x=>lignes.push('- '+esc(x.titre)+' : '+esc(x.texte)));
    lignes.push('');
  }else{
    lignes.push('### Conseiller IA\nDiagnostic non disponible dans le snapshot ; ne pas inférer les chiffres manquants.\n');
  }
  lignes.push('## Question pour l’IA', '',
    'À partir de ce contexte et des indicateurs, proposer des pistes budgétaires hiérarchisées,',
    'avec avantages, risques, coûts et informations manquantes, sans décider à la place du foyer.');
  const markdown=lignes.join('\n');
  const data={version:BUDGETSOFT_IA_UNIFIEE_VERSION_20261108,
    genereLe:new Date().toISOString(),revisionBudgetSoft:rev,
    contexte:val,doctrine:'Cycles 28→27 ; Pluxee séparé des flux bancaires ; historiques non prouvés non imputés à zéro.',
    indicateurs:syntheses,conseiller:conseiller&&conseiller.ok?{
      score:conseiller.score,niveau:conseiller.niveau,indicateurs:conseiller.indicateurs,
      recommandations:conseiller.recommandations}:null};
  const json=JSON.stringify(data,null,2);
  return{ok:true,version:BUDGETSOFT_IA_UNIFIEE_VERSION_20261108,
    revisionBudgetSoft:rev,markdown,json,
    statistiques:{tailleMarkdown:markdown.length,tailleJson:json.length,
      cycles:[3,6,12],contextePresent:!!esc(val)}};
}
