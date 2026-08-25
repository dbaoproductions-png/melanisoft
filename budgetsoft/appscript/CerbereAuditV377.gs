const CERBERE_AUDIT_V377_VERSION='3.7.9';

/**
 * Cerbère 3.7.9 — audit comptable durci.
 * Correctif de non-régression : lireTable_ ne sait lire que les tables enregistrées
 * dans TABLES. Les feuilles techniques/dynamiques sont donc lues par leurs lecteurs
 * propres ou par lireFeuilleDynamiqueCerbereV379_.
 */
function appliquerAuditCerbereV377_(base){
  if(!base||base.ok===false)return base;
  const operations=tableauCerbereV379_(lireTable_('Operations'));
  const charges=tableauCerbereV379_(lireTable_('Charges_fixes'));
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'
    ? tableauCerbereV379_(lireRapprochementsChargesFixes())
    : lireFeuilleDynamiqueCerbereV379_('Rapprochements_charges_fixes');
  const controles=lireFeuilleDynamiqueCerbereV379_('Controles_releves');
  const actions=typeof lireFeuilleDynamiquePlan_==='function'
    ? tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Actions'))
    : lireFeuilleDynamiqueCerbereV379_('Plan_Actions');

  const periodes=tableauCerbereV379_(base.periodes);
  const p0Postes=tableauCerbereV379_(base.p0&&base.p0.postes);
  const p0Cats=new Set(p0Postes.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
  p0Cats.add('Divers');
  const r0Postes=tableauCerbereV379_(base.recettesCanon&&base.recettesCanon.postes);
  const r0Cats=new Set(r0Postes.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
  const cfMatchByOp=construireLiensCfCertainsV377_(operations,charges,rapprochements);
  let report=null;

  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={});
    const periode=p.periode||p;

    // 1) SS1 : M est ancré sur la banque ; M+1 hérite de M corrigé.
    if(i===0){
      const ss=calculerSS1DepuisRelevesV377_(operations,controles,periode);
      if(ss&&Number.isFinite(ss.montant)){
        v.ss1=arrV377_(ss.montant);v.soldeOuverture=v.ss1;
        v.ss1Statut='reconstitué depuis relevé PDF + opérations définitives';
        v.ss1Audit=ss;
      }
    }else if(report!==null){
      v.ss1=arrV377_(report);v.soldeOuverture=v.ss1;
      v.ss1Statut='projeté depuis la fin Cerbère corrigée de la période précédente';
    }

    // 2) Rt1 : une recette partielle ne remplace pas tout son canon sur simple catégorie.
    const reelR0={};
    let recettesHorsR0=0;
    operations.forEach(o=>{
      const d=dateOperationBanqueV377_(o),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim();
      if(!d||!dateDansCycleV377_(d,periode)||m<=0)return;
      if(r0Cats.has(cat))reelR0[cat]=(reelR0[cat]||0)+m;
      else recettesHorsR0+=m;
    });
    let rtSocle=0;
    r0Postes.forEach(x=>{
      const cat=String(x&&x.categorie||'').trim(),canon=Number(x&&x.montant||0),reel=Number(reelR0[cat]||0);
      rtSocle+=i===0?Math.max(canon,reel):canon;
    });
    const recettesPlan=Number(v.recettesEvenements||0);
    v.rt1=arrV377_(rtSocle+(i===0?recettesHorsR0:0)+recettesPlan);
    v.rt1Audit={socle:arrV377_(rtSocle),reelParCategorie:reelR0,horsR0:arrV377_(i===0?recettesHorsR0:0),plan:arrV377_(recettesPlan)};

    // 3) CFt1 : référentiel applicable + Actions réellement liées à une CF.
    const cfRef=calculerCfReferenceCycleV377_(charges,actions,periode);
    const remplacements={};
    operations.forEach(o=>{
      const opId=String(o&&o.id||'').trim(),cfId=cfMatchByOp[opId],d=dateOperationBanqueV377_(o);
      if(!cfId||!d||!dateDansCycleV377_(d,periode))return;
      remplacements[cfId]=(remplacements[cfId]||0)+Math.abs(Number(o&&o.montant||0));
    });
    let cft1=0;
    tableauCerbereV379_(cfRef.lignes).forEach(c=>{cft1+=Object.prototype.hasOwnProperty.call(remplacements,c.id)?Number(remplacements[c.id]):Number(c.montant||0);});
    v.chargesFixesTotal=arrV377_(cfRef.total);
    v.cft1=arrV377_(cft1);
    v.cf1Statut=i===0?'référence du cycle auditée':'projection depuis CF0 courant + Actions liées à une CF';
    v.cft1Audit={reference:arrV377_(cfRef.total),remplacements,actionsAppliquees:tableauCerbereV379_(cfRef.actionsAppliquees)};

    // 4) Les CF certaines sont retirées des molettes.
    const fuiteCfParCat={};
    operations.forEach(o=>{
      const opId=String(o&&o.id||'').trim(),cfId=cfMatchByOp[opId];if(!cfId)return;
      const d=dateImputationCerbereV377_(o);if(!d||!dateDansCycleV377_(d,periode))return;
      const cat=String(o&&o.categorie||'').trim();if(!p0Cats.has(cat))return;
      fuiteCfParCat[cat]=(fuiteCfParCat[cat]||0)+Math.abs(Number(o&&o.montant||0));
    });
    const enveloppes=tableauCerbereV379_(p.enveloppes);
    let dpt1=0,ret1=0;
    enveloppes.forEach(x=>{
      const cat=String(x&&x.categorie||'').trim();
      const brut=Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0));
      const reel=Math.max(0,brut-Number(fuiteCfParCat[cat]||0));
      const plan=Number(x&&x.planifie||0),allocation=Math.max(0,Number(x&&x.prevu||0));
      const engage=arrV377_(reel+plan),reste=arrV377_(allocation-engage),proj=arrV377_(Math.max(allocation,engage));
      x.reelNetPrevisionnel=arrV377_(reel);x.engageV37=engage;x.resteV37=reste;x.dpt1=proj;
      dpt1+=proj;ret1+=reste;
    });
    v.dpt1=arrV377_(dpt1);v.ret1=arrV377_(ret1);v.fuiteCfCorrigeeParCategorie=fuiteCfParCat;

    // 5) Toutes les sorties réelles hors P0/CF pèsent immédiatement sur SCt1.
    let het1=0;const heDetail={};
    operations.forEach(o=>{
      const d=dateImputationCerbereV377_(o),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim();
      if(!d||!dateDansCycleV377_(d,periode)||m>=0||p0Cats.has(cat))return;
      const opId=String(o&&o.id||'').trim();if(cfMatchByOp[opId])return;
      if(estReglementCbTechniqueV377_(o))return;
      const a=Math.abs(m);het1+=a;heDetail[cat]=(heDetail[cat]||0)+a;
    });
    v.het1=arrV377_(het1);v.horsPilotableAControler=v.het1;v.het1Detail=heDetail;

    // 6) SCt1 et garde-fous de cohérence.
    v.dt1=arrV377_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));
    v.sct1=arrV377_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
    const absorbable=arrV377_(enveloppes.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)-Number(x&&x.engageV37||0)),0));
    v.absorbableParAllocations=absorbable;
    v.incompressible=arrV377_(v.sct1<0?Math.max(0,Math.abs(v.sct1)-absorbable):0);
    v.auditInvariantV379=verifierInvariantPeriodeCerbereV379_(p);
    p.resteBudgetPilotable=v.ret1;p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
    report=v.sct1;
  });

  base.version=CERBERE_AUDIT_V377_VERSION;
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.audit_379='lectures sûres + SS1 banque + R0 partiel + CF liées + HEt1 réel + invariants';
  base.diagnostic.non_regression=diagnostiquerStructureCerbereV379_(base);
  return base;
}

/** Lecture pure d'une feuille non déclarée dans TABLES. */
function lireFeuilleDynamiqueCerbereV379_(nom){
  try{
    const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(String(nom||''));
    if(!sh||sh.getLastRow()<2||sh.getLastColumn()<1)return[];
    const largeur=sh.getLastColumn();
    const hs=sh.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim());
    if(!hs.length||!hs.some(Boolean))return[];
    const vals=sh.getRange(2,1,sh.getLastRow()-1,largeur).getValues();
    return vals.filter(r=>Array.isArray(r)&&r.some(v=>v!==''&&v!==null)).map(r=>{
      const o={};hs.forEach((h,i)=>{if(h)o[h]=r[i] instanceof Date?r[i].toISOString():r[i];});return o;
    });
  }catch(e){return[];}
}
function tableauCerbereV379_(v){return Array.isArray(v)?v:[];}

function diagnostiquerStructureCerbereV379_(base){
  const ps=tableauCerbereV379_(base&&base.periodes),erreurs=[];
  if(ps.length<2)erreurs.push('moins de deux périodes disponibles');
  ps.slice(0,2).forEach((p,i)=>{
    if(!p||typeof p!=='object')erreurs.push('période '+(i+1)+' absente');
    else if(!Array.isArray(p.enveloppes))erreurs.push('enveloppes période '+(i+1)+' absentes');
    const v=p&&p.v37||{};['ss1','rt1','cft1','dpt1','het1','sct1'].forEach(k=>{if(!Number.isFinite(Number(v[k])))erreurs.push(k+' période '+(i+1)+' non numérique');});
  });
  if(ps.length>=2){const a=ps[0]&&ps[0].v37||{},b=ps[1]&&ps[1].v37||{};if(Math.abs(Number(b.ss1||0)-Number(a.sct1||0))>0.011)erreurs.push('report M vers M+1 incohérent');}
  return {ok:!erreurs.length,erreurs};
}
function verifierInvariantPeriodeCerbereV379_(p){
  const v=p&&p.v37||{},attendu=arrV377_(Number(v.ss1||0)+Number(v.rt1||0)-Number(v.cft1||0)-Number(v.dpt1||0)-Number(v.het1||0)),reel=arrV377_(Number(v.sct1||0));
  return {ok:Math.abs(attendu-reel)<0.011,attendu,reel,ecart:arrV377_(reel-attendu)};
}

function construireLiensCfCertainsV377_(operations,charges,rapprochements){
  operations=tableauCerbereV379_(operations);charges=tableauCerbereV379_(charges);rapprochements=tableauCerbereV379_(rapprochements);
  const out={},chargeById={};charges.forEach(c=>{if(c&&c.id)chargeById[String(c.id)]=c;});
  operations.forEach(o=>{const id=String(o&&o.id||''),cf=String(o&&o.charge_fixe_id||'').trim();if(id&&cf&&chargeById[cf])out[id]=cf;});
  rapprochements.forEach(r=>{
    const op=String(r&&r.operation_id||''),cf=String(r&&r.charge_fixe_id||'');if(!op||!cf||!chargeById[cf])return;
    const statut=normaliserV377_(r.statut),score=Number(r.score||0),em=Math.abs(Number(r.ecart_montant||0)),ej=Math.abs(Number(r.ecart_jours||0));
    if(statut.indexOf('valid')>=0||String(r.decision||'').trim()||(score>=70&&em<=0.01&&ej<=2))out[op]=cf;
  });
  operations.forEach(o=>{const opId=String(o&&o.id||'');if(!opId||out[opId])return;const nom=normaliserV377_(o.libelle||o.libelle_bancaire),mont=Math.abs(Number(o.montant||0));if(!nom||!mont)return;
    const candidats=charges.filter(c=>Math.abs(Math.abs(Number(c&&c.montant||0))-mont)<=0.01&&(()=>{const n=normaliserV377_(c&&c.libelle||c&&c.libelle_bancaire);return n&&nom.length>=6&&(nom.indexOf(n)>=0||n.indexOf(nom)>=0);})());
    if(candidats.length===1)out[opId]=String(candidats[0].id||'');
  });
  return out;
}

function calculerSS1DepuisRelevesV377_(operations,controles,periode){
  operations=tableauCerbereV379_(operations);controles=tableauCerbereV379_(controles);
  const debut=debutJourV377_(periode&&periode.debut);if(!debut)return null;
  const candidats=controles.map(c=>({c,d:dateV377_(c&&c.date_cloture)})).filter(x=>x.d&&x.d<debut&&Number.isFinite(Number(x.c&&x.c.solde_cloture))).sort((a,b)=>b.d-a.d);
  if(!candidats.length)return null;
  const ref=candidats[0],compte=String(ref.c.compte||'');let montant=Number(ref.c.solde_cloture||0),nb=0;
  operations.forEach(o=>{const d=dateOperationBanqueV377_(o);if(!d||d<=ref.d||d>=debut)return;if(compte&&String(o&&o.compte||'')!==compte)return;if(!operationDefinitiveV377_(o))return;montant+=Number(o&&o.montant||0);nb++;});
  return {montant:arrV377_(montant),releveCloture:ref.d.toISOString(),soldeReleve:Number(ref.c.solde_cloture||0),operationsAjoutees:nb};
}

function calculerCfReferenceCycleV377_(charges,actions,periode){
  charges=tableauCerbereV379_(charges);actions=tableauCerbereV379_(actions);
  const lignes=[];let total=0;const actionsAppliquees=[];const actionParCf={};
  actions.forEach(a=>{const cf=String(a&&a.source_id||'').trim();if(!cf)return;const typ=normaliserV377_(a.impact_type),d=dateV377_(a.date_effet||a.date_prevue);if(typ.indexOf('baisse charge')<0&&typ.indexOf('baisse_charge')<0)return;(actionParCf[cf]||(actionParCf[cf]=[])).push({a,d});});
  charges.forEach(c=>{if(!chargeApplicableCycleV377_(c,periode))return;const id=String(c&&c.id||''),occ=occurrenceChargeCycleV377_(c,periode);const montant=Math.abs(Number(c&&c.montant!=null?c.montant:c&&c.montant_indicatif||0));let neutralisee=false;
    tableauCerbereV379_(actionParCf[id]).forEach(x=>{if(x.d&&occ&&x.d<=occ){neutralisee=true;actionsAppliquees.push(String(x.a&&x.a.libelle||id));}});
    if(neutralisee)return;lignes.push({id,montant,libelle:String(c&&c.libelle||'')});total+=montant;
  });
  return {total:arrV377_(total),lignes,actionsAppliquees};
}

function chargeApplicableCycleV377_(c,periode){
  const actif=String(c&&c.actif==null?'true':c.actif).toLowerCase();if(['false','non','0'].includes(actif))return false;
  return !!occurrenceChargeCycleV377_(c,periode);
}
function occurrenceChargeCycleV377_(c,periode){
  const p0=debutJourV377_(periode&&periode.debut),p1=finJourV377_(periode&&periode.fin);if(!p0||!p1)return null;
  const dd=dateV377_(c&&c.date_debut),df=dateV377_(c&&c.date_fin);if(dd&&dd>p1)return null;if(df&&df<p0)return null;
  const freq=normaliserV377_(c&&c.frequence||'mensuelle'),jour=Math.max(1,Math.min(31,Number(c&&c.jour_execution||1)));
  if(freq.indexOf('ann')>=0){const base=dd||p0;for(let y=p0.getFullYear()-1;y<=p1.getFullYear()+1;y++){const d=new Date(y,base.getMonth(),Math.min(jour||base.getDate(),new Date(y,base.getMonth()+1,0).getDate()));if(d>=p0&&d<=p1&&(!dd||d>=dd)&&(!df||d<=df))return d;}return null;}
  for(let m=-1;m<=2;m++){const d=new Date(p0.getFullYear(),p0.getMonth()+m,Math.min(jour,new Date(p0.getFullYear(),p0.getMonth()+m+1,0).getDate()));if(d>=p0&&d<=p1&&(!dd||d>=dd)&&(!df||d<=df))return d;}return null;
}

function migrerOpodoEnChargeFixeAnnuelleV377(){
  const ss=SpreadsheetApp.getActive();const sh=ss.getSheetByName('Charges_fixes');if(!sh)throw new Error('Charges_fixes introuvable.');
  const rows=tableauCerbereV379_(lireTable_('Charges_fixes'));const exist=rows.find(c=>normaliserV377_(c&&c.libelle).indexOf('opodo prime')>=0);if(exist)return {ok:true,existant:true,id:exist.id};
  const id=Utilities.getUuid(),headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),o={id,libelle:'Opodo Prime Ann',categorie:'Frais professionnels',montant:89.99,type:'depense',jour_execution:30,date_debut:new Date(2026,3,30),date_fin:new Date(2026,7,22),actif:false,commentaire:'Abonnement annuel résilié le 22/08/2026 ; conservé comme CF annuelle historique.',frequence:'Annuelle',libelle_bancaire:'OPODO PRIME ANN',tolerance:2,nature:'abonnement annuel'};
  sh.appendRow(headers.map(h=>Object.prototype.hasOwnProperty.call(o,h)?o[h]:''));
  const opSh=ss.getSheetByName('Operations');if(opSh&&opSh.getLastRow()>1){const oh=opSh.getRange(1,1,1,opSh.getLastColumn()).getValues()[0].map(String),iId=oh.indexOf('id'),iCf=oh.indexOf('charge_fixe_id');if(iId>=0&&iCf>=0){const vals=opSh.getRange(2,1,opSh.getLastRow()-1,oh.length).getValues();vals.forEach((r,k)=>{if(String(r[iId])==='f83fe6e5-1de6-4bf2-99c6-6cd7939a54f8')opSh.getRange(k+2,iCf+1).setValue(id);});}}
  const ac=ss.getSheetByName('Plan_Actions');if(ac&&ac.getLastRow()>1){const ah=ac.getRange(1,1,1,ac.getLastColumn()).getValues()[0].map(String),iLib=ah.indexOf('libelle'),iSrc=ah.indexOf('source_id'),iTyp=ah.indexOf('source_type');if(iLib>=0&&iSrc>=0){const vals=ac.getRange(2,1,ac.getLastRow()-1,ah.length).getValues();vals.forEach((r,k)=>{if(normaliserV377_(r[iLib]).indexOf('resilier opodo')>=0){ac.getRange(k+2,iSrc+1).setValue(id);if(iTyp>=0)ac.getRange(k+2,iTyp+1).setValue('charge_fixe');}});}}
  SpreadsheetApp.flush();return {ok:true,id};
}

function dateImputationCerbereV377_(o){
  const da=dateV377_(o&&o.date_achat),fin=String(o&&o.carte_fin||'').trim();if(da&&fin){const d0=new Date(da.getFullYear(),da.getMonth(),28),cycleStart=da.getDate()>=28?d0:new Date(da.getFullYear(),da.getMonth()-1,28);return new Date(cycleStart.getFullYear(),cycleStart.getMonth()+1,28);}
  return dateOperationBanqueV377_(o);
}
function dateOperationBanqueV377_(o){return dateV377_(o&&(o.date_comptable||o.date||o.date_achat));}
function operationDefinitiveV377_(o){const s=normaliserV377_(o&&o.statut_bancaire),src=normaliserV377_(o&&o.source_bancaire);return s.indexOf('definit')>=0||src==='pdf';}
function estReglementCbTechniqueV377_(o){const n=normaliserV377_((o&&o.categorie||'')+' '+(o&&o.libelle||'')+' '+(o&&o.libelle_bancaire||''));return n.indexOf('reglement cb')>=0||n.indexOf('releve carte')>=0||n.indexOf('facture carte globale')>=0;}
function dateDansCycleV377_(d,p){const a=debutJourV377_(p&&p.debut),b=finJourV377_(p&&p.fin);return !!(d&&a&&b&&d>=a&&d<=b);}
function dateV377_(v){if(!v)return null;const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d)?null:d;}
function debutJourV377_(v){const d=dateV377_(v);if(!d)return null;return new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0,0);}
function finJourV377_(v){const d=dateV377_(v);if(!d)return null;return new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59,999);}
function normaliserV377_(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function arrV377_(n){return Math.round((Number(n)||0)*100)/100;}
