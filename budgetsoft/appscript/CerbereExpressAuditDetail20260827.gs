const CERBERE_EXPRESS_AUDIT_DETAIL_VERSION = '2026-08-27.1';

/**
 * Audit détaillé LECTURE SEULE du moteur Cerbère Express.
 * Objectif : expliquer les masses réellement comptées avant toute nouvelle correction.
 * Ne modifie aucune feuille ni propriété.
 */
function auditerDetailCerbereExpress20260827() {
  const express = chargerCerbereExpress20260827();
  const cerbere = chargerCerbereV374();
  if (!express || express.ok === false) return express;
  if (!cerbere || cerbere.ok === false) return cerbere;

  const p = Array.isArray(cerbere.periodes) ? cerbere.periodes[0] : null;
  if (!p || !p.periode) throw new Error('Période courante Cerbère introuvable.');

  const maintenant = new Date();
  const debut = dateExpress_(p.periode.debut);
  const fin = dateExpress_(p.periode.fin);
  const cats = new Set((p.enveloppes || []).map(x => String(x && x.categorie || '').trim()).filter(Boolean));

  const operationsBrutes = lireTable_('Operations') || [];
  const operations = typeof dedoublonnerOperationsCartesBudgetSoft_ === 'function'
    ? dedoublonnerOperationsCartesBudgetSoft_(operationsBrutes)
    : operationsBrutes;
  const charges = lireTable_('Charges_fixes') || [];
  const rapprochements = typeof lireRapprochementsChargesFixes === 'function' ? (lireRapprochementsChargesFixes() || []) : [];
  const liensCf = typeof construireLiensChargesFixesCommuns_ === 'function'
    ? construireLiensChargesFixesCommuns_(operations, charges, rapprochements)
    : {};

  const incluses = [];
  const parCategorie = {};
  const parSource = {};
  let total = 0;
  let nbCbStructurees = 0;
  let montantCbStructurees = 0;
  let nbNonCb = 0;
  let montantNonCb = 0;

  operations.forEach(o => {
    const montant = Number(o && o.montant || 0);
    if (!Number.isFinite(montant) || montant >= 0) return;
    const categorie = String(o && o.categorie || '').trim();
    if (!cats.has(categorie)) return;
    const d = dateAchatExpress_(o);
    if (!d || d > maintenant || !dansCycleExpress_(d, debut, fin)) return;

    const id = String(o && o.id || '').trim();
    const cfId = String((liensCf && liensCf[id]) || o && o.charge_fixe_id || '').trim();
    if (cfId) return;

    const a = Math.abs(montant);
    const cb = typeof estCarteStructureeBudgetSoft_ === 'function'
      ? !!estCarteStructureeBudgetSoft_(o, montant)
      : !!String(o && o.date_achat || '').trim();
    const src = String(o && o.source_bancaire || o && o.source || '').trim() || '(sans source)';
    const libelle = String(o && (o.libelle_bancaire || o.libelle || o.details) || '').trim();
    const dateComptable = dateExpress_(o && o.date_comptable);
    const dateAchat = typeof dateAchatMetierBudgetSoft_ === 'function' ? dateAchatMetierBudgetSoft_(o) : dateExpress_(o && o.date_achat);

    total += a;
    parCategorie[categorie] = Number(parCategorie[categorie] || 0) + a;
    parSource[src] = Number(parSource[src] || 0) + a;
    if (cb) { nbCbStructurees++; montantCbStructurees += a; }
    else { nbNonCb++; montantNonCb += a; }

    incluses.push({
      id,
      categorie,
      montant:arrExpress_(a),
      dateExpress:formatDateExpress_(d),
      dateAchat:dateAchat ? formatDateExpress_(dateAchat) : '',
      dateComptable:dateComptable ? formatDateExpress_(dateComptable) : '',
      cbStructuree:cb,
      carteFin:String(o && o.carte_fin || ''),
      source:src,
      statutBancaire:String(o && o.statut_bancaire || ''),
      type:String(o && o.type || ''),
      libelle
    });
  });

  Object.keys(parCategorie).forEach(k => parCategorie[k] = arrExpress_(parCategorie[k]));
  Object.keys(parSource).forEach(k => parSource[k] = arrExpress_(parSource[k]));
  incluses.sort((a,b)=>b.montant-a.montant);

  const comparaisonCerbere = (p.enveloppes || []).map(x => {
    const cat = String(x && x.categorie || '').trim();
    const expressReel = arrExpress_(parCategorie[cat] || 0);
    const reelImpute = arrExpress_(Number(x && x.reelImpute || 0));
    const reelNet = arrExpress_(Number(x && (x.reelNetPrevisionnel != null ? x.reelNetPrevisionnel : x.reelImpute) || 0));
    return {
      categorie:cat,
      p0:arrExpress_(Number(x && x.canon || 0)),
      p1:arrExpress_(Number(x && x.prevu || 0)),
      expressDateAchat:expressReel,
      cerbereReelImpute:reelImpute,
      cerbereReelNet:reelNet,
      ecartExpressVsCerbereNet:arrExpress_(expressReel-reelNet)
    };
  });

  const topParCategorie = {};
  Array.from(cats).forEach(cat => {
    topParCategorie[cat] = incluses.filter(x=>x.categorie===cat).slice(0,12);
  });

  const out = {
    ok:true,
    version:CERBERE_EXPRESS_AUDIT_DETAIL_VERSION,
    lectureSeule:true,
    cycle:{debut:formatDateExpress_(debut),fin:formatDateExpress_(fin)},
    synthese:{
      operationsSource:operationsBrutes.length,
      operationsApresDedoublonnage:operations.length,
      depensesIncluses:incluses.length,
      montantInclus:arrExpress_(total),
      cbStructurees:{nombre:nbCbStructurees,montant:arrExpress_(montantCbStructurees)},
      nonCb:{nombre:nbNonCb,montant:arrExpress_(montantNonCb)}
    },
    parCategorie,
    parSource,
    comparaisonCerbere,
    top20:incluses.slice(0,20),
    topParCategorie
  };
  console.log(JSON.stringify(out));
  return out;
}

/**
 * Composition A/B pure de Cerbère Express à partir d'un cockpit Cerbère déjà chargé.
 * Réservée à l'audit de performance : aucun chemin de production ne l'appelle.
 */
function composerCerbereExpressDepuisCockpitAudit20260910_(cerbere) {
  if (!cerbere || cerbere.ok === false) return cerbere || {ok:false, erreur:'Cerbère indisponible'};
  const ps=Array.isArray(cerbere.periodes)?cerbere.periodes:[];
  const p=ps[0]||null,p2=ps[1]||null;
  if(!p||!p.periode)throw new Error('Période courante Cerbère introuvable.');
  const maintenant=new Date(),debut=dateExpress_(p.periode.debut),fin=dateExpress_(p.periode.fin);
  if(!debut||!fin)throw new Error('Bornes du cycle Cerbère invalides.');
  const progression=progressionCycleExpress_(debut,fin,maintenant);
  const c=p.v37&&p.v37.cockpit20260902||{},c2=p2&&p2.v37&&p2.v37.cockpit20260902||{};
  const lignes=(p.enveloppes||[]).map(function(x){
    const allocation=arrExpress_(Math.max(0,Number(x&&x.prevu||0)));
    const consomme=arrExpress_(Math.max(0,Number(x&&x.reelNetPrevisionnel!=null?x.reelNetPrevisionnel:(x&&x.reelImpute||0))));
    const reste=arrExpress_(allocation-consomme),part=allocation>0?consomme/allocation:(consomme>0?1:0);
    return{categorie:String(x&&x.categorie||'').trim(),allocation:allocation,canon:arrExpress_(Math.max(0,Number(x&&x.canon||0))),consomme:consomme,reste:reste,partConsommee:arrExpress_(part*100),partTempsPct:arrExpress_(progression.ratio*100),vigilance:vigilanceExpress_(part,progression.ratio,reste,allocation,progression.jour)};
  }).filter(function(x){return x.categorie;});
  const totalAllocation=arrExpress_(Number(c.p1Total!=null?c.p1Total:(c.p1Cible!=null?c.p1Cible:(p.budgetReparti||0))));
  const totalConsomme=arrExpress_(Number(c.consommePilotable!=null?c.consommePilotable:lignes.reduce(function(s,x){return s+x.consomme;},0)));
  const totalReste=arrExpress_(Number(c.ret1!=null?c.ret1:totalAllocation-totalConsomme));
  const reparti=arrExpress_(Number(c.budgetRepartiMolettes!=null?c.budgetRepartiMolettes:lignes.reduce(function(s,x){return s+x.allocation;},0)));
  const aVentiler=arrExpress_(Number(c.margeARepartir!=null?c.margeARepartir:totalAllocation-reparti));
  const app=cerbere.cockpit20260902&&cerbere.cockpit20260902.appreciation||{};
  const meteo={niveau:String(app.niveau||'vert'),emoji:String(app.emoji||'🌤️'),libelle:String(app.titre||'Cap tenu'),resume:String(app.resume||''),raisons:app.consigne?[String(app.consigne)]:[]};
  const consigne={niveau:meteo.niveau,texte:String(app.consigne||'Cap tenu.'),raison:'appréciation du cockpit Cerbère'};
  return{ok:true,version:CERBERE_EXPRESS_VERSION,moteurSource:String(cerbere.version||''),cockpitVersion:String(cerbere.cockpit20260902&&cerbere.cockpit20260902.version||''),genereLe:Utilities.formatDate(maintenant,Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss"),doctrine:'Express présente les valeurs déjà validées par le cockpit Cerbère ; aucun recalcul budgétaire autonome.',performance:{dureeMs:0,source:'cockpit Cerbère précalculé · audit'},cycle:{debut:formatDateExpress_(debut),fin:formatDateExpress_(fin),jour:progression.jour,jours:progression.jours,progressionPct:arrExpress_(progression.ratio*100)},referenceP1:{totalP0:arrExpress_(c.p0Total||0),totalP1:totalAllocation,ecartP1P0:arrExpress_(c.surplusVsP0||0),source:'v37.cockpit20260902'},pilotable:{allocation:totalAllocation,consomme:totalConsomme,reste:totalReste,reparti:reparti,aVentiler:aVentiler,lignes:lignes},pluxee:construirePluxeeExpress_(),contexteFinancier:{pilotableInstantT:arrExpress_(c.budgetPilotableActualise||0),p1:totalAllocation,aVentiler:aVentiler,prochainCycle:arrExpress_(c2.p1Total||c2.budgetPilotableActualise||0),reportCbCycleSuivant:arrExpress_(c2.reportCbCycle||0),surplusDeficitCycleSuivant:arrExpress_(c2.margeARepartir||0)},meteo:meteo,consigneSaillante:consigne};
}

function signatureCerbereExpressAudit20260910_(x){
  if(!x||x.ok===false)return{ok:false,erreur:String(x&&x.erreur||'')};
  return{ok:true,version:x.version||'',moteurSource:x.moteurSource||'',cockpitVersion:x.cockpitVersion||'',doctrine:x.doctrine||'',cycle:x.cycle||null,referenceP1:x.referenceP1||null,pilotable:x.pilotable||null,pluxee:x.pluxee||null,contexteFinancier:x.contexteFinancier||null,meteo:x.meteo||null,consigneSaillante:x.consigneSaillante||null};
}

/**
 * Audit A/B lecture seule : dans le snapshot, Cerbère est déjà calculé avant Express.
 * Vérifie qu'Express peut être composé depuis ce cockpit sans le recalculer.
 */
function auditerCandidatReutilisationCerbereExpressSnapshotBudgetSoft20260910(){
  const tGlobal=Date.now();
  const out=avecContexteLectureBudgetSoft20260827_('audit-ab-express-depuis-cerbere-20260910',function(){
    let t=Date.now();const baseline=chargerCerbereExpress20260827();const baselineMs=Date.now()-t;
    t=Date.now();const cerbere=chargerCerbereCockpit20260902();const cerbereMs=Date.now()-t;
    t=Date.now();const candidat=composerCerbereExpressDepuisCockpitAudit20260910_(cerbere);const compositionMs=Date.now()-t;
    const a=signatureCerbereExpressAudit20260910_(baseline),b=signatureCerbereExpressAudit20260910_(candidat);
    const identique=JSON.stringify(a)===JSON.stringify(b);
    return{ok:identique,version:'2026-09-10.1',lectureSeule:true,aucuneModification:true,comparaison:{identique:identique,baseline:a,candidat:b},durees:{baselineExpressMs:baselineMs,chargementCerbereSeulMs:cerbereMs,compositionDepuisCerbereDejaChargeMs:compositionMs,gainTheoriqueSnapshotMs:Math.max(0,baselineMs-compositionMs)},decision:identique?'CANDIDAT_AUTORISE_POUR_ETAPE_SUIVANTE':'REJETER_CANDIDAT',doctrine:'Aucune optimisation appliquée. Le snapshot ne pourra réutiliser son Cerbère déjà calculé pour Express que si les signatures sont strictement identiques.'};
  });
  out.dureeTotaleMs=Date.now()-tGlobal;
  console.log('[AUDIT PERF A/B Express depuis Cerbère] '+JSON.stringify(out));
  return out;
}
