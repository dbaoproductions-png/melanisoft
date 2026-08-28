const COMPTES_REVIEW_20260828_VERSION='2026-08-28.3';

/**
 * Vue Comptes rapide.
 * Source de vérité bancaire : dernier solde de relevé certifié + mouvements réels
 * postérieurs selon date_comptable. Le Dashboard n'est JAMAIS recalculé dans le
 * chemin normal d'affichage ; sa comparaison reste réservée à l'audit explicite.
 */
function chargerSyntheseComptes20260828(){
  const t0=Date.now();
  const r=construireSyntheseComptes20260828_();
  r.performance={dureeMs:Date.now()-t0,controleDashboardExecute:false};
  return r;
}

function construireSyntheseComptes20260828_(){
  // Pas de verifierInitialisation_() ici : l'écran de lecture ne doit pas déclencher
  // une initialisation/inspection globale du classeur à chaque ouverture.
  const comptes=lireTable_('Comptes');
  const operations=lireTable_('Operations');
  const parametres=Object.fromEntries(lireTable_('Parametres').map(function(p){return[String(p.cle),p.valeur];}));
  const aujourdHuiFin=new Date();aujourdHuiFin.setHours(23,59,59,999);

  const comptesParCle={};
  comptes.forEach(function(c){
    comptesParCle[String(c.id)]=c;
    comptesParCle[String(c.nom)]=c;
  });

  const refs={};
  const cumulReel={};
  const cumulApresRef={};
  const derniereDateReelle={};
  comptes.forEach(function(c){
    const id=String(c.id);
    const valeur=parametres['solde_releve_'+id];
    const dateBrute=parametres['date_solde_releve_'+id];
    const base=valeur===undefined||valeur===''?null:Number(String(valeur).replace(',','.'));
    const date=dateBrute?new Date(dateBrute):null;
    refs[id]={
      disponible:Number.isFinite(base)&&date&&!isNaN(date),
      solde:Number.isFinite(base)?base:null,
      date:date&&!isNaN(date)?date:null
    };
    cumulReel[id]=0;
    cumulApresRef[id]=0;
    derniereDateReelle[id]=null;
  });

  // Une seule passe sur Operations. On évite l'enrichissement complet de chaque ligne :
  // les imports modernes portent déjà date_comptable ; on n'enrichit qu'en repli si elle manque.
  operations.forEach(function(brut){
    if(/\[RECURRENCE:[^\]]+\]/.test(String(brut&&brut.commentaire||'')))return;
    let o=brut;
    if(!(o&&o.date_comptable)&&typeof enrichirDepuisCommentaireBanque_==='function'){
      try{o=enrichirDepuisCommentaireBanque_(brut)||brut;}catch(e){o=brut;}
    }
    const d=new Date((o&&o.date_comptable)||(o&&o.date));
    if(isNaN(d)||d>aujourdHuiFin)return;
    const type=String(o&&o.type||'').toLowerCase();
    if(type!=='revenu'&&type!=='depense')return;
    const compte=comptesParCle[String(o.compte)];
    if(!compte)return;
    const id=String(compte.id),brutMontant=Math.abs(Number(o.montant||0));
    if(!Number.isFinite(brutMontant)||brutMontant<=0)return;
    const montant=type==='depense'?-brutMontant:brutMontant;
    cumulReel[id]+=montant;
    if(!derniereDateReelle[id]||d>derniereDateReelle[id])derniereDateReelle[id]=d;
    const ref=refs[id];
    if(ref&&ref.disponible&&d>ref.date)cumulApresRef[id]+=montant;
  });

  const lignes=comptes.map(function(c){
    const id=String(c.id),ref=refs[id];
    const solde=ref&&ref.disponible
      ? arrondirComptes20260828_(ref.solde+cumulApresRef[id])
      : arrondirComptes20260828_(Number(c.solde_initial||0)+cumulReel[id]);
    let dateSolde=ref&&ref.disponible?ref.date:derniereDateReelle[id];
    if(derniereDateReelle[id]&&ref&&ref.disponible&&derniereDateReelle[id]>ref.date)dateSolde=derniereDateReelle[id];
    return {
      id:c.id,nom:c.nom,type:c.type,actif:c.actif,
      soldeReel:solde,
      dateSolde:dateSolde?Utilities.formatDate(dateSolde,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
      sourceSolde:ref&&ref.disponible?'releve_certifie':'solde_initial'
    };
  });

  const actifs=lignes.filter(function(c){return actifComptes20260828_(c.actif);});
  const sommeTypes=function(types){return arrondirComptes20260828_(actifs.filter(function(c){return types.indexOf(String(c.type||'').toLowerCase())>=0;}).reduce(function(s,c){return s+c.soldeReel;},0));};

  let pluxee=null;
  try{const p=chargerPluxee();pluxee=p&&p.ok?Number(p.solde):null;}catch(e){pluxee=null;}

  return {
    ok:true,version:COMPTES_REVIEW_20260828_VERSION,
    synthese:{
      disponible:sommeTypes(['courant','especes']),
      epargne:sommeTypes(['epargne']),
      placements:sommeTypes(['placement']),
      pluxee:Number.isFinite(pluxee)?arrondirComptes20260828_(pluxee):null
    },
    comptes:lignes,
    archives:lignes.filter(function(c){return !actifComptes20260828_(c.actif);}).length
  };
}

/**
 * Audit volontairement plus lourd : mesure séparément la vue Comptes puis le Dashboard.
 * Le Dashboard ne doit jamais faire partie du temps d'ouverture normal de Comptes.
 */
function auditerSyntheseComptes20260828(){
  const tComptes=Date.now();
  const r=construireSyntheseComptes20260828_();
  const dureeComptesMs=Date.now()-tComptes;

  let dashboardSolde=null,dashboardErreur='',dureeDashboardMs=null;
  const tDashboard=Date.now();
  try{
    const d=chargerDashboardReelV2();
    dashboardSolde=d&&d.courtTerme&&Number.isFinite(Number(d.courtTerme.soldeBancaire))?Number(d.courtTerme.soldeBancaire):null;
  }catch(e){dashboardErreur=e&&e.message?e.message:String(e);}
  dureeDashboardMs=Date.now()-tDashboard;

  const audit={
    ok:r.ok===true,
    version:r.version,
    synthese:r.synthese,
    controleDashboard:{
      solde:Number.isFinite(dashboardSolde)?arrondirComptes20260828_(dashboardSolde):null,
      ecart:Number.isFinite(dashboardSolde)?arrondirComptes20260828_(r.synthese.disponible-dashboardSolde):null,
      erreur:dashboardErreur||null
    },
    performance:{
      comptesMs:dureeComptesMs,
      dashboardMs:dureeDashboardMs,
      totalAuditMs:dureeComptesMs+dureeDashboardMs
    },
    comptes:r.comptes.map(function(c){return{nom:c.nom,type:c.type,actif:actifComptes20260828_(c.actif),soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde};}),
    archives:r.archives
  };
  console.log(JSON.stringify(audit));
  return audit;
}

function actifComptes20260828_(v){return v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0';}
function arrondirComptes20260828_(n){return Math.round((Number(n)||0)*100)/100;}
