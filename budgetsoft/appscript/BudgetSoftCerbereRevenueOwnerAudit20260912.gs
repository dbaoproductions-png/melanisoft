const BUDGETSOFT_CERBERE_REVENUE_OWNER_AUDIT_20260912_VERSION='2026-09-12.1';

function arrAuditRecettesCerbere20260912_(n){return Math.round(Number(n||0)*100)/100;}
function jourAuditRecettesCerbere20260912_(v){
  if(!v)return'';const d=v instanceof Date?new Date(v):new Date(v);if(isNaN(d.getTime()))return'';
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function signatureLigneAuditRecettesCerbere20260912_(l){
  return [jourAuditRecettesCerbere20260912_(l&&l.date),String(l&&l.source||''),String(l&&l.sourceId||''),arrAuditRecettesCerbere20260912_(l&&l.montantSigne)].join('|');
}

/**
 * Audit lecture seule :
 * 1) décompose le Rt1 final du cycle courant après toutes les passes Cerbère ;
 * 2) expose le bloc Plan qui explique l'écart entre socle R0 réévalué et Rt1 ;
 * 3) liste les recettes réelles actuellement exclues de Rt1 parce que leur catégorie
 *    est typée « tresorerie » (notamment remboursements santé) ;
 * 4) vérifie que l'écran Comptes et la trajectoire bancaire Cerbère consomment
 *    exactement la même projectionEtendue, la même révision et les mêmes lignes.
 *
 * Aucune écriture, aucune reconstruction, aucune mutation.
 */
function auditerRecettesCerbereEtUniteComptesBudgetSoft20260912(){
  const t0=Date.now();
  const snap=chargerSnapshotGlobalBudgetSoft20260906();
  const etat=snap&&snap.disponible&&snap.etat,modules=etat&&etat.modules||{};
  const cerbere=modules.cerbere||{},periodes=Array.isArray(cerbere.periodes)?cerbere.periodes:[],p=periodes[0]||{},v=p.v37||{},periode=p.periode||p;
  const revision=etat&&etat.revisionBudgetSoft||snap&&snap.revisionBudgetSoft||'';
  const rt1=arrAuditRecettesCerbere20260912_(v.rt1);
  const audit=v.rt1Audit&&typeof v.rt1Audit==='object'?v.rt1Audit:{};
  const canonEffectif=audit.canonEffectifParCategorie&&typeof audit.canonEffectifParCategorie==='object'?audit.canonEffectifParCategorie:{};
  const detailCanon=Object.keys(canonEffectif).map(function(cat){
    const x=canonEffectif[cat]||{};
    return {categorie:cat,canonCycle:arrAuditRecettesCerbere20260912_(x.cycle),reel:arrAuditRecettesCerbere20260912_(x.reel),retenu:arrAuditRecettesCerbere20260912_(x.retenu)};
  });
  let socleFinal=detailCanon.length?detailCanon.reduce(function(s,x){return s+Number(x.retenu||0);},0):Number(audit.socle||0);
  socleFinal=arrAuditRecettesCerbere20260912_(socleFinal);
  const horsR0=arrAuditRecettesCerbere20260912_(audit.horsR0!=null?audit.horsR0:v.recettesHorsR0Reelles);
  const tresorerieExclue=arrAuditRecettesCerbere20260912_(audit.tresorerieExclue);
  const planCycle=arrAuditRecettesCerbere20260912_(audit.planCycle!=null?audit.planCycle:(audit.plan!=null?audit.plan:v.recettesEvenements));
  const blocAuDelaSocle=arrAuditRecettesCerbere20260912_(rt1-socleFinal);
  const lignesPlan=(Array.isArray(v.actionsEvenementsCycle)?v.actionsEvenementsCycle:[]).filter(function(x){return Number(x&&x.montantSigne||0)>0;}).map(function(x){
    return {source:String(x.source||''),id:String(x.id||''),libelle:String(x.libelle||''),categorie:String(x.categorie||''),dateEffet:String(x.dateEffet||''),statut:String(x.statut||''),realise:!!x.realise,montant:arrAuditRecettesCerbere20260912_(x.montant),montantSigne:arrAuditRecettesCerbere20260912_(x.montantSigne),operationReelleId:String(x.operationReelleId||'')};
  });

  const categories=lireTable_('Categories')||[],types={};
  categories.forEach(function(c){types[String(c&&c.nom||c&&c.categorie||'').trim()]=String(c&&c.type||'').trim().toLowerCase();});
  const operations=lireTable_('Operations')||[],recettesTresorerie=[];
  operations.forEach(function(o){
    const d=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):new Date(o&&o.date_comptable||o&&o.date||0);
    const m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim();
    if(!d||isNaN(d.getTime())||!(m>0)||types[cat]!=='tresorerie')return;
    if(typeof dateDansCycleV377_==='function'&&!dateDansCycleV377_(d,periode))return;
    recettesTresorerie.push({id:String(o&&o.id||''),date:jourAuditRecettesCerbere20260912_(d),categorie:cat,libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),montant:arrAuditRecettesCerbere20260912_(m)});
  });
  const totalRecettesTresorerie=arrAuditRecettesCerbere20260912_(recettesTresorerie.reduce(function(s,x){return s+x.montant;},0));

  const cible=String(periode&&periode.fin||'')||'2026-09-27';
  const comptesProjection=chargerTresorerieUnifieeBudgetSoft20260907(cible);
  const cerbereProjection=chargerTrajectoireBanqueCerbereRapide20260903(cible,cerbere);
  const ref=String(comptesProjection&&comptesProjection.dateReference||'');
  const filtrer=function(xs){return (xs||[]).filter(function(l){const j=jourAuditRecettesCerbere20260912_(l&&l.date);return j&&(!ref||j>ref)&&j<=cible;});};
  const lignesComptes=filtrer(comptesProjection&&comptesProjection.lignes),lignesCerbere=filtrer(cerbereProjection&&cerbereProjection.lignes);
  const sigComptes=lignesComptes.map(signatureLigneAuditRecettesCerbere20260912_).sort();
  const sigCerbere=lignesCerbere.map(signatureLigneAuditRecettesCerbere20260912_).sort();
  const memeRevision=!!revision&&String(comptesProjection&&comptesProjection.revisionBudgetSoft||'')===revision&&String(cerbereProjection&&cerbereProjection.revisionBudgetSoft||'')===revision;
  const memesLignes=JSON.stringify(sigComptes)===JSON.stringify(sigCerbere);
  const memeSoldeReel=Math.abs(Number(comptesProjection&&comptesProjection.soldeReel||0)-Number(cerbereProjection&&cerbereProjection.soldeReel||0))<=.01;
  const net=function(xs){return arrAuditRecettesCerbere20260912_((xs||[]).reduce(function(s,l){return s+Number(l&&l.montantSigne||0);},0));};
  const uniteComptesCerbere={
    ok:!!(comptesProjection&&comptesProjection.ok&&cerbereProjection&&cerbereProjection.ok&&memeRevision&&memesLignes&&memeSoldeReel),
    cible:cible,revisionSnapshot:revision,revisionComptes:String(comptesProjection&&comptesProjection.revisionBudgetSoft||''),revisionCerbere:String(cerbereProjection&&cerbereProjection.revisionBudgetSoft||''),
    memeRevision:memeRevision,memesLignes:memesLignes,memeSoldeReel:memeSoldeReel,
    soldeReelComptes:Number(comptesProjection&&comptesProjection.soldeReel),soldeReelCerbere:Number(cerbereProjection&&cerbereProjection.soldeReel),
    soldePrevisionnelComptes:Number(comptesProjection&&comptesProjection.soldePrevisionnel),
    nombreLignesComptes:lignesComptes.length,nombreLignesCerbere:lignesCerbere.length,netComptes:net(lignesComptes),netCerbere:net(lignesCerbere),
    proprietaireComptes:String(comptesProjection&&comptesProjection.proprietaireBudgetSoft||''),sourceCerbere:String(cerbereProjection&&cerbereProjection.sourceBudgetSoft||'')
  };

  const out={
    ok:!!(etat&&etat.ok===true&&uniteComptesCerbere.ok),
    version:BUDGETSOFT_CERBERE_REVENUE_OWNER_AUDIT_20260912_VERSION,
    lectureSeule:true,revisionBudgetSoft:revision,
    cycle:{debut:String(periode&&periode.debut||''),fin:String(periode&&periode.fin||''),rt1:rt1},
    decompositionRt1:{socleFinal:socleFinal,horsR0:horsR0,tresorerieExclue:tresorerieExclue,planCycle:planCycle,blocAuDelaSocle:blocAuDelaSocle,ecartRecomposition:arrAuditRecettesCerbere20260912_(rt1-(socleFinal+horsR0-tresorerieExclue+planCycle))},
    rt1Audit:audit,
    canonEffectif:detailCanon,
    recettesPlanPositives:lignesPlan,
    recettesTypeTresorerieExclues:{total:totalRecettesTresorerie,lignes:recettesTresorerie},
    uniteComptesCerbere:uniteComptesCerbere,
    diagnostic175:{rt1:rt1,socleFinal:socleFinal,differenceRt1Socle:blocAuDelaSocle,planCycle:planCycle,tresorerieExclue:tresorerieExclue,objectif:'expliquer au centime le bloc de 175 € observé sans modifier le moteur'},
    dureeMs:Date.now()-t0
  };
  console.log('[AUDIT propriétaire recettes Cerbère + unité Comptes] '+JSON.stringify(out));
  return out;
}
