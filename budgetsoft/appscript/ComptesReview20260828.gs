const COMPTES_REVIEW_20260828_VERSION='2026-09-06.5';

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
    if(!c||c.ok!==true||String(c.version||'')!==COMPTES_REVIEW_20260828_VERSION)return null;
    const r=JSON.parse(JSON.stringify(c));
    r.revisionBudgetSoft=e.revisionBudgetSoft||g.revisionBudgetSoft||'';
    r.genereLeBudgetSoft=e.genereLe||g.genereLe||'';
    r.performance={dureeMs:0,controleDashboardExecute:false,source:'snapshot_global',snapshotPerime:false,snapshotGenereLe:r.genereLeBudgetSoft,revisionBudgetSoft:r.revisionBudgetSoft};
    r.snapshotPerime=false;
    return r;
  }catch(e){return null;}
}

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
  const r=refresh&&refresh.vue&&String(refresh.vue.version||'')===COMPTES_REVIEW_20260828_VERSION?JSON.parse(JSON.stringify(refresh.vue)):construireSyntheseComptes20260828_();
  r.performance={dureeMs:Date.now()-t0,controleDashboardExecute:false,source:'recalcul_secours',snapshotPerime:false,snapshotGenereLe:refresh&&refresh.genereLe||''};
  r.snapshotPerime=false;
  return r;
}

function construireSyntheseComptes20260828_(){
  const comptes=lireTable_('Comptes');
  const operationsSource=lireTable_('Operations');
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(operationsSource):operationsSource;
  const parametres=Object.fromEntries(lireTable_('Parametres').map(function(p){return[String(p.cle),p.valeur];}));
  const maintenant=new Date();
  const jourAuj=typeof jourReferenceCanonBudgetSoft20260906_==='function'?jourReferenceCanonBudgetSoft20260906_(maintenant):Utilities.formatDate(maintenant,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const comptesParCle={};comptes.forEach(function(c){comptesParCle[String(c.id)]=c;comptesParCle[String(c.nom)]=c;});
  const refs={},cumulReel={},cumulApresRef={},derniereDateReelle={};

  comptes.forEach(function(c){
    const id=String(c.id),valeur=parametres['solde_releve_'+id],dateBrute=parametres['date_solde_releve_'+id];
    const base=valeur===undefined||valeur===''?null:Number(String(valeur).replace(',','.'));
    const jourRef=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(dateBrute):null;
    const disponible=Number.isFinite(base)&&!!jourRef&&jourRef<=jourAuj;
    const p=jourRef?jourRef.split('-').map(Number):null;
    const dateCanon=p?new Date(p[0],p[1]-1,p[2],12,0,0,0):null;
    refs[id]={disponible,solde:Number.isFinite(base)?base:null,jour:jourRef||'',date:disponible?dateCanon:null,future:Number.isFinite(base)&&!!jourRef&&jourRef>jourAuj,dateInvalide:Number.isFinite(base)&&!jourRef,dateBrute:dateBrute||''};
    cumulReel[id]=0;cumulApresRef[id]=0;derniereDateReelle[id]=null;
  });

  operations.forEach(function(brut){
    if(/\[RECURRENCE:[^\]]+\]/.test(String(brut&&brut.commentaire||'')))return;
    let o=brut;if(!(o&&o.date_comptable)&&typeof enrichirDepuisCommentaireBanque_==='function'){try{o=enrichirDepuisCommentaireBanque_(brut)||brut;}catch(e){o=brut;}}
    const jour=typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):null;
    if(!jour||jour>jourAuj)return;
    const type=String(o&&o.type||'').toLowerCase();if(type!=='revenu'&&type!=='depense')return;
    const compte=comptesParCle[String(o.compte)];if(!compte)return;
    const id=String(compte.id),brutMontant=Math.abs(Number(o.montant||0));if(!Number.isFinite(brutMontant)||brutMontant<=0)return;
    const montant=type==='depense'?-brutMontant:brutMontant;cumulReel[id]+=montant;
    const jp=jour.split('-').map(Number),d=new Date(jp[0],jp[1]-1,jp[2],12,0,0,0);
    if(!derniereDateReelle[id]||d>derniereDateReelle[id])derniereDateReelle[id]=d;
    const ref=refs[id];if(ref&&ref.disponible&&jour>ref.jour)cumulApresRef[id]+=montant;
  });

  const lignes=comptes.map(function(c){
    const id=String(c.id),ref=refs[id];
    const solde=ref&&ref.disponible?arrondirComptes20260828_(ref.solde+cumulApresRef[id]):arrondirComptes20260828_(Number(c.solde_initial||0)+cumulReel[id]);
    let dateSolde=ref&&ref.disponible?ref.date:derniereDateReelle[id];
    if(derniereDateReelle[id]&&ref&&ref.disponible&&derniereDateReelle[id]>ref.date)dateSolde=derniereDateReelle[id];
    const sourceSolde=ref&&ref.disponible?'releve_certifie':'solde_initial';
    const dateSoldeIso=dateSolde?Utilities.formatDate(dateSolde,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';
    if(sourceSolde==='releve_certifie'&&(!dateSoldeIso||dateSoldeIso>jourAuj))throw new Error('Référence bancaire invalide pour '+String(c.nom||id)+' : '+String(dateSoldeIso||ref&&ref.dateBrute||'sans date'));
    return {id:c.id,nom:c.nom,type:c.type,actif:c.actif,soldeReel:solde,dateSolde:dateSoldeIso,sourceSolde,referenceFutureIgnoree:!!(ref&&ref.future),referenceDateInvalideIgnoree:!!(ref&&ref.dateInvalide),dateReferenceIgnoree:ref&&(ref.future||ref.dateInvalide)?String(ref.dateBrute||''):''};
  });
  const actifs=lignes.filter(function(c){return actifComptes20260828_(c.actif);});
  const sommeTypes=function(types){return arrondirComptes20260828_(actifs.filter(function(c){return types.indexOf(String(c.type||'').toLowerCase())>=0;}).reduce(function(s,c){return s+c.soldeReel;},0));};
  let pluxee=null;try{const p=chargerPluxee();pluxee=p&&p.ok?Number(p.solde):null;}catch(e){pluxee=null;}
  const avertissements=[];
  lignes.forEach(c=>{
    if(c.referenceFutureIgnoree)avertissements.push({code:'REFERENCE_SOLDE_FUTURE_IGNOREE',compte:c.nom,date:c.dateReferenceIgnoree});
    if(c.referenceDateInvalideIgnoree)avertissements.push({code:'REFERENCE_SOLDE_DATE_INVALIDE_IGNOREE',compte:c.nom,date:c.dateReferenceIgnoree});
  });
  const doublonsBancairesExclus=Math.max(0,operationsSource.length-operations.length);
  if(doublonsBancairesExclus)avertissements.push({code:'DOUBLONS_BANCAIRES_CANONIQUES_EXCLUS',nombre:doublonsBancairesExclus});
  return {ok:true,version:COMPTES_REVIEW_20260828_VERSION,dateReferenceReel:jourAuj,synthese:{disponible:sommeTypes(['courant','especes']),epargne:sommeTypes(['epargne']),placements:sommeTypes(['placement']),pluxee:Number.isFinite(pluxee)?arrondirComptes20260828_(pluxee):null},comptes:lignes,archives:lignes.filter(function(c){return !actifComptes20260828_(c.actif);}).length,avertissements,doublonsBancairesExclus};
}

function auditerPerformanceComptesRapide20260828(){const t0=Date.now(),r=chargerSyntheseComptes20260828(),out={ok:r.ok===true,version:r.version,dureeMs:Date.now()-t0,source:r.performance&&r.performance.source||'',snapshotPerime:!!r.snapshotPerime,revisionBudgetSoft:r.revisionBudgetSoft||'',dateReferenceReel:r.dateReferenceReel||'',synthese:r.synthese,comptes:r.comptes.length,controleDashboardExecute:false,avertissements:r.avertissements||[],doublonsBancairesExclus:Number(r.doublonsBancairesExclus||0)};console.log(JSON.stringify(out));return out;}
function auditerSyntheseComptes20260828(){
  const tComptes=Date.now(),r=construireSyntheseComptes20260828_(),dureeComptesMs=Date.now()-tComptes;let dashboardSolde=null,dashboardErreur='',dureeDashboardMs=null;const tDashboard=Date.now();
  try{const d=chargerDashboardReelV2();dashboardSolde=d&&d.courtTerme&&Number.isFinite(Number(d.courtTerme.soldeBancaire))?Number(d.courtTerme.soldeBancaire):null;}catch(e){dashboardErreur=e&&e.message?e.message:String(e);}dureeDashboardMs=Date.now()-tDashboard;
  const audit={ok:r.ok===true,version:r.version,dateReferenceReel:r.dateReferenceReel||'',synthese:r.synthese,controleDashboard:{solde:Number.isFinite(dashboardSolde)?arrondirComptes20260828_(dashboardSolde):null,ecart:Number.isFinite(dashboardSolde)?arrondirComptes20260828_(r.synthese.disponible-dashboardSolde):null,erreur:dashboardErreur||null},performance:{comptesMs:dureeComptesMs,dashboardMs:dureeDashboardMs,totalAuditMs:dureeComptesMs+dureeDashboardMs},comptes:r.comptes.map(function(c){return{nom:c.nom,type:c.type,actif:actifComptes20260828_(c.actif),soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde,referenceFutureIgnoree:c.referenceFutureIgnoree,referenceDateInvalideIgnoree:c.referenceDateInvalideIgnoree};}),archives:r.archives,avertissements:r.avertissements||[],doublonsBancairesExclus:Number(r.doublonsBancairesExclus||0)};console.log(JSON.stringify(audit));return audit;
}
function actifComptes20260828_(v){return v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0';}
function arrondirComptes20260828_(n){return Math.round((Number(n)||0)*100)/100;}
