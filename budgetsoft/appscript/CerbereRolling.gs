const CERBERE_ROLLING_VERSION='3.6.1';

/**
 * Cerbère roulant — doctrine de fiabilisation.
 * - cycle BudgetSoft 28 -> 27 ;
 * - CB de M => engagement réel imputé à M+1 ; autres sorties variables => M ;
 * - charges fixes, règlements globaux de carte et récurrences techniques ne sont
 *   jamais recomptés dans les enveloppes ;
 * - Santé = coût net ; hors-P0 = Divers ;
 * - P0 reste le canon, les réglages Pn restent locaux.
 */
function chargerCerbereRoulant(){
  const base=chargerCerbereV33();
  if(!base||base.ok===false)return base;
  const operations=lireTable_('Operations');
  let comptes=[];try{comptes=lireTable_('Comptes');}catch(e){}
  const cartes=identifierComptesCarteCerbere361_(comptes),periodes=base.periodes||[];
  const catsP0=new Set((base.p0&&base.p0.postes||[]).map(x=>String(x.categorie||'').trim()).filter(Boolean));catsP0.add('Divers');
  const roll=periodes.map(()=>({cbHeritee:0,cbEngageePourSuivant:0,cbParCategorie:{},nonCbParCategorie:{},santeDepensesNonCb:0,santeRemboursements:0,santeCbHeritee:0,reglementsCarteNeutralises:0,chargesFixesNeutralisees:0,lignesTechniquesNeutralisees:0,operationsCb:0,operationsNonCb:0,operationsIgnorees:0,diversSources:{},candidatsCbNonReconnus:0}));

  (operations||[]).forEach(o=>{
    const d=dateComptableCerbere_(o);if(!d)return;const pi=indicePeriodeCerbere361_(d,periodes);if(pi<0)return;
    const m=montantSigneCerbereV3_(o);if(!Number.isFinite(m)||Math.abs(m)<.0001)return;const b=roll[pi];
    if(estReglementGlobalCarteCerbere361_(o)){if(m<0)b.reglementsCarteNeutralises+=Math.abs(m);b.operationsIgnorees++;return;}
    const exclusion=raisonExclusionEnveloppeCerbere361_(o);
    if(exclusion){if(exclusion==='charge_fixe')b.chargesFixesNeutralisees+=Math.abs(Math.min(0,m));if(exclusion==='technique')b.lignesTechniquesNeutralisees+=Math.abs(Math.min(0,m));b.operationsIgnorees++;return;}
    const sante=typeof estMouvementSanteCerbereV35_==='function'&&estMouvementSanteCerbereV35_(o);
    const cat=sante?'Santé':categoriePilotageCerbere361_(String(o.categorie||'').trim(),catsP0,b),cb=estOperationCarteCerbere361_(o,cartes);
    if(cb&&m<0){const cible=pi+1;b.cbEngageePourSuivant+=Math.abs(m);b.operationsCb++;if(cible<roll.length){const c=roll[cible];c.cbHeritee+=Math.abs(m);c.cbParCategorie[cat]=(c.cbParCategorie[cat]||0)+Math.abs(m);if(cat==='Santé')c.santeCbHeritee+=Math.abs(m);}return;}
    if(m<0){b.operationsNonCb++;if(cat==='Santé')b.santeDepensesNonCb+=Math.abs(m);else b.nonCbParCategorie[cat]=(b.nonCbParCategorie[cat]||0)+Math.abs(m);}
    else if(m>0&&sante)b.santeRemboursements+=m;
    if(m<0&&semblePaiementCarteCerbere361_(o)&&!cb)b.candidatsCbNonReconnus++;
  });

  roll.forEach(r=>{
    const net=Math.max(0,r.santeDepensesNonCb+r.santeCbHeritee-r.santeRemboursements),cb=Math.min(r.santeCbHeritee,net);
    r.nonCbParCategorie['Santé']=Math.max(0,net-cb);r.cbParCategorie['Santé']=cb;
    r.reelNonCb=sommeObjetCerbere361_(r.nonCbParCategorie);r.cbHeritee=sommeObjetCerbere361_(r.cbParCategorie);
  });

  periodes.forEach((p,i)=>{
    const r=roll[i];assurerDiversDansPeriodeCerbere361_(p);
    if((p.enveloppes||[]).some(x=>String(x.categorie||'').trim()==='Épargne'))p.budgetDisponible=arrondirCerbereV3_(Number(p.budgetDisponible||0)+Number(p.epargne||0));
    const exist=new Set((p.enveloppes||[]).map(x=>String(x.categorie||'')));
    Object.keys(r.nonCbParCategorie).concat(Object.keys(r.cbParCategorie)).forEach(cat=>{if(cat&&!exist.has(cat)){(p.enveloppes||(p.enveloppes=[])).push({categorie:cat,canon:0,monetaire:0,pluxee:0,nature:'ajustable',prevu:0,planifie:0});exist.add(cat);}});
    let nonCb=0,cb=0,plan=0,budget=0;
    (p.enveloppes||[]).forEach(x=>{const cat=String(x.categorie||''),n=Number(r.nonCbParCategorie[cat]||0),c=Number(r.cbParCategorie[cat]||0),pl=Number(x.planifie||0),bu=Number(x.prevu||0);x.reelNonCb=arrondirCerbereV3_(n);x.cbHeritee=arrondirCerbereV3_(c);x.reelImpute=arrondirCerbereV3_(n+c);x.resteBudget=arrondirCerbereV3_(bu-n-c-pl);nonCb+=n;cb+=c;plan+=pl;budget+=bu;});
    p.budgetReparti=arrondirCerbereV3_(budget);p.planDansEnveloppes=arrondirCerbereV3_(plan);
    p.resteBudgetAlloue=arrondirCerbereV3_(budget-nonCb-cb-plan);
    p.margeNonAffectee=arrondirCerbereV3_(Number(p.budgetDisponible||0)-budget);
    p.capacitePilotable=arrondirCerbereV3_(Number(p.budgetDisponible||0)-nonCb-cb-plan);
    p.resteAVentiler=p.margeNonAffectee;
    p.roulant={reelNonCb:arrondirCerbereV3_(nonCb),cbHeritee:arrondirCerbereV3_(cb),cbEngageePourSuivant:arrondirCerbereV3_(r.cbEngageePourSuivant),cbParCategorie:r.cbParCategorie,nonCbParCategorie:r.nonCbParCategorie,reglementsCarteNeutralises:arrondirCerbereV3_(r.reglementsCarteNeutralises),chargesFixesNeutralisees:arrondirCerbereV3_(r.chargesFixesNeutralisees),lignesTechniquesNeutralisees:arrondirCerbereV3_(r.lignesTechniquesNeutralisees),operationsCb:r.operationsCb,operationsNonCb:r.operationsNonCb,operationsIgnorees:r.operationsIgnorees,diversSources:r.diversSources,candidatsCbNonReconnus:r.candidatsCbNonReconnus,reconciliation:{reelNonCbIndexe:arrondirCerbereV3_(r.reelNonCb),reelNonCbAffiche:arrondirCerbereV3_(nonCb),ecart:arrondirCerbereV3_(r.reelNonCb-nonCb)},sante:{depenses:arrondirCerbereV3_(r.santeDepensesNonCb+r.santeCbHeritee),remboursements:arrondirCerbereV3_(r.santeRemboursements),net:arrondirCerbereV3_(Number(r.nonCbParCategorie['Santé']||0)+Number(r.cbParCategorie['Santé']||0))}};
  });

  base.fenetreRoulante=construireFenetreRoulanteCerbere361_(periodes);base.version=CERBERE_ROLLING_VERSION;
  base.principe='Cerbère pilote M/M+1 : CB de M imputée à M+1, autres dépenses variables à M, charges fixes hors enveloppes, santé nette.';
  base.diagnostic=base.diagnostic||{};base.diagnostic.cartes_identifiees={ids:Array.from(cartes.ids),noms:Array.from(cartes.noms)};base.diagnostic.moteur_roulant=CERBERE_ROLLING_VERSION;base.diagnostic.reconciliation_ok=periodes.every(p=>Math.abs(Number(p.roulant&&p.roulant.reconciliation&&p.roulant.reconciliation.ecart||0))<.01);
  return serialiserCerberePourClient_(base);
}

function construireFenetreRoulanteCerbere361_(periodes){
  const m=periodes[0],n=periodes[1];if(!m||!n)return null;
  const capM=Number(m.capacitePilotable||0),capN=Number(n.capacitePilotable||0),budM=Number(m.resteBudgetAlloue||0),budN=Number(n.resteBudgetAlloue||0);
  const recOk=[m,n].every(p=>Math.abs(Number(p.roulant&&p.roulant.reconciliation&&p.roulant.reconciliation.ecart||0))<.01),cbDoute=[m,n].some(p=>Number(p.roulant&&p.roulant.candidatsCbNonReconnus||0)>0);
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
  if(!recOk)raisons.push('écart de réconciliation entre index et lignes affichées');
  if(!raisons.length)raisons.push('budgets alloués et capacité de trésorerie restent positifs sur M et M+1');
  return{niveau,titre,raisons,resteM:arrondirCerbereV3_(capM),resteM1:arrondirCerbereV3_(capN),resteBudgetM:arrondirCerbereV3_(budM),resteBudgetM1:arrondirCerbereV3_(budN)};
}

function assurerDiversDansPeriodeCerbere361_(p){const e=p.enveloppes||(p.enveloppes=[]);if(e.some(x=>String(x.categorie||'').trim()==='Divers'))return;const i=e.findIndex(x=>String(x.categorie||'').trim()==='Épargne'),l={categorie:'Divers',canon:0,monetaire:0,pluxee:0,nature:'ajustable',prevu:0,planifie:0};if(i>=0)e.splice(i,0,l);else e.push(l);}
function categoriePilotageCerbere361_(cat,cats,b){const c=String(cat||'').trim();if(c&&cats.has(c))return c;const s=c||'(sans catégorie)';b.diversSources[s]=(b.diversSources[s]||0)+1;return'Divers';}
function raisonExclusionEnveloppeCerbere361_(o){const c=String(o&&o.commentaire||'');if(/\[RECURRENCE:[^\]]+\]/.test(c))return'technique';if(/\[CHARGE_FIXE:[^\]]+\]/.test(c)||String(o&&o.charge_fixe_id||'').trim())return'charge_fixe';return'';}
function identifierComptesCarteCerbere361_(comptes){const ids=new Set(),noms=new Set();(comptes||[]).forEach(c=>{const s=normaliserTexteCerbereV35_([c.type,c.nature,c.nom,c.libelle].filter(Boolean).join(' '));if(/\bcarte\b|\bcb\b|debit differe|paiement differe/.test(s)){if(c.id!=null)ids.add(String(c.id));if(c.nom)noms.add(normaliserTexteCerbereV35_(c.nom));}});return{ids,noms};}
function estOperationCarteCerbere361_(o,cartes){const compte=String(o&&(o.compte_id||o.compte)||'');if(cartes.ids.has(compte)||cartes.noms.has(normaliserTexteCerbereV35_(compte)))return true;const mode=normaliserTexteCerbereV35_([o&&o.mode,o&&o.mode_paiement,o&&o.moyen_paiement,o&&o.type_paiement,o&&o.moyen].filter(Boolean).join(' '));if(/\bcb\b|carte bancaire|carte bleue|debit differe|paiement carte/.test(mode))return true;const s=normaliserTexteCerbereV35_([o&&o.libelle_bancaire,o&&o.libelle,o&&o.description,o&&o.details].filter(Boolean).join(' '));return /\bpaiement cb\b|\bachat cb\b|\bcb [a-z0-9]|\bcarte [0-9]{2} ?[0-9]{2}\b|\bcarte [0-9]{2} [0-9]{2}\b/.test(s);}
function semblePaiementCarteCerbere361_(o){const s=normaliserTexteCerbereV35_([o&&o.libelle_bancaire,o&&o.libelle,o&&o.description,o&&o.details,o&&o.commentaire].filter(Boolean).join(' '));return /\bcb\b|\bcarte\b|debit differe/.test(s);}
function estReglementGlobalCarteCerbere361_(o){const s=normaliserTexteCerbereV35_([o&&o.categorie,o&&o.libelle,o&&o.libelle_bancaire,o&&o.commentaire,o&&o.description].filter(Boolean).join(' '));return /\[reglement cb\]|\[debit cb\]|reglement carte differee|reglement carte|debit differe carte|prelevement carte differee|releve carte.*prelev/.test(s);}
function indicePeriodeCerbere361_(date,periodes){const t=debutJour_(new Date(date)).getTime();if(!isFinite(t))return-1;for(let i=0;i<(periodes||[]).length;i++){const p=periodes[i].periode||periodes[i],a=debutJour_(new Date(p.debut)).getTime(),b=debutJour_(new Date(p.fin)).getTime();if(t>=a&&t<=b)return i;}return-1;}
function sommeObjetCerbere361_(o){return arrondirCerbereV3_(Object.keys(o||{}).reduce((s,k)=>s+Math.max(0,Number(o[k]||0)),0));}
