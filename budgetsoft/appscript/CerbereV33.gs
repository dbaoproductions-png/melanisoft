const CERBERE_V33_VERSION='3.5.0';
const CERBERE_V33_SHEET='Cerbere_Ajustements';

/**
 * Cerbère 3.5 — moteur court terme.
 * P0 = canon de dépenses ; R0 = canon de recettes.
 * P1-P6 héritent des deux canons, puis le Plan et le réel les déforment.
 * Pour Cerbère, toute entrée réelle de trésorerie améliore la capacité de la
 * période courante, même si elle reste classée « trésorerie » dans les Analyses.
 */
function chargerCerbereV33(){
  const started=Date.now(),timings={};let checkpoint=started,stage='initialisation';
  const mark=n=>{const now=Date.now();timings[n]=now-checkpoint;checkpoint=now;};
  try{
    verifierInitialisation_();assurerTablesPlanCerbere_();
    if(typeof assurerPlanActionsV3_==='function')assurerPlanActionsV3_();
    assurerColonnesEvenementsCerbereV35_();
    const migration=migrerAjustementsChargesFixesVersEvenementsV35_();
    mark('initialisation_ms');

    stage='canons';
    const canonDepenses=chargerCanonCerbereV1();
    const p0=construireHeritageP0CerbereV3_(canonDepenses);
    const canonRecettes=chargerCanonRecettesCerbereV1();
    mark('canons_ms');

    stage='lecture structure';
    const charges=lireTable_('Charges_fixes');
    const operations=lireTable_('Operations');
    mark('lecture_structure_ms');

    stage='lecture Plan';
    const objectifs=lireTablePlanCerbere_('Plan_Objectifs');
    const actionsToutes=lireFeuilleDynamiqueCerbereV3_('Plan_Actions');
    const actionsExecutables=actionsToutes.filter(actionExecutableCerbereV3_);
    const plan={
      objectifs,
      objectifsActifs:objectifs.filter(x=>!['Terminé','Abandonné','Abandonnée'].includes(String(x.statut||''))),
      actions:actionsToutes,actionsExecutables,
      evenements:lireTablePlanCerbere_('Plan_Evenements')
    };
    mark('lecture_plan_ms');

    stage='indexation';
    const periodes=construirePeriodesCerbereV2_();
    const index=indexerDonneesCerbereV35_(periodes,operations,charges,canonRecettes);
    mark('indexation_ms');

    stage='réel léger';
    const reel=construireReelLegerCerbereV3_(operations,index);
    mark('reel_leger_ms');

    stage='P1-P6';
    const ajustements=lireAjustementsCerbereV33_();
    const resultats=periodes.map((p,i)=>{
      const r=calculerPeriodeCerbereV35_(p,i,canonDepenses,p0,canonRecettes,index[i],plan,reel);
      enrichirPeriodePilotableV35_(r,ajustements);return r;
    });
    mark('construction_periodes_ms');

    return serialiserCerberePourClient_({
      ok:true,version:CERBERE_V33_VERSION,
      principe:'Cerbère pilote la liquidité courte avec deux canons : recettes et dépenses, déformés par le Plan et confrontés au réel.',
      p0:{version:canonDepenses.version,postes:canonDepenses.postes,totaux:canonDepenses.totaux,epargneProtegee:canonDepenses.epargneProtegee,pluxeeMensuel:canonDepenses.pluxeeMensuel,moisSansPluxee:canonDepenses.moisSansPluxee},
      recettesCanon:canonRecettes,reel:resumeReelCerbereV3_(reel),periodes:resultats,
      plan:{objectifs:plan.objectifs,actions_valides:actionsExecutables,actions_non_executees:actionsToutes.filter(a=>!actionExecutableCerbereV3_(a)),evenements:plan.evenements},
      diagnostic:{duree_ms:Date.now()-started,timings,operations:operations.length,charges_fixes:charges.length,actions_total:actionsToutes.length,actions_executees:actionsExecutables.length,categories_p0:canonDepenses.postes.length,recettes_canon:canonRecettes.total,migration_evenements:migration,optimisation:'double_canon_tresorerie_sante_nette_3.5'}
    });
  }catch(e){return{ok:false,version:CERBERE_V33_VERSION,stage,erreur:e&&e.message?e.message:String(e),duree_ms:Date.now()-started,timings};}
}

function indexerDonneesCerbereV35_(periodes,operations,charges,canonRecettes){
  const canonCats=new Set((canonRecettes.postes||[]).map(x=>String(x.categorie||'').trim()));
  const idx=(periodes||[]).map(()=>({ops:[],entrees:0,sorties:0,entreesParCategorie:{},renfortsTresorerie:0,depensesParCategorie:{},santeDepenses:0,santeRemboursements:0,fixesP0:0}));
  const bornes=(periodes||[]).map(p=>({debut:debutJour_(new Date(p.debut)).getTime(),fin:debutJour_(new Date(p.fin)).getTime()}));
  (operations||[]).forEach(o=>{
    const d=dateComptableCerbere_(o);if(!d)return;const t=debutJour_(new Date(d)).getTime();if(!isFinite(t))return;
    let pi=-1;for(let i=0;i<bornes.length;i++)if(t>=bornes[i].debut&&t<=bornes[i].fin){pi=i;break;}if(pi<0)return;
    const b=idx[pi],m=montantSigneCerbereV3_(o),cat=String(o.categorie||'').trim();b.ops.push(o);
    if(m>0){b.entrees+=m;b.entreesParCategorie[cat]=(b.entreesParCategorie[cat]||0)+m;if(!canonCats.has(cat))b.renfortsTresorerie+=m;}
    else if(m<0)b.sorties+=Math.abs(m);

    const commentaire=String(o.commentaire||'');
    const technique=/\[RECURRENCE:[^\]]+\]/.test(commentaire);
    const chargeFixe=/\[CHARGE_FIXE:[^\]]+\]/.test(commentaire)||!!String(o.charge_fixe_id||'').trim();
    if(estMouvementSanteCerbereV35_(o)){
      if(m<0&&!technique&&!chargeFixe)b.santeDepenses+=Math.abs(m);
      else if(m>0)b.santeRemboursements+=m;
      return;
    }
    if(m<0&&!technique&&!chargeFixe&&cat)b.depensesParCategorie[cat]=(b.depensesParCategorie[cat]||0)+Math.abs(m);
  });
  (charges||[]).forEach(c=>{for(let i=0;i<periodes.length;i++)if(chargeActiveCerbere_(c,periodes[i]))idx[i].fixesP0+=Math.abs(Number(c.montant||c.montant_indicatif||0));});
  idx.forEach(b=>{b.depensesParCategorie['Santé']=Math.max(0,b.santeDepenses-b.santeRemboursements);});
  return idx;
}

function estMouvementSanteCerbereV35_(o){
  const s=normaliserTexteCerbereV35_([o&&o.categorie,o&&o.libelle,o&&o.libelle_bancaire,o&&o.marchand_normalise].filter(Boolean).join(' '));
  return /\bsante\b|\bcpam\b|assurance maladie|\bameli\b|remboursement.*sante|mutuelle.*rembours|harmonie mutuelle|a[eé]sio.*rembours|almerys|viamedis/.test(s);
}
function normaliserTexteCerbereV35_(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}

function calculerRecettesPeriodeCerbereV35_(index,canonRecettes,bucket,plan){
  let canonPondere=0;const detail=[];
  (canonRecettes.postes||[]).forEach(x=>{
    const cat=String(x.categorie||'').trim(),canon=Number(x.montant||0),reel=Math.max(0,Number(bucket.entreesParCategorie&&bucket.entreesParCategorie[cat]||0));
    const retenu=index===0?Math.max(canon,reel):canon;canonPondere+=retenu;
    detail.push({categorie:cat,canon:arrondirCerbereV3_(canon),reel:arrondirCerbereV3_(reel),retenu:arrondirCerbereV3_(retenu)});
  });
  const renforts=index===0?Math.max(0,Number(bucket.renfortsTresorerie||0)):0;
  const planR=Math.max(0,Number(plan&&plan.effets&&plan.effets.ressources||0));
  return{canonPondere:arrondirCerbereV3_(canonPondere),renfortsTresorerie:arrondirCerbereV3_(renforts),plan:arrondirCerbereV3_(planR),total:arrondirCerbereV3_(canonPondere+renforts+planR),detail};
}

function calculerPeriodeCerbereV35_(p,index,canonDepenses,p0,canonRecettes,bucket,planGlobal,reel){
  bucket=bucket||{entrees:0,sorties:0,entreesParCategorie:{},renfortsTresorerie:0,depensesParCategorie:{},fixesP0:0};
  const plan=projeterPlanCerbereV3_(p.debut,p.fin,planGlobal);
  const recettes=calculerRecettesPeriodeCerbereV35_(index,canonRecettes,bucket,plan);
  const fixesP0=Number(bucket.fixesP0||0);
  const fixesPonderees=Math.max(0,fixesP0+Number(plan.effets.hausseCharges||0)-Number(plan.effets.baisseCharges||0)-Number(plan.effets.chargesEvitees||0));
  const enveloppes=(p0.postes||[]).map(x=>{const reelCat=Math.max(0,Number(bucket.depensesParCategorie[x.categorie]||0));return Object.assign({},x,{prevu:x.monetaire,reel:arrondirCerbereV3_(reelCat),reste:arrondirCerbereV3_(x.monetaire-reelCat),etat:reelCat>x.monetaire?'rouge':reelCat>x.monetaire*.8?'orange':'vert'});});
  const ecarts=enveloppes.filter(x=>x.reel>x.prevu+.009).map(x=>({categorie:x.categorie,montant:arrondirCerbereV3_(x.reel-x.prevu)}));
  const propositions=proposerCompensationsCerbere_(ecarts,enveloppes.map(x=>Object.assign({},x,{nature:x.nature||'ajustable'})),index);
  const reserveObjectifs=Number(plan.effets.reserveObjectifs||0),depensesExceptionnelles=Number(plan.effets.depenses||0),coutP0=p0.totalMonetaire;
  const marge=recettes.total-fixesPonderees-coutP0-reserveObjectifs-depensesExceptionnelles;
  const soldeReporte=index===0&&reel&&reel.courtTerme?Number(reel.courtTerme.soldeBancaire):null;
  const alertes=[];
  if(index===0&&reel&&reel.courtTerme&&!reel.courtTerme.soldeFiable)alertes.push({niveau:'orange',code:'SOLDE_NON_CERTIFIE',message:'Le solde reporté n’est pas certifié par un relevé bancaire.'});
  if(marge<-.009)alertes.push({niveau:'rouge',code:'P0_NON_FINANCE',message:'Les ressources prévues ne financent pas entièrement P0 et les engagements de la période.'});
  if(ecarts.length)alertes.push({niveau:'orange',code:'ECART_ENVELOPPE',message:ecarts.length+' enveloppe(s) dépassée(s) par le réel constaté.'});
  const santeNette=Math.max(0,Number(bucket.santeDepenses||0)-Number(bucket.santeRemboursements||0));
  return{
    index:index+1,periode:p,heritageP0:p0,plan,
    ressources:recettes.total,recettesStructurelles:recettes.canonPondere,renfortsTresorerie:recettes.renfortsTresorerie,recettesPlan:recettes.plan,recettesDetail:recettes.detail,
    fixesBrutes:arrondirCerbereV3_(fixesP0),fixesPonderees:arrondirCerbereV3_(fixesPonderees),epargne:Number(canonDepenses.epargneProtegee||0),reserveObjectifs:arrondirCerbereV3_(reserveObjectifs),depensesExceptionnelles:arrondirCerbereV3_(depensesExceptionnelles),
    recettesReelles:arrondirCerbereV3_(bucket.entrees),depensesReelles:arrondirCerbereV3_(bucket.sorties),santeNette:arrondirCerbereV3_(santeNette),santeDepenses:arrondirCerbereV3_(bucket.santeDepenses||0),santeRemboursements:arrondirCerbereV3_(bucket.santeRemboursements||0),
    enveloppePilotable:arrondirCerbereV3_(coutP0),margeStructurelle:arrondirCerbereV3_(marge),soldeReporte:soldeReporte===null||!Number.isFinite(soldeReporte)?null:arrondirCerbereV3_(soldeReporte),disponibleRestant:arrondirCerbereV3_(marge),
    enveloppes,ecarts,propositions,alertes,etat:alertes.some(a=>a.niveau==='rouge')?'rouge':alertes.length?'orange':'vert',
    auditEnveloppe:{recettesCanonTotal:arrondirCerbereV3_(canonRecettes.total),recettesCanonRetenues:recettes.canonPondere,renfortsTresorerie:recettes.renfortsTresorerie,recettesPlan:recettes.plan,chargesFixes:arrondirCerbereV3_(fixesPonderees),epargne:Number(canonDepenses.epargneProtegee||0),reserveObjectifs:arrondirCerbereV3_(reserveObjectifs),depensesPlanSansCategorie:0,santeNette:arrondirCerbereV3_(santeNette),methodeRecettes:index===0?'R0 pondéré par le réel + renforts de trésorerie':'R0 + Plan',detailRecettes:recettes.detail}
  };
}

function enrichirPeriodePilotableV35_(p,ajustements){
  const cle=clePeriodeCerbereV33_(p.periode),map=ajustements[cle]||{},planParCategorie=engagementsPlanParCategorieV33_(p.plan),depensesPlanSansCategorie=depensesPlanSansCategorieV33_(p.plan);
  const budgetDisponible=arrondirCerbereV3_(Number(p.ressources||0)-Number(p.fixesPonderees||0)-Number(p.epargne||0)-Number(p.reserveObjectifs||0)-depensesPlanSansCategorie);
  const existantes=new Set((p.enveloppes||[]).map(x=>String(x.categorie||'')));
  Object.keys(planParCategorie).forEach(cat=>{if(cat&&!existantes.has(cat))(p.enveloppes||(p.enveloppes=[])).push({categorie:cat,monetaire:0,pluxee:0,nature:'plan',protege:false,ordre:98,prevu:0,reel:0,reste:0,etat:'vert'});});
  let totalBudget=0,totalReel=0,totalPlan=0,totalDepassements=0;
  (p.enveloppes||[]).forEach(x=>{
    const canon=Number(x.monetaire!=null?x.monetaire:x.canon!=null?x.canon:x.prevu||0),reel=Math.max(0,Number(x.reel||0)),planifie=Math.max(0,Number(planParCategorie[x.categorie]||0));
    const sauvegarde=Object.prototype.hasOwnProperty.call(map,x.categorie)?Number(map[x.categorie]):canon,budget=Math.max(0,Number.isFinite(sauvegarde)?sauvegarde:canon),reste=budget-reel-planifie;
    x.canon=arrondirCerbereV3_(canon);x.prevu=arrondirCerbereV3_(budget);x.reel=arrondirCerbereV3_(reel);x.planifie=arrondirCerbereV3_(planifie);x.reste=arrondirCerbereV3_(reste);x.depassement=arrondirCerbereV3_(Math.max(0,-reste));x.etat=reste<-.009?'rouge':(reel+planifie)>budget*.8?'orange':'vert';
    totalBudget+=budget;totalReel+=reel;totalPlan+=planifie;totalDepassements+=Math.max(0,-reste);
  });
  p.clePilotage=cle;p.budgetDisponible=budgetDisponible;p.budgetReparti=arrondirCerbereV3_(totalBudget);p.resteAVentiler=arrondirCerbereV3_(budgetDisponible-totalBudget);p.depensesConstateesPilotables=arrondirCerbereV3_(totalReel);p.engagementsPlanifies=arrondirCerbereV3_(totalPlan);p.depassementCategories=arrondirCerbereV3_(totalDepassements);p.depensesPlanSansCategorie=arrondirCerbereV3_(depensesPlanSansCategorie);p.enveloppePilotable=budgetDisponible;p.disponibleRestant=p.resteAVentiler;p.ajustementsSauvegardes=Object.keys(map).length>0;
  if(p.auditEnveloppe){p.auditEnveloppe.depensesPlanSansCategorie=p.depensesPlanSansCategorie;p.auditEnveloppe.enveloppeDisponible=p.budgetDisponible;}
  if(p.resteAVentiler<-.009||totalDepassements>.009)p.etat='rouge';else if(p.resteAVentiler<.01||(totalReel+totalPlan)>totalBudget*.8)p.etat='orange';else p.etat='vert';
}

function engagementsPlanParCategorieV33_(plan){const out={};const add=(c,m)=>{c=String(c||'').trim();m=Math.abs(Number(m||0));if(c&&m>0)out[c]=(out[c]||0)+m;};((plan&&plan.evenements)||[]).forEach(e=>{if(String(e.type||'').toLowerCase()==='depense')add(e.categorie,e.montant);});((plan&&plan.actions)||[]).forEach(a=>{const impact=String(a.impact_type||'').toLowerCase(),nature=String(a.nature_action||'').toLowerCase(),dep=impact==='depense'||['rembourser','payer','acheter','dépense','depense'].includes(nature);if(dep)add(a.categorie||(nature==='rembourser'?'Crédits':''),a.impact_montant);});return out;}
function depensesPlanSansCategorieV33_(plan){let total=0;((plan&&plan.evenements)||[]).forEach(e=>{if(String(e.type||'').toLowerCase()==='depense'&&!String(e.categorie||'').trim())total+=Math.abs(Number(e.montant||0));});((plan&&plan.actions)||[]).forEach(a=>{const impact=String(a.impact_type||'').toLowerCase(),nature=String(a.nature_action||'').toLowerCase(),dep=impact==='depense'||['rembourser','payer','acheter','dépense','depense'].includes(nature);if(dep&&!String(a.categorie||'').trim())total+=Math.abs(Number(a.impact_montant||0));});return arrondirCerbereV3_(total);}

function assurerColonnesEvenementsCerbereV35_(){const sh=SpreadsheetApp.getActive().getSheetByName('Plan_Evenements');if(!sh)return;const hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());const extra=['categorie','source_legacy','source_legacy_id'];const miss=extra.filter(x=>!hs.includes(x));if(miss.length)sh.getRange(1,hs.length+1,1,miss.length).setValues([miss]);}

/** Les anciens « ignorer » deviennent des Événements de suspension temporaire.
 * Les autres ajustements restent intacts pour audit : Cerbère ne les consomme plus. */
function migrerAjustementsChargesFixesVersEvenementsV35_(){
  if(typeof lireAjustementsChargesFixes!=='function')return{crees:0,ignores:0};
  let ajust=[];try{ajust=lireAjustementsChargesFixes()||[];}catch(e){return{crees:0,ignores:0,erreur:e.message||String(e)};}
  const sh=SpreadsheetApp.getActive().getSheetByName('Plan_Evenements');if(!sh)return{crees:0,ignores:ajust.length};
  const ev=lireFeuilleDynamiqueCerbereV3_('Plan_Evenements'),deja=new Set(ev.map(x=>String(x.source_legacy_id||''))),charges=lireTable_('Charges_fixes');let crees=0,ignores=0;
  ajust.forEach(a=>{
    if(String(a.actif).toLowerCase()==='false'||String(a.action)!=='ignorer'){ignores++;return;}
    const aid=String(a.id||'');if(!aid||deja.has(aid))return;
    const c=charges.find(x=>String(x.id)===String(a.charge_fixe_id));if(!c||!a.date_cible){ignores++;return;}
    upsertEvenementDynamiqueCerbereV35_({id:Utilities.getUuid(),libelle:'Suspension '+String(c.libelle||'charge fixe'),type:'charge_supprimee_temporairement',montant:Math.abs(Number(c.montant||0)),date_prevue:a.date_cible,date_effet:a.date_cible,certitude:'certaine',categorie:String(c.categorie||''),statut:'Prévu',commentaire:'Migré depuis Ajustements_charges_fixes ; à gérer désormais dans Événements.',source_legacy:'Ajustements_charges_fixes',source_legacy_id:aid});
    crees++;deja.add(aid);
  });return{crees,ignores};
}
function upsertEvenementDynamiqueCerbereV35_(d){const sh=SpreadsheetApp.getActive().getSheetByName('Plan_Evenements'),hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim()),now=new Date().toISOString();d.cree_le=d.cree_le||now;d.modifie_le=now;sh.appendRow(hs.map(h=>normaliserValeur_(d[h])));return d;}

function diagnostiquerCerbereV33(){const d=chargerCerbereV33();if(!d||d.ok===false)return d;return{ok:true,version:d.version,diagnostic:d.diagnostic,recettesCanon:d.recettesCanon,periodes:(d.periodes||[]).map(p=>({index:p.index,periode:p.periode,audit:p.auditEnveloppe,budgetDisponible:p.budgetDisponible,budgetReparti:p.budgetReparti,resteAVentiler:p.resteAVentiler,santeNette:p.santeNette}))};}

function sauvegarderBudgetPeriodeCerbereV33(payload){payload=payload||{};const cle=String(payload.cle||'').trim(),postes=Array.isArray(payload.postes)?payload.postes:[];if(!/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/.test(cle))throw new Error('Période Cerbère invalide.');if(!postes.length)throw new Error('Aucune ventilation à enregistrer.');const sh=assurerFeuilleAjustementsCerbereV33_(),valeurs=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,4).getValues():[],autres=valeurs.filter(r=>String(r[0])!==cle),maintenant=new Date();postes.forEach(x=>{const cat=String(x.categorie||'').trim(),montant=Number(x.montant);if(cat&&Number.isFinite(montant)&&montant>=0)autres.push([cle,cat,arrondirCerbereV3_(montant),maintenant]);});if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,4).clearContent();if(autres.length)sh.getRange(2,1,autres.length,4).setValues(autres);SpreadsheetApp.flush();return{ok:true,cle,postes:postes.length};}
function reinitialiserBudgetPeriodeCerbereV33(cle){cle=String(cle||'').trim();const sh=assurerFeuilleAjustementsCerbereV33_();if(sh.getLastRow()<2)return{ok:true};const valeurs=sh.getRange(2,1,sh.getLastRow()-1,4).getValues(),autres=valeurs.filter(r=>String(r[0])!==cle);sh.getRange(2,1,sh.getLastRow()-1,4).clearContent();if(autres.length)sh.getRange(2,1,autres.length,4).setValues(autres);return{ok:true};}
function lireAjustementsCerbereV33_(){const sh=assurerFeuilleAjustementsCerbereV33_();if(sh.getLastRow()<2)return{};const rows=sh.getRange(2,1,sh.getLastRow()-1,3).getValues(),out={};rows.forEach(r=>{const cle=String(r[0]||''),cat=String(r[1]||''),n=Number(r[2]);if(cle&&cat&&Number.isFinite(n))(out[cle]||(out[cle]={}))[cat]=n;});return out;}
function assurerFeuilleAjustementsCerbereV33_(){const ss=SpreadsheetApp.getActive();let sh=ss.getSheetByName(CERBERE_V33_SHEET);if(!sh)sh=ss.insertSheet(CERBERE_V33_SHEET);const headers=['periode','categorie','montant','maj_le'];if(sh.getLastRow()===0)sh.getRange(1,1,1,headers.length).setValues([headers]);else{const actuels=sh.getRange(1,1,1,headers.length).getValues()[0];if(headers.some((h,i)=>String(actuels[i]||'')!==h))sh.getRange(1,1,1,headers.length).setValues([headers]);}return sh;}
function clePeriodeCerbereV33_(p){const f=d=>Utilities.formatDate(new Date(d),Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');return f(p.debut)+'__'+f(p.fin);}
