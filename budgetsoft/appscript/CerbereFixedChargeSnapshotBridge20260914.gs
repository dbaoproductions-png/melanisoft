/*
 * Cerbère — pont canonique Charges_fixes pour snapshots historiques — 2026-09-14.
 *
 * Rôle : l'adaptateur du snapshot peut recevoir une révision Cerbère produite avant
 * la doctrine CF canonique. Cette couche ne devient pas propriétaire du calcul :
 * elle relit Charges_fixes et utilise le générateur canonique d'échéances BudgetSoft,
 * puis republie uniquement les termes CF et P1/P2 dérivés.
 */
const CERBERE_CF_SNAPSHOT_BRIDGE_20260914_VERSION='2026-09-14.3';

function actifCfSnapshotBridge20260914_(v){
  if(typeof estActifP1Cerbere20260912_==='function')return estActifP1Cerbere20260912_(v);
  const s=String(v==null?'':v).trim().toLowerCase();
  return s==='1'||s==='true'||s==='oui'||s==='actif';
}

function dateCfSnapshotBridge20260914_(v){
  if(typeof dateCockpit20260902_==='function')return dateCockpit20260902_(v);
  const d=v instanceof Date?new Date(v):new Date(v||0);return isNaN(d)?null:d;
}

function jourCfSnapshotBridge20260914_(v){
  const d=dateCfSnapshotBridge20260914_(v);return d?Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()):NaN;
}

function rapprochementValideCfSnapshotBridge20260914_(r){
  if(typeof estRapprochementValideP1Cerbere20260912_==='function')return estRapprochementValideP1Cerbere20260912_(r);
  const s=String(r&&r.statut||r&&r.decision||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return /valide|rapproch/.test(s)&&!/a valider|propose/.test(s);
}

function construireCfCanoniqueSnapshotBridge20260914_(p,v){
  const periode=p&&p.periode||p||{},debut=dateCfSnapshotBridge20260914_(periode.debut),fin=dateCfSnapshotBridge20260914_(periode.fin);
  if(!debut||!fin)return{ok:false,total:Number(v&&v.cft1||0),erreur:'bornes période invalides',ownerVersion:CERBERE_CF_SNAPSHOT_BRIDGE_20260914_VERSION};
  if(typeof calculerEcheancesChargeFixeAjustees_!=='function')return{ok:false,total:Number(v&&v.cft1||0),erreur:'générateur canonique Charges_fixes indisponible',ownerVersion:CERBERE_CF_SNAPSHOT_BRIDGE_20260914_VERSION};
  const charges=typeof lireTable_==='function'?(lireTable_('Charges_fixes')||[]):[];
  const ops0=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];
  const operations=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  const liens={};
  (rapprochements||[]).forEach(r=>{if(!rapprochementValideCfSnapshotBridge20260914_(r))return;const op=String(r&&r.operation_id||'').trim(),cf=String(r&&r.charge_fixe_id||'').trim();if(op&&cf)liens[op]=cf;});
  const reels={};
  (operations||[]).forEach(o=>{
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||m>=0)return;
    const d=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):dateCfSnapshotBridge20260914_(o&&(o.date_comptable||o.date));
    if(!d||jourCfSnapshotBridge20260914_(d)<jourCfSnapshotBridge20260914_(debut)||jourCfSnapshotBridge20260914_(d)>jourCfSnapshotBridge20260914_(fin))return;
    const opId=String(o&&o.id||'').trim(),cfId=String(o&&o.charge_fixe_id||'').trim()||(opId&&liens[opId]||'');if(!cfId)return;
    if(!reels[cfId])reels[cfId]={total:0,nombre:0};reels[cfId].total+=Math.abs(m);reels[cfId].nombre++;
  });
  let brut=0;const lignes=[],erreurs=[];
  (charges||[]).forEach(c=>{
    if(!actifCfSnapshotBridge20260914_(c&&c.actif))return;
    let occs=[];
    try{occs=(calculerEcheancesChargeFixeAjustees_(c,debut,fin,fin)||[]).filter(e=>{const d=dateCfSnapshotBridge20260914_(e&&e.date);return d&&jourCfSnapshotBridge20260914_(d)>=jourCfSnapshotBridge20260914_(debut)&&jourCfSnapshotBridge20260914_(d)<=jourCfSnapshotBridge20260914_(fin);});}
    catch(e){erreurs.push({id:String(c&&c.id||''),libelle:String(c&&c.libelle||''),erreur:String(e&&e.message||e)});return;}
    if(!occs.length)return;
    const id=String(c&&c.id||''),prevu=occs.reduce((s,e)=>s+Math.abs(Number(e&&e.montant||0)),0),reel=reels[id]||null;
    let retenu=prevu,source='prévision canonique';
    if(reel){const couvert=Math.min(Math.max(0,Number(reel.nombre||0)),occs.length),prevuCouvert=occs.slice(0,couvert).reduce((s,e)=>s+Math.abs(Number(e&&e.montant||0)),0);retenu=Math.max(0,Number(reel.total||0)+Math.max(0,prevu-prevuCouvert));source='réel explicite + occurrences restantes';}
    brut+=retenu;
    lignes.push({id:id,libelle:String(c&&c.libelle||''),frequence:String(c&&c.frequence||'Mensuelle'),occurrences:occs.length,prevu:Math.round(prevu*100)/100,reel:reel?Math.round(reel.total*100)/100:null,retenu:Math.round(retenu*100)/100,source:source});
  });
  if(erreurs.length)return{ok:false,total:Number(v&&v.cft1||0),erreur:'échec générateur canonique',erreurs:erreurs,ownerVersion:CERBERE_CF_SNAPSHOT_BRIDGE_20260914_VERSION};
  const arr=n=>Math.round((Number(n)||0)*100)/100;
  brut=arr(brut);const suspension=arr(Math.max(0,Number(v&&v.correctionSuspensions20260903||0))),total=arr(Math.max(0,brut-suspension));
  return{ok:true,total:total,brutAvantSuspensions:brut,suspensions:suspension,lignes:lignes,ownerVersion:CERBERE_CF_SNAPSHOT_BRIDGE_20260914_VERSION,doctrine:'Charges_fixes canonique toutes fréquences ; seules les opérations explicitement liées remplacent la prévision.'};
}

function corrigerCerbereChargesFixesSnapshot20260914_(base){
  if(!base||base.ok===false)return base;
  const ps=Array.isArray(base.periodes)?base.periodes:[];if(!ps.length)return base;
  base.diagnostic=base.diagnostic||{};const arr=n=>Math.round((Number(n)||0)*100)/100;

  const p1=ps[0],v1=p1&&p1.v37||(p1?p1.v37={}:{}),c1=v1&&v1.cockpit20260902||(v1?v1.cockpit20260902={}:{}),d1=base.diagnostic.p1Doctrine20260912||null;
  if(p1&&d1){
    const a1=construireCfCanoniqueSnapshotBridge20260914_(p1,v1);
    if(a1&&a1.ok){
      const cf1=arr(a1.total),p1v=Math.max(0,arr(Number(d1.ss1||0)+Number(d1.rt1||0)-cf1-Number(d1.het1||0)-Number(d1.cbHeritees||0))),cons1=Math.max(0,Number(c1.consommePilotable||0)),reste1=arr(p1v-cons1);
      d1.cft1=cf1;d1.cft1Audit=a1;d1.p1=p1v;d1.restePilotable=reste1;
      v1.cft1=cf1;v1.chargesFixesTotal=cf1;v1.cft1Audit20260912=a1;v1.ret1=reste1;v1.disponibleEnveloppes=reste1;
      c1.p1Total=p1v;c1.p1Cible=p1v;c1.pSoutenable=p1v;c1.budgetPilotableActualise=p1v;c1.ret1=reste1;c1.pDisponible=reste1;
      c1.detailActualise=Object.assign({},c1.detailActualise||{},{chargesFixesReevaluees:cf1,chargesFixesAudit:a1});
      p1.resteBudgetPilotable=reste1;
    }
  }

  if(ps.length>1){
    const p2=ps[1],v2=p2&&p2.v37||(p2?p2.v37={}:{}),c2=v2&&v2.cockpit20260902||(v2?v2.cockpit20260902={}:{}),d2=base.diagnostic.p2Doctrine20260913||null;
    if(p2&&d2){
      const a2=construireCfCanoniqueSnapshotBridge20260914_(p2,v2);
      if(a2&&a2.ok){
        const cf2=arr(a2.total),avant2=arr(Number(d2.ss2||0)+Number(d2.rt2||0)-cf2-Number(d2.het2||0)),p2v=Math.max(0,arr(avant2-Number(d2.reportCb||0))),cons2=Math.max(0,Number(c2.consommePilotable||0)),reste2=arr(p2v-cons2);
        d2.cft2=cf2;d2.cft2Audit=a2;d2.p2AvantReport=avant2;d2.p2=p2v;
        v2.cft1=cf2;v2.chargesFixesTotal=cf2;v2.cft1Audit20260912=a2;v2.p1AvantReportCb=avant2;v2.p1ApresReportCb=p2v;v2.ret1=reste2;v2.disponibleEnveloppes=reste2;
        c2.p1AvantReportCb=avant2;c2.p1Total=p2v;c2.p1Cible=p2v;c2.pSoutenable=p2v;c2.budgetPilotableActualise=p2v;c2.ret1=reste2;c2.pDisponible=reste2;
        c2.detailActualise=Object.assign({},c2.detailActualise||{},{chargesFixesReevaluees:cf2,chargesFixesAudit:a2});
        p2.resteBudgetPilotable=reste2;
      }
    }
  }
  base.diagnostic.cfSnapshotBridge20260914={version:CERBERE_CF_SNAPSHOT_BRIDGE_20260914_VERSION,applique:true,doctrine:'Adaptation de compatibilité : le référentiel Charges_fixes reste propriétaire ; le snapshot ne possède aucun calcul métier.'};
  return base;
}

function auditerPontCfSnapshotCerbere20260914(){
  let s=null;try{s=typeof lireModuleSnapshotGlobalBudgetSoft20260906_==='function'?lireModuleSnapshotGlobalBudgetSoft20260906_('cerbere'):null;}catch(e){}
  const r=corrigerCerbereChargesFixesSnapshot20260914_(s),d=r&&r.diagnostic&&r.diagnostic.p2Doctrine20260913||{},a=d&&d.cft2Audit||{};
  return{ok:!!(r&&r.ok!==false&&String(a.ownerVersion||'')===CERBERE_CF_SNAPSHOT_BRIDGE_20260914_VERSION),version:CERBERE_CF_SNAPSHOT_BRIDGE_20260914_VERSION,cf2:Number(d.cft2||0),p2:Number(d.p2||0),ownerVersion:String(a.ownerVersion||'')};
}
