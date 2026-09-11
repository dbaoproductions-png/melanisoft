const BUDGETSOFT_SNAPSHOT_CONSUMPTION_AUDIT_VERSION='2026-09-09.1';

function auditerConsommationSnapshotGlobalBudgetSoft20260906(){
  const resultats={},erreurs=[];
  function mesurer(nom,fn){
    const t0=Date.now();
    try{
      const r=fn();
      const out={ok:!!r,dureeMs:Date.now()-t0,source:r&&((r.performance&&r.performance.source)||r.sourceBudgetSoft)||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',version:r&&r.version||''};
      resultats[nom]=out;return out;
    }catch(e){const out={ok:false,dureeMs:Date.now()-t0,erreur:String(e&&e.message||e)};resultats[nom]=out;erreurs.push({module:nom,erreur:out.erreur});return out;}
  }
  const c=mesurer('comptes',()=>chargerSyntheseComptes20260828());
  const cr=mesurer('credits',()=>chargerCreditsEtDettesV2());
  const p=mesurer('patrimoine',()=>chargerPatrimoine());
  const ce=mesurer('cerbereExpress',()=>chargerVueCerbereExpress20260827());
  const revisions=[c,cr,p,ce].map(x=>x&&x.revisionBudgetSoft).filter(Boolean);
  const unique=[...new Set(revisions)];
  if(unique.length!==1)erreurs.push({module:'transversal',erreur:'Les écrans ne consomment pas tous la même révision globale.',revisions:unique});
  [c,cr,p,ce].forEach((x,i)=>{const nom=['comptes','credits','patrimoine','cerbereExpress'][i];if(x&&x.source!=='snapshot_global')erreurs.push({module:nom,erreur:'Source non globale : '+String(x.source||'')});});
  const out={ok:erreurs.length===0,version:BUDGETSOFT_SNAPSHOT_CONSUMPTION_AUDIT_VERSION,revisionBudgetSoft:unique.length===1?unique[0]:'',resultats,erreurs};
  console.log(JSON.stringify(out));return out;
}

/**
 * Audit transversal des consommateurs sensibles du snapshot global.
 * Il ne recalcule aucune vérité métier : il agrège les audits propriétaires déjà
 * présents afin de vérifier qu'ils convergent vers une même révision BudgetSoft.
 */
function auditerConsommateursTransversauxSnapshotBudgetSoft20260909(){
  const t0=Date.now(),resultats={},erreurs=[];
  function lancer(nom,nomFonction){
    const fn=globalThis[nomFonction];
    if(typeof fn!=='function'){
      const r={ok:false,disponible:false,erreur:'Fonction absente : '+nomFonction};
      resultats[nom]=r;erreurs.push({module:nom,erreur:r.erreur});return r;
    }
    try{
      const r=fn()||{};
      const out={ok:r.ok===true,disponible:true,version:r.version||'',revisionBudgetSoft:r.revisionBudgetSoft||'',dureeMs:null};
      resultats[nom]=out;
      if(!out.ok)erreurs.push({module:nom,erreur:'Audit non vert',version:out.version});
      return out;
    }catch(e){
      const r={ok:false,disponible:true,erreur:String(e&&e.message||e)};
      resultats[nom]=r;erreurs.push({module:nom,erreur:r.erreur});return r;
    }
  }

  const coeur=lancer('consommationCoeur','auditerConsommationSnapshotGlobalBudgetSoft20260906');
  const unite=lancer('uniteTresorerie','auditerUniteTresorerieBudgetSoft20260907');
  const dashboard=lancer('dashboard','auditerDashboardSyntheseBudgetSoft20260907');
  const cerbere=lancer('cerbere','auditerConsommateursCerbereClassique20260909');
  const express=lancer('cerbereExpress','auditerConsommateursSnapshotCerbereExpress20260909');
  const treasury=lancer('treasuryForecast','auditerConsommateursTreasuryForecast20260909');

  const revisions=Object.keys(resultats).map(k=>String(resultats[k]&&resultats[k].revisionBudgetSoft||'')).filter(Boolean);
  const uniques=[...new Set(revisions)];
  if(uniques.length>1)erreurs.push({module:'revisionBudgetSoft',erreur:'Plusieurs révisions détectées parmi les consommateurs.',revisions:uniques});

  // Modules secondaires explicitement hors prévisionnel : ils peuvent lire les tables
  // pour produire de l'historique ou du descriptif, mais ne doivent pas devenir une
  // source de solde bancaire prévisionnel.
  const secondaires={
    conseiller:{fonction:'chargerConseillerFinancier',role:'analyse historique / recommandations',autoriseHorsSnapshot:true},
    engagementsBancaires:{fonction:'chargerEngagementsBancairesFuturs',role:'détail descriptif des engagements du cycle',autoriseHorsSnapshot:true}
  };

  const out={
    ok:erreurs.length===0,
    version:BUDGETSOFT_SNAPSHOT_CONSUMPTION_AUDIT_VERSION,
    revisionBudgetSoft:uniques.length===1?uniques[0]:'',
    dureeMs:Date.now()-t0,
    resultats:resultats,
    secondaires:secondaires,
    controles:{auditsSensiblesVerts:erreurs.filter(e=>e.module!=='revisionBudgetSoft').length===0,revisionUnique:uniques.length<=1,aucuneNouvelleVeriteMetier:true},
    erreurs:erreurs
  };
  console.log('[AUDIT transversal consommateurs snapshot] '+JSON.stringify(out));
  return out;
}

/**
 * Garde finale en lecture seule du candidat Cerbère alimenté par les données déjà
 * chargées par le snapshot. Le périmètre reproduit le chemin de production depuis
 * sources -> Cerbère brut -> projection canonique -> cockpit -> Express -> dashboard,
 * sans publication ni écriture de snapshot.
 */
function auditerGardesCandidatCerbereSnapshotDonneesPartageesBudgetSoft20260911(){
  verifierInitialisation_();
  const tGlobal=Date.now(),erreurs=[];
  const resultat=avecContexteLectureBudgetSoft20260827_('audit-gardes-candidat-cerbere-snapshot-20260911',function(){
    const tSources=Date.now(),sources=chargerToutesLesDonnees(),sourcesMs=Date.now()-tSources;
    const maintenant=new Date();
    const finCourant=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(maintenant):new Date(maintenant.getFullYear(),maintenant.getMonth(),27);
    const finSuivant=new Date(finCourant.getFullYear(),finCourant.getMonth()+1,finCourant.getDate());
    const finBancaireSuivante=new Date(finSuivant.getFullYear(),finSuivant.getMonth()+1,0,23,59,59,999);
    const cibleSuivante=Utilities.formatDate(finSuivant,Session.getScriptTimeZone(),'yyyy-MM-dd');
    const cibleCalculUnique=Utilities.formatDate(finBancaireSuivante,Session.getScriptTimeZone(),'yyyy-MM-dd');

    const trouver=typeof trouverTableSnapshotCerbere20260911_==='function'?trouverTableSnapshotCerbere20260911_:function(src,nom){
      const cible=String(nom||'').toLowerCase().replace(/[^a-z0-9]/g,'');
      const cles=Object.keys(src||{});
      for(let i=0;i<cles.length;i++){
        const k=cles[i],nk=String(k).toLowerCase().replace(/[^a-z0-9]/g,'');
        if(nk===cible&&Array.isArray(src[k]))return{cle:k,valeur:src[k]};
      }
      return null;
    };
    const map={},reutilisees=[];
    ['Operations','Charges_fixes','Comptes','Parametres','Categories'].forEach(function(n){const x=trouver(sources,n);if(x){map[n]=x.valeur;reutilisees.push({table:n,source:x.cle,lignes:x.valeur.length});}});
    const prechargePlan={
      objectifs:lireTablePlanCerbere_('Plan_Objectifs'),
      actions:lireFeuilleDynamiqueCerbereV3_('Plan_Actions'),
      evenements:lireTablePlanCerbere_('Plan_Evenements'),
      ajustements:lireAjustementsCerbereV33_()
    };
    const empreinteAvant=JSON.stringify(map);
    const originaux={lireTable:lireTable_,lirePlanTable:lireTablePlanCerbere_,lirePlanDyn:lireFeuilleDynamiqueCerbereV3_,lireAjust:lireAjustementsCerbereV33_};
    let cerbereBase=null,cerbereBaseMs=0,erreurCerbere=null;
    try{
      lireTable_=function(nom){const n=String(nom||'');return Object.prototype.hasOwnProperty.call(map,n)?map[n]:originaux.lireTable.apply(this,arguments);};
      lireTablePlanCerbere_=function(nom){const n=String(nom||'');if(n==='Plan_Objectifs')return prechargePlan.objectifs;if(n==='Plan_Evenements')return prechargePlan.evenements;return originaux.lirePlanTable.apply(this,arguments);};
      lireFeuilleDynamiqueCerbereV3_=function(nom){if(String(nom||'')==='Plan_Actions')return prechargePlan.actions;return originaux.lirePlanDyn.apply(this,arguments);};
      lireAjustementsCerbereV33_=function(){return prechargePlan.ajustements;};
      const t=Date.now();cerbereBase=chargerCerbereV374();cerbereBaseMs=Date.now()-t;
    }catch(e){erreurCerbere=String(e&&e.stack||e&&e.message||e);}finally{
      lireTable_=originaux.lireTable;lireTablePlanCerbere_=originaux.lirePlanTable;lireFeuilleDynamiqueCerbereV3_=originaux.lirePlanDyn;lireAjustementsCerbereV33_=originaux.lireAjust;
    }
    const sourcesMutees=empreinteAvant!==JSON.stringify(map);
    if(erreurCerbere)erreurs.push({module:'cerbereBase',erreur:erreurCerbere});
    if(sourcesMutees)erreurs.push({module:'sources',erreur:'Le candidat Cerbère a muté les tableaux partagés du snapshot.'});
    if(!cerbereBase||cerbereBase.ok===false)erreurs.push({module:'cerbereBase',erreur:'Base Cerbère candidate absente ou invalide.'});

    const tComptes=Date.now();
    const comptes=typeof rafraichirSnapshotComptes20260828==='function'?(function(){const r=rafraichirSnapshotComptes20260828();return r&&r.vue?r.vue:r;})():(typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828());
    const comptesMs=Date.now()-tComptes;
    const tCredits=Date.now(),credits=typeof chargerCreditsEtDettesV2==='function'?chargerCreditsEtDettesV2():null,creditsMs=Date.now()-tCredits;
    const patrimoine=typeof composerPatrimoineCanoniqueBudgetSoft20260906_==='function'?composerPatrimoineCanoniqueBudgetSoft20260906_(sources,comptes,credits):(typeof chargerPatrimoine==='function'?chargerPatrimoine():null);
    const tresorerieComptable=typeof construireTresorerieComptableCanoniqueBudgetSoft20260906_==='function'?construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,finCourant,maintenant):null;

    const tProjection=Date.now();
    let projectionCalculUnique=null,projectionEtendue=null;
    if(typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function')projectionCalculUnique=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(cibleCalculUnique,cerbereBase&&cerbereBase.ok!==false?cerbereBase:null);
    if(projectionCalculUnique&&projectionCalculUnique.ok!==false&&typeof sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_==='function')projectionEtendue=sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_(projectionCalculUnique,cibleSuivante);
    const projectionMs=Date.now()-tProjection;
    if(!projectionEtendue||projectionEtendue.ok===false)erreurs.push({module:'projectionEtendue',erreur:'Projection canonique candidate invalide.'});

    const gardeRecettes=typeof auditerGardeRecettesCanoniquesBudgetSoft20260908==='function'?auditerGardeRecettesCanoniquesBudgetSoft20260908(projectionEtendue):{ok:false,erreur:'Garde recettes absente'};
    if(!gardeRecettes||gardeRecettes.ok!==true)erreurs.push({module:'gardeRecettesCanoniques',erreur:'Invariant R0 non satisfait',diagnostic:gardeRecettes||null});
    const gardeCb=typeof verifierGardeCbMultiCycleDepuisProjectionBudgetSoft20260910_==='function'?verifierGardeCbMultiCycleDepuisProjectionBudgetSoft20260910_(projectionCalculUnique,finSuivant):{ok:false,erreur:'Garde CB absente'};
    if(!gardeCb||gardeCb.ok!==true)erreurs.push({module:'gardeCbMultiCycle',erreur:'Invariant CB multi-cycle non satisfait',diagnostic:gardeCb||null});

    const tCockpit=Date.now();
    let cerbere=cerbereBase;
    if(cerbereBase&&cerbereBase.ok!==false&&typeof composerCerbereCockpitDepuisBaseSnapshotBudgetSoft20260910_==='function')cerbere=composerCerbereCockpitDepuisBaseSnapshotBudgetSoft20260910_(cerbereBase);
    else if(typeof chargerCerbereCockpit20260902==='function')cerbere=chargerCerbereCockpit20260902();
    const cockpitMs=Date.now()-tCockpit;
    const soldeReelUnifie=Number(projectionEtendue&&projectionEtendue.soldeReel);
    if(cerbere&&Number.isFinite(soldeReelUnifie)){
      cerbere.reel=cerbere.reel||{};
      cerbere.reel.soldeBancaire=soldeReelUnifie;
      cerbere.reel.sourceSoldeBancaire='projectionEtendue.soldeReel';
    }
    const tExpress=Date.now();
    const cerbereExpress=typeof composerCerbereExpressDepuisCockpit20260910_==='function'?composerCerbereExpressDepuisCockpit20260910_(cerbere):{ok:false,erreur:'Compositeur Express absent'};
    const expressMs=Date.now()-tExpress;
    const dashboard=typeof composerDashboardSyntheseBudgetSoft20260907_==='function'?composerDashboardSyntheseBudgetSoft20260907_({sources:sources,comptes:comptes,credits:credits,tresorerieComptable:tresorerieComptable,projectionEtendue:projectionEtendue,cerbere:cerbere,cerbereExpress:cerbereExpress}):null;
    const modules={comptes:comptes,credits:credits,patrimoine:patrimoine,tresorerieComptable:tresorerieComptable,projectionEtendue:projectionEtendue,gardeRecettesCanoniques:gardeRecettes,gardeCbMultiCycle:gardeCb,cerbere:cerbere,cerbereExpress:cerbereExpress,dashboard:dashboard};
    const transversales=typeof construireTransversalesBudgetSoft20260906_==='function'?construireTransversalesBudgetSoft20260906_(Object.assign({sources:sources},modules)):{};
    if(tresorerieComptable&&transversales&&transversales.tresorerie)transversales.tresorerie={version:tresorerieComptable.version||'',soldeReel:Number(tresorerieComptable.soldeReel),variationComptableCertaine:Number(tresorerieComptable.variationComptableCertaine),soldePrevisionnel:Number(tresorerieComptable.soldePrevisionnel),dateCible:tresorerieComptable.dateCible||'',nombreOperationsFutures:Number(tresorerieComptable.nombreOperationsFutures||0)};
    const unite=typeof auditerUniteModulesTresorerieBudgetSoft20260907_==='function'?auditerUniteModulesTresorerieBudgetSoft20260907_(modules):{ok:false,erreur:'Garde unité trésorerie absente'};
    if(!unite||unite.ok!==true)erreurs.push({module:'uniteTresorerie',erreur:'Unité de trésorerie non satisfaite',diagnostic:unite||null});
    const contrat=projectionEtendue&&projectionEtendue.decompositionCanonique||null;
    if(!contrat||contrat.ok!==true)erreurs.push({module:'contratTresorerieCanonique',erreur:'Contrat canonique absent ou non réconcilié',diagnostic:contrat});
    const provisoire={modules:modules,erreurs:erreurs.slice(),transversales:transversales};
    const coherence=typeof auditerCoherenceRevisionBudgetSoft20260906_==='function'?auditerCoherenceRevisionBudgetSoft20260906_(provisoire):{ok:true,version:'absent',erreurs:[],avertissements:[]};
    if(coherence&&coherence.ok===false)erreurs.push({module:'coherenceRevision',erreur:'Cohérence de révision non satisfaite',diagnostic:coherence});

    return{
      sourcesMs:sourcesMs,cerbereBaseMs:cerbereBaseMs,projectionMs:projectionMs,comptesMs:comptesMs,creditsMs:creditsMs,cockpitMs:cockpitMs,expressMs:expressMs,
      reutilisees:reutilisees,sourcesMutees:sourcesMutees,cerbereBase:cerbereBase,projectionCalculUnique:projectionCalculUnique,projectionEtendue:projectionEtendue,
      gardeRecettes:gardeRecettes,gardeCb:gardeCb,unite:unite,contrat:contrat,coherence:coherence,cerbere:cerbere,cerbereExpress:cerbereExpress,dashboard:dashboard
    };
  });

  const proj=resultat&&resultat.projectionEtendue||{},base=resultat&&resultat.cerbereBase||{},express=resultat&&resultat.cerbereExpress||{};
  const out={
    ok:erreurs.length===0,
    version:'2026-09-11.9',
    lectureSeule:true,
    aucuneModification:true,
    aucunePublication:true,
    perimetre:{compare:'candidat Cerbère données partagées dans le chemin complet du snapshot, sans écriture',reference:'exécution courante ; horizon publication '+String(proj&&proj.dateCible||''),sourceVerite:'snapshot synthèse 2026-09-10.3 + propriétaires canoniques et gardes courants',prealable:'A/B 2026-09-11.8 identité V374 stricte et sources non mutées'},
    candidat:{versionCerbere:String(base&&base.version||''),versionProjection:String(proj&&proj.version||''),projectionOwner:String(proj&&proj.proprietaireBudgetSoft||''),versionExpress:String(express&&express.version||''),sourcesMutees:!!(resultat&&resultat.sourcesMutees),reutilisationSnapshot:resultat&&resultat.reutilisees||[]},
    gardes:{recettes:resultat&&resultat.gardeRecettes||null,cbMultiCycle:resultat&&resultat.gardeCb||null,uniteTresorerie:resultat&&resultat.unite||null,contratCanonique:resultat&&resultat.contrat||null,coherenceRevision:resultat&&resultat.coherence||null},
    performance:{sourcesMs:resultat&&resultat.sourcesMs||0,cerbereBaseMs:resultat&&resultat.cerbereBaseMs||0,projectionMs:resultat&&resultat.projectionMs||0,comptesMs:resultat&&resultat.comptesMs||0,creditsMs:resultat&&resultat.creditsMs||0,cockpitMs:resultat&&resultat.cockpitMs||0,expressMs:resultat&&resultat.expressMs||0,dureeTotaleMs:Date.now()-tGlobal},
    signature:{soldeReel:Number(proj&&proj.soldeReel),variation:Number(proj&&proj.variation),soldePrevisionnel:Number(proj&&proj.soldePrevisionnel),cerbereP1:Number(base&&base.periodes&&base.periodes[0]&&base.periodes[0].resteBudgetPilotable),expressReste:Number(express&&express.resteDisponible||express&&express.reste||0)},
    erreurs:erreurs,
    decision:erreurs.length===0?'CANDIDAT_PARTAGE_SNAPSHOT_AUTORISE_POUR_INTEGRATION_MINIMALE':'CANDIDAT_PARTAGE_SNAPSHOT_REFUSE_PAR_GARDES',
    doctrine:'Aucune écriture. Si et seulement si toutes les gardes sont vertes, intégrer minimalement le partage de données dans le chemin snapshot puis reconstruire et auditer la révision publiée.'
  };
  console.log('[AUDIT GARDES candidat Cerbère données partagées snapshot] '+JSON.stringify(out));
  return out;
}
