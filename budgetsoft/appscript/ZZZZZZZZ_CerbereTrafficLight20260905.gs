/*
 * Cerbère / Cerbère Express — doctrine feu tricolore 2026-09-05.
 * Vert : consommation <= avancement du cycle.
 * Orange : consommation > avancement du cycle, sans dépassement de l'allocation.
 * Rouge : allocation dépassée.
 * L'appréciation générale devient factuelle et dérivée des mêmes règles.
 */
const CERBERE_TRAFFIC_LIGHT_VERSION='2026-09-05.3';

function vigilanceExpress_(partConsommee,partTemps,reste,allocation,jour){
  const pc=Math.max(0,Number(partConsommee||0));
  const pt=Math.max(0,Math.min(1,Number(partTemps||0)));
  const alloc=Math.max(0,Number(allocation||0));
  const ecart=(pc-pt)*100;
  let niveau='vert',libelle='Rythme conforme';
  if(Number(reste||0)<-.009||pc>1.0001||(alloc<=0&&pc>0)){
    niveau='rouge';libelle='Enveloppe dépassée';
  }else if(pc>pt+.0001){
    niveau='orange';libelle='Avance sur le rythme du cycle';
  }else if(alloc<=0&&pc<=0){
    libelle='Aucune dépense';
  }
  return {niveau,libelle,ecartRythmePoints:arrExpress_(ecart),partTempsPct:arrExpress_(pt*100),message:messageVigilanceExpress_(niveau,libelle,pc,pt,reste)};
}

function appreciationCockpitCerbere20260902_(base){
  const p=base&&Array.isArray(base.periodes)?base.periodes[0]:null;
  const env=p&&Array.isArray(p.enveloppes)?p.enveloppes:[];
  const per=p&&p.periode||{};
  const debut=per.debut?new Date(per.debut):null,fin=per.fin?new Date(per.fin):null,maintenant=new Date();
  let progression=0;
  if(debut&&!isNaN(debut)&&fin&&!isNaN(fin)){
    const a=Date.UTC(debut.getFullYear(),debut.getMonth(),debut.getDate());
    const z=Date.UTC(fin.getFullYear(),fin.getMonth(),fin.getDate());
    const n=Date.UTC(maintenant.getFullYear(),maintenant.getMonth(),maintenant.getDate());
    const jours=Math.max(1,Math.round((z-a)/86400000)+1);
    const jour=Math.max(1,Math.min(jours,Math.floor((n-a)/86400000)+1));
    progression=jour/jours;
  }
  let rouges=0,oranges=0,plusRapide='';let ecartMax=-Infinity;
  env.forEach(x=>{
    const allocation=Math.max(0,Number(x&&x.prevu||0));
    const consomme=Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0)));
    const part=allocation>0?consomme/allocation:(consomme>0?Infinity:0);
    if(part>1.0001){rouges++;return;}
    const ecart=part-progression;
    if(ecart>.0001){oranges++;if(ecart>ecartMax){ecartMax=ecart;plusRapide=String(x&&x.categorie||'');}}
  });
  if(rouges>0)return{niveau:'rouge',emoji:'🔴',titre:'Enveloppe dépassée',resume:rouges+' poste'+(rouges>1?'s ont':' a')+' dépassé l’allocation prévue.',consigne:'Réduire ou réallouer le budget sur les postes dépassés.'};
  if(oranges>0)return{niveau:'orange',emoji:'🟠',titre:'Rythme supérieur au cycle',resume:oranges+' poste'+(oranges>1?'s sont':' est')+' consommé'+(oranges>1?'s':'')+' plus vite que l’avancement du cycle.',consigne:plusRapide?plusRapide+' est le poste le plus en avance sur son rythme.':'Surveiller les postes en avance sur le rythme du cycle.'};
  return{niveau:'vert',emoji:'🟢',titre:'Rythme conforme',resume:'Aucun poste ne dépasse son allocation ni l’avancement du cycle.',consigne:'Le pilotable suit le rythme prévu du cycle.'};
}

/* La révision du snapshot dépend aussi du code Express ET de la doctrine CB :
 * les vues publique et Apps Script doivent donc se recalculer ensemble. */
function empreinteSourcesCerbereExpress20260827_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(),fichier=DriveApp.getFileById(ss.getId()),modifieLe=fichier.getLastUpdated().getTime(),props=PropertiesService.getDocumentProperties().getProperties(),utiles={};
  Object.keys(props).sort().forEach(k=>{if(String(k).indexOf(CERBERE_EXPRESS_SNAPSHOT_PREFIX)===0)return;utiles[k]=props[k];});
  const jour=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const code=[
    CERBERE_TRAFFIC_LIGHT_VERSION,
    typeof CERBERE_EXPRESS_VIEW_VERSION==='undefined'?'':CERBERE_EXPRESS_VIEW_VERSION,
    typeof CERBERE_EXPRESS_VERSION==='undefined'?'':CERBERE_EXPRESS_VERSION,
    typeof CERBERE_CB_DOUBLE_ROLE_VERSION==='undefined'?'':CERBERE_CB_DOUBLE_ROLE_VERSION,
    typeof CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION==='undefined'?'':CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION
  ].join('|');
  const brut=[CERBERE_EXPRESS_SNAPSHOT_VERSION,String(modifieLe),jour,code,JSON.stringify(utiles)].join('|');
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,brut,Utilities.Charset.UTF_8);
  return digest.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}

/**
 * A/B strict du candidat « V33 alimenté par données déjà préchargées ».
 * Aucun chemin de production n'est modifié : les lecteurs sont substitués uniquement
 * pendant le passage candidat, puis restaurés en finally.
 */
function auditerCandidatCerbereV33DonneesPrechargeesBudgetSoft20260911(){
  const tGlobal=Date.now();
  const t0=Date.now();
  const baseline=avecContexteLectureBudgetSoft20260827_('audit-ab-v33-baseline-20260911',function(){return chargerCerbereV33();});
  const baselineMs=Date.now()-t0;
  const statsBaseline=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;

  const tPre=Date.now();
  const precharge=avecContexteLectureBudgetSoft20260827_('audit-ab-v33-precharge-20260911',function(){
    return {
      operations:lireTable_('Operations'),
      charges:lireTable_('Charges_fixes'),
      comptes:lireTable_('Comptes'),
      parametres:lireTable_('Parametres'),
      objectifs:lireTablePlanCerbere_('Plan_Objectifs'),
      actions:lireFeuilleDynamiqueCerbereV3_('Plan_Actions'),
      evenements:lireTablePlanCerbere_('Plan_Evenements'),
      ajustements:lireAjustementsCerbereV33_()
    };
  });
  const prechargeMs=Date.now()-tPre;
  const statsPrecharge=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;

  const originaux={
    lireTable:lireTable_,
    lirePlanTable:lireTablePlanCerbere_,
    lirePlanDyn:lireFeuilleDynamiqueCerbereV3_,
    lireAjustements:lireAjustementsCerbereV33_
  };
  let candidat=null,erreur=null,candidatMs=0,statsCandidat=null;
  try{
    lireTable_=function(nom){
      const n=String(nom||'');
      if(n==='Operations')return precharge.operations;
      if(n==='Charges_fixes')return precharge.charges;
      if(n==='Comptes')return precharge.comptes;
      if(n==='Parametres')return precharge.parametres;
      return originaux.lireTable.apply(this,arguments);
    };
    lireTablePlanCerbere_=function(nom){
      const n=String(nom||'');
      if(n==='Plan_Objectifs')return precharge.objectifs;
      if(n==='Plan_Evenements')return precharge.evenements;
      return originaux.lirePlanTable.apply(this,arguments);
    };
    lireFeuilleDynamiqueCerbereV3_=function(nom){
      if(String(nom||'')==='Plan_Actions')return precharge.actions;
      return originaux.lirePlanDyn.apply(this,arguments);
    };
    lireAjustementsCerbereV33_=function(){return precharge.ajustements;};
    const t1=Date.now();
    candidat=avecContexteLectureBudgetSoft20260827_('audit-ab-v33-candidat-precharge-20260911',function(){return chargerCerbereV33();});
    candidatMs=Date.now()-t1;
    statsCandidat=(typeof BUDGETSOFT_READ_CONTEXT_LAST_STATS_!=='undefined'&&BUDGETSOFT_READ_CONTEXT_LAST_STATS_)?BUDGETSOFT_READ_CONTEXT_LAST_STATS_:null;
  }catch(e){
    erreur=String(e&&e.stack||e&&e.message||e);
  }finally{
    lireTable_=originaux.lireTable;
    lireTablePlanCerbere_=originaux.lirePlanTable;
    lireFeuilleDynamiqueCerbereV3_=originaux.lirePlanDyn;
    lireAjustementsCerbereV33_=originaux.lireAjustements;
  }

  const normaliser=typeof normaliserObjetProfilCerbere20260911_==='function'?normaliserObjetProfilCerbere20260911_:function(v){return v;};
  const differ=typeof premieresDifferencesProfilCerbere20260911_==='function'?premieresDifferencesProfilCerbere20260911_:function(){return[];};
  const a=normaliser(baseline,''),b=normaliser(candidat,'');
  const identique=!erreur&&JSON.stringify(a)===JSON.stringify(b);
  const diffs=identique?[]:differ(a,b,20);
  const gainMs=baselineMs-candidatMs;
  const gainPct=baselineMs?Math.round(gainMs/baselineMs*1000)/10:null;
  const out={
    ok:identique&&!!(candidat&&candidat.ok!==false),
    version:'2026-09-11.7',lectureSeule:true,aucuneModification:true,
    perimetre:{
      compare:'chargerCerbereV33() autonome vs le même V33 recevant Operations, Charges_fixes, Comptes, Parametres et Plan déjà préchargés',
      reference:'exécution courante, même classeur, même instant métier',
      sourceVerite:'chargerCerbereV33 / CerbereV33.gs',
      cibleIntegration:'chemin snapshot uniquement ; chargeur autonome inchangé'
    },
    comparaison:{identiqueMetierStable:identique,differences:diffs,versionBaseline:String(baseline&&baseline.version||''),versionCandidat:String(candidat&&candidat.version||'')},
    temps:{baselineMs:baselineMs,prechargeMs:prechargeMs,candidatAvecDonneesDisponiblesMs:candidatMs,candidatTotalSiPrechargeDedieeMs:prechargeMs+candidatMs,gainMoteurMs:gainMs,gainMoteurPct:gainPct,dureeTotaleMs:Date.now()-tGlobal},
    precharge:{operations:(precharge.operations||[]).length,charges:(precharge.charges||[]).length,comptes:(precharge.comptes||[]).length,parametres:(precharge.parametres||[]).length,objectifs:(precharge.objectifs||[]).length,actions:(precharge.actions||[]).length,evenements:(precharge.evenements||[]).length},
    timingsV33:{baseline:baseline&&baseline.diagnostic&&baseline.diagnostic.timings||null,candidat:candidat&&candidat.diagnostic&&candidat.diagnostic.timings||null},
    lectures:{baseline:statsBaseline,precharge:statsPrecharge,candidat:statsCandidat},
    erreur:erreur,
    decision:identique?'CANDIDAT_V33_PRECHARGE_VALIDE_METIER_A_EVALUER_PERF':'CANDIDAT_V33_PRECHARGE_REFUSE_DIVERGENCE',
    doctrine:'A/B uniquement. Ne rien intégrer en production avant identité métier stricte, gain confirmé et passage des gardes du snapshot.'
  };
  console.log('[AUDIT A/B V33 données préchargées] '+JSON.stringify(out));
  return out;
}
