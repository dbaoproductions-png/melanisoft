/**
 * Rapport IA détaillé 2026-11-08 : sources canoniques d'une même révision.
 * Pas de recalcul lourd ni d'accès réseau. Ne journalise aucune donnée privée.
 * Les mouvements unitaires bancaires/Pluxee restent hors export.
 */
const BUDGETSOFT_RAPPORT_IA_DETAILLE_VERSION_20261108='2026-11-08.2';

function genererRapportIaDetailleBudgetSoft20261108(options){
  options=options||{};
  const contexte=typeof options.contexte==='string'?options.contexte:
    lireContexteIaBudgetSoft20261108().texte;
  if(Utilities.newBlob(contexte,'text/plain').getBytes().length>7800)
    throw new Error('Le contexte dépasse la limite de 7 800 octets.');

  // Lecture unique des synthèses canoniques déjà publiées ; aucun moteur de
  // reconstruction n'est appelé depuis cet export.
  const etat=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?
    lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
  if(!etat||etat.ok!==true||etat.publie!==true||!etat.revisionBudgetSoft)
    throw new Error('Snapshot BudgetSoft cohérent indisponible. Actualiser BudgetSoft avant de générer le rapport IA.');
  if(etat.snapshotPerime)
    throw new Error('Snapshot BudgetSoft périmé : actualiser les données avant de produire un dossier financier.');
  const m=etat.modules||{},rev=String(etat.revisionBudgetSoft);
  const mAnalyses=m.analyses&&m.analyses.variantes||{};
  if(![3,6,12].every(n=>mAnalyses[String(n)]&&
       Array.isArray(mAnalyses[String(n)].periodes)&&mAnalyses[String(n)].periodes.length===n))
    throw new Error('Les trois horizons 3/6/12 cycles ne sont pas tous disponibles dans la même révision.');
  const erreurs=(etat.erreurs||[]).map(x=>String(x&&x.erreur||''));
  const note=[];
  const missing=(v)=>v===null||v===undefined||v==='';
  const number=v=>missing(v)||!Number.isFinite(Number(v))?null:Math.round(Number(v)*100)/100;
  const str=v=>missing(v)?'':String(v).replace(/\r/g,'').trim();
  const short=v=>str(v).replace(/\s+/g,' ').slice(0,190);
  const money=v=>number(v)==null?'non disponible':number(v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const percentage=v=>number(v)==null?'non disponible':number(v).toLocaleString('fr-FR',{maximumFractionDigits:2})+' %';
  const printable=v=>missing(v)?'non renseigné':String(v);
  const npath=(o,k)=>o&&typeof o==='object'?number(o[k]):null;
  const path=(o,k)=>o&&typeof o==='object'&&o[k]!==undefined?o[k]:null;
  const sum=(xs,k)=>Math.round((xs||[]).reduce((s,x)=>s+(number(x&&x[k])||0),0)*100)/100;
  const currencies={
    frais:'€',mensualites:'€',revenus:'€',depenses:'€'
  };
  const md=['# BudgetSoft — dossier financier détaillé pour IA','','## 1. Provenance et règles de lecture',
    '- Révision BudgetSoft : '+rev,
    '- Snapshot généré le : '+printable(etat.genereLe),
    '- Rapport généré le : '+new Date().toISOString(),
    '- Unité : euros, arrondis au centime ; aucune dépense ni recette ne doit être inventée.',
    '- Tous les modules financiers ci-dessous proviennent de la même révision publiée, sauf le détail des charges fixes, relu séparément et identifié.',
    '- Flux économiques, soldes bancaires, crédit (capital/intérêts) et patrimoine : périmètres distincts, ne pas additionner sans justification.',
    '- Cycle budgétaire : du 28 au 27 ; cycle incomplet signalé, moyennes calculées sur les cycles complets lorsqu’ils existent.',
    '- Pluxee : registre séparé du compte bancaire ; dépenses intégrées aux catégories alimentaires sans compter les rechargements comme revenus.',
    '- Estimation de capital, coût du crédit et prévisions ne valent pas attestation contractuelle ; historique non prouvé = inconnu, jamais zéro.',
    '',
    '## 2. Contexte familial et contraintes',
    '',str(contexte)||'[Contexte non renseigné dans l’onglet IA.]','',
    '## 3. Périmètre des données'];
  const volumes=Object.assign({},m.sourceMeta&&m.sourceMeta.tables||{});
  const volumesAutorises=['Operations','Comptes','Categories','Budget','Charges_fixes','Credits','Dettes','Actifs','Pluxee','Parametres'];
  const tableCounts={};
  volumesAutorises.forEach(k=>{if(number(volumes[k])!=null){tableCounts[k]=number(volumes[k]);md.push('- '+k+' : '+tableCounts[k]+' lignes.');}});
  if(tableCounts.Budget===0)note.push('La table Budget est vide : aucun dépassement d’enveloppe chiffrée n’est vérifiable.');
  md.push('');

  const horizons={};
  md.push('## 4. Revenus, dépenses et soldes économiques par horizon','');
  [3,6,12].forEach(n=>{
    const a=mAnalyses[String(n)],p=a.periodes||[],ind=a.indicateurs||{};
    const r=a.recettes&&a.recettes.fenetres&&a.recettes.fenetres[String(n)]||{};
    const d=a.depensesDetail&&a.depensesDetail.fenetres&&a.depensesDetail.fenetres[String(n)]||{};
    const revenus=sum(p,'revenus'),depenses=sum(p,'depenses');
    const cycles=p.map(x=>({
      cle:str(x.cle),libelle:str(x.libelle),debut:str(x.debut),fin:str(x.fin),
      termine:x.periodeComplete===true,revenus:number(x.revenus),depenses:number(x.depenses),
      solde:number(x.solde),tauxEpargne:number(x.tauxEpargne),
      mouvementTresorerie:number(x.tresorerie),nombreOperations:number(x.operations)
    }));
    const categoriesCourantes=(a.categories||[]).map(x=>({
      categorie:short(x.nom),montant:number(x.montant),partPourcent:number(x.part)}));
    const recettes={
      total:number(r.revenusEconomiques),structurels:number(r.revenusStructurels),
      variables:number(r.revenusVariables),partVariablePourcent:number(r.partVariable),
      apportParProducteur:Object.keys(r.producteurs||{}).map(k=>({producteur:k,montant:number(r.producteurs[k])})),
      sources:(r.sources||[]).map(x=>({categorie:short(x.nom),montant:number(x.montant)})),
      injectionCreditsTresorerie:number(r.creditsTresorerie),
      cyclesAvecRecoursCredit:number(r.moisAvecSauvetage),
      ratioCreditSurRevenusPourcent:number(r.dependanceCredit),
      salaireMensuelReference:number(a.recettes&&a.recettes.references&&a.recettes.references.salairePatrick),
      references:a.recettes&&a.recettes.references||null
    };
    const depensesDetail={
      alimentation:d.alimentation||null,
      sante:d.sante||null,energie:d.energie||null,financement:d.financement||null,
      themes:(d.themes||[]).map(x=>({theme:short(x.nom),montant:number(x.montant)})),
      referentielChargesFixes:a.depensesDetail&&a.depensesDetail.fixes||null
    };
    const etude={
      nombreCycles:n,nombreCyclesComplets:cycles.filter(x=>x.termine).length,
      revenusEconomiques:revenus,depensesEconomiques:depenses,soldeEconomique:Math.round((revenus-depenses)*100)/100,
      moyennesParCycleComplet:{revenus:number(ind.revenusMoyens),depenses:number(ind.depensesMoyennes),
        resultat:number(ind.epargneMoyenne),tauxEpargnePourcent:number(ind.tauxEpargneMoyen),
        mouvementTresorerie:number(ind.mouvementTresorerieMoyen),
        variationDepensesPourcent:number(ind.evolutionDepenses)},
      cycles,recettes,depensesDetail,categoriesCourantes,alertesEnveloppes:a.alertes||[],
      seriesHistoriques:a.seriesCourbes||null,
      dateReference:str(a.dateReference)
    };
    horizons[String(n)]=etude;
    md.push('### Horizon '+n+' cycles ('+etude.nombreCyclesComplets+' cycles terminés)',
      '- Revenus économiques : **'+money(revenus)+'**.',
      '- Dépenses économiques : **'+money(depenses)+'**.',
      '- Solde économique : **'+money(etude.soldeEconomique)+'**.',
      '- Moyenne par cycle complet : revenus '+money(ind.revenusMoyens)+
        ', dépenses '+money(ind.depensesMoyennes)+', solde '+money(ind.epargneMoyenne)+'.',
      '- Taux moyen d’épargne : '+percentage(ind.tauxEpargneMoyen)+' ; évolution des dépenses : '+percentage(ind.evolutionDepenses)+'.',
      '',
      '| Cycle (28 → 27) | État | Revenus | Dépenses | Solde | Mouvements |',
      '|---|---|---:|---:|---:|---:|');
    cycles.forEach(c=>md.push('| '+(c.libelle||c.cle||c.debut)+' | '+(c.termine?'complet':'incomplet')+
      ' | '+money(c.revenus)+' | '+money(c.depenses)+' | '+money(c.solde)+
      ' | '+(c.nombreOperations==null?'—':c.nombreOperations)+' |'));
    md.push('','#### Décomposition des revenus ('+n+' cycles)',
      '- Revenus structurels : '+money(recettes.structurels)+
      ' ; variables : '+money(recettes.variables)+' ('+percentage(recettes.partVariablePourcent)+').',
      '- Recours au crédit de trésorerie : '+money(recettes.injectionCreditsTresorerie)+
      ' ; cycles concernés : '+printable(recettes.cyclesAvecRecoursCredit)+'.');
    recettes.apportParProducteur.forEach(x=>md.push('- Producteur '+x.producteur+' : '+money(x.montant)+'.'));
    if(n===12&&recettes.references){
      md.push('- Dernier salaire de référence enregistré : '+money(recettes.references.salairePatrick)+
        ' ; loyer mensuel de référence paramétré : '+money(recettes.references.loyerAppartement)+
        ' ; garage de référence paramétré : '+money(recettes.references.garage)+'.');
    }
    md.push('','| Source de revenu | Montant |','|---|---:|');
    recettes.sources.forEach(x=>md.push('| '+x.categorie+' | '+money(x.montant)+' |'));
    md.push('','#### Alimentation, santé, énergie et financement ('+n+' cycles)');
    const aliments=d.alimentation||{},sante=d.sante||{},energie=d.energie||{},f=d.financement||{};
    [
      ['Courses bancaires',aliments.coursesBanque],['Courses Pluxee',aliments.pluxeeCourses],
      ['Restaurants bancaires',aliments.restaurantsBanque],['Restaurants Pluxee',aliments.pluxeeRestaurants],
      ['Courses réelles toutes sources',aliments.coursesReelles],
      ['Restaurants réels toutes sources',aliments.restaurantsReels],
      ['Pluxee à classer',aliments.pluxeeAClasser],
      ['Santé brute',sante.soinsEtCouvertureBruts],['Remboursements de santé',sante.remboursements],
      ['Santé nette',sante.coutNet],['Énergies brutes',energie.brut],
      ['Remboursements énergie',energie.remboursements],['Énergies nettes',energie.coutNet],
      ['Échéances et sorties financement',f.sortiesFinancement],
      ['Capital remboursé estimé',f.capitalRembourseEstime],
      ['Coût financement estimé',f.coutFinancementEstime],
      ['Réinjections de trésorerie',f.reinjectionsTresorerie],
      ['Désendettement net estimé',f.desendettementNetEstime]
    ].forEach(x=>{if(number(x[1])!=null)md.push('- '+x[0]+' : '+money(x[1])+'.');});
    if(n===12||n===3){
      md.push('','#### Dépenses par thème ('+n+' cycles)','| Thème | Montant |','|---|---:|');
      depensesDetail.themes.forEach(x=>md.push('| '+x.theme+' | '+money(x.montant)+' |'));
    }
    if(n===12&&etude.seriesHistoriques){
      const courbes=etude.seriesHistoriques,blocs=['revenus','chargesFixes','pilotable','dettes','capital'];
      const valCourbe=(nom,i)=>{
        const b=courbes[nom],tot=b&&Array.isArray(b.series)?b.series.find(x=>x.total===true)||b.series[0]:null;
        const value=tot&&Array.isArray(tot.valeurs)?tot.valeurs[i]:null;
        return value==null?'non prouvé':money(value);
      };
      const libelles=courbes.revenus&&courbes.revenus.labels||cycles.map(x=>x.libelle);
      md.push('','#### Historique financier par cycle : données observées et preuves structurelles',
        '| Cycle | Revenus prouvés | Charges fixes rapprochées | Pilotable constaté | Dette prouvée | Actifs prouvés |',
        '|---|---:|---:|---:|---:|---:|');
      cycles.forEach((x,i)=>md.push('| '+(libelles[i]||x.libelle||x.cle)+' | '+
        blocs.map(k=>valCourbe(k,i)).join(' | ')+' |'));
      md.push('','Les cases « non prouvé » en dette et capital ne doivent jamais être remplacées par zéro.');
    }
    if(n===3){
      md.push('','#### Catégories de dépenses du cycle courant','| Catégorie | Montant | Part |','|---|---:|---:|');
      categoriesCourantes.forEach(x=>md.push('| '+x.categorie+' | '+money(x.montant)+' | '+percentage(x.partPourcent)+' |'));
    }
    if(a.alertes&&a.alertes.length){
      md.push('','#### Dépassements d’enveloppe ('+n+' cycles)');
      a.alertes.forEach(x=>md.push('- '+short(x.poste)+' : prévu '+money(x.prevu)+
        ', dépensé '+money(x.reel)+', écart '+money(x.ecart)+'.'));
    }
    md.push('');
  });

  md.push('## 5. Charges fixes de référence et engagements récurrents');
  const fixes=horizons['3'].depensesDetail.referentielChargesFixes||{};
  md.push('- Charges fixes actives : '+printable(fixes.nombre)+'.',
    '- Montant mensuel équivalent de référence : '+money(fixes.montantMensuelReference)+'.',
    '- Couverture santé mensuelle de référence : '+money(fixes.couvertureSanteActuelle)+'.');
  // Détail du référentiel seulement si l'on peut prouver que son volume n'a
  // pas bougé depuis le snapshot. C'est une lecture de 35 lignes, pas 3000.
  let lignesCharges=null;
  try{
    if(typeof lireTable_==='function'&&number(tableCounts.Charges_fixes)!=null){
      const raw=lireTable_('Charges_fixes')||[];
      if(Array.isArray(raw)&&raw.length===tableCounts.Charges_fixes){
        lignesCharges=raw.map(x=>({
          libelle:short(x.libelle||x.nom||x.description||'Charge sans intitulé'),
          categorie:short(x.categorie),montant:number(x.montant),
          frequence:str(x.frequence),actif:!['0','false','non','inactif'].includes(str(x.actif).toLowerCase()),
          dateDebut:str(x.date_debut),dateFin:str(x.date_fin),commentaire:short(x.commentaire)
        }));
      }else note.push('Le référentiel Charges_fixes a évolué depuis le snapshot ; détails non exportés.');
    }
  }catch(ex){note.push('Détail des charges fixes indisponible : '+short(ex&&ex.message));}
  if(lignesCharges&&lignesCharges.length){
    md.push('','| Charge | Catégorie | Montant saisi | Fréquence | Active |',
      '|---|---|---:|---|---|');
    lignesCharges.forEach(x=>md.push('| '+x.libelle+' | '+x.categorie+' | '+money(x.montant)+' | '+x.frequence+' | '+(x.actif?'oui':'non')+' |'));
  }else md.push('','Détail ligne par ligne indisponible ; seuls les totaux de référence issus du snapshot sont fiables.');
  md.push('');

  const cr=m.credits||{},catCredit=(xs)=>Array.isArray(xs)?xs.map(x=>({
    nom:short(x.nom),type:str(x.type_credit),capitalRestant:number(x.capital_restant),
    mensualite:number(x.mensualite),tauxSaisi:number(x.taux),
    tauxAnnuelEffectifGlobal:number(x.taeg),coutRestant:number(x.cout_restant),
    echeancesRestantes:number(x.echeances_restantes),
    prochaineEcheance:str(x.prochaine_echeance),dateFin:str(x.date_fin),
    assuranceMensuelle:number(x.assurance_mensuelle),
    plafondCredit:number(x.plafond_credit),disponibleCredit:number(x.disponible_credit),
    statut:str(x.statut)
  })):[];

  const credits={
    capitalCredits:number(cr.capitalCredits),dettesHorsCredit:number(cr.dettesHorsCredit),
    endettementTotal:number(cr.endettementTotal),
    mensualitesCredits:number(cr.mensualitesCredits),mensualitesDettes:number(cr.mensualitesDettes),
    mensualitesTotales:number(cr.mensualites),
    capitalAmortissable:number(cr.capitalAmortissable),mensualitesAmortissables:number(cr.mensualitesAmortissables),
    capitalRenouvelable:number(cr.capitalRenouvelable),mensualitesRenouvelables:number(cr.mensualitesRenouvelables),
    tauxPondere:number(cr.tauxPondere),tauxRenouvelablePondere:number(cr.tauxRenouvelablePondere),
    coutRestant:number(cr.coutRestant),coutAmortissable:number(cr.coutAmortissable),
    coutRenouvelable:number(cr.coutRenouvelable),
    plafondRenouvelable:number(cr.plafondRenouvelable),disponibleRenouvelable:number(cr.disponibleRenouvelable),
    assuranceRenouvelable:number(cr.assuranceRenouvelable),
    echeancesRestantes:number(cr.echeancesRestantes),
    amortissables:catCredit(cr.amortissables),renouvelables:catCredit(cr.renouvelables),
    dettes:(cr.dettes||[]).map(x=>({
      nom:short(x.nom),creancier:short(x.creancier),resteAPayer:number(x.capital_restant),
      mensualite:number(x.mensualite),echeance:str(x.date_echeance),
      actif:!['0','false'].includes(str(x.actif).toLowerCase()),statut:str(x.statut)
    })),
    alertes:(cr.alertes||[]).map(x=>({niveau:str(x.niveau),nom:short(x.nom),message:short(x.message)}))
  };
  md.push('## 6. Crédits, renouvelables et dettes hors crédit','',
    '- Capital amortissable : '+money(credits.capitalAmortissable)+' ; mensualités : '+money(credits.mensualitesAmortissables)+'.',
    '- Capital renouvelable : '+money(credits.capitalRenouvelable)+' ; mensualités : '+money(credits.mensualitesRenouvelables)+'.',
    '- Total capital des crédits : '+money(credits.capitalCredits)+'.',
    '- Dettes hors crédit : '+money(credits.dettesHorsCredit)+'.',
    '- Endettement total de référence : '+money(credits.endettementTotal)+'.',
    '- Mensualités crédits : '+money(credits.mensualitesCredits)+' ; mensualités dettes : '+money(credits.mensualitesDettes)+'.',
    '- Mensualités totales : **'+money(credits.mensualitesTotales)+'**.',
    '- Taux pondéré saisi (périmètre module) : '+percentage(credits.tauxPondere)+'.',
    '- Coût restant déclaré/calculé : '+money(credits.coutRestant)+' (ne pas confondre avec TAEG).',
    '- Plafonds des renouvelables : '+money(credits.plafondRenouvelable)+
      ' ; disponibles théoriques : '+money(credits.disponibleRenouvelable)+'.',
    '',
    '| Crédit | Nature | Capital restant | Mensualité | Taux saisi | Échéance prochaine | Fin |',
    '|---|---|---:|---:|---:|---|---|');
  (credits.amortissables.concat(credits.renouvelables)).forEach(x=>md.push(
    '| '+x.nom+' | '+(x.type||'amortissable')+' | '+money(x.capitalRestant)+' | '+money(x.mensualite)+
    ' | '+percentage(x.tauxSaisi)+' | '+(x.prochaineEcheance||'—')+' | '+(x.dateFin||'—')+' |'));
  md.push('','#### Dettes hors crédit');
  if(credits.dettes.length)credits.dettes.forEach(x=>md.push('- '+x.nom+' : reste '+money(x.resteAPayer)+
    ', mensualité '+money(x.mensualite)+', statut '+(x.statut||'—')+'.'));
  else md.push('Aucune dette hors crédit documentée dans ce module.');
  if(credits.alertes.length){
    md.push('','#### Anomalies et alertes financement');
    credits.alertes.forEach(x=>md.push('- ['+x.niveau+'] '+x.nom+' : '+x.message));
  }
  md.push('');

  const pat=m.patrimoine||{},estim=m.situationPatrimonialeEstimee||{};
  const assets=(xs,fields)=>Array.isArray(xs)?xs.map(x=>{
    const o={};fields.forEach(k=>{const v=x[k];o[k]=
      ['valeur','solde','capital_restant'].includes(k)?number(v):short(v);});return o;
  }):[];
  const patrimoine={
    totalActifsPatrimoniaux:number(pat.totalActifsPatrimoniaux),
    totalLivrets:number(pat.totalLivrets),totalPlacements:number(pat.totalPlacements),
    totalFinancier:number(pat.totalFinancier),totalActifs:number(pat.totalActifs),
    totalDettes:number(pat.totalDettes),patrimoineNetReference:number(pat.patrimoineNet),
    biens:assets(pat.actifs,['nom','type','valeur','date_valeur']),
    livrets:assets(pat.livrets,['nom','type','solde']),
    placements:assets(pat.placements,['nom','type','solde']),
    estimation:estim.ok===true?{
      dateReference:str(estim.dateReference),
      capitalCreditsEnregistre:number(estim.capitalCreditsEnregistre),
      capitalCreditsEstime:number(estim.capitalCreditsEstime),
      dettesHorsCredit:number(estim.dettesHorsCredit),
      endettementTotalEstime:number(estim.endettementTotalEstime),
      totalActifs:number(estim.totalActifs),
      patrimoineNetEstime:number(estim.patrimoineNetEstime),
      ecartDetteDepuisReference:number(estim.ecartDetteDepuisReference),
      controles:estim.controles||null,
      credits:(estim.credits||[]).map(x=>({
        nom:short(x.nom),capitalReference:number(x.capitalReference),
        capitalEstime:number(x.capitalEstime),
        estimationDisponible:x.estimationDisponible===true,
        operationsPrisesEnCompte:number(x.operationsPrisesEnCompte),
        confiance:short(x.confiance)
      }))
    }:null
  };
  md.push('## 7. Patrimoine et endettement estimé','',
    '- Valeur enregistrée des biens patrimoniaux : '+money(patrimoine.totalActifsPatrimoniaux)+'.',
    '- Livrets : '+money(patrimoine.totalLivrets)+' ; placements : '+money(patrimoine.totalPlacements)+'.',
    '- Total actifs : **'+money(patrimoine.totalActifs)+'**.',
    '- Patrimoine net de référence : '+money(patrimoine.patrimoineNetReference)+'.');
  if(patrimoine.estimation){
    md.push('- Capital crédits estimé après rattrapage : '+money(patrimoine.estimation.capitalCreditsEstime)+'.',
      '- Endettement total estimé : '+money(patrimoine.estimation.endettementTotalEstime)+'.',
      '- Patrimoine net estimé : **'+money(patrimoine.estimation.patrimoineNetEstime)+'**.',
      '- Attention : estimation ≠ capital contractuel constaté ; ne pas déduire un historique d’actifs non documenté.');
  }
  md.push('','| Bien patrimonial | Nature | Valeur enregistrée |','|---|---|---:|');
  patrimoine.biens.forEach(x=>md.push('| '+x.nom+' | '+x.type+' | '+money(x.valeur)+' |'));
  md.push('','#### Comptes d’épargne et placements');
  patrimoine.livrets.concat(patrimoine.placements).forEach(x=>md.push('- '+x.nom+' : '+money(x.solde)+'.'));
  md.push('');

  const p=m.pluxee||{},pluxee={
    solde:number(p.solde),soldeInitial:number(p.soldeInitial),dateReference:str(p.dateReference),
    mouvementsNets:number(p.netMouvements),nombreOperations:number(p.nombreOperations),
    depensesParCategorie:p.depensesParCategorie||null
  };
  md.push('## 8. Pluxee et alimentation','',
    '- Solde Pluxee : '+money(pluxee.solde)+' ; solde initial : '+money(pluxee.soldeInitial)+
      ' (référence '+(pluxee.dateReference||'non renseignée')+').',
    '- Mouvements nets : '+money(pluxee.mouvementsNets)+
      ' ; opérations enregistrées : '+printable(pluxee.nombreOperations)+'.');
  Object.keys(pluxee.depensesParCategorie||{}).forEach(k=>md.push('- '+k+' : '+money(pluxee.depensesParCategorie[k])+'.'));
  md.push('');

  const dash=m.dashboard||{},tres=m.tresorerieComptable||{};
  const pick=(o,fields)=>{const out={};fields.forEach(k=>{
    if(o&&Object.prototype.hasOwnProperty.call(o,k)){
      const v=o[k];out[k]=typeof v==='number'?number(v):v===null?null:
        typeof v==='boolean'?v:typeof v==='string'?str(v):null;
    }else out[k]=null;
  });return out;};
  const tfields=['libelle','debut','fin','dateReference','joursRestants','duree',
    'soldeBancaire','soldeJ1','soldeMiCycle','soldeFinCycle','revenusConstates','revenusAttendus',
    'depensesConstatees','depensesAttendues','revenusPrevisionnels','depensesPrevisionnelles',
    'cbDifferees','nombreCb','prelevements','nombrePrelevements','chargesFixes','nombreCharges',
    'pilotableDisponible','pilotableParJour','pilotablePrevisionnel','resultat',
    'operations','revenus','depenses','netOperations','ecartReconciliation','projectionTresorerieDisponible'];
  const tresorerie={
    soldeReel:number(tres.soldeReel),variationComptableCertaine:number(tres.variationComptableCertaine),
    soldePrevisionnel:number(tres.soldePrevisionnel),dateCible:str(tres.dateCible),
    operationsFutures:number(tres.nombreOperationsFutures),
    cycleCourant:pick(dash.courtTerme,tfields),cycleSuivant:pick(dash.cycleSuivant,tfields),
    cyclePrecedent:pick(dash.cyclePrecedent,tfields),
    politiqueProjection:short(dash.doctrine)
  };
  md.push('## 9. Trésorerie actuelle, cycle précédent, cycle courant, cycle suivant','',
    '- Solde réel canonique : **'+money(tresorerie.soldeReel)+'**.',
    '- Variation comptable certaine future : '+money(tresorerie.variationComptableCertaine)+'.',
    '- Solde comptable prévisionnel : '+money(tresorerie.soldePrevisionnel)+
      ' à '+(tresorerie.dateCible||'date non renseignée')+'.',
    '- Nombre d’opérations futures comptabilisées : '+printable(tresorerie.operationsFutures)+'.');
  const dashNames=[['cyclePrecedent','Cycle précédent'],['cycleCourant','Cycle courant'],['cycleSuivant','Cycle suivant']];
  const labels={
    soldeJ1:'Solde J1',soldeMiCycle:'Solde mi-cycle',soldeFinCycle:'Solde fin de cycle',
    soldeBancaire:'Solde bancaire',revenusConstates:'Revenus constatés',
    revenusAttendus:'Revenus attendus cumulés',depensesConstatees:'Dépenses constatées',
    depensesAttendues:'Dépenses attendues cumulées',revenusPrevisionnels:'Revenus prévisionnels',
    depensesPrevisionnelles:'Dépenses prévisionnelles',cbDifferees:'CB différées',
    prelevements:'Prélèvements restants',chargesFixes:'Charges fixes restantes',
    pilotableDisponible:'Pilotable disponible',pilotableParJour:'Pilotable quotidien',
    pilotablePrevisionnel:'Pilotable prévu',resultat:'Résultat du cycle',
    revenus:'Revenus constatés',depenses:'Dépenses constatées',
    netOperations:'Net bancaire constaté',ecartReconciliation:'Écart de rapprochement'
  };
  dashNames.forEach(([k,title])=>{
    const obj=tresorerie[k];
    md.push('','### '+title+' : '+(obj.debut||'—')+' → '+(obj.fin||'—'));
    Object.keys(labels).forEach(field=>{if(number(obj[field])!=null)
      md.push('- '+labels[field]+' : '+money(obj[field])+'.');});
    if(k==='cycleSuivant'&&obj.projectionTresorerieDisponible===false)
      md.push('- Soldes de trésorerie future masqués : la projection complète n’est pas encore prouvée.');
  });
  md.push('');

  const conseiller=m.conseiller||{};
  const advice={
    disponible:conseiller.ok===true,score:number(conseiller.score),
    niveau:str(conseiller.niveau),synthese:str(conseiller.synthese),
    indicateurs:conseiller.indicateurs||null,
    recommandations:(conseiller.recommandations||[]).map(x=>({
      priorite:str(x.priorite),titre:short(x.titre),texte:short(x.texte)})),
    alertesBudget:(conseiller.alertesBudget||[]).slice(0,30)
  };
  md.push('## 10. Diagnostic du conseiller et alertes','');
  if(advice.disponible){
    md.push('- Indice indicatif : '+printable(advice.score)+'/100 ; niveau : '+advice.niveau+'.',
      '- Synthèse : '+advice.synthese);
    Object.keys(advice.indicateurs||{}).forEach(k=>{
      const v=advice.indicateurs[k];if(number(v)!=null)
        md.push('- '+k+' : '+(k.toLowerCase().includes('taux')?' '+percentage(v):' '+money(v))+'.');
    });
    advice.recommandations.forEach(x=>md.push('- ['+x.priorite+'] '+x.titre+' : '+x.texte));
  }else{md.push('Diagnostic conseiller indisponible dans le snapshot, sans extrapolation.');note.push('Conseiller IA indisponible.');}
  md.push('');

  const cerbere=m.cerbere||{},cerExpress=m.cerbereExpress||{},eng=m.engagementsBancaires||{};
  const forecast={
    cerbere:{ok:cerbere.ok!==false,nombrePeriodes:Array.isArray(cerbere.periodes)?cerbere.periodes.length:null,
      periodes:(cerbere.periodes||[]).slice(0,8).map(x=>({
        cle:str(x.clePilotage||x.cle),
        debut:str(x.periode&&x.periode.debut||x.debut),
        fin:str(x.periode&&x.periode.fin||x.fin),
        cft1:npath(x,'cft1'),het1:npath(x,'het1'),
        rt1:npath(x,'rt1'),soldeProjet:npath(x,'soldeFin')
      }))},
    express:{
      cycle:cerExpress.cycle||null,meteo:cerExpress.meteo||null,
      pilotable:cerExpress.pilotable?{
        allocation:number(cerExpress.pilotable.allocation),
        consomme:number(cerExpress.pilotable.consomme),
        reste:number(cerExpress.pilotable.reste),
        lignes:(cerExpress.pilotable.lignes||[]).slice(0,40).map(x=>({
          categorie:short(x.categorie),allocation:number(x.allocation),
          consomme:number(x.consomme),reste:number(x.reste),vigilance:short(x.niveau||x.vigilance&&x.vigilance.niveau)
        }))
      }:null,
      decision:cerExpress.decision||cerExpress.contexteDecision||null
    },
    engagements:{ok:eng.ok!==false,nombreLignes:number(eng.nombreLignes),
      nombreOperations:number(eng.nombreOperations),
      clefsDisponibles:Object.keys(eng).filter(k=>typeof eng[k]==='number').slice(0,35),
      indicateurs:Object.fromEntries(Object.keys(eng).filter(k=>typeof eng[k]==='number'&&
        /montant|total|nombre|reste|encours|futur|prochain/i.test(k)).slice(0,35)
        .map(k=>[k,number(eng[k])]))}
  };
  md.push('## 11. Prévisions Cerbère et engagements','',
    '- Nombre de périodes disponibles dans le cockpit Cerbère : '+printable(forecast.cerbere.nombrePeriodes)+'.');
  forecast.cerbere.periodes.forEach(x=>md.push('- '+(x.cle||'Cycle')+' ['+(x.debut||'?')+
    ' → '+(x.fin||'?')+'] : Rt1 '+money(x.rt1)+', CFt1 '+money(x.cft1)+
    ', HEt1 '+money(x.het1)+' (données absentes = non disponibles).'));
  if(forecast.express.pilotable){
    const p=forecast.express.pilotable;
    [['allocation','Allocation EP'],['consomme','Pilotable consommé'],['reste','Pilotable restant']].forEach(k=>{
      if(number(p[k[0]])!=null)md.push('- '+k[1]+' : '+money(p[k[0]])+'.');
    });
    if(p.lignes&&p.lignes.length){
      md.push('','| Catégorie pilotable | Allocation | Consommé | Reste | Vigilance |','|---|---:|---:|---:|---|');
      p.lignes.forEach(x=>md.push('| '+x.categorie+' | '+money(x.allocation)+' | '+money(x.consomme)+
        ' | '+money(x.reste)+' | '+(x.vigilance||'—')+' |'));
    }
  }
  const decision=forecast.express.decision||{};
  [['prochainCycleEp','EP prochain cycle'],['prochainCycleCbEngagee','CB engagée prochain cycle'],
    ['prochainCycleEpConsommee','EP déjà consommée cycle suivant'],
    ['prochainCycleEpDisponible','EP disponible cycle suivant']].forEach(k=>{
      if(number(decision[k[0]])!=null)md.push('- '+k[1]+' : '+money(decision[k[0]])+'.');
    });
  Object.keys(forecast.engagements.indicateurs).forEach(k=>md.push('- Engagements '+k+' : '+money(forecast.engagements.indicateurs[k])+'.'));
  md.push('');

  md.push('## 12. Limites de la base et points nécessitant des justificatifs');
  if(!note.length)md.push('- Aucune restriction supplémentaire détectée.');
  note.forEach(x=>md.push('- '+x));
  if(erreurs.length)erreurs.forEach(x=>md.push('- Erreur publiée : '+short(x)));
  md.push('- Les projections de retraite, pensions, droits sociaux ou périodes d’autonomie de l’enfant ne sont pas contenues dans ce snapshot.',
    '- La dette totale de référence et l’endettement estimé peuvent différer ; préserver les deux sans les fusionner.',
    '- Les soldes prospectifs volontairement absents du Dashboard doivent rester non disponibles.',
    '',
    '## 13. Question proposée à l’IA',
    'Compte tenu du contexte familial, des données chiffrées, des risques et des sources,',
    'analyser la trésorerie à court terme, la soutenabilité des crédits, les marges d’économie',
    'et les scénarios de transition vers la retraite. Présenter les calculs, hypothèses,',
    'incertitudes et informations manquantes ; ne pas transformer les estimations en certitudes.');

  const data={
    version:BUDGETSOFT_RAPPORT_IA_DETAILLE_VERSION_20261108,
    genereLe:new Date().toISOString(),snapshotGenereLe:etat.genereLe||null,
    revisionBudgetSoft:rev,contexte,
    doctrine:{cycle:'28 inclus au 27 inclus',moyennes:'cycles complets',
      tresorerie:'distincte des revenus et dépenses économiques',
      pluxee:'dépenses comptées dans alimentation sans rechargement comme revenu',
      valeursManquantes:'null signifie inconnu, jamais zéro'},
    volumes:tableCounts,horizons,chargesFixes:{reference:fixes,lignes:lignesCharges},
    credits,patrimoine,pluxee,tresorerie,conseiller:advice,previsions:forecast,
    restrictions:note,erreursSnapshot:erreurs
  };
  const markdown=md.join('\n'),json=JSON.stringify(data,null,2);
  if(json.length>500000||markdown.length>300000)
    throw new Error('Rapport trop volumineux : réduire le périmètre avant export.');
  const metriques=[...Object.keys(tableCounts),
    ...Object.keys(horizons).flatMap(n=>Object.keys(horizons[n].moyennesParCycleComplet)),
    ...Object.keys(credits),...Object.keys(patrimoine),...Object.keys(tresorerie)];
  return{
    ok:true,version:BUDGETSOFT_RAPPORT_IA_DETAILLE_VERSION_20261108,
    revisionBudgetSoft:rev,markdown,json,
    statistiques:{
      tailleMarkdown:markdown.length,tailleJson:json.length,
      nombreSections:13,nombreCyclesDetail:12,nombreCredits:credits.amortissables.length+credits.renouvelables.length,
      nombreDettes:credits.dettes.length,nombreChargesFixes:lignesCharges&&lignesCharges.length||0,
      nombreSourcesRevenus:horizons['12'].recettes.sources.length,
      nombreCategories:horizons['3'].categoriesCourantes.length,
      nombreIndicateursStructurants:metriques.length,
      contextePresent:!!str(contexte),avertissements:note.length
    }
  };
}
