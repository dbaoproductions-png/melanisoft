const BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION='2026-09-21.1';
const BUDGETSOFT_TREASURY_CANONICAL_OWNER='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907';

function arrondiTresorerieCanonique20260907_(n){return Math.round((Number(n)||0)*100)/100;}
function estCbTresorerieCanonique20260907_(l){
  if(!l)return false;
  if(String(l.carte_fin||'').trim())return true;
  const mode=String(l.mode_paiement||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/^(cb|carte|carte bancaire)$/.test(mode))return true;
  const achat=l.date_achat?new Date(l.date_achat):null,compta=l.date_comptable?new Date(l.date_comptable):null;
  if(achat&&compta&&!isNaN(achat)&&!isNaN(compta)&&compta>achat)return true;
  const s=String((l.categorie||'')+' '+(l.libelle||'')+' '+(l.preuve||'')).toLowerCase();
  return /\bcb\b|carte|débit différé|debit differe/.test(s);
}
function sommeLignesTresorerieCanonique20260907_(ls){return arrondiTresorerieCanonique20260907_((ls||[]).reduce((s,x)=>s+Number(x&&x.montantSigne||0),0));}
function groupeTresorerieCanonique20260907_(nom,ls){return{nom:nom,montant:sommeLignesTresorerieCanonique20260907_(ls),nombre:(ls||[]).length,lignes:(ls||[])};}

function decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(r){
  const lignes=Array.isArray(r&&r.lignes)?r.lignes:[];
  const revenus=lignes.filter(x=>x.source==='revenu_recurrent');
  const charges=lignes.filter(x=>x.source==='charge_fixe');
  const cbCertaines=lignes.filter(x=>x.source==='operation_future'&&estCbTresorerieCanonique20260907_(x));
  const operationsCertaines=lignes.filter(x=>x.source==='operation_future'&&!estCbTresorerieCanonique20260907_(x));
  const plan=lignes.filter(x=>x.source==='evenement'||x.source==='action');
  const cbEstimees=lignes.filter(x=>x.source==='debit_cb_estime');
  const autres=lignes.filter(x=>!['revenu_recurrent','charge_fixe','operation_future','evenement','action','debit_cb_estime'].includes(String(x.source||'')));
  const groupes={
    recettesCanoniquesRestantes:groupeTresorerieCanonique20260907_('recettes_canoniques_restantes',revenus),
    chargesFixesRestantes:groupeTresorerieCanonique20260907_('charges_fixes_restantes',charges),
    cbDiffereesEngagees:groupeTresorerieCanonique20260907_('cb_differees_engagees',cbCertaines),
    operationsFuturesCertaines:groupeTresorerieCanonique20260907_('operations_futures_certaines',operationsCertaines),
    effetsPlanConfirmes:groupeTresorerieCanonique20260907_('effets_plan_confirmes',plan),
    cbDiffereesResiduelEstime:groupeTresorerieCanonique20260907_('cb_differees_residuel_estime',cbEstimees),
    autres:groupeTresorerieCanonique20260907_('autres',autres)
  };
  const sommeGroupes=arrondiTresorerieCanonique20260907_(Object.keys(groupes).reduce((s,k)=>s+Number(groupes[k].montant||0),0));
  const sommeLignes=sommeLignesTresorerieCanonique20260907_(lignes);
  const soldeReel=arrondiTresorerieCanonique20260907_(r&&r.soldeReel);
  const soldeCalcule=arrondiTresorerieCanonique20260907_(soldeReel+sommeLignes);
  const soldePublie=arrondiTresorerieCanonique20260907_(r&&r.soldePrevisionnel);
  const pilotableProgressif=lignes.filter(x=>x.source==='pilotable');
  const actionsPlanNonEffectives=lignes.filter(x=>x.source==='action'&&!['certain','tres_probable'].includes(String(x.certitude||'')));
  const erreurs=[];
  if(Math.abs(sommeGroupes-sommeLignes)>.01)erreurs.push('Somme des groupes différente de la somme des lignes.');
  if(Math.abs(soldeCalcule-soldePublie)>.01)erreurs.push('Solde publié non réconcilié avec le solde réel et les flux.');
  if(pilotableProgressif.length)erreurs.push('Présence interdite de pilotable progressif dans la trajectoire bancaire.');
  if(actionsPlanNonEffectives.length)erreurs.push('Présence interdite d’Actions Plan prévues/estimées dans la trajectoire bancaire.');
  return{
    version:BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION,
    ok:erreurs.length===0,
    soldeReel:soldeReel,
    variationPrevue:sommeLignes,
    soldePrevisionnel:soldePublie,
    groupes:groupes,
    controles:{sommeGroupes:sommeGroupes,sommeLignes:sommeLignes,soldeCalcule:soldeCalcule,soldePublie:soldePublie,pilotableProgressif:pilotableProgressif.length,actionsPlanNonEffectives:actionsPlanNonEffectives.length},
    erreurs:erreurs
  };
}

/** Propriétaire canonique BudgetSoft du prévisionnel bancaire. */
function construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateCible,cerberePrecharge,ctx){
  if(typeof chargerTresoreriePrevisionnelle20260901!=='function')return{ok:false,version:BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION,erreur:'Moteur doctrinal 20260901 absent.'};
  const r=chargerTresoreriePrevisionnelle20260901(dateCible,cerberePrecharge,ctx);
  if(!r||r.ok===false)return r;

  const reference=typeof dateRevenuePublicationFix20260912_==='function'
    ?dateRevenuePublicationFix20260912_(r.dateReference||new Date())
    :new Date(r.dateReference||new Date());
  const cible=typeof dateRevenuePublicationFix20260912_==='function'
    ?dateRevenuePublicationFix20260912_(dateCible||r.dateCible)
    :new Date(dateCible||r.dateCible);
  if(!reference||!cible||isNaN(reference)||isNaN(cible))return r;

  const debutCycle=typeof dateDebutCycleCanonBudgetSoft20260906_==='function'
    ?dateDebutCycleCanonBudgetSoft20260906_(reference)
    :new Date(reference.getFullYear(),reference.getMonth(),28);
  const finCycle=typeof dateFinCycleCanonBudgetSoft20260906_==='function'
    ?dateFinCycleCanonBudgetSoft20260906_(reference)
    :new Date(reference.getFullYear(),reference.getMonth()+1,27,23,59,59,999);

  const dus=typeof occurrencesRecettesCertainesDuesRevenuePublicationFix20260922_==='function'
    ?occurrencesRecettesCertainesDuesRevenuePublicationFix20260922_(reference,debutCycle,finCycle)
    :[];
  const lignes=Array.isArray(r.lignes)?r.lignes.slice():[];
  const report=new Date(reference);report.setDate(report.getDate()+1);report.setHours(12,0,0,0);
  const ajoutes=[];

  dus.forEach(function(occ){
    const id=String(occ&&occ.eventId||occ&&occ.id||''),idx=Number(occ&&occ.occurrence||1),montant=Math.abs(Number(occ&&occ.montant||0));
    if(!id||!Number.isFinite(montant)||montant<=0)return;
    const origine=typeof dateRevenuePublicationFix20260912_==='function'
      ?dateRevenuePublicationFix20260912_(occ&&occ.date_effet||occ&&occ.date_prevue)
      :new Date(occ&&occ.date_effet||occ&&occ.date_prevue);
    const d=origine&&origine>reference?new Date(origine):new Date(report);
    if(d>cible)return;
    const deja=lignes.some(function(l){
      const ld=typeof dateRevenuePublicationFix20260912_==='function'?dateRevenuePublicationFix20260912_(l&&l.date):new Date(l&&l.date);
      if(String(l&&l.source||'')!=='evenement'||String(l&&l.sourceId||'')!==id||!ld||isNaN(ld)||Number(l&&l.montantSigne||0)<=0)return false;
      if(Number(l&&l.occurrence||0)===idx)return true;
      return Math.abs(ld-d)<43200000&&Math.abs(Number(l&&l.montantSigne||0)-montant)<.011;
    });
    if(deja)return;
    const arr=typeof arrRevenuePublicationFix20260912_==='function'?arrRevenuePublicationFix20260912_:arrondiTresorerieCanonique20260907_;
    const iso=typeof isoRevenuePublicationFix20260912_==='function'?isoRevenuePublicationFix20260912_:function(v){return Utilities.formatDate(new Date(v),Session.getScriptTimeZone(),'yyyy-MM-dd');};
    const ligne={id:'event:'+id+':occ:'+idx+':certain-du',source:'evenement',sourceId:id,occurrence:idx,occurrences:Number(occ&&occ.occurrences||1),date:d.toISOString(),libelle:String(occ&&occ.libelle||'Événement'),categorie:String(occ&&occ.categorie||''),compte:String(occ&&occ.compte||''),montantSigne:arr(montant),certitude:'certaine',preuve:'Occurrence de recette Plan encore due · aucune opération réelle ni rapprochement confirmé',enRetard:!!(origine&&origine<=reference),datePrevueOrigine:iso(origine)};
    lignes.push(ligne);ajoutes.push(ligne);
  });

  lignes.sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  r.lignes=lignes;
  const arr=typeof arrRevenuePublicationFix20260912_==='function'?arrRevenuePublicationFix20260912_:arrondiTresorerieCanonique20260907_;
  const variation=arr(lignes.reduce(function(total,l){
    const d=typeof dateRevenuePublicationFix20260912_==='function'?dateRevenuePublicationFix20260912_(l&&l.date):new Date(l&&l.date);
    return d&&!isNaN(d)&&d>reference&&d<=cible?total+Number(l&&l.montantSigne||0):total;
  },0));
  r.variationPrevue=variation;
  if(Number.isFinite(Number(r.soldeReel)))r.soldePrevisionnel=arr(Number(r.soldeReel)+variation);

  r.proprietaireBudgetSoft=BUDGETSOFT_TREASURY_CANONICAL_OWNER;
  r.moteurSousJacent='chargerTresoreriePrevisionnelle20260901';
  r.versionRevenueIntermodule=typeof BUDGETSOFT_REVENUE_PUBLICATION_FIX_20260912_VERSION!=='undefined'?BUDGETSOFT_REVENUE_PUBLICATION_FIX_20260912_VERSION:'';
  r.evenementsCertainsDusInjectes=ajoutes.map(function(l){return{sourceId:l.sourceId,libelle:l.libelle,montant:l.montantSigne,date:l.date};});

  const decomposition=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(r);
  r.versionContratCanonique=BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION;
  r.decompositionCanonique=decomposition;
  if(!decomposition.ok){
    r.ok=false;
    r.erreur='Contrat canonique de trésorerie non satisfait après ajout des événements certains dus.';
    r.erreursContrat=(decomposition.erreurs||[]).slice();
  }
  return r;
}

function sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_(trajectoire,dateCible){
  if(!trajectoire||trajectoire.ok===false)return trajectoire;
  const tz=Session.getScriptTimeZone();
  const cibleDate=typeof dateRevenuePublicationFix20260912_==='function'?dateRevenuePublicationFix20260912_(dateCible):new Date(dateCible);
  if(!cibleDate||isNaN(cibleDate))return trajectoire;
  const cible=Utilities.formatDate(cibleDate,tz,'yyyy-MM-dd');
  const copie=Object.assign({},trajectoire);
  copie.lignes=(trajectoire.lignes||[]).filter(function(l){const d=new Date(l&&l.date);if(isNaN(d.getTime()))return false;return Utilities.formatDate(d,tz,'yyyy-MM-dd')<=cible;});
  const reference=typeof dateRevenuePublicationFix20260912_==='function'?dateRevenuePublicationFix20260912_(trajectoire.dateReference||new Date()):new Date(trajectoire.dateReference||new Date());
  const fin=cibleDate,dus=typeof occurrencesRecettesCertainesDuesRevenuePublicationFix20260922_==='function'?occurrencesRecettesCertainesDuesRevenuePublicationFix20260922_(reference,null,fin):[];
  const report=new Date(reference);report.setDate(report.getDate()+1);report.setHours(12,0,0,0);
  const ajoutes=[];
  (dus||[]).forEach(function(occ){
    const id=String(occ&&occ.eventId||occ&&occ.id||''),idx=Number(occ&&occ.occurrence||1),montant=Math.abs(Number(occ&&occ.montant||0));if(!id||!Number.isFinite(montant)||montant<=0)return;
    const origine=new Date(occ&&occ.date_effet||occ&&occ.date_prevue||0),d=origine&&!isNaN(origine)&&origine>reference?origine:report;if(d>fin)return;
    const deja=copie.lignes.some(function(l){const ld=typeof dateRevenuePublicationFix20260912_==='function'?dateRevenuePublicationFix20260912_(l&&l.date):new Date(l&&l.date);if(String(l&&l.source||'')!=='evenement'||String(l&&l.sourceId||'')!==id||!ld||isNaN(ld)||Number(l&&l.montantSigne||0)<=0)return false;if(Number(l&&l.occurrence||0)===idx)return true;return Math.abs(ld-d)<43200000&&Math.abs(Number(l&&l.montantSigne||0)-montant)<.011;});
    if(deja)return;
    const ligne={id:'event:'+id+':occ:'+idx+':certain-du-subview',source:'evenement',sourceId:id,occurrence:idx,occurrences:Number(occ&&occ.occurrences||1),date:new Date(d).toISOString(),libelle:String(occ&&occ.libelle||'Événement'),categorie:String(occ&&occ.categorie||''),compte:String(occ&&occ.compte||''),montantSigne:Math.round(montant*100)/100,certitude:'certaine',preuve:'Occurrence de recette Plan encore due · conservée dans la sous-vue canonique',enRetard:!!(origine&&!isNaN(origine)&&origine<=reference),datePrevueOrigine:origine&&!isNaN(origine)&&typeof isoRevenuePublicationFix20260912_==='function'?isoRevenuePublicationFix20260912_(origine):''};
    copie.lignes.push(ligne);ajoutes.push(ligne);
  });
  copie.lignes.sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  const variation=typeof sommeLignesTresorerieCanonique20260907_==='function'?sommeLignesTresorerieCanonique20260907_(copie.lignes):Math.round(copie.lignes.reduce(function(s,l){return s+Number(l&&l.montantSigne||0);},0)*100)/100;
  copie.dateCible=cible;copie.variationPrevue=variation;copie.soldePrevisionnel=Math.round((Number(copie.soldeReel||0)+Number(variation||0))*100)/100;
  copie.proprietaireBudgetSoft=BUDGETSOFT_TREASURY_CANONICAL_OWNER;copie.moteurSousJacent='chargerTresoreriePrevisionnelle20260901';copie.versionContratCanonique=BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION;copie.versionProjectionSubviewDueFix='2026-09-12.3';copie.evenementsCertainsDusInjectesSousVue=ajoutes.map(function(l){return{sourceId:l.sourceId,libelle:l.libelle,montant:l.montantSigne,date:l.date};});
  copie.decompositionCanonique=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(copie);
  if(!copie.decompositionCanonique.ok){copie.ok=false;copie.erreur='Contrat canonique de trésorerie non satisfait après conservation des événements certains dus dans la sous-vue.';copie.erreursContrat=(copie.decompositionCanonique.erreurs||[]).slice();}
  copie.optimisationSnapshot={version:'2026-09-12.3',mode:'sous_vue_trajectoire_etendue',sansRecalculMetier:true,conservationEvenementsCertainsDus:true};
  return copie;
}

function auditerTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateCible){
  const r=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateCible);
  const d=r&&r.decompositionCanonique||null;
  const out={ok:!!(r&&r.ok&&d&&d.ok),version:r&&r.version||'',proprietaire:r&&r.proprietaireBudgetSoft||'',moteurSousJacent:r&&r.moteurSousJacent||'',dateReference:r&&r.dateReference||'',dateCible:r&&r.dateCible||'',soldeReel:r&&r.soldeReel,soldePrevisionnel:r&&r.soldePrevisionnel,decomposition:d};
  console.log('[AUDIT Trajectoire canonique] '+JSON.stringify(out));return out;
}

function auditerProjectionTresorerieAu30092026(){return auditerTrajectoireTresorerieCanoniqueBudgetSoft20260907('2026-09-30');}

/** Profilage historique conservé pour comparaison. */
function auditerProfilInterneProjectionEtendueBudgetSoft20260910(){
  const cible='2026-10-31',tGlobal=Date.now(),temps={};
  const out=avecContexteLectureBudgetSoft20260827_('audit-profil-projection-etendue-20260910',function(){
    let t=Date.now();const r=chargerTresoreriePrevisionnelle20260831(cible);temps.socle20260831=Date.now()-t;
    if(!r||!r.ok)return{ok:false,version:'2026-09-10.1',lectureSeule:true,erreur:'Socle 20260831 invalide.',temps:temps};
    const reference=new Date(r.dateReference||new Date()),dateCible=new Date(r.dateCible||new Date());
    t=Date.now();const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');temps.lectureEvenements=Date.now()-t;
    t=Date.now();const actions=lireFeuilleDynamiquePlan_('Plan_Actions');temps.lectureActions=Date.now()-t;
    t=Date.now();const ops=lireTable_('Operations');temps.lectureOperations=Date.now()-t;
    const hard=(r.lignes||[]).filter(x=>x.source==='operation_future');
    t=Date.now();let lignes=recalerFluxPlanCarteTresorerie20260901_(r.lignes||[],evenements,actions,hard,reference,dateCible);temps.recalagePlanCb=Date.now()-t;
    t=Date.now();lignes=filtrerActionsPlanEffectivesTresorerie20260908_(lignes,actions);temps.filtreActions=Date.now()-t;
    t=Date.now();lignes=lignes.filter(x=>x.source!=='debit_cb_estime');temps.retraitEstimationsAnciennes=Date.now()-t;
    t=Date.now();const debitsCb=estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,dateCible);temps.estimationsCbMultiCycle=Date.now()-t;if(debitsCb.length)lignes.push.apply(lignes,debitsCb);
    t=Date.now();lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);temps.dedoublonnage=Date.now()-t;
    t=Date.now();lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));temps.tri=Date.now()-t;
    t=Date.now();const final=recalculerSortieTresorerie20260901_(r,lignes,reference,dateCible);temps.recalculSortie=Date.now()-t;
    t=Date.now();const decomposition=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(final);temps.decompositionCanonique=Date.now()-t;
    const totalEtapes=Object.keys(temps).reduce((s,k)=>s+Number(temps[k]||0),0);
    const classement=Object.keys(temps).map(k=>({etape:k,dureeMs:temps[k],partPct:totalEtapes?Math.round(temps[k]/totalEtapes*1000)/10:null})).sort((a,b)=>b.dureeMs-a.dureeMs);
    return{ok:!!(final&&final.ok!==false&&decomposition&&decomposition.ok),version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,cible:cible,temps:temps,totalEtapesMs:totalEtapes,classement:classement,cb:debitsCb.map(x=>({date:x.date,montant:arrondiTresorerieCanonique20260907_(x.montantSigne),partCerbere:arrondiTresorerieCanonique20260907_(x.partCerbere),partFinMois:arrondiTresorerieCanonique20260907_(x.partFinMois),moteurCerbere:x.moteurCerbere||''})),signature:{version:final.version||'',soldeReel:arrondiTresorerieCanonique20260907_(final.soldeReel),variationPrevue:arrondiTresorerieCanonique20260907_(final.variationPrevue),soldePrevisionnel:arrondiTresorerieCanonique20260907_(final.soldePrevisionnel),nombreLignes:(final.lignes||[]).length,contratOk:!!decomposition.ok},doctrine:'Profilage uniquement. Aucun changement moteur autorisé sur la base de ce test seul.'};
  });
  out.dureeTotaleMs=Date.now()-tGlobal;console.log('[AUDIT PERF interne projectionEtendue] '+JSON.stringify(out));return out;
}

/** A/B historique conservé : une seule lecture Cerbère pour le CB multi-cycle. */
function auditerCandidatCerbereUniquePourCbMultiCycleBudgetSoft20260910(){
  const cible='2026-10-31';
  return avecContexteLectureBudgetSoft20260827_('audit-ab-cerbere-unique-cb-20260910',function(){
    const now=finJourTresorerie_(new Date()),dateCible=finJourTresorerie_(new Date(cible)),ops=lireTable_('Operations');
    const tA=Date.now(),baseline=estimationsDebitsCbDiffereTresorerie20260908_(ops,now,dateCible),dureeBaselineMs=Date.now()-tA;
    const tC=Date.now(),chargeur=typeof chargerCerbereV374==='function'?chargerCerbereV374:(typeof chargerCerbereV37==='function'?chargerCerbereV37:null),cerbere=chargeur?chargeur():null,dureeCerbereUniqueMs=Date.now()-tC;
    const periodes=cerbere&&Array.isArray(cerbere.periodes)?cerbere.periodes:[],versionCerbere=String(cerbere&&cerbere.version||'');
    const tB=Date.now(),candidat=[];let ref=new Date(now),garde=0;
    while(ref<dateCible&&garde++<12){
      const debit=prochaineDateDebitCbTresorerie20260901_(ref);if(!debit||isNaN(debit)||debit>dateCible)break;
      const p=periodes.find(function(pp){const finCycle=new Date((pp&&pp.periode||pp||{}).fin||0);return !isNaN(finCycle)&&finCycle.getFullYear()===debit.getFullYear()&&finCycle.getMonth()===debit.getMonth();})||null;
      let partCerbere=0;if(p){const env=Array.isArray(p.enveloppes)?p.enveloppes:[];partCerbere=arrondiTresorerie_(env.reduce(function(s,x){const brut=x&&x.resteV37!=null?x.resteV37:(Number(x&&x.prevu||0)-Number(x&&x.reelNetPrevisionnel||x&&x.reelImpute||0)-Number(x&&x.planifie||0));return s+Math.max(0,Number(brut)||0);},0));}
      const partFinMois=estimationQueueCbFinMoisTresorerie20260901_(ops,ref,debit),residuel=arrondiTresorerie_(Math.max(0,partCerbere+partFinMois));
      if(residuel>0)candidat.push({id:'debit_cb_estime:'+debit.getTime(),source:'debit_cb_estime',sourceId:'cb:'+debit.getFullYear()+'-'+(debit.getMonth()+1),date:debit.toISOString(),libelle:'Complément estimé du débit CB différé',categorie:'Carte à débit différé',compte:'',montantSigne:-residuel,certitude:'estime',preuve:'Complément non encore connu : reste Cerbère du cycle aligné sur le débit + estimation marginale des jours 28-fin de mois',dateConventionnelle:false,partCerbere:partCerbere,partFinMois:partFinMois,moteurCerbere:versionCerbere});
      ref=new Date(debit.getTime()+1);
    }
    const dureeAssemblageCandidatMs=Date.now()-tB;
    function sig(xs){return(xs||[]).map(function(x){return{date:Utilities.formatDate(new Date(x.date),Session.getScriptTimeZone(),'yyyy-MM-dd'),montant:arrondiTresorerieCanonique20260907_(x.montantSigne),partCerbere:arrondiTresorerieCanonique20260907_(x.partCerbere),partFinMois:arrondiTresorerieCanonique20260907_(x.partFinMois),moteurCerbere:String(x.moteurCerbere||'')};});}
    const a=sig(baseline),b=sig(candidat),identique=JSON.stringify(a)===JSON.stringify(b),coutCandidat=dureeCerbereUniqueMs+dureeAssemblageCandidatMs,gainPct=dureeBaselineMs>0?Math.round((1-coutCandidat/dureeBaselineMs)*1000)/10:null;
    const out={ok:identique,version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,cible:cible,comparaison:{identiqueAuCentime:identique,baseline:a,candidat:b},durees:{baselineMs:dureeBaselineMs,cerbereUniqueMs:dureeCerbereUniqueMs,assemblageCandidatMs:dureeAssemblageCandidatMs,candidatTotalMs:coutCandidat,gainPct:gainPct},decision:identique?'CANDIDAT_AUTORISE_POUR_ETAPE_SUIVANTE':'REJETER_CANDIDAT',doctrine:'Aucune optimisation appliquée. Une seule lecture Cerbère ne pourra être intégrée que si les deux cycles CB sont strictement identiques au centime.'};
    console.log('[AUDIT PERF A/B Cerbère unique CB multi-cycle] '+JSON.stringify(out));return out;
  });
}

/**
 * Dernier profilage lecture seule de projectionEtendue, aligné sur le chemin de
 * production 2026-09-10.2. Contrairement au profiler historique ci-dessus, il
 * neutralise bien le CB legacy dans le socle 20260831, exactement comme le moteur
 * canonique actuel. Aucun résultat n'est publié ni écrit.
 */
function auditerProfilFinalProjectionEtendueBudgetSoft20260910(){
  const cible='2026-10-31',tGlobal=Date.now(),temps={};
  const out=avecContexteLectureBudgetSoft20260827_('audit-profil-final-projection-etendue-20260910',function(){
    let t=Date.now();
    const r=typeof chargerSocleTresorerie20260831SansDebitCbLegacy20260910_==='function'
      ?chargerSocleTresorerie20260831SansDebitCbLegacy20260910_(cible)
      :chargerTresoreriePrevisionnelle20260831(cible);
    temps.socle20260831SansCbLegacy=Date.now()-t;
    if(!r||!r.ok)return{ok:false,version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,erreur:'Socle 20260831 invalide.',temps:temps};

    const reference=new Date(r.dateReference||new Date()),dateCible=new Date(r.dateCible||new Date());
    t=Date.now();const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');temps.lectureEvenements=Date.now()-t;
    t=Date.now();const actions=lireFeuilleDynamiquePlan_('Plan_Actions');temps.lectureActions=Date.now()-t;
    t=Date.now();const ops=lireTable_('Operations');temps.lectureOperations=Date.now()-t;
    t=Date.now();const hard=(r.lignes||[]).filter(function(x){return x.source==='operation_future';});temps.extractionHard=Date.now()-t;
    t=Date.now();let lignes=recalerFluxPlanCarteTresorerie20260901_(r.lignes||[],evenements,actions,hard,reference,dateCible);temps.recalagePlanCb=Date.now()-t;
    t=Date.now();lignes=filtrerActionsPlanEffectivesTresorerie20260908_(lignes,actions);temps.filtreActions=Date.now()-t;
    t=Date.now();lignes=lignes.filter(function(x){return x.source!=='debit_cb_estime';});temps.retraitEstimationsAnciennes=Date.now()-t;
    t=Date.now();const debitsCb=estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,dateCible);temps.estimationsCbMultiCycle=Date.now()-t;
    if(debitsCb.length)lignes.push.apply(lignes,debitsCb);
    t=Date.now();lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);temps.dedoublonnage=Date.now()-t;
    t=Date.now();lignes.sort(function(a,b){return new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude);});temps.tri=Date.now()-t;
    t=Date.now();const final=recalculerSortieTresorerie20260901_(r,lignes,reference,dateCible);temps.recalculSortie=Date.now()-t;
    t=Date.now();const decomposition=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(final);temps.decompositionCanonique=Date.now()-t;

    const totalEtapesMs=Object.keys(temps).reduce(function(s,k){return s+Number(temps[k]||0);},0);
    const classement=Object.keys(temps).map(function(k){return{etape:k,dureeMs:temps[k],partPct:totalEtapesMs?Math.round(temps[k]/totalEtapesMs*1000)/10:0};}).sort(function(a,b){return b.dureeMs-a.dureeMs;});
    const cb=debitsCb.map(function(x){return{date:Utilities.formatDate(new Date(x.date),Session.getScriptTimeZone(),'yyyy-MM-dd'),montant:arrondiTresorerieCanonique20260907_(x.montantSigne),partCerbere:arrondiTresorerieCanonique20260907_(x.partCerbere),partFinMois:arrondiTresorerieCanonique20260907_(x.partFinMois),moteurCerbere:String(x.moteurCerbere||'')};});
    return{
      ok:!!(final&&final.ok!==false&&decomposition&&decomposition.ok),version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,cible:cible,
      temps:temps,totalEtapesMs:totalEtapesMs,classement:classement,
      cb:cb,
      signature:{version:String(final.version||''),soldeReel:arrondiTresorerieCanonique20260907_(final.soldeReel),variationPrevue:arrondiTresorerieCanonique20260907_(final.variationPrevue),soldePrevisionnel:arrondiTresorerieCanonique20260907_(final.soldePrevisionnel),nombreLignes:(final.lignes||[]).length,contratOk:!!decomposition.ok},
      diagnosticDecision:'Si estimationsCbMultiCycle reste un bloc de plusieurs secondes comparable au coût Cerbère du snapshot, tester ensuite la réutilisation du Cerbère déjà calculé par le snapshot. Si aucun bloc ne dépasse environ 2 s hors lectures, arrêter l’optimisation profonde.',
      doctrine:'Dernier diagnostic ciblé uniquement. Aucun changement métier ni optimisation appliquée.'
    };
  });
  out.dureeTotaleMs=Date.now()-tGlobal;
  console.log('[AUDIT PERF final projectionEtendue] '+JSON.stringify(out));
  return out;
}
