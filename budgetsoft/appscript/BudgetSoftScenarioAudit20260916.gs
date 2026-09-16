const BUDGETSOFT_SCENARIO_AUDIT_20260916_VERSION='2026-09-16.1';
const BUDGETSOFT_SCENARIO_AUDIT_20260916_PREFIX='BUDGETSOFT_SCENARIO_AUDIT_20260916_';

function arrScenarioBudgetSoft20260916_(n){return Math.round((Number(n)||0)*100)/100;}
function cloneScenarioBudgetSoft20260916_(v){return JSON.parse(JSON.stringify(v==null?null:v));}
function jourScenarioBudgetSoft20260916_(v){
  if(!v)return '';
  const d=v instanceof Date?new Date(v):new Date(v);
  if(isNaN(d))return '';
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function digestScenarioBudgetSoft20260916_(v){
  const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v||''),Utilities.Charset.UTF_8);
  return bytes.map(b=>('0'+((b<0?b+256:b).toString(16))).slice(-2)).join('');
}
function lireSansEchecScenarioBudgetSoft20260916_(nom,fn){
  try{return{ok:true,valeur:fn()};}catch(e){return{ok:false,erreur:String(e&&e.message||e),source:nom};}
}
function actifScenarioBudgetSoft20260916_(v){return v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0';}

function resumeOperationsScenarioBudgetSoft20260916_(){
  const source=lireTable_('Operations')||[];
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(source):source;
  const aujourdHui=jourScenarioBudgetSoft20260916_(new Date());
  let passees=0,futures=0,sansCategorie=0,totalSigne=0,totalPasse=0,totalFutur=0;
  const financier=[],complet=[];
  operations.forEach(o=>{
    const id=String(o&&o.id||'');
    const jour=jourScenarioBudgetSoft20260916_(o&&(o.date_comptable||o.date||o.date_operation));
    const montant=arrScenarioBudgetSoft20260916_(Number(o&&o.montant||0));
    const type=String(o&&o.type||'');
    const compte=String(o&&o.compte||'');
    const categorie=String(o&&o.categorie||'');
    if(!categorie.trim())sansCategorie++;
    totalSigne+=montant;
    if(jour&&jour>aujourdHui){futures++;totalFutur+=montant;}else{passees++;totalPasse+=montant;}
    financier.push([id,jour,montant,type,compte].join('|'));
    complet.push([id,jour,montant,type,compte,categorie].join('|'));
  });
  financier.sort();complet.sort();
  return{
    nombreSource:source.length,nombreCanonique:operations.length,doublonsExclus:Math.max(0,source.length-operations.length),
    passees,futures,sansCategorie,totalSigne:arrScenarioBudgetSoft20260916_(totalSigne),
    totalPasse:arrScenarioBudgetSoft20260916_(totalPasse),totalFutur:arrScenarioBudgetSoft20260916_(totalFutur),
    empreinteFinanciere:digestScenarioBudgetSoft20260916_(financier.join('\n')),
    empreinteComplete:digestScenarioBudgetSoft20260916_(complet.join('\n'))
  };
}

function resumeComptesScenarioBudgetSoft20260916_(){
  const r=chargerSyntheseComptes20260828();
  const comptes=(r&&r.comptes||[]).map(c=>({id:String(c.id||''),nom:String(c.nom||''),actif:actifScenarioBudgetSoft20260916_(c.actif),soldeReel:arrScenarioBudgetSoft20260916_(c.soldeReel),dateSolde:String(c.dateSolde||''),sourceSolde:String(c.sourceSolde||'')}));
  comptes.sort((a,b)=>a.id.localeCompare(b.id));
  return{ok:r&&r.ok===true,version:r&&r.version||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',dateReferenceReel:r&&r.dateReferenceReel||'',synthese:cloneScenarioBudgetSoft20260916_(r&&r.synthese||{}),comptes,empreinte:digestScenarioBudgetSoft20260916_(JSON.stringify(comptes)),avertissements:cloneScenarioBudgetSoft20260916_(r&&r.avertissements||[])};
}

function resumeTresorerieScenarioBudgetSoft20260916_(){
  const r=chargerTresoreriePrevisionnelle20260830(dateDansJoursTresorerie_(45));
  const lignes=Array.isArray(r&&r.lignes)?r.lignes:[];
  const parSource={};
  lignes.forEach(x=>{const k=String(x&&x.source||'inconnu');parSource[k]=(parSource[k]||0)+1;});
  return{ok:r&&r.ok===true,version:r&&r.version||'',dateReference:r&&r.dateReference||'',dateCible:r&&r.dateCible||'',soldeReel:arrScenarioBudgetSoft20260916_(r&&r.soldeReel),variationPrevue:arrScenarioBudgetSoft20260916_(r&&r.variationPrevue),soldePrevisionnel:arrScenarioBudgetSoft20260916_(r&&r.soldePrevisionnel),fourchette:cloneScenarioBudgetSoft20260916_(r&&r.fourchette||{}),confiance:cloneScenarioBudgetSoft20260916_(r&&r.confiance||{}),resume:cloneScenarioBudgetSoft20260916_(r&&r.resume||{}),nombreLignes:lignes.length,parSource};
}

function resumeCerbereScenarioBudgetSoft20260916_(){
  const r=chargerCerbereCockpit20260902();
  const periodes=Array.isArray(r&&r.periodes)?r.periodes:[];
  const compact=periodes.map((p,i)=>{
    const v=p&&p.v37||{},c=v&&v.cockpit20260902||{};
    const enveloppes=Array.isArray(p&&p.enveloppes)?p.enveloppes:[];
    return{index:i+1,cle:String(p&&p.clePilotage||''),etat:String(p&&p.etat||''),budgetDisponible:arrScenarioBudgetSoft20260916_(p&&p.budgetDisponible),budgetReparti:arrScenarioBudgetSoft20260916_(p&&p.budgetReparti),resteBudgetPilotable:arrScenarioBudgetSoft20260916_(p&&p.resteBudgetPilotable),p1Total:arrScenarioBudgetSoft20260916_(c.p1Total),budgetPilotableActualise:arrScenarioBudgetSoft20260916_(c.budgetPilotableActualise),consommePilotable:arrScenarioBudgetSoft20260916_(c.consommePilotable),aRepartirDansPostes:arrScenarioBudgetSoft20260916_(c.aRepartirDansPostes),reportCbCycle:arrScenarioBudgetSoft20260916_(c.reportCbCycle),molettes:enveloppes.map(x=>({categorie:String(x&&x.categorie||''),prevu:arrScenarioBudgetSoft20260916_(x&&x.prevu),reel:arrScenarioBudgetSoft20260916_(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:x&&x.reelImpute),planifie:arrScenarioBudgetSoft20260916_(x&&x.planifie)}))};
  });
  return{ok:r&&r.ok!==false,version:r&&r.version||'',cockpitVersion:r&&r.cockpit20260902&&r.cockpit20260902.version||'',appreciation:r&&r.cockpit20260902&&r.cockpit20260902.appreciation||'',periodes:compact,empreinte:digestScenarioBudgetSoft20260916_(JSON.stringify(compact))};
}

function resumeCreditsPatrimoineScenarioBudgetSoft20260916_(){
  const r=chargerCreditsPatrimoineIntegres20260915();
  const c=r&&r.coherence||{};
  return{ok:r&&r.ok===true,version:r&&r.version||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',sourceBudgetSoft:r&&r.sourceBudgetSoft||'',endettementTotal:arrScenarioBudgetSoft20260916_(c.endettementTotal),totalDettesPatrimoine:arrScenarioBudgetSoft20260916_(c.totalDettesPatrimoine),patrimoineTotal:arrScenarioBudgetSoft20260916_(c.patrimoineTotal),patrimoineNet:arrScenarioBudgetSoft20260916_(c.patrimoineNet),ecartDette:arrScenarioBudgetSoft20260916_(c.ecartDette),ecartNet:arrScenarioBudgetSoft20260916_(c.ecartNet)};
}

function capturerEtatControleBudgetSoft20260916(etape){
  etape=String(etape||'MANUEL').trim().toUpperCase();
  const operations=lireSansEchecScenarioBudgetSoft20260916_('operations',resumeOperationsScenarioBudgetSoft20260916_);
  const comptes=lireSansEchecScenarioBudgetSoft20260916_('comptes',resumeComptesScenarioBudgetSoft20260916_);
  const tresorerie=lireSansEchecScenarioBudgetSoft20260916_('tresorerie',resumeTresorerieScenarioBudgetSoft20260916_);
  const cerbere=lireSansEchecScenarioBudgetSoft20260916_('cerbere',resumeCerbereScenarioBudgetSoft20260916_);
  const creditsPatrimoine=lireSansEchecScenarioBudgetSoft20260916_('credits_patrimoine',resumeCreditsPatrimoineScenarioBudgetSoft20260916_);
  const modules={operations:operations.ok?operations.valeur:{ok:false,erreur:operations.erreur},comptes:comptes.ok?comptes.valeur:{ok:false,erreur:comptes.erreur},tresorerie:tresorerie.ok?tresorerie.valeur:{ok:false,erreur:tresorerie.erreur},cerbere:cerbere.ok?cerbere.valeur:{ok:false,erreur:cerbere.erreur},creditsPatrimoine:creditsPatrimoine.ok?creditsPatrimoine.valeur:{ok:false,erreur:creditsPatrimoine.erreur}};
  const out={ok:[operations,comptes,tresorerie,cerbere,creditsPatrimoine].every(x=>x.ok),version:BUDGETSOFT_SCENARIO_AUDIT_20260916_VERSION,etape,date:new Date().toISOString(),modules};
  PropertiesService.getDocumentProperties().setProperty(BUDGETSOFT_SCENARIO_AUDIT_20260916_PREFIX+etape,JSON.stringify(out));
  console.log('[SCENARIO BUDGETSOFT '+etape+'] '+JSON.stringify(out));
  return out;
}

function lireEtatControleBudgetSoft20260916_(etape){
  const raw=PropertiesService.getDocumentProperties().getProperty(BUDGETSOFT_SCENARIO_AUDIT_20260916_PREFIX+String(etape||'').toUpperCase());
  return raw?JSON.parse(raw):null;
}
function memeNombreScenarioBudgetSoft20260916_(a,b,tol){return Math.abs(Number(a||0)-Number(b||0))<=Number(tol==null?.01:tol);}
function controleScenarioBudgetSoft20260916_(code,ok,detail){return{code,ok:!!ok,detail:detail||''};}

function comparerEtatsControleBudgetSoft20260916(etapeAvant,etapeApres,typeTransition){
  const avant=lireEtatControleBudgetSoft20260916_(etapeAvant),apres=lireEtatControleBudgetSoft20260916_(etapeApres);
  if(!avant||!apres)throw new Error('Étape manquante : '+(!avant?etapeAvant:etapeApres));
  const a=avant.modules||{},b=apres.modules||{},ao=a.operations||{},bo=b.operations||{},ac=a.comptes||{},bc=b.comptes||{},at=a.tresorerie||{},bt=b.tresorerie||{},ad=a.creditsPatrimoine||{},bd=b.creditsPatrimoine||{};
  const controles=[];
  controles.push(controleScenarioBudgetSoft20260916_('PAS_DE_DOUBLON_CANONIQUE_SUPPLEMENTAIRE',Number(bo.doublonsExclus||0)<=Number(ao.doublonsExclus||0),'doublons '+Number(ao.doublonsExclus||0)+' → '+Number(bo.doublonsExclus||0)));
  controles.push(controleScenarioBudgetSoft20260916_('COHERENCE_CREDITS_PATRIMOINE',Math.abs(Number(bd.ecartDette||0))<=.01&&Math.abs(Number(bd.ecartNet||0))<=.01,'écart dette '+bd.ecartDette+' ; écart net '+bd.ecartNet));
  const type=String(typeTransition||'').toUpperCase();
  if(type==='IMPORT_PASSE'){
    controles.push(controleScenarioBudgetSoft20260916_('IMPORT_PASSE_AJOUTE_OPERATION',Number(bo.nombreCanonique||0)>=Number(ao.nombreCanonique||0),'opérations '+ao.nombreCanonique+' → '+bo.nombreCanonique));
    controles.push(controleScenarioBudgetSoft20260916_('IMPORT_PASSE_N_AJOUTE_PAS_D_OPERATION_FUTURE',Number(bo.futures||0)===Number(ao.futures||0),'futures '+ao.futures+' → '+bo.futures));
  }
  if(type==='IMPORT_FUTUR'){
    controles.push(controleScenarioBudgetSoft20260916_('IMPORT_FUTUR_AJOUTE_FUTUR',Number(bo.futures||0)>=Number(ao.futures||0),'futures '+ao.futures+' → '+bo.futures));
    controles.push(controleScenarioBudgetSoft20260916_('IMPORT_FUTUR_NE_BOUGE_PAS_COMPTES_REELS',String(ac.empreinte||'')===String(bc.empreinte||''),'empreinte comptes '+String(ac.empreinte||'').slice(0,10)+' → '+String(bc.empreinte||'').slice(0,10)));
    controles.push(controleScenarioBudgetSoft20260916_('IMPORT_FUTUR_VISIBLE_PREVISIONNEL',Number(bt.nombreLignes||0)>=Number(at.nombreLignes||0),'lignes prévisionnelles '+at.nombreLignes+' → '+bt.nombreLignes));
  }
  if(type==='CATEGORISATION'){
    controles.push(controleScenarioBudgetSoft20260916_('CATEGORISATION_NE_CHANGE_PAS_FLUX_FINANCIERS',String(ao.empreinteFinanciere||'')===String(bo.empreinteFinanciere||''),'empreinte financière stable'));
    controles.push(controleScenarioBudgetSoft20260916_('CATEGORISATION_NE_CHANGE_PAS_COMPTES',String(ac.empreinte||'')===String(bc.empreinte||''),'soldes réels stables'));
    controles.push(controleScenarioBudgetSoft20260916_('CATEGORISATION_NE_CHANGE_PAS_PREVISION_TOTALE',memeNombreScenarioBudgetSoft20260916_(at.soldePrevisionnel,bt.soldePrevisionnel,.01),'prévision '+at.soldePrevisionnel+' → '+bt.soldePrevisionnel));
    controles.push(controleScenarioBudgetSoft20260916_('CATEGORISATION_REDUIT_OU_STABILISE_SANS_CATEGORIE',Number(bo.sansCategorie||0)<=Number(ao.sansCategorie||0),'sans catégorie '+ao.sansCategorie+' → '+bo.sansCategorie));
  }
  if(type==='CERBERE_MOLETTES'){
    controles.push(controleScenarioBudgetSoft20260916_('MOLETTES_NE_CHANGE_PAS_OPERATIONS',String(ao.empreinteComplete||'')===String(bo.empreinteComplete||''),'opérations inchangées'));
    controles.push(controleScenarioBudgetSoft20260916_('MOLETTES_NE_CHANGE_PAS_COMPTES',String(ac.empreinte||'')===String(bc.empreinte||''),'comptes inchangés'));
    controles.push(controleScenarioBudgetSoft20260916_('MOLETTES_NE_CHANGE_PAS_ENDETTEMENT',memeNombreScenarioBudgetSoft20260916_(ad.endettementTotal,bd.endettementTotal,.01),'endettement '+ad.endettementTotal+' → '+bd.endettementTotal));
    controles.push(controleScenarioBudgetSoft20260916_('MOLETTES_NE_CHANGE_PAS_TRESORERIE_REELLE',memeNombreScenarioBudgetSoft20260916_(at.soldeReel,bt.soldeReel,.01),'solde réel '+at.soldeReel+' → '+bt.soldeReel));
    controles.push(controleScenarioBudgetSoft20260916_('MOLETTES_MODIFIENT_OU_CONFIRMENT_CERBERE',!!(a.cerbere&&b.cerbere),'empreinte Cerbère '+String(a.cerbere&&a.cerbere.empreinte||'').slice(0,10)+' → '+String(b.cerbere&&b.cerbere.empreinte||'').slice(0,10)));
  }
  const deltas={operations:{nombre:Number(bo.nombreCanonique||0)-Number(ao.nombreCanonique||0),passees:Number(bo.passees||0)-Number(ao.passees||0),futures:Number(bo.futures||0)-Number(ao.futures||0),sansCategorie:Number(bo.sansCategorie||0)-Number(ao.sansCategorie||0),totalSigne:arrScenarioBudgetSoft20260916_(Number(bo.totalSigne||0)-Number(ao.totalSigne||0))},comptes:{disponible:arrScenarioBudgetSoft20260916_(Number(bc.synthese&&bc.synthese.disponible||0)-Number(ac.synthese&&ac.synthese.disponible||0)),epargne:arrScenarioBudgetSoft20260916_(Number(bc.synthese&&bc.synthese.epargne||0)-Number(ac.synthese&&ac.synthese.epargne||0))},tresorerie:{soldeReel:arrScenarioBudgetSoft20260916_(Number(bt.soldeReel||0)-Number(at.soldeReel||0)),variationPrevue:arrScenarioBudgetSoft20260916_(Number(bt.variationPrevue||0)-Number(at.variationPrevue||0)),soldePrevisionnel:arrScenarioBudgetSoft20260916_(Number(bt.soldePrevisionnel||0)-Number(at.soldePrevisionnel||0))},creditsPatrimoine:{endettementTotal:arrScenarioBudgetSoft20260916_(Number(bd.endettementTotal||0)-Number(ad.endettementTotal||0)),patrimoineNet:arrScenarioBudgetSoft20260916_(Number(bd.patrimoineNet||0)-Number(ad.patrimoineNet||0))}};
  const out={ok:controles.every(x=>x.ok),version:BUDGETSOFT_SCENARIO_AUDIT_20260916_VERSION,transition:type,avant:String(etapeAvant),apres:String(etapeApres),controles,deltas};
  console.log('[COMPARAISON SCENARIO '+etapeAvant+' → '+etapeApres+'] '+JSON.stringify(out));
  return out;
}

function auditerInvariantsScenarioBudgetSoft20260916(etape){
  const e=lireEtatControleBudgetSoft20260916_(etape)||capturerEtatControleBudgetSoft20260916(etape||'MANUEL');
  const m=e.modules||{},c=m.comptes||{},t=m.tresorerie||{},cp=m.creditsPatrimoine||{};
  const controles=[
    controleScenarioBudgetSoft20260916_('MODULES_DISPONIBLES',e.ok===true,'capture complète'),
    controleScenarioBudgetSoft20260916_('COMPTES_VS_TRESORERIE_REELLE',memeNombreScenarioBudgetSoft20260916_(c.synthese&&c.synthese.disponible,t.soldeReel,.01),'Comptes disponible '+(c.synthese&&c.synthese.disponible)+' ; trésorerie réelle '+t.soldeReel),
    controleScenarioBudgetSoft20260916_('CREDITS_VS_PATRIMOINE',Math.abs(Number(cp.ecartDette||0))<=.01,'écart dette '+cp.ecartDette),
    controleScenarioBudgetSoft20260916_('PATRIMOINE_NET',Math.abs(Number(cp.ecartNet||0))<=.01,'écart net '+cp.ecartNet)
  ];
  const out={ok:controles.every(x=>x.ok),version:BUDGETSOFT_SCENARIO_AUDIT_20260916_VERSION,etape:e.etape,controles};
  console.log('[INVARIANTS SCENARIO '+e.etape+'] '+JSON.stringify(out));return out;
}

function capturerT0AvantImportBudgetSoft20260916(){return capturerEtatControleBudgetSoft20260916('T0');}
function capturerT1ApresImportPasseBudgetSoft20260916(){const e=capturerEtatControleBudgetSoft20260916('T1');const comparaison=comparerEtatsControleBudgetSoft20260916('T0','T1','IMPORT_PASSE');return{capture:e,comparaison};}
function capturerT2ApresImportFuturBudgetSoft20260916(){const e=capturerEtatControleBudgetSoft20260916('T2');const comparaison=comparerEtatsControleBudgetSoft20260916('T1','T2','IMPORT_FUTUR');return{capture:e,comparaison};}
function capturerT3ApresCategorisationBudgetSoft20260916(){const e=capturerEtatControleBudgetSoft20260916('T3');const comparaison=comparerEtatsControleBudgetSoft20260916('T2','T3','CATEGORISATION');return{capture:e,comparaison};}
function capturerT4ApresCerbereBudgetSoft20260916(){const e=capturerEtatControleBudgetSoft20260916('T4');const comparaison=comparerEtatsControleBudgetSoft20260916('T3','T4','CERBERE_MOLETTES');return{capture:e,comparaison};}
function auditerScenarioBudgetSoft20260916(){
  const transitions=[['T0','T1','IMPORT_PASSE'],['T1','T2','IMPORT_FUTUR'],['T2','T3','CATEGORISATION'],['T3','T4','CERBERE_MOLETTES']],resultats=[];
  transitions.forEach(x=>{if(lireEtatControleBudgetSoft20260916_(x[0])&&lireEtatControleBudgetSoft20260916_(x[1]))resultats.push(comparerEtatsControleBudgetSoft20260916(x[0],x[1],x[2]));});
  const dernier=['T4','T3','T2','T1','T0'].find(x=>lireEtatControleBudgetSoft20260916_(x));
  const invariants=dernier?auditerInvariantsScenarioBudgetSoft20260916(dernier):null;
  const out={ok:resultats.every(x=>x.ok)&&(!invariants||invariants.ok),version:BUDGETSOFT_SCENARIO_AUDIT_20260916_VERSION,transitions:resultats,invariants};
  console.log('[AUDIT SCENARIO BUDGETSOFT COMPLET] '+JSON.stringify(out));return out;
}
function reinitialiserScenarioBudgetSoft20260916(){
  const p=PropertiesService.getDocumentProperties();['T0','T1','T2','T3','T4','MANUEL'].forEach(x=>p.deleteProperty(BUDGETSOFT_SCENARIO_AUDIT_20260916_PREFIX+x));
  const out={ok:true,version:BUDGETSOFT_SCENARIO_AUDIT_20260916_VERSION,reinitialise:true};console.log('[SCENARIO BUDGETSOFT RESET] '+JSON.stringify(out));return out;
}
