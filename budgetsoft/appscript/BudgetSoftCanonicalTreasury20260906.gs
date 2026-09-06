const BUDGETSOFT_CANONICAL_TREASURY_VERSION='2026-09-06.3';

function arrTresorerieCanoniqueBudgetSoft20260906_(n){return Math.round(Number(n||0)*100)/100;}
function finJourTresorerieCanoniqueBudgetSoft20260906_(v){
  const jour=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(v||new Date()):null;
  if(jour){const p=jour.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2],23,59,59,999);return d;}
  const d=v instanceof Date?new Date(v):new Date(v||new Date());if(isNaN(d.getTime()))return null;d.setHours(23,59,59,999);return d;
}
function estCompteCourantCanoniqueBudgetSoft20260906_(c){const s=String((c&&c.nom||'')+' '+(c&&c.type||'')+' '+(c&&c.nature||'')).toLowerCase();return /courant|compte\s*(joint|ch[eè]ques?)/.test(s)&&!/livret|epargne|épargne|placement/.test(s);}
function estEpargneCanoniqueBudgetSoft20260906_(c){return /livret|epargne|épargne|placement/i.test(String((c&&c.nom||'')+' '+(c&&c.type||'')+' '+(c&&c.nature||'')));}
function operationReelleCanoniqueBudgetSoft20260906_(o){return !/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||''));}
function montantSigneCanoniqueBudgetSoft20260906_(o){const n=Number(o&&o.montant||0);if(Number.isFinite(n)&&Math.abs(n)>.000001)return n;const a=Math.abs(Number(o&&o.montant||0)),t=String(o&&o.type||'').toLowerCase();if(t==='depense'||t==='tresorerie_sortie')return-a;if(t==='revenu'||t==='tresorerie_entree')return a;return 0;}

/**
 * Prévision comptable canonique BudgetSoft.
 * AUCUNE doctrine Cerbère et aucun flux inventé : solde réel canonique + opérations
 * déjà connues dont la date_comptable est future et <= cible.
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
  if(typeof dedoublonnerOperationsCartesBudgetSoft_==='function'){try{operations=dedoublonnerOperationsCartesBudgetSoft_(operations);}catch(e){}}
  const lignes=[];
  operations.forEach(o=>{
    if(!operationReelleCanoniqueBudgetSoft20260906_(o))return;
    const d=typeof dateComptableCanonBudgetSoft20260906_==='function'?dateComptableCanonBudgetSoft20260906_(o):null;
    if(!d||d<=ref||d>cible)return;
    if(!cles.has(String(o&&o.compte||'')))return;
    const m=montantSigneCanoniqueBudgetSoft20260906_(o);if(!Number.isFinite(m)||Math.abs(m)<.000001)return;
    lignes.push({id:String(o&&o.id||''),date:Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'),libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),categorie:String(o&&o.categorie||''),compte:String(o&&o.compte||''),montantSigne:arrTresorerieCanoniqueBudgetSoft20260906_(m),source:'operation_future_comptable'});
  });
  lignes.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id)));
  const variation=arrTresorerieCanoniqueBudgetSoft20260906_(lignes.reduce((s,x)=>s+Number(x.montantSigne||0),0));
  const soldePrevisionnel=arrTresorerieCanoniqueBudgetSoft20260906_(soldeReel+variation);
  return {ok:true,version:BUDGETSOFT_CANONICAL_TREASURY_VERSION,doctrine:'date comptable uniquement ; aucune estimation Cerbère/Plan/CF virtuelle',dateReference:jourReferenceCanonBudgetSoft20260906_(ref),dateCible:jourReferenceCanonBudgetSoft20260906_(cible),soldeReel,variationComptableCertaine:variation,variationPrevue:variation,soldePrevisionnel,operationsFutures:lignes,nombreOperationsFutures:lignes.length,confiance:{niveau:'certain',libelle:'Comptable'},comptes:perimetre.map(c=>({id:c.id,nom:c.nom,soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde}))};
}

function lireTresorerieComptableSnapshotBudgetSoft20260906_(dateCible){
  if(typeof chargerSnapshotGlobalBudgetSoft20260906!=='function')return null;
  try{
    const g=chargerSnapshotGlobalBudgetSoft20260906(),e=g&&g.disponible&&g.etat,t=e&&e.ok===true&&e.modules&&e.modules.tresorerieComptable;
    if(!t||t.ok!==true||String(t.version||'')!==BUDGETSOFT_CANONICAL_TREASURY_VERSION)return null;
    const ref=jourReferenceCanonBudgetSoft20260906_(t.dateReference),max=jourReferenceCanonBudgetSoft20260906_(t.dateCible),cible=jourReferenceCanonBudgetSoft20260906_(dateCible||max);
    if(cible<ref||cible>max)return null;
    const lignes=(t.operationsFutures||[]).filter(x=>{const j=jourReferenceCanonBudgetSoft20260906_(x.date);return j>ref&&j<=cible;});
    const variation=arrTresorerieCanoniqueBudgetSoft20260906_(lignes.reduce((s,x)=>s+Number(x.montantSigne||0),0));
    return {ok:true,version:BUDGETSOFT_CANONICAL_TREASURY_VERSION,source:'snapshot_global',revisionBudgetSoft:e.revisionBudgetSoft||g.revisionBudgetSoft||'',genereLeBudgetSoft:e.genereLe||g.genereLe||'',doctrine:t.doctrine||'date comptable uniquement',dateReference:ref,dateCible:cible,soldeReel:Number(t.soldeReel||0),variationComptableCertaine:variation,variationPrevue:variation,soldePrevisionnel:arrTresorerieCanoniqueBudgetSoft20260906_(Number(t.soldeReel||0)+variation),operationsFutures:lignes,nombreOperationsFutures:lignes.length,confiance:{niveau:'certain',libelle:'Comptable'}};
  }catch(e){return null;}
}

function chargerTresorerieComptableCanoniqueBudgetSoft20260906(dateCible){
  const snapshot=lireTresorerieComptableSnapshotBudgetSoft20260906_(dateCible);
  if(snapshot)return snapshot;
  const executer=function(){
    const sources=chargerToutesLesDonnees();
    const comptes=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():chargerSyntheseComptes20260828();
    const r=construireTresorerieComptableCanoniqueBudgetSoft20260906_(sources,comptes,dateCible,new Date());r.source='recalcul_secours';return r;
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('tresorerie-comptable-canonique',executer):executer();
}

function auditerTresorerieComptableCanoniqueBudgetSoft20260906(dateCible){const r=chargerTresorerieComptableCanoniqueBudgetSoft20260906(dateCible);console.log(JSON.stringify(r));return r;}
