const BUDGETSOFT_NEW_CF_AUDIT_20260926_VERSION='2026-09-26.2';
const BUDGETSOFT_NEW_CF_AUDIT_ID_20260926='d476505c-189d-48a3-9eb1-51467df7fbc1';

function arrNewCfAudit20260926_(n){return Math.round((Number(n)||0)*100)/100;}
function actifNewCfAudit20260926_(v){return v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0';}
function dateNewCfAudit20260926_(v){if(!v)return null;const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d)?null:d;}

function occurrencesNewCfAudit20260926_(charge,debut,fin){
  if(!charge||!debut||!fin)return[];
  try{
    if(typeof calculerEcheancesChargeFixeAjustees_==='function'){
      return (calculerEcheancesChargeFixeAjustees_(charge,debut,fin,fin)||[]).map(x=>({
        date:String(x&&x.date||''),montant:arrNewCfAudit20260926_(x&&x.montant)
      }));
    }
    if(typeof calculerEcheancesJusqua_==='function'){
      return (calculerEcheancesJusqua_(charge,debut,fin,fin)||[]).map(d=>({
        date:d instanceof Date?d.toISOString():String(d||''),montant:arrNewCfAudit20260926_(charge.montant)
      }));
    }
  }catch(e){}
  return[];
}

function objetsPortantIdNewCfAudit20260926_(racine,id){
  const trouves=[],vus=new Set();
  function walk(v,path,depth){
    if(v==null||depth>10)return;
    if(typeof v!=='object')return;
    if(vus.has(v))return;vus.add(v);
    if(Array.isArray(v)){v.forEach((x,i)=>walk(x,path+'['+i+']',depth+1));return;}
    const champs=['id','sourceId','source_id','charge_fixe_id','chargeFixeId','previsionnel_id'];
    const porte=champs.some(k=>String(v&&v[k]||'')===id);
    if(porte)trouves.push({
      path:path,
      id:String(v.id||''),
      sourceId:String(v.sourceId||v.source_id||''),
      charge_fixe_id:String(v.charge_fixe_id||v.chargeFixeId||''),
      date:String(v.date||v.date_prevue||v.dateCible||''),
      montant:Number(v.montantSigne!=null?v.montantSigne:(v.montant!=null?v.montant:(v.amount!=null?v.amount:NaN))),
      source:String(v.source||v.type||''),
      libelle:String(v.libelle||v.label||v.nom||'')
    });
    Object.keys(v).forEach(k=>walk(v[k],path+'.'+k,depth+1));
  }
  walk(racine,'$',0);return trouves;
}

function auditerPropagationNouvelleChargeCopro20260926(){
  const id=BUDGETSOFT_NEW_CF_AUDIT_ID_20260926;
  const charges=typeof lireTable_==='function'?(lireTable_('Charges_fixes')||[]):[];
  const operations=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];
  const charge=charges.find(c=>String(c&&c.id||'')===id)||null;
  const raps=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  const opLiees=operations.filter(o=>{
    const oid=String(o&&o.id||''),direct=String(o&&o.charge_fixe_id||'')===id;
    const viaRap=raps.some(r=>String(r&&r.operation_id||'')===oid&&String(r&&r.charge_fixe_id||'')===id&&(/valid|rapproch/i.test(String(r&&r.statut||r&&r.decision||''))&&!/a valider|propos/i.test(String(r&&r.statut||r&&r.decision||''))));
    return direct||viaRap;
  });

  const snap=typeof chargerSnapshotGlobalBudgetSoft20260906==='function'?chargerSnapshotGlobalBudgetSoft20260906():null;
  const etat=snap&&snap.etat||{},mods=etat.modules||{},cerbere=mods.cerbere||{},diag=cerbere.diagnostic||{};
  const p1=diag.p1Doctrine20260912||{},p2=diag.p2Doctrine20260913||{};
  const a1=p1.cft1Audit||{},a2=p2.cft2Audit||{};
  const l1=(a1.lignes||[]).filter(x=>String(x&&x.id||'')===id);
  const l2=(a2.lignes||[]).filter(x=>String(x&&x.id||'')===id);

  const projection=mods.projectionEtendue||{};
  const projectionRefs=objetsPortantIdNewCfAudit20260926_(projection,id);
  const projectionLignes=projectionRefs.filter(x=>Number.isFinite(x.montant));
  const projectionEconomiques=[];
  const vusProjection={};
  projectionLignes.forEach(x=>{
    const k=[String(x.id||''),String(x.date||''),String(x.sourceId||''),String(arrNewCfAudit20260926_(x.montant))].join('|');
    if(vusProjection[k])return;
    vusProjection[k]=true;projectionEconomiques.push(x);
  });

  const analyses=mods.analyses||{};
  let analyseExacte=null;
  try{
    const variante=analyses.variantes&&analyses.variantes['6']||null;
    const periodes=variante&&variante.periodes||[];
    const series=variante&&variante.seriesCourbes&&variante.seriesCourbes.chargesFixes||null;
    const serieLogements=series&&Array.isArray(series.series)?series.series.find(s=>String(s&&s.nom||'')==='Logements'):null;
    analyseExacte={labels:series&&series.labels||[],logements:serieLogements?serieLogements.valeurs:[],source:series&&series.source||'',doctrine:series&&series.doctrine||''};
  }catch(e){analyseExacte={erreur:String(e&&e.message||e)};}

  let occurrences=[];
  if(charge){
    const now=new Date(),fin=new Date(now.getFullYear(),now.getMonth()+2,0,23,59,59,999);
    occurrences=occurrencesNewCfAudit20260926_(charge,now,fin);
  }

  const controles={
    chargeTrouvee:!!charge,
    chargeActive:!!(charge&&actifNewCfAudit20260926_(charge.actif)),
    montant550:!!(charge&&Math.abs(Number(charge.montant||0)-550)<=.01),
    uneSeuleFiche:charges.filter(c=>String(c&&c.id||'')===id).length===1,
    aucuneOperationFictive:opLiees.length===0,
    cerbereP1SansDoublon:l1.length<=1,
    cerbereP2SansDoublon:l2.length<=1,
    cerberePresentDansAuMoinsUnePeriode:(l1.length+l2.length)>=1,
    projectionUneSeuleLigneEconomique:projectionEconomiques.length===1,
    projectionMontantMoins550:projectionEconomiques.length===1&&Math.abs(Number(projectionEconomiques[0].montant||0)+550)<=.01,
    snapshotDisponible:!!(snap&&snap.disponible),
    snapshotFrais:!!(snap&&snap.disponible&&!snap.perime)
  };

  const out={
    ok:Object.keys(controles).every(k=>controles[k]===true),
    version:BUDGETSOFT_NEW_CF_AUDIT_20260926_VERSION,
    lectureSeule:true,
    revisionBudgetSoft:String(etat.revisionBudgetSoft||snap&&snap.revisionBudgetSoft||''),
    charge:charge?{
      id:String(charge.id||''),libelle:String(charge.libelle||''),montant:Number(charge.montant||0),
      categorie:String(charge.categorie||''),frequence:String(charge.frequence||''),date_debut:String(charge.date_debut||''),actif:actifNewCfAudit20260926_(charge.actif)
    }:null,
    occurrencesProchaines:occurrences,
    cerbere:{
      p1:l1,p2:l2,
      totalP1:Number(p1.cft1||0),totalP2:Number(p2.cft2||0)
    },
    tresorerie:{
      referencesParId:projectionRefs,
      lignesMonetairesParId:projectionLignes,
      lignesEconomiquesUniques:projectionEconomiques,
      nombreReferences:projectionRefs.length,
      nombreLignesMonetaires:projectionLignes.length,
      nombreLignesEconomiquesUniques:projectionEconomiques.length
    },
    analyses:{
      chargeReelleLiee:opLiees.map(o=>({id:String(o.id||''),date:String(o.date_comptable||o.date||''),montant:Number(o.montant||0),libelle:String(o.libelle_bancaire||o.libelle||'')})),
      serieCategorieLogements:analyseExacte,
      attendu:'Aucune écriture réelle de 550 € ne doit être créée par la seule fiche Charges_fixes. Les Analyses de charges fixes restent fondées sur le Réel bancaire explicitement rapproché.'
    },
    controles:controles,
    doctrine:'La fiche Charges_fixes porte la prévision. Cerbère et la trésorerie consomment cette prévision selon les occurrences canoniques. Analyses n’enregistre un Réel qu’après rapprochement avec une opération bancaire ; aucune opération fictive ne doit être créée.'
  };
  console.log('[AUDIT PROPAGATION NOUVELLE CHARGE COPRO 20260926] '+JSON.stringify(out));
  return out;
}
