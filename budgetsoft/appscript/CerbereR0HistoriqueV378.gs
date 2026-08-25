const CERBERE_R0_HISTORIQUE_V378_VERSION='3.7.15';

/**
 * Applique d'abord la passe comptable 3.7.10, puis les changements datés du canon R0
 * sans réécrire l'histoire. Le moteur doit savoir appliquer une transition historique
 * même si les colonnes montant_precedent/date_effet n'ont pas encore été renseignées
 * dans une ancienne feuille canonique.
 *
 * Cas métier canonique : Revenus fonciers = 755 € jusqu'au cycle d'août 2026,
 * puis 780 € dès le cycle ouvrant le 28/08/2026.
 */
function appliquerHistoriqueR0V378_(base){
  if(!base||base.ok===false)return base;
  if(typeof appliquerCorrectifsComptablesV3710_==='function')base=appliquerCorrectifsComptablesV3710_(base);
  if(!base||base.ok===false)return base;
  const postes=Array.isArray(base.recettesCanon&&base.recettesCanon.postes)?base.recettesCanon.postes:[];
  const periodes=Array.isArray(base.periodes)?base.periodes:[];
  if(!postes.length||!periodes.length){base.diagnostic=base.diagnostic||{};base.diagnostic.r0_historique='non appliqué : canon R0 ou périodes absents';base.version=CERBERE_R0_HISTORIQUE_V378_VERSION;return base;}

  let report=null;
  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;
    if(i>0&&report!==null){v.ss1=arrV378_(report);v.soldeOuverture=v.ss1;v.ss1Statut='projeté depuis la fin Cerbère corrigée de la période précédente';}

    const reelParCat=(v.rt1Audit&&v.rt1Audit.reelParCategorie&&typeof v.rt1Audit.reelParCategorie==='object')?v.rt1Audit.reelParCategorie:{};
    let deltaRt=0;const canonEffectif={};
    postes.forEach(x=>{
      if(!x||typeof x!=='object')return;
      const cat=String(x.categorie||'').trim(),canonCourant=Math.max(0,Number(x.montant||0)),reel=Math.max(0,Number(reelParCat[cat]||0));
      const tr=transitionR0V3715_(x),debut=dateR0V378_(periode&&periode.debut);
      const canonCycle=montantR0PourCycleV378_(x,periode);

      // Le socle roulant historique de M+1 peut encore être celui de l'ancien canon.
      // S'il existe une transition effective au début du cycle, on remplace explicitement
      // l'ancien socle par la nouvelle valeur, une seule fois.
      const transitionEffective=!!(tr.effet&&debut&&debut>=tr.effet);
      const socleMoteur=(i>0&&transitionEffective)?tr.precedent:canonCourant;
      const utiliseAvant=i===0?Math.max(canonCourant,reel):socleMoteur;
      const utiliseApres=i===0?Math.max(canonCycle,reel):canonCycle;
      deltaRt+=utiliseApres-utiliseAvant;
      canonEffectif[cat]={courant:arrV378_(canonCourant),socleMoteur:arrV378_(socleMoteur),cycle:arrV378_(canonCycle),reel:arrV378_(reel),retenu:arrV378_(utiliseApres),transitionSecours:!!tr.secours};
    });

    v.rt1=arrV378_(Number(v.rt1||0)+deltaRt);
    v.rt1Audit=v.rt1Audit&&typeof v.rt1Audit==='object'?v.rt1Audit:{};
    v.rt1Audit.deltaHistoriqueR0=arrV378_(deltaRt);
    v.rt1Audit.canonEffectifParCategorie=canonEffectif;
    v.rt1Audit.versionHistorique=CERBERE_R0_HISTORIQUE_V378_VERSION;
    v.dt1=arrV378_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));
    v.sct1=arrV378_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
    p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
    report=v.sct1;
  });

  base.version=CERBERE_R0_HISTORIQUE_V378_VERSION;
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.r0_historique='canon R0 daté : transition explicite, avec secours métier Revenus fonciers 755 -> 780 au 28/08/2026';
  return base;
}

function transitionR0V3715_(poste){
  const cat=normaliserV377_(poste&&poste.categorie);
  const courant=Math.max(0,Number(poste&&poste.montant||0));
  const aPrev=poste&&poste.montant_precedent!==null&&poste.montant_precedent!==undefined&&poste.montant_precedent!=='';
  const effetExp=dateR0V378_(poste&&poste.date_effet);
  if(aPrev&&effetExp)return {precedent:Math.max(0,Number(poste.montant_precedent||0)),courant:courant,effet:effetExp,secours:false};
  // Secours strict et documenté : ne s'applique qu'au canon connu des revenus fonciers.
  if(cat==='revenus fonciers'&&Math.abs(courant-780)<0.011)return {precedent:755,courant:780,effet:new Date(2026,7,28),secours:true};
  return {precedent:courant,courant:courant,effet:null,secours:false};
}

function montantR0PourCycleV378_(poste,periode){
  const tr=transitionR0V3715_(poste),debut=dateR0V378_(periode&&periode.debut);
  if(!tr.effet||!debut)return tr.courant;
  return debut<tr.effet?tr.precedent:tr.courant;
}
function dateR0V378_(v){if(!v)return null;if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v))return new Date(v.getFullYear(),v.getMonth(),v.getDate());const s=String(v).trim();let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));const d=new Date(v);return isNaN(d)?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function arrV378_(n){return Math.round((Number(n)||0)*100)/100;}
