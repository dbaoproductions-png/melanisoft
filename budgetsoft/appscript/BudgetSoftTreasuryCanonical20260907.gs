const BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION='2026-09-08.1';
const BUDGETSOFT_TREASURY_CANONICAL_OWNER='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907';

function arrondiTresorerieCanonique20260907_(n){return Math.round((Number(n)||0)*100)/100;}
function estCbTresorerieCanonique20260907_(l){
  const s=String((l&&l.categorie||'')+' '+(l&&l.libelle||'')+' '+(l&&l.preuve||'')).toLowerCase();
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

/**
 * Propriétaire canonique BudgetSoft du prévisionnel bancaire.
 * Le moteur doctrinal 20260901 construit les flux métier ; cette fonction impose
 * le contrat de publication, la décomposition canonique et l'interdiction de régression.
 */
function construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateCible){
  if(typeof chargerTresoreriePrevisionnelle20260901!=='function')return{ok:false,version:BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION,erreur:'Moteur doctrinal 20260901 absent.'};
  const r=chargerTresoreriePrevisionnelle20260901(dateCible);
  if(!r||r.ok===false)return r;
  const decomposition=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(r);
  r.proprietaireBudgetSoft=BUDGETSOFT_TREASURY_CANONICAL_OWNER;
  r.moteurSousJacent='chargerTresoreriePrevisionnelle20260901';
  r.versionContratCanonique=BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION;
  r.decompositionCanonique=decomposition;
  if(!decomposition.ok){r.ok=false;r.erreur='Contrat canonique de trésorerie non satisfait.';r.erreursContrat=decomposition.erreurs.slice();}
  return r;
}

/**
 * Sous-vue canonique pure d'une trajectoire déjà calculée jusqu'à un horizon plus long.
 * Aucun recalcul métier : filtrage temporel, recomposition du solde et réapplication
 * du même contrat canonique. Utilisée uniquement après validation A/B ligne par ligne.
 */
function sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_(trajectoire,dateCible){
  if(!trajectoire||trajectoire.ok===false)return trajectoire;
  const cible=Utilities.formatDate(new Date(dateCible),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const copie=Object.assign({},trajectoire);
  copie.lignes=(trajectoire.lignes||[]).filter(function(l){
    const d=new Date(l&&l.date);
    if(isNaN(d.getTime()))return false;
    return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd')<=cible;
  });
  const variation=sommeLignesTresorerieCanonique20260907_(copie.lignes);
  copie.dateCible=cible;
  copie.soldePrevisionnel=arrondiTresorerieCanonique20260907_(Number(copie.soldeReel||0)+variation);
  copie.proprietaireBudgetSoft=BUDGETSOFT_TREASURY_CANONICAL_OWNER;
  copie.moteurSousJacent='chargerTresoreriePrevisionnelle20260901';
  copie.versionContratCanonique=BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION;
  copie.decompositionCanonique=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(copie);
  copie.optimisationSnapshot={version:'2026-09-10.1',mode:'sous_vue_trajectoire_etendue',sansRecalculMetier:true};
  if(!copie.decompositionCanonique.ok){copie.ok=false;copie.erreur='Contrat canonique de trésorerie non satisfait après sous-vue.';copie.erreursContrat=copie.decompositionCanonique.erreurs.slice();}
  return copie;
}

function auditerTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateCible){
  const r=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateCible);
  const d=r&&r.decompositionCanonique||null;
  const out={ok:!!(r&&r.ok&&d&&d.ok),version:r&&r.version||'',proprietaire:r&&r.proprietaireBudgetSoft||'',moteurSousJacent:r&&r.moteurSousJacent||'',dateReference:r&&r.dateReference||'',dateCible:r&&r.dateCible||'',soldeReel:r&&r.soldeReel,soldePrevisionnel:r&&r.soldePrevisionnel,decomposition:d};
  console.log('[AUDIT Trajectoire canonique] '+JSON.stringify(out));return out;
}

/**
 * Wrapper déterministe de non-régression : cible explicitement le 30/09/2026.
 * Évite qu'une exécution manuelle sans paramètre retombe sur l'horizon par défaut.
 */
function auditerProjectionTresorerieAu30092026(){
  return auditerTrajectoireTresorerieCanoniqueBudgetSoft20260907('2026-09-30');
}

/**
 * Profilage interne lecture seule du propriétaire canonique.
 * Rejoue exactement la passe 20260901 par étapes afin de localiser le coût,
 * sans écrire ni publier quoi que ce soit. La cible couvre deux débits CB.
 */
function auditerProfilInterneProjectionEtendueBudgetSoft20260910(){
  const cible='2026-10-31',tGlobal=Date.now(),temps={};
  const out=avecContexteLectureBudgetSoft20260827_('audit-profil-projection-etendue-20260910',function(){
    let t=Date.now();
    const r=chargerTresoreriePrevisionnelle20260831(cible);
    temps.socle20260831=Date.now()-t;
    if(!r||!r.ok)return{ok:false,version:'2026-09-10.1',lectureSeule:true,erreur:'Socle 20260831 invalide.',temps:temps};

    const reference=new Date(r.dateReference||new Date()),dateCible=new Date(r.dateCible||new Date());
    t=Date.now();const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');temps.lectureEvenements=Date.now()-t;
    t=Date.now();const actions=lireFeuilleDynamiquePlan_('Plan_Actions');temps.lectureActions=Date.now()-t;
    t=Date.now();const ops=lireTable_('Operations');temps.lectureOperations=Date.now()-t;
    const hard=(r.lignes||[]).filter(x=>x.source==='operation_future');

    t=Date.now();let lignes=recalerFluxPlanCarteTresorerie20260901_(r.lignes||[],evenements,actions,hard,reference,dateCible);temps.recalagePlanCb=Date.now()-t;
    t=Date.now();lignes=filtrerActionsPlanEffectivesTresorerie20260908_(lignes,actions);temps.filtreActions=Date.now()-t;
    t=Date.now();lignes=lignes.filter(x=>x.source!=='debit_cb_estime');temps.retraitEstimationsAnciennes=Date.now()-t;

    t=Date.now();const debitsCb=estimationsDebitsCbDiffereTresorerie20260908_(ops,reference,dateCible);temps.estimationsCbMultiCycle=Date.now()-t;
    if(debitsCb.length)lignes.push.apply(lignes,debitsCb);

    t=Date.now();lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);temps.dedoublonnage=Date.now()-t;
    t=Date.now();lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));temps.tri=Date.now()-t;
    t=Date.now();const final=recalculerSortieTresorerie20260901_(r,lignes,reference,dateCible);temps.recalculSortie=Date.now()-t;
    t=Date.now();const decomposition=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(final);temps.decompositionCanonique=Date.now()-t;

    const totalEtapes=Object.keys(temps).reduce((s,k)=>s+Number(temps[k]||0),0);
    const classement=Object.keys(temps).map(k=>({etape:k,dureeMs:temps[k],partPct:totalEtapes?Math.round(temps[k]/totalEtapes*1000)/10:null})).sort((a,b)=>b.dureeMs-a.dureeMs);
    return{
      ok:!!(final&&final.ok!==false&&decomposition&&decomposition.ok),
      version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,cible:cible,
      temps:temps,totalEtapesMs:totalEtapes,classement:classement,
      cb:debitsCb.map(x=>({date:x.date,montant:arrondiTresorerieCanonique20260907_(x.montantSigne),partCerbere:arrondiTresorerieCanonique20260907_(x.partCerbere),partFinMois:arrondiTresorerieCanonique20260907_(x.partFinMois),moteurCerbere:x.moteurCerbere||''})),
      signature:{version:final.version||'',soldeReel:arrondiTresorerieCanonique20260907_(final.soldeReel),variationPrevue:arrondiTresorerieCanonique20260907_(final.variationPrevue),soldePrevisionnel:arrondiTresorerieCanonique20260907_(final.soldePrevisionnel),nombreLignes:(final.lignes||[]).length,contratOk:!!decomposition.ok},
      doctrine:'Profilage uniquement. Aucun changement moteur autorisé sur la base de ce test seul.'
    };
  });
  out.dureeTotaleMs=Date.now()-tGlobal;
  console.log('[AUDIT PERF interne projectionEtendue] '+JSON.stringify(out));
  return out;
}

/**
 * A/B lecture seule du calcul CB multi-cycle.
 * Baseline : primitive actuelle, qui recharge Cerbère pour chaque débit.
 * Candidat : une seule lecture Cerbère, puis sélection du bon cycle pour chaque débit.
 * Aucun résultat n'est publié ni injecté dans le moteur.
 */
function auditerCandidatCerbereUniquePourCbMultiCycleBudgetSoft20260910(){
  const cible='2026-10-31';
  return avecContexteLectureBudgetSoft20260827_('audit-ab-cerbere-unique-cb-20260910',function(){
    const now=finJourTresorerie_(new Date());
    const dateCible=finJourTresorerie_(new Date(cible));
    const ops=lireTable_('Operations');

    const tA=Date.now();
    const baseline=estimationsDebitsCbDiffereTresorerie20260908_(ops,now,dateCible);
    const dureeBaselineMs=Date.now()-tA;

    const tC=Date.now();
    const chargeur=typeof chargerCerbereV374==='function'?chargerCerbereV374:(typeof chargerCerbereV37==='function'?chargerCerbereV37:null);
    const cerbere=chargeur?chargeur():null;
    const dureeCerbereUniqueMs=Date.now()-tC;
    const periodes=cerbere&&Array.isArray(cerbere.periodes)?cerbere.periodes:[];
    const versionCerbere=String(cerbere&&cerbere.version||'');

    const tB=Date.now();
    const candidat=[];let ref=new Date(now),garde=0;
    while(ref<dateCible&&garde++<12){
      const debit=prochaineDateDebitCbTresorerie20260901_(ref);
      if(!debit||isNaN(debit)||debit>dateCible)break;
      const p=periodes.find(function(pp){
        const finCycle=new Date((pp&&pp.periode||pp||{}).fin||0);
        return !isNaN(finCycle)&&finCycle.getFullYear()===debit.getFullYear()&&finCycle.getMonth()===debit.getMonth();
      })||null;
      let partCerbere=0;
      if(p){
        const env=Array.isArray(p.enveloppes)?p.enveloppes:[];
        partCerbere=arrondiTresorerie_(env.reduce(function(s,x){
          const brut=x&&x.resteV37!=null?x.resteV37:(Number(x&&x.prevu||0)-Number(x&&x.reelNetPrevisionnel||x&&x.reelImpute||0)-Number(x&&x.planifie||0));
          return s+Math.max(0,Number(brut)||0);
        },0));
      }
      const partFinMois=estimationQueueCbFinMoisTresorerie20260901_(ops,ref,debit);
      const residuel=arrondiTresorerie_(Math.max(0,partCerbere+partFinMois));
      if(residuel>0)candidat.push({
        id:'debit_cb_estime:'+debit.getTime(),source:'debit_cb_estime',sourceId:'cb:'+debit.getFullYear()+'-'+(debit.getMonth()+1),date:debit.toISOString(),
        libelle:'Complément estimé du débit CB différé',categorie:'Carte à débit différé',compte:'',montantSigne:-residuel,certitude:'estime',
        preuve:'Complément non encore connu : reste Cerbère du cycle aligné sur le débit + estimation marginale des jours 28-fin de mois',dateConventionnelle:false,
        partCerbere:partCerbere,partFinMois:partFinMois,moteurCerbere:versionCerbere
      });
      ref=new Date(debit.getTime()+1);
    }
    const dureeAssemblageCandidatMs=Date.now()-tB;

    function sig(xs){return (xs||[]).map(function(x){return{
      date:Utilities.formatDate(new Date(x.date),Session.getScriptTimeZone(),'yyyy-MM-dd'),
      montant:arrondiTresorerieCanonique20260907_(x.montantSigne),
      partCerbere:arrondiTresorerieCanonique20260907_(x.partCerbere),
      partFinMois:arrondiTresorerieCanonique20260907_(x.partFinMois),
      moteurCerbere:String(x.moteurCerbere||'')
    };});}
    const a=sig(baseline),b=sig(candidat);
    const identique=JSON.stringify(a)===JSON.stringify(b);
    const coutCandidat=dureeCerbereUniqueMs+dureeAssemblageCandidatMs;
    const gainPct=dureeBaselineMs>0?Math.round((1-coutCandidat/dureeBaselineMs)*1000)/10:null;
    const out={
      ok:identique,
      version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,cible:cible,
      comparaison:{identiqueAuCentime:identique,baseline:a,candidat:b},
      durees:{baselineMs:dureeBaselineMs,cerbereUniqueMs:dureeCerbereUniqueMs,assemblageCandidatMs:dureeAssemblageCandidatMs,candidatTotalMs:coutCandidat,gainPct:gainPct},
      decision:identique?'CANDIDAT_AUTORISE_POUR_ETAPE_SUIVANTE':'REJETER_CANDIDAT',
      doctrine:'Aucune optimisation appliquée. Une seule lecture Cerbère ne pourra être intégrée que si les deux cycles CB sont strictement identiques au centime.'
    };
    console.log('[AUDIT PERF A/B Cerbère unique CB multi-cycle] '+JSON.stringify(out));
    return out;
  });
}
