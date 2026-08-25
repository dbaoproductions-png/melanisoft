const CERBERE_RAPPROCHEMENT_V3711_VERSION='3.7.11';

/**
 * Passe de rapprochement comptable 3.7.11.
 * Objectif : une charge fixe reconnue reste une CF même si le montant réel diverge.
 * On ne touche ni à SS1 ni à Rt1 ; on recalcule uniquement CFt1, DPt1, HEt1 et SCt1.
 * Le rapprochement automatique fort exige une identité de libellé unique et, lorsque
 * les catégories sont renseignées des deux côtés, une catégorie identique.
 */
function appliquerRapprochementCerbereV3711_(base){
  if(!base||base.ok===false)return base;
  const operations=tableauCerbereV379_(lireTable_('Operations'));
  const charges=tableauCerbereV379_(lireTable_('Charges_fixes'));
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'
    ? tableauCerbereV379_(lireRapprochementsChargesFixes())
    : lireFeuilleDynamiqueCerbereV379_('Rapprochements_charges_fixes');
  const actions=typeof lireFeuilleDynamiquePlan_==='function'
    ? tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Actions'))
    : lireFeuilleDynamiqueCerbereV379_('Plan_Actions');
  const p0Postes=tableauCerbereV379_(base.p0&&base.p0.postes);
  const p0Cats=new Set(p0Postes.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
  p0Cats.add('Divers');

  const liens=construireLiensCfFortsV3711_(operations,charges,rapprochements);
  const periodes=tableauCerbereV379_(base.periodes);
  let report=null;

  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;
    if(i>0&&report!==null){
      v.ss1=arrV3711_(report);v.soldeOuverture=v.ss1;
      v.ss1Statut='projeté depuis la fin Cerbère corrigée de la période précédente';
    }

    const cfRef=calculerCfReferenceCycleV3710_(charges,actions,periode);
    const remplacements={},detailRapproches=[];
    operations.forEach(o=>{
      const opId=String(o&&o.id||'').trim(),cfId=liens[opId],d=dateOperationBanqueV377_(o);
      if(!cfId||!d||!dateDansCycleV377_(d,periode))return;
      const a=Math.abs(Number(o&&o.montant||0));
      remplacements[cfId]=Number(remplacements[cfId]||0)+a;
      detailRapproches.push({operation_id:opId,charge_fixe_id:cfId,montant:arrV3711_(a),categorie:String(o&&o.categorie||''),libelle:String(o&&o.libelle||o&&o.libelle_bancaire||'')});
    });
    let cft1=0;
    tableauCerbereV379_(cfRef.lignes).forEach(c=>{
      cft1+=Object.prototype.hasOwnProperty.call(remplacements,c.id)?Number(remplacements[c.id]):Number(c.montant||0);
    });
    v.chargesFixesTotal=arrV3711_(cfRef.total);
    v.cft1=arrV3711_(cft1);
    v.cft1Audit={reference:arrV3711_(cfRef.total),remplacements:remplacements,actionsAppliquees:cfRef.actionsAppliquees,rapproches:detailRapproches,version:CERBERE_RAPPROCHEMENT_V3711_VERSION};

    const fuiteCfParCat={};
    operations.forEach(o=>{
      const opId=String(o&&o.id||'').trim();if(!liens[opId])return;
      const d=dateImputationCerbereV377_(o);if(!d||!dateDansCycleV377_(d,periode))return;
      const cat=String(o&&o.categorie||'').trim();if(!p0Cats.has(cat))return;
      fuiteCfParCat[cat]=Number(fuiteCfParCat[cat]||0)+Math.abs(Number(o&&o.montant||0));
    });
    const enveloppes=tableauCerbereV379_(p.enveloppes);
    let dpt1=0,ret1=0;
    enveloppes.forEach(x=>{
      const cat=String(x&&x.categorie||'').trim();
      let brut;
      if(Number.isFinite(Number(x&&x.reelImpute)))brut=Number(x.reelImpute);
      else brut=Number(x&&x.reelNetPrevisionnel||0)+Number(v.fuiteCfCorrigeeParCategorie&&v.fuiteCfCorrigeeParCategorie[cat]||0);
      const reel=Math.max(0,brut-Number(fuiteCfParCat[cat]||0));
      const plan=Number(x&&x.planifie||0),allocation=Math.max(0,Number(x&&x.prevu||0));
      const engage=arrV3711_(reel+plan),reste=arrV3711_(allocation-engage),proj=arrV3711_(Math.max(allocation,engage));
      x.reelNetPrevisionnel=arrV3711_(reel);x.engageV37=engage;x.resteV37=reste;x.dpt1=proj;
      dpt1+=proj;ret1+=reste;
    });
    v.dpt1=arrV3711_(dpt1);v.ret1=arrV3711_(ret1);v.fuiteCfCorrigeeParCategorie=fuiteCfParCat;

    // Hors pilotable net : uniquement ce qui n'est toujours ni P0 ni CF reconnue.
    let het1=0,nonCb=0,cb=0;const heDetail={},nonCbParCategorie={},cbParCategorie={};
    operations.forEach(o=>{
      const d=dateImputationCerbereV377_(o),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim();
      if(!d||!dateDansCycleV377_(d,periode)||m>=0||p0Cats.has(cat))return;
      const opId=String(o&&o.id||'').trim();if(liens[opId])return;
      if(estReglementCbTechniqueV377_(o))return;
      const a=Math.abs(m),estCb=!!String(o&&o.carte_fin||'').trim();
      het1+=a;heDetail[cat]=Number(heDetail[cat]||0)+a;
      if(estCb){cb+=a;cbParCategorie[cat]=Number(cbParCategorie[cat]||0)+a;}
      else{nonCb+=a;nonCbParCategorie[cat]=Number(nonCbParCategorie[cat]||0)+a;}
    });
    [heDetail,nonCbParCategorie,cbParCategorie].forEach(obj=>Object.keys(obj).forEach(k=>obj[k]=arrV3711_(obj[k])));
    v.het1=arrV3711_(het1);v.horsPilotableAControler=v.het1;v.het1Detail=heDetail;
    p.roulant=p.roulant&&typeof p.roulant==='object'?p.roulant:{};
    p.roulant.horsPilotable={total:arrV3711_(het1),nonCb:arrV3711_(nonCb),cb:arrV3711_(cb),nonCbParCategorie:nonCbParCategorie,cbParCategorie:cbParCategorie,netApresRapprochementCf:true};

    v.dt1=arrV3711_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));
    v.sct1=arrV3711_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
    const absorbable=arrV3711_(enveloppes.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)-Number(x&&x.engageV37||0)),0));
    v.absorbableParAllocations=absorbable;
    v.incompressible=arrV3711_(v.sct1<0?Math.max(0,Math.abs(v.sct1)-absorbable):0);
    p.resteBudgetPilotable=v.ret1;p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
    report=v.sct1;
  });

  base.version=CERBERE_RAPPROCHEMENT_V3711_VERSION;
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.rapprochement_3711='CF : id/validation puis libellé fort unique, montant réel autorisé à diverger ; DPt1 et HEt1 recalculés sans double compte';
  return base;
}

function construireLiensCfFortsV3711_(operations,charges,rapprochements){
  const out=construireLiensCfCertainsV377_(operations,charges,rapprochements);
  const cs=tableauCerbereV379_(charges);
  tableauCerbereV379_(operations).forEach(o=>{
    const opId=String(o&&o.id||'').trim();if(!opId||out[opId])return;
    const nom=normaliserV377_(o&&o.libelle||o&&o.libelle_bancaire),cat=normaliserV377_(o&&o.categorie);
    if(!nom||nom.length<5)return;
    const candidats=cs.filter(c=>{
      const n=normaliserV377_(c&&c.libelle_bancaire||c&&c.libelle),cc=normaliserV377_(c&&c.categorie);
      if(!n||n.length<4)return false;
      if(cat&&cc&&cat!==cc)return false;
      return nom.indexOf(n)>=0||n.indexOf(nom)>=0;
    });
    if(candidats.length===1)out[opId]=String(candidats[0].id||'');
  });
  return out;
}
function arrV3711_(n){return Math.round((Number(n)||0)*100)/100;}
