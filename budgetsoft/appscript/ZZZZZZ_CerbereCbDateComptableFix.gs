const CERBERE_CB_DATE_COMPTABLE_FIX_VERSION = '2026-09-05.5';
const CERBERE_CANON_SCHEMA_MARKER_20260905_='CERBERE_CANON_SCHEMA_20260905_1';
const CERBERE_R0_SCHEMA_MARKER_20260905_='CERBERE_R0_SCHEMA_20260905_1';
var CERBERE_P0_LECTURE_CACHE_20260905_=null;
var CERBERE_R0_LECTURE_CACHE_20260905_=null;

/**
 * Correctif Cerbère : pour une CB différée, la date comptable réelle est
 * autoritaire dès qu'elle est connue. La projection par date d'achat n'est
 * utilisée qu'en l'absence de date comptable.
 */
function dateImputationCarteCerbereBudgetSoft_(o) {
  const dateComptable = dateValideVentilationBudgetSoft_(o && o.date_comptable);
  if (dateComptable) return dateComptable;
  const d = dateAchatMetierBudgetSoft_(o);
  if (!d) return null;
  const debut = d.getDate() >= 28 ? new Date(d.getFullYear(), d.getMonth(), 28) : new Date(d.getFullYear(), d.getMonth() - 1, 28);
  return new Date(debut.getFullYear(), debut.getMonth() + 1, 28);
}

/** Validation de schéma P0 une fois par version, pas à chaque lecture. */
function assurerCanonCerbereV1_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error('Classeur BudgetSoft introuvable.');
  let sh=ss.getSheetByName('Cerbere_Canon_V1');const props=PropertiesService.getDocumentProperties();
  if(sh&&props.getProperty(CERBERE_CANON_SCHEMA_MARKER_20260905_)==='ok')return sh;
  if(sh){assurerPosteDiversCerbereCanon_(sh);props.setProperty(CERBERE_CANON_SCHEMA_MARKER_20260905_,'ok');return sh;}
  sh=ss.insertSheet('Cerbere_Canon_V1');sh.getRange(1,1,1,7).setValues([['categorie','monetaire','pluxee','nature','ordre','protege','actif']]);
  const d=[['Courses',656,94,'essentiel',1,false,true],['Santé',50,0,'essentiel',2,false,true],['Animaux',50,0,'ajustable',3,false,true],['Maison / entretien',0,0,'ajustable',4,false,true],['Voitures',95,0,'ajustable',5,false,true],['Transports',39,0,'essentiel',6,false,true],['Restaurants',79,60,'discretionnaire',7,false,true],['Loisirs',100,0,'discretionnaire',8,false,true],['Achats personnels',200,0,'discretionnaire',9,false,true],['Divers',0,0,'ajustable',10,false,true],['Épargne',50,0,'protection',11,true,true],['Projet',0,0,'solde',12,false,true]];
  sh.getRange(2,1,d.length,7).setValues(d);sh.setFrozenRows(1);props.setProperty(CERBERE_CANON_SCHEMA_MARKER_20260905_,'ok');return sh;
}

/** Validation de schéma R0 une fois par version, pas à chaque lecture. */
function assurerCanonRecettesCerbereV1_() {
  const ss=SpreadsheetApp.getActive();let sh=ss.getSheetByName(CERBERE_RECETTES_CANON_SHEET);const props=PropertiesService.getDocumentProperties();
  const headers=['categorie','montant','nature','ordre','actif','commentaire','montant_precedent','date_effet'];
  if(sh&&props.getProperty(CERBERE_R0_SCHEMA_MARKER_20260905_)==='ok')return sh;
  if(!sh){sh=ss.insertSheet(CERBERE_RECETTES_CANON_SHEET);sh.getRange(1,1,1,headers.length).setValues([headers]);const defaults=[['Salaires',2455.90,'structurelle',1,true,'Revenu mensuel canonique','',''],['France Travail',1046.93,'structurelle',2,true,'Revenu mensuel canonique','',''],['Revenus fonciers',780.00,'structurelle',3,true,'750 € logement + 30 € garage à partir du cycle de septembre 2026',755.00,'2026-08-28'],['Cours',416.09,'variable',4,true,'Montant mensuel de référence','',''],['Concerts',283.62,'variable',5,true,'Montant mensuel de référence','','']];sh.getRange(2,1,defaults.length,headers.length).setValues(defaults);sh.setFrozenRows(1);props.setProperty(CERBERE_R0_SCHEMA_MARKER_20260905_,'ok');return sh;}
  const current=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim()):[],missing=headers.filter(h=>!current.includes(h));
  if(!current.length)sh.getRange(1,1,1,headers.length).setValues([headers]);else if(missing.length)sh.getRange(1,current.length+1,1,missing.length).setValues([missing]);
  sh.setFrozenRows(1);props.setProperty(CERBERE_R0_SCHEMA_MARKER_20260905_,'ok');return sh;
}

/** P0 et R0 ne sont relus qu'une fois pendant un calcul lecture seule. */
function chargerCanonCerbereV1() {
  const lecture=typeof BUDGETSOFT_READ_CONTEXT_ACTIVE_!=='undefined'&&!!BUDGETSOFT_READ_CONTEXT_ACTIVE_;
  if(lecture&&CERBERE_P0_LECTURE_CACHE_20260905_)return CERBERE_P0_LECTURE_CACHE_20260905_;
  const sh=assurerCanonCerbereV1_();
  const rows=lireCanonCerbereV1_(sh).filter(r=>String(r.actif).toLowerCase()!=='false').sort((a,b)=>Number(a.ordre||99)-Number(b.ordre||99));
  const pluxee=rows.reduce((s,r)=>s+Number(r.pluxee||0),0),monetaire=rows.reduce((s,r)=>s+Number(r.monetaire||0),0);
  const out={version:CERBERE_CANON_V1_VERSION,principe:'P0 est la référence maître persistante. Le Réel ne le modifie jamais ; seule une validation explicite de P0 change la référence.',pluxeeMensuel:154,moisSansPluxee:5,epargneProtegee:50,postes:rows.map(r=>({categorie:String(r.categorie||''),monetaire:Number(r.monetaire||0),pluxee:Number(r.pluxee||0),nature:String(r.nature||'ajustable'),ordre:Number(r.ordre||99),protege:String(r.protege).toLowerCase()==='true'})),totaux:{monetaire,pluxee,total:monetaire+pluxee}};
  if(lecture)CERBERE_P0_LECTURE_CACHE_20260905_=out;return out;
}

function chargerCanonRecettesCerbereV1() {
  const lecture=typeof BUDGETSOFT_READ_CONTEXT_ACTIVE_!=='undefined'&&!!BUDGETSOFT_READ_CONTEXT_ACTIVE_;
  if(lecture&&CERBERE_R0_LECTURE_CACHE_20260905_)return CERBERE_R0_LECTURE_CACHE_20260905_;
  const sh=assurerCanonRecettesCerbereV1_(),hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim()),rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,hs.length).getValues():[];
  const postes=rows.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>Object.fromEntries(hs.map((h,i)=>[h,r[i]]))).filter(x=>String(x.actif).toLowerCase()!=='false').map(x=>({categorie:String(x.categorie||'').trim(),montant:Math.max(0,Number(x.montant||0)),nature:String(x.nature||'structurelle'),ordre:Number(x.ordre||99),commentaire:String(x.commentaire||''),montant_precedent:(x.montant_precedent===''||x.montant_precedent==null)?null:Math.max(0,Number(x.montant_precedent||0)),date_effet:normaliserDateCanonRecettes_(x.date_effet)})).filter(x=>x.categorie&&x.montant>0).sort((a,b)=>a.ordre-b.ordre||a.categorie.localeCompare(b.categorie,'fr'));
  const out={version:CERBERE_RECETTES_CANON_VERSION,principe:'R0 est la référence maître persistante des recettes normales ; le Plan et le réel ne la réécrivent pas. Les changements datés conservent la référence antérieure pour les cycles déjà ouverts.',postes,total:arrondirCerbereV3_(postes.reduce((s,x)=>s+x.montant,0))};
  if(lecture)CERBERE_R0_LECTURE_CACHE_20260905_=out;return out;
}

/** Même logique métier, Plan_Actions lu sans clone JSON dans le contexte lecture. */
function previsionsEvenementsV371_(events,periode,p0Cats,catType){
  const out={recettesInitiales:0,recettesFutures:0,depensesFutures:0,depensesHorsPilotable:0,depensesHorsPilotableFutures:0,remboursementsSante:0,depensesPilotablesParCategorie:{},recettesActions:0,depensesActions:0,actionsRetenues:0,evenementsRetenus:0,previsionsNeutraliseesParReel:0},maintenant=new Date();
  function estNeutralise_(x){const statut=normaliserV37_(x.statut||''),rappro=normaliserV37_(x.rapprochement_statut||'');return !!String(x.operation_reelle_id||'').trim()||rappro==='rapproche'||['rapproche','realise','effective','effectif','annule','abandonnee','abandonne'].includes(statut);}
  function ajouterOccurrence_(x,o,source){let impact=o.date;const typeExplicite=normaliserV37_(x.type||x.sens||''),impactType=normaliserV37_(x.impact_type||''),nature=normaliserV37_(x.nature_action||''),estRecette=typeExplicite==='recette'||impactType==='hausse revenu'||nature==='encaisser'||nature==='recouvrer',estDepense=typeExplicite==='depense'||['acheter','rembourser','reserver','investir','payer'].includes(nature);if(source==='Action'&&!estRecette&&!estDepense)return;if(!estRecette&&normaliserV37_(x.mode_paiement)==='cb')impact=dateImpactCbPlanV37_(o.date);if(!dateDansPeriodeV37_(impact,periode))return;const dateImpact=dateValideVentilationBudgetSoft_(impact),futur=!dateImpact||dateImpact>maintenant,m=Math.abs(Number(o.montant||0)),cat=String(x.categorie||'').trim();if(!m)return;if(estRecette){out.recettesInitiales+=m;if(futur)out.recettesFutures+=m;if(source==='Action')out.recettesActions+=m;if(/sante|remboursement/.test(normaliserV37_(cat+' '+(x.libelle||''))))out.remboursementsSante+=m;return;}if(p0Cats.has(cat)){out.depensesPilotablesParCategorie[cat]=(out.depensesPilotablesParCategorie[cat]||0)+m;if(futur)out.depensesFutures+=m;}else{out.depensesHorsPilotable+=m;if(futur)out.depensesHorsPilotableFutures+=m;}if(source==='Action')out.depensesActions+=m;}
  (events||[]).forEach(e=>{if(estNeutralise_(e)){out.previsionsNeutraliseesParReel++;return;}if(String(e.certitude||'certaine')==='possible')return;out.evenementsRetenus++;const occ=typeof occurrencesEvenementV4_==='function'?occurrencesEvenementV4_(e):[{montant:Math.abs(Number(e.montant||0)),date:e.date_effet}];occ.forEach(o=>ajouterOccurrence_(e,o,'Événement'));});
  let actions=[];try{actions=typeof lirePlanDynamiqueDirectBudgetSoft20260905_==='function'?lirePlanDynamiqueDirectBudgetSoft20260905_('Plan_Actions'):(typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Actions'):[]);}catch(e){actions=[];}
  (actions||[]).forEach(a=>{if(!yesPlanV4_(a.impact_confirme))return;if(estNeutralise_(a)){out.previsionsNeutraliseesParReel++;return;}out.actionsRetenues++;const occ=typeof occurrencesActionV46_==='function'?occurrencesActionV46_(a):[{montant:Math.abs(Number(a.impact_montant||0)),date:a.date_effet}];occ.forEach(o=>ajouterOccurrence_(a,o,'Action'));});
  Object.keys(out).forEach(k=>{if(typeof out[k]==='number')out[k]=arrV37_(out[k]);});return out;
}

/**
 * V37 optimisé : même doctrine, mais les dates/opérations sont préparées une
 * seule fois et les propriétés documentaires sont lues en bloc. Le diagnostic
 * sépare désormais le coût du moteur roulant du coût propre à V37.
 */
function chargerCerbereV37(){
  const t0=Date.now();
  const base=chargerCerbereRoulant(),tRoulant=Date.now();
  if(!base||base.ok===false)return base;
  const lireDirect=typeof lireTableDirecteBudgetSoft20260905_==='function'?lireTableDirecteBudgetSoft20260905_:lireTable_;
  const operations=dedoublonnerOperationsCartesBudgetSoft_(lireDirect('Operations')||[]);
  const charges=lireDirect('Charges_fixes')||[],categories=lireDirect('Categories')||[];
  const events=typeof lirePlanDynamiqueDirectBudgetSoft20260905_==='function'?lirePlanDynamiqueDirectBudgetSoft20260905_('Plan_Evenements'):(typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Evenements'):lireTablePlanCerbere_('Plan_Evenements'));
  const periodes=base.periodes||[],maintenant=new Date(),nowMs=maintenant.getTime();
  const p0Total=Number(base.p0&&base.p0.totaux&&base.p0.totaux.monetaire||0),r0Postes=(base.recettesCanon&&base.recettesCanon.postes)||[],r0Total=Number(base.recettesCanon&&base.recettesCanon.total||0);
  const r0Cats=new Set(r0Postes.map(x=>String(x.categorie||'').trim()).filter(Boolean)),p0Cats=new Set((base.p0&&base.p0.postes||[]).map(x=>String(x.categorie||'').trim()).filter(Boolean));p0Cats.add('Divers');
  const catType={};categories.forEach(c=>catType[String(c.nom||c.categorie||'').trim()]=String(c.type||'').trim().toLowerCase());
  const soldeActuel=Number(base.reel&&base.reel.soldeBancaire||0),chargeById={};charges.forEach(c=>{const id=String(c&&c.id||'').trim();if(id)chargeById[id]=c;});
  const bornes=periodes.map(p=>{const pi=p&&p.periode||p,a=dateValideVentilationBudgetSoft_(pi&&pi.debut),z=dateValideVentilationBudgetSoft_(pi&&pi.fin);return{a:a?new Date(a.getFullYear(),a.getMonth(),a.getDate()).getTime():NaN,z:z?new Date(z.getFullYear(),z.getMonth(),z.getDate()).getTime():NaN};});
  const opsParCycle=periodes.map(()=>[]);
  operations.forEach(o=>{const d=dateOperationCouranteBudgetSoft_(o);if(!d)return;const td=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();for(let i=0;i<bornes.length;i++){const b=bornes[i];if(td>=b.a&&td<=b.z){opsParCycle[i].push({o,d,m:Number(o&&o.montant||0),cat:String(o&&o.categorie||'').trim(),cfId:String(o&&o.charge_fixe_id||'').trim(),t:d.getTime()});break;}}});
  const props=PropertiesService.getDocumentProperties().getProperties();
  function jokerRapide_(p,auto){const cle='CERBERE_JOKER_'+String(p.clePilotage||p.periode&&p.periode.debut||''),v=props[cle],actif=v==='on'?true:v==='off'?false:!!auto;return{actif,automatique:v==null&&!!auto,raison:actif?'Engagements hérités supérieurs à la capacité de compensation : P0 sert temporairement de garde-fou.':'Joker désactivé : le Réel et les ajustements locaux reprennent la main.',cle};}
  let reportProjete=null;
  periodes.forEach((p,i)=>{
    const pi=p.periode||p,meta=opsParCycle[i]||[];assurerDiversV37_(p);const ev=previsionsEvenementsV371_(events,pi,p0Cats,catType);
    const passes=i===0?meta.filter(x=>x.t<=nowMs):[];
    const reelR0={};meta.forEach(x=>{if(x.t<=nowMs&&x.m>0&&r0Cats.has(x.cat))reelR0[x.cat]=(reelR0[x.cat]||0)+x.m;});
    let rt1Socle=0,correctionR0=0,recettesR0Restantes=0;r0Postes.forEach(x=>{const cat=String(x.categorie||'').trim(),canon=Number(x.montant||0),reel=Number(reelR0[cat]||0),retenu=reel>0?reel:canon;rt1Socle+=retenu;if(i===0){if(reel>0)correctionR0+=reel-canon;else recettesR0Restantes+=canon;}});
    let recettesHorsR0Reelles=0;if(i===0)meta.forEach(x=>{if(x.t<=nowMs&&x.m>0&&!r0Cats.has(x.cat))recettesHorsR0Reelles+=x.m;});
    const rt1=arrV37_(rt1Socle+recettesHorsR0Reelles+ev.recettesFutures);
    const cfSocle=Number(p.fixesPonderees!=null?p.fixesPonderees:p.fixesBrutes||0),cfTotal=arrV37_(cfSocle>0?cfSocle:cfTotalSecoursV372_(charges,pi));let cfAttenduRealise=0,cfReelRealise=0,nbCfRealises=0;
    if(i===0){const vus=new Set();meta.forEach(x=>{const id=x.cfId;if(x.t>nowMs||!id||vus.has(id))return;vus.add(id);nbCfRealises++;const c=chargeById[id];cfAttenduRealise+=Math.abs(Number(c&&(c.montant!=null?c.montant:c.montant_indicatif)||0));cfReelRealise+=Math.abs(x.m);});}
    const cft1=arrV37_(Math.max(0,cfTotal-cfAttenduRealise)+cfReelRealise),cfRestantes=i===0?arrV37_(Math.max(0,cfTotal-cfAttenduRealise)):cfTotal;
    const clePeriode=String(p.clePilotage||pi.debut||''),propSS1=Object.prototype.hasOwnProperty.call(props,'CERBERE_SS1_'+clePeriode)?props['CERBERE_SS1_'+clePeriode]:null,mouvementBancairePasse=passes.reduce((s,x)=>s+x.m,0),ss1Valide=propSS1!==null&&propSS1!==''&&Number.isFinite(Number(propSS1));
    const ss1=i===0?arrV37_(ss1Valide?Number(propSS1):soldeActuel-mouvementBancairePasse):arrV37_(Number(reportProjete||0));
    const cbHeritee=Number(p.roulant&&p.roulant.cbHeritee||0),jokerAuto=cbHeritee>Math.max(0,ss1+rt1-cft1),joker=jokerRapide_(p,jokerAuto);if(joker.actif)(p.enveloppes||[]).forEach(x=>x.prevu=Number(x.canon||0));
    const allocationAvant=arrV37_((p.enveloppes||[]).reduce((s,x)=>s+Number(x.prevu||0),0));let engagePilotable=0,restePilotable=0,dpt1=0;
    (p.enveloppes||[]).forEach(x=>{const cat=String(x.categorie||'').trim(),santeAttendue=cat==='Santé'?Number(ev.remboursementsSante||0):0,reelBrut=Math.max(0,Number(x.reelImpute||0)),reelNet=Math.max(0,reelBrut-santeAttendue),plan=arrV37_(Math.max(Number(x.planifie||0),Number(ev.depensesPilotablesParCategorie[cat]||0))),engage=arrV37_(reelNet+plan),allocation=Math.max(0,Number(x.prevu||0));x.planifie=plan;x.reelNetPrevisionnel=arrV37_(reelNet);x.remboursementsAttendus=arrV37_(santeAttendue);x.engageV37=engage;x.resteV37=arrV37_(allocation-engage);x.dpt1=arrV37_(Math.max(allocation,engage));engagePilotable+=engage;restePilotable+=x.resteV37;dpt1+=x.dpt1;});
    dpt1=arrV37_(dpt1);restePilotable=arrV37_(restePilotable);engagePilotable=arrV37_(engagePilotable);const dt1=arrV37_(cft1+dpt1),sct1=arrV37_(ss1+rt1-dt1),scPresent=i===0?arrV37_(ss1+mouvementBancairePasse):null,ecartHelloCerbere=i===0?arrV37_(soldeActuel-scPresent):null,disponibleJusquau27=i===0?restePilotable:null;reportProjete=sct1;
    const pointDepart=arrV37_(ss1+rt1-cft1),margeInitiale=arrV37_(pointDepart-allocationAvant),ecartInitial=arrV37_(pointDepart-p0Total);
    p.v37={pointDepart,soldeOuverture:ss1,ss1,ss1Valide,ss1Statut:ss1Valide?'validé':'reconstitué à contrôler',rt1,cft1,dpt1,dt1,sct1,scPresent,shbt1:i===0?arrV37_(soldeActuel):null,ecartHelloCerbere,ecartInitial,margeInitiale,recettesCanon:arrV37_(r0Total),recettesR0Restantes:arrV37_(recettesR0Restantes),correctionRecettesReelles:arrV37_(correctionR0),recettesEvenements:arrV37_(ev.recettesFutures),recettesHorsR0Reelles:arrV37_(recettesHorsR0Reelles),chargesFixesTotal:cfTotal,chargesFixesRestantes:cfRestantes,chargesFixesAttenduRealise:arrV37_(cfAttenduRealise),chargesFixesReelRealise:arrV37_(cfReelRealise),chargesFixesRealisees:nbCfRealises,remboursementsSanteAttendus:arrV37_(ev.remboursementsSante),depensesEvenementsHorsPilotable:arrV37_(ev.depensesHorsPilotable),disponibleJusquau27,finProjetee:sct1,capaciteProjetee:sct1,disponibleEnveloppes:restePilotable,engagePilotable,joker,doctrine:i===0?'RPt1 = P1 − pilotable consommé/engagé. SCt1 = SS1 + Rt1 − CFt1 − DPt1. SHBt1 est contrôlé séparément contre le solde Cerbère présent.':'M+1 utilise comme SS1 le SCt1 projeté de M, puis applique Rt1 − CFt1 − DPt1.'};
    p.capaciteTresorerie=sct1;p.capacitePilotable=restePilotable;p.resteBudgetPilotable=restePilotable;p.resteBudgetAlloue=restePilotable;p.budgetReparti=allocationAvant;
  });
  base.version=CERBERE_V37_VERSION;base.principe='Cerbère 3.7.3 : P1 mesure l’autorisation pilotable ; RPt1 son reliquat. SS1 + Rt1 − CFt1 − DPt1 produit SCt1, trajectoire réévaluée de fin de cycle. SHBt1 est contrôlé séparément.';base.fenetreRoulante=fenetreV37_(periodes);base.diagnostic=base.diagnostic||{};base.diagnostic.moteur_37=CERBERE_V37_VERSION;base.diagnostic.doctrine_pt='RPt1 = P1 - consommé/engagé ; SCt1 = SS1 + Rt1 - CFt1 - DPt1';base.diagnostic.doctrine_coherence='SHBt1 comparé au solde Cerbère présent ; tout écart doit être mathématiquement explicable';base.diagnostic.performanceV37={roulantMs:tRoulant-t0,v37PropreMs:Date.now()-tRoulant};
  return serialiserCerberePourClient_(base);
}

/**
 * Même doctrine que le correctif cockpit 2026-09-02, mais les opérations sont
 * parcourues une seule fois pour C1/C2. La date d'achat n'est calculée qu'après
 * les filtres montant/catégorie/CF, puis l'opération est affectée directement au
 * cycle correspondant.
 */
function corrigerReelPilotableDateAchat20260902_(base){
  const periodes=Array.isArray(base&&base.periodes)?base.periodes:[];if(!periodes.length)return;
  const lireDirect=typeof lireTableDirecteBudgetSoft20260905_==='function'?lireTableDirecteBudgetSoft20260905_:lireTable_;
  const ops0=lireDirect('Operations')||[],operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  const charges=lireDirect('Charges_fixes')||[],rapprochements=typeof lireRapprochementsCfDirectBudgetSoft20260905_==='function'?lireRapprochementsCfDirectBudgetSoft20260905_():(typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[]);
  const liensCf=typeof construireLiensCfCertainsV377_==='function'?construireLiensCfCertainsV377_(operations,charges,rapprochements):{};
  const maintenant=Date.now(),cfg=periodes.map(p=>{const env=Array.isArray(p&&p.enveloppes)?p.enveloppes:[],debut=dateCockpit20260902_(p&&p.periode&&p.periode.debut),fin=dateCockpit20260902_(p&&p.periode&&p.periode.fin);return{p,env,cats:new Set(env.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean)),a:debut?debut.getTime():NaN,z:fin?fin.getTime():NaN,reel:{}};});
  const toutesCats=new Set();cfg.forEach(c=>c.cats.forEach(x=>toutesCats.add(x)));
  operations.forEach(o=>{
    const montant=Number(o&&o.montant||0);if(!Number.isFinite(montant)||montant>=0)return;
    const cat=String(o&&o.categorie||'').trim();if(!toutesCats.has(cat))return;
    const id=String(o&&o.id||'').trim();if((id&&liensCf[id])||String(o&&o.charge_fixe_id||'').trim())return;
    if(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o))return;
    const d=dateAchatCockpit20260902_(o);if(!d)return;const t=d.getTime();if(!Number.isFinite(t)||t>maintenant)return;
    for(let i=0;i<cfg.length;i++){const c=cfg[i];if(t>=c.a&&t<=c.z&&c.cats.has(cat)){c.reel[cat]=Number(c.reel[cat]||0)+Math.abs(montant);break;}}
  });
  cfg.forEach(c=>c.env.forEach(x=>{const cat=String(x&&x.categorie||'').trim();x.reelNetPrevisionnel=arrCockpit20260902_(Number(c.reel[cat]||0));x.reelPilotableDepuisDebutCycle=x.reelNetPrevisionnel;}));
}
