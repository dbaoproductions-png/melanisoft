const TREASURY_FORECAST_CORRECTIONS_20260831_VERSION='2026-08-31.8';

/**
 * Consolidation du prévisionnel bancaire.
 * Doctrine bancaire :
 * - les opérations futures réelles restent prioritaires ;
 * - les charges fixes distinctes ne sont jamais fusionnées entre elles ;
 * - les revenus structurels viennent du canon Cerbère, le réel ne sert qu'à dater ;
 * - une cible mensuelle d'action est appliquée par occurrence ;
 * - seuls les événements Effectif/Effective alimentent la trésorerie ;
 * - une suspension temporaire effective retire l'échéance, elle ne crée pas une recette fictive ;
 * - un événement effectif dû aujourd'hui reste prévisionnel tant qu'il n'est pas Réalisé/Rapproché ;
 * - les dépenses Cerbère ne sont PAS une sortie bancaire progressive du cycle courant ;
 * - elles deviennent une estimation du prochain débit CB différé, au dernier jour du mois civil ;
 * - les CB déjà connues pour cette date remplacent à due concurrence l'estimation Cerbère.
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
    lignes=completerEvenementsEffectifsTresorerie20260831_(lignes,evenements,now,cible);
    lignes=normaliserMontantsActionsTresorerie20260831_(lignes,actions);
    lignes=appliquerSuppressionsTemporairesTresorerie20260831_(lignes,evenements);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);

    const revenusCanon=revenusCanoniquesTresorerie20260831_(ops,lignes,now,cible);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes.concat(revenusCanon));

    // Toute ancienne estimation pilotable du moteur 30/08 est retirée. Cerbère ne
    // pèse sur la banque qu'au prochain débit CB différé, pas au fil du cycle.
    lignes=lignes.filter(x=>x.source!=='pilotable');
    const pilotable=estimationPilotableTresorerie20260831_(now,cible,ops);
    if(pilotable)lignes.push(pilotable);

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
    r.pilotable=pilotable||null;
    r.diagnostic20260831={
      doctrineCbDiffere:'Cerbère courant -> débit CB au dernier jour du mois civil, donc cycle bancaire suivant',
      revenusCanoniquesAjoutes:revenusCanon.length,
      lignesFinales:lignes.length,
      evenementsEffectifs:(evenements||[]).filter(e=>statutEffectifTresorerie20260831_(e.statut)).length,
      suspensionsEffectives:(evenements||[]).filter(e=>statutEffectifTresorerie20260831_(e.statut)&&estSuspensionTemporaireTresorerie20260831_(e)).length,
      debitCbCerbereAjoute:!!pilotable,
      debitCbCerbereTotal:pilotable?pilotable.totalCerbere:0,
      debitCbDejaConnu:pilotable?pilotable.dejaConnuCb:0,
      debitCbCerbereResiduel:pilotable?Math.abs(Number(pilotable.montantSigne||0)):0,
      dateDebitCb:pilotable?pilotable.date:null
    };
    return r;
  });
}

function listerMouvementsFutursTresorerie20260831(dateCible){const r=chargerTresoreriePrevisionnelle20260831(dateCible||dateDansJoursTresorerie_(45));return {ok:r.ok,version:r.version,dateCible:r.dateCible,lignes:r.lignes||[],confiance:r.confiance,diagnostic20260831:r.diagnostic20260831||{}};}
function statutEffectifTresorerie20260831_(statut){const s=String(statut||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return ['effectif','effective','effectifs','effectives'].includes(s);}
function evenementEffectifTresorerie20260831_(id,evenements){const e=(evenements||[]).find(x=>String(x.id||'')===String(id||''));return !!e&&statutEffectifTresorerie20260831_(e.statut);}
function debutJourTresorerie20260831_(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0,0);}

function completerEvenementsEffectifsTresorerie20260831_(lignes,evenements,now,cible){
  const out=(lignes||[]).slice(),debut=debutJourTresorerie20260831_(now);
  (evenements||[]).forEach(e=>{
    if(!statutEffectifTresorerie20260831_(e.statut)||estSuspensionTemporaireTresorerie20260831_(e))return;
    const dr=datePlanTresorerie_(e,now,false),base=dr.date;if(!base||isNaN(base))return;
    const n=(e.fractionne===true||String(e.fractionne)==='true')?Math.max(1,Number(e.nombre_fois||1)):1,per=String(e.periodicite_fractionnement||'mensuel').toLowerCase(),total=Math.abs(Number(e.montant||0));
    for(let i=0;i<n;i++){
      const d=new Date(base);if(i){if(per==='annuel')d.setFullYear(d.getFullYear()+i);else d.setMonth(d.getMonth()+i);}
      if(d<debut||d>cible)continue;
      if(out.some(x=>x.source==='evenement'&&String(x.sourceId||'')===String(e.id||'')&&Math.abs(new Date(x.date)-d)<43200000))continue;
      const type=String(e.type||'depense').toLowerCase();if(!['depense','recette'].includes(type))continue;
      const m=(type==='recette'?1:-1)*(total/n);
      out.push({id:'event:'+String(e.id||'')+':'+i,source:'evenement',sourceId:e.id||'',date:d.toISOString(),libelle:e.libelle||'Événement',categorie:e.categorie||'',compte:e.compte||'',montantSigne:arrondiTresorerie_(m),certitude:'tres_probable',preuve:preuveDatePlanTresorerie_('Événement effectif du Plan',dr),dateConventionnelle:!!dr.conventionnelle});
    }
  });return out;
}

function normaliserMontantsActionsTresorerie20260831_(lignes,actions){
  const index=Object.fromEntries((actions||[]).map(a=>[String(a.id||''),a]));
  return (lignes||[]).map(x=>{if(x.source!=='action')return x;const a=index[String(x.sourceId||'')];if(!a)return x;const f=String(a.fonction_plan||'').toUpperCase();if(!['RECEVOIR','REMBOURSER','TRANSFERER'].includes(f))return x;const cible=Math.abs(Number(a.cible_valeur||a.impact_montant||0));if(!Number.isFinite(cible)||cible<=0)return x;const signe=f==='RECEVOIR'?1:-1;return Object.assign({},x,{montantSigne:arrondiTresorerie_(signe*cible),preuve:String(x.preuve||'Action financière du Plan')+' · cible '+String(a.impact_frequence||'ponctuel')+' appliquée par occurrence'});});
}
function prioriteSourceTresorerie20260831_(s){return {operation_future:0,evenement:1,action:2,revenu_recurrent:3,charge_fixe:5,pilotable:8}[String(s||'')]??9;}
function normaliserLibelleTresorerie20260831_(s){try{return normaliserRechercheAction_(String(s||'')).replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();}catch(e){return String(s||'').toLowerCase().replace(/[^a-zà-ÿ]+/g,' ').replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();}}
function ressemblentTresorerie20260831_(a,b){
  if(!a||!b)return false;if(a.source===b.source&&a.sourceId&&b.sourceId&&String(a.sourceId)!==String(b.sourceId))return false;
  const ma=Number(a.montantSigne||0),mb=Number(b.montantSigne||0);if(ma*mb<0)return false;if(Math.abs(ma-mb)>Math.max(1,Math.max(Math.abs(ma),Math.abs(mb))*.08))return false;
  const da=new Date(a.date),db=new Date(b.date);if(isNaN(da)||isNaN(db)||Math.abs(da-db)>5*86400000)return false;if(a.sourceId&&b.sourceId&&String(a.sourceId)===String(b.sourceId)&&a.source===b.source)return true;
  const ca=String(a.categorie||'').trim(),cb=String(b.categorie||'').trim(),la=normaliserLibelleTresorerie20260831_(a.libelle),lb=normaliserLibelleTresorerie20260831_(b.libelle),motsA=la.split(' ').filter(x=>x.length>=4),motsB=lb.split(' ').filter(x=>x.length>=4);return motsA.some(x=>motsB.includes(x))||(ca&&cb&&ca===cb&&Math.abs(ma-mb)<.01);
}
function dedoublonnerPrevisionsTresorerie20260831_(lignes){const trie=(lignes||[]).slice().sort((a,b)=>prioriteSourceTresorerie20260831_(a.source)-prioriteSourceTresorerie20260831_(b.source)),gardees=[];trie.forEach(x=>{if(x.source==='pilotable'){gardees.push(x);return;}if(gardees.some(y=>y.source!=='pilotable'&&ressemblentTresorerie20260831_(x,y)))return;gardees.push(x);});return gardees;}

function estSuspensionTemporaireTresorerie20260831_(e){
  if(!e)return false;
  const t=String(e.type||'').trim().toLowerCase();
  if(t==='charge_supprimee_temporairement')return true;
  const legacy=String(e.source_legacy||'').trim().toLowerCase();
  const lib=normaliserLibelleTresorerie20260831_(e.libelle||'');
  return legacy==='ajustements_charges_fixes'&&/(suspension|suspend|report|reporte|suppression|supprime)/.test(lib);
}
function appliquerSuppressionsTemporairesTresorerie20260831_(lignes,evenements){
  let out=(lignes||[]).slice();
  (evenements||[]).filter(e=>statutEffectifTresorerie20260831_(e.statut)&&estSuspensionTemporaireTresorerie20260831_(e)).forEach(e=>{
    const eid=String(e.id||''),m=Math.abs(Number(e.montant||0)),ed=datePlanTresorerie_(e,new Date(),false).date,cat=String(e.categorie||'').trim();out=out.filter(x=>!(x.source==='evenement'&&String(x.sourceId||'')===eid));let meilleur=-1,score=Infinity;
    out.forEach((x,i)=>{if(x.source!=='charge_fixe'||Number(x.montantSigne||0)>=0)return;const xd=new Date(x.date),ecartJ=isNaN(xd)||!ed?99:Math.abs(xd-ed)/86400000,ecartM=Math.abs(Math.abs(Number(x.montantSigne||0))-m);if(ecartJ>5||ecartM>Math.max(1,m*.03))return;const memeCat=cat&&String(x.categorie||'').trim()===cat,le=normaliserLibelleTresorerie20260831_(e.libelle),lx=normaliserLibelleTresorerie20260831_(x.libelle),commun=le.split(' ').filter(w=>w.length>=4).some(w=>lx.includes(w)),s=ecartJ*10+ecartM+(memeCat?0:20)+(commun?0:10);if(s<score){score=s;meilleur=i;}});if(meilleur>=0)out.splice(meilleur,1);
  });return out;
}

function lireCanonRecettesTresorerie20260831_(){
  const lecteurs=[
    ()=>typeof lireTablePlanCerbere_==='function'?lireTablePlanCerbere_('Cerbere_Recettes_Canon_V1'):null,
    ()=>typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Cerbere_Recettes_Canon_V1'):null,
    ()=>typeof lireTable_==='function'?lireTable_('Cerbere_Recettes_Canon_V1'):null
  ];
  for(let i=0;i<lecteurs.length;i++){
    try{const x=lecteurs[i]();if(Array.isArray(x)&&x.length)return x;}catch(e){}
  }
  return [];
}
function revenusCanoniquesTresorerie20260831_(ops,lignesExistantes,now,cible){
  const canon=lireCanonRecettesTresorerie20260831_(),out=[];
  (canon||[]).forEach(c=>{if(!actifTresorerie_(c.actif)||String(c.nature||'').toLowerCase()!=='structurelle')return;const cat=String(c.categorie||'').trim();if(!cat)return;const baseMont=Math.abs(Number(c.montant||0));
    const hist=(ops||[]).map(o=>({o,d:dateOpTresorerie_(o),m:Math.abs(Number(o.montant||0))})).filter(x=>x.d&&x.d<=now&&x.d>=new Date(now.getFullYear(),now.getMonth()-6,1)&&(String(x.o.type||'').toLowerCase()==='revenu'||Number(x.o.montant||0)>0)&&String(x.o.categorie||'').trim()===cat),histSignif=hist.filter(x=>x.m>=Math.max(20,baseMont*.35)),jours=(histSignif.length?histSignif:hist).map(x=>x.d.getDate()).sort((a,b)=>a-b),jour=Math.max(1,Math.min(28,jours.length?jours[Math.floor(jours.length/2)]:15));
    let d=new Date(now.getFullYear(),now.getMonth(),jour);if(d<=now)d=new Date(now.getFullYear(),now.getMonth()+1,jour);let guard=0;
    while(d<=cible&&guard++<6){let montant=baseMont;const de=c.date_effet?new Date(c.date_effet):null;if(de&&!isNaN(de)&&d<de&&Number(c.montant_precedent)>0)montant=Math.abs(Number(c.montant_precedent));if(montant>0){const cand={id:'revcanon:'+cat+':'+d.getTime(),source:'revenu_recurrent',sourceId:'canon:'+cat,date:d.toISOString(),libelle:cat,categorie:cat,compte:histSignif.length?histSignif[histSignif.length-1].o.compte||'':'',montantSigne:arrondiTresorerie_(montant),certitude:histSignif.length>=3?'tres_probable':'prevu',preuve:'Revenu structurel du canon Cerbère · date habituelle estimée',dateConventionnelle:true};if(!(lignesExistantes||[]).some(x=>ressemblentTresorerie20260831_(cand,x)))out.push(cand);}d=new Date(d.getFullYear(),d.getMonth()+1,jour);}
  });return out;
}

function dernierJourMoisTresorerie20260831_(d){return finJourTresorerie_(new Date(d.getFullYear(),d.getMonth()+1,0));}
function memeJourTresorerie20260831_(a,b){return a&&b&&!isNaN(a)&&!isNaN(b)&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}

/**
 * Cerbère est une autorisation/estimation d'engagement économique, pas une sortie
 * bancaire immédiate. Avec la CB à débit différé, le cycle courant n'affecte le
 * compte qu'au dernier jour du mois civil qui contient la fin du cycle.
 *
 * Exemple : cycle 28/08 -> 27/09 => débit estimé le 30/09. Les molettes du cycle
 * ne changent donc PAS les soldes prévus au 03/09, 17/09 ou 27/09.
 *
 * Si des achats CB du cycle sont déjà importés avec date_comptable = date de débit,
 * ils sont certains et remplacent la même part de l'estimation Cerbère : on ajoute
 * seulement le reliquat nécessaire pour atteindre la dépense pilotable projetée.
 */
function estimationPilotableTresorerie20260831_(now,cible,ops){
  try{
    const chargeur=typeof chargerCerbereV374==='function'?chargerCerbereV374:(typeof chargerCerbereV37==='function'?chargerCerbereV37:null);
    if(!chargeur)return null;
    const c=chargeur(),p=c&&Array.isArray(c.periodes)?c.periodes[0]:null;if(!p)return null;
    const periode=p.periode||p,finCycle=periode&&periode.fin?new Date(periode.fin):null;if(!finCycle||isNaN(finCycle))return null;
    const dateDebit=dernierJourMoisTresorerie20260831_(finCycle);
    if(dateDebit<=now||dateDebit>cible)return null;

    const env=Array.isArray(p.enveloppes)?p.enveloppes:[];
    const catsPilotables=new Set(env.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
    let totalCerbere=0;
    env.forEach(x=>{
      const allocation=Math.max(0,Number(x&&x.prevu||0));
      const engage=Math.max(0,Number(x&&x.engageV37!=null?x.engageV37:((x&&x.reelNetPrevisionnel||0)+(x&&x.planifie||0))));
      const projete=x&&x.dpt1!=null?Math.max(0,Number(x.dpt1)):Math.max(allocation,engage);
      totalCerbere+=projete;
    });
    if(!env.length){
      const v=p.v37||{};
      totalCerbere=Math.max(0,Number(v.dpt1||p.budgetReparti||0));
    }
    totalCerbere=arrondiTresorerie_(totalCerbere);if(totalCerbere<=0)return null;

    let dejaConnuCb=0;
    (ops||[]).forEach(o=>{
      const d=dateOpTresorerie_(o),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim();
      if(!d||!memeJourTresorerie20260831_(d,dateDebit)||m>=0)return;
      if(!String(o&&o.carte_fin||'').trim())return;
      if(catsPilotables.size&&!catsPilotables.has(cat))return;
      if(String(o&&o.charge_fixe_id||'').trim())return;
      dejaConnuCb+=Math.abs(m);
    });
    dejaConnuCb=arrondiTresorerie_(dejaConnuCb);

    const residuel=arrondiTresorerie_(Math.max(0,totalCerbere-dejaConnuCb));
    if(residuel<=0)return null;
    return {
      id:'pilotable:debit-cb:'+Utilities.formatDate(dateDebit,Session.getScriptTimeZone(),'yyyyMMdd'),
      source:'pilotable',sourceId:'cerbere',date:dateDebit.toISOString(),
      libelle:'Débit CB différé estimé (Cerbère)',categorie:'Pilotable',compte:'',
      montantSigne:-residuel,certitude:'estime',
      preuve:'Projection Cerbère du cycle, débit bancaire différé en fin de mois · CB déjà connues déduites',
      dateConventionnelle:false,totalCerbere:totalCerbere,dejaConnuCb:dejaConnuCb,
      allocationRestante:residuel,fractionTemps:1,
      joker:!!(p.v37&&p.v37.joker&&p.v37.joker.actif),moteurCerbere:String(c.version||'')
    };
  }catch(e){return null;}
}

function resumeTresorerie20260831_(lignes){const r={operations_futures:0,charges_fixes:0,evenements:0,actions:0,revenus_recurrents:0,pilotable:0,recettes:0,depenses:0};(lignes||[]).forEach(x=>{const m=Number(x.montantSigne||0);if(m>=0)r.recettes+=m;else r.depenses+=Math.abs(m);if(x.source==='operation_future')r.operations_futures+=m;else if(x.source==='charge_fixe')r.charges_fixes+=m;else if(x.source==='evenement')r.evenements+=m;else if(x.source==='action')r.actions+=m;else if(x.source==='revenu_recurrent')r.revenus_recurrents+=m;else if(x.source==='pilotable')r.pilotable+=m;});Object.keys(r).forEach(k=>r[k]=arrondiTresorerie_(r[k]));return r;}