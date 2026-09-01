const TREASURY_FORECAST_CORRECTIONS_20260831_VERSION='2026-09-01.1';

/**
 * Prévision bancaire BudgetSoft.
 *
 * Grandeur maîtresse : solde prévisionnel du compte courant.
 * Le moteur part du dernier solde bancaire fiable et n'ajoute que les flux qui ne
 * sont pas encore incorporés à ce solde.
 *
 * Hiérarchie de remplacement : estimation -> engagement connu -> opération réelle -> solde réel.
 * Jamais Prévision + Réel pour un même mouvement.
 *
 * Cerbère n'est pas un second moteur de trésorerie. Il fournit uniquement une
 * hypothèse pour la partie encore inconnue du prochain débit CB différé.
 */
function chargerTresoreriePrevisionnelle20260831(dateCible){
  return avecContexteLectureBudgetSoft20260827_('tresorerie_previsionnelle_20260901',function(){
    const socle=chargerTresoreriePrevisionnelle20260830(dateCible);
    if(!socle||!socle.ok)return socle;

    const ops=lireTable_('Operations');
    const charges=lireTable_('Charges_fixes');
    const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
    const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
    const comptes=Array.isArray(socle.comptes)?socle.comptes:[];

    const reference=dateReferenceBancaireTresorerie20260901_(socle,ops);
    const cible=normaliserDateCibleTresorerie_(dateCible,reference);

    // Reconstruction complète depuis le solde réel : on ne réutilise pas les lignes
    // produites par l'ancien moteur, afin de ne pas conserver une ancienne doctrine.
    const hard=operationsFuturesTresorerie_(ops,reference,cible,comptes);
    let lignes=hard.slice();

    let cfs=occurrencesChargesTresorerie_(charges,hard,actions,reference,cible,comptes);
    cfs=recalerChargesFixesCarteTresorerie20260901_(cfs,charges,ops,hard,reference,cible);
    lignes=lignes.concat(cfs);

    const evs=occurrencesEvenementsTresorerie_(evenements,hard,reference,cible,comptes)
      .filter(x=>evenementEffectifTresorerie20260831_(x.sourceId,evenements));
    lignes=lignes.concat(evs);
    lignes=completerEvenementsEffectifsTresorerie20260831_(lignes,evenements,reference,cible);

    const acts=normaliserMontantsActionsTresorerie20260831_(
      occurrencesActionsTresorerie_(actions,hard,reference,cible,comptes),actions
    );
    lignes=lignes.concat(acts);

    lignes=appliquerSuppressionsTemporairesTresorerie20260831_(lignes,evenements);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);

    const revenusCanon=revenusCanoniquesTresorerie20260831_(ops,lignes,reference,cible);
    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes.concat(revenusCanon));

    // Ancienne source supprimée : aucune dépense Cerbère progressive avant le débit CB.
    lignes=lignes.filter(x=>x.source!=='pilotable');
    const debitCb=estimationDebitCbDiffereTresorerie20260901_(ops,reference,cible);
    if(debitCb)lignes.push(debitCb);

    lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);
    lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));

    const variation=arrondiTresorerie_(lignes.reduce((s,x)=>s+Number(x.montantSigne||0),0));
    const certain=arrondiTresorerie_(lignes.filter(x=>x.certitude==='certain').reduce((s,x)=>s+Number(x.montantSigne||0),0));
    const tresProbable=arrondiTresorerie_(lignes.filter(x=>['certain','tres_probable'].includes(x.certitude)).reduce((s,x)=>s+Number(x.montantSigne||0),0));

    socle.version=TREASURY_FORECAST_CORRECTIONS_20260831_VERSION;
    socle.dateReference=reference.toISOString();
    socle.dateCible=cible.toISOString();
    socle.lignes=lignes;
    socle.variationPrevue=variation;
    socle.soldePrevisionnel=arrondiTresorerie_(Number(socle.soldeReel||0)+variation);
    socle.fourchette={
      certain:arrondiTresorerie_(Number(socle.soldeReel||0)+certain),
      tresProbable:arrondiTresorerie_(Number(socle.soldeReel||0)+tresProbable),
      toutesHypotheses:socle.soldePrevisionnel
    };
    socle.resume=resumeTresorerie20260831_(lignes);
    socle.confiance=confianceTresorerie_(reference,cible,lignes);
    socle.pilotable=null;
    socle.debitCbEstime=debitCb||null;
    socle.diagnostic20260831={
      doctrine:'solde bancaire réel + seuls flux non encore incorporés',
      hierarchie:'estimation -> engagement connu -> opération réelle -> solde réel',
      dateReferenceBancaire:reference.toISOString(),
      revenusCanoniquesAjoutes:revenusCanon.length,
      lignesFinales:lignes.length,
      evenementsEffectifs:(evenements||[]).filter(e=>statutEffectifTresorerie20260831_(e.statut)).length,
      suspensionsEffectives:(evenements||[]).filter(e=>statutEffectifTresorerie20260831_(e.statut)&&estSuspensionTemporaireTresorerie20260831_(e)).length,
      debitCbEstimeAjoute:!!debitCb,
      debitCbDate:debitCb?debitCb.date:null,
      debitCbPartCerbere:debitCb?debitCb.partCerbere:0,
      debitCbPartFinMois:debitCb?debitCb.partFinMois:0
    };
    return socle;
  });
}

function listerMouvementsFutursTresorerie20260831(dateCible){
  const r=chargerTresoreriePrevisionnelle20260831(dateCible||dateDansJoursTresorerie_(45));
  return {ok:r.ok,version:r.version,dateReference:r.dateReference,dateCible:r.dateCible,lignes:r.lignes||[],confiance:r.confiance,diagnostic20260831:r.diagnostic20260831||{}};
}

/** Le solde affiché par Comptes reste maître. Sa date, si disponible, devient la frontière du Réel. */
function dateReferenceBancaireTresorerie20260901_(socle,ops){
  const ds=(socle&&socle.comptes||[]).map(c=>new Date(c&&c.dateSolde||0)).filter(d=>!isNaN(d));
  let d=null;
  if(ds.length){
    // En présence de plusieurs comptes courants datés différemment, on prend la date
    // la plus récente mais le diagnostic de confiance pourra être abaissé par la suite.
    d=new Date(Math.max.apply(null,ds.map(x=>x.getTime())));
  }
  if(!d){
    const od=(ops||[]).map(o=>dateOpTresorerie_(o)).filter(Boolean);
    if(od.length)d=new Date(Math.max.apply(null,od.map(x=>x.getTime())));
  }
  if(!d||isNaN(d))d=new Date(socle&&socle.dateReference||new Date());
  return finJourTresorerie_(d);
}

function statutEffectifTresorerie20260831_(statut){
  const s=String(statut||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return ['effectif','effective','effectifs','effectives'].includes(s);
}
function evenementEffectifTresorerie20260831_(id,evenements){
  const e=(evenements||[]).find(x=>String(x.id||'')===String(id||''));
  return !!e&&statutEffectifTresorerie20260831_(e.statut);
}
function debutJourTresorerie20260831_(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0,0);}

function completerEvenementsEffectifsTresorerie20260831_(lignes,evenements,reference,cible){
  const out=(lignes||[]).slice(),debut=debutJourTresorerie20260831_(reference);
  (evenements||[]).forEach(e=>{
    if(!statutEffectifTresorerie20260831_(e.statut)||estSuspensionTemporaireTresorerie20260831_(e))return;
    const dr=datePlanTresorerie_(e,reference,false),base=dr.date;if(!base||isNaN(base))return;
    const n=(e.fractionne===true||String(e.fractionne)==='true')?Math.max(1,Number(e.nombre_fois||1)):1;
    const per=String(e.periodicite_fractionnement||'mensuel').toLowerCase(),total=Math.abs(Number(e.montant||0));
    for(let i=0;i<n;i++){
      const d=new Date(base);if(i){if(per==='annuel')d.setFullYear(d.getFullYear()+i);else d.setMonth(d.getMonth()+i);}
      if(d<debut||d>cible)continue;
      if(out.some(x=>x.source==='evenement'&&String(x.sourceId||'')===String(e.id||'')&&Math.abs(new Date(x.date)-d)<43200000))continue;
      const type=String(e.type||'depense').toLowerCase();if(!['depense','recette'].includes(type))continue;
      const m=(type==='recette'?1:-1)*(total/n);
      out.push({id:'event:'+String(e.id||'')+':'+i,source:'evenement',sourceId:e.id||'',date:d.toISOString(),libelle:e.libelle||'Événement',categorie:e.categorie||'',compte:e.compte||'',montantSigne:arrondiTresorerie_(m),certitude:'tres_probable',preuve:preuveDatePlanTresorerie_('Événement effectif du Plan',dr),dateConventionnelle:!!dr.conventionnelle});
    }
  });
  return out;
}

function normaliserMontantsActionsTresorerie20260831_(lignes,actions){
  const index=Object.fromEntries((actions||[]).map(a=>[String(a.id||''),a]));
  return (lignes||[]).map(x=>{
    if(x.source!=='action')return x;
    const a=index[String(x.sourceId||'')];if(!a)return x;
    const f=String(a.fonction_plan||'').toUpperCase();if(!['RECEVOIR','REMBOURSER','TRANSFERER'].includes(f))return x;
    const cible=Math.abs(Number(a.cible_valeur||a.impact_montant||0));if(!Number.isFinite(cible)||cible<=0)return x;
    const signe=f==='RECEVOIR'?1:-1;
    return Object.assign({},x,{montantSigne:arrondiTresorerie_(signe*cible),preuve:String(x.preuve||'Action financière du Plan')+' · cible '+String(a.impact_frequence||'ponctuel')+' appliquée par occurrence'});
  });
}

function prioriteSourceTresorerie20260831_(s){return {operation_future:0,evenement:1,action:2,revenu_recurrent:3,charge_fixe:5,debit_cb_estime:8,pilotable:9}[String(s||'')]??10;}
function normaliserLibelleTresorerie20260831_(s){
  try{return normaliserRechercheAction_(String(s||'')).replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();}
  catch(e){return String(s||'').toLowerCase().replace(/[^a-zà-ÿ]+/g,' ').replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();}
}
function ressemblentTresorerie20260831_(a,b){
  if(!a||!b)return false;
  if(a.source===b.source&&a.sourceId&&b.sourceId&&String(a.sourceId)!==String(b.sourceId))return false;
  if(a.source==='debit_cb_estime'||b.source==='debit_cb_estime')return false;
  const ma=Number(a.montantSigne||0),mb=Number(b.montantSigne||0);if(ma*mb<0)return false;
  if(Math.abs(ma-mb)>Math.max(1,Math.max(Math.abs(ma),Math.abs(mb))*.08))return false;
  const da=new Date(a.date),db=new Date(b.date);if(isNaN(da)||isNaN(db)||Math.abs(da-db)>5*86400000)return false;
  if(a.sourceId&&b.sourceId&&String(a.sourceId)===String(b.sourceId)&&a.source===b.source)return true;
  const ca=String(a.categorie||'').trim(),cb=String(b.categorie||'').trim();
  const la=normaliserLibelleTresorerie20260831_(a.libelle),lb=normaliserLibelleTresorerie20260831_(b.libelle);
  const motsA=la.split(' ').filter(x=>x.length>=4),motsB=lb.split(' ').filter(x=>x.length>=4);
  return motsA.some(x=>motsB.includes(x))||(ca&&cb&&ca===cb&&Math.abs(ma-mb)<.01);
}
function dedoublonnerPrevisionsTresorerie20260831_(lignes){
  const trie=(lignes||[]).slice().sort((a,b)=>prioriteSourceTresorerie20260831_(a.source)-prioriteSourceTresorerie20260831_(b.source)),gardees=[];
  trie.forEach(x=>{if(x.source==='debit_cb_estime'){gardees.push(x);return;}if(gardees.some(y=>y.source!=='debit_cb_estime'&&ressemblentTresorerie20260831_(x,y)))return;gardees.push(x);});
  return gardees;
}

function estSuspensionTemporaireTresorerie20260831_(e){
  if(!e)return false;
  const t=String(e.type||'').trim().toLowerCase();if(t==='charge_supprimee_temporairement')return true;
  const legacy=String(e.source_legacy||'').trim().toLowerCase(),lib=normaliserLibelleTresorerie20260831_(e.libelle||'');
  return legacy==='ajustements_charges_fixes'&&/(suspension|suspend|report|reporte|suppression|supprime)/.test(lib);
}
function appliquerSuppressionsTemporairesTresorerie20260831_(lignes,evenements){
  let out=(lignes||[]).slice();
  (evenements||[]).filter(e=>statutEffectifTresorerie20260831_(e.statut)&&estSuspensionTemporaireTresorerie20260831_(e)).forEach(e=>{
    const eid=String(e.id||''),m=Math.abs(Number(e.montant||0)),ed=datePlanTresorerie_(e,new Date(),false).date,cat=String(e.categorie||'').trim();
    out=out.filter(x=>!(x.source==='evenement'&&String(x.sourceId||'')===eid));let meilleur=-1,score=Infinity;
    out.forEach((x,i)=>{
      if(x.source!=='charge_fixe'||Number(x.montantSigne||0)>=0)return;
      const xd=new Date(x.date),ecartJ=isNaN(xd)||!ed?99:Math.abs(xd-ed)/86400000,ecartM=Math.abs(Math.abs(Number(x.montantSigne||0))-m);
      if(ecartJ>5||ecartM>Math.max(1,m*.03))return;
      const memeCat=cat&&String(x.categorie||'').trim()===cat,le=normaliserLibelleTresorerie20260831_(e.libelle),lx=normaliserLibelleTresorerie20260831_(x.libelle),commun=le.split(' ').filter(w=>w.length>=4).some(w=>lx.includes(w));
      const s=ecartJ*10+ecartM+(memeCat?0:20)+(commun?0:10);if(s<score){score=s;meilleur=i;}
    });
    if(meilleur>=0)out.splice(meilleur,1);
  });
  return out;
}

function lireCanonRecettesTresorerie20260831_(){
  const lecteurs=[
    ()=>typeof lireTablePlanCerbere_==='function'?lireTablePlanCerbere_('Cerbere_Recettes_Canon_V1'):null,
    ()=>typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Cerbere_Recettes_Canon_V1'):null,
    ()=>typeof lireTable_==='function'?lireTable_('Cerbere_Recettes_Canon_V1'):null
  ];
  for(let i=0;i<lecteurs.length;i++){try{const x=lecteurs[i]();if(Array.isArray(x)&&x.length)return x;}catch(e){}}
  return [];
}
function revenusCanoniquesTresorerie20260831_(ops,lignesExistantes,reference,cible){
  const canon=lireCanonRecettesTresorerie20260831_(),out=[];
  (canon||[]).forEach(c=>{
    if(!actifTresorerie_(c.actif)||String(c.nature||'').toLowerCase()!=='structurelle')return;
    const cat=String(c.categorie||'').trim();if(!cat)return;const baseMont=Math.abs(Number(c.montant||0));
    const hist=(ops||[]).map(o=>({o,d:dateOpTresorerie_(o),m:Math.abs(Number(o.montant||0))}))
      .filter(x=>x.d&&x.d<=reference&&x.d>=new Date(reference.getFullYear(),reference.getMonth()-6,1)&&(String(x.o.type||'').toLowerCase()==='revenu'||Number(x.o.montant||0)>0)&&String(x.o.categorie||'').trim()===cat);
    const histSignif=hist.filter(x=>x.m>=Math.max(20,baseMont*.35));
    const jours=(histSignif.length?histSignif:hist).map(x=>x.d.getDate()).sort((a,b)=>a-b);
    const jour=Math.max(1,Math.min(28,jours.length?jours[Math.floor(jours.length/2)]:15));
    let d=new Date(reference.getFullYear(),reference.getMonth(),jour);if(d<=reference)d=new Date(reference.getFullYear(),reference.getMonth()+1,jour);let guard=0;
    while(d<=cible&&guard++<6){
      let montant=baseMont;const de=c.date_effet?new Date(c.date_effet):null;
      if(de&&!isNaN(de)&&d<de&&Number(c.montant_precedent)>0)montant=Math.abs(Number(c.montant_precedent));
      if(montant>0){
        const cand={id:'revcanon:'+cat+':'+d.getTime(),source:'revenu_recurrent',sourceId:'canon:'+cat,date:d.toISOString(),libelle:cat,categorie:cat,compte:histSignif.length?histSignif[histSignif.length-1].o.compte||'':'',montantSigne:arrondiTresorerie_(montant),certitude:histSignif.length>=3?'tres_probable':'prevu',preuve:'Revenu structurel du canon Cerbère · date habituelle estimée',dateConventionnelle:true};
        if(!(lignesExistantes||[]).some(x=>ressemblentTresorerie20260831_(cand,x)))out.push(cand);
      }
      d=new Date(d.getFullYear(),d.getMonth()+1,jour);
    }
  });
  return out;
}

function estOperationCarteTresorerie20260901_(o){
  if(!o)return false;
  if(String(o.carte_fin||'').trim())return true;
  const mode=String(o.mode_paiement||o.moyen_paiement||'').toLowerCase();
  return /carte|cb/.test(mode);
}
function dateAchatCarteTresorerie20260901_(o){
  const d=new Date(o&&o.date_achat||o&&o.date_operation||o&&o.date||0);return isNaN(d)?null:d;
}
function dernierJourMoisTresorerie20260901_(y,m){return finJourTresorerie_(new Date(y,m+1,0));}
function prochaineDateDebitCbTresorerie20260901_(reference){
  let d=dernierJourMoisTresorerie20260901_(reference.getFullYear(),reference.getMonth());
  if(d<=reference)d=dernierJourMoisTresorerie20260901_(reference.getFullYear(),reference.getMonth()+1);
  return d;
}

/**
 * Les charges fixes réglées par carte restent des charges fixes métier, mais leur
 * sortie bancaire est recadrée au débit différé. Le Réel carte futur, s'il existe,
 * garde la priorité et remplace la prévision de charge.
 */
function recalerChargesFixesCarteTresorerie20260901_(lignes,charges,ops,hard,reference,cible){
  const idsCarte=new Set();
  (ops||[]).forEach(o=>{if(estOperationCarteTresorerie20260901_(o)&&o.charge_fixe_id)idsCarte.add(String(o.charge_fixe_id));});
  (charges||[]).forEach(c=>{const mode=String(c.mode_paiement||c.moyen_paiement||'').toLowerCase();if(/carte|cb/.test(mode))idsCarte.add(String(c.id||''));});
  return (lignes||[]).map(x=>{
    if(x.source!=='charge_fixe'||!idsCarte.has(String(x.sourceId||'')))return x;
    const achat=new Date(x.date);if(isNaN(achat))return x;
    const debit=dernierJourMoisTresorerie20260901_(achat.getFullYear(),achat.getMonth());
    return Object.assign({},x,{date:debit.toISOString(),preuve:'Charge fixe réglée par CB · débit bancaire différé fin de mois'});
  }).filter(x=>{
    const d=new Date(x.date);if(isNaN(d)||d<=reference||d>cible)return false;
    if(x.source!=='charge_fixe'||!idsCarte.has(String(x.sourceId||'')))return true;
    return !operationCouvrePrevisionTresorerie_(hard,d,Number(x.montantSigne||0),x.libelle||'');
  });
}

/** Estimation marginale des achats CB des jours 28 -> fin de mois, à partir du Réel historique. */
function estimationQueueCbFinMoisTresorerie20260901_(ops,reference,debit){
  const debutJour=Math.max(28,reference.getMonth()===debit.getMonth()&&reference.getFullYear()===debit.getFullYear()?reference.getDate()+1:28);
  const finJour=debit.getDate();if(debutJour>finJour)return 0;
  const historiques=[];
  for(let k=1;k<=4;k++){
    const d0=new Date(debit.getFullYear(),debit.getMonth()-k,1),y=d0.getFullYear(),m=d0.getMonth();
    let total=0,jours=0;
    for(let j=28;j<=new Date(y,m+1,0).getDate();j++)jours++;
    (ops||[]).forEach(o=>{
      if(!estOperationCarteTresorerie20260901_(o)||o.charge_fixe_id||Number(o.montant||0)>=0)return;
      const da=dateAchatCarteTresorerie20260901_(o);if(!da||da.getFullYear()!==y||da.getMonth()!==m||da.getDate()<28)return;
      total+=Math.abs(Number(o.montant||0));
    });
    if(jours)historiques.push(total/jours);
  }
  const positifs=historiques.filter(x=>x>0).sort((a,b)=>a-b);if(!positifs.length)return 0;
  const journalier=positifs[Math.floor(positifs.length/2)];
  return arrondiTresorerie_(journalier*(finJour-debutJour+1));
}

/**
 * Complément inconnu du prochain débit CB différé.
 *
 * - Jusqu'au 27 : REt1 Cerbère estime ce qui peut encore être engagé sur la partie
 *   pilotable du cycle ; les molettes agissent donc sur le prochain débit, jamais
 *   sur un solde antérieur à ce débit.
 * - Du 28 à la fin du mois : le nouveau cycle Cerbère ne doit pas réécrire le débit
 *   presque achevé du mois précédent ; seule une petite queue statistique historique
 *   est utilisée pour les jours restant à courir.
 * - Les opérations CB déjà importées ont déjà leur date comptable future et sont
 *   comptées comme opérations certaines ; elles ne sont jamais ajoutées une seconde fois.
 */
function estimationDebitCbDiffereTresorerie20260901_(ops,reference,cible){
  const debit=prochaineDateDebitCbTresorerie20260901_(reference);if(debit>cible)return null;
  let partCerbere=0,moteurCerbere='';
  if(reference.getDate()<=27){
    try{
      const chargeur=typeof chargerCerbereV374==='function'?chargerCerbereV374:(typeof chargerCerbereV37==='function'?chargerCerbereV37:null);
      if(chargeur){
        const c=chargeur(),p=c&&Array.isArray(c.periodes)?c.periodes[0]:null;
        if(p){
          const finCycle=new Date((p.periode||p).fin||0);
          if(!isNaN(finCycle)&&finCycle.getFullYear()===debit.getFullYear()&&finCycle.getMonth()===debit.getMonth()){
            const env=Array.isArray(p.enveloppes)?p.enveloppes:[];
            partCerbere=arrondiTresorerie_(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.resteV37!=null?x.resteV37:(Number(x&&x.prevu||0)-Number(x&&x.reelNetPrevisionnel||x&&x.reelImpute||0)-Number(x&&x.planifie||0)))||0),0));
            moteurCerbere=String(c.version||'');
          }
        }
      }
    }catch(e){}
  }
  const partFinMois=estimationQueueCbFinMoisTresorerie20260901_(ops,reference,debit);
  const residuel=arrondiTresorerie_(Math.max(0,partCerbere+partFinMois));if(residuel<=0)return null;
  return {
    id:'debit_cb_estime:'+debit.getTime(),source:'debit_cb_estime',sourceId:'cb:'+debit.getFullYear()+'-'+(debit.getMonth()+1),date:debit.toISOString(),
    libelle:'Complément estimé du débit CB différé',categorie:'Carte à débit différé',compte:'',montantSigne:-residuel,certitude:'estime',
    preuve:'Complément non encore connu : reste Cerbère jusqu’au 27 + estimation marginale des jours 28-fin de mois',dateConventionnelle:false,
    partCerbere:partCerbere,partFinMois:partFinMois,moteurCerbere:moteurCerbere
  };
}

function resumeTresorerie20260831_(lignes){
  const r={operations_futures:0,charges_fixes:0,evenements:0,actions:0,revenus_recurrents:0,debit_cb_estime:0,pilotable:0,recettes:0,depenses:0};
  (lignes||[]).forEach(x=>{
    const m=Number(x.montantSigne||0);if(m>=0)r.recettes+=m;else r.depenses+=Math.abs(m);
    if(x.source==='operation_future')r.operations_futures+=m;
    else if(x.source==='charge_fixe')r.charges_fixes+=m;
    else if(x.source==='evenement')r.evenements+=m;
    else if(x.source==='action')r.actions+=m;
    else if(x.source==='revenu_recurrent')r.revenus_recurrents+=m;
    else if(x.source==='debit_cb_estime')r.debit_cb_estime+=m;
    else if(x.source==='pilotable')r.pilotable+=m;
  });
  Object.keys(r).forEach(k=>r[k]=arrondiTresorerie_(r[k]));return r;
}
