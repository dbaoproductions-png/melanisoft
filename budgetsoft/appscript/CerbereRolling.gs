const CERBERE_ROLLING_VERSION='3.6.1';

/**
 * Doctrine Cerbère court terme :
 * - cycle BudgetSoft 28 -> 27 ;
 * - dépense CB réalisée en M => engagement réel imputé à M+1 ;
 * - autres mouvements => M ;
 * - une charge fixe/ligne technique n'est jamais recomptée dans les enveloppes ;
 * - Santé est lue en net ;
 * - toute dépense hors P0 est regroupée dans Divers ;
 * - le poste de commandement quotidien est la fenêtre roulante M/M+1.
 */
function chargerCerbereRoulant(){
  const base=chargerCerbereV33();
  if(!base||base.ok===false)return base;

  const operations=lireTable_('Operations');
  let comptes=[];try{comptes=lireTable_('Comptes');}catch(e){}
  const cartes=identifierComptesCarteCerbere361_(comptes);
  const periodes=base.periodes||[];
  const categoriesP0=new Set((base.p0&&base.p0.postes||[]).map(x=>String(x.categorie||'').trim()).filter(Boolean));
  categoriesP0.add('Divers');

  const rolling=periodes.map(()=>({
    cbHeritee:0,cbEngageePourSuivant:0,reelNonCb:0,
    cbParCategorie:{},nonCbParCategorie:{},
    santeDepensesNonCb:0,santeRemboursements:0,santeCbHeritee:0,
    reglementsCarteNeutralises:0,chargesFixesNeutralisees:0,lignesTechniquesNeutralisees:0,
    operationsCb:0,operationsNonCb:0,operationsIgnorees:0,
    diversSources:{},candidatsCbNonReconnus:0
  }));

  (operations||[]).forEach(o=>{
    const d=dateComptableCerbere_(o);if(!d)return;
    const pi=indicePeriodeCerbere361_(d,periodes);if(pi<0)return;
    const m=montantSigneCerbereV3_(o);if(!Number.isFinite(m)||Math.abs(m)<.0001)return;
    const b=rolling[pi];

    if(estReglementGlobalCarteCerbere361_(o)){
      if(m<0)b.reglementsCarteNeutralises+=Math.abs(m);
      b.operationsIgnorees++;return;
    }
    const exclusion=raisonExclusionEnveloppeCerbere361_(o);
    if(exclusion){
      if(exclusion==='charge_fixe')b.chargesFixesNeutralisees+=Math.abs(Math.min(0,m));
      if(exclusion==='technique')b.lignesTechniquesNeutralisees+=Math.abs(Math.min(0,m));
      b.operationsIgnorees++;return;
    }

    const estSante=typeof estMouvementSanteCerbereV35_==='function'&&estMouvementSanteCerbereV35_(o);
    const catBrute=String(o.categorie||'').trim();
    const cat=estSante?'Santé':categoriePilotageCerbere361_(catBrute,categoriesP0,b);
    const cb=estOperationCarteCerbere361_(o,cartes);

    if(cb&&m<0){
      const cible=pi+1;
      b.cbEngageePourSuivant+=Math.abs(m);b.operationsCb++;
      if(cible<rolling.length){
        const c=rolling[cible];
        c.cbHeritee+=Math.abs(m);
        c.cbParCategorie[cat]=(c.cbParCategorie[cat]||0)+Math.abs(m);
        if(cat==='Santé')c.santeCbHeritee+=Math.abs(m);
      }
      return;
    }

    if(m<0){
      b.operationsNonCb++;
      if(cat==='Santé')b.santeDepensesNonCb+=Math.abs(m);
      else b.nonCbParCategorie[cat]=(b.nonCbParCategorie[cat]||0)+Math.abs(m);
    }else if(m>0&&estSante){
      // Un remboursement santé réduit le coût net de la période ; ce n'est pas un revenu d'enveloppe.
      b.santeRemboursements+=m;
    }

    if(m<0&&semblePaiementCarteCerbere361_(o)&&!cb)b.candidatsCbNonReconnus++;
  });

  // Santé nette et réconciliation des montants affichés.
  rolling.forEach(r=>{
    const santeNetteTotale=Math.max(0,r.santeDepensesNonCb+r.santeCbHeritee-r.santeRemboursements);
    const santeCb=Math.min(r.santeCbHeritee,santeNetteTotale);
    const santeNonCb=Math.max(0,santeNetteTotale-santeCb);
    r.nonCbParCategorie['Santé']=santeNonCb;
    r.cbParCategorie['Santé']=santeCb;
    r.reelNonCb=sommeObjetCerbere361_(r.nonCbParCategorie);
    r.cbHeritee=sommeObjetCerbere361_(r.cbParCategorie);
  });

  periodes.forEach((p,i)=>{
    const r=rolling[i];
    assurerDiversDansPeriodeCerbere361_(p);
    const existantes=new Set((p.enveloppes||[]).map(x=>String(x.categorie||'')));
    // Sécurité : aucune somme réelle ne doit disparaître de l'écran.
    Object.keys(r.nonCbParCategorie).concat(Object.keys(r.cbParCategorie)).forEach(cat=>{
      if(cat&&!existantes.has(cat)){
        (p.enveloppes||(p.enveloppes=[])).push({categorie:cat,canon:0,monetaire:0,pluxee:0,nature:'ajustable',prevu:0,planifie:0});
        existantes.add(cat);
      }
    });

    let reelAffiche=0,cbAffiche=0,planDansEnveloppes=0,budgetAlloue=0;
    (p.enveloppes||[]).forEach(x=>{
      const cat=String(x.categorie||'');
      const nonCb=Number(r.nonCbParCategorie[cat]||0),cbH=Number(r.cbParCategorie[cat]||0),plan=Number(x.planifie||0),budget=Number(x.prevu||0);
      x.reelNonCb=arrondirCerbereV3_(nonCb);x.cbHeritee=arrondirCerbereV3_(cbH);x.reelImpute=arrondirCerbereV3_(nonCb+cbH);
      x.resteBudget=arrondirCerbereV3_(budget-nonCb-cbH-plan);
      reelAffiche+=nonCb;cbAffiche+=cbH;planDansEnveloppes+=plan;budgetAlloue+=budget;
    });

    p.budgetReparti=arrondirCerbereV3_(budgetAlloue);
    p.planDansEnveloppes=arrondirCerbereV3_(planDansEnveloppes);
    p.resteBudgetAlloue=arrondirCerbereV3_(budgetAlloue-reelAffiche-cbAffiche-planDansEnveloppes);
    p.margeNonAffectee=arrondirCerbereV3_(Number(p.budgetDisponible||0)-budgetAlloue);
    p.capacitePilotable=arrondirCerbereV3_(Number(p.budgetDisponible||0)-reelAffiche-cbAffiche-planDansEnveloppes);
    // Compatibilité : resteAVentiler garde sa signification technique de marge non affectée.
    p.resteAVentiler=p.margeNonAffectee;
    p.roulant={
      reelNonCb:arrondirCerbereV3_(reelAffiche),cbHeritee:arrondirCerbereV3_(cbAffiche),
      cbEngageePourSuivant:arrondirCerbereV3_(r.cbEngageePourSuivant),
      cbParCategorie:r.cbParCategorie,nonCbParCategorie:r.nonCbParCategorie,
      reglementsCarteNeutralises:arrondirCerbereV3_(r.reglementsCarteNeutralises),
      chargesFixesNeutralisees:arrondirCerbereV3_(r.chargesFixesNeutralisees),
      lignesTechniquesNeutralisees:arrondirCerbereV3_(r.lignesTechniquesNeutralisees),
      operationsCb:r.operationsCb,operationsNonCb:r.operationsNonCb,operationsIgnorees:r.operationsIgnorees,
      diversSources:r.diversSources,candidatsCbNonReconnus:r.candidatsCbNonReconnus,
      reconciliation:{reelNonCbIndexe:arrondirCerbereV3_(r.reelNonCb),reelNonCbAffiche:arrondirCerbereV3_(reelAffiche),ecart:arrondirCerbereV3_(r.reelNonCb-reelAffiche)},
      sante:{depenses:arrondirCerbereV3_(r.santeDepensesNonCb+r.santeCbHeritee),remboursements:arrondirCerbereV3_(r.santeRemboursements),net:arrondirCerbereV3_(Number(r.nonCbParCategorie['Santé']||0)+Number(r.cbParCategorie['Santé']||0))}
    };
  });

  base.fenetreRoulante=construireFenetreRoulanteCerbere361_(periodes);
  base.version=CERBERE_ROLLING_VERSION;
  base.principe='Cerbère pilote M et M+1 ensemble : CB de M imputée à M+1 ; autres dépenses variables à M ; charges fixes hors enveloppes ; santé nette.';
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.cartes_identifiees={ids:Array.from(cartes.ids),noms:Array.from(cartes.noms)};
  base.diagnostic.moteur_roulant=CERBERE_ROLLING_VERSION;
  base.diagnostic.reconciliation_ok=periodes.every(p=>Math.abs(Number(p.roulant&&p.roulant.reconciliation&&p.roulant.reconciliation.ecart||0))<.01);
  return serialiserCerberePourClient_(base);
}

function construireFenetreRoulanteCerbere361_(periodes){
  const m=periodes[0]||null,n=periodes[1]||null;if(!m||!n)return null;
  const capM=Number(m.capacitePilotable||0),capN=Number(n.capacitePilotable||0);
  const budM=Number(m.resteBudgetAlloue||0),budN=Number(n.resteBudgetAlloue||0);
  const recOk=[m,n].every(p=>Math.abs(Number(p.roulant&&p.roulant.reconciliation&&p.roulant.reconciliation.ecart||0))<.01);
  const cbDoute=(Number(m.roulant&&m.roulant.candidatsCbNonReconnus||0)+Number(n.roulant&&n.roulant.candidatsCbNonReconnus||0))>0;
  let niveau='vert',titre='Trajectoire saine sur deux mois';
  if(!recOk){niveau='rouge';titre='Calcul incomplet : le réel affiché ne se réconcilie pas';}
  else if(capM<-.009||capN<-.009){niveau='rouge';titre='Risque de trésorerie sur la fenêtre roulante';}
  else if(budM<-.009||budN<-.009||cbDoute){niveau='orange';titre='Vigilance : budget dépassé ou imputation CB à contrôler';}
  else if(Number(n.roulant&&n.roulant.cbHeritee||0)>Number(n.budgetReparti||0)*.6){niveau='orange';titre='Vigilance : le mois suivant est déjà fortement engagé par la CB';}

  const raisons=[];
  if(budM<-.009)raisons.push('M dépasse son budget alloué de '+arrondirCerbereV3_(Math.abs(budM))+' €');
  if(budN<-.009)raisons.push('M+1 dépasse déjà son budget alloué de '+arrondirCerbereV3_(Math.abs(budN))+' €');
  if(Number(n.roulant&&n.roulant.cbHeritee||0)>0)raisons.push(arrondirCerbereV3_(n.roulant.cbHeritee)+' € de CB de M déjà imputés à M+1');
  if(Number(n.engagementsPlanifies||0)>0)raisons.push(arrondirCerbereV3_(n.engagementsPlanifies)+' € de Plan à venir sur M+1');
  if(Number(m.engagementsPlanifies||0)>0)raisons.push(arrondirCerbereV3_(m.engagementsPlanifies)+' € de Plan à venir sur M');
  if(cbDoute)raisons.push('des opérations ressemblant à des paiements CB restent à classifier');
  if(!recOk)raisons.push('écart de réconciliation détecté entre index et lignes affichées');
  if(!raisons.length)raisons.push('budgets alloués et capacité de trésorerie restent positifs sur M et M+1');
  return{niveau,titre,raisons,resteM:arrondirCerbereV3_(capM),resteM1:arrondirCerbereV3_(capN),resteBudgetM:arrondirCerbereV3_(budM),resteBudgetM1:arrondirCerbereV3_(budN)};
}

function assurerDiversDansPeriodeCerbere361_(p){
  const env=p.enveloppes||(p.enveloppes=[]);
  if(env.some(x=>String(x.categorie||'').trim()==='Divers'))return;
  const iEpargne=env.findIndex(x=>String(x.categorie||'').trim()==='Épargne');
  const ligne={categorie:'Divers',canon:0,monetaire:0,pluxee:0,nature:'ajustable',prevu:0,planifie:0};
  if(iEpargne>=0)env.splice(iEpargne,0,ligne);else env.push(ligne);
}

function categoriePilotageCerbere361_(cat,categoriesP0,bucket){
  const c=String(cat||'').trim();
  if(c&&categoriesP0.has(c))return c;
  const source=c||'(sans catégorie)';bucket.diversSources[source]=(bucket.diversSources[source]||0)+1;
  return'Divers';
}

function raisonExclusionEnveloppeCerbere361_(o){
  const commentaire=String(o&&o.commentaire||'');
  if(/\[RECURRENCE:[^\]]+\]/.test(commentaire))return'technique';
  if(/\[CHARGE_FIXE:[^\]]+\]/.test(commentaire)||String(o&&o.charge_fixe_id||'').trim())return'charge_fixe';
  return'';
}

function identifierComptesCarteCerbere361_(comptes){
  const ids=new Set(),noms=new Set();
  (comptes||[]).forEach(c=>{
    const s=normaliserTexteCerbereV35_([c.type,c.nature,c.nom,c.libelle].filter(Boolean).join(' '));
    if(/\bcarte\b|\bcb\b|debit differe|paiement differe/.test(s)){
      if(c.id!==undefined&&c.id!==null)ids.add(String(c.id));
      if(c.nom)noms.add(normaliserTexteCerbereV35_(c.nom));
    }
  });
  return{ids,noms};
}
function estOperationCarteCerbere361_(o,cartes){
  const compte=String(o&& (o.compte_id||o.compte)||'');
  if(cartes.ids.has(compte)||cartes.noms.has(normaliserTexteCerbereV35_(compte)))return true;
  const mode=normaliserTexteCerbereV35_([o&&o.mode,o&&o.mode_paiement,o&&o.moyen_paiement,o&&o.type_paiement,o&&o.moyen].filter(Boolean).join(' '));
  if(/\bcb\b|carte bancaire|carte bleue|debit differe|paiement carte/.test(mode))return true;
  const s=normaliserTexteCerbereV35_([o&&o.libelle_bancaire,o&&o.libelle,o&&o.description,o&&o.details].filter(Boolean).join(' '));
  return /\bpaiement cb\b|\bachat cb\b|\bcb [a-z0-9]|\bcarte [0-9]{2} ?[0-9]{2}\b|\bcarte [0-9]{2} [0-9]{2}\b/.test(s);
}
function semblePaiementCarteCerbere361_(o){
  const s=normaliserTexteCerbereV35_([o&&o.libelle_bancaire,o&&o.libelle,o&&o.description,o&&o.details,o&&o.commentaire].filter(Boolean).join(' '));
  return /\bcb\b|\bcarte\b|debit differe/.test(s);
}
function estReglementGlobalCarteCerbere361_(o){
  const s=normaliserTexteCerbereV35_([o&&o.categorie,o&&o.libelle,o&&o.libelle_bancaire,o&&o.commentaire,o&&o.description].filter(Boolean).join(' '));
  return /\[reglement cb\]|\[debit cb\]|reglement carte differee|reglement carte|debit differe carte|prelevement carte differee|releve carte.*prelev/.test(s);
}
function indicePeriodeCerbere361_(date,periodes){
  const t=debutJour_(new Date(date)).getTime();if(!isFinite(t))return-1;
  for(let i=0;i<(periodes||[]).length;i++){
    const p=periodes[i].periode||periodes[i],a=debutJour_(new Date(p.debut)).getTime(),b=debutJour_(new Date(p.fin)).getTime();
    if(t>=a&&t<=b)return i;
  }
  return-1;
}
function sommeObjetCerbere361_(o){return arrondirCerbereV3_(Object.keys(o||{}).reduce((s,k)=>s+Math.max(0,Number(o[k]||0)),0));}
