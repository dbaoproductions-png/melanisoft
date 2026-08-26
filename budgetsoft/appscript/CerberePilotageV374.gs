const CERBERE_PILOTAGE_V374_VERSION='3.7.21';

function appliquerResteReellementPilotableV374_(base){if(!base||base.ok===false)return base;recalculerCfFutursDepuisCf0CourantV375_(base);let reportPrecedent=null;const periodes=Array.isArray(base.periodes)?base.periodes:[];periodes.forEach((p,i)=>{if(!p||typeof p!=='object')return;const v=p.v37||(p.v37={}),r=p.roulant&&typeof p.roulant==='object'?p.roulant:{},h=r.horsPilotable&&typeof r.horsPilotable==='object'?r.horsPilotable:{};if(i>0&&reportPrecedent!==null){v.ss1=arrV374_(reportPrecedent);v.soldeOuverture=v.ss1;v.ss1Statut='projection provisoire héritée du socle';}const ret1=arrV374_(Number(v.disponibleEnveloppes!=null?v.disponibleEnveloppes:(p.resteBudgetPilotable||0))),het1=arrV374_(Math.max(0,Number(v.horsPilotableAControler!=null?v.horsPilotableAControler:0)));v.ret1=ret1;v.het1=het1;v.horsPilotableBrut=arrV374_(Number(h.total||0));v.dt1=arrV374_(Number(v.cft1||0)+Number(v.dpt1||0)+het1);v.sct1=arrV374_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;v.formuleSCt1='SCt1 = SS1 + Rt1 - CFt1 - DPt1 - HEt1';v.formuleREt1='REt1 = P1 - pilotable consommé/réservé';const env=Array.isArray(p.enveloppes)?p.enveloppes:[],abs=arrV374_(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)-Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0))-Number(x&&x.planifie||0)),0));v.absorbableParAllocations=abs;v.incompressible=arrV374_(v.sct1<0?Math.max(0,Math.abs(v.sct1)-abs):0);p.v37=v;p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.resteBudgetPilotable=ret1;p.capaciteTresorerie=v.sct1;reportPrecedent=v.sct1;});base.version=CERBERE_PILOTAGE_V374_VERSION;return base;}

function recalculerCfFutursDepuisCf0CourantV375_(base){const periodes=Array.isArray(base&&base.periodes)?base.periodes:[];if(periodes.length<2)return;const charges=Array.isArray(lireTable_('Charges_fixes'))?lireTable_('Charges_fixes'):[];periodes.forEach((p,i)=>{if(i===0||!p||typeof p!=='object')return;const v=p.v37||(p.v37={}),periode=p.periode||p,cf0=arrV374_(cfTotalSecoursV372_(charges,periode)),effets=p.plan&&p.plan.effets||{},delta=arrV374_(Number(effets.hausseCharges||0)-Number(effets.baisseCharges||0)-Number(effets.chargesEvitees||0)),cf1=arrV374_(Math.max(0,cf0+delta));v.cf0CourantSource=cf0;v.deltaPlanCharges=delta;v.chargesFixesTotal=cf1;v.chargesFixesRestantes=cf1;v.chargesFixesAttenduRealise=0;v.chargesFixesReelRealise=0;v.chargesFixesRealisees=0;v.cft1=cf1;v.cf1Statut='projection dynamique depuis CF0 courant jusqu’à ouverture du cycle';});}

function stabiliserCerbereV3716_(base){
  if(!base||base.ok===false)return base;
  const periodes=Array.isArray(base.periodes)?base.periodes:[];
  const postes=Array.isArray(base.recettesCanon&&base.recettesCanon.postes)?base.recettesCanon.postes:[];
  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;
    if(i>0&&postes.length){
      const socle=arrV374_(postes.reduce((s,x)=>{if(!x||typeof x!=='object')return s;const montant=typeof montantR0PourCycleV378_==='function'?montantR0PourCycleV378_(x,periode):Math.max(0,Number(x.montant||0));return s+Math.max(0,Number(montant||0));},0));
      const plan=arrV374_(Number(v.rt1Audit&&v.rt1Audit.planCycle!=null?v.rt1Audit.planCycle:0));
      const avant=arrV374_(Number(v.rt1||0));v.rt1=arrV374_(socle+plan);
      v.rt1Audit=v.rt1Audit&&typeof v.rt1Audit==='object'?v.rt1Audit:{};v.rt1Audit.socleCanonTerminal3716=socle;v.rt1Audit.planTerminal3716=plan;v.rt1Audit.rt1AvantTerminal3716=avant;v.rt1Audit.deltaTerminal3716=arrV374_(v.rt1-avant);
    }
    const rejetes=Array.isArray(v.cft1Audit&&v.cft1Audit.candidatsRejetes)?v.cft1Audit.candidatsRejetes:[];
    p.roulant=p.roulant&&typeof p.roulant==='object'?p.roulant:{};p.roulant.horsPilotable=p.roulant.horsPilotable&&typeof p.roulant.horsPilotable==='object'?p.roulant.horsPilotable:{};if(rejetes.length)p.roulant.horsPilotable.candidatsCfRejetes=rejetes;v.candidatsCfRejetes=rejetes;
    recalculerDerivesCerbereV3717_(p);
  });
  base.version=CERBERE_PILOTAGE_V374_VERSION;base.diagnostic=base.diagnostic||{};base.diagnostic.stabilisation_3716='R0 futur relu depuis canon daté ; diagnostic CF préservé ; dérivés recalculés en passe terminale';return base;
}

/**
 * Passe terminale 3.7.21.
 * - R0 futur et suspension CASDEN restent verrouillés comme en 3.7.20.
 * - si une opération est déjà reconnue comme CF mais que son lien pointe vers un id
 *   maître/technique absent des occurrences du cycle, Cerbère cherche aussi l'occurrence
 *   équivalente à partir de l'opération bancaire elle-même (libellé fort + unicité).
 * - le Réel remplace alors le prévu par delta : ex. FLOA 115,25 remplace 68,25 => +47,
 *   sans réinjecter tout le Réel une seconde fois.
 */
function stabiliserCerbereV3717_(base){
  if(!base||base.ok===false)return base;
  const operations=tableauCerbereV379_(lireTable_('Operations'));
  const charges=tableauCerbereV379_(lireTable_('Charges_fixes'));
  const categories=tableauCerbereV379_(lireTable_('Categories'));
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?tableauCerbereV379_(lireRapprochementsChargesFixes()):[];
  const actions=typeof lireFeuilleDynamiquePlan_==='function'?tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Actions')):[];
  const periodes=tableauCerbereV379_(base.periodes);
  const p0Cats=new Set(tableauCerbereV379_(base.p0&&base.p0.postes).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));p0Cats.add('Divers');
  const types={};categories.forEach(c=>types[String(c&&c.nom||'').trim()]=normaliserV377_(c&&c.type));
  const canonFrais=typeof chargerCanonRecettesCerbereV1==='function'?chargerCanonRecettesCerbereV1():base.recettesCanon;
  const postes=tableauCerbereV379_(canonFrais&&canonFrais.postes);
  const liens=construireLiensCfV3717_(operations,charges,rapprochements);
  const chargeParId={};charges.forEach(c=>{const id=String(c&&c.id||'').trim();if(id)chargeParId[id]=c;});

  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;
    const effetsCarte=tableauCerbereV379_(v.actionsEvenementsCycle);

    if(i>0&&postes.length){
      const socle=arrV374_(postes.reduce((s,x)=>s+Math.max(0,Number(x&&x.montant||0)),0));
      const recettesCarte=arrV374_(effetsCarte.reduce((s,x)=>normaliserV377_(x&&x.cible)==='recette'?s+Math.max(0,Number(x&&x.montantSigne||0)):s,0));
      const planAudit=arrV374_(Number(v.rt1Audit&&v.rt1Audit.planCycle!=null?v.rt1Audit.planCycle:0));
      const plan=recettesCarte>0?recettesCarte:planAudit;
      const avant=arrV374_(Number(v.rt1||0));v.rt1=arrV374_(socle+plan);
      v.rt1Audit=v.rt1Audit&&typeof v.rt1Audit==='object'?v.rt1Audit:{};
      v.rt1Audit.socleCanonTerminal3721=socle;v.rt1Audit.recettesCarteTerminal3721=recettesCarte;v.rt1Audit.planAuditTerminal3721=planAudit;v.rt1Audit.planTerminal3721=plan;v.rt1Audit.rt1AvantTerminal3721=avant;v.rt1Audit.deltaTerminal3721=arrV374_(v.rt1-avant);v.rt1Audit.sourceTerminal3721='R0 courant persistant + carte Actions/Événements';
    }

    const ref=calculerCfReferenceCycleV3710_(charges,actions,periode),refLignes=tableauCerbereV379_(ref.lignes),refIds=new Set(refLignes.map(c=>String(c&&c.id||'')).filter(Boolean)),remplacements={},rapproches=[],opsParCfId={};
    operations.forEach(o=>{const id=String(o&&o.id||'').trim(),cfId=liens[id],d=dateOperationBanqueV377_(o);if(!cfId||!d||!dateDansCycleV377_(d,periode))return;const a=Math.abs(Number(o&&o.montant||0));remplacements[cfId]=Number(remplacements[cfId]||0)+a;(opsParCfId[cfId]||(opsParCfId[cfId]=[])).push(o);rapproches.push({operation_id:id,charge_fixe_id:cfId,montant:arrV374_(a),categorie:String(o&&o.categorie||''),libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),dansReference:refIds.has(String(cfId))});});

    let cft1AvantEffets=0;refLignes.forEach(c=>{const id=String(c&&c.id||'');cft1AvantEffets+=Object.prototype.hasOwnProperty.call(remplacements,id)?Number(remplacements[id]):Number(c&&c.montant||0);});

    const aliasUtilises=new Set(),ajustementsAlias=[],reelsSansOccurrence=[];
    Object.keys(remplacements).forEach(id=>{
      if(refIds.has(String(id)))return;
      const reel=Number(remplacements[id]||0),maitre=chargeParId[id],opsLiees=tableauCerbereV379_(opsParCfId[id]);
      if(!(reel>0))return;
      let candidats=[];
      if(maitre)candidats=refLignes.filter(c=>!aliasUtilises.has(String(c&&c.id||''))&&equivalentCfReferenceV3720_(maitre,c));
      if(candidats.length!==1&&opsLiees.length){
        candidats=refLignes.filter(c=>!aliasUtilises.has(String(c&&c.id||''))&&opsLiees.some(o=>equivalentOperationCfReferenceV3721_(o,c)));
      }
      if(candidats.length===1){
        const c=candidats[0],prevu=Math.abs(Number(c&&c.montant||0)),delta=reel-prevu;
        cft1AvantEffets+=delta;aliasUtilises.add(String(c&&c.id||''));
        ajustementsAlias.push({charge_fixe_id:id,reference_id:String(c&&c.id||''),prevu:arrV374_(prevu),reel:arrV374_(reel),delta:arrV374_(delta),source:maitre?'maître puis opération':'opération bancaire'});
      }else{
        reelsSansOccurrence.push({charge_fixe_id:id,montant:arrV374_(reel),candidats:candidats.length});
      }
    });

    const effetCfNet=arrV374_(effetsCarte.reduce((s,x)=>estEffetCfEviteV3720_(x,charges,refLignes)?s+Math.max(0,Number(x&&x.montantSigne||0)):normaliserV377_(x&&x.cible)==='charge_fixe'?s+Number(x&&x.montantSigne||0):s,0));
    v.chargesFixesTotal=arrV374_(ref.total);v.cft1=arrV374_(Math.max(0,cft1AvantEffets-effetCfNet));

    const cfParCat={};operations.forEach(o=>{const id=String(o&&o.id||'').trim(),cfId=liens[id],d=dateImputationCerbereV377_(o);if(!cfId||!d||!dateDansCycleV377_(d,periode))return;const cat=String(o&&o.categorie||'').trim();cfParCat[cat]=Number(cfParCat[cat]||0)+Math.abs(Number(o&&o.montant||0));});
    const env=tableauCerbereV379_(p.enveloppes);let dpt=0,ret=0;
    env.forEach(x=>{const cat=String(x&&x.categorie||'').trim(),brut=Math.max(0,Number(x&&x.reelImpute!=null?x.reelImpute:x&&x.reelNetPrevisionnel||0)),reel=Math.max(0,brut-Number(cfParCat[cat]||0)),plan=Number(x&&x.planifie||0),alloc=Math.max(0,Number(x&&x.prevu||0)),eng=arrV374_(reel+plan);x.reelNetPrevisionnel=arrV374_(reel);x.engageV37=eng;x.resteV37=arrV374_(alloc-eng);x.dpt1=arrV374_(Math.max(alloc,eng));dpt+=x.dpt1;ret+=x.resteV37;});
    v.dpt1=arrV374_(dpt);v.ret1=arrV374_(ret);v.fuiteCfCorrigeeParCategorie=cfParCat;

    let het=0,nonCb=0,cb=0;const det={},ncb={},cbd={};
    operations.forEach(o=>{const d=dateImputationCerbereV377_(o),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim(),id=String(o&&o.id||'').trim();if(!d||!dateDansCycleV377_(d,periode)||m>=0||p0Cats.has(cat)||liens[id]||types[cat]==='tresorerie'||estReglementCbTechniqueV377_(o))return;const a=Math.abs(m),isCb=!!String(o&&o.carte_fin||'').trim();het+=a;det[cat]=Number(det[cat]||0)+a;if(isCb){cb+=a;cbd[cat]=Number(cbd[cat]||0)+a;}else{nonCb+=a;ncb[cat]=Number(ncb[cat]||0)+a;}});
    [det,ncb,cbd].forEach(z=>Object.keys(z).forEach(k=>z[k]=arrV374_(z[k])));
    v.het1Reel=arrV374_(het);v.het1=arrV374_(het+Number(v.het1Plan||0));v.horsPilotableAControler=v.het1;v.het1Detail=det;

    let rejetes=typeof diagnostiquerCandidatsCfRejetesV3715_==='function'?diagnostiquerCandidatsCfRejetesV3715_(operations,refLignes,liens,periode):[];
    rejetes=tableauCerbereV379_(rejetes).map(x=>{const cs=tableauCerbereV379_(x&&x.candidats).filter(c=>c&&((c.memeCategorie===true)||c.libelleProche===true||memeFamilleCfV3717_(x&&x.categorie,c&&c.categorie)));return Object.assign({},x,{candidats:cs});}).filter(x=>x.candidats.length);
    v.cft1Audit={reference:arrV374_(ref.total),avantEffetsCycle:arrV374_(cft1AvantEffets),effetNetCycle:effetCfNet,apresEffetsCycle:v.cft1,remplacements:remplacements,ajustementsAlias:ajustementsAlias,reelsSansOccurrenceReference:reelsSansOccurrence,actionsAppliquees:ref.actionsAppliquees,rapproches:rapproches,candidatsRejetes:rejetes,version:'3.7.21'};
    p.roulant=p.roulant&&typeof p.roulant==='object'?p.roulant:{};p.roulant.horsPilotable={total:v.het1,nonCb:arrV374_(nonCb),cb:arrV374_(cb),nonCbParCategorie:ncb,cbParCategorie:cbd,netApresRapprochementCf:true,candidatsCfRejetes:rejetes,version:'3.7.21'};
    v.candidatsCfRejetes=rejetes;
    recalculerDerivesCerbereV3717_(p);
  });

  base.recettesCanon=canonFrais||base.recettesCanon;base.version=CERBERE_PILOTAGE_V374_VERSION;base.diagnostic=base.diagnostic||{};base.diagnostic.stabilisation_3721='R0/CASDEN stabilisés ; alias CF résolu aussi depuis opération bancaire ; Réel remplace prévu par delta ; aucun double compte';
  base.fenetreRoulante=typeof fenetreV37_==='function'?fenetreV37_(periodes):base.fenetreRoulante;
  return base;
}

function equivalentOperationCfReferenceV3721_(op,ref){
  if(!op||!ref)return false;
  const ol=normaliserV377_(op.libelle_bancaire||op.libelle||''),rl=normaliserV377_(ref.libelle_bancaire||ref.libelle||'');
  if(!ol||!rl||Math.min(ol.length,rl.length)<4)return false;
  const nom=ol===rl||ol.indexOf(rl)>=0||rl.indexOf(ol)>=0;
  if(!nom)return false;
  const oc=normaliserV377_(op.categorie||''),rc=normaliserV377_(ref.categorie||'');
  return !oc||!rc||oc===rc||memeFamilleCfV3717_(oc,rc)||nom;
}

function equivalentCfReferenceV3720_(maitre,ref){
  if(!maitre||!ref)return false;
  const ml=normaliserV377_(maitre.libelle_bancaire||maitre.libelle||''),rl=normaliserV377_(ref.libelle_bancaire||ref.libelle||'');
  const mc=normaliserV377_(maitre.categorie||''),rc=normaliserV377_(ref.categorie||'');
  const mm=Math.abs(Number(maitre.montant||0)),rm=Math.abs(Number(ref.montant||0));
  const nom=ml&&rl&&(ml===rl||ml.indexOf(rl)>=0||rl.indexOf(ml)>=0);
  const famille=memeFamilleCfV3717_(mc,rc);
  const montant=Math.abs(mm-rm)<=.011;
  return !!(nom||(famille&&montant));
}

function estEffetCfEviteV3720_(x,charges,refLignes){
  if(!x||Number(x.montantSigne||0)<=0)return false;
  if(normaliserV377_(x.cible)==='charge_fixe')return true;
  const lib=normaliserV377_(x.libelle||''),cat=normaliserV377_(x.categorie||'');
  const mot=/(suspension|suspend|report|reporte|suppression|supprime|annulation|annule|echeance)/.test(lib);
  if(!mot)return false;
  const refs=tableauCerbereV379_(refLignes),masters=tableauCerbereV379_(charges);
  if(cat&&refs.some(c=>{const cc=normaliserV377_(c&&c.categorie||'');return cc===cat||memeFamilleCfV3717_(cat,cc);}))return true;
  return masters.some(c=>{
    const actif=!(c&&c.actif===false||normaliserV377_(c&&c.actif)==='false'||normaliserV377_(c&&c.actif)==='non');if(!actif)return false;
    const nom=normaliserV377_(c&&c.libelle_bancaire||c&&c.libelle||'');if(!nom||nom.length<4)return false;
    return lib.indexOf(nom)>=0||nom.indexOf(lib)>=0;
  });
}

function construireLiensCfV3717_(operations,charges,rapprochements){
  const out=typeof construireLiensCfV3713_==='function'?construireLiensCfV3713_(operations,charges,rapprochements):construireLiensCfFortsV3711_(operations,charges,rapprochements);
  const cs=tableauCerbereV379_(charges).filter(c=>!(c&&c.actif===false||normaliserV377_(c&&c.actif)==='false'||normaliserV377_(c&&c.actif)==='non'));
  tableauCerbereV379_(operations).forEach(o=>{
    const id=String(o&&o.id||'').trim();if(!id||out[id]||Number(o&&o.montant||0)>=0)return;
    const cat=String(o&&o.categorie||'').trim(),mont=Math.abs(Number(o&&o.montant||0)),d=dateOperationBanqueV377_(o),nom=normaliserV377_(o&&o.libelle||o&&o.libelle_bancaire);
    if(!mont||!d)return;
    const parFamille=cs.filter(c=>memeFamilleCfV3717_(cat,c&&c.categorie)&&Math.abs(Math.abs(Number(c&&c.montant||0))-mont)<=.011&&distanceJourMoisV3714_(d.getDate(),jourCfV3714_(c)||d.getDate())<=7);
    if(parFamille.length===1){out[id]=String(parFamille[0].id||'');return;}
    if(nom&&nom.length>=4){
      const exactNom=cs.filter(c=>{const cn=normaliserV377_(c&&c.libelle_bancaire||c&&c.libelle);if(!cn||cn.length<4)return false;const procheNom=cn===nom||nom.indexOf(cn)>=0||cn.indexOf(nom)>=0;if(!procheNom)return false;const jour=jourCfV3714_(c);return !jour||distanceJourMoisV3714_(d.getDate(),jour)<=10;});
      if(exactNom.length===1)out[id]=String(exactNom[0].id||'');
    }
  });
  return out;
}
function familleCfV3717_(cat){const n=normaliserV377_(cat);if(n==='gaz'||n==='electricite'||n==='energie'||n==='energies')return 'energies';return n;}
function memeFamilleCfV3717_(a,b){const x=familleCfV3717_(a),y=familleCfV3717_(b);return !!(x&&y&&x===y);}

function recalculerDerivesCerbereV3717_(p){
  if(!p||typeof p!=='object')return;const v=p.v37||(p.v37={}),env=Array.isArray(p.enveloppes)?p.enveloppes:[];
  v.dt1=arrV374_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));v.sct1=arrV374_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
  v.capaciteAvantPilotable=arrV374_(Number(v.ss1||0)+Number(v.rt1||0)-Number(v.cft1||0)-Number(v.het1||0));
  const allocation=arrV374_(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)),0)),dep=arrV374_(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.engageV37||0)-Math.max(0,Number(x&&x.prevu||0))),0));v.allocationP1Courante=allocation;v.depassementsPilotables=dep;v.aReequilibrer=arrV374_(v.capaciteAvantPilotable-allocation-dep);v.aReequilibrerReference=v.aReequilibrer;
  const abs=arrV374_(env.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)-Number(x&&x.engageV37||0)),0));v.absorbableParAllocations=abs;v.incompressible=arrV374_(v.aReequilibrer<0?Math.max(0,Math.abs(v.aReequilibrer)-abs):0);v.auditReequilibrage={attendu:v.sct1,reel:v.aReequilibrer,ecart:arrV374_(v.aReequilibrer-v.sct1),ok:Math.abs(v.aReequilibrer-v.sct1)<.011};p.resteBudgetPilotable=Number(v.ret1||0);p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
}

function chargerCerbereV374(){const brut=chargerCerbereV37(),base=appliquerResteReellementPilotableV374_(brut),audite=typeof appliquerAuditCerbereV377_==='function'?appliquerAuditCerbereV377_(base):base,historique=typeof appliquerHistoriqueR0V378_==='function'?appliquerHistoriqueR0V378_(audite):audite,rapproche=typeof appliquerRapprochementCerbereV3711_==='function'?appliquerRapprochementCerbereV3711_(historique):historique,cycle=typeof appliquerDoctrineCycleV3712_==='function'?appliquerDoctrineCycleV3712_(rapproche):rapproche,salaire=typeof appliquerConventionSalaireTousCyclesV3712_==='function'?appliquerConventionSalaireTousCyclesV3712_(cycle):cycle,frontiere=typeof appliquerProjectionFrontiereV3713_==='function'?appliquerProjectionFrontiereV3713_(salaire):salaire,frontiere2=typeof corrigerProjectionFrontiereV3713b_==='function'?corrigerProjectionFrontiereV3713b_(frontiere):frontiere,effets=typeof corrigerEffetsFinanciersActionsV3713_==='function'?corrigerEffetsFinanciersActionsV3713_(frontiere2):frontiere2,stable16=stabiliserCerbereV3716_(effets),stable=stabiliserCerbereV3717_(stable16);if(stable&&typeof stable==='object')stable.version=CERBERE_PILOTAGE_V374_VERSION;return serialiserCerberePourClient_(stable);}

function arrV374_(n){return Math.round((Number(n)||0)*100)/100;}
