const CERBERE_RAPPROCHEMENT_V3711_VERSION='3.7.15';

/**
 * Rapprochement CF : liens explicites, libellé fort unique, puis secours prudent
 * catégorie + montant exact + proximité de jour. 3.7.15 n'élargit PAS l'auto-match :
 * elle expose les candidats rejetés pour auditer HEt1 et les éventuelles fuites CF.
 */
function appliquerRapprochementCerbereV3711_(base){
  if(!base||base.ok===false)return base;
  const operations=tableauCerbereV379_(lireTable_('Operations')),charges=tableauCerbereV379_(lireTable_('Charges_fixes'));
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?tableauCerbereV379_(lireRapprochementsChargesFixes()):lireFeuilleDynamiqueCerbereV379_('Rapprochements_charges_fixes');
  const actions=typeof lireFeuilleDynamiquePlan_==='function'?tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Actions')):lireFeuilleDynamiqueCerbereV379_('Plan_Actions');
  const p0Cats=new Set(tableauCerbereV379_(base.p0&&base.p0.postes).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));p0Cats.add('Divers');
  const liens=construireLiensCfFortsV3711_(operations,charges,rapprochements),periodes=tableauCerbereV379_(base.periodes);let report=null;

  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;
    if(i>0&&report!==null){v.ss1=arrV3711_(report);v.soldeOuverture=v.ss1;v.ss1Statut='projeté depuis la fin Cerbère corrigée de la période précédente';}

    const cfRef=calculerCfReferenceCycleV3710_(charges,actions,periode),remplacements={},detailRapproches=[];
    operations.forEach(o=>{
      const opId=String(o&&o.id||'').trim(),cfId=liens[opId],d=dateOperationBanqueV377_(o);
      if(!cfId||!d||!dateDansCycleV377_(d,periode))return;
      const a=Math.abs(Number(o&&o.montant||0));
      remplacements[cfId]=Number(remplacements[cfId]||0)+a;
      detailRapproches.push({operation_id:opId,charge_fixe_id:cfId,montant:arrV3711_(a),categorie:String(o&&o.categorie||''),libelle:String(o&&o.libelle||o&&o.libelle_bancaire||'')});
    });

    let cft1=0;
    tableauCerbereV379_(cfRef.lignes).forEach(c=>{cft1+=Object.prototype.hasOwnProperty.call(remplacements,c.id)?Number(remplacements[c.id]):Number(c.montant||0);});
    const candidatsRejetes=diagnostiquerCandidatsCfRejetesV3715_(operations,cfRef.lignes,liens,periode);
    v.chargesFixesTotal=arrV3711_(cfRef.total);v.cft1=arrV3711_(cft1);
    v.cft1Audit={reference:arrV3711_(cfRef.total),remplacements:remplacements,actionsAppliquees:cfRef.actionsAppliquees,rapproches:detailRapproches,candidatsRejetes:candidatsRejetes,version:CERBERE_RAPPROCHEMENT_V3711_VERSION};

    const fuiteCfParCat={};
    operations.forEach(o=>{
      const opId=String(o&&o.id||'').trim();if(!liens[opId])return;
      const d=dateImputationCerbereV377_(o);if(!d||!dateDansCycleV377_(d,periode))return;
      const cat=String(o&&o.categorie||'').trim();if(!p0Cats.has(cat))return;
      fuiteCfParCat[cat]=Number(fuiteCfParCat[cat]||0)+Math.abs(Number(o&&o.montant||0));
    });

    const enveloppes=tableauCerbereV379_(p.enveloppes);let dpt1=0,ret1=0;
    enveloppes.forEach(x=>{
      const cat=String(x&&x.categorie||'').trim();let brut;
      if(Number.isFinite(Number(x&&x.reelImpute)))brut=Number(x.reelImpute);
      else brut=Number(x&&x.reelNetPrevisionnel||0)+Number(v.fuiteCfCorrigeeParCategorie&&v.fuiteCfCorrigeeParCategorie[cat]||0);
      const reel=Math.max(0,brut-Number(fuiteCfParCat[cat]||0)),plan=Number(x&&x.planifie||0),allocation=Math.max(0,Number(x&&x.prevu||0));
      const engage=arrV3711_(reel+plan),reste=arrV3711_(allocation-engage),proj=arrV3711_(Math.max(allocation,engage));
      x.reelNetPrevisionnel=arrV3711_(reel);x.engageV37=engage;x.resteV37=reste;x.dpt1=proj;dpt1+=proj;ret1+=reste;
    });
    v.dpt1=arrV3711_(dpt1);v.ret1=arrV3711_(ret1);v.fuiteCfCorrigeeParCategorie=fuiteCfParCat;

    let het1=0,nonCb=0,cb=0;const heDetail={},nonCbParCategorie={},cbParCategorie={};
    operations.forEach(o=>{
      const d=dateImputationCerbereV377_(o),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim();
      if(!d||!dateDansCycleV377_(d,periode)||m>=0||p0Cats.has(cat))return;
      const opId=String(o&&o.id||'').trim();if(liens[opId]||estReglementCbTechniqueV377_(o))return;
      const a=Math.abs(m),estCb=!!String(o&&o.carte_fin||'').trim();het1+=a;heDetail[cat]=Number(heDetail[cat]||0)+a;
      if(estCb){cb+=a;cbParCategorie[cat]=Number(cbParCategorie[cat]||0)+a;}else{nonCb+=a;nonCbParCategorie[cat]=Number(nonCbParCategorie[cat]||0)+a;}
    });
    [heDetail,nonCbParCategorie,cbParCategorie].forEach(obj=>Object.keys(obj).forEach(k=>obj[k]=arrV3711_(obj[k])));
    v.het1=arrV3711_(het1);v.horsPilotableAControler=v.het1;v.het1Detail=heDetail;
    p.roulant=p.roulant&&typeof p.roulant==='object'?p.roulant:{};
    p.roulant.horsPilotable={total:arrV3711_(het1),nonCb:arrV3711_(nonCb),cb:arrV3711_(cb),nonCbParCategorie,cbParCategorie,netApresRapprochementCf:true,candidatsCfRejetes:candidatsRejetes};

    v.dt1=arrV3711_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));
    v.sct1=arrV3711_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
    const absorbable=arrV3711_(enveloppes.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)-Number(x&&x.engageV37||0)),0));
    v.absorbableParAllocations=absorbable;v.incompressible=arrV3711_(v.sct1<0?Math.max(0,Math.abs(v.sct1)-absorbable):0);
    p.resteBudgetPilotable=v.ret1;p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;report=v.sct1;
  });

  base.version=CERBERE_RAPPROCHEMENT_V3711_VERSION;base.diagnostic=base.diagnostic||{};
  base.diagnostic.rapprochement_3711='CF : auto-match prudent inchangé ; candidats rejetés exposés pour audit HEt1/fuite CF';
  return base;
}

function construireLiensCfFortsV3711_(operations,charges,rapprochements){
  const out=construireLiensCfCertainsV377_(operations,charges,rapprochements),cs=tableauCerbereV379_(charges);
  tableauCerbereV379_(operations).forEach(o=>{
    const opId=String(o&&o.id||'').trim();if(!opId||out[opId])return;
    const nom=normaliserV377_(o&&o.libelle||o&&o.libelle_bancaire),cat=normaliserV377_(o&&o.categorie);
    if(nom&&nom.length>=5){
      const candidats=cs.filter(c=>{const n=normaliserV377_(c&&c.libelle_bancaire||c&&c.libelle),cc=normaliserV377_(c&&c.categorie);if(!n||n.length<4||cat&&cc&&cat!==cc)return false;return nom.indexOf(n)>=0||n.indexOf(nom)>=0;});
      if(candidats.length===1){out[opId]=String(candidats[0].id||'');return;}
    }
    const montant=Math.abs(Number(o&&o.montant||0)),d=dateOperationBanqueV377_(o);if(!montant||!d||!cat)return;
    const exacts=cs.filter(c=>{const cc=normaliserV377_(c&&c.categorie),cm=Math.abs(Number(c&&c.montant||0));if(!cc||cc!==cat||Math.abs(cm-montant)>.01)return false;const jour=jourCfV3714_(c);return jour===null||distanceJourMoisV3714_(d.getDate(),jour)<=7;});
    if(exacts.length===1)out[opId]=String(exacts[0].id||'');
  });
  return out;
}

function diagnostiquerCandidatsCfRejetesV3715_(operations,cfLignes,liens,periode){
  const cs=tableauCerbereV379_(cfLignes),out=[];
  tableauCerbereV379_(operations).forEach(o=>{
    const opId=String(o&&o.id||'').trim(),m=Number(o&&o.montant||0),d=dateOperationBanqueV377_(o);
    if(!opId||liens[opId]||m>=0||!d||!dateDansCycleV377_(d,periode))return;
    const cat=normaliserV377_(o&&o.categorie),nom=normaliserV377_(o&&o.libelle||o&&o.libelle_bancaire),montant=Math.abs(m);
    const scored=cs.map(c=>{
      const cc=normaliserV377_(c&&c.categorie),cn=normaliserV377_(c&&c.libelle_bancaire||c&&c.libelle),cm=Math.abs(Number(c&&c.montant||0)),jour=jourCfV3714_(c);
      const memeCat=!!(cat&&cc&&cat===cc),exact=Math.abs(cm-montant)<=.01,procheMontant=Math.abs(cm-montant)<=5;
      const libelleProche=!!(nom&&cn&&nom.length>=4&&cn.length>=4&&(nom.indexOf(cn)>=0||cn.indexOf(nom)>=0));
      const dist=jour===null?null:distanceJourMoisV3714_(d.getDate(),jour),procheJour=dist===null||dist<=7;
      let score=0;if(memeCat)score+=3;if(exact)score+=4;else if(procheMontant)score+=1;if(libelleProche)score+=3;if(procheJour)score+=1;
      return {c:c,score:score,memeCat:memeCat,exact:exact,libelleProche:libelleProche,dist:dist};
    }).filter(x=>x.score>=3).sort((a,b)=>b.score-a.score).slice(0,3);
    if(!scored.length)return;
    out.push({operation_id:opId,date:formatJourDiagV3715_(d),categorie:String(o&&o.categorie||''),libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),montant:arrV3711_(montant),candidats:scored.map(x=>({charge_fixe_id:String(x.c&&x.c.id||''),categorie:String(x.c&&x.c.categorie||''),libelle:String(x.c&&x.c.libelle||x.c&&x.c.libelle_bancaire||''),montant:arrV3711_(Math.abs(Number(x.c&&x.c.montant||0))),score:x.score,memeCategorie:x.memeCat,montantExact:x.exact,libelleProche:x.libelleProche,ecartJour:x.dist}))});
  });
  return out.slice(0,30);
}
function formatJourDiagV3715_(d){return d&&Object.prototype.toString.call(d)==='[object Date]'&&!isNaN(d)?Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd'):String(d||'');}
function jourCfV3714_(c){const vals=[c&&c.jour,c&&c.jour_prelevement,c&&c.jour_prevu,c&&c.echeance_jour,c&&c.date_prelevement,c&&c.date];for(let i=0;i<vals.length;i++){const v=vals[i];if(v===null||v===undefined||v==='')continue;const n=Number(v);if(Number.isFinite(n)&&n>=1&&n<=31)return Math.round(n);const d=new Date(v);if(!isNaN(d))return d.getDate();}return null;}
function distanceJourMoisV3714_(a,b){const d=Math.abs(Number(a)-Number(b));return Math.min(d,31-d);}
function arrV3711_(n){return Math.round((Number(n)||0)*100)/100;}
