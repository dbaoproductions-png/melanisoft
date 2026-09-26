const BUDGETSOFT_IMPORT_PROPAGATION_AUDIT_20260926_VERSION='2026-09-26.2';

function normaliserAuditImport20260926_(v){
  return String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function dateAuditImport20260926_(v){
  const d=v instanceof Date?new Date(v):new Date(v||0);return isNaN(d)?null:d;
}
function jourAuditImport20260926_(v){
  const d=dateAuditImport20260926_(v);return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';
}
function arrAuditImport20260926_(n){return Math.round(Number(n||0)*100)/100;}
function refsAuditImport20260926_(obj,ids){
  const txt=JSON.stringify(obj||{}),out={};(ids||[]).forEach(id=>{let i=0,n=0,s=String(id||'');if(!s){out[s]=0;return;}while((i=txt.indexOf(s,i))>=0){n++;i+=s.length;}out[s]=n;});return out;
}

function auditerPropagationCoursTennisEpargne20260926(){
  const operations=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];
  const categories=typeof lireTable_==='function'?(lireTable_('Categories')||[]):[];
  const evenements=typeof lireFeuilleDynamiquePlan_==='function'?(lireFeuilleDynamiquePlan_('Plan_Evenements')||[]):[];

  const cheque=operations.find(o=>{
    const txt=normaliserAuditImport20260926_([o&&o.libelle,o&&o.libelle_bancaire,o&&o.commentaire].join(' '));
    return Math.abs(Number(o&&o.montant||0)+100)<.011 && (txt.includes('4483458')||jourAuditImport20260926_(o&&o.date_comptable||o&&o.date)==='2026-09-25');
  })||null;
  const epargne=operations.find(o=>{
    const txt=normaliserAuditImport20260926_([o&&o.libelle,o&&o.libelle_bancaire,o&&o.commentaire].join(' '));
    return Math.abs(Number(o&&o.montant||0)+50)<.011 && (txt.includes('zz1l93auq6')||txt.includes('hernebring herne')||jourAuditImport20260926_(o&&o.date_comptable||o&&o.date)==='2026-09-27');
  })||null;

  const catEpargne=categories.find(c=>normaliserAuditImport20260926_(c&&c.nom)==='epargne')||null;
  const chequeId=String(cheque&&cheque.id||''),epargneId=String(epargne&&epargne.id||'');

  let evTennis=null,occTennis=[],mapTennis={};
  for(const ev of evenements){
    const txt=normaliserAuditImport20260926_([ev&&ev.libelle,ev&&ev.commentaire].join(' '));
    let map={};try{map=typeof lireRapprochementsOccurrencesEvenementBudgetSoft20260922_==='function'?lireRapprochementsOccurrencesEvenementBudgetSoft20260922_(ev):JSON.parse(String(ev&&ev.rapprochements_occurrences_json||'{}'));}catch(e){map={};}
    const lie=Object.keys(map||{}).some(k=>String(map[k]&&map[k].operation_id||'')===chequeId);
    if(lie||(txt.includes('tennis')&&txt.includes('cours'))){evTennis=ev;mapTennis=map;break;}
  }
  if(evTennis){
    try{occTennis=typeof occurrencesEvenementEtatBudgetSoft20260922_==='function'?occurrencesEvenementEtatBudgetSoft20260922_(evTennis):[];}catch(e){occTennis=[];}
  }
  const occLiee=occTennis.find(o=>o&&o.rapprochement&&String(o.rapprochement.operation_id||'')===chequeId)||null;
  const restantes=occTennis.filter(o=>!o.rapprochee);

  let cer=null;try{cer=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;}catch(e){cer={ok:false,erreur:String(e&&e.message||e)};}
  const p1=cer&&Array.isArray(cer.periodes)?cer.periodes[0]:null,env=Array.isArray(p1&&p1.enveloppes)?p1.enveloppes:[];
  const envEpargne=env.find(x=>normaliserAuditImport20260926_(x&&x.categorie)==='epargne')||null;
  const envTennis=cheque?env.find(x=>String(x&&x.categorie||'')===String(cheque.categorie||''))||null:null;

  let projection=null;try{projection=typeof chargerTresorerieUnifieeBudgetSoft20260907==='function'?chargerTresorerieUnifieeBudgetSoft20260907('2026-10-27'):null;}catch(e){projection={ok:false,erreur:String(e&&e.message||e)};}
  const lignes=Array.isArray(projection&&projection.lignes)?projection.lignes:[];
  const lignesEpargne=lignes.filter(x=>String(x&&x.sourceId||'')===epargneId||String(x&&x.id||'').indexOf(epargneId)>=0);
  const lignesCheque=lignes.filter(x=>String(x&&x.sourceId||'')===chequeId||String(x&&x.id||'').indexOf(chequeId)>=0);
  const lignesEventTennis=evTennis?lignes.filter(x=>String(x&&x.source||'')==='evenement'&&String(x&&x.sourceId||'')===String(evTennis.id||'')):[];

  let analyses=null;try{analyses=typeof chargerAnalysesBudgetairesV23==='function'?chargerAnalysesBudgetairesV23(3):null;}catch(e){analyses={ok:false,erreur:String(e&&e.message||e)};}
  const series=analyses&&analyses.seriesCourbes||{},pilot=series&&series.pilotable||{},seriesPilot=Array.isArray(pilot.series)?pilot.series:[];
  const serieEpargne=seriesPilot.find(s=>normaliserAuditImport20260926_(s&&s.nom)==='epargne')||null;
  const serieTennis=cheque?seriesPilot.find(s=>String(s&&s.nom||'')===String(cheque.categorie||''))||null:null;

  let etat=null;try{etat=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;}catch(e){etat=null;}
  const modules=etat&&etat.modules||{},ids=[chequeId,epargneId].filter(Boolean);
  const refs={
    cerbere:refsAuditImport20260926_(modules.cerbere||cer,ids),
    dashboard:refsAuditImport20260926_(modules.dashboard,ids),
    analyses:refsAuditImport20260926_(modules.analyses||analyses,ids),
    projection:refsAuditImport20260926_(modules.projectionEtendue||projection,ids)
  };

  const controles={
    chequeTrouve:!!cheque,
    epargneTrouvee:!!epargne,
    epargneCategorie:!!(epargne&&String(epargne.categorie||'')==='Épargne'),
    epargneReferentiel:!!(catEpargne&&String(catEpargne.type||'').toLowerCase()==='epargne'),
    epargneTypeTresorerie:!!(epargne&&catEpargne&&String(catEpargne.type||'').toLowerCase()==='epargne'&&Number(epargne.montant||0)<0),
    tennisEvenementTrouve:!!evTennis,
    tennisOccurrenceRapprochee:!!occLiee,
    tennisPrevisionOccurrenceNeutralisee:!!evTennis&&lignesEventTennis.every(x=>Number(x&&x.occurrence||0)!==Number(occLiee&&occLiee.index||0)),
    epargneDansCerbere:!!envEpargne,
    epargneReelCerbere:!!(envEpargne&&Number(envEpargne.reelNetPrevisionnel||0)>=49.99&&Number(envEpargne.engageV37||0)>=49.99&&Math.abs(Number(envEpargne.resteV37||0))<.011),
    epargneFutureTresorerie:!!(epargne&&jourAuditImport20260926_(epargne.date_comptable||epargne.date)>jourAuditImport20260926_(new Date())?lignesEpargne.some(x=>Math.abs(Number(x&&x.montantSigne||0)+50)<.011):true),
    chequePasFutureTresorerie:lignesCheque.length===0,
    analysesEpargnePresente:!!serieEpargne,
    analysesCategorieTennisPresente:!!serieTennis,
    snapshotDisponible:!!(etat&&etat.ok!==false&&etat.revisionBudgetSoft)
  };

  const out={
    ok:Object.keys(controles).every(k=>controles[k]===true),
    version:BUDGETSOFT_IMPORT_PROPAGATION_AUDIT_20260926_VERSION,
    lectureSeule:true,
    revisionBudgetSoft:String(etat&&etat.revisionBudgetSoft||projection&&projection.revisionBudgetSoft||''),
    operations:{
      cheque:cheque?{id:chequeId,date:jourAuditImport20260926_(cheque.date_comptable||cheque.date),libelle:String(cheque.libelle_bancaire||cheque.libelle||''),montant:Number(cheque.montant||0),categorie:String(cheque.categorie||''),type:String(cheque.type||'')}:null,
      epargne:epargne?{id:epargneId,date:jourAuditImport20260926_(epargne.date_comptable||epargne.date),libelle:String(epargne.libelle_bancaire||epargne.libelle||''),montant:Number(epargne.montant||0),categorie:String(epargne.categorie||''),type:String(epargne.type||'')}:null,
      categorieEpargne:catEpargne?{nom:String(catEpargne.nom||''),type:String(catEpargne.type||''),actif:catEpargne.actif}:null
    },
    plan:evTennis?{id:String(evTennis.id||''),libelle:String(evTennis.libelle||''),categorie:String(evTennis.categorie||''),statut:String(evTennis.statut||''),rapprochementStatut:String(evTennis.rapprochement_statut||''),fractionne:evTennis.fractionne,nombreFois:Number(evTennis.nombre_fois||0),occurrenceLiee:occLiee,restantes:restantes.map(o=>({index:o.index,date:o.date,montant:o.montant}))}:null,
    cerbere:{
      version:cer&&cer.version||'',
      epargne:envEpargne?{prevu:Number(envEpargne.prevu||0),reelImpute:Number(envEpargne.reelImpute||0),reelNetPrevisionnel:Number(envEpargne.reelNetPrevisionnel||0),engageV37:Number(envEpargne.engageV37||0),resteV37:Number(envEpargne.resteV37||0)}:null,
      categorieCheque:envTennis?{categorie:String(envTennis.categorie||''),prevu:Number(envTennis.prevu||0),reelImpute:Number(envTennis.reelImpute||0),planifie:Number(envTennis.planifie||0),engageV37:Number(envTennis.engageV37||0),resteV37:Number(envTennis.resteV37||0)}:null
    },
    tresorerie:{
      soldeReel:projection&&projection.soldeReel,
      soldePrevisionnel:projection&&projection.soldePrevisionnel,
      lignesEpargne:lignesEpargne,
      lignesCheque:lignesCheque,
      lignesEvenementTennis:lignesEventTennis
    },
    analyses:{
      revisionBudgetSoft:String(analyses&&analyses.revisionBudgetSoft||''),
      epargne:serieEpargne,
      categorieCheque:serieTennis
    },
    referencesSnapshot:refs,
    controles:controles,
    doctrine:{
      tennis:'le Réel de 100 € remplace une occurrence du paiement fractionné ; seules les occurrences non rapprochées restent prévisionnelles',
      epargne:'Épargne est une catégorie Cerbère protégée : le virement réel de 50 € consomme cette enveloppe et reste un mouvement de trésorerie bancaire'
    }
  };
  console.log('[AUDIT PROPAGATION COURS TENNIS EPARGNE 20260926] '+JSON.stringify(out));
  return out;
}
