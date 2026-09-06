const COMPTES_REVIEW_20260828_VERSION='2026-09-06.2';

/**
 * Lecture prioritaire de la révision globale : l'ouverture de Comptes ne doit plus
 * recalculer un sous-ensemble ni choisir un snapshot local d'un âge différent.
 */
function chargerSyntheseComptesDepuisSnapshotGlobal20260906_(){
  if(typeof chargerSnapshotGlobalBudgetSoft20260906!=='function')return null;
  try{
    const g=chargerSnapshotGlobalBudgetSoft20260906();
    const e=g&&g.disponible&&g.etat;
    const c=e&&e.ok===true&&e.modules&&e.modules.comptes;
    // Une révision globale construite avec un ancien moteur Comptes n'est jamais
    // réutilisée après déploiement : on tombe en calcul de secours jusqu'au prochain
    // snapshot global cohérent.
    if(!c||c.ok!==true||String(c.version||'')!==COMPTES_REVIEW_20260828_VERSION)return null;
    const r=JSON.parse(JSON.stringify(c));
    r.revisionBudgetSoft=e.revisionBudgetSoft||g.revisionBudgetSoft||'';
    r.genereLeBudgetSoft=e.genereLe||g.genereLe||'';
    r.performance={
      dureeMs:0,
      controleDashboardExecute:false,
      source:'snapshot_global',
      snapshotPerime:false,
      snapshotGenereLe:r.genereLeBudgetSoft,
      revisionBudgetSoft:r.revisionBudgetSoft
    };
    r.snapshotPerime=false;
    return r;
  }catch(e){return null;}
}

/**
 * Vue Comptes rapide.
 * Source de vérité bancaire : dernier solde de relevé certifié + mouvements réels
 * postérieurs selon date_comptable.
 * En régime normal l'UI lit le snapshot global BudgetSoft ; le calcul local ci-dessous
 * n'est qu'un secours d'initialisation/compatibilité.
 */
function chargerSyntheseComptes20260828(){
  const t0=Date.now();
  const global=chargerSyntheseComptesDepuisSnapshotGlobal20260906_();
  if(global){global.performance.dureeMs=Date.now()-t0;return global;}

  let s=null;
  try{s=chargerSnapshotComptes20260828();}catch(e){s=null;}
  if(s&&s.disponible&&s.vue&&!s.perime&&String(s.vue.version||'')===COMPTES_REVIEW_20260828_VERSION){
    const r=JSON.parse(JSON.stringify(s.vue));
    r.performance={dureeMs:Date.now()-t0,controleDashboardExecute:false,source:'snapshot_local_secours',snapshotPerime:false,snapshotGenereLe:s.genereLe||''};
    r.snapshotPerime=false;
    return r;
  }

  const refresh=rafraichirSnapshotComptes20260828();
  const r=refresh&&refresh.vue?JSON.parse(JSON.stringify(refresh.vue)):construireSyntheseComptes20260828_();
  r.performance={dureeMs:Date.now()-t0,controleDashboardExecute:false,source:'recalcul_secours',snapshotPerime:false,snapshotGenereLe:refresh&&refresh.genereLe||''};
  r.snapshotPerime=false;
  return r;
}

function construireSyntheseComptes20260828_(){
  const comptes=lireTable_('Comptes');
  const operations=lireTable_('Operations');
  const parametres=Object.fromEntries(lireTable_('Parametres').map(function(p){return[String(p.cle),p.valeur];}));
  const aujourdHuiFin=new Date();aujourdHuiFin.setHours(23,59,59,999);
  const comptesParCle={};comptes.forEach(function(c){comptesParCle[String(c.id)]=c;comptesParCle[String(c.nom)]=c;});
  const refs={},cumulReel={},cumulApresRef={},derniereDateReelle={};
  comptes.forEach(function(c){
    const id=String(c.id),valeur=parametres['solde_releve_'+id],dateBrute=parametres['date_solde_releve_'+id];
    const base=valeur===undefined||valeur===''?null:Number(String(valeur).replace(',','.')),date=dateBrute?new Date(dateBrute):null;
    refs[id]={disponible:Number.isFinite(base)&&date&&!isNaN(date),solde:Number.isFinite(base)?base:null,date:date&&!isNaN(date)?date:null};cumulReel[id]=0;cumulApresRef[id]=0;derniereDateReelle[id]=null;
  });

  operations.forEach(function(brut){
    if(/\[RECURRENCE:[^\]]+\]/.test(String(brut&&brut.commentaire||'')))return;
    let o=brut;if(!(o&&o.date_comptable)&&typeof enrichirDepuisCommentaireBanque_==='function'){try{o=enrichirDepuisCommentaireBanque_(brut)||brut;}catch(e){o=brut;}}
    const jour=typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):null;
    const jourAuj=typeof jourReferenceCanonBudgetSoft20260906_==='function'?jourReferenceCanonBudgetSoft20260906_(new Date()):null;
    const d=new Date((o&&o.date_comptable)||(o&&o.date));
    if((jour&&jourAuj&&jour>jourAuj)||(!jour&&isNaN(d))||(!jour&&d>aujourdHuiFin))return;
    const type=String(o&&o.type||'').toLowerCase();if(type!=='revenu'&&type!=='depense')return;
    const compte=comptesParCle[String(o.compte)];if(!compte)return;
    const id=String(compte.id),brutMontant=Math.abs(Number(o.montant||0));if(!Number.isFinite(brutMontant)||brutMontant<=0)return;
    const montant=type==='depense'?-brutMontant:brutMontant;cumulReel[id]+=montant;
    if(!derniereDateReelle[id]||d>derniereDateReelle[id])derniereDateReelle[id]=d;
    const ref=refs[id];if(ref&&ref.disponible&&d>ref.date)cumulApresRef[id]+=montant;
  });

  const lignes=comptes.map(function(c){
    const id=String(c.id),ref=refs[id];
    const solde=ref&&ref.disponible?arrondirComptes20260828_(ref.solde+cumulApresRef[id]):arrondirComptes20260828_(Number(c.solde_initial||0)+cumulReel[id]);
    let dateSolde=ref&&ref.disponible?ref.date:derniereDateReelle[id];if(derniereDateReelle[id]&&ref&&ref.disponible&&derniereDateReelle[id]>ref.date)dateSolde=derniereDateReelle[id];
    return {id:c.id,nom:c.nom,type:c.type,actif:c.actif,soldeReel:solde,dateSolde:dateSolde?Utilities.formatDate(dateSolde,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',sourceSolde:ref&&ref.disponible?'releve_certifie':'solde_initial'};
  });
  const actifs=lignes.filter(function(c){return actifComptes20260828_(c.actif);});
  const sommeTypes=function(types){return arrondirComptes20260828_(actifs.filter(function(c){return types.indexOf(String(c.type||'').toLowerCase())>=0;}).reduce(function(s,c){return s+c.soldeReel;},0));};
  let pluxee=null;try{const p=chargerPluxee();pluxee=p&&p.ok?Number(p.solde):null;}catch(e){pluxee=null;}
  return {ok:true,version:COMPTES_REVIEW_20260828_VERSION,synthese:{disponible:sommeTypes(['courant','especes']),epargne:sommeTypes(['epargne']),placements:sommeTypes(['placement']),pluxee:Number.isFinite(pluxee)?arrondirComptes20260828_(pluxee):null},comptes:lignes,archives:lignes.filter(function(c){return !actifComptes20260828_(c.actif);}).length};
}

function auditerPerformanceComptesRapide20260828(){const t0=Date.now(),r=chargerSyntheseComptes20260828(),out={ok:r.ok===true,version:r.version,dureeMs:Date.now()-t0,source:r.performance&&r.performance.source||'',snapshotPerime:!!r.snapshotPerime,revisionBudgetSoft:r.revisionBudgetSoft||'',synthese:r.synthese,comptes:r.comptes.length,controleDashboardExecute:false};console.log(JSON.stringify(out));return out;}
function auditerSyntheseComptes20260828(){
  const tComptes=Date.now(),r=construireSyntheseComptes20260828_(),dureeComptesMs=Date.now()-tComptes;let dashboardSolde=null,dashboardErreur='',dureeDashboardMs=null;const tDashboard=Date.now();
  try{const d=chargerDashboardReelV2();dashboardSolde=d&&d.courtTerme&&Number.isFinite(Number(d.courtTerme.soldeBancaire))?Number(d.courtTerme.soldeBancaire):null;}catch(e){dashboardErreur=e&&e.message?e.message:String(e);}dureeDashboardMs=Date.now()-tDashboard;
  const audit={ok:r.ok===true,version:r.version,synthese:r.synthese,controleDashboard:{solde:Number.isFinite(dashboardSolde)?arrondirComptes20260828_(dashboardSolde):null,ecart:Number.isFinite(dashboardSolde)?arrondirComptes20260828_(r.synthese.disponible-dashboardSolde):null,erreur:dashboardErreur||null},performance:{comptesMs:dureeComptesMs,dashboardMs:dureeDashboardMs,totalAuditMs:dureeComptesMs+dureeDashboardMs},comptes:r.comptes.map(function(c){return{nom:c.nom,type:c.type,actif:actifComptes20260828_(c.actif),soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde};}),archives:r.archives};console.log(JSON.stringify(audit));return audit;
}
function actifComptes20260828_(v){return v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0';}
function arrondirComptes20260828_(n){return Math.round((Number(n)||0)*100)/100;}
