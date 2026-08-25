const CERBERE_AUDIT_V377_VERSION='3.7.7';

/**
 * Passe de fiabilisation 3.7.7 issue de l'audit du classeur réel.
 * Objectifs :
 * - SS1 reconstruit depuis les soldes de relevés PDF + opérations définitives ;
 * - une recette R0 partiellement réalisée ne remplace plus tout son canon :
 *   on retient max(canon, réel constaté sur la catégorie) tant que l'identité
 *   fine des recettes n'est pas explicitement renseignée ;
 * - seules les Actions réellement rattachées à une charge fixe peuvent réduire CF ;
 * - les opérations certaines de charges fixes sont sorties des enveloppes pilotables ;
 * - les sorties réelles hors P0/CF pèsent immédiatement sur SCt1.
 */
function appliquerAuditCerbereV377_(base){
  if(!base||base.ok===false)return base;
  const operations=lireTable_('Operations')||[];
  const charges=lireTable_('Charges_fixes')||[];
  const rapprochements=lireTable_('Rapprochements_charges_fixes')||[];
  const controles=lireTable_('Controles_releves')||[];
  const actions=typeof lireFeuilleDynamiquePlan_==='function'?lireFeuilleDynamiquePlan_('Plan_Actions'):(lireTable_('Plan_Actions')||[]);
  const p0Cats=new Set(((base.p0&&base.p0.postes)||[]).map(x=>String(x.categorie||'').trim()).filter(Boolean));
  p0Cats.add('Divers');
  const r0Postes=(base.recettesCanon&&base.recettesCanon.postes)||[];
  const r0Cats=new Set(r0Postes.map(x=>String(x.categorie||'').trim()).filter(Boolean));
  const chargeById={};charges.forEach(c=>{const id=String(c.id||'').trim();if(id)chargeById[id]=c;});
  const opById={};operations.forEach(o=>{const id=String(o.id||'').trim();if(id)opById[id]=o;});
  const cfMatchByOp=construireLiensCfCertainsV377_(operations,charges,rapprochements);
  let report=null;

  (base.periodes||[]).forEach((p,i)=>{
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

    // 2) Rt1 : réel constaté sans effacer une prévision mensuelle sur simple
    // égalité de catégorie. Une réalisation partielle conserve le canon restant.
    const reelR0={};
    let recettesHorsR0=0;
    operations.forEach(o=>{
      const d=dateOperationBanqueV377_(o),m=Number(o.montant||0),cat=String(o.categorie||'').trim();
      if(!d||!dateDansCycleV377_(d,periode)||m<=0)return;
      if(r0Cats.has(cat))reelR0[cat]=(reelR0[cat]||0)+m;
      else recettesHorsR0+=m;
    });
    let rtSocle=0;
    r0Postes.forEach(x=>{
      const cat=String(x.categorie||'').trim(),canon=Number(x.montant||0),reel=Number(reelR0[cat]||0);
      rtSocle+=i===0?Math.max(canon,reel):canon;
    });
    const recettesPlan=Number(v.recettesEvenements||0);
    v.rt1=arrV377_(rtSocle+(i===0?recettesHorsR0:0)+recettesPlan);
    v.rt1Audit={socle:arrV377_(rtSocle),reelParCategorie:reelR0,horsR0:arrV377_(i===0?recettesHorsR0:0),plan:arrV377_(recettesPlan)};

    // 3) CFt1 : référentiel applicable au cycle + réductions de Plan uniquement
    // si l'Action pointe réellement vers un id de Charges_fixes.
    const cfRef=calculerCfReferenceCycleV377_(charges,actions,periode);
    const remplacements={};
    operations.forEach(o=>{
      const opId=String(o.id||'').trim(),cfId=cfMatchByOp[opId],d=dateOperationBanqueV377_(o);
      if(!cfId||!d||!dateDansCycleV377_(d,periode))return;
      remplacements[cfId]=(remplacements[cfId]||0)+Math.abs(Number(o.montant||0));
    });
    let cft1=0;
    cfRef.lignes.forEach(c=>{cft1+=Object.prototype.hasOwnProperty.call(remplacements,c.id)?Number(remplacements[c.id]):Number(c.montant||0);});
    v.chargesFixesTotal=arrV377_(cfRef.total);
    v.cft1=arrV377_(cft1);
    v.cf1Statut=i===0?'référence du cycle auditée':'projection depuis CF0 courant + Actions liées à une CF';
    v.cft1Audit={reference:arrV377_(cfRef.total),remplacements,actionsAppliquees:cfRef.actionsAppliquees};

    // 4) Retirer des molettes les opérations qui sont en réalité des CF certaines.
    const fuiteCfParCat={};
    operations.forEach(o=>{
      const opId=String(o.id||'').trim(),cfId=cfMatchByOp[opId];if(!cfId)return;
      const d=dateImputationCerbereV377_(o);if(!d||!dateDansCycleV377_(d,periode))return;
      const cat=String(o.categorie||'').trim();if(!p0Cats.has(cat))return;
      fuiteCfParCat[cat]=(fuiteCfParCat[cat]||0)+Math.abs(Number(o.montant||0));
    });
    let dpt1=0,ret1=0;
    (p.enveloppes||[]).forEach(x=>{
      const cat=String(x.categorie||'').trim();
      const brut=Number(x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x.reelImpute||0));
      const reel=Math.max(0,brut-Number(fuiteCfParCat[cat]||0));
      const plan=Number(x.planifie||0),allocation=Math.max(0,Number(x.prevu||0));
      const engage=arrV377_(reel+plan),reste=arrV377_(allocation-engage),proj=arrV377_(Math.max(allocation,engage));
      x.reelNetPrevisionnel=arrV377_(reel);x.engageV37=engage;x.resteV37=reste;x.dpt1=proj;
      dpt1+=proj;ret1+=reste;
    });
    v.dpt1=arrV377_(dpt1);v.ret1=arrV377_(ret1);v.fuiteCfCorrigeeParCategorie=fuiteCfParCat;

    // 5) HEt1 : toutes les sorties réelles hors P0 qui ne sont pas déjà une CF
    // certaine pèsent immédiatement sur la trésorerie. Les règlements techniques
    // de carte différée sont neutralisés pour éviter le double comptage.
    let het1=0;const heDetail={};
    operations.forEach(o=>{
      const d=dateImputationCerbereV377_(o),m=Number(o.montant||0),cat=String(o.categorie||'').trim();
      if(!d||!dateDansCycleV377_(d,periode)||m>=0||p0Cats.has(cat))return;
      const opId=String(o.id||'').trim();if(cfMatchByOp[opId])return;
      if(estReglementCbTechniqueV377_(o))return;
      const a=Math.abs(m);het1+=a;heDetail[cat]=(heDetail[cat]||0)+a;
    });
    v.het1=arrV377_(het1);v.horsPilotableAControler=v.het1;v.het1Detail=heDetail;

    // 6) SCt1 recalculé avec les briques auditées.
    v.dt1=arrV377_(v.cft1+v.dpt1+v.het1);
    v.sct1=arrV377_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
    const absorbable=arrV377_((p.enveloppes||[]).reduce((s,x)=>s+Math.max(0,Number(x.prevu||0)-Number(x.engageV37||0)),0));
    v.absorbableParAllocations=absorbable;
    v.incompressible=arrV377_(v.sct1<0?Math.max(0,Math.abs(v.sct1)-absorbable):0);
    p.resteBudgetPilotable=v.ret1;p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
    report=v.sct1;
  });

  base.version=CERBERE_AUDIT_V377_VERSION;
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.audit_377='SS1 banque, R0 partiel, CF liées, fuites CF hors molettes, HEt1 réel';
  return base;
}

function construireLiensCfCertainsV377_(operations,charges,rapprochements){
  const out={},chargeById={};charges.forEach(c=>{if(c.id)chargeById[String(c.id)]=c;});
  operations.forEach(o=>{const id=String(o.id||''),cf=String(o.charge_fixe_id||'').trim();if(id&&cf&&chargeById[cf])out[id]=cf;});
  (rapprochements||[]).forEach(r=>{
    const op=String(r.operation_id||''),cf=String(r.charge_fixe_id||'');if(!op||!cf||!chargeById[cf])return;
    const statut=normaliserV377_(r.statut),score=Number(r.score||0),em=Math.abs(Number(r.ecart_montant||0)),ej=Math.abs(Number(r.ecart_jours||0));
    if(statut.indexOf('valid')>=0||String(r.decision||'').trim()||(score>=70&&em<=0.01&&ej<=2))out[op]=cf;
  });
  // secours sûr : libellé très proche + montant exact.
  operations.forEach(o=>{const opId=String(o.id||'');if(!opId||out[opId])return;const nom=normaliserV377_(o.libelle||o.libelle_bancaire),mont=Math.abs(Number(o.montant||0));if(!nom||!mont)return;
    const candidats=charges.filter(c=>Math.abs(Math.abs(Number(c.montant||0))-mont)<=0.01&&(()=>{const n=normaliserV377_(c.libelle||c.libelle_bancaire);return n&&nom.length>=6&&(nom.indexOf(n)>=0||n.indexOf(nom)>=0);})());
    if(candidats.length===1)out[opId]=String(candidats[0].id||'');
  });
  return out;
}

function calculerSS1DepuisRelevesV377_(operations,controles,periode){
  const debut=debutJourV377_(periode&&periode.debut);if(!debut)return null;
  const candidats=(controles||[]).map(c=>({c,d:dateV377_(c.date_cloture)})).filter(x=>x.d&&x.d<debut&&Number.isFinite(Number(x.c.solde_cloture))).sort((a,b)=>b.d-a.d);
  if(!candidats.length)return null;
  const ref=candidats[0],compte=String(ref.c.compte||'');let montant=Number(ref.c.solde_cloture||0),nb=0;
  operations.forEach(o=>{const d=dateOperationBanqueV377_(o);if(!d||d<=ref.d||d>=debut)return;if(compte&&String(o.compte||'')!==compte)return;if(!operationDefinitiveV377_(o))return;montant+=Number(o.montant||0);nb++;});
  return {montant:arrV377_(montant),releveCloture:ref.d.toISOString(),soldeReleve:Number(ref.c.solde_cloture||0),operationsAjoutees:nb};
}

function calculerCfReferenceCycleV377_(charges,actions,periode){
  const lignes=[];let total=0;const actionsAppliquees=[];const actionParCf={};
  (actions||[]).forEach(a=>{const cf=String(a.source_id||'').trim();if(!cf)return;const typ=normaliserV377_(a.impact_type),d=dateV377_(a.date_effet||a.date_prevue);if(typ.indexOf('baisse_charge')<0)return;(actionParCf[cf]||(actionParCf[cf]=[])).push({a,d});});
  (charges||[]).forEach(c=>{if(!chargeApplicableCycleV377_(c,periode))return;const id=String(c.id||''),occ=occurrenceChargeCycleV377_(c,periode);let montant=Math.abs(Number(c.montant!=null?c.montant:c.montant_indicatif||0));let neutralisee=false;
    (actionParCf[id]||[]).forEach(x=>{if(x.d&&occ&&x.d<=occ){neutralisee=true;actionsAppliquees.push(String(x.a.libelle||id));}});
    if(neutralisee)return;const ligne={id,montant,libelle:String(c.libelle||'')};lignes.push(ligne);total+=montant;
  });
  return {total:arrV377_(total),lignes,actionsAppliquees};
}

function chargeApplicableCycleV377_(c,periode){
  const actif=String(c.actif==null?'true':c.actif).toLowerCase();if(['false','non','0'].includes(actif))return false;
  return !!occurrenceChargeCycleV377_(c,periode);
}
function occurrenceChargeCycleV377_(c,periode){
  const p0=debutJourV377_(periode&&periode.debut),p1=finJourV377_(periode&&periode.fin);if(!p0||!p1)return null;
  const dd=dateV377_(c.date_debut),df=dateV377_(c.date_fin);if(dd&&dd>p1)return null;if(df&&df<p0)return null;
  const freq=normaliserV377_(c.frequence||'mensuelle'),jour=Math.max(1,Math.min(31,Number(c.jour_execution||1)));
  if(freq.indexOf('ann')>=0){const base=dd||p0;for(let y=p0.getFullYear()-1;y<=p1.getFullYear()+1;y++){const d=new Date(y,base.getMonth(),Math.min(jour||base.getDate(),new Date(y,base.getMonth()+1,0).getDate()));if(d>=p0&&d<=p1&&(!dd||d>=dd)&&(!df||d<=df))return d;}return null;}
  for(let m=-1;m<=2;m++){const d=new Date(p0.getFullYear(),p0.getMonth()+m,Math.min(jour,new Date(p0.getFullYear(),p0.getMonth()+m+1,0).getDate()));if(d>=p0&&d<=p1&&(!dd||d>=dd)&&(!df||d<=df))return d;}return null;
}

/** Migration explicite, à lancer une fois : Opodo devient une CF annuelle historique. */
function migrerOpodoEnChargeFixeAnnuelleV377(){
  const ss=SpreadsheetApp.getActive();const sh=ss.getSheetByName('Charges_fixes');if(!sh)throw new Error('Charges_fixes introuvable.');
  const rows=lireTable_('Charges_fixes')||[];const exist=rows.find(c=>normaliserV377_(c.libelle).indexOf('opodo prime')>=0);if(exist)return {ok:true,existant:true,id:exist.id};
  const id=Utilities.getUuid(),headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),o={id,libelle:'Opodo Prime Ann',categorie:'Frais professionnels',montant:89.99,type:'depense',jour_execution:30,date_debut:new Date(2026,3,30),date_fin:new Date(2026,7,22),actif:false,commentaire:'Abonnement annuel résilié le 22/08/2026 ; conservé comme CF annuelle historique.',frequence:'Annuelle',libelle_bancaire:'OPODO PRIME ANN',tolerance:2,nature:'abonnement annuel'};
  sh.appendRow(headers.map(h=>Object.prototype.hasOwnProperty.call(o,h)?o[h]:''));
  // Lie l'opération historique et l'Action de résiliation à cette CF.
  const opSh=ss.getSheetByName('Operations');if(opSh){const oh=opSh.getRange(1,1,1,opSh.getLastColumn()).getValues()[0].map(String),iId=oh.indexOf('id'),iCf=oh.indexOf('charge_fixe_id');if(iId>=0&&iCf>=0){const vals=opSh.getRange(2,1,opSh.getLastRow()-1,oh.length).getValues();vals.forEach((r,k)=>{if(String(r[iId])==='f83fe6e5-1de6-4bf2-99c6-6cd7939a54f8')opSh.getRange(k+2,iCf+1).setValue(id);});}}
  const ac=ss.getSheetByName('Plan_Actions');if(ac){const ah=ac.getRange(1,1,1,ac.getLastColumn()).getValues()[0].map(String),iLib=ah.indexOf('libelle'),iSrc=ah.indexOf('source_id'),iTyp=ah.indexOf('source_type');if(iLib>=0&&iSrc>=0){const vals=ac.getRange(2,1,ac.getLastRow()-1,ah.length).getValues();vals.forEach((r,k)=>{if(normaliserV377_(r[iLib]).indexOf('resilier opodo')>=0){ac.getRange(k+2,iSrc+1).setValue(id);if(iTyp>=0)ac.getRange(k+2,iTyp+1).setValue('charge_fixe');}});}}
  SpreadsheetApp.flush();return {ok:true,id};
}

function dateImputationCerbereV377_(o){
  const da=dateV377_(o.date_achat),fin=String(o.carte_fin||'').trim();if(da&&fin){const d0=new Date(da.getFullYear(),da.getMonth(),28),cycleStart=da.getDate()>=28?d0:new Date(da.getFullYear(),da.getMonth()-1,28);return new Date(cycleStart.getFullYear(),cycleStart.getMonth()+1,28);}
  return dateOperationBanqueV377_(o);
}
function dateOperationBanqueV377_(o){return dateV377_(o.date_comptable||o.date||o.date_achat);}
function operationDefinitiveV377_(o){const s=normaliserV377_(o.statut_bancaire),src=normaliserV377_(o.source_bancaire);return s.indexOf('definit')>=0||src==='pdf';}
function estReglementCbTechniqueV377_(o){const n=normaliserV377_((o.categorie||'')+' '+(o.libelle||'')+' '+(o.libelle_bancaire||''));return n.indexOf('reglement cb')>=0||n.indexOf('releve carte')>=0||n.indexOf('facture carte globale')>=0;}
function dateDansCycleV377_(d,p){const a=debutJourV377_(p&&p.debut),b=finJourV377_(p&&p.fin);return !!(d&&a&&b&&d>=a&&d<=b);}
function dateV377_(v){if(!v)return null;const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d)?null:d;}
function debutJourV377_(v){const d=dateV377_(v);if(!d)return null;return new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0,0);}
function finJourV377_(v){const d=dateV377_(v);if(!d)return null;return new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59,999);}
function normaliserV377_(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function arrV377_(n){return Math.round((Number(n)||0)*100)/100;}
