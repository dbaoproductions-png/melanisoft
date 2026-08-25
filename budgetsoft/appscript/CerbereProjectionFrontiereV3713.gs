const CERBERE_PROJECTION_FRONTIERE_V3713_VERSION='3.7.13';

/**
 * Cerbère 3.7.13 — frontière bancaire et qualification des briques.
 * - SS1 de M+1 n'est jamais SCt1(M) : c'est le solde bancaire projeté au 27,
 *   juste avant le salaire d'ouverture, à partir de SHBt1 + seuls flux certains
 *   restant réellement à passer. Les allocations P1 non dépensées n'y entrent pas.
 * - R0 daté est reconstruit pour les cycles futurs depuis le canon effectif.
 * - HEt1 exclut trésorerie et CF rapprochables ; les CF sont aussi retirées des molettes.
 */
function appliquerProjectionFrontiereV3713_(base){
  if(!base||base.ok===false)return base;
  const operations=tableauCerbereV379_(lireTable_('Operations'));
  const charges=tableauCerbereV379_(lireTable_('Charges_fixes'));
  const categories=tableauCerbereV379_(lireTable_('Categories'));
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?tableauCerbereV379_(lireRapprochementsChargesFixes()):[];
  const actions=typeof lireFeuilleDynamiquePlan_==='function'?tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Actions')):[];
  const evenements=typeof lireFeuilleDynamiquePlan_==='function'?tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Evenements')):[];
  const periodes=tableauCerbereV379_(base.periodes);
  const p0Cats=new Set(tableauCerbereV379_(base.p0&&base.p0.postes).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));p0Cats.add('Divers');
  const types={};categories.forEach(c=>types[String(c&&c.nom||'').trim()]=normaliserV377_(c&&c.type));
  const liens=construireLiensCfV3713_(operations,charges,rapprochements);

  // 1) Requalifier le Réel : CF reconnues hors molettes et hors HEt1 ; trésorerie hors HEt1.
  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p,enveloppes=tableauCerbereV379_(p.enveloppes);
    const cfParCat={};
    operations.forEach(o=>{const id=String(o&&o.id||'').trim(),d=dateImputationCerbereV377_(o);if(!liens[id]||!d||!dateDansCycleV377_(d,periode))return;const cat=String(o&&o.categorie||'').trim();cfParCat[cat]=Number(cfParCat[cat]||0)+Math.abs(Number(o&&o.montant||0));});
    let dpt=0,ret=0;
    enveloppes.forEach(x=>{const cat=String(x&&x.categorie||'').trim();const brut=Math.max(0,Number(x&&x.reelImpute!=null?x.reelImpute:x&&x.reelNetPrevisionnel||0));const reel=Math.max(0,brut-Number(cfParCat[cat]||0));const plan=Number(x&&x.planifie||0),alloc=Math.max(0,Number(x&&x.prevu||0));const engage=arrV3713_(reel+plan);x.reelNetPrevisionnel=arrV3713_(reel);x.engageV37=engage;x.resteV37=arrV3713_(alloc-engage);x.dpt1=arrV3713_(Math.max(alloc,engage));dpt+=x.dpt1;ret+=x.resteV37;});
    v.dpt1=arrV3713_(dpt);v.ret1=arrV3713_(ret);v.fuiteCfCorrigeeParCategorie=cfParCat;

    let het=0,nonCb=0,cb=0;const det={},ncb={},cbd={};
    operations.forEach(o=>{const d=dateImputationCerbereV377_(o),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim(),id=String(o&&o.id||'').trim();if(!d||!dateDansCycleV377_(d,periode)||m>=0||p0Cats.has(cat)||liens[id]||types[cat]==='tresorerie'||estReglementCbTechniqueV377_(o))return;const a=Math.abs(m),isCb=!!String(o&&o.carte_fin||'').trim();het+=a;det[cat]=Number(det[cat]||0)+a;if(isCb){cb+=a;cbd[cat]=Number(cbd[cat]||0)+a;}else{nonCb+=a;ncb[cat]=Number(ncb[cat]||0)+a;}});
    [det,ncb,cbd].forEach(z=>Object.keys(z).forEach(k=>z[k]=arrV3713_(z[k])));
    v.het1Reel=arrV3713_(het);v.het1=arrV3713_(het+Number(v.het1Plan||0));v.horsPilotableAControler=v.het1;v.het1Detail=det;
    p.roulant=p.roulant||{};p.roulant.horsPilotable={total:v.het1,nonCb:arrV3713_(nonCb),cb:arrV3713_(cb),nonCbParCategorie:ncb,cbParCategorie:cbd,netApresRapprochementCf:true,version:'3.7.13'};

    // R0 futur : somme du canon réellement applicable au cycle + effets recettes du cycle.
    if(i>0&&v.rt1Audit&&v.rt1Audit.canonEffectifParCategorie){const c=v.rt1Audit.canonEffectifParCategorie;const socle=Object.keys(c).reduce((s,k)=>s+Number(c[k]&&c[k].cycle||0),0);v.rt1=arrV3713_(socle+Number(v.rt1Audit.planCycle||0));v.rt1Audit.socleCycleV3713=arrV3713_(socle);}
  });

  // 2) SS1 projeté de M+1 = banque actuelle + flux certains restant à passer jusqu'au 27.
  if(periodes.length>1){
    const m=periodes[0],n=periodes[1],vm=m.v37||(m.v37={}),vn=n.v37||(n.v37={}),pm=m.periode||m;
    const proj=projeterSoldeFrontiereV3713_(vm,pm,operations,charges,actions,evenements,liens,p0Cats,types);
    if(proj&&Number.isFinite(proj.montant)){vn.ss1=arrV3713_(proj.montant);vn.soldeOuverture=vn.ss1;vn.ss1Statut='projeté au 27 avant salaire depuis SHBt1 + seuls flux certains restant à passer';vn.ss1Projection=proj;}
  }

  // 3) Recalcul consolidé à partir des briques corrigées, sans report SC(M)->SS1(M+1).
  periodes.forEach((p,i)=>{if(!p||typeof p!=='object')return;const v=p.v37||(p.v37={}),env=tableauCerbereV379_(p.enveloppes);v.dt1=arrV3713_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));v.sct1=arrV3713_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;v.capaciteAvantPilotable=arrV3713_(Number(v.ss1||0)+Number(v.rt1||0)-Number(v.cft1||0)-Number(v.het1||0));const alloc=env.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)),0),dep=env.reduce((s,x)=>s+Math.max(0,Number(x&&x.engageV37||0)-Math.max(0,Number(x&&x.prevu||0))),0);v.allocationP1Courante=arrV3713_(alloc);v.depassementsPilotables=arrV3713_(dep);v.aReequilibrer=arrV3713_(v.capaciteAvantPilotable-alloc-dep);v.aReequilibrerReference=v.aReequilibrer;v.auditReequilibrage={attendu:v.sct1,reel:v.aReequilibrer,ecart:arrV3713_(v.aReequilibrer-v.sct1),ok:Math.abs(v.aReequilibrer-v.sct1)<.011};const abs=env.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)-Number(x&&x.engageV37||0)),0);v.absorbableParAllocations=arrV3713_(abs);v.incompressible=arrV3713_(v.aReequilibrer<0?Math.max(0,Math.abs(v.aReequilibrer)-abs):0);p.resteBudgetPilotable=v.ret1;p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;});

  base.version=CERBERE_PROJECTION_FRONTIERE_V3713_VERSION;base.fenetreRoulante=typeof fenetreV37_==='function'?fenetreV37_(periodes):base.fenetreRoulante;base.diagnostic=base.diagnostic||{};base.diagnostic.frontiere_3713='SS1 M+1 bancaire projeté, distinct de SCt1 M ; R0 daté ; CF/HEt1 renforcés';return base;
}

function construireLiensCfV3713_(operations,charges,rapprochements){
  const out=construireLiensCfFortsV3711_(operations,charges,rapprochements),cs=tableauCerbereV379_(charges);
  tableauCerbereV379_(operations).forEach(o=>{const id=String(o&&o.id||'').trim();if(!id||out[id]||Number(o&&o.montant||0)>=0)return;const cat=normaliserV377_(o&&o.categorie),mont=Math.abs(Number(o&&o.montant||0)),d=jourCivilV3710_(dateOperationBanqueV377_(o));if(!cat||!mont||!d)return;const cand=cs.filter(c=>{if(normaliserV377_(c&&c.categorie)!==cat)return false;if(Math.abs(Math.abs(Number(c&&c.montant||0))-mont)>.011)return false;const jour=Math.max(1,Math.min(31,Number(c&&c.jour_execution||1)));return Math.abs(d.getDate()-jour)<=5;});if(cand.length===1)out[id]=String(cand[0].id||'');});return out;
}

function projeterSoldeFrontiereV3713_(v,periode,operations,charges,actions,evenements,liens,p0Cats,types){
  const solde=Number(v&&v.shbt1);if(!Number.isFinite(solde))return null;const now=jourCivilV3710_(new Date()),fin=jourCivilV3710_(periode&&periode.fin);if(!now||!fin)return null;let delta=0;const detail=[];
  // CF restant à passer : occurrence future sans opération réelle déjà rapprochée.
  const ref=calculerCfReferenceCycleV3710_(charges,actions,periode),realises=new Set();tableauCerbereV379_(operations).forEach(o=>{const id=String(o&&o.id||'').trim();if(liens[id])realises.add(String(liens[id]));});tableauCerbereV379_(ref.lignes).forEach(c=>{if(realises.has(String(c.id)))return;const ch=tableauCerbereV379_(charges).find(x=>String(x&&x.id||'')===String(c.id));const occ=ch?occurrenceChargeCycleV3710_(ch,periode):null;if(occ&&occ>now&&occ<=fin){delta-=Number(c.montant||0);detail.push({type:'CF restante',libelle:c.libelle,montant:-arrV3713_(c.montant),date:formatJourV3712_(occ)});}});
  // Actions/événements : seulement flux bancaires confirmés encore à passer dans M.
  const opIds=new Set(tableauCerbereV379_(operations).map(o=>String(o&&o.id||'')).filter(Boolean));
  tableauCerbereV379_(evenements).forEach(e=>{const d=jourCivilV3710_(e&&e.date_effet),stat=normaliserV377_(e&&e.statut),op=String(e&&e.operation_reelle_id||'').trim();if(!d||d<=now||d>fin||opIds.has(op)||stat==='annule'||stat==='annulee')return;const m=Math.abs(Number(e&&e.montant||0));if(!m)return;const signe=normaliserV377_(e&&e.type)==='recette'?1:-1;delta+=signe*m;detail.push({type:'Événement restant',libelle:String(e&&e.libelle||''),montant:arrV3713_(signe*m),date:formatJourV3712_(d)});});
  return {montant:arrV3713_(solde+delta),shbt1:arrV3713_(solde),deltaFluxRestants:arrV3713_(delta),detail:detail,doctrine:'projection bancaire au 27 avant salaire ; P1 non dépensé exclu'};
}
function arrV3713_(n){return Math.round((Number(n)||0)*100)/100;}
