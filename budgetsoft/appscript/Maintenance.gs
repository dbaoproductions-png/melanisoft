const MAINTENANCE_VERSION = '3.0';
const AUDIT_GENERAL_VERSION = '1.0-2026-09-04';

/**
 * Maintenance BudgetSoft 3.0
 * Doctrine : contrôle en lecture seule. Aucune migration, réparation ou suppression.
 */
function chargerCentreMaintenance() {
  verifierInitialisation_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuilles = ['Operations', 'Charges_fixes', 'Correspondances_bancaires', 'Rapprochements_a_valider'];
  const compteurs = {};
  feuilles.forEach(nom => {
    const feuille = ss.getSheetByName(nom);
    compteurs[nom] = feuille ? Math.max(0, feuille.getLastRow() - 1) : 0;
  });
  return {
    version: MAINTENANCE_VERSION,
    mode: 'lecture_seule',
    doctrine: 'Contrôle uniquement : aucune migration, réparation ou suppression automatique.',
    compteurs,
    controle: controlerQualiteBudgetSoft()
  };
}

function controlerQualiteBudgetSoft() {
  verifierInitialisation_();
  const comptes = lireTable_('Comptes');
  const categories = lireTable_('Categories');
  const operations = lireTable_('Operations');
  const chargesFixes = lireTable_('Charges_fixes');
  const anomalies = [];

  const comptesIds = new Set(comptes.map(c => String(c.id || '')));
  const comptesNoms = new Set(comptes.map(c => normaliserTexteMaintenance_(c.nom)));
  const categoriesNoms = new Set(categories.map(c => normaliserTexteMaintenance_(c.nom)));

  ajouterDoublonsNoms_(comptes, 'nom', 'Compte en double', anomalies);
  ajouterDoublonsNoms_(categories, 'nom', 'Catégorie en double', anomalies);

  operations.forEach((o, index) => {
    const numero = index + 2;
    const date = new Date(o.date_comptable || o.date);
    const montant = Number(o.montant);
    if (isNaN(date.getTime())) anomalies.push({ niveau:'erreur', domaine:'Opérations', message:'Ligne ' + numero + ' : date invalide.' });
    if (!Number.isFinite(montant) || montant === 0) anomalies.push({ niveau:'erreur', domaine:'Opérations', message:'Ligne ' + numero + ' : montant nul ou invalide.' });

    const compte = String(o.compte || '');
    if (compte && !comptesIds.has(compte) && !comptesNoms.has(normaliserTexteMaintenance_(compte))) {
      anomalies.push({ niveau:'erreur', domaine:'Comptes', message:'Ligne ' + numero + ' : compte inconnu.' });
    }

    const categorie = String(o.categorie || '').trim();
    if (!categorie) anomalies.push({ niveau:'attention', domaine:'Catégories', message:'Ligne ' + numero + ' : opération sans catégorie.' });
    else if (!categoriesNoms.has(normaliserTexteMaintenance_(categorie))) {
      anomalies.push({ niveau:'attention', domaine:'Catégories', message:'Ligne ' + numero + ' : catégorie inconnue « ' + categorie + ' ».' });
    }
  });

  const cles = {};
  operations.forEach((o, index) => {
    const date = new Date(o.date_comptable || o.date);
    const dateCle = isNaN(date.getTime()) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone() || 'Europe/Paris', 'yyyy-MM-dd');
    const cle = [dateCle, normaliserTexteMaintenance_(o.libelle_bancaire || o.libelle), Math.abs(Number(o.montant || 0)).toFixed(2), String(o.compte || '')].join('|');
    if (cles[cle]) anomalies.push({ niveau:'attention', domaine:'Doublons', message:'Doublon probable aux lignes ' + cles[cle] + ' et ' + (index + 2) + '.' });
    else cles[cle] = index + 2;
  });

  chargesFixes.forEach((c, index) => {
    const numero = index + 2;
    if (!auditGeneralActif_(c.actif)) return;
    const montant = Number(c.montant || 0);
    if (!Number.isFinite(montant) || montant <= 0) anomalies.push({ niveau:'attention', domaine:'Charges fixes', message:'Ligne ' + numero + ' : charge active sans montant indicatif valide.' });
    const categorie = String(c.categorie || '').trim();
    if (categorie && !categoriesNoms.has(normaliserTexteMaintenance_(categorie))) anomalies.push({ niveau:'attention', domaine:'Charges fixes', message:'Ligne ' + numero + ' : catégorie inconnue « ' + categorie + ' ».' });
  });

  const erreurs = anomalies.filter(a => a.niveau === 'erreur').length;
  const attentions = anomalies.filter(a => a.niveau === 'attention').length;
  return {
    score: Math.max(0, Math.round(100 - erreurs * 8 - attentions * 2)),
    erreurs,
    attentions,
    anomalies,
    compteurs: {
      comptes: comptes.length,
      categories: categories.length,
      operations: operations.length,
      chargesFixesActives: chargesFixes.filter(c => auditGeneralActif_(c.actif)).length
    }
  };
}

/**
 * Audit général transversal.
 * Compare les sources brutes du classeur avec les indicateurs produits par les
 * moteurs actuellement utilisés par les onglets. Lecture seule, aucun flush,
 * aucune écriture, aucune réparation.
 */
function auditerBudgetSoftGeneral() {
  verifierInitialisation_();
  const t0 = Date.now();
  const controles = [];
  const performances = [];
  const tables = {};
  ['Comptes','Categories','Operations','Charges_fixes','Credits','Dettes','Actifs','Rapprochements_a_valider'].forEach(nom => {
    try { tables[nom] = lireTable_(nom) || []; } catch (e) { tables[nom] = []; }
  });

  const comptes = tables.Comptes, categories = tables.Categories, operations = tables.Operations;
  const charges = tables.Charges_fixes, creditsBruts = tables.Credits, dettesBrutes = tables.Dettes, actifs = tables.Actifs;
  const compteIds = new Set(comptes.map(c => String(c.id || '')).filter(Boolean));
  const compteNoms = new Set(comptes.map(c => normaliserTexteMaintenance_(c.nom)).filter(Boolean));
  const categorieNoms = new Set(categories.map(c => normaliserTexteMaintenance_(c.nom)).filter(Boolean));
  const operationIds = new Set(operations.map(o => String(o.id || '')).filter(Boolean));
  const chargeIds = new Set(charges.map(c => String(c.id || '')).filter(Boolean));

  // 1. Structure du classeur et intégrité référentielle.
  auditGeneralAjouter_(controles, 'Sources', 'Operations présentes', operations.length > 0 ? 'ok' : 'attention', operations.length, null, 'Nombre de mouvements réels présents dans le tableur.');
  auditGeneralAjouter_(controles, 'Sources', 'IDs Operations uniques', auditGeneralIdsUniques_(operations) ? 'ok' : 'erreur', operations.length, null, 'Chaque opération doit avoir un identifiant unique.', true);
  auditGeneralAjouter_(controles, 'Sources', 'IDs Comptes uniques', auditGeneralIdsUniques_(comptes) ? 'ok' : 'erreur', comptes.length, null, 'Chaque compte doit avoir un identifiant unique.', true);
  auditGeneralAjouter_(controles, 'Sources', 'IDs Charges fixes uniques', auditGeneralIdsUniques_(charges) ? 'ok' : 'erreur', charges.length, null, 'Chaque charge fixe doit avoir un identifiant unique.', true);

  let datesInvalides=0, montantsInvalides=0, comptesInconnus=0, categoriesInconnues=0, sansCategorie=0;
  operations.forEach(o => {
    const d = auditGeneralDate_(o.date_comptable || o.date);
    if (!d) datesInvalides++;
    const m = Number(o.montant);
    if (!Number.isFinite(m) || m === 0) montantsInvalides++;
    const cp = String(o.compte || '');
    if (cp && !compteIds.has(cp) && !compteNoms.has(normaliserTexteMaintenance_(cp))) comptesInconnus++;
    const cat = String(o.categorie || '').trim();
    if (!cat) sansCategorie++;
    else if (!categorieNoms.has(normaliserTexteMaintenance_(cat))) categoriesInconnues++;
  });
  auditGeneralAjouter_(controles,'Opérations','Dates valides',datesInvalides?'erreur':'ok',datesInvalides,0,'Opérations dont la date bancaire/comptable est invalide.',true);
  auditGeneralAjouter_(controles,'Opérations','Montants valides',montantsInvalides?'erreur':'ok',montantsInvalides,0,'Montants nuls, non numériques ou invalides.',true);
  auditGeneralAjouter_(controles,'Opérations','Comptes référencés',comptesInconnus?'erreur':'ok',comptesInconnus,0,'Opérations rattachées à un compte inconnu.',true);
  auditGeneralAjouter_(controles,'Opérations','Catégories connues',categoriesInconnues?'attention':'ok',categoriesInconnues,0,'Catégories présentes dans Operations mais absentes du référentiel.');
  auditGeneralAjouter_(controles,'Opérations','Opérations à classer',sansCategorie?'attention':'ok',sansCategorie,0,'Opérations sans catégorie métier.');

  const doublons = auditGeneralDoublonsOperations_(operations);
  auditGeneralAjouter_(controles,'Opérations','Doublons probables',doublons?'attention':'ok',doublons,0,'Même compte, même date comptable, même libellé normalisé et même montant.');

  // 2. Comptes : reconstruction directe depuis la table.
  const comptesActifs = comptes.filter(c => auditGeneralActif_(c.actif));
  const soldes = comptesActifs.map(c => ({
    id:String(c.id||''), nom:String(c.nom||''), type:String(c.type||'').toLowerCase(),
    solde:auditGeneralArrondi_(auditGeneralNombre_(c.solde_initial) + operations.filter(o => String(o.compte||'')===String(c.id||'') || String(o.compte||'')===String(c.nom||'')).reduce((s,o)=>s+auditGeneralNombre_(o.montant),0))
  }));
  const soldeTous = auditGeneralArrondi_(soldes.reduce((s,c)=>s+c.solde,0));
  const soldeEpargne = auditGeneralArrondi_(soldes.filter(c=>['epargne','placement'].includes(c.type)).reduce((s,c)=>s+c.solde,0));
  auditGeneralAjouter_(controles,'Comptes','Solde global reconstruit','info',soldeTous,null,'Solde initial + toutes les opérations rattachées aux comptes actifs.');
  auditGeneralAjouter_(controles,'Comptes','Épargne / placements reconstruits','info',soldeEpargne,null,'Soldes reconstruits des comptes de type épargne ou placement.');

  // 3. Charges fixes : source brute vs Analyses/CF0.
  const chargesActives = charges.filter(c=>auditGeneralActif_(c.actif));
  const totalChargesMensuel = auditGeneralArrondi_(chargesActives.reduce((s,c)=>s+auditGeneralMensualiserCharge_(c),0));
  auditGeneralAjouter_(controles,'Charges fixes','Charges actives source','info',chargesActives.length,null,'Nombre de références CF0 actives.');
  auditGeneralAjouter_(controles,'Charges fixes','Référence mensuelle source','info',totalChargesMensuel,null,'Mensualisation directe du référentiel Charges_fixes.');
  let liensCfInvalides=0;
  operations.forEach(o=>{const id=String(o.charge_fixe_id||'').trim();if(id&&!chargeIds.has(id))liensCfInvalides++;});
  auditGeneralAjouter_(controles,'Rapprochements','Liens opération → charge fixe',liensCfInvalides?'erreur':'ok',liensCfInvalides,0,'Toute charge_fixe_id d’une opération doit exister dans Charges_fixes.',true);

  // 4. Crédits et dettes.
  auditGeneralChronometre_(performances,'Crédits / dettes',()=>{
    const module = typeof chargerCreditsEtDettesV2==='function' ? chargerCreditsEtDettesV2() : null;
    if (!module) { auditGeneralAjouter_(controles,'Crédits','Moteur crédits disponible','erreur','indisponible','disponible','chargerCreditsEtDettesV2 introuvable.',true); return; }
    const capitalCredits = auditGeneralArrondi_(creditsBruts.reduce((s,c)=>s+Math.max(0,auditGeneralNombre_(c.capital_restant)),0));
    const dettesActives = dettesBrutes.filter(d=>auditGeneralActif_(d.actif)&&auditGeneralNombre_(d.capital_restant)>0);
    const capitalDettes = auditGeneralArrondi_(dettesActives.reduce((s,d)=>s+Math.max(0,auditGeneralNombre_(d.capital_restant)),0));
    const mensualitesCredits = auditGeneralArrondi_(creditsBruts.reduce((s,c)=>s+Math.max(0,auditGeneralNombre_(c.mensualite)),0));
    const mensualitesDettes = auditGeneralArrondi_(dettesActives.reduce((s,d)=>s+Math.max(0,auditGeneralNombre_(d.mensualite)),0));
    auditGeneralComparer_(controles,'Crédits','Capital crédits',capitalCredits,module.capitalCredits,.01,true);
    auditGeneralComparer_(controles,'Crédits','Dettes hors crédit actives',capitalDettes,module.dettesHorsCredit,.01,true);
    auditGeneralComparer_(controles,'Crédits','Endettement total',capitalCredits+capitalDettes,module.endettementTotal,.01,true);
    auditGeneralComparer_(controles,'Crédits','Mensualités totales',mensualitesCredits+mensualitesDettes,module.mensualites,.01,true);
    (module.alertes||[]).forEach(a=>auditGeneralAjouter_(controles,'Crédits',String(a.nom||'Financement'),a.niveau==='attention'?'attention':'info',a.message,null,'Contrôle propre au module Crédits.'));
  });

  // Rapprochements des dettes : opération existante et utilisée une seule fois.
  const opDetteVues = {};
  dettesBrutes.forEach(d=>String(d.operations_rapprochees||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(id=>{opDetteVues[id]=(opDetteVues[id]||0)+1;}));
  const opDetteAbsentes=Object.keys(opDetteVues).filter(id=>!operationIds.has(id)).length;
  const opDetteDoublons=Object.values(opDetteVues).filter(n=>n>1).length;
  auditGeneralAjouter_(controles,'Rapprochements','Paiements de dettes existants',opDetteAbsentes?'erreur':'ok',opDetteAbsentes,0,'Les IDs mémorisés dans Dettes doivent exister dans Operations.',true);
  auditGeneralAjouter_(controles,'Rapprochements','Paiement de dette utilisé une seule fois',opDetteDoublons?'erreur':'ok',opDetteDoublons,0,'Une même opération bancaire ne doit pas diminuer deux dettes.',true);

  // 5. Patrimoine : recalcul indépendant depuis Actifs + comptes financiers.
  auditGeneralChronometre_(performances,'Patrimoine',()=>{
    if(typeof chargerPatrimoine!=='function'){auditGeneralAjouter_(controles,'Patrimoine','Moteur patrimoine disponible','erreur','indisponible','disponible','chargerPatrimoine introuvable.',true);return;}
    const p=chargerPatrimoine();
    const actifsDirect=auditGeneralArrondi_(actifs.reduce((s,a)=>s+Math.max(0,auditGeneralNombre_(a.valeur)),0));
    const livretsDirect=auditGeneralArrondi_(soldes.filter(c=>c.type==='epargne').reduce((s,c)=>s+Math.max(0,c.solde),0));
    const placementsDirect=auditGeneralArrondi_(soldes.filter(c=>c.type==='placement').reduce((s,c)=>s+Math.max(0,c.solde),0));
    auditGeneralComparer_(controles,'Patrimoine','Actifs patrimoniaux',actifsDirect,p.totalActifsPatrimoniaux,.01,true);
    auditGeneralComparer_(controles,'Patrimoine','Livrets',livretsDirect,p.totalLivrets,.01,true);
    auditGeneralComparer_(controles,'Patrimoine','Placements',placementsDirect,p.totalPlacements,.01,true);
    auditGeneralComparer_(controles,'Patrimoine','Total actifs',actifsDirect+livretsDirect+placementsDirect,p.totalActifs,.01,true);
  });

  // 6. Analyses : identités et raccordements aux sources.
  auditGeneralChronometre_(performances,'Analyses',()=>{
    if(typeof chargerAnalysesBudgetairesV23!=='function'){auditGeneralAjouter_(controles,'Analyses','Moteur Analyses disponible','erreur','indisponible','disponible','chargerAnalysesBudgetairesV23 introuvable.',true);return;}
    const a=chargerAnalysesBudgetairesV23(6), ps=Array.isArray(a.periodes)?a.periodes:[];
    const courante=a.courante||ps[ps.length-1]||{};
    const dd=auditGeneralDate_(courante.debut), df=auditGeneralDate_(courante.fin);
    auditGeneralAjouter_(controles,'Analyses','Cycle courant 28 → 27',dd&&df&&dd.getDate()===28&&df.getDate()===27?'ok':'erreur',dd&&df?auditGeneralDateIso_(dd)+' → '+auditGeneralDateIso_(df):'invalide','28 → 27','Frontière canonique des analyses.',true);
    const r=a.recettes||{}, fr=(r.fenetres||{})['6']||(r.fenetres||{})[6]||{};
    const sommeSources=auditGeneralArrondi_((fr.sources||[]).reduce((s,x)=>s+auditGeneralNombre_(x.montant),0));
    const prod=fr.producteurs||{}, sommeProducteurs=auditGeneralArrondi_(Object.keys(prod).reduce((s,k)=>s+auditGeneralNombre_(prod[k]),0));
    auditGeneralComparer_(controles,'Analyses','Revenus = somme des sources',sommeSources,fr.revenusEconomiques,.01,true);
    auditGeneralComparer_(controles,'Analyses','Revenus = somme des producteurs',sommeProducteurs,fr.revenusEconomiques,.01,true);
    const completes=ps.filter(p=>p&&p.periodeComplete!==false);
    if(completes.length&&courante.periodeComplete===false){
      const moyenneComplete=auditGeneralArrondi_(completes.reduce((s,p)=>s+auditGeneralNombre_(p.revenus),0)/completes.length);
      auditGeneralComparer_(controles,'Analyses','Moyenne recettes sur cycles complets',moyenneComplete,fr.moyenneMensuelle,.01,false,'Une période courante incomplète ne doit pas abaisser la moyenne affichée.');
    }
    const dep=a.depensesDetail||{}, fd=(dep.fenetres||{})['6']||(dep.fenetres||{})[6]||{}, alim=fd.alimentation||{}, sante=fd.sante||{};
    auditGeneralComparer_(controles,'Analyses','Charges fixes actives',chargesActives.length,dep.fixes&&dep.fixes.nombre,0,true);
    auditGeneralComparer_(controles,'Analyses','Charges fixes mensuelles',totalChargesMensuel,dep.fixes&&dep.fixes.montantMensuelReference,.02,true);
    auditGeneralComparer_(controles,'Analyses','Santé nette',auditGeneralNombre_(sante.soinsBruts)+auditGeneralNombre_(sante.couvertureMntAudiens)-auditGeneralNombre_(sante.remboursements),sante.coutNet,.01,true);
    auditGeneralComparer_(controles,'Analyses','Courses banque + Pluxee',auditGeneralNombre_(alim.coursesBanque)+auditGeneralNombre_(alim.pluxeeCourses),alim.coursesReelles,.01,true);
    auditGeneralComparer_(controles,'Analyses','Restaurants banque + Pluxee',auditGeneralNombre_(alim.restaurantsBanque)+auditGeneralNombre_(alim.pluxeeRestaurants),alim.restaurantsReels,.01,true);
    auditGeneralComparer_(controles,'Analyses','Total alimentation réelle',auditGeneralNombre_(alim.coursesReelles)+auditGeneralNombre_(alim.restaurantsReelles),alim.totalReel,.01,true);
    const fin=fd.financement||{};
    if(Object.keys(fin).length){
      auditGeneralComparer_(controles,'Analyses','Désendettement net estimé',auditGeneralNombre_(fin.capitalRembourseEstime)-auditGeneralNombre_(fin.reinjectionsCredit),fin.desendettementNetEstime,.01,true);
    }
  });

  // 7. Cerbère : invariants du cockpit réellement utilisé par l'UI.
  auditGeneralChronometre_(performances,'Cerbère',()=>{
    if(typeof chargerCerbereCockpit20260902!=='function'){auditGeneralAjouter_(controles,'Cerbère','Cockpit disponible','erreur','indisponible','disponible','chargerCerbereCockpit20260902 introuvable.',true);return;}
    const c=chargerCerbereCockpit20260902();
    if(!c||c.ok===false){auditGeneralAjouter_(controles,'Cerbère','Cockpit calculable','erreur',c&&c.erreur||'échec','ok','Le cockpit maître doit pouvoir être calculé.',true);return;}
    (c.periodes||[]).slice(0,2).forEach((p,i)=>{
      const lib='C'+(i+1), env=Array.isArray(p.enveloppes)?p.enveloppes:[], v=p.v37||{}, cp=v.cockpit20260902||{};
      const prevu=auditGeneralArrondi_(env.reduce((s,x)=>s+Math.max(0,auditGeneralNombre_(x.prevu)),0));
      const reel=auditGeneralArrondi_(env.reduce((s,x)=>s+Math.max(0,auditGeneralNombre_(x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:x.reelImpute)),0));
      const plan=auditGeneralArrondi_(env.reduce((s,x)=>s+Math.max(0,auditGeneralNombre_(x.planifie)),0));
      const dpt=auditGeneralArrondi_(env.reduce((s,x)=>{const r=Math.max(0,auditGeneralNombre_(x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:x.reelImpute)),pl=Math.max(0,auditGeneralNombre_(x.planifie)),pr=Math.max(0,auditGeneralNombre_(x.prevu));return s+Math.max(pr,r+pl);},0));
      auditGeneralComparer_(controles,'Cerbère',lib+' · molettes = budget réparti',prevu,cp.budgetRepartiMolettes,.02,true);
      auditGeneralComparer_(controles,'Cerbère',lib+' · reste P1',auditGeneralNombre_(cp.p1Total)-reel,cp.ret1,.02,true);
      auditGeneralComparer_(controles,'Cerbère',lib+' · marge à répartir',auditGeneralNombre_(cp.p1Total)-prevu,cp.margeARepartir,.02,true);
      auditGeneralComparer_(controles,'Cerbère',lib+' · DPt1',dpt,cp.dpt1,.02,true);
      auditGeneralComparer_(controles,'Cerbère',lib+' · surplus vs P0',auditGeneralNombre_(cp.p1Total)-auditGeneralNombre_(cp.p0Total),cp.surplusVsP0,.02,true);
      const pd=auditGeneralDate_(p.periode&&p.periode.debut), pf=auditGeneralDate_(p.periode&&p.periode.fin);
      auditGeneralAjouter_(controles,'Cerbère',lib+' · frontière 28 → 27',pd&&pf&&pd.getDate()===28&&pf.getDate()===27?'ok':'erreur',pd&&pf?auditGeneralDateIso_(pd)+' → '+auditGeneralDateIso_(pf):'invalide','28 → 27','Le cockpit doit respecter la frontière canonique.',true);
      if(plan<0) auditGeneralAjouter_(controles,'Cerbère',lib+' · Plan non négatif','erreur',plan,'≥ 0','Réserve Plan invalide.',true);
    });
    if(c.cf0&&c.cf0.nombreActives!=null) auditGeneralComparer_(controles,'Cerbère','CF0 · nombre de charges actives',chargesActives.length,c.cf0.nombreActives,0,false,'Écart possible seulement si CF0 applique explicitement un périmètre différent.');
  });

  // 8. Pluxee Cerbère : cohérence intrinsèque de l'allocation courante.
  auditGeneralChronometre_(performances,'Pluxee',()=>{
    if(typeof chargerPluxeeCerbere20260827!=='function')return;
    const p=chargerPluxeeCerbere20260827();
    if(!p||p.ok===false){auditGeneralAjouter_(controles,'Pluxee','Moteur Pluxee Cerbère','attention',p&&p.erreur||'indisponible','ok','Le contrôle Pluxee n’a pas pu être calculé.');return;}
    const al=p.allocation||{}, enveloppe=auditGeneralNombre_(p.enveloppe);
    auditGeneralComparer_(controles,'Pluxee','Allocation Courses + Restaurants',auditGeneralNombre_(al.Courses)+auditGeneralNombre_(al.Restaurants),enveloppe,.01,true);
    if(p.reelParCategorie){const reelTotal=Object.keys(p.reelParCategorie).reduce((s,k)=>s+Math.max(0,auditGeneralNombre_(p.reelParCategorie[k])),0);auditGeneralComparer_(controles,'Pluxee','Solde théorique',enveloppe-reelTotal,p.soldeTheorique,.02,false,'Le reliquat antérieur peut expliquer un écart avec le solde réel, pas avec le solde théorique.');}
  });

  // Temps d'exécution des moteurs : signalement, sans invalider les chiffres.
  performances.forEach(p=>{if(p.ms>15000)auditGeneralAjouter_(controles,'Performance',p.module,'attention',p.ms+' ms','≤ 15000 ms','Moteur lent pendant cet audit manuel.');});

  const erreurs=controles.filter(x=>x.niveau==='erreur').length;
  const attentions=controles.filter(x=>x.niveau==='attention').length;
  const oks=controles.filter(x=>x.niveau==='ok').length;
  const bloquants=controles.filter(x=>x.niveau==='erreur'&&x.bloquant).length;
  const score=Math.max(0,Math.round(100-erreurs*8-attentions*2));
  return {
    version:AUDIT_GENERAL_VERSION,
    maintenanceVersion:MAINTENANCE_VERSION,
    genereLe:Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Europe/Paris','dd/MM/yyyy HH:mm:ss'),
    dureeMs:Date.now()-t0,
    statut:bloquants?'erreur':erreurs||attentions?'attention':'ok',
    score,
    synthese:{controles:controles.length,oks,attentions,erreurs,bloquants},
    compteurs:{operations:operations.length,comptes:comptes.length,categories:categories.length,chargesFixes:charges.length,credits:creditsBruts.length,dettes:dettesBrutes.length,actifs:actifs.length},
    performances,
    controles
  };
}

function auditGeneralChronometre_(perf,module,fn){const t=Date.now();try{fn();}catch(e){perf.push({module,ms:Date.now()-t,erreur:String(e&&e.message||e)});throw e;}finally{if(!perf.some(x=>x.module===module))perf.push({module,ms:Date.now()-t});}}
function auditGeneralAjouter_(arr,domaine,controle,niveau,source,module,message,bloquant){arr.push({domaine,controle,niveau:niveau||'info',source:auditGeneralValeur_(source),module:auditGeneralValeur_(module),ecart:null,message:message||'',bloquant:!!bloquant});}
function auditGeneralComparer_(arr,domaine,controle,source,module,tolerance,bloquant,message){const a=Number(source),b=Number(module),tol=Number(tolerance||0),valid=Number.isFinite(a)&&Number.isFinite(b),ecart=valid?auditGeneralArrondi_(b-a):null,niveau=valid&&Math.abs(ecart)<=tol?'ok':(bloquant?'erreur':'attention');arr.push({domaine,controle,niveau,source:auditGeneralValeur_(source),module:auditGeneralValeur_(module),ecart:auditGeneralValeur_(ecart),message:message||'Comparaison source brute ↔ moteur BudgetSoft.',bloquant:!!bloquant});}
function auditGeneralValeur_(v){if(v===null||v===undefined||v==='')return null;if(typeof v==='number')return auditGeneralArrondi_(v);if(v instanceof Date)return auditGeneralDateIso_(v);return String(v);}
function auditGeneralNombre_(v){if(typeof convertirNombre_==='function')return convertirNombre_(v||0);const n=Number(String(v==null?'':v).replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:0;}
function auditGeneralArrondi_(n){n=Number(n);return Number.isFinite(n)?Math.round(n*100)/100:0;}
function auditGeneralActif_(v){if(typeof convertirBooleen_==='function')return convertirBooleen_(v);if(v===false||v===0||v===null||v===undefined)return false;return !['0','false','non','no','inactif','inactive'].includes(String(v).trim().toLowerCase());}
function auditGeneralDate_(v){if(!v)return null;const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d.getTime())?null:d;}
function auditGeneralDateIso_(d){return Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');}
function auditGeneralIdsUniques_(lignes){const ids=(lignes||[]).map(x=>String(x.id||'').trim()).filter(Boolean);return ids.length===new Set(ids).size;}
function auditGeneralMensualiserCharge_(c){const m=Math.abs(auditGeneralNombre_(c&&c.montant)),f=normaliserTexteMaintenance_(c&&c.frequence);if(f.indexOf('annu')>=0)return m/12;if(f.indexOf('trimes')>=0)return m/3;if(f.indexOf('semestr')>=0)return m/6;if(f.indexOf('bimes')>=0)return m/2;if(f.indexOf('hebdo')>=0)return m*52/12;if(f.indexOf('quotid')>=0)return m*365/12;return m;}
function auditGeneralDoublonsOperations_(ops){const vus=new Set();let n=0;(ops||[]).forEach(o=>{const d=auditGeneralDate_(o.date_comptable||o.date),k=[d?auditGeneralDateIso_(d):'',normaliserTexteMaintenance_(o.libelle_bancaire||o.libelle),Math.abs(auditGeneralNombre_(o.montant)).toFixed(2),String(o.compte||'')].join('|');if(vus.has(k))n++;else vus.add(k);});return n;}

function ajouterDoublonsNoms_(lignes, champ, libelle, anomalies) {
  const vus = {};
  lignes.forEach((ligne, index) => {
    const cle = normaliserTexteMaintenance_(ligne[champ]);
    if (!cle) return;
    if (vus[cle]) anomalies.push({ niveau:'attention', domaine:'Doublons', message:libelle + ' : lignes ' + vus[cle] + ' et ' + (index + 2) + '.' });
    else vus[cle] = index + 2;
  });
}

function normaliserTexteMaintenance_(valeur) {
  return String(valeur || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
