const TREASURY_FORECAST_CORRECTIONS_20260831_VERSION='2026-08-31.2';

/**
 * Couche de consolidation du prévisionnel bancaire.
 * - dédoublonne les prévisions entre Opérations / Plan / Charges fixes ;
 * - ajoute les revenus mensuels réellement récurrents détectés dans l'historique ;
 * - une cible mensuelle d'action est un montant PAR MOIS, jamais un total à répartir ;
 * - seuls les événements au statut Effectif/Effective alimentent la trésorerie ;
 * - ne crée jamais d'opération réelle.
 */
function chargerTresoreriePrevisionnelle20260831(dateCible){
  return avecContexteLectureBudgetSoft20260827_('tresorerie_previsionnelle_20260831',function(){
    const r=chargerTresoreriePrevisionnelle20260830(dateCible);
    if(!r||!r.ok)return r;
    const now=new Date(r.dateReference||new Date());
    const cible=new Date(r.dateCible||new Date());

    const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
    const actions=lireFeuilleDynamiquePlan_('Plan_Actions');

    // Doctrine : un événement n'entre dans la trésorerie que lorsqu'il est réellement
    // retenu/validé comme effectif. Prévu, probable, rapproché, etc. ne suffisent pas.
    let lignes=(r.lignes||[]).filter(x=>x.source!=='evenement'||evenementEffectifTresorerie20260831_(x.sourceId,evenements));

    // Corrige l'ancienne interprétation qui divisait une cible mensuelle par le nombre
    // d'occurrences. Ex. participation employeur 15 €/mois => +15 € chaque mois, pas 1,25 €.
    lignes=normaliserMontantsActionsTresorerie20260831_(lignes,actions);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);

    const ops=lireTable_('Operations');
    const revenus=revenusRecurrentsTresorerie20260831_(ops,lignes,now,cible);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes.concat(revenus));
    lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));

    const variation=arrondiTresorerie_(lignes.reduce((s,x)=>s+Number(x.montantSigne||0),0));
    const certain=arrondiTresorerie_(lignes.filter(x=>x.certitude==='certain').reduce((s,x)=>s+Number(x.montantSigne||0),0));
    const tresProbable=arrondiTresorerie_(lignes.filter(x=>['certain','tres_probable'].includes(x.certitude)).reduce((s,x)=>s+Number(x.montantSigne||0),0));
    r.version=TREASURY_FORECAST_CORRECTIONS_20260831_VERSION;
    r.lignes=lignes;
    r.variationPrevue=variation;
    r.soldePrevisionnel=arrondiTresorerie_(Number(r.soldeReel||0)+variation);
    r.fourchette={
      certain:arrondiTresorerie_(Number(r.soldeReel||0)+certain),
      tresProbable:arrondiTresorerie_(Number(r.soldeReel||0)+tresProbable),
      toutesHypotheses:r.soldePrevisionnel
    };
    r.resume=resumeTresorerie20260831_(lignes);
    r.confiance=confianceTresorerie_(now,cible,lignes);
    r.diagnostic20260831={
      revenusRecurrentsAjoutes:revenus.length,
      lignesFinales:lignes.length,
      evenementsEffectifs:(evenements||[]).filter(e=>statutEffectifTresorerie20260831_(e.statut)).length
    };
    return r;
  });
}

function listerMouvementsFutursTresorerie20260831(dateCible){
  const r=chargerTresoreriePrevisionnelle20260831(dateCible||dateDansJoursTresorerie_(45));
  return {ok:r.ok,version:r.version,dateCible:r.dateCible,lignes:r.lignes||[],confiance:r.confiance,diagnostic20260831:r.diagnostic20260831||{}};
}

function statutEffectifTresorerie20260831_(statut){
  const s=String(statut||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return ['effectif','effective','effectifs','effectives'].includes(s);
}
function evenementEffectifTresorerie20260831_(id,evenements){
  const e=(evenements||[]).find(x=>String(x.id||'')===String(id||''));
  return !!e&&statutEffectifTresorerie20260831_(e.statut);
}

function normaliserMontantsActionsTresorerie20260831_(lignes,actions){
  const index=Object.fromEntries((actions||[]).map(a=>[String(a.id||''),a]));
  return (lignes||[]).map(x=>{
    if(x.source!=='action')return x;
    const a=index[String(x.sourceId||'')];if(!a)return x;
    const f=String(a.fonction_plan||'').toUpperCase();
    if(!['RECEVOIR','REMBOURSER','TRANSFERER'].includes(f))return x;
    const cible=Math.abs(Number(a.cible_valeur||a.impact_montant||0));
    if(!Number.isFinite(cible)||cible<=0)return x;
    const signe=f==='RECEVOIR'?1:-1;
    return Object.assign({},x,{montantSigne:arrondiTresorerie_(signe*cible),preuve:String(x.preuve||'Action financière du Plan')+' · cible '+String(a.impact_frequence||'ponctuel')+' appliquée par occurrence'});
  });
}

function prioriteSourceTresorerie20260831_(s){
  return {operation_future:0,evenement:1,action:2,revenu_recurrent:3,charge_fixe:4,pilotable:8}[String(s||'')]??9;
}
function normaliserLibelleTresorerie20260831_(s){
  try{return normaliserRechercheAction_(String(s||'')).replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();}
  catch(e){return String(s||'').toLowerCase().replace(/[^a-zà-ÿ]+/g,' ').replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();}
}
function ressemblentTresorerie20260831_(a,b){
  if(!a||!b)return false;
  const ma=Number(a.montantSigne||0),mb=Number(b.montantSigne||0);
  if(ma*mb<0)return false;
  if(Math.abs(ma-mb)>Math.max(1,Math.max(Math.abs(ma),Math.abs(mb))*.08))return false;
  const da=new Date(a.date),db=new Date(b.date);
  if(isNaN(da)||isNaN(db)||Math.abs(da-db)>5*86400000)return false;
  if(a.sourceId&&b.sourceId&&String(a.sourceId)===String(b.sourceId)&&a.source===b.source)return true;
  const ca=String(a.categorie||'').trim(),cb=String(b.categorie||'').trim();
  const la=normaliserLibelleTresorerie20260831_(a.libelle),lb=normaliserLibelleTresorerie20260831_(b.libelle);
  const motsA=la.split(' ').filter(x=>x.length>=4),motsB=lb.split(' ').filter(x=>x.length>=4);
  const commun=motsA.some(x=>motsB.includes(x));
  return commun||(ca&&cb&&ca===cb&&Math.abs(ma-mb)<.01);
}
function dedoublonnerPrevisionsTresorerie20260831_(lignes){
  const trie=(lignes||[]).slice().sort((a,b)=>prioriteSourceTresorerie20260831_(a.source)-prioriteSourceTresorerie20260831_(b.source));
  const gardees=[];
  trie.forEach(x=>{
    if(x.source==='pilotable'){gardees.push(x);return;}
    if(gardees.some(y=>y.source!=='pilotable'&&ressemblentTresorerie20260831_(x,y)))return;
    gardees.push(x);
  });
  return gardees;
}

/** Détection prudente : au moins 3 revenus réels similaires sur les 5 derniers mois. */
function revenusRecurrentsTresorerie20260831_(ops,lignesExistantes,now,cible){
  const debut=new Date(now);debut.setDate(debut.getDate()-165);
  const groupes={};
  (ops||[]).forEach(o=>{
    const d=dateOpTresorerie_(o);if(!d||d<debut||d>now)return;
    if(String(o.type||'').toLowerCase()!=='revenu'&&Number(o.montant||0)<=0)return;
    if(/\[RECURRENCE:[^\]]+\]/.test(String(o.commentaire||'')))return;
    const montant=Math.abs(Number(o.montant||0));if(!Number.isFinite(montant)||montant<20)return;
    let lib=o.marchand_normalise||o.libelle_bancaire||o.libelle||'';
    let sig=normaliserLibelleTresorerie20260831_(lib);
    sig=sig.split(' ').filter(x=>x.length>=3).slice(0,5).join(' ');
    if(!sig)return;
    (groupes[sig]||(groupes[sig]=[])).push({d,montant,libelle:o.libelle||o.libelle_bancaire||lib,categorie:o.categorie||'',compte:o.compte||''});
  });
  const out=[];
  Object.keys(groupes).forEach(sig=>{
    const xs=groupes[sig].sort((a,b)=>a.d-b.d);if(xs.length<3)return;
    const interv=[];for(let i=1;i<xs.length;i++)interv.push((xs[i].d-xs[i-1].d)/86400000);
    const mensuels=interv.filter(j=>j>=24&&j<=38);if(mensuels.length<2)return;
    const montants=xs.map(x=>x.montant).sort((a,b)=>a-b),med=montants[Math.floor(montants.length/2)];
    const ecartMax=Math.max.apply(null,montants.map(x=>Math.abs(x-med)));
    if(med<=0||ecartMax>Math.max(15,med*.12))return;
    const jours=xs.map(x=>x.d.getDate()).sort((a,b)=>a-b),jour=Math.max(1,Math.min(28,jours[Math.floor(jours.length/2)]));
    const dernier=xs[xs.length-1];
    let d=new Date(dernier.d.getFullYear(),dernier.d.getMonth()+1,jour);
    let guard=0;
    while(d<=cible&&guard++<6){
      if(d>now){
        const cand={id:'revrec:'+sig+':'+d.getTime(),source:'revenu_recurrent',sourceId:sig,date:d.toISOString(),libelle:dernier.libelle||'Revenu récurrent',categorie:dernier.categorie||'Revenus',compte:dernier.compte||'',montantSigne:arrondiTresorerie_(med),certitude:xs.length>=4?'tres_probable':'prevu',preuve:'Revenu mensuel détecté dans l’historique',dateConventionnelle:true};
        if(!(lignesExistantes||[]).some(x=>ressemblentTresorerie20260831_(cand,x)))out.push(cand);
      }
      d=new Date(d.getFullYear(),d.getMonth()+1,jour);
    }
  });
  return out;
}

function resumeTresorerie20260831_(lignes){
  const r={operations_futures:0,charges_fixes:0,evenements:0,actions:0,revenus_recurrents:0,pilotable:0,recettes:0,depenses:0};
  (lignes||[]).forEach(x=>{
    const m=Number(x.montantSigne||0);if(m>=0)r.recettes+=m;else r.depenses+=Math.abs(m);
    if(x.source==='operation_future')r.operations_futures+=m;
    else if(x.source==='charge_fixe')r.charges_fixes+=m;
    else if(x.source==='evenement')r.evenements+=m;
    else if(x.source==='action')r.actions+=m;
    else if(x.source==='revenu_recurrent')r.revenus_recurrents+=m;
    else if(x.source==='pilotable')r.pilotable+=m;
  });
  Object.keys(r).forEach(k=>r[k]=arrondiTresorerie_(r[k]));return r;
}