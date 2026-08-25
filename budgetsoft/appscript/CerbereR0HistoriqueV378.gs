const CERBERE_R0_HISTORIQUE_V378_VERSION='3.7.8';

/**
 * Applique les changements datés du canon R0 sans réécrire l'histoire.
 * Exemple : Revenus fonciers = 755 € jusqu'au cycle d'août 2026,
 * puis 780 € à partir du cycle ouvrant le 28/08/2026.
 *
 * Cette passe intervient après l'audit 3.7.7 : elle ne refait pas le moteur,
 * elle corrige uniquement la part canonique de Rt1 puis repropage SCt1 M -> M+1.
 */
function appliquerHistoriqueR0V378_(base){
  if(!base||base.ok===false)return base;
  const postes=(base.recettesCanon&&base.recettesCanon.postes)||[];
  if(!postes.length)return base;

  let report=null;
  (base.periodes||[]).forEach((p,i)=>{
    const v=p.v37||(p.v37={});
    const periode=p.periode||p;

    // M+1 hérite toujours de la fin corrigée de M.
    if(i>0&&report!==null){
      v.ss1=arrV378_(report);
      v.soldeOuverture=v.ss1;
      v.ss1Statut='projeté depuis la fin Cerbère corrigée de la période précédente';
    }

    const reelParCat=(v.rt1Audit&&v.rt1Audit.reelParCategorie)||{};
    let deltaRt=0;
    const canonEffectif={};

    postes.forEach(x=>{
      const cat=String(x.categorie||'').trim();
      const canonCourant=Math.max(0,Number(x.montant||0));
      const canonCycle=montantR0PourCycleV378_(x,periode);
      const reel=Math.max(0,Number(reelParCat[cat]||0));

      // L'audit 3.7.7 a calculé M avec max(canon courant, réel),
      // et les périodes futures avec le canon courant pur.
      const utiliseAvant=i===0?Math.max(canonCourant,reel):canonCourant;
      const utiliseApres=i===0?Math.max(canonCycle,reel):canonCycle;
      deltaRt+=utiliseApres-utiliseAvant;
      canonEffectif[cat]={courant:arrV378_(canonCourant),cycle:arrV378_(canonCycle),reel:arrV378_(reel),retenu:arrV378_(utiliseApres)};
    });

    v.rt1=arrV378_(Number(v.rt1||0)+deltaRt);
    v.rt1Audit=v.rt1Audit||{};
    v.rt1Audit.deltaHistoriqueR0=arrV378_(deltaRt);
    v.rt1Audit.canonEffectifParCategorie=canonEffectif;
    v.rt1Audit.versionHistorique=CERBERE_R0_HISTORIQUE_V378_VERSION;

    // Toutes les autres briques ont déjà été auditées en 3.7.7.
    v.dt1=arrV378_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));
    v.sct1=arrV378_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.rpt1=v.sct1;
    v.resteReellementPilotable=v.sct1;
    v.disponibleJusquau27=v.sct1;
    p.resteReellementPilotable=v.sct1;
    p.capacitePilotable=v.sct1;
    p.capaciteTresorerie=v.sct1;
    report=v.sct1;
  });

  base.version=CERBERE_R0_HISTORIQUE_V378_VERSION;
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.r0_historique='canon R0 daté : ancien montant avant date_effet, nouveau montant à partir du cycle concerné';
  return base;
}

function montantR0PourCycleV378_(poste,periode){
  const courant=Math.max(0,Number(poste&&poste.montant||0));
  if(!poste||poste.montant_precedent===null||poste.montant_precedent===undefined||poste.montant_precedent==='')return courant;
  const effet=dateR0V378_(poste.date_effet),debut=dateR0V378_(periode&&periode.debut);
  if(!effet||!debut)return courant;
  return debut<effet?Math.max(0,Number(poste.montant_precedent||0)):courant;
}

function dateR0V378_(v){
  if(!v)return null;
  if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v))return new Date(v.getFullYear(),v.getMonth(),v.getDate());
  const s=String(v).trim();
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
  const d=new Date(v);return isNaN(d)?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());
}
function arrV378_(n){return Math.round((Number(n)||0)*100)/100;}
