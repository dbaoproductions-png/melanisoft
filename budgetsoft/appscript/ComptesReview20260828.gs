const COMPTES_REVIEW_20260828_VERSION='2026-08-28.1';

/**
 * Vue Comptes : source de vérité du solde bancaire = même doctrine que RealBankingUI.
 * Dernier solde de relevé certifié + mouvements réels postérieurs.
 * Le solde initial n'est utilisé qu'en absence de référence de relevé.
 */
function chargerSyntheseComptes20260828(){
  verifierInitialisation_();
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

  operations.forEach(function(o){
    if(/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||'')))return;
    const d=new Date(o&&o.date);
    if(isNaN(d)||d>aujourdHuiFin)return;
    const compte=comptesParCle[String(o.compte)];
    if(!compte)return;
    const id=String(compte.id),montant=Number(o.montant||0);
    if(!Number.isFinite(montant))return;
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

  const out={
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
  return out;
}

function auditerSyntheseComptes20260828(){
  const r=chargerSyntheseComptes20260828();
  const audit={
    ok:r.ok===true,
    version:r.version,
    synthese:r.synthese,
    comptes:r.comptes.map(function(c){return{nom:c.nom,type:c.type,actif:actifComptes20260828_(c.actif),soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde};}),
    archives:r.archives
  };
  console.log(JSON.stringify(audit));
  return audit;
}

function actifComptes20260828_(v){return v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0';}
function arrondirComptes20260828_(n){return Math.round((Number(n)||0)*100)/100;}
