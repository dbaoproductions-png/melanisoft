/**
 * Audit transversal, lecture seule de tout l'onglet Analyses (3, 6, 12 cycles).
 * Vérifie les sorties réellement affichées dans les 4 vues et les sources
 * d'Operations, sans publier de snapshot ni modifier de feuille.
 * Journal : synthèses chiffrées / codes de contrôle, jamais de libellé bancaire.
 */
const BUDGETSOFT_ANALYSES_EXHAUSTIVE_AUDIT_20261108_VERSION='2026-11-08.1';

function auditerToutesDonneesAnalysesBudgetSoft20261108(){
  const erreurs=[],avertissements=[],controles=[],resume={};
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const nb=x=>x===null||x===undefined||x===''?null:(Number.isFinite(Number(x))?Number(x):null);
  const somme=(xs,champ)=>arr((xs||[]).reduce((s,x)=>s+Number(x&&x[champ]||0),0));
  const proche=(a,b,tol)=>a!==null&&b!==null&&Math.abs(Number(a)-Number(b))<=(tol==null?.011:tol);
  const date=x=>{const d=x instanceof Date?new Date(x.getTime()):new Date(x||'');return Number.isFinite(d.getTime())?d:null;};
  function ajouter(nom,ok,detail,niveau){
    const positif=!!ok;
    controles.push({code:nom,ok:positif});
    if(!positif){
      const objet={controle:nom,detail:String(detail||'Discordance')};
      if(niveau==='avertissement')avertissements.push(objet);else erreurs.push(objet);
    }
  }
  function attention(code,detail){avertissements.push({controle:code,detail:String(detail)});}
  function nombreValide(x){return typeof x==='number'&&Number.isFinite(x);}
  function eviterDoublon(array){return new Set(array).size===array.length;}

  const t0=Date.now();
  const snap=chargerSnapshotGlobalBudgetSoft20260906();
  const e=snap&&snap.disponible&&snap.etat||null;
  const m=e&&e.modules||{},a=m.analyses||null,pat=m.patrimoine||null,cre=m.credits||null;
  const ref=String(e&&e.revisionBudgetSoft||'');
  ajouter('snapshot_publie_frais',!!(e&&e.publie===true&&e.ok===true&&snap.perime!==true&&ref),'Snapshot global non disponible, non publié ou périmé.');
  ajouter('module_analyses_3_6_12',!!(a&&a.ok!==false&&a.variantes&&a.variantes['3']&&a.variantes['6']&&a.variantes['12']),
    'Il manque une ou plusieurs variantes Analyses.');
  ajouter('modules_financiers_presents',!!(cre&&pat&&m.situationPatrimonialeEstimee),
    'Crédits, Patrimoine ou estimation commune absent.');

  // Relecture des API qu'utilise vraiment la page, sans relancer le moteur.
  const variantes={},blocs={},vues={};
  [3,6,12].forEach(function(n){
    try{
      const d=chargerAnalysesBudgetairesV23(n);
      vues[n]=d;
      ajouter('api_'+n+'_snapshot',!!(d&&d.sourceBudgetSoft==='snapshot_global'&&d.revisionBudgetSoft===ref),
        n+' périodes : la page ne consomme pas la révision globale publiée.');
      const brut=a&&a.variantes&&a.variantes[String(n)];
      ajouter('api_'+n+'_contenu',!!(brut&&d&&d.version===brut.version&&
        JSON.stringify(d.periodes||[])===JSON.stringify(brut.periodes||[])),
        n+' périodes : contenu retourné différent du snapshot.');
      variantes[n]=d||null;
    }catch(ex){ajouter('api_'+n+'_appel',false,String(ex&&ex.message||ex));variantes[n]=null;}
  });
  let ops=[],categories=[],budgets=[],fixes=[];
  try{
    ops=lireTable_('Operations')||[];
    categories=lireTable_('Categories')||[];
    budgets=lireTable_('Budget')||[];
    fixes=lireTable_('Charges_fixes')||[];
    ajouter('sources_tableaux_valides',
      [ops,categories,budgets,fixes].every(Array.isArray),'Une table source est illisible.');
  }catch(ex){ajouter('sources_lecture',false,String(ex&&ex.message||ex));}
  const types={};
  (Array.isArray(categories)?categories:[]).forEach(c=>{const nom=String(c&&c.nom||'').trim();if(nom)types[nom]=String(c.type||'').toLowerCase();});
  const fam=typeof famillesAnalytiquesAnalyse2026_==='function'?famillesAnalytiquesAnalyse2026_(categories):{};
  const mouvements=(Array.isArray(ops)?ops:[]).map(o=>{
    const x=Object.assign({},o);
    if(typeof categorieRevenuAnalyseCanonique20260921_==='function')
      x.categorie=categorieRevenuAnalyseCanonique20260921_(x.categorie);
    x.date_analyse=x.date_comptable||x.date;
    return x;
  });
  const ids=mouvements.map(o=>String(o.id||'').trim()).filter(Boolean);
  const datesInvalides=mouvements.filter(o=>!date(o.date_analyse)).length;
  const montantsInvalides=mouvements.filter(o=>o.montant!==''&&o.montant!=null&&!Number.isFinite(Number(o.montant))).length;
  const sansCategorie=mouvements.filter(o=>Number(o.montant||0)!==0&&!String(o.categorie||'').trim()).length;
  const horsReferentiel=mouvements.filter(o=>{
    const cat=String(o.categorie||'').trim();
    return cat&&Number(o.montant||0)!==0&&!Object.prototype.hasOwnProperty.call(types,cat);
  }).length;
  const doublonsIds=ids.length-new Set(ids).size;
  if(datesInvalides)attention('operations_dates_invalides',datesInvalides+' opération(s) sans date bancaire exploitable.');
  if(montantsInvalides)attention('operations_montants_invalides',montantsInvalides+' montant(s) non numériques.');
  if(sansCategorie)attention('operations_sans_categorie',sansCategorie+' mouvement(s) sans catégorie.');
  if(horsReferentiel)attention('operations_categories_non_referencees',horsReferentiel+' mouvement(s) dont la catégorie canonique est absente de Categories ; vérifier leur inclusion.');
  if(doublonsIds)attention('operations_ids_doubles',doublonsIds+' identifiant(s) dupliqué(s), susceptibles de fausser les rapprochements.');
  const sources={operations:mouvements.length,categories:categories.length,budgets:budgets.length,chargesFixes:fixes.length,
    datesInvalides,montantsInvalides,sansCategorie,horsReferentiel,doublonsIds};

  const periodeCle=p=>String(p&&p.cle||'').trim();
  const debutFin=p=>[date(p&&p.debut),date(p&&p.fin)];
  const estTresorerie=o=>typeof estTresorerieAnalyse20260904_==='function'
    ?estTresorerieAnalyse20260904_(o,types)
    :(String(o.type||'').toLowerCase()==='tresorerie'||types[String(o.categorie||'')]==='tresorerie');
  const estRevenu=(cat,type)=>typeof estRevenuEconomiqueAnalyse20260904_==='function'
    ?estRevenuEconomiqueAnalyse20260904_(cat,type):String(type||'')==='revenu';
  const famille=cat=>typeof familleAnalytiqueAnalyse2026_==='function'?familleAnalytiqueAnalyse2026_(cat,fam):String(cat||'').trim();

  [3,6,12].forEach(function(n){
    const d=variantes[n];
    if(!d)return;
    const label=n+'p';
    const per=Array.isArray(d.periodes)?d.periodes:[];
    const courante=d.courante||null,rec=d.recettes||{},dep=d.depensesDetail||{},ind=d.indicateurs||{};
    const fRec=rec.fenetres&&rec.fenetres[String(n)];
    const fDep=dep.fenetres&&dep.fenetres[String(n)];
    const refs=[];
    ajouter(label+'_nombre_periodes',per.length===n,'Nombre de cycles incohérent : '+per.length+' au lieu de '+n+'.');
    ajouter(label+'_courante_derniere',!!(courante&&per.length&&
      periodeCle(courante)===periodeCle(per[per.length-1])&&
      String(courante.debut)===String(per[per.length-1].debut)),
      'La période courante ne correspond pas au dernier cycle.');
    const cles=per.map(periodeCle);
    ajouter(label+'_cles_uniques',cles.every(Boolean)&&eviterDoublon(cles),'Clés de cycles vides ou répétées.');
    per.forEach(function(p,i){
      const [debut,fin]=debutFin(p),prefix=label+'_cycle_'+i;
      ajouter(prefix+'_dates',!!(debut&&fin&&debut<=fin),'Dates de cycle invalides.');
      if(i>0){
        const precedent=date(per[i-1].fin);
        ajouter(prefix+'_sans_chevauchement',!!(precedent&&debut&&debut>precedent),
          'Deux cycles se chevauchent ou sont dans le mauvais ordre.');
      }
      ['revenus','depenses','solde','tresorerie','tauxEpargne','operations'].forEach(function(champ){
        ajouter(prefix+'_'+champ+'_numerique',nombreValide(p[champ]),'Valeur '+champ+' absente ou non finie.');
      });
      ajouter(prefix+'_solde',proche(nb(p.solde),arr(Number(p.revenus)-Number(p.depenses))),
        'Le solde n’est pas la différence recettes − dépenses.');
      ajouter(prefix+'_taux',proche(nb(p.tauxEpargne),p.revenus>0?
        Math.round(((Number(p.revenus)-Number(p.depenses))/Number(p.revenus))*1000)/10:0,.011),
        'Taux d’épargne incorrect.');
      ajouter(prefix+'_operations',Number.isInteger(p.operations)&&p.operations>=0,'Nombre d’opérations invalide.');
      if(debut&&fin)refs.push({p,debut,fin});
    });

    const completes=per.filter(p=>p&&p.periodeComplete!==false);
    const base=completes.length?completes:per;
    const moyenne=champ=>base.length?base.reduce((s,p)=>s+Number(p&&p[champ]||0),0)/base.length:0;
    ['revenusMoyens','depensesMoyennes','epargneMoyenne','mouvementTresorerieMoyen'].forEach(function(champ){
      const origine={revenusMoyens:'revenus',depensesMoyennes:'depenses',epargneMoyenne:'solde',mouvementTresorerieMoyen:'tresorerie'}[champ];
      ajouter(label+'_indicateur_'+champ,proche(nb(ind[champ]),moyenne(origine),.015),
        'La moyenne publiée diffère des cycles complets.');
    });
    const revenusM=moyenne('revenus'),soldeM=moyenne('solde');
    ajouter(label+'_indicateur_taux_moyen',proche(nb(ind.tauxEpargneMoyen),
      revenusM>0?Math.round(soldeM/revenusM*1000)/10:0),'Taux d’épargne moyen divergent.');

    const cats=Array.isArray(d.categories)?d.categories:[];
    const montCats=somme(cats,'montant');
    ajouter(label+'_categories_total',proche(montCats,nb(courante&&courante.depenses),.02),
      'La somme des catégories diffère des dépenses courantes.');
    ajouter(label+'_categories_uniques',eviterDoublon(cats.map(x=>String(x.nom||''))),
      'Une catégorie de dépenses est affichée plusieurs fois.');
    cats.forEach((c,i)=>{
      ajouter(label+'_categorie_'+i+'_montant',nombreValide(c.montant)&&c.montant>=0,
        'Montant de catégorie invalide.');
      ajouter(label+'_categorie_'+i+'_part',proche(nb(c.part),montCats>0?
        Math.round(Number(c.montant||0)/montCats*1000)/10:0,.11),
        'Part de catégorie incompatible avec son montant.');
    });

    const alertes=Array.isArray(d.alertes)?d.alertes:[];
    alertes.forEach((b,i)=>{
      ajouter(label+'_alerte_'+i,Number(b.prevu)>0&&Number(b.reel)>Number(b.prevu)&&
        proche(nb(b.ecart),arr(Number(b.prevu)-Number(b.reel)),.02),
        'Alerte budgétaire non justifiée ou écart mal calculé.');
    });

    ajouter(label+'_bloc_recettes',!!fRec,'Recettes indisponibles sur cet horizon.');
    if(fRec){
      const revenuTotal=nb(fRec.revenusEconomiques),structurel=nb(fRec.revenusStructurels),
        variable=nb(fRec.revenusVariables),totalPer=somme(per,'revenus');
      ajouter(label+'_revenus_vs_cycles',proche(revenuTotal,totalPer,.02),
        'Somme des revenus économiques de la fenêtre différente du total des cycles : contrôler opérations futures et dates.');
      ajouter(label+'_revenus_part_variable',proche(nb(fRec.partVariable),
        revenuTotal>0?variable/revenuTotal*100:0,.02),'Pourcentage variable incohérent.');
      const prod=fRec.producteurs||{},totalProd=arr(Object.values(prod).reduce((s,v)=>s+Number(v||0),0));
      ajouter(label+'_revenus_producteurs',proche(totalProd,revenuTotal,.02),
        'Ventilation des producteurs de revenus ≠ revenus économiques.');
      const src=Array.isArray(fRec.sources)?fRec.sources:[],totalSrc=somme(src,'montant');
      ajouter(label+'_revenus_sources_sans_doublons',eviterDoublon(src.map(x=>String(x.nom||''))),
        'Doublon dans les sources de revenus.');
      if(!proche(totalSrc,revenuTotal,.02))
        attention(label+'_revenus_sources_couverture','Sources listées : '+totalSrc+' € ; total économique : '+arr(revenuTotal)+' €. Vérifier une catégorie source manquante.');
      ajouter(label+'_revenus_credit_dependance',proche(nb(fRec.dependanceCredit),
        revenuTotal>0?Number(fRec.creditsTresorerie||0)/revenuTotal*100:0,.02),
        'Pourcentage de dépendance aux crédits de trésorerie incorrect.');
      ajouter(label+'_revenus_mois_sauvetage',Number.isInteger(fRec.moisAvecSauvetage)&&
        fRec.moisAvecSauvetage>=0&&fRec.moisAvecSauvetage<=n,'Nombre de cycles avec crédit de trésorerie impossible.');
      if(structurel!=null&&variable!=null&&revenuTotal!=null&&
        (structurel>revenuTotal+.01||variable>revenuTotal+.01))
        attention(label+'_revenus_repartition','Une part structurelle ou variable dépasse le total économique.');
      if(courante&&courante.periodeComplete===false&&fRec.moyenneMensuelle!=null&&
        proche(nb(fRec.moyenneMensuelle),revenuTotal/n,.02))
        attention(label+'_moyenne_recettes_cycle_incomplet',
          'La moyenne mensuelle des recettes inclut le cycle en cours non terminé ; la vue générale utilise seulement les cycles complets.');
    }

    ajouter(label+'_bloc_depenses',!!(fDep&&dep.fixes),'Dépenses, alimentation, santé ou charges fixes indisponibles.');
    if(fDep){
      const ali=fDep.alimentation||{},sa=fDep.sante||{};
      const reelles=Number(ali.coursesBanque||0)+Number(ali.pluxeeCourses||0);
      const restau=Number(ali.restaurantsBanque||0)+Number(ali.pluxeeRestaurants||0);
      ajouter(label+'_alimentation_courses',proche(nb(ali.coursesReelles),arr(reelles),.02),
        'Courses : Banque + Pluxee mal additionnés.');
      ajouter(label+'_alimentation_restaurants',proche(nb(ali.restaurantsReels),arr(restau),.02),
        'Restaurants : Banque + Pluxee mal additionnés.');
      ajouter(label+'_alimentation_total',proche(nb(ali.totalReel),
        arr(Number(ali.coursesBanque||0)+Number(ali.restaurantsBanque||0)+Number(ali.pluxeeTotal||0)),.02),
        'Total alimentation mal calculé.');
      if(Number(ali.pluxeeAClasser||0)>0)
        attention(label+'_pluxee_a_classer',arr(ali.pluxeeAClasser)+' € Pluxee à classer en Courses/Restaurants.');
      const brut=nb(sa.soinsEtCouvertureBruts),remb=nb(sa.remboursements);
      ajouter(label+'_sante_repartition',brut!==null&&proche(
        arr(Number(sa.soinsBruts||0)+Number(sa.couvertureMntAudiens||0)),brut,.02),
        'Soins + couverture ne reconstituent pas le total des débits santé.');
      ajouter(label+'_sante_nette',brut!==null&&remb!==null&&proche(nb(sa.coutNet),Math.max(0,arr(brut-remb)),.02),
        'Le coût net de santé ne correspond pas aux soins bruts avec couverture − remboursements.');
      const themes=Array.isArray(fDep.themes)?fDep.themes:[];
      ajouter(label+'_themes_presents',themes.length>0,'Regroupements thématiques indisponibles.');
      ajouter(label+'_themes_uniques',eviterDoublon(themes.map(x=>String(x.nom||''))),
        'Thème dupliqué.');
      themes.forEach((x,i)=>ajouter(label+'_theme_'+i+'_montant',nombreValide(x.montant)&&x.montant>=-.01,
        'Montant non numérique ou négatif pour un regroupement de dépenses.'));
      const alimentation=themes.find(x=>x.nom==='Alimentation / quotidien');
      if(alimentation&&Number(alimentation.montant)+.01<Number(ali.coursesReelles||0))
        attention(label+'_themes_alimentation','Le thème Alimentation est inférieur aux courses seules.');
      const sante=themes.find(x=>x.nom==='Santé nette');
      if(sante)ajouter(label+'_themes_sante',proche(nb(sante.montant),nb(sa.coutNet),.02),
        'Regroupement Santé nette divergent du panneau Santé.');
    }
    const fi=dep.fixes||{};
    if(dep.fixes){
      ajouter(label+'_fixes_reference',nombreValide(fi.montantMensuelReference)&&fi.montantMensuelReference>=0,
        'Montant mensuel de référence des charges fixes invalide.');
      ajouter(label+'_fixes_nombre',Number.isInteger(fi.nombre)&&fi.nombre>=0,
        'Nombre de charges fixes actives incorrect.');
    }

    const series=d.seriesCourbes||null;
    ajouter(label+'_bloc_courbes',!!(series&&series.ok!==false),'Le bloc Courbes est absent.');
    const noms=['revenus','chargesFixes','pilotable','dettes','capital'],manques=[];
    let couverture={};
    noms.forEach(function(nom){
      const c=series&&series[nom];
      if(!c){manques.push(nom);ajouter(label+'_courbe_'+nom+'_presente',false,'Courbe absente.');return;}
      const labels=Array.isArray(c.labels)?c.labels:[],ss=Array.isArray(c.series)?c.series:[];
      ajouter(label+'_courbe_'+nom+'_labels',labels.length===n,
        'La courbe comporte '+labels.length+' labels, attendu '+n+'.');
      ajouter(label+'_courbe_'+nom+'_total',ss.length>0&&ss[0].total===true,
        'La première série de la courbe devrait être son total.');
      const ids=ss.map(x=>String(x.id||''));
      ajouter(label+'_courbe_'+nom+'_ids',ids.every(Boolean)&&eviterDoublon(ids),
        'IDs de séries absents ou dupliqués.');
      ss.forEach(function(s,i){
        const vs=Array.isArray(s.valeurs)?s.valeurs:[];
        ajouter(label+'_courbe_'+nom+'_longueur_'+i,vs.length===n,
          'Nombre de points incompatible avec le sélecteur de périodes.');
        ajouter(label+'_courbe_'+nom+'_type_'+i,vs.every(v=>v===null||(typeof v==='number'&&Number.isFinite(v))),
          'Une valeur de courbe est invalide (null est autorisé pour les périodes non prouvées).');
      });
      let points=0,vides=0,erreursSomme=0;
      for(let i=0;i<n;i++){
        const total=ss[0]&&ss[0].valeurs&&ss[0].valeurs[i];
        if(total===null||total===undefined){vides++;continue;}
        points++;
        const details=ss.slice(1).map(s=>s.valeurs&&s.valeurs[i]);
        if(['revenus','chargesFixes','pilotable'].includes(nom)&&
          !proche(nb(total),arr(details.reduce((z,v)=>z+Number(v||0),0)),.02))erreursSomme++;
        if(['dettes','capital'].includes(nom)&&i<n-1&&
          details.some(v=>v===null||v===undefined))erreursSomme++;
      }
      ajouter(label+'_courbe_'+nom+'_reconciliations',erreursSomme===0,
        erreursSomme+' point(s) total non cohérent(s) avec leurs composantes ou preuves.');
      const courant=ss[0]&&ss[0].valeurs&&ss[0].valeurs[n-1];
      if(nom==='dettes'&&cre)ajouter(label+'_courbe_dettes_courant',
        proche(nb(courant),nb(cre.endettementTotal),.02),
        'Dernier point Dette différent du module Crédits.');
      if(nom==='capital'&&pat)ajouter(label+'_courbe_capital_courant',
        proche(nb(courant),nb(pat.totalActifs),.02),
        'Dernier point Capital différent du module Patrimoine.');
      if(['dettes','capital'].includes(nom)&&vides)
        attention(label+'_courbe_'+nom+'_historique_partiel',
          vides+' période(s) sans total historique prouvé (absence normale, ne pas remplacer par zéro).');
      couverture[nom]={series:ss.length,pointsTotalProuves:points,periodesSansTotal:vides,erreursSomme};
    });

    resume[String(n)]={cycles:per.length,cyclesComplets:completes.length,
      revenusCycles:somme(per,'revenus'),depensesCycles:somme(per,'depenses'),
      revenusEconomiques:nb(fRec&&fRec.revenusEconomiques),categoriesCourantes:montCats,
      depensesCourantes:nb(courante&&courante.depenses),
      totalCourses:nb(fDep&&fDep.alimentation&&fDep.alimentation.coursesReelles),
      totalRestaurants:nb(fDep&&fDep.alimentation&&fDep.alimentation.restaurantsReels),
      coutSanteNet:nb(fDep&&fDep.sante&&fDep.sante.coutNet),
      chargesFixesReference:nb(dep.fixes&&dep.fixes.montantMensuelReference),
      courbes:couverture,source:e&&e.revisionBudgetSoft||''};
  });

  // Les périodes affichées par les trois sélecteurs doivent porter les mêmes
  // soldes pour les cycles communs, et leur dernière période doit être identique.
  [[3,6],[6,12],[3,12]].forEach(function(couple){
    const petit=variantes[couple[0]],grand=variantes[couple[1]];
    if(!petit||!grand)return;
    const a=petit.periodes||[],b=(grand.periodes||[]).slice(-a.length);
    ajouter('horizon_'+couple.join('_')+'_cycles_communs',a.length===b.length&&a.every(function(x,i){
      const y=b[i];return y&&periodeCle(x)===periodeCle(y)&&
        proche(nb(x.revenus),nb(y.revenus),.02)&&proche(nb(x.depenses),nb(y.depenses),.02)&&
        proche(nb(x.tresorerie),nb(y.tresorerie),.02);
    }),'Les mêmes cycles affichent des montants différents selon 3, 6 ou 12 périodes.');
  });

  // Contrôle indépendant de la lecture métier des opérations du classeur,
  // sur les dates de référence propres à chaque horizon, sans mutation.
  [3,6,12].forEach(function(n){
    const d=variantes[n];if(!d||!Array.isArray(d.periodes))return;
    const finRef=typeof bornerDateBancaireFinJour_==='function'?
      bornerDateBancaireFinJour_(date(d.dateReference)):date(d.dateReference);
    if(!finRef){attention('source_'+n+'p_reference','Date de référence du snapshot inexploitable.');return;}
    const sourceParCycle=[],catCourant={};let excluesFutures=0;
    d.periodes.forEach(function(p,idx){
      const deb=date(p.debut),fin=date(p.fin);
      if(!deb||!fin){sourceParCycle.push(null);return;}
      const borne=fin<finRef?fin:finRef;
      let revenus=0,depenses=0,tresorerie=0,operations=0;
      mouvements.forEach(function(o){
        const od=date(o.date_analyse);if(!od||od<deb||od>fin)return;
        if(od>borne){if(idx===d.periodes.length-1)excluesFutures++;return;}
        const val=Number(o.montant||0),cat=String(o.categorie||'').trim(),type=types[cat]||'';
        if(estTresorerie(o)){tresorerie+=val;return;}
        if(val>0&&estRevenu(cat,type)){revenus+=val;operations++;return;}
        if(val<0&&type==='depense'){
          depenses+=Math.abs(val);operations++;
          if(idx===d.periodes.length-1){
            const familleNom=famille(cat);
            catCourant[familleNom]=(catCourant[familleNom]||0)+Math.abs(val);
          }
        }
      });
      sourceParCycle.push({revenus:arr(revenus),depenses:arr(depenses),tresorerie:arr(tresorerie),operations});
    });
    const ecarts=[];
    sourceParCycle.forEach(function(x,i){
      if(!x)return;
      const p=d.periodes[i];
      ['revenus','depenses','tresorerie','operations'].forEach(function(champ){
        const tol=champ==='operations'?0:.02;
        if(!proche(nb(x[champ]),nb(p[champ]),tol))ecarts.push({periode:periodeCle(p),champ,
          source:x[champ],analyse:nb(p[champ])});
      });
    });
    ajouter('source_'+n+'p_cycles_comptables',ecarts.length===0,
      ecarts.length+' discordance(s) entre les lignes Operations et les cycles Analyses ; '+JSON.stringify(ecarts.slice(0,5)));
    const courant=(d.periodes||[]).slice(-1)[0]||{};
    if(d.categories&&d.categories.length){
      const difference=d.categories.map(x=>({nom:String(x.nom||''),attendu:arr(catCourant[String(x.nom||'')]||0),affiche:arr(x.montant)}))
        .filter(x=>!proche(x.attendu,x.affiche,.02));
      ajouter('source_'+n+'p_categories_courantes',difference.length===0,
        'Catégories non réconciliées avec les opérations : '+JSON.stringify(difference.slice(0,6)));
    }
    if(excluesFutures>0)attention('source_'+n+'p_operations_futures',
      excluesFutures+' opérations datées après la référence, présentes dans le cycle mais normalement exclues de la synthèse.');
    resume[String(n)].sourcesOperations={
      ecartsCycles:ecarts.length,operationsFuturesDansCycle:excluesFutures,
      rapprochementCategories:arr(Object.values(catCourant).reduce((z,v)=>z+v,0))
    };
  });

  // Valeur actuelle du bloc patrimoine affiché sous les onglets Analyses
  // + panneau Courbes, même snapshot que le module Patrimoine et Crédits.
  const est=m.situationPatrimonialeEstimee||null;
  let uiPat=null;
  try{uiPat=chargerSituationPatrimonialeEstimeeBudgetSoft20261014();}
  catch(ex){ajouter('ui_patrimoine_estime_chargement',false,String(ex&&ex.message||ex));}
  ['capitalCreditsEstime','dettesHorsCredit','endettementTotalEstime','patrimoineNetEstime'].forEach(function(champ){
    ajouter('ui_patrimoine_estime_'+champ,!!(est&&uiPat&&uiPat.ok===true&&
      proche(nb(est[champ]),nb(uiPat[champ]),.02)),
      'Le panneau patrimoine d’Analyses ne reprend pas la valeur commune '+champ+'.');
    ['credits','patrimoine','analyses'].forEach(function(nom){
      const mod=m[nom]||{},vue=mod.situationPatrimonialeEstimee||{};
      ajouter('module_'+nom+'_estimation_'+champ,!!(est&&proche(nb(est[champ]),nb(vue[champ]),.02)),
        'Estimation '+champ+' incohérente dans '+nom+'.');
    });
  });
  ajouter('ui_patrimoine_estime_revision',!!(uiPat&&uiPat.ok===true&&
    uiPat.revisionBudgetSoft===ref),'Le panneau patrimoine d’Analyses lit une autre révision.');

  const resultat={
    ok:erreurs.length===0,lectureSeule:true,version:BUDGETSOFT_ANALYSES_EXHAUSTIVE_AUDIT_20261108_VERSION,
    revisionBudgetSoft:ref,genereLe:String(e&&e.genereLe||''),
    niveau:erreurs.length?'ERREURS':(avertissements.length?'AVERTISSEMENTS':'CONFORME'),
    totalControles:controles.length,controlesReussis:controles.filter(x=>x.ok).length,
    nombreErreurs:erreurs.length,nombreAvertissements:avertissements.length,
    sources,resume,erreurs:erreurs.slice(0,50),avertissements:avertissements.slice(0,35),
    avertissementTroncature:erreurs.length>50||avertissements.length>35,
    dureeMs:Date.now()-t0,
    doctrine:'Les flux budgétaires, leurs moyennes, les crédits et les courbes historiques ont des périmètres différents. Les valeurs historiquement non prouvées restent nulles, et les capitaux estimés sont distincts des capitaux enregistrés.'
  };
  console.log('[AUDIT COMPLET ANALYSES BUDGETSOFT 20261108] '+JSON.stringify(resultat));
  return resultat;
}
