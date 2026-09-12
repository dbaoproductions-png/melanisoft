/*
 * Entrée publique autoritaire Cerbère C1/C2.
 *
 * Doctrine 2026-09-12 :
 * - P1 naît d'une photographie comptable du cycle :
 *   SS1 + Rt1 - CFt1 - HEt1 - CB héritées de M-1 non déjà provisionnées.
 * - les écarts de recettes / charges non pilotables modifient la capacité et
 *   alimentent le surplus/déficit à ventiler ;
 * - les dépenses pilotables consomment P1 à la date de l'acte économique,
 *   indépendamment de leur date bancaire ;
 * - une CB héritée déjà reconnue comme charge fixe est exclue du terme
 *   "CB héritées" puisqu'elle remplace déjà l'occurrence CFt1 correspondante.
 *
 * Le double rôle CB reste donc :
 * 1) achat en C1 => consommation quotidienne de P1(C1), par date d'achat ;
 * 2) débit bancaire en C2 => contrainte comptable de construction de P1(C2),
 *    sans seconde consommation par catégorie.
 */
const CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION='2026-09-12.p1-doctrine-2';

function chargerCerbereCockpit20260902(){
  try{
    if(typeof chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906==='function'){
      const snapshot=chargerCerbereDepuisSnapshotGlobalBudgetSoft20260906();
      if(snapshot&&snapshot.ok!==false&&snapshot.source==='snapshot_global'){
        snapshot.sourceBudgetSoft='snapshot_global';
        snapshot.versionSnapshotFirst=CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION;
        return snapshot;
      }
    }
  }catch(e){}

  const executer=function(){
    const t0=Date.now(),base=chargerCerbereCockpitBaseRapide20260903_();if(!base||base.ok===false)return base;
    const post=base.diagnostic&&base.diagnostic.performancePost35||{couches:[]},timings=Array.isArray(post.couches)?post.couches:[];
    chronometrerCoucheCerbere20260904_(timings,'Suspensions Actions/Événements',()=>corrigerSuspensionsActionsEvenements20260903_(base));
    chronometrerCoucheCerbere20260904_(timings,'Réel pilotable date achat',()=>corrigerReelPilotableDateAchat20260902_(base));
    const periodes=Array.isArray(base.periodes)?base.periodes:[];
    chronometrerCoucheCerbere20260904_(timings,'Enrichissement cockpit C1/C2',()=>periodes.forEach((p,i)=>enrichirCycleCockpitCerbere20260902_(p,i)));
    chronometrerCoucheCerbere20260904_(timings,'Doctrine P1 comptable / guide de vie',()=>appliquerDoctrineP1ComptableGuideVieCerbere20260912_(base));
    chronometrerCoucheCerbere20260904_(timings,'CB double rôle C1/C2',()=>appliquerReportCbCycleSuivant20260905_(base));
    let appreciation='';chronometrerCoucheCerbere20260904_(timings,'Appréciation cockpit',()=>{appreciation=appreciationCockpitCerbere20260902_(base);});
    const perf={c1c2Seulement:true,dureeMs:Date.now()-t0,couches:timings};
    base.cockpit20260902={
      version:CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION,
      appreciation:appreciation,
      performance:perf,
      doctrine:'P1 : photographie comptable SS1 + Rt1 - dépenses non pilotables - CB héritées non déjà provisionnées ; puis guide de vie consommé à la date d’engagement. Les écarts de recettes/charges alimentent le surplus ou déficit à ventiler.'
    };
    base.sourceBudgetSoft='recalcul_secours';
    base.versionSnapshotFirst=CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION;
    const ts=Date.now(),out=serialiserCerberePourClient_(base),serializationMs=Date.now()-ts;
    if(out&&out.cockpit20260902&&out.cockpit20260902.performance){out.cockpit20260902.performance.serializationMs=serializationMs;out.cockpit20260902.performance.dureeMs=Date.now()-t0;}
    return out;
  };
  return typeof avecContexteLectureBudgetSoft20260827_==='function'?avecContexteLectureBudgetSoft20260827_('cerbere-cockpit-p1-doctrine-20260912',executer):executer();
}

function jourCivilP1Cerbere20260912_(d){
  d=dateCockpit20260902_(d);
  return d?Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()):NaN;
}

function dernierJourMoisP1Cerbere20260912_(annee,mois){return new Date(annee,mois+1,0).getDate();}
function occurrenceMensuelleP1Cerbere20260912_(debut,fin,jour){
  jour=Math.max(1,Math.min(31,Math.round(Number(jour||1))));
  const candidats=[];
  for(let m=0;m<=1;m++){
    const base=new Date(debut.getFullYear(),debut.getMonth()+m,1);
    const j=Math.min(jour,dernierJourMoisP1Cerbere20260912_(base.getFullYear(),base.getMonth()));
    const d=new Date(base.getFullYear(),base.getMonth(),j);
    if(jourCivilP1Cerbere20260912_(d)>=jourCivilP1Cerbere20260912_(debut)&&jourCivilP1Cerbere20260912_(d)<=jourCivilP1Cerbere20260912_(fin))candidats.push(d);
  }
  return candidats.length?candidats[0]:null;
}
function estActifP1Cerbere20260912_(v){const s=String(v==null?'':v).trim().toLowerCase();return s==='1'||s==='true'||s==='oui'||s==='actif';}
function estRapprochementValideP1Cerbere20260912_(r){
  const s=String(r&&r.statut||r&&r.decision||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return /valide|rapproch/.test(s)&&!/a valider|propose/.test(s);
}

/**
 * Reconstruction explicable de CFt1.
 * Autorités : Charges_fixes pour la prévision ; charge_fixe_id ou rapprochement
 * explicitement validé pour le Réel. Aucun rapprochement heuristique silencieux.
 * Pour le cycle courant, toutes les charges actives sont mensuelles ; les autres
 * fréquences restent signalées et conservent la valeur moteur tant qu'elles ne
 * sont pas couvertes par une occurrence explicite.
 */
function reconstruireChargesFixesReevalueesP1Cerbere20260912_(p,v){
  const periode=p&&p.periode||p||{},debut=dateCockpit20260902_(periode.debut),fin=dateCockpit20260902_(periode.fin);
  if(!debut||!fin)return{ok:false,erreur:'bornes période invalides',total:Number(v&&v.cft1||0)};
  const charges=lireTable_('Charges_fixes')||[],ops0=lireTable_('Operations')||[];
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  const opParId={};operations.forEach(o=>{const id=String(o&&o.id||'').trim();if(id)opParId[id]=o;});
  const lienValide={};
  (rapprochements||[]).forEach(r=>{if(!estRapprochementValideP1Cerbere20260912_(r))return;const opId=String(r&&r.operation_id||'').trim(),cfId=String(r&&r.charge_fixe_id||'').trim();if(opId&&cfId)lienValide[opId]=cfId;});
  const reelsParCf={};
  operations.forEach(o=>{
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||m>=0)return;
    const d=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):dateCockpit20260902_(o&&(o.date_comptable||o.date));
    if(!d||jourCivilP1Cerbere20260912_(d)<jourCivilP1Cerbere20260912_(debut)||jourCivilP1Cerbere20260912_(d)>jourCivilP1Cerbere20260912_(fin))return;
    const opId=String(o&&o.id||'').trim();
    const cfId=String(o&&o.charge_fixe_id||'').trim()||(opId&&lienValide[opId]||'');
    if(!cfId)return;
    reelsParCf[cfId]=Number(reelsParCf[cfId]||0)+Math.abs(m);
  });

  let brut=0;const lignes=[],nonMensuelles=[];
  (charges||[]).forEach(c=>{
    if(!estActifP1Cerbere20260912_(c&&c.actif))return;
    const freq=String(c&&c.frequence||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(freq&&freq.indexOf('mens')<0){nonMensuelles.push({id:String(c&&c.id||''),libelle:String(c&&c.libelle||''),frequence:String(c&&c.frequence||''),montant:Number(c&&c.montant||0)});return;}
    const occ=occurrenceMensuelleP1Cerbere20260912_(debut,fin,c&&c.jour_execution);
    if(!occ)return;
    const dd=dateCockpit20260902_(c&&c.date_debut),df=dateCockpit20260902_(c&&c.date_fin);
    if(dd&&jourCivilP1Cerbere20260912_(dd)>jourCivilP1Cerbere20260912_(occ))return;
    if(df&&jourCivilP1Cerbere20260912_(df)<jourCivilP1Cerbere20260912_(occ))return;
    const id=String(c&&c.id||''),prevu=Math.abs(Number(c&&c.montant||0)),aReel=Object.prototype.hasOwnProperty.call(reelsParCf,id),retenu=aReel?Number(reelsParCf[id]):prevu;
    brut+=retenu;
    lignes.push({id:id,libelle:String(c&&c.libelle||''),date:Utilities.formatDate(occ,Session.getScriptTimeZone(),'yyyy-MM-dd'),prevu:arrCockpit20260902_(prevu),reel:aReel?arrCockpit20260902_(retenu):null,retenu:arrCockpit20260902_(retenu),source:aReel?'réel explicite':'prévision'});
  });
  brut=arrCockpit20260902_(brut);
  const suspension=arrCockpit20260902_(Math.max(0,Number(v&&v.correctionSuspensions20260903||0)));
  const total=arrCockpit20260902_(Math.max(0,brut-suspension));
  const ancien=arrCockpit20260902_(Number(v&&v.cft1||0));
  return{ok:nonMensuelles.length===0,total:total,brutAvantSuspensions:brut,suspensions:suspension,ancienMoteur:ancien,ecartVsAncien:arrCockpit20260902_(total-ancien),lignes:lignes,nonMensuelles:nonMensuelles,doctrine:'prévision Charges_fixes remplacée uniquement par un Réel explicitement lié/validé ; suspension retranchée une seule fois'};
}

function calculerCbHeriteesP1Cerbere20260912_(p){
  if(!p)return{montant:0,nombre:0,lignes:[],excluesCf:0};
  const periode=p.periode||p,debut=dateCockpit20260902_(periode.debut),fin=dateCockpit20260902_(periode.fin);
  if(!debut||!fin)return{montant:0,nombre:0,lignes:[],excluesCf:0,erreur:'bornes période invalides'};

  const ops0=lireTable_('Operations')||[];
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  const charges=lireTable_('Charges_fixes')||[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  const liensCf=typeof construireLiensCfCertainsV377_==='function'?construireLiensCfCertainsV377_(operations,charges,rapprochements):{};

  const debutPrecedent=new Date(debut.getFullYear(),debut.getMonth()-1,28);
  const tDebut=jourCivilP1Cerbere20260912_(debut),tFin=jourCivilP1Cerbere20260912_(fin),tPrec=jourCivilP1Cerbere20260912_(debutPrecedent);
  let total=0,excluesCf=0;
  const lignes=[];

  operations.forEach(o=>{
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||m>=0)return;
    if(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o))return;
    const estCb=typeof estAchatCbDoubleRole20260905_==='function'
      ?estAchatCbDoubleRole20260905_(o)
      :!!(String(o&&o.carte_fin||'').trim()||String(o&&o.date_achat||'').trim());
    if(!estCb)return;

    const da=typeof dateAchatCbDoubleRole20260905_==='function'?dateAchatCbDoubleRole20260905_(o):dateCockpit20260902_(o&&o.date_achat);
    const db=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):dateCockpit20260902_(o&&(o.date_comptable||o.date));
    if(!da||!db)return;
    const ta=jourCivilP1Cerbere20260912_(da),tb=jourCivilP1Cerbere20260912_(db);
    if(!(ta>=tPrec&&ta<tDebut&&tb>=tDebut&&tb<=tFin))return;

    const id=String(o&&o.id||'').trim();
    if(String(o&&o.charge_fixe_id||'').trim()||(id&&liensCf[id])){
      excluesCf+=Math.abs(m);
      return;
    }

    const a=Math.abs(m);total+=a;
    lignes.push({
      id:id,
      montant:arrCockpit20260902_(a),
      categorie:String(o&&o.categorie||''),
      dateAchat:Utilities.formatDate(da,Session.getScriptTimeZone(),'yyyy-MM-dd'),
      dateComptable:Utilities.formatDate(db,Session.getScriptTimeZone(),'yyyy-MM-dd'),
      libelle:String(o&&o.libelle||o&&o.libelle_bancaire||'')
    });
  });

  return{
    montant:arrCockpit20260902_(total),
    nombre:lignes.length,
    lignes:lignes,
    excluesCf:arrCockpit20260902_(excluesCf),
    doctrine:'achats CB du cycle précédent débités dans le cycle courant, hors occurrences CF déjà comptées dans CFt1'
  };
}

function appliquerDoctrineP1ComptableGuideVieCerbere20260912_(base){
  const ps=Array.isArray(base&&base.periodes)?base.periodes:[];
  if(!ps.length)return base;
  const p=ps[0],v=p&&p.v37||(p.v37={}),c=v.cockpit20260902||(v.cockpit20260902={}),env=Array.isArray(p&&p.enveloppes)?p.enveloppes:[];
  const arr=arrCockpit20260902_;

  const p0=arr(c.p0Total!=null?c.p0Total:env.reduce((s,x)=>s+Math.max(0,Number(x&&x.canon||0)),0));
  const allocation=arr(c.budgetRepartiMolettes!=null?c.budgetRepartiMolettes:env.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)),0));
  const consomme=arr(c.consommePilotable!=null?c.consommePilotable:env.reduce((s,x)=>s+Math.max(0,Number(x&&x.reelNetPrevisionnel||0)),0));
  const rt1=arr(Number(v.rt1||0));
  const cfReconstruite=reconstruireChargesFixesReevalueesP1Cerbere20260912_(p,v);
  const cft1=arr(cfReconstruite&&cfReconstruite.ok?cfReconstruite.total:Number(v.cft1||0));
  const het1=arr(Math.max(0,Number(v.het1!=null?v.het1:(v.horsPilotableAControler||0))));
  const ss1=arr(Number(v.ss1||0));
  const herite=calculerCbHeriteesP1Cerbere20260912_(p);

  // L'ajustement humain est conservé comme delta explicite ; les variations
  // économiques de Rt1/CFt1/HEt1, elles, modifient automatiquement la capacité.
  const ajustement=arr(Number(c.ajustementP1||0));
  const avantHeritage=arr(ss1+rt1-cft1-het1);
  const capacite=arr(Math.max(0,avantHeritage-Number(herite.montant||0)));
  const cible=arr(Math.max(0,capacite+ajustement));
  const reste=arr(cible-consomme);
  const marge=arr(cible-allocation);

  v.cft1=cft1;
  v.chargesFixesTotal=cft1;
  v.cft1Audit20260912=cfReconstruite;
  c.p0Total=p0;
  c.p1Total=cible;
  c.p1Cible=cible;
  c.ajustementP1=ajustement;
  c.budgetPilotableActualise=capacite;
  c.budgetPilotableAvantReportCb=avantHeritage;
  c.capacitePilotable=capacite;
  c.cbHeriteesCycle=arr(herite.montant);
  c.cbHeriteesNombre=herite.nombre;
  c.cbHeriteesExcluesCf=arr(herite.excluesCf);
  c.surplusVsP0=arr(cible-p0);
  c.margeARepartir=marge;
  c.aRepartirDansPostes=marge;
  c.surplusCapaciteVsAllocation=arr(capacite-allocation);
  c.consommePilotable=consomme;
  c.ret1=reste;
  c.detailActualise=Object.assign({},c.detailActualise||{}, {
    soldeAvantSalaireSS1:ss1,
    recettesReevaluees:rt1,
    chargesFixesReevaluees:cft1,
    chargesFixesAudit:cfReconstruite,
    horsPilotableEtImprevus:het1,
    cbHeriteesCycle:arr(herite.montant),
    cbHeriteesNombre:herite.nombre,
    cbHeriteesExcluesCf:arr(herite.excluesCf)
  });
  c.formuleActualisee='P1 = SS1 avant salaire + Rt1 - CFt1 explicable - HEt1 - CB héritées de M-1 non déjà provisionnées + ajustement manuel';
  c.formuleVentilation='Surplus/déficit à ventiler = P1 courant - somme des molettes ; les écarts Rt1/CFt1/HEt1 modifient la capacité, les dépenses pilotables consomment les molettes à leur date d’engagement.';
  c.datePilotable='dépense pilotable : date d’achat/engagement ; trésorerie : date bancaire ; le règlement CB technique ne recompte jamais la dépense';

  v.ret1=reste;
  v.disponibleEnveloppes=reste;
  v.capaciteAvantPilotable=capacite;
  v.cbHeriteesCycle=arr(herite.montant);
  p.resteBudgetPilotable=reste;
  p.budgetReparti=allocation;

  base.diagnostic=base.diagnostic||{};
  base.diagnostic.p1Doctrine20260912={
    version:CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION,
    periode:p&&p.periode||null,
    ss1:ss1,rt1:rt1,cft1:cft1,cft1Audit:cfReconstruite,het1:het1,
    cbHeritees:arr(herite.montant),cbHeriteesNombre:herite.nombre,cbHeriteesExcluesCf:arr(herite.excluesCf),
    capacite:capacite,ajustement:ajustement,p1:cible,p0:p0,
    consommePilotable:consomme,restePilotable:reste,
    allocations:allocation,surplusDeficitVsP0:arr(cible-p0),surplusDeficitAVentiler:marge,
    doctrine:'P1 comptable dynamique pour recettes/charges non pilotables ; CFt1 reconstruit depuis le référentiel et les liens réels explicites ; consommation pilotable quotidienne indépendante de la date bancaire.'
  };
  return base;
}

function auditerP1DoctrineComptableGuideVie20260912(){
  const c=chargerCerbereCockpit20260902(),p=c&&Array.isArray(c.periodes)?c.periodes[0]:null,v=p&&p.v37||{},k=v.cockpit20260902||{};
  const cf=v&&v.cft1Audit20260912||k&&k.detailActualise&&k.detailActualise.chargesFixesAudit||null;
  return{
    ok:!!(c&&c.ok!==false&&p&&k),
    version:CERBERE_CB_DOUBLE_ROLE_FINAL_VERSION,
    periode:p&&p.periode||null,
    decomposition:k.detailActualise||null,
    chargesFixes:{total:Number(v&&v.cft1||0),audit:cf,ecartAncien:cf&&Number(cf.ecartVsAncien||0)},
    p0:Number(k.p0Total||0),
    p1:Number(k.p1Total||0),
    consommePilotable:Number(k.consommePilotable||0),
    encoreDisponible:Number(k.ret1||0),
    surplusDeficitVsP0:Number(k.surplusVsP0||0),
    allocations:Number(k.budgetRepartiMolettes||0),
    surplusDeficitAVentiler:Number(k.margeARepartir||0),
    formule:k.formuleActualisee||'',
    diagnostic:c&&c.diagnostic&&c.diagnostic.p1Doctrine20260912||null
  };
}
