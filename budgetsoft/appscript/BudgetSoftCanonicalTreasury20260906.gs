const BUDGETSOFT_CANONICAL_TREASURY_VERSION='2026-09-06.1';

function arrTresorerieCanoniqueBudgetSoft20260906_(n){return Math.round(Number(n||0)*100)/100;}
function finJourTresorerieCanoniqueBudgetSoft20260906_(v){const d=v instanceof Date?new Date(v):new Date(v||new Date());if(isNaN(d.getTime()))return null;d.setHours(23,59,59,999);return d;}
function estCompteCourantCanoniqueBudgetSoft20260906_(c){const s=String((c&&c.nom||'')+' '+(c&&c.type||'')+' '+(c&&c.nature||'')).toLowerCase();return /courant|compte\s*(joint|ch[eè]ques?)/.test(s)&&!/livret|epargne|épargne|placement/.test(s);}
function estEpargneCanoniqueBudgetSoft20260906_(c){return /livret|epargne|épargne|placement/i.test(String((c&&c.nom||'')+' '+(c&&c.type||'')+' '+(c&&c.nature||'')));}
function operationReelleCanoniqueBudgetSoft20260906_(o){return !/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||''));}
function montantSigneCanoniqueBudgetSoft20260906_(o){const n=Number(o&&o.montant||0);if(Number.isFinite(n)&&Math.abs(n)>.000001)return n;const a=Math.abs(Number(o&&o.montant||0)),t=String(o&&o.type||'').toLowerCase();if(t==='depense'||t==='tresorerie_sortie')return-a;if(t==='revenu'||t==='tresorerie_entree')return a;return 0;}

/**
 * Prévision comptable canonique BudgetSoft.
 *
 * Cette fonction ne contient AUCUNE doctrine Cerbère et n'invente aucun flux.
 * Elle répond uniquement à : « avec le solde réel canonique et les opérations
 * déjà connues dont la date comptable est future, quel sera le solde à la date X ? »
 *
 * Charges fixes non encore matérialisées, Plan et dépenses pilotables estimées
 * appartiennent à une projection étendue distincte ; elles ne modifient jamais
 * cette vérité comptable certaine.
 */
function construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,dateCible,dateReference){
  const ref=finJourTresorerieCanoniqueBudgetSoft20260906_(dateReference||new Date());
  let cible=finJourTresorerieCanoniqueBudgetSoft20260906_(dateCible||ref);if(!ref||!cible)throw new Error('Date de trésorerie canonique invalide.');if(cible<ref)cible=new Date(ref);
  const lignesComptes=Array.isArray(comptes&&comptes.comptes)?comptes.comptes.filter(c=>typeof actifCanonBudgetSoft20260906_==='function'?actifCanonBudgetSoft20260906_(c.actif):true):[];
  const courants=lignesComptes.filter(estCompteCourantCanoniqueBudgetSoft20260906_);
  const perimetre=courants.length?courants:lignesComptes.filter(c=>!estEpargneCanoniqueBudgetSoft20260906_(c));
  const cles=new Set();perimetre.forEach(c=>{cles.add(String(c.id||''));cles.add(String(c.nom||''));});
  const soldeReel=arrTresorerieCanoniqueBudgetSoft20260906_(perimetre.reduce((s,c)=>s+Number(c&&c.soldeReel||0),0));

  let operations=Array.isArray(sources&&sources.Operations)?sources.Operations:[];
  if(typeof dedoublonnerOperationsCartesBudgetSoft_==='function'){
    try{operations=dedoublonnerOperationsCartesBudgetSoft_(operations);}catch(e){}
  }
  const lignes=[];
  operations.forEach(o=>{
    if(!operationReelleCanoniqueBudgetSoft20260906_(o))return;
    const d=typeof dateComptableCanonBudgetSoft20260906_==='function'?dateComptableCanonBudgetSoft20260906_(o):null;
    if(!d||d<=ref||d>cible)return;
    if(!cles.has(String(o&&o.compte||'')))return;
    const m=montantSigneCanoniqueBudgetSoft20260906_(o);if(!Number.isFinite(m)||Math.abs(m)<.000001)return;
    lignes.push({id:String(o&&o.id||''),date:d.toISOString(),libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),categorie:String(o&&o.categorie||''),compte:String(o&&o.compte||''),montantSigne:arrTresorerieCanoniqueBudgetSoft20260906_(m),source:'operation_future_comptable'});
  });
  lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||String(a.id).localeCompare(String(b.id)));
  const variation=arrTresorerieCanoniqueBudgetSoft20260906_(lignes.reduce((s,x)=>s+Number(x.montantSigne||0),0));
  const soldePrevisionnel=arrTresorerieCanoniqueBudgetSoft20260906_(soldeReel+variation);
  return {ok:true,version:BUDGETSOFT_CANONICAL_TREASURY_VERSION,doctrine:'date comptable uniquement ; aucune estimation Cerbère/Plan/CF virtuelle',dateReference:ref.toISOString(),dateCible:cible.toISOString(),soldeReel,variationComptableCertaine:variation,soldePrevisionnel,operationsFutures:lignes,nombreOperationsFutures:lignes.length,comptes:perimetre.map(c=>({id:c.id,nom:c.nom,soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde}))};
}

function chargerTresorerieComptableCanoniqueBudgetSoft20260906(dateCible){
  const executer=function(){
    const sources=chargerToutesLesDonnees();
    const comptes=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828();
    return construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,dateCible,new Date());
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('tresorerie-comptable-canonique',executer):executer();
}

function auditerTresorerieComptableCanoniqueBudgetSoft20260906(dateCible){const r=chargerTresorerieComptableCanoniqueBudgetSoft20260906(dateCible);console.log(JSON.stringify(r));return r;}
