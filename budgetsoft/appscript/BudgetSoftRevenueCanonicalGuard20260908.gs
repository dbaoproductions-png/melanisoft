const BUDGETSOFT_REVENUE_CANONICAL_GUARD_20260908_VERSION='2026-09-08.1';

function normaliserCategorieGardeRecetteBudgetSoft20260908_(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function jourHabituelRecetteCanonGardeBudgetSoft20260908_(ops,reference,categorie,montant){
  const cat=String(categorie||'').trim(),base=Math.abs(Number(montant||0));
  const hist=(ops||[]).map(o=>({o:o,d:dateOpTresorerie_(o),m:Math.abs(typeof montantSigneOperationRevenuBudgetSoft20260908_==='function'?montantSigneOperationRevenuBudgetSoft20260908_(o):Number(o&&o.montant||0))}))
    .filter(x=>x.d&&x.d<=reference&&x.d>=new Date(reference.getFullYear(),reference.getMonth()-6,1)
      &&(typeof montantSigneOperationRevenuBudgetSoft20260908_==='function'?montantSigneOperationRevenuBudgetSoft20260908_(x.o)>0:Number(x.o&&x.o.montant||0)>0)
      &&normaliserCategorieGardeRecetteBudgetSoft20260908_(x.o&&x.o.categorie||'')===normaliserCategorieGardeRecetteBudgetSoft20260908_(cat));
  const significatifs=hist.filter(x=>x.m>=Math.max(20,base*.35));
  const jours=(significatifs.length?significatifs:hist).map(x=>x.d.getDate()).sort((a,b)=>a-b);
  return Math.max(1,Math.min(28,jours.length?jours[Math.floor(jours.length/2)]:15));
}

/**
 * Garde métier R0 indépendante de la simple réconciliation arithmétique.
 *
 * Invariants :
 *  - une recette structurelle échue et non remplacée par le Réel reste projetée ;
 *  - une recette structurelle déjà encaissée dans le mois ne reste pas projetée
 *    une seconde fois pour le même mois ;
 *  - le montant canonique reste une estimation. Pour une recette déclarée variable
 *    (France Travail), il ne participe pas au rapprochement avec le Réel.
 */
function auditerGardeRecettesCanoniquesBudgetSoft20260908(projection){
  const erreurs=[],details=[];
  function err(code,message,detail){erreurs.push({code:code,message:message,detail:detail||null});}
  const p=projection&&typeof projection==='object'?projection:null;
  if(!p||!Array.isArray(p.lignes)){
    return {ok:false,version:'2026-09-22.1',erreurs:[{code:'PROJECTION_ABSENTE',message:'La trajectoire canonique est absente ou sans lignes.'}],details:[]};
  }
  const reference=new Date(p.dateReference||0),cible=new Date(p.dateCible||0);
  if(isNaN(reference)||isNaN(cible)){
    return {ok:false,version:'2026-09-22.1',erreurs:[{code:'DATES_INVALIDES',message:'Les dates de référence/cible de la trajectoire sont invalides.'}],details:[]};
  }
  const finCycle=typeof dateFinCycleCanonBudgetSoft20260906_==='function'
    ?dateFinCycleCanonBudgetSoft20260906_(reference)
    :new Date(reference.getDate()<=27?reference.getFullYear():reference.getFullYear(),reference.getDate()<=27?reference.getMonth():reference.getMonth()+1,27,23,59,59,999);

  const r0Courant=(p.lignes||[]).filter(function(x){
    if(String(x&&x.source||'')!=='revenu_recurrent')return false;
    const d=new Date(x&&x.date||0);return !isNaN(d)&&d>reference&&d<=finCycle;
  });
  details.push({type:'R0_cycle_courant',nombre:r0Courant.length,lignes:r0Courant.map(function(x){return{sourceId:x.sourceId,date:x.date,montant:x.montantSigne};})});
  if(r0Courant.length)err('R0_CYCLE_COURANT_INTERDIT','Le cycle courant contient encore des recettes R0 implicites.',details[details.length-1]);

  let evs=[];try{evs=lireFeuilleDynamiquePlan_('Plan_Evenements')||[];}catch(e){evs=[];}
  const ouvertes=evs.filter(function(ev){
    if(String(ev&&ev.type||'').trim().toLowerCase()!=='recette')return false;
    if(typeof evenementClosProuveRevenuePublicationFix20260912_==='function'&&evenementClosProuveRevenuePublicationFix20260912_(ev))return false;
    const cert=String(ev&&ev.certitude||'certaine').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(['incertaine','incertain','hypothetique'].includes(cert))return false;
    let d=null;try{const dr=datePlanTresorerie_(ev,reference,false);d=dr&&dr.date?new Date(dr.date):null;}catch(e){}
    if(!d||isNaN(d))d=new Date(ev&&ev.date_effet||ev&&ev.date_prevue||0);
    return !isNaN(d)&&d<=finCycle;
  });
  ouvertes.forEach(function(ev){
    const id=String(ev&&ev.id||''),trouve=(p.lignes||[]).some(function(x){
      const d=new Date(x&&x.date||0);
      return String(x&&x.source||'')==='evenement'&&String(x&&x.sourceId||'')===id&&!isNaN(d)&&d>reference&&d<=cible&&Number(x&&x.montantSigne||0)>0;
    });
    const detail={id:id,libelle:String(ev&&ev.libelle||''),montant:Math.abs(Number(ev&&ev.montant||0)),datePrevue:String(ev&&ev.date_effet||ev&&ev.date_prevue||''),presenteProjection:trouve};
    details.push(detail);
    if(!trouve)err('EVENEMENT_RECETTE_DU_ABSENT','Une recette Plan encore due a disparu de la projection.',detail);
  });

  return {
    ok:erreurs.length===0,
    version:'2026-09-22.1',
    dateReference:p.dateReference||'',
    dateCible:p.dateCible||'',
    doctrine:'Cycle courant = aucun complément implicite vers R0 ; seules les recettes Plan ouvertes restent dues. Une date dépassée ne clôt jamais un événement.',
    erreurs:erreurs,
    details:details
  };
}

function auditerGardeRecettesCanoniques30092026BudgetSoft20260908(){
  const p=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907('2026-09-30');
  const r=auditerGardeRecettesCanoniquesBudgetSoft20260908(p);
  console.log('[AUDIT Garde R0] '+JSON.stringify(r));
  return r;
}

/**
 * Garde snapshot du candidat RAPPRO_CF pur. La substitution est temporaire :
 * elle ne modifie ni le lecteur de production ni la feuille. Elle réutilise la garde
 * complète déjà validée pour le chemin snapshot (sources partagées -> V374 ->
 * projection -> cockpit -> Express -> dashboard) et la force à lire RAPPRO_CF sans
 * initialisation/formatage.
 */
function auditerGardesCandidatRapproCfPurSnapshotBudgetSoft20260912(){
  const version='2026-09-12.4',t0=Date.now();
  const original=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes:null;
  let resultat=null,erreur=null;
  function lirePur_(){
    if(typeof lireFeuilleDynamiqueCerbereV379_!=='function')throw new Error('Lecteur dynamique Cerbère indisponible.');
    const dyn=lireFeuilleDynamiqueCerbereV379_(typeof FIXED_CHARGE_MATCH_SHEET!=='undefined'?FIXED_CHARGE_MATCH_SHEET:'Rapprochements_charges_fixes')||[];
    const headers=typeof FIXED_CHARGE_MATCH_HEADERS!=='undefined'?FIXED_CHARGE_MATCH_HEADERS:null;
    if(!headers)return dyn;
    return dyn.map(function(o){const z={};headers.forEach(function(h){z[h]=o&&Object.prototype.hasOwnProperty.call(o,h)?o[h]:'';});return z;});
  }
  function resume_(g){
    if(!g)return{ok:false,version:'',erreurs:null};
    return{ok:g.ok===true,version:String(g.version||''),erreurs:Array.isArray(g.erreurs)?g.erreurs.length:null};
  }
  try{
    if(!original)throw new Error('lireRapprochementsChargesFixes indisponible.');
    if(typeof auditerGardesCandidatCerbereSnapshotDonneesPartageesBudgetSoft20260911!=='function')throw new Error('Garde snapshot complète 2026-09-11.9 indisponible.');
    lireRapprochementsChargesFixes=lirePur_;
    resultat=auditerGardesCandidatCerbereSnapshotDonneesPartageesBudgetSoft20260911();
  }catch(e){erreur=String(e&&e.stack||e&&e.message||e);}finally{
    if(original)lireRapprochementsChargesFixes=original;
  }
  const candidat=resultat&&resultat.candidat||{},gardes=resultat&&resultat.gardes||{};
  const ok=!erreur&&!!resultat&&resultat.ok===true&&candidat.sourcesMutees===false;
  const out={
    ok:ok,version:version,lectureSeule:true,aucuneModification:true,aucunePublication:true,
    perimetre:{compare:'candidat RAPPRO_CF pur dans le chemin complet du snapshot',sourceVerite:'garde snapshot 2026-09-11.9 + V374 3.7.24',prealable:'A/B 2026-09-12.3 : identité métier stricte, gain 28.3 % sur l’exécution observée'},
    candidat:{versionCerbere:String(candidat.versionCerbere||''),versionProjection:String(candidat.versionProjection||''),projectionOwner:String(candidat.projectionOwner||''),versionExpress:String(candidat.versionExpress||''),sourcesMutees:!!candidat.sourcesMutees},
    gardes:{recettes:resume_(gardes.recettes),cbMultiCycle:resume_(gardes.cbMultiCycle),uniteTresorerie:resume_(gardes.uniteTresorerie),contratCanonique:resume_(gardes.contratCanonique),coherenceRevision:resume_(gardes.coherenceRevision)},
    performance:resultat&&resultat.performance||null,
    signature:resultat&&resultat.signature||null,
    erreur:erreur,
    decision:ok?'CANDIDAT_RAPPRO_CF_PUR_AUTORISE_POUR_INTEGRATION_MINIMALE':'CANDIDAT_RAPPRO_CF_PUR_REFUSE_PAR_GARDES',
    dureeTotaleMs:Date.now()-t0,
    doctrine:'Aucune écriture. Intégrer seulement si toutes les gardes du chemin snapshot restent vertes ; conserver l’initialisation/formatage dans les chemins de création ou modification de la feuille.'
  };
  console.log('[AUDIT GARDES candidat RAPPRO_CF pur snapshot] '+JSON.stringify(out));return out;
}
