const TREASURY_FORECAST_CORRECTIONS_20260831_VERSION='2026-08-31.3';

/**
 * Consolidation du prévisionnel bancaire.
 * - les opérations futures réelles restent prioritaires ;
 * - les charges fixes distinctes ne sont jamais fusionnées entre elles ;
 * - les revenus structurels viennent du canon Cerbère, le réel ne sert qu'à dater ;
 * - une cible mensuelle d'action est appliquée par occurrence ;
 * - seuls les événements Effectif/Effective alimentent la trésorerie ;
 * - une suspension temporaire effective retire l'échéance, elle ne crée pas une recette fictive.
 */
function chargerTresoreriePrevisionnelle20260831(dateCible){
  return avecContexteLectureBudgetSoft20260827_('tresorerie_previsionnelle_20260831',function(){
    const r=chargerTresoreriePrevisionnelle20260830(dateCible);
    if(!r||!r.ok)return r;
    const now=new Date(r.dateReference||new Date());
    const cible=new Date(r.dateCible||new Date());
    const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
    const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
    const ops=lireTable_('Operations');

    let lignes=(r.lignes||[]).filter(x=>x.source!=='evenement'||evenementEffectifTresorerie20260831_(x.sourceId,evenements));
    lignes=normaliserMontantsActionsTresorerie20260831_(lignes,actions);
    lignes=appliquerSuppressionsTemporairesTresorerie20260831_(lignes,evenements);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);

    // Source de vérité des revenus attendus : canon Cerbère. L'historique sert uniquement
    // à déterminer le jour bancaire habituel. Les revenus variables restent hors prévision.
    const revenusCanon=revenusCanoniquesTresorerie20260831_(ops,lignes,now,cible);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes.concat(revenusCanon));
    lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));

    const variation=arrondiTresorerie_(lignes.reduce((s,x)=>s+Number(x.montantSigne||0),0));
    const certain=arrondiTresorerie_(lignes.filter(x=>x.certitude==='certain').reduce((s,x)=>s+Number(x.montantSigne||0),0));
    const tresProbable=arrondiTresorerie_(lignes.filter(x=>['certain','tres_probable'].includes(x.certitude)).reduce((s,x)=>s+Number(x.montantSigne||0),0));
    r.version=TREASURY_FORECAST_CORRECTIONS_20260831_VERSION;
    r.lignes=lignes;
    r.variationPrevue=variation;
    r.soldePrevisionnel=arrondiTresorerie_(Number(r.soldeReel||0)+variation);
    r.fourchette={certain:arrondiTresorerie_(Number(r.soldeReel||0)+certain),tresProbable:arrondiTresorerie_(Number(r.soldeReel||0)+tresProbable),toutesHypotheses:r.soldePrevisionnel};
    r.resume=resumeTresorerie20260831_(lignes);
    r.confiance=confianceTresorerie_(now,cible,lignes);
    r.diagnostic20260831={revenusCanoniquesAjoutes:revenusCanon.length,lignesFinales:lignes.length,evenementsEffectifs:(evenements||[]).filter(e=>statutEffectifTresorerie20260831_(e.statut)).length,suspensionsEffectives:(evenements||[]).filter(e=>statutEffectifTresorerie20260831_(e.statut)&&estSuspensionTemporaireTresorerie20260831_(e)).length};
    return r;
  });
}

function listerMouvementsFutursTresorerie20260831(dateCible){const r=chargerTresoreriePrevisionnelle20260831(dateCible||dateDansJoursTresorerie_(45));return {ok:r.ok,version:r.version,dateCible:r.dateCible,lignes:r.lignes||[],confiance:r.confiance,diagnostic20260831:r.diagnostic20260831||{}};}
function statutEffectifTresorerie20260831_(statut){const s=String(statut||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return ['effectif','effective','effectifs','effectives'].includes(s);}
function evenementEffectifTresorerie20260831_(id,evenements){const e=(evenements||[]).find(x=>String(x.id||'')===String(id||''));return !!e&&statutEffectifTresorerie20260831_(e.statut);}

function normaliserMontantsActionsTresorerie20260831_(lignes,actions){
  const index=Object.fromEntries((actions||[]).map(a=>[String(a.id||''),a]));
  return (lignes||[]).map(x=>{if(x.source!=='action')return x;const a=index[String(x.sourceId||'')];if(!a)return x;const f=String(a.fonction_plan||'').toUpperCase();if(!['RECEVOIR','REMBOURSER','TRANSFERER'].includes(f))return x;const cible=Math.abs(Number(a.cible_valeur||a.impact_montant||0));if(!Number.isFinite(cible)||cible<=0)return x;const signe=f==='RECEVOIR'?1:-1;return Object.assign({},x,{montantSigne:arrondiTresorerie_(signe*cible),preuve:String(x.preuve||'Action financière du Plan')+' · cible '+String(a.impact_frequence||'ponctuel')+' appliquée par occurrence'});});
}
function prioriteSourceTresorerie20260831_(s){return {operation_future:0,evenement:1,action:2,revenu_recurrent:3,charge_fixe:5,pilotable:8}[String(s||'')]??9;}
function normaliserLibelleTresorerie20260831_(s){try{return normaliserRechercheAction_(String(s||'')).replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();}catch(e){return String(s||'').toLowerCase().replace(/[^a-zà-ÿ]+/g,' ').replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();}}
function ressemblentTresorerie20260831_(a,b){
  if(!a||!b)return false;
  if(a.source===b.source&&a.sourceId&&b.sourceId&&String(a.sourceId)!==String(b.sourceId))return false;
  const ma=Number(a.montantSigne||0),mb=Number(b.montantSigne||0);if(ma*mb<0)return false;if(Math.abs(ma-mb)>Math.max(1,Math.max(Math.abs(ma),Math.abs(mb))*.08))return false;
  const da=new Date(a.date),db=new Date(b.date);if(isNaN(da)||isNaN(db)||Math.abs(da-db)>5*86400000)return false;
  if(a.sourceId&&b.sourceId&&String(a.sourceId)===String(b.sourceId)&&a.source===b.source)return true;
  const ca=String(a.categorie||'').trim(),cb=String(b.categorie||'').trim(),la=normaliserLibelleTresorerie20260831_(a.libelle),lb=normaliserLibelleTresorerie20260831_(b.libelle),motsA=la.split(' ').filter(x=>x.length>=4),motsB=lb.split(' ').filter(x=>x.length>=4);
  return motsA.some(x=>motsB.includes(x))||(ca&&cb&&ca===cb&&Math.abs(ma-mb)<.01);
}
function dedoublonnerPrevisionsTresorerie20260831_(lignes){const trie=(lignes||[]).slice().sort((a,b)=>prioriteSourceTresorerie20260831_(a.source)-prioriteSourceTresorerie20260831_(b.source)),gardees=[];trie.forEach(x=>{if(x.source==='pilotable'){gardees.push(x);return;}if(gardees.some(y=>y.source!=='pilotable'&&ressemblentTresorerie20260831_(x,y)))return;gardees.push(x);});return gardees;}

function estSuspensionTemporaireTresorerie20260831_(e){return String(e&&e.type||'').toLowerCase()==='charge_supprimee_temporairement';}
function appliquerSuppressionsTemporairesTresorerie20260831_(lignes,evenements){
  let out=(lignes||[]).slice();
  (evenements||[]).filter(e=>statutEffectifTresorerie20260831_(e.statut)&&estSuspensionTemporaireTresorerie20260831_(e)).forEach(e=>{
    const eid=String(e.id||''),m=Math.abs(Number(e.montant||0)),ed=datePlanTresorerie_(e,new Date(),false).date,cat=String(e.categorie||'').trim();out=out.filter(x=>!(x.source==='evenement'&&String(x.sourceId||'')===eid));let meilleur=-1,score=Infinity;
    out.forEach((x,i)=>{if(x.source!=='charge_fixe'||Number(x.montantSigne||0)>=0)return;const xd=new Date(x.date),ecartJ=isNaN(xd)||!ed?99:Math.abs(xd-ed)/86400000,ecartM=Math.abs(Math.abs(Number(x.montantSigne||0))-m);if(ecartJ>5||ecartM>Math.max(1,m*.03))return;const memeCat=cat&&String(x.categorie||'').trim()===cat,le=normaliserLibelleTresorerie20260831_(e.libelle),lx=normaliserLibelleTresorerie20260831_(x.libelle),commun=le.split(' ').filter(w=>w.length>=4).some(w=>lx.includes(w)),s=ecartJ*10+ecartM+(memeCat?0:20)+(commun?0:10);if(s<score){score=s;meilleur=i;}});if(meilleur>=0)out.splice(meilleur,1);
  });return out;
}

function revenusCanoniquesTresorerie20260831_(ops,lignesExistantes,now,cible){
  let canon=[];try{canon=lireTable_('Cerbere_Recettes_Canon_V1');}catch(e){canon=[];}const out=[];
  (canon||[]).forEach(c=>{if(!actifTresorerie_(c.actif)||String(c.nature||'').toLowerCase()!=='structurelle')return;const cat=String(c.categorie||'').trim();if(!cat)return;const baseMont=Math.abs(Number(c.montant||0));
    const hist=(ops||[]).map(o=>({o,d:dateOpTresorerie_(o),m:Math.abs(Number(o.montant||0))})).filter(x=>x.d&&x.d<=now&&x.d>=new Date(now.getFullYear(),now.getMonth()-6,1)&&(String(x.o.type||'').toLowerCase()==='revenu'||Number(x.o.montant||0)>0)&&String(x.o.categorie||'').trim()===cat),histSignif=hist.filter(x=>x.m>=Math.max(20,baseMont*.35)),jours=(histSignif.length?histSignif:hist).map(x=>x.d.getDate()).sort((a,b)=>a-b),jour=Math.max(1,Math.min(28,jours.length?jours[Math.floor(jours.length/2)]:15));
    let d=new Date(now.getFullYear(),now.getMonth(),jour);if(d<=now)d=new Date(now.getFullYear(),now.getMonth()+1,jour);let guard=0;
    while(d<=cible&&guard++<6){let montant=baseMont;const de=c.date_effet?new Date(c.date_effet):null;if(de&&!isNaN(de)&&d<de&&Number(c.montant_precedent)>0)montant=Math.abs(Number(c.montant_precedent));if(montant>0){const cand={id:'revcanon:'+cat+':'+d.getTime(),source:'revenu_recurrent',sourceId:'canon:'+cat,date:d.toISOString(),libelle:cat,categorie:cat,compte:histSignif.length?histSignif[histSignif.length-1].o.compte||'':'',montantSigne:arrondiTresorerie_(montant),certitude:histSignif.length>=3?'tres_probable':'prevu',preuve:'Revenu structurel du canon Cerbère · date habituelle estimée',dateConventionnelle:true};if(!(lignesExistantes||[]).some(x=>ressemblentTresorerie20260831_(cand,x)))out.push(cand);}d=new Date(d.getFullYear(),d.getMonth()+1,jour);}
  });return out;
}
function resumeTresorerie20260831_(lignes){const r={operations_futures:0,charges_fixes:0,evenements:0,actions:0,revenus_recurrents:0,pilotable:0,recettes:0,depenses:0};(lignes||[]).forEach(x=>{const m=Number(x.montantSigne||0);if(m>=0)r.recettes+=m;else r.depenses+=Math.abs(m);if(x.source==='operation_future')r.operations_futures+=m;else if(x.source==='charge_fixe')r.charges_fixes+=m;else if(x.source==='evenement')r.evenements+=m;else if(x.source==='action')r.actions+=m;else if(x.source==='revenu_recurrent')r.revenus_recurrents+=m;else if(x.source==='pilotable')r.pilotable+=m;});Object.keys(r).forEach(k=>r[k]=arrondiTresorerie_(r[k]));return r;}
