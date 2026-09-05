/*
 * Cerbère 3.7.4 — pont Planification -> Cerbère.
 * Complément ciblé : Actions + Événements pondèrent la période ;
 * une occurrence rapprochée/réalisée quitte le prévisionnel afin que le Réel
 * prenne seul sa place. Ne modifie ni l'infrastructure ni les référentiels maître.
 *
 * Ce fichier surcharge uniquement previsionsEvenementsV371_ utilisée par
 * CerbereV37.gs. Le préfixe ZZZZ garantit qu'il est chargé après le socle dans
 * le projet Apps Script synchronisé selon le circuit existant.
 */

function previsionsEvenementsV371_(events,periode,p0Cats,catType){
  const out={recettesInitiales:0,recettesFutures:0,depensesFutures:0,depensesHorsPilotable:0,depensesHorsPilotableFutures:0,remboursementsSante:0,depensesPilotablesParCategorie:{},recettesActions:0,depensesActions:0,actionsRetenues:0,evenementsRetenus:0,previsionsNeutraliseesParReel:0};
  const maintenant=new Date();
  function estNeutralise_(x){const statut=normaliserV37_(x.statut||''),rappro=normaliserV37_(x.rapprochement_statut||'');return !!String(x.operation_reelle_id||'').trim()||rappro==='rapproche'||['rapproche','realise','effective','effectif','annule','abandonnee','abandonne'].includes(statut);}
  function ajouterOccurrence_(x,o,source){let impact=o.date;const typeExplicite=normaliserV37_(x.type||x.sens||''),impactType=normaliserV37_(x.impact_type||''),nature=normaliserV37_(x.nature_action||''),estRecette=typeExplicite==='recette'||impactType==='hausse revenu'||nature==='encaisser'||nature==='recouvrer',estDepense=typeExplicite==='depense'||['acheter','rembourser','reserver','investir','payer'].includes(nature);if(source==='Action'&&!estRecette&&!estDepense)return;if(!estRecette&&normaliserV37_(x.mode_paiement)==='cb')impact=dateImpactCbPlanV37_(o.date);if(!dateDansPeriodeV37_(impact,periode))return;const dateImpact=dateValideVentilationBudgetSoft_(impact),futur=!dateImpact||dateImpact>maintenant,m=Math.abs(Number(o.montant||0)),cat=String(x.categorie||'').trim();if(!m)return;if(estRecette){out.recettesInitiales+=m;if(futur)out.recettesFutures+=m;if(source==='Action')out.recettesActions+=m;if(/sante|remboursement/.test(normaliserV37_(cat+' '+(x.libelle||''))))out.remboursementsSante+=m;return;}if(p0Cats.has(cat)){out.depensesPilotablesParCategorie[cat]=(out.depensesPilotablesParCategorie[cat]||0)+m;if(futur)out.depensesFutures+=m;}else{out.depensesHorsPilotable+=m;if(futur)out.depensesHorsPilotableFutures+=m;}if(source==='Action')out.depensesActions+=m;}
  (events||[]).forEach(e=>{if(estNeutralise_(e)){out.previsionsNeutraliseesParReel++;return;}if(String(e.certitude||'certaine')==='possible')return;out.evenementsRetenus++;const occ=typeof occurrencesEvenementV4_==='function'?occurrencesEvenementV4_(e):[{montant:Math.abs(Number(e.montant||0)),date:e.date_effet}];occ.forEach(o=>ajouterOccurrence_(e,o,'Événement'));});
  let actions=[];try{actions=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Actions'):[];}catch(e){actions=[];}
  (actions||[]).forEach(a=>{if(!yesPlanV4_(a.impact_confirme))return;if(estNeutralise_(a)){out.previsionsNeutraliseesParReel++;return;}out.actionsRetenues++;const occ=typeof occurrencesActionV46_==='function'?occurrencesActionV46_(a):[{montant:Math.abs(Number(a.impact_montant||0)),date:a.date_effet}];occ.forEach(o=>ajouterOccurrence_(a,o,'Action'));});
  Object.keys(out).forEach(k=>{if(typeof out[k]==='number')out[k]=arrV37_(out[k]);});return out;
}

function rapprocherActionV474(actionId,operationId){if(typeof assurerPlanActionsV4_==='function')assurerPlanActionsV4_();if(typeof assurerColonnesPlanV4_==='function')assurerColonnesPlanV4_('Plan_Actions',['montant_reel','date_realisation','rapprochement_statut','operation_reelle_id']);const a=lireFeuilleDynamiquePlan_('Plan_Actions').find(x=>String(x.id)===String(actionId));if(!a)throw new Error('Action introuvable.');const op=lireTable_('Operations').find(x=>String(x.id)===String(operationId));if(!op)throw new Error('Opération introuvable.');a.operation_reelle_id=operationId;a.montant_reel=Math.abs(Number(op.montant||0));a.date_realisation=op.date_comptable||op.date||op.date_operation||'';a.rapprochement_statut='Rapproché';a.statut='Réalisée';if(typeof upsertDynamiquePlanV4_==='function')upsertDynamiquePlanV4_('Plan_Actions',a);else enregistrerActionPlanV3(a);if(typeof recalculerPlanBudgetSoft_==='function')recalculerPlanBudgetSoft_('rapprochement_action');return typeof chargerPlanActionsV4==='function'?chargerPlanActionsV4():{ok:true};}

function listerImprevusCerbere20260903(clePilotage){
  const executer=function(){const periodes=typeof construirePeriodesCerbereV2_==='function'?construirePeriodesCerbereV2_():[],candidats=(periodes||[]).map(p=>({periode:p,cle:typeof clePeriodeCerbereV33_==='function'?String(clePeriodeCerbereV33_(p)):String(p&&p.debut||'')})),trouve=candidats.find(x=>x.cle===String(clePilotage||''))||candidats[0];if(!trouve)return{ok:false,lignes:[],depenses:0,recettes:0,net:0};const p0=typeof chargerCanonCerbereV1==='function'?chargerCanonCerbereV1():{postes:[]},r0=typeof chargerCanonRecettesCerbereV1==='function'?chargerCanonRecettesCerbereV1():{postes:[]},operations=lireTable_('Operations')||[],charges=lireTable_('Charges_fixes')||[],categories=lireTable_('Categories')||[],rap=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[],liens=typeof construireLiensChargesFixesCommuns_==='function'?construireLiensChargesFixesCommuns_(operations,charges,rap):{},periode=trouve.periode,p0Cats=new Set((p0.postes||[]).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean)),r0Cats=new Set((r0.postes||[]).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean)),types={},events=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):[],opsEvents=new Set(events.map(e=>String(e&&e.operation_reelle_id||'').trim()).filter(Boolean));p0Cats.add('Divers');categories.forEach(c=>types[String(c&&c.nom||'').trim()]=typeof normaliserV377_==='function'?normaliserV377_(c&&c.type):String(c&&c.type||'').toLowerCase());const lignes=[];let depenses=0,recettes=0;operations.forEach(o=>{const d=typeof dateImputationCerbereV377_==='function'?dateImputationCerbereV377_(o):dateValideVentilationBudgetSoft_(o&&o.date),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim(),id=String(o&&o.id||'').trim();if(!d||!(typeof dateDansCycleV377_==='function'?dateDansCycleV377_(d,periode):true)||!m||opsEvents.has(id)||liens[id]||types[cat]==='tresorerie'||(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o)))return;if(m<0&&p0Cats.has(cat))return;if(m>0&&r0Cats.has(cat))return;if(m<0)depenses+=Math.abs(m);else recettes+=m;lignes.push({id:id,date:Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd'),montant:Math.round(m*100)/100,categorie:cat,libelle:String(o&&o.libelle||o&&o.libelle_bancaire||'')});});return{ok:true,clePilotage:trouve.cle,lignes:lignes,depenses:Math.round(depenses*100)/100,recettes:Math.round(recettes*100)/100,net:Math.round((recettes-depenses)*100)/100,categories:categories.map(c=>String(c&&c.nom||'').trim()).filter(Boolean).sort(),performance:{moteurCerbereRelance:false}};};
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-imprevus-legers',executer):executer();
}

function chronometrerCoucheCerbere20260904_(liste,nom,fn){const t=Date.now(),resultat=fn();liste.push({nom:nom,ms:Date.now()-t});return resultat;}

/** Chemin spécialisé cockpit : après le socle 3.7, seules C1/C2 traversent les passes terminales. */
function chargerCerbereCockpitBaseRapide20260903_(){
  const timings=[],t0=Date.now();
  let brut=chronometrerCoucheCerbere20260904_(timings,'V37 complet',()=>chargerCerbereV37());if(!brut||brut.ok===false)return brut;
  if(Array.isArray(brut.periodes)&&brut.periodes.length>2)brut.periodes=brut.periodes.slice(0,2);
  let base=chronometrerCoucheCerbere20260904_(timings,'Reste réellement pilotable 3.7.24',()=>appliquerResteReellementPilotableV374_(brut));
  base=chronometrerCoucheCerbere20260904_(timings,'Audit Cerbère 3.7.7',()=>typeof appliquerAuditCerbereV377_==='function'?appliquerAuditCerbereV377_(base):base);
  base=chronometrerCoucheCerbere20260904_(timings,'Historique R0 3.7.8',()=>typeof appliquerHistoriqueR0V378_==='function'?appliquerHistoriqueR0V378_(base):base);
  base=chronometrerCoucheCerbere20260904_(timings,'Rapprochement CF 3.7.11',()=>typeof appliquerRapprochementCerbereV3711_==='function'?appliquerRapprochementCerbereV3711_(base):base);
  base=chronometrerCoucheCerbere20260904_(timings,'Doctrine cycle 3.7.12',()=>typeof appliquerDoctrineCycleV3712_==='function'?appliquerDoctrineCycleV3712_(base):base);
  base=chronometrerCoucheCerbere20260904_(timings,'Convention salaire 3.7.12',()=>typeof appliquerConventionSalaireTousCyclesV3712_==='function'?appliquerConventionSalaireTousCyclesV3712_(base):base);
  base=chronometrerCoucheCerbere20260904_(timings,'Projection frontière 3.7.13',()=>typeof appliquerProjectionFrontiereV3713_==='function'?appliquerProjectionFrontiereV3713_(base):base);
  base=chronometrerCoucheCerbere20260904_(timings,'Correction frontière 3.7.13b',()=>typeof corrigerProjectionFrontiereV3713b_==='function'?corrigerProjectionFrontiereV3713b_(base):base);
  base=chronometrerCoucheCerbere20260904_(timings,'Effets financiers Actions 3.7.13',()=>typeof corrigerEffetsFinanciersActionsV3713_==='function'?corrigerEffetsFinanciersActionsV3713_(base):base);
  base=chronometrerCoucheCerbere20260904_(timings,'Stabilisation 3.7.16',()=>stabiliserCerbereV3716_(base));
  base=chronometrerCoucheCerbere20260904_(timings,'Stabilisation 3.7.24',()=>stabiliserCerbereV3717_(base));
  if(base&&typeof base==='object'){
    base.version=CERBERE_PILOTAGE_V374_VERSION;
    base.diagnostic=base.diagnostic||{};
    base.diagnostic.performancePost35={dureeBaseMs:Date.now()-t0,couches:timings};
  }
  return base;
}

/** Surcharge du chargeur cockpit : même doctrine, payload C1/C2 seulement. */
function chargerCerbereCockpit20260902(){
  const executer=function(){
    const t0=Date.now(),base=chargerCerbereCockpitBaseRapide20260903_();if(!base||base.ok===false)return base;
    const post=base.diagnostic&&base.diagnostic.performancePost35||{couches:[]},timings=Array.isArray(post.couches)?post.couches:[];
    chronometrerCoucheCerbere20260904_(timings,'Suspensions Actions/Événements',()=>corrigerSuspensionsActionsEvenements20260903_(base));
    chronometrerCoucheCerbere20260904_(timings,'Réel pilotable date achat',()=>corrigerReelPilotableDateAchat20260902_(base));
    const periodes=Array.isArray(base.periodes)?base.periodes:[];
    chronometrerCoucheCerbere20260904_(timings,'Enrichissement cockpit C1/C2',()=>periodes.forEach((p,i)=>enrichirCycleCockpitCerbere20260902_(p,i)));
    let appreciation='';chronometrerCoucheCerbere20260904_(timings,'Appréciation cockpit',()=>{appreciation=appreciationCockpitCerbere20260902_(base);});
    const perf={c1c2Seulement:true,dureeMs:Date.now()-t0,couches:timings};
    base.cockpit20260902={version:'2026-09-04.profile-2',appreciation:appreciation,performance:perf,doctrine:'Cockpit C1/C2 : mêmes règles métier ; passes terminales limitées aux deux cycles affichés.'};
    const ts=Date.now(),out=serialiserCerberePourClient_(base),serializationMs=Date.now()-ts;
    if(out&&out.cockpit20260902&&out.cockpit20260902.performance){out.cockpit20260902.performance.serializationMs=serializationMs;out.cockpit20260902.performance.dureeMs=Date.now()-t0;}
    return out;
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-c1c2-20260903',executer):executer();
}

/** Extension de l'audit 1.2 : détaille les couches terminales sans relancer le moteur. */
function auditGeneralProfilCerbere_(controles,performances,c,cockpitMs){
  const d=c&&c.diagnostic||{},t=d.timings&&typeof d.timings==='object'?d.timings:{},socle=Number(d.duree_ms),socleMs=Number.isFinite(socle)?Math.max(0,Math.round(socle)):null;
  if(socleMs!==null){
    auditGeneralAjouter_(controles,'Performance Cerbère','Socle Cerbère 3.5','info',socleMs+' ms',null,'Temps interne de chargerCerbereV33().');
    performances.push({module:'Cerbère · socle 3.5',ms:socleMs});
    const apres=Math.max(0,Math.round(Number(cockpitMs||0)-socleMs));
    auditGeneralAjouter_(controles,'Performance Cerbère','Couches après 3.5 + cockpit','info',apres+' ms',null,'Temps résiduel mesuré après le socle 3.5.');
    performances.push({module:'Cerbère · après 3.5',ms:apres});
  }
  const labels={initialisation_ms:'3.5 · initialisation',canons_ms:'3.5 · canons P0/R0',lecture_structure_ms:'3.5 · lecture structure',lecture_plan_ms:'3.5 · lecture Plan',indexation_ms:'3.5 · indexation',reel_leger_ms:'3.5 · réel léger',construction_periodes_ms:'3.5 · construction P1–P6'};
  Object.keys(labels).forEach(k=>{const ms=Number(t[k]);if(!Number.isFinite(ms))return;const n=Math.max(0,Math.round(ms));auditGeneralAjouter_(controles,'Performance Cerbère',labels[k],'info',n+' ms',null,'Chronométrage interne du socle 3.5.');performances.push({module:'Cerbère · '+labels[k],ms:n});});
  const pc=c&&c.cockpit20260902&&c.cockpit20260902.performance||{},couches=Array.isArray(pc.couches)?pc.couches:[];
  couches.forEach(x=>{const n=Math.max(0,Math.round(Number(x&&x.ms||0))),nom=String(x&&x.nom||'Couche terminale');auditGeneralAjouter_(controles,'Performance Cerbère','Post-3.5 · '+nom,'info',n+' ms',null,'Chronométrage de la passe terminale, sans calcul supplémentaire.');performances.push({module:'Cerbère · post-3.5 · '+nom,ms:n});});
  const ser=Number(pc.serializationMs);if(Number.isFinite(ser)){const n=Math.max(0,Math.round(ser));auditGeneralAjouter_(controles,'Performance Cerbère','Post-3.5 · Sérialisation','info',n+' ms',null,'Conversion du cockpit en payload client.');performances.push({module:'Cerbère · post-3.5 · sérialisation',ms:n});}
  auditGeneralAjouter_(controles,'Performance Cerbère','Cockpit complet mesuré','info',Math.max(0,Math.round(Number(cockpitMs||0)))+' ms',null,'Temps mesuré autour de chargerCerbereCockpit20260902().');
}

/**
 * Optimisation 2026-09-05 : même audit métier 3.7.9, mais les opérations sont
 * préparées une fois puis indexées par cycle bancaire / cycle d'imputation.
 * Évite 3 à 4 rescans complets des Operations par période.
 */
function appliquerAuditCerbereV377_(base){
  if(!base||base.ok===false)return base;
  const operations=tableauCerbereV379_(lireTable_('Operations'));
  const charges=tableauCerbereV379_(lireTable_('Charges_fixes'));
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?tableauCerbereV379_(lireRapprochementsChargesFixes()):lireFeuilleDynamiqueCerbereV379_('Rapprochements_charges_fixes');
  const controles=lireFeuilleDynamiqueCerbereV379_('Controles_releves');
  const actions=typeof lireFeuilleDynamiquePlan_==='function'?tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Actions')):lireFeuilleDynamiqueCerbereV379_('Plan_Actions');
  const periodes=tableauCerbereV379_(base.periodes),p0Postes=tableauCerbereV379_(base.p0&&base.p0.postes),p0Cats=new Set(p0Postes.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));p0Cats.add('Divers');
  const r0Postes=tableauCerbereV379_(base.recettesCanon&&base.recettesCanon.postes),r0Cats=new Set(r0Postes.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
  const cfMatchByOp=construireLiensCfCertainsV377Optimise_(operations,charges,rapprochements);
  const banqueParCycle=periodes.map(()=>[]),imputationParCycle=periodes.map(()=>[]);
  const meta=operations.map(o=>({o,id:String(o&&o.id||'').trim(),m:Number(o&&o.montant||0),cat:String(o&&o.categorie||'').trim(),db:dateOperationBanqueV377_(o),di:dateImputationCerbereV377_(o)}));
  meta.forEach(x=>periodes.forEach((p,i)=>{const per=p&&p.periode||p;if(x.db&&dateDansCycleV377_(x.db,per))banqueParCycle[i].push(x);if(x.di&&dateDansCycleV377_(x.di,per))imputationParCycle[i].push(x);}));
  let report=null;
  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p,opsB=banqueParCycle[i]||[],opsI=imputationParCycle[i]||[];
    if(i===0){const ss=calculerSS1DepuisRelevesV377_(operations,controles,periode);if(ss&&Number.isFinite(ss.montant)){v.ss1=arrV377_(ss.montant);v.soldeOuverture=v.ss1;v.ss1Statut='reconstitué depuis relevé PDF + opérations définitives';v.ss1Audit=ss;}}else if(report!==null){v.ss1=arrV377_(report);v.soldeOuverture=v.ss1;v.ss1Statut='projeté depuis la fin Cerbère corrigée de la période précédente';}
    const reelR0={};let recettesHorsR0=0;opsB.forEach(x=>{if(x.m<=0)return;if(r0Cats.has(x.cat))reelR0[x.cat]=(reelR0[x.cat]||0)+x.m;else recettesHorsR0+=x.m;});
    let rtSocle=0;r0Postes.forEach(x=>{const cat=String(x&&x.categorie||'').trim(),canon=Number(x&&x.montant||0),reel=Number(reelR0[cat]||0);rtSocle+=i===0?Math.max(canon,reel):canon;});
    const recettesPlan=Number(v.recettesEvenements||0);v.rt1=arrV377_(rtSocle+(i===0?recettesHorsR0:0)+recettesPlan);v.rt1Audit={socle:arrV377_(rtSocle),reelParCategorie:reelR0,horsR0:arrV377_(i===0?recettesHorsR0:0),plan:arrV377_(recettesPlan)};
    const cfRef=calculerCfReferenceCycleV377_(charges,actions,periode),remplacements={};opsB.forEach(x=>{const cfId=cfMatchByOp[x.id];if(cfId)remplacements[cfId]=(remplacements[cfId]||0)+Math.abs(x.m);});
    let cft1=0;tableauCerbereV379_(cfRef.lignes).forEach(c=>{cft1+=Object.prototype.hasOwnProperty.call(remplacements,c.id)?Number(remplacements[c.id]):Number(c.montant||0);});v.chargesFixesTotal=arrV377_(cfRef.total);v.cft1=arrV377_(cft1);v.cf1Statut=i===0?'référence du cycle auditée':'projection depuis CF0 courant + Actions liées à une CF';v.cft1Audit={reference:arrV377_(cfRef.total),remplacements,actionsAppliquees:tableauCerbereV379_(cfRef.actionsAppliquees)};
    const fuiteCfParCat={};opsI.forEach(x=>{if(!cfMatchByOp[x.id]||!p0Cats.has(x.cat))return;fuiteCfParCat[x.cat]=(fuiteCfParCat[x.cat]||0)+Math.abs(x.m);});
    const enveloppes=tableauCerbereV379_(p.enveloppes);let dpt1=0,ret1=0;enveloppes.forEach(x=>{const cat=String(x&&x.categorie||'').trim(),brut=Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0)),reel=Math.max(0,brut-Number(fuiteCfParCat[cat]||0)),plan=Number(x&&x.planifie||0),allocation=Math.max(0,Number(x&&x.prevu||0)),engage=arrV377_(reel+plan),reste=arrV377_(allocation-engage),proj=arrV377_(Math.max(allocation,engage));x.reelNetPrevisionnel=arrV377_(reel);x.engageV37=engage;x.resteV37=reste;x.dpt1=proj;dpt1+=proj;ret1+=reste;});v.dpt1=arrV377_(dpt1);v.ret1=arrV377_(ret1);v.fuiteCfCorrigeeParCategorie=fuiteCfParCat;
    let het1=0;const heDetail={};opsI.forEach(x=>{if(x.m>=0||p0Cats.has(x.cat)||cfMatchByOp[x.id]||estReglementCbTechniqueV377_(x.o))return;const a=Math.abs(x.m);het1+=a;heDetail[x.cat]=(heDetail[x.cat]||0)+a;});v.het1=arrV377_(het1);v.horsPilotableAControler=v.het1;v.het1Detail=heDetail;
    v.dt1=arrV377_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));v.sct1=arrV377_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;const absorbable=arrV377_(enveloppes.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)-Number(x&&x.engageV37||0)),0));v.absorbableParAllocations=absorbable;v.incompressible=arrV377_(v.sct1<0?Math.max(0,Math.abs(v.sct1)-absorbable):0);v.auditInvariantV379=verifierInvariantPeriodeCerbereV379_(p);p.resteBudgetPilotable=v.ret1;p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;report=v.sct1;
  });
  base.version='3.7.10';base.diagnostic=base.diagnostic||{};base.diagnostic.audit_379='3.7.10 indexé : mêmes règles, opérations préparées une fois par cycle';base.diagnostic.non_regression=diagnostiquerStructureCerbereV379_(base);return base;
}

function construireLiensCfCertainsV377Optimise_(operations,charges,rapprochements){
  operations=tableauCerbereV379_(operations);charges=tableauCerbereV379_(charges);rapprochements=tableauCerbereV379_(rapprochements);
  const out={},chargeById={},chargesParMontant={};
  charges.forEach(c=>{const id=String(c&&c.id||'').trim();if(id)chargeById[id]=c;const montant=Math.abs(Number(c&&c.montant||0));if(!montant)return;const k=montant.toFixed(2),n=normaliserV377_(c&&c.libelle||c&&c.libelle_bancaire);(chargesParMontant[k]||(chargesParMontant[k]=[])).push({c,id,n});});
  operations.forEach(o=>{const id=String(o&&o.id||''),cf=String(o&&o.charge_fixe_id||'').trim();if(id&&cf&&chargeById[cf])out[id]=cf;});
  rapprochements.forEach(r=>{const op=String(r&&r.operation_id||''),cf=String(r&&r.charge_fixe_id||'');if(!op||!cf||!chargeById[cf])return;const statut=normaliserV377_(r.statut),score=Number(r.score||0),em=Math.abs(Number(r.ecart_montant||0)),ej=Math.abs(Number(r.ecart_jours||0));if(statut.indexOf('valid')>=0||String(r.decision||'').trim()||(score>=70&&em<=0.01&&ej<=2))out[op]=cf;});
  operations.forEach(o=>{const opId=String(o&&o.id||'');if(!opId||out[opId])return;const nom=normaliserV377_(o.libelle||o.libelle_bancaire),mont=Math.abs(Number(o.montant||0));if(!nom||!mont)return;const candidats=(chargesParMontant[mont.toFixed(2)]||[]).filter(x=>x.n&&nom.length>=6&&(nom.indexOf(x.n)>=0||x.n.indexOf(nom)>=0));if(candidats.length===1)out[opId]=candidats[0].id;});
  return out;
}
