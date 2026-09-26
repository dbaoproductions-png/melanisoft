const BUDGETSOFT_AI_REPORT_20260926_VERSION='2026-09-26.1';

function arrRapportIa20260926_(n){return Math.round((Number(n)||0)*100)/100;}
function txtRapportIa20260926_(v){return String(v==null?'':v).trim();}
function dateRapportIa20260926_(v){
  if(!v)return'';
  const d=v instanceof Date?new Date(v):new Date(v);
  return isNaN(d)?String(v):Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function moisRapportIa20260926_(v){
  if(!v)return'';
  const d=v instanceof Date?new Date(v):new Date(v);
  return isNaN(d)?'':Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM');
}
function actifRapportIa20260926_(v){return v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0';}
function mdRapportIa20260926_(v){return String(v==null?'':v).replace(/\|/g,'\\|').replace(/\r?\n/g,' ');}
function eurRapportIa20260926_(n){return arrRapportIa20260926_(n).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}

function nettoyerTechniqueRapportIa20260926_(v,depth){
  depth=Number(depth||0);if(depth>12)return'[profondeur limitée]';
  if(v==null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;
  if(v instanceof Date)return v.toISOString();
  if(Array.isArray(v))return v.map(x=>nettoyerTechniqueRapportIa20260926_(x,depth+1));
  if(typeof v!=='object')return String(v);
  const out={};
  Object.keys(v).forEach(k=>{
    if(/^performance$/i.test(k)||/^timings?$/i.test(k)||/^profil/i.test(k))return;
    if(/^diagnostic/i.test(k)&&depth>2)return;
    out[k]=nettoyerTechniqueRapportIa20260926_(v[k],depth+1);
  });
  return out;
}

function lirePlanRapportIa20260926_(){
  try{
    if(typeof chargerPlanStructureV54==='function'){
      const p=chargerPlanStructureV54()||{};
      return {version:p.version||'',objectifs:p.objectifs||[],actions:p.actions||[],evenements:p.evenements||[],gains_attendus:p.gains_attendus||{}};
    }
  }catch(e){}
  let objectifs=[],actions=[],evenements=[];
  try{objectifs=typeof lireTablePlanCerbere_==='function'?(lireTablePlanCerbere_('Plan_Objectifs')||[]):[];}catch(e){}
  try{actions=typeof lireFeuilleDynamiquePlan_==='function'?(lireFeuilleDynamiquePlan_('Plan_Actions')||[]):[];}catch(e){}
  try{evenements=typeof lireFeuilleDynamiquePlan_==='function'?(lireFeuilleDynamiquePlan_('Plan_Evenements')||[]):[];}catch(e){}
  return{version:'fallback',objectifs,actions,evenements,gains_attendus:{}};
}

function normaliserOperationsRapportIa20260926_(ops,comptes){
  const noms={};(comptes||[]).forEach(c=>{noms[String(c&&c.id||'')]=String(c&&c.nom||'');});
  const limite=new Date();limite.setFullYear(limite.getFullYear()-1);
  return (ops||[]).filter(o=>{
    const d=new Date(o&&o.date_comptable||o&&o.date||0);return !isNaN(d)&&d>=limite;
  }).map(o=>({
    date:dateRapportIa20260926_(o&&o.date_comptable||o&&o.date),
    date_achat:dateRapportIa20260926_(o&&o.date_achat),
    libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
    categorie:String(o&&o.categorie||''),
    compte:noms[String(o&&o.compte||'')]||String(o&&o.compte||''),
    montant:arrRapportIa20260926_(o&&o.montant),
    type:String(o&&o.type||''),
    charge_fixe_id:String(o&&o.charge_fixe_id||''),
    source_bancaire:String(o&&o.source_bancaire||'')
  })).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}

function agregerOperationsRapportIa20260926_(ops){
  const mois={};
  (ops||[]).forEach(o=>{
    const m=String(o&&o.date||'').slice(0,7);if(!m)return;
    if(!mois[m])mois[m]={revenus:0,depenses:0,net:0,parCategorie:{}};
    const mt=Number(o&&o.montant||0),cat=String(o&&o.categorie||'Sans catégorie')||'Sans catégorie';
    if(mt>=0)mois[m].revenus+=mt;else mois[m].depenses+=Math.abs(mt);
    mois[m].net+=mt;
    mois[m].parCategorie[cat]=(mois[m].parCategorie[cat]||0)+mt;
  });
  Object.keys(mois).forEach(m=>{
    const x=mois[m];x.revenus=arrRapportIa20260926_(x.revenus);x.depenses=arrRapportIa20260926_(x.depenses);x.net=arrRapportIa20260926_(x.net);
    Object.keys(x.parCategorie).forEach(k=>x.parCategorie[k]=arrRapportIa20260926_(x.parCategorie[k]));
  });
  return mois;
}

function chargesRapportIa20260926_(charges,comptes){
  const noms={};(comptes||[]).forEach(c=>noms[String(c&&c.id||'')]=String(c&&c.nom||''));
  return (charges||[]).map(c=>({
    libelle:String(c&&c.libelle||''),
    libelle_bancaire:String(c&&c.libelle_bancaire||''),
    categorie:String(c&&c.categorie||''),
    compte:noms[String(c&&c.compte||'')]||String(c&&c.compte||''),
    montant:arrRapportIa20260926_(Math.abs(Number(c&&c.montant||0))),
    frequence:String(c&&c.frequence||'Mensuelle'),
    jour_execution:Number(c&&c.jour_execution||0),
    date_debut:dateRapportIa20260926_(c&&c.date_debut),
    date_fin:dateRapportIa20260926_(c&&c.date_fin),
    nature:String(c&&c.nature||''),
    actif:actifRapportIa20260926_(c&&c.actif),
    statut_rapprochement:String(c&&c.statut_rapprochement||'')
  }));
}

function contexteAutoRapportIa20260926_(etat,donnees){
  const t=etat&&etat.modules&&etat.modules.tresorerieComptable||{};
  const cer=etat&&etat.modules&&etat.modules.cerbere||{};
  const ps=Array.isArray(cer&&cer.periodes)?cer.periodes:[];
  const lignes=[
    'BudgetSoft décrit l’économie réelle et prévisionnelle d’un foyer.',
    'La date de référence bancaire est '+String(t.dateReference||'non renseignée')+'.',
    'La révision canonique du rapport est '+String(etat&&etat.revisionBudgetSoft||'inconnue')+'.',
    'Les opérations bancaires sont le Réel. Une charge fixe est une prévision récurrente tant qu’elle n’est pas remplacée par une opération réelle explicitement rapprochée.',
    'Les dépenses pilotables sont pilotées par Cerbère et l’enveloppe EP ; les charges fixes en sont exclues.',
    'Pour les cartes à débit différé, BudgetSoft distingue la date d’achat (consommation économique/pilotable) et la date de débit bancaire (trésorerie). La doctrine courante projette 90 % du reliquat pilotable en CB différée.',
    'Les revenus récurrents futurs utilisent le R0 canonique ; les revenus variables peuvent être fondés sur des moyennes glissantes selon leur poste.',
    'Les actions et événements du Plan ne doivent être comptés que selon leur statut, leur certitude et leur éventuel rapprochement avec le Réel.',
    'Pour une question de projection au-delà de l’horizon déjà calculé, prolonger uniquement les récurrences canoniques et les événements explicitement planifiés ; annoncer toute hypothèse supplémentaire.',
    'Ne jamais additionner deux représentations techniques de la même ligne économique (par exemple une ligne de projection et sa copie dans une décomposition canonique).'
  ];
  if(ps.length){
    lines=ps.slice(0,2).map((p,i)=>'Cycle '+(i+1)+' : '+String(p&&p.periode&&p.periode.debut||'')+' → '+String(p&&p.periode&&p.periode.fin||'')+'.');
    lignes.push.apply(lignes,lines);
  }
  return lignes;
}

function construireMarkdownRapportIa20260926_(r){
  const d=r.donnees,md=[];
  md.push('# Rapport BudgetSoft pour analyse par IA');
  md.push('');
  md.push('Généré le **'+r.genereLe+'** · révision BudgetSoft **'+r.revisionBudgetSoft+'** · version rapport **'+r.version+'**.');
  md.push('');
  md.push('## 0. Mode d’emploi pour l’IA');
  md.push('');
  md.push('Tu analyses les finances d’un foyer à partir d’un export BudgetSoft. **N’invente aucune donnée manquante.** Distingue systématiquement : Réel constaté, prévision canonique, hypothèse, et scénario demandé. Pour toute projection, donne les calculs mois par mois et explicite les hypothèses. Évite tout double comptage entre modules.');
  md.push('');
  (r.contextualisation||[]).forEach(x=>md.push('- '+x));
  if(r.contexteUtilisateur){
    md.push('');
    md.push('### Contexte complémentaire fourni par le foyer');
    md.push('');
    md.push(r.contexteUtilisateur);
  }

  md.push('');
  md.push('## 1. Tableau de bord / situation courante');
  md.push('');
  const t=d.tresorerie||{};
  md.push('- Solde réel bancaire : **'+eurRapportIa20260926_(t.soldeReel||0)+'**');
  md.push('- Solde prévisionnel publié : **'+eurRapportIa20260926_(t.soldePrevisionnel||0)+'**');
  md.push('- Date de référence : **'+String(t.dateReference||'')+'**');
  const cr=d.credits||{};
  md.push('- Capital crédits : **'+eurRapportIa20260926_(cr.capitalCredits||0)+'**');
  md.push('- Dettes hors crédit : **'+eurRapportIa20260926_(cr.dettesHorsCredit||0)+'**');
  md.push('- Endettement total : **'+eurRapportIa20260926_(cr.endettementTotal||0)+'**');
  md.push('- Mensualités connues : **'+eurRapportIa20260926_(cr.mensualites||0)+'**');
  if(cr.disponibleRenouvelable!=null)md.push('- Disponible total revolving : **'+eurRapportIa20260926_(cr.disponibleRenouvelable)+'**');

  md.push('');
  md.push('## 2. Comptes');
  md.push('');
  md.push('| Compte | Type | Solde | Actif |');
  md.push('|---|---|---:|---|');
  (d.comptes&&d.comptes.lignes||d.comptes&&d.comptes.comptes||[]).forEach(c=>md.push('| '+mdRapportIa20260926_(c.nom||c.libelle||'')+' | '+mdRapportIa20260926_(c.type||'')+' | '+eurRapportIa20260926_(c.soldeReel!=null?c.soldeReel:(c.solde!=null?c.solde:c.solde_initial))+' | '+(actifRapportIa20260926_(c.actif)?'oui':'non')+' |'));

  md.push('');
  md.push('## 3. Opérations réelles — 12 derniers mois');
  md.push('');
  md.push('### Agrégats mensuels');
  md.push('');
  md.push('| Mois | Revenus | Dépenses | Net |');
  md.push('|---|---:|---:|---:|');
  Object.keys(d.operations.agregatsMensuels||{}).sort().forEach(m=>{const x=d.operations.agregatsMensuels[m];md.push('| '+m+' | '+eurRapportIa20260926_(x.revenus)+' | '+eurRapportIa20260926_(x.depenses)+' | '+eurRapportIa20260926_(x.net)+' |');});
  md.push('');
  md.push('Les lignes détaillées des opérations figurent dans l’annexe JSON structurée.');

  md.push('');
  md.push('## 4. Charges fixes');
  md.push('');
  md.push('| Libellé | Catégorie | Montant | Fréquence | Jour | Début | Fin | Actif |');
  md.push('|---|---|---:|---|---:|---|---|---|');
  (d.chargesFixes||[]).forEach(c=>md.push('| '+mdRapportIa20260926_(c.libelle)+' | '+mdRapportIa20260926_(c.categorie)+' | '+eurRapportIa20260926_(c.montant)+' | '+mdRapportIa20260926_(c.frequence)+' | '+String(c.jour_execution||'')+' | '+String(c.date_debut||'')+' | '+String(c.date_fin||'')+' | '+(c.actif?'oui':'non')+' |'));

  md.push('');
  md.push('## 5. Plan');
  md.push('');
  md.push('- Objectifs : **'+(d.plan.objectifs||[]).length+'**');
  md.push('- Actions : **'+(d.plan.actions||[]).length+'**');
  md.push('- Événements : **'+(d.plan.evenements||[]).length+'**');
  if(d.plan.gains_attendus)md.push('- Gains attendus déclarés : '+JSON.stringify(d.plan.gains_attendus));

  md.push('');
  md.push('## 6. Cerbère / budget pilotable');
  md.push('');
  (d.cerbereResume||[]).forEach((p,i)=>{
    md.push('### Cycle '+(i+1));
    md.push('');
    md.push('- Période : **'+String(p.debut||'')+' → '+String(p.fin||'')+'**');
    if(p.p1!=null)md.push('- Pilotable soutenable : **'+eurRapportIa20260926_(p.p1)+'**');
    if(p.restePilotable!=null)md.push('- Reste pilotable : **'+eurRapportIa20260926_(p.restePilotable)+'**');
    if(p.ep!=null)md.push('- Enveloppe pilotable décidée : **'+eurRapportIa20260926_(p.ep)+'**');
    if(p.epDisponible!=null)md.push('- EP disponible : **'+eurRapportIa20260926_(p.epDisponible)+'**');
    if(p.chargesFixes!=null)md.push('- Charges fixes du cycle : **'+eurRapportIa20260926_(p.chargesFixes)+'**');
    if(p.revenus!=null)md.push('- Revenus attendus / R0 du cycle : **'+eurRapportIa20260926_(p.revenus)+'**');
  });

  md.push('');
  md.push('## 7. Trésorerie prévisionnelle');
  md.push('');
  md.push('Les lignes futures canoniques sont fournies dans l’annexe structurée. Pour toute projection jusqu’à une date donnée, utiliser ces lignes, puis prolonger seulement les récurrences canoniques au-delà de l’horizon publié.');

  md.push('');
  md.push('## 8. Crédits et dettes');
  md.push('');
  md.push('| Nom | Type | Capital restant | Mensualité | Taux | Coût restant | Disponible |');
  md.push('|---|---|---:|---:|---:|---:|---:|');
  (cr.lignes||[]).forEach(x=>md.push('| '+mdRapportIa20260926_(x.nom||'')+' | '+mdRapportIa20260926_(x.type_credit||x.table||'')+' | '+eurRapportIa20260926_(x.capital_restant||0)+' | '+eurRapportIa20260926_(x.mensualite||0)+' | '+String(x.taux||0)+' % | '+eurRapportIa20260926_(x.cout_restant||0)+' | '+eurRapportIa20260926_(x.disponible_credit||0)+' |'));

  md.push('');
  md.push('## 9. Patrimoine');
  md.push('');
  md.push('Données patrimoniales canoniques complètes dans l’annexe structurée.');

  md.push('');
  md.push('## 10. Analyses historiques');
  md.push('');
  md.push('Les séries 12 mois de revenus, charges fixes, dépenses pilotables, dette et capital figurent dans l’annexe structurée avec leurs doctrines de calcul.');

  md.push('');
  md.push('## 11. Conseiller / lecture transversale');
  md.push('');
  md.push('Le module Conseiller canonique est inclus dans l’annexe structurée. Ses conclusions éventuelles sont des diagnostics BudgetSoft, pas des faits bancaires bruts.');

  md.push('');
  md.push('## 12. Annexe structurée pour l’IA');
  md.push('');
  md.push('Le bloc JSON ci-dessous est la source détaillée à privilégier pour les calculs.');
  md.push('');
  md.push('~~~json');
  md.push(JSON.stringify(r.donnees,null,2));
  md.push('~~~');
  return md.join('\n');
}

function genererRapportIaBudgetSoft20260926(options){
  options=options||{};
  const etat=typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function'?lireEtatGlobalBudgetSoftSiDisponible20260906_():null;
  if(!etat||etat.ok!==true||etat.publie!==true)throw new Error('Snapshot BudgetSoft canonique indisponible.');
  const sources=typeof chargerToutesLesDonnees==='function'?chargerToutesLesDonnees():{};
  const comptesSrc=Array.isArray(sources.Comptes)?sources.Comptes:[];
  const ops12=normaliserOperationsRapportIa20260926_(sources.Operations||[],comptesSrc);
  const plan=lirePlanRapportIa20260926_();
  const modules=etat.modules||{};
  const cer=modules.cerbere||{};
  const cerResume=(Array.isArray(cer.periodes)?cer.periodes:[]).slice(0,4).map(p=>{
    const v=p&&p.v37||{},cock=v&&v.cockpit20260902||{},diag=cer.diagnostic||{};
    return{
      cle:String(p&&p.clePilotage||''),
      debut:String(p&&p.periode&&p.periode.debut||''),
      fin:String(p&&p.periode&&p.periode.fin||''),
      p1:Number(cock.p1Total!=null?cock.p1Total:(v.p1ApresReportCb!=null?v.p1ApresReportCb:v.p1||0)),
      restePilotable:Number(cock.pDisponible!=null?cock.pDisponible:(v.ret1!=null?v.ret1:0)),
      ep:Number(cock.ep1!=null?cock.ep1:(v.ep1!=null?v.ep1:0)),
      epDisponible:Number(cock.ep1Disponible!=null?cock.ep1Disponible:(v.ep1Disponible!=null?v.ep1Disponible:0)),
      chargesFixes:Number(v.chargesFixesTotal!=null?v.chargesFixesTotal:(v.cft1!=null?v.cft1:0)),
      revenus:Number(v.rt1!=null?v.rt1:0)
    };
  });

  const projection=modules.projectionEtendue||{};
  const lignesProjection=(projection.lignes||[]).map(x=>({
    id:String(x&&x.id||''),source:String(x&&x.source||''),sourceId:String(x&&x.sourceId||''),
    date:dateRapportIa20260926_(x&&x.date),libelle:String(x&&x.libelle||''),categorie:String(x&&x.categorie||''),
    montantSigne:arrRapportIa20260926_(x&&x.montantSigne),certitude:String(x&&x.certitude||''),preuve:String(x&&x.preuve||'')
  }));

  const analyse12=modules.analyses&&modules.analyses.variantes&&modules.analyses.variantes['12']||modules.analyses||{};
  const donnees={
    meta:{
      versionRapport:BUDGETSOFT_AI_REPORT_20260926_VERSION,
      revisionBudgetSoft:String(etat.revisionBudgetSoft||''),
      genereLe:String(etat.genereLe||''),
      source:'snapshot_global + tables sources de la même session de lecture',
      devise:'EUR'
    },
    tableauDeBord:nettoyerTechniqueRapportIa20260926_(modules.dashboard||{},0),
    comptes:nettoyerTechniqueRapportIa20260926_(modules.comptes||{},0),
    operations:{
      periode:'12 derniers mois',
      agregatsMensuels:agregerOperationsRapportIa20260926_(ops12),
      lignes:ops12
    },
    chargesFixes:chargesRapportIa20260926_(sources.Charges_fixes||[],comptesSrc),
    plan:nettoyerTechniqueRapportIa20260926_(plan,0),
    cerbereResume:cerResume,
    cerbere:nettoyerTechniqueRapportIa20260926_(cer,0),
    tresorerie:Object.assign({},nettoyerTechniqueRapportIa20260926_(modules.tresorerieComptable||{},0),{
      projection:{
        dateReference:String(projection.dateReference||''),
        dateCible:String(projection.dateCible||''),
        soldeReel:Number(projection.soldeReel||modules.tresorerieComptable&&modules.tresorerieComptable.soldeReel||0),
        soldePrevisionnel:Number(projection.soldePrevisionnel||modules.tresorerieComptable&&modules.tresorerieComptable.soldePrevisionnel||0),
        lignes:lignesProjection
      }
    }),
    credits:nettoyerTechniqueRapportIa20260926_(modules.credits||{},0),
    patrimoine:nettoyerTechniqueRapportIa20260926_(modules.patrimoine||{},0),
    analyses12mois:nettoyerTechniqueRapportIa20260926_(analyse12,0),
    conseiller:nettoyerTechniqueRapportIa20260926_(modules.conseiller||{},0),
    budget:nettoyerTechniqueRapportIa20260926_(modules.budget||{},0),
    categories:(sources.Categories||[]).map(c=>({nom:String(c&&c.nom||''),type:String(c&&c.type||''),actif:actifRapportIa20260926_(c&&c.actif),famille_analytique:String(c&&c.famille_analytique||'')})),
    objectifs:sources.Objectifs||[]
  };

  const out={
    ok:true,
    version:BUDGETSOFT_AI_REPORT_20260926_VERSION,
    revisionBudgetSoft:String(etat.revisionBudgetSoft||''),
    genereLe:new Date().toISOString(),
    contexteUtilisateur:txtRapportIa20260926_(options.contexte||''),
    contextualisation:contexteAutoRapportIa20260926_(etat,donnees),
    donnees:donnees
  };
  out.markdown=construireMarkdownRapportIa20260926_(out);
  out.json=JSON.stringify({meta:{version:out.version,revisionBudgetSoft:out.revisionBudgetSoft,genereLe:out.genereLe,contexteUtilisateur:out.contexteUtilisateur,contextualisation:out.contextualisation},donnees:out.donnees},null,2);
  out.statistiques={tailleMarkdown:out.markdown.length,tailleJson:out.json.length,operations12m:ops12.length,chargesFixes:(donnees.chargesFixes||[]).length,lignesProjection:lignesProjection.length};
  return out;
}

function auditerRapportIaBudgetSoft20260926(){
  const r=genererRapportIaBudgetSoft20260926({contexte:'Audit automatique — aucun contexte personnel ajouté.'});
  const controles={
    revision:!!r.revisionBudgetSoft,
    markdown:typeof r.markdown==='string'&&r.markdown.length>5000,
    json:typeof r.json==='string'&&r.json.length>5000,
    operations:Array.isArray(r.donnees&&r.donnees.operations&&r.donnees.operations.lignes),
    charges:Array.isArray(r.donnees&&r.donnees.chargesFixes),
    credits:!!(r.donnees&&r.donnees.credits),
    patrimoine:!!(r.donnees&&r.donnees.patrimoine),
    analyses:!!(r.donnees&&r.donnees.analyses12mois),
    cerbere:!!(r.donnees&&r.donnees.cerbere),
    tresorerie:!!(r.donnees&&r.donnees.tresorerie)
  };
  const out={ok:Object.keys(controles).every(k=>controles[k]===true),version:r.version,revisionBudgetSoft:r.revisionBudgetSoft,statistiques:r.statistiques,controles};
  console.log('[AUDIT RAPPORT IA BUDGETSOFT 20260926] '+JSON.stringify(out));
  return out;
}
