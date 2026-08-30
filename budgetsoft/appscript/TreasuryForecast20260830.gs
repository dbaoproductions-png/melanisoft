const TREASURY_FORECAST_20260830_VERSION='2026-08-30.1';

/**
 * Prévision de trésorerie bancaire commune à Comptes / Opérations / Cerbère.
 * Doctrine :
 * - part du solde bancaire réel ;
 * - une opération future déjà connue remplace toute prévision moins concrète ;
 * - Charges fixes / Plan restent virtuels, jamais écrits dans Operations ;
 * - les dépenses pilotables sont une estimation de trésorerie, distincte du réalisé économique ;
 * - les transferts sont neutres globalement mais affectent chaque compte séparément.
 */
function chargerTresoreriePrevisionnelle20260830(dateCible){
  const t0=Date.now();
  return avecContexteLectureBudgetSoft20260827_('tresorerie_previsionnelle',function(){
    const now=finJourTresorerie_(new Date());
    const cible=normaliserDateCibleTresorerie_(dateCible,now);
    const synthese=chargerSyntheseComptes20260828();
    const comptes=(synthese.comptes||[]).filter(c=>actifComptes20260828_(c.actif));
    const courants=comptes.filter(estCompteCourantTresorerie_);
    const comptesBase=courants.length?courants:comptes.filter(c=>!estEpargneTresorerie_(c));
    const soldeInitial=arrondiTresorerie_(comptesBase.reduce((s,c)=>s+Number(c.soldeReel||0),0));

    const ops=lireTable_('Operations');
    const charges=lireTable_('Charges_fixes');
    const events=lireFeuilleDynamiquePlan_('Plan_Evenements');
    const actions=lireFeuilleDynamiquePlan_('Plan_Actions');

    const lignes=[];
    const hard=operationsFuturesTresorerie_(ops,now,cible,comptesBase);
    hard.forEach(x=>lignes.push(x));

    const cfs=occurrencesChargesTresorerie_(charges,hard,actions,now,cible,comptesBase);
    cfs.forEach(x=>lignes.push(x));

    const evs=occurrencesEvenementsTresorerie_(events,hard,now,cible,comptesBase);
    evs.forEach(x=>lignes.push(x));

    const acts=occurrencesActionsTresorerie_(actions,hard,now,cible,comptesBase);
    acts.forEach(x=>lignes.push(x));

    const pilot=estimationPilotableTresorerie_(now,cible);
    if(pilot&&Math.abs(pilot.montant)>0.009)lignes.push(pilot);

    lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));
    const variation=arrondiTresorerie_(lignes.reduce((s,x)=>s+Number(x.montantSigne||0),0));
    const certain=arrondiTresorerie_(lignes.filter(x=>x.certitude==='certain').reduce((s,x)=>s+Number(x.montantSigne||0),0));
    const tresProbable=arrondiTresorerie_(lignes.filter(x=>['certain','tres_probable'].includes(x.certitude)).reduce((s,x)=>s+Number(x.montantSigne||0),0));
    const solde=arrondiTresorerie_(soldeInitial+variation);

    return serialiserCerberePourClient_({
      ok:true,version:TREASURY_FORECAST_20260830_VERSION,
      dateReference:now.toISOString(),dateCible:cible.toISOString(),
      soldeReel:soldeInitial,variationPrevue:variation,soldePrevisionnel:solde,
      fourchette:{certain:arrondiTresorerie_(soldeInitial+certain),tresProbable:arrondiTresorerie_(soldeInitial+tresProbable),toutesHypotheses:solde},
      confiance:confianceTresorerie_(now,cible,lignes),
      lignes:lignes,
      resume:resumeTresorerie_(lignes),
      pilotable:pilot||null,
      comptes:comptesBase.map(c=>({id:c.id,nom:c.nom,soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde})),
      performance:{dureeMs:Date.now()-t0}
    });
  });
}

function chargerTresorerieFinCycle20260830(){
  const now=new Date(),jour=now.getDate();
  let fin;
  if(jour<=27)fin=new Date(now.getFullYear(),now.getMonth(),27);
  else fin=new Date(now.getFullYear(),now.getMonth()+1,27);
  return chargerTresoreriePrevisionnelle20260830(Utilities.formatDate(fin,Session.getScriptTimeZone(),'yyyy-MM-dd'));
}

function listerMouvementsFutursTresorerie20260830(dateCible){
  const r=chargerTresoreriePrevisionnelle20260830(dateCible||dateDansJoursTresorerie_(45));
  return {ok:r.ok,version:r.version,dateCible:r.dateCible,lignes:r.lignes||[],confiance:r.confiance};
}

function normaliserDateCibleTresorerie_(v,now){
  let d=v?new Date(v):new Date(now.getFullYear(),now.getMonth(),now.getDate()+3);
  if(isNaN(d))d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+3);
  d=finJourTresorerie_(d);if(d<now)d=now;return d;
}
function finJourTresorerie_(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59,999);}
function dateDansJoursTresorerie_(n){const d=new Date();d.setDate(d.getDate()+Number(n||0));return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');}
function arrondiTresorerie_(n){return Math.round((Number(n)||0)*100)/100;}
function estCompteCourantTresorerie_(c){const s=String((c.nom||'')+' '+(c.type||'')+' '+(c.nature||'')).toLowerCase();return /courant|compte\s*(joint|ch[eè]ques?)/.test(s)&&!/livret|epargne|épargne/.test(s);}
function estEpargneTresorerie_(c){return /livret|epargne|épargne|placement/i.test(String((c.nom||'')+' '+(c.type||'')+' '+(c.nature||'')));}
function compteDansPerimetreTresorerie_(compte,cs){return (cs||[]).some(c=>String(compte||'')===String(c.id)||String(compte||'')===String(c.nom));}
function dateOpTresorerie_(o){const d=new Date(o.date_comptable||o.date||o.date_operation||0);return isNaN(d)?null:d;}
function signeOpTresorerie_(o){const n=Math.abs(Number(o.montant||0)),t=String(o.type||'').toLowerCase();if(t==='depense'||t==='tresorerie_sortie')return -n;if(t==='revenu'||t==='tresorerie_entree')return n;return Number(o.montant||0);}
function rangCertitudeTresorerie_(c){return {certain:0,tres_probable:1,prevu:2,estime:3}[c]??9;}

function operationsFuturesTresorerie_(ops,now,cible,comptes){
  return (ops||[]).filter(o=>{
    if(/\[RECURRENCE:[^\]]+\]/.test(String(o.commentaire||'')))return false;
    const d=dateOpTresorerie_(o);return d&&d>now&&d<=cible&&compteDansPerimetreTresorerie_(o.compte,comptes)&&Math.abs(Number(o.montant||0))>.0001;
  }).map(o=>({id:'op:'+String(o.id||''),source:'operation_future',sourceId:o.id||'',date:(dateOpTresorerie_(o)).toISOString(),libelle:o.libelle||o.libelle_bancaire||'Opération future',categorie:o.categorie||'',compte:o.compte||'',montantSigne:arrondiTresorerie_(signeOpTresorerie_(o)),certitude:'certain',preuve:'Date comptable déjà connue',charge_fixe_id:o.charge_fixe_id||''}));
}

function occurrencesChargesTresorerie_(charges,hard,actions,now,cible,comptes){
  const out=[],hardCf=new Set((hard||[]).map(x=>String(x.charge_fixe_id||'')).filter(Boolean));
  const remplacements=indexActionsChargesTresorerie_(actions);
  (charges||[]).forEach(c=>{
    if(!actifTresorerie_(c.actif)||hardCf.has(String(c.id)))return;
    const compte=c.compte||'';if(compte&&!compteDansPerimetreTresorerie_(compte,comptes))return;
    const mod=remplacements[String(c.id)]||null;
    if(mod&&mod.type==='supprimer'&&mod.date&&mod.date<=cible)return;
    const ds=datesOccurrencesChargeTresorerie_(c,now,cible);
    ds.forEach(d=>{
      let montant=Math.abs(Number(c.montant||c.montant_indicatif||0));let lib=c.libelle||c.libelle_bancaire||'Charge fixe';
      if(mod&&mod.date&&d>=mod.date){if(mod.type==='remplacer'&&Number.isFinite(mod.nouveauMontant)){montant=Math.max(0,mod.nouveauMontant);lib=mod.nouveauLibelle||lib;}if(mod.type==='reduire'&&Number.isFinite(mod.cible))montant=Math.max(0,montant-mod.cible);}
      if(montant<=0)return;
      if(operationCouvrePrevisionTresorerie_(hard,d,-montant,c.libelle_bancaire||c.libelle||''))return;
      out.push({id:'cf:'+String(c.id)+':'+d.getTime(),source:'charge_fixe',sourceId:c.id||'',date:d.toISOString(),libelle:lib,categorie:c.categorie||'',compte:compte,montantSigne:-arrondiTresorerie_(montant),certitude:'tres_probable',preuve:'Charge fixe récurrente'});
    });
  });return out;
}

function indexActionsChargesTresorerie_(actions){
  const m={};(actions||[]).forEach(a=>{
    if(a.source_type!=='charge_fixe'||!a.source_id||['Abandonnée','Abandonnée','Annulée'].includes(String(a.statut||'')))return;
    if(a.condition_libelle&&String(a.condition_statut||'')!=='Remplie')return;
    if(!(a.impact_confirme===true||String(a.impact_confirme)==='true'))return;
    const f=String(a.fonction_plan||'').toUpperCase(),date=a.date_effet?new Date(a.date_effet):null;if(!date||isNaN(date))return;
    if(f==='SUPPRIMER')m[String(a.source_id)]={type:'supprimer',date};
    else if(f==='REMPLACER')m[String(a.source_id)]={type:'remplacer',date,nouveauMontant:Number(a.valeur_remplacement||0),nouveauLibelle:a.source_remplacement_libelle||''};
    else if(f==='REDUIRE')m[String(a.source_id)]={type:'reduire',date,cible:Math.max(0,Number(a.cible_valeur||a.impact_montant||0))};
  });return m;
}
function actifTresorerie_(v){return v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0';}
function datesOccurrencesChargeTresorerie_(c,now,cible){
  const out=[],freq=String(c.frequence||c.frequency||'Mensuelle').toLowerCase();
  const debut=c.date_debut?new Date(c.date_debut):new Date(now.getFullYear(),now.getMonth()-1,1),fin=c.date_fin?new Date(c.date_fin):null;
  const jour=Math.max(1,Math.min(31,Number(c.jour_execution||c.jour||1)));
  let d;
  if(freq.includes('ann'))d=new Date(now.getFullYear(),debut.getMonth(),Math.min(jour,new Date(now.getFullYear(),debut.getMonth()+1,0).getDate()));
  else d=new Date(now.getFullYear(),now.getMonth(),Math.min(jour,new Date(now.getFullYear(),now.getMonth()+1,0).getDate()));
  let guard=0;
  while(d<=cible&&guard++<36){
    if(d>now&&d>=debut&&(!fin||d<=fin))out.push(new Date(d));
    if(freq.includes('ann'))d=new Date(d.getFullYear()+1,d.getMonth(),Math.min(jour,new Date(d.getFullYear()+1,d.getMonth()+1,0).getDate()));
    else if(freq.includes('trimes'))d=new Date(d.getFullYear(),d.getMonth()+3,Math.min(jour,new Date(d.getFullYear(),d.getMonth()+4,0).getDate()));
    else if(freq.includes('semes'))d=new Date(d.getFullYear(),d.getMonth()+6,Math.min(jour,new Date(d.getFullYear(),d.getMonth()+7,0).getDate()));
    else d=new Date(d.getFullYear(),d.getMonth()+1,Math.min(jour,new Date(d.getFullYear(),d.getMonth()+2,0).getDate()));
  }return out;
}

function occurrencesEvenementsTresorerie_(events,hard,now,cible,comptes){
  const out=[];(events||[]).forEach(e=>{
    if(['Réalisé','Rapproché','Annulé','Annulée'].includes(String(e.statut||'')))return;
    const cert=String(e.certitude||'certaine').toLowerCase(),niveau=cert==='certaine'?'tres_probable':cert==='probable'?'prevu':'estime';
    const base=e.date_effet?new Date(e.date_effet):null;if(!base||isNaN(base))return;
    const n=(e.fractionne===true||String(e.fractionne)==='true')?Math.max(1,Number(e.nombre_fois||1)):1,per=String(e.periodicite_fractionnement||'mensuel').toLowerCase(),total=Math.abs(Number(e.montant||0));
    for(let i=0;i<n;i++){
      const d=new Date(base);if(i){if(per==='annuel')d.setFullYear(d.getFullYear()+i);else d.setMonth(d.getMonth()+i);}if(d<=now||d>cible)continue;
      const m=(String(e.type||'depense').toLowerCase()==='recette'?1:-1)*(total/n);
      if(operationCouvrePrevisionTresorerie_(hard,d,m,e.libelle||''))continue;
      out.push({id:'event:'+String(e.id||'')+':'+i,source:'evenement',sourceId:e.id||'',date:d.toISOString(),libelle:e.libelle||'Événement',categorie:e.categorie||'',compte:e.compte||'',montantSigne:arrondiTresorerie_(m),certitude:niveau,preuve:'Événement du Plan'});
    }
  });return out;
}

function occurrencesActionsTresorerie_(actions,hard,now,cible,comptes){
  const out=[];(actions||[]).forEach(a=>{
    if(['Abandonnée','Annulée'].includes(String(a.statut||'')))return;
    if(a.condition_libelle&&String(a.condition_statut||'')!=='Remplie')return;
    if(!(a.impact_confirme===true||String(a.impact_confirme)==='true'))return;
    const f=String(a.fonction_plan||'').toUpperCase();
    if(!['REMBOURSER','TRANSFERER','RECEVOIR'].includes(f))return;
    const d0=a.date_effet?new Date(a.date_effet):now,d1=a.date_cible?new Date(a.date_cible):d0;if(isNaN(d0)||isNaN(d1))return;
    const freq=String(a.impact_frequence||'ponctuel').toLowerCase(),cibleMont=Math.abs(Number(a.cible_valeur||a.impact_montant||0));
    let dates=[];if(freq==='mensuel'){let d=new Date(d0);let guard=0;while(d<=d1&&guard++<24){dates.push(new Date(d));d.setMonth(d.getMonth()+1);}}else dates=[new Date(d1)];
    const montantPar=dates.length?cibleMont/dates.length:cibleMont;
    dates.forEach((d,i)=>{if(d<=now||d>cible)return;let signe=0,compte='';if(f==='RECEVOIR')signe=montantPar;else if(f==='REMBOURSER')signe=-montantPar;else if(f==='TRANSFERER'){compte=a.compte_source_id||'';signe=-montantPar;}if(!signe)return;if(operationCouvrePrevisionTresorerie_(hard,d,signe,a.source_libelle||a.libelle||''))return;out.push({id:'action:'+String(a.id||'')+':'+i,source:'action',sourceId:a.id||'',date:d.toISOString(),libelle:a.libelle||'Action du Plan',categorie:a.categorie||'',compte,montantSigne:arrondiTresorerie_(signe),certitude:String(a.statut)==='Effective'?'tres_probable':'prevu',preuve:'Action financière du Plan'});});
  });return out;
}

function operationCouvrePrevisionTresorerie_(hard,d,montant,libelle){
  const q=normaliserRechercheAction_(libelle||'').split(' ').filter(x=>x.length>=3),tm=Number(montant||0);
  return (hard||[]).some(h=>{const hd=new Date(h.date),jours=Math.abs(hd-d)/86400000;if(jours>5)return false;if(Math.abs(Number(h.montantSigne||0)-tm)>Math.max(1,Math.abs(tm)*.08))return false;if(!q.length)return true;const t=normaliserRechercheAction_(h.libelle||'');return q.some(x=>t.includes(x));});
}

function estimationPilotableTresorerie_(now,cible){
  try{
    let c=null;
    if(typeof chargerCerbereV37==='function')c=chargerCerbereV37();
    else if(typeof chargerCerbere37==='function')c=chargerCerbere37();
    else if(typeof chargerCerbereV3==='function')c=chargerCerbereV3();
    const p=c&&c.periodes&&c.periodes[0];if(!p)return null;
    const env=p.enveloppes||[];let restant=0;
    env.forEach(x=>{const r=x.resteV37!=null?Number(x.resteV37):Number(x.reste!=null?x.reste:(Number(x.prevu||0)-Number(x.reel||0)-Number(x.planifie||0)));restant+=Math.max(0,r||0);});
    const fin=p.periode&&p.periode.fin?new Date(p.periode.fin):(p.fin?new Date(p.fin):null);if(!fin||isNaN(fin)||restant<=0)return null;
    const joursRest=Math.max(1,(fin-now)/86400000),joursCible=Math.max(0,Math.min(joursRest,(cible-now)/86400000)),fraction=Math.max(0,Math.min(1,joursCible/joursRest)),montant=-arrondiTresorerie_(restant*fraction);
    return {id:'pilotable',source:'pilotable',sourceId:'cerbere',date:new Date(Math.min(cible.getTime(),fin.getTime())).toISOString(),libelle:'Dépenses pilotables estimées',categorie:'Pilotable',compte:'',montantSigne:montant,certitude:'estime',preuve:'Allocation Cerbère restante, proratisée dans le temps',allocationRestante:arrondiTresorerie_(restant),fractionTemps:arrondiTresorerie_(fraction),joker:!!(p.v37&&p.v37.joker&&p.v37.joker.actif)};
  }catch(e){return null;}
}

function confianceTresorerie_(now,cible,lignes){
  const jours=Math.max(0,(cible-now)/86400000),est=(lignes||[]).some(x=>x.certitude==='estime'),prev=(lignes||[]).some(x=>x.certitude==='prevu');
  if(jours<=3&&!est)return {niveau:'elevee',libelle:'Élevée'};
  if(jours<=10&&!prev&&!est)return {niveau:'elevee',libelle:'Élevée'};
  if(jours<=35)return {niveau:'moyenne',libelle:'Moyenne'};
  return {niveau:'indicative',libelle:'Indicative'};
}
function resumeTresorerie_(lignes){
  const r={operations_futures:0,charges_fixes:0,evenements:0,actions:0,pilotable:0,recettes:0,depenses:0};
  (lignes||[]).forEach(x=>{const m=Number(x.montantSigne||0);if(m>=0)r.recettes+=m;else r.depenses+=Math.abs(m);if(x.source==='operation_future')r.operations_futures+=m;else if(x.source==='charge_fixe')r.charges_fixes+=m;else if(x.source==='evenement')r.evenements+=m;else if(x.source==='action')r.actions+=m;else if(x.source==='pilotable')r.pilotable+=m;});
  Object.keys(r).forEach(k=>r[k]=arrondiTresorerie_(r[k]));return r;
}
