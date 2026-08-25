const CERBERE_DOCTRINE_CYCLE_V3712_VERSION='3.7.12';

/**
 * Cerbère 3.7.12 — doctrine du cycle réellement piloté.
 *
 * Invariants ajoutés :
 * 1) Le salaire ouvre conventionnellement le cycle au 28, même si la banque le
 *    comptabilise le 27, le 28 ou le 29. Le rapprochement ne change que son montant.
 * 2) SS1 est le dernier solde de M-1, avant le salaire d'ouverture ; il est reporté
 *    intégralement, positif ou négatif, dans la capacité initiale de M.
 * 3) Charges fixes, Actions et Événements applicables au cycle sont connus dès le
 *    premier jour. Leur Réel remplace ensuite la prévision : il ne la recrée pas.
 * 4) Les dépenses pilotables, elles, consomment les molettes au fil du Réel.
 * 5) « À rééquilibrer » est un indicateur de décision distinct, même si à l'ouverture
 *    sa valeur est mathématiquement égale à la trajectoire après allocation P1.
 */
function appliquerDoctrineCycleV3712_(base){
  if(!base||base.ok===false)return base;

  const operations=tableauCerbereV379_(lireTable_('Operations'));
  const categories=tableauCerbereV379_(lireTable_('Categories'));
  const actions=typeof lireFeuilleDynamiquePlan_==='function'
    ?tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Actions')):[];
  const evenements=typeof lireFeuilleDynamiquePlan_==='function'
    ?tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Evenements')):[];
  const periodes=tableauCerbereV379_(base.periodes);
  const p0Postes=tableauCerbereV379_(base.p0&&base.p0.postes);
  const p0Cats=new Set(p0Postes.map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
  p0Cats.add('Divers');
  const catType={};
  categories.forEach(c=>catType[String(c&&c.nom||c&&c.categorie||'').trim()]=normaliserV377_(c&&c.type));
  const opById={};operations.forEach(o=>{const id=String(o&&o.id||'').trim();if(id)opById[id]=o;});

  let report=null;
  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;

    // M+1 hérite toujours de la fin projetée/pondérée de M.
    if(i>0&&report!==null){
      v.ss1=arrV3712_(report);v.soldeOuverture=v.ss1;
      v.ss1Statut='report intégral de la fin projetée de la période précédente';
    }

    // Convention salaire : le 27/28/29 bancaire est imputé au 28 Cerbère.
    if(i===0)appliquerConventionSalaireV3712_(v,periode,operations,base);

    // Carte de preuve : Actions + Événements qui produisent un effet sur le cycle.
    const effets=construireEffetsCycleV3712_(actions,evenements,opById,periode,p0Cats,catType);
    v.actionsEvenementsCycle=effets.lignes;
    v.actionsEvenementsResume=effets.resume;

    // Recettes Plan : elles doivent être intégrées dès l'ouverture du cycle, et non
    // seulement tant que leur date est future. Une occurrence rapprochée/réalisée
    // n'est pas rajoutée : son opération réelle est déjà dans Rt1.
    const ancienPlan=Number(v.rt1Audit&&v.rt1Audit.plan!=null?v.rt1Audit.plan:(v.recettesEvenements||0));
    const nouveauPlan=arrV3712_(effets.recettesPrevisionnelles);
    v.rt1=arrV3712_(Number(v.rt1||0)-ancienPlan+nouveauPlan);
    v.rt1Audit=v.rt1Audit&&typeof v.rt1Audit==='object'?v.rt1Audit:{};
    v.rt1Audit.planAvant3712=arrV3712_(ancienPlan);
    v.rt1Audit.planCycle=nouveauPlan;
    v.rt1Audit.doctrinePlan='effet du cycle compté dès le 1er jour ; Réel lié remplace le prévisionnel';

    // Sorties non pilotables du Plan : même principe. HEt1 de 3.7.11 contient le
    // Réel inexpliqué ; on lui ajoute seulement les occurrences encore prévisionnelles.
    const hetReel=arrV3712_(Number(v.het1||0));
    const hetPlan=arrV3712_(effets.sortiesHorsPilotablePrevisionnelles);
    v.het1Reel=hetReel;v.het1Plan=hetPlan;v.het1=arrV3712_(hetReel+hetPlan);
    v.horsPilotableAControler=v.het1;

    // Les événements explicitement décrits comme charge temporairement supprimée ou
    // déplacée corrigent la CF du cycle dès l'ouverture, sauf s'ils ont déjà un Réel lié.
    if(effets.chargesEviteesPrevisionnelles>0){
      v.cft1=arrV3712_(Math.max(0,Number(v.cft1||0)-effets.chargesEviteesPrevisionnelles));
      v.chargesFixesTotal=arrV3712_(Math.max(0,Number(v.chargesFixesTotal||0)-effets.chargesEviteesPrevisionnelles));
    }
    if(effets.haussesChargesPrevisionnelles>0){
      v.cft1=arrV3712_(Number(v.cft1||0)+effets.haussesChargesPrevisionnelles);
      v.chargesFixesTotal=arrV3712_(Number(v.chargesFixesTotal||0)+effets.haussesChargesPrevisionnelles);
    }

    // Enveloppe disponible avant allocation pilotable : photographie du cycle dès J1.
    const capaciteAvantPilotable=arrV3712_(Number(v.ss1||0)+Number(v.rt1||0)-Number(v.cft1||0)-Number(v.het1||0));
    const enveloppes=tableauCerbereV379_(p.enveloppes);
    const allocation=arrV3712_(enveloppes.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)),0));
    const depassements=arrV3712_(enveloppes.reduce((s,x)=>{
      const engage=Number(x&&x.engageV37!=null?x.engageV37:(Number(x&&x.reelNetPrevisionnel||0)+Number(x&&x.planifie||0)));
      return s+Math.max(0,engage-Math.max(0,Number(x&&x.prevu||0)));
    },0));

    v.capaciteAvantPilotable=capaciteAvantPilotable;
    v.allocationP1Courante=allocation;
    v.depassementsPilotables=depassements;
    v.aReequilibrer=arrV3712_(capaciteAvantPilotable-allocation-depassements);
    v.aReequilibrerReference=v.aReequilibrer;
    v.formuleAReequilibrer='capacité avant pilotable - allocations P1 - dépassements déjà engagés';

    // DPt1 reste la dépense pilotable estimée du cycle ; SCt1 reste la trajectoire.
    v.dt1=arrV3712_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));
    v.sct1=arrV3712_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;

    // Contrôle : avec DPt1=max(P1,engagé), les deux valeurs doivent coïncider à
    // l'ouverture. Elles restent néanmoins deux objets fonctionnels distincts.
    v.auditReequilibrage={
      attendu:v.sct1,reel:v.aReequilibrer,
      ecart:arrV3712_(v.aReequilibrer-v.sct1),
      ok:Math.abs(v.aReequilibrer-v.sct1)<0.011
    };

    const absorbable=arrV3712_(enveloppes.reduce((s,x)=>{
      const engage=Number(x&&x.engageV37!=null?x.engageV37:(Number(x&&x.reelNetPrevisionnel||0)+Number(x&&x.planifie||0)));
      return s+Math.max(0,Number(x&&x.prevu||0)-engage);
    },0));
    v.absorbableParAllocations=absorbable;
    v.incompressible=arrV3712_(v.aReequilibrer<0?Math.max(0,Math.abs(v.aReequilibrer)-absorbable):0);

    p.resteBudgetPilotable=Number(v.ret1||p.resteBudgetPilotable||0);
    p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
    report=v.sct1;
  });

  base.version=CERBERE_DOCTRINE_CYCLE_V3712_VERSION;
  base.fenetreRoulante=typeof fenetreV37_==='function'?fenetreV37_(periodes):base.fenetreRoulante;
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.doctrine_3712='SS1 report M-1 + salaire conventionnel au 28 + Actions/Événements du cycle dès J1 + à-rééquilibrer distinct';
  base.diagnostic.non_regression_3712=verifierDoctrineCycleV3712_(base);
  return base;
}

function appliquerConventionSalaireV3712_(v,periode,operations,base){
  const debut=jourCivilV3712_(periode&&periode.debut);if(!debut)return;
  const candidats=tableauCerbereV379_(operations).map(o=>({o:o,d:jourCivilV3712_(dateOperationBanqueV377_(o))}))
    .filter(x=>x.d&&Number(x.o&&x.o.montant||0)>0&&normaliserV377_(x.o&&x.o.categorie)==='salaires')
    .filter(x=>Math.abs((x.d-debut)/86400000)<=1)
    .sort((a,b)=>Math.abs(a.d-debut)-Math.abs(b.d-debut));
  if(!candidats.length){
    v.salaireOuverture={trouve:false,dateCerbere:formatJourV3712_(debut),doctrine:'salaire attendu au 28 Cerbère'};
    return;
  }
  const x=candidats[0],montant=Number(x.o.montant||0),avantRt=Number(v.rt1||0);

  // Retrouver ce que Rt1 retenait déjà pour Salaires afin de remplacer, jamais ajouter.
  const hist=v.rt1Audit&&v.rt1Audit.canonEffectifParCategorie&&v.rt1Audit.canonEffectifParCategorie['Salaires'];
  let canon=Number(hist&&hist.cycle||0),retenuAvant=Number(hist&&hist.retenu||0);
  if(!canon){
    const poste=tableauCerbereV379_(base&&base.recettesCanon&&base.recettesCanon.postes).find(r=>String(r&&r.categorie||'').trim()==='Salaires');
    canon=Number(poste&&poste.montant||0);
  }
  if(!retenuAvant){
    const reel=Number(v.rt1Audit&&v.rt1Audit.reelParCategorie&&v.rt1Audit.reelParCategorie['Salaires']||0);
    retenuAvant=reel>0?Math.max(canon,reel):canon;
  }
  v.rt1=arrV3712_(avantRt-retenuAvant+montant);

  // Si la banque verse le 27, le SS1 reconstitué au 28 contient déjà le salaire.
  // On le retire pour retrouver le dernier solde de M-1 avant salaire ; le salaire
  // est alors repris dans Rt1 au 28 conventionnel. Les 28/29 ne nécessitent pas
  // d'ajustement du SS1 frontière.
  let ajustementSS1=0;
  if(x.d<debut){ajustementSS1=-montant;v.ss1=arrV3712_(Number(v.ss1||0)-montant);v.soldeOuverture=v.ss1;}

  v.ss1Statut='dernier solde de M−1 avant le salaire d’ouverture · salaire imputé conventionnellement au 28';
  v.salaireOuverture={
    trouve:true,montant:arrV3712_(montant),dateBancaire:formatJourV3712_(x.d),dateCerbere:formatJourV3712_(debut),
    operationId:String(x.o&&x.o.id||''),canonRemplace:arrV3712_(retenuAvant),deltaRt1:arrV3712_(montant-retenuAvant),
    ajustementSS1:arrV3712_(ajustementSS1),doctrine:'date Cerbère fixe au 28 ; seul le montant réel remplace R1'
  };
}

function construireEffetsCycleV3712_(actions,evenements,opById,periode,p0Cats,catType){
  const lignes=[];let recettesPrevisionnelles=0,sortiesHors=0,chargesEvitees=0,haussesCharges=0;
  const ajouter=(source,x,o)=>{
    if(!x||!o)return;
    let impact=o.date||x.date_effet||x.date_prevue;
    const type=normaliserV377_(x.type||''),impactType=normaliserV377_(x.impact_type||''),nature=normaliserV377_(x.nature_action||'');
    const estRecette=type==='recette'||impactType==='hausse revenu'||nature==='encaisser'||nature==='recouvrer';
    const estDepense=type==='depense'||['acheter','rembourser','reserver','investir','payer'].includes(nature);
    if(!estRecette&&normaliserV377_(x.mode_paiement)==='cb'&&(estDepense||source==='Événement'))impact=typeof dateImpactCbPlanV37_==='function'?dateImpactCbPlanV37_(impact):impact;
    if(!dateDansCycleV3712_(impact,periode))return;

    const opId=String(x.operation_reelle_id||'').trim(),op=opId&&opById[opId]?opById[opId]:null;
    const statut=normaliserV377_(x.rapprochement_statut||x.statut||'');
    const realise=!!op||['rapproche','realise','realisee','effective','effectif'].includes(statut);
    const montantPrevu=Math.abs(Number(o.montant!=null?o.montant:(x.montant!=null?x.montant:x.impact_montant)||0));
    const montantReel=op?Math.abs(Number(op.montant||0)):Math.abs(Number(x.montant_reel||0));
    const montantRetenu=realise&&(montantReel>0)?montantReel:montantPrevu;
    const cat=String(x.categorie||x.affectation||'').trim();
    let cible='information',sens=0;

    if(estRecette){cible='recette';sens=1;}
    else if(source==='Action'&&(impactType==='baisse charge'||impactType==='baisse_charge'||nature==='supprimer')){cible='charge_fixe';sens=1;}
    else if(source==='Action'&&(impactType==='hausse charge'||impactType==='hausse_charge')){cible='charge_fixe';sens=-1;}
    else if(type==='charge supprimee temporairement'||type==='charge_supprimee_temporairement'||type==='charge deplacee'||type==='charge_deplacee'){cible='charge_fixe';sens=1;}
    else if(type==='argent reserve'||type==='argent_reserve'||impactType==='reservation objectif'||impactType==='reservation_objectif'){cible='hors_pilotable';sens=-1;}
    else if(estDepense||type==='depense'){cible=p0Cats.has(cat)?'pilotable':'hors_pilotable';sens=-1;}

    const statutAffiche=op?'Rapproché au réel':realise?'Réalisé à rapprocher':(String(x.statut||'Prévu'));
    lignes.push({
      source:source,id:String(x.id||''),libelle:String(x.libelle||x.nom||''),categorie:cat,cible:cible,
      montant:arrV3712_(montantRetenu),montantSigne:arrV3712_(sens*montantRetenu),montantPrevu:arrV3712_(montantPrevu),
      montantReel:arrV3712_(montantReel),dateEffet:formatJourV3712_(jourCivilV3712_(impact)),statut:statutAffiche,
      operationReelleId:opId,realise:realise,modePaiement:String(x.mode_paiement||''),occurrence:Number(o.index||1),occurrences:Number(o.total||1)
    });

    // Une occurrence réalisée/rapprochée est déjà portée par Operations : elle ne
    // reste pas dans le prévisionnel comptable, mais reste visible dans la carte.
    if(realise)return;
    if(cible==='recette')recettesPrevisionnelles+=montantRetenu;
    if(cible==='hors_pilotable'&&sens<0)sortiesHors+=montantRetenu;
    if(cible==='charge_fixe'&&sens>0&&source==='Événement')chargesEvitees+=montantRetenu;
    if(cible==='charge_fixe'&&sens<0)haussesCharges+=montantRetenu;
  };

  tableauCerbereV379_(evenements).forEach(e=>{
    const st=normaliserV377_(e&&e.statut);if(['annule','annulee','abandonne','abandonnee'].includes(st))return;
    if(normaliserV377_(e&&e.certitude)==='possible')return;
    const occ=typeof occurrencesEvenementV4_==='function'?occurrencesEvenementV4_(e):[{index:1,total:1,montant:Math.abs(Number(e&&e.montant||0)),date:e&&e.date_effet}];
    tableauCerbereV379_(occ).forEach(o=>ajouter('Événement',e,o));
  });
  tableauCerbereV379_(actions).forEach(a=>{
    const st=normaliserV377_(a&&a.statut);if(['annule','annulee','abandonne','abandonnee'].includes(st))return;
    const champConfirme=a&&a.impact_confirme;
    if(champConfirme!==undefined&&champConfirme!==null&&champConfirme!==''&&typeof yesPlanV4_==='function'&&!yesPlanV4_(champConfirme))return;
    if(normaliserV377_(a&&a.certitude)==='possible')return;
    const occ=typeof occurrencesActionV46_==='function'?occurrencesActionV46_(a):[{index:1,total:1,montant:Math.abs(Number(a&&a.impact_montant||0)),date:a&&a.date_effet}];
    tableauCerbereV379_(occ).forEach(o=>ajouter('Action',a,o));
  });

  lignes.sort((a,b)=>String(a.dateEffet||'').localeCompare(String(b.dateEffet||''))||String(a.source).localeCompare(String(b.source)));
  const pos=lignes.reduce((s,x)=>s+Math.max(0,Number(x.montantSigne||0)),0),neg=lignes.reduce((s,x)=>s+Math.min(0,Number(x.montantSigne||0)),0);
  return {
    lignes:lignes,
    recettesPrevisionnelles:arrV3712_(recettesPrevisionnelles),
    sortiesHorsPilotablePrevisionnelles:arrV3712_(sortiesHors),
    chargesEviteesPrevisionnelles:arrV3712_(chargesEvitees),
    haussesChargesPrevisionnelles:arrV3712_(haussesCharges),
    resume:{nombre:lignes.length,positif:arrV3712_(pos),negatif:arrV3712_(neg),net:arrV3712_(pos+neg)}
  };
}

function verifierDoctrineCycleV3712_(base){
  const erreurs=[],ps=tableauCerbereV379_(base&&base.periodes);
  ps.slice(0,2).forEach((p,i)=>{
    const v=p&&p.v37||{};
    if(!Array.isArray(v.actionsEvenementsCycle))erreurs.push('carte Actions/Événements absente P'+(i+1));
    if(!Number.isFinite(Number(v.aReequilibrer)))erreurs.push('À rééquilibrer non numérique P'+(i+1));
    if(Math.abs(Number(v.auditReequilibrage&&v.auditReequilibrage.ecart||0))>.011)erreurs.push('écart trajectoire/rééquilibrage P'+(i+1));
  });
  if(ps.length>=2&&Math.abs(Number(ps[1]&&ps[1].v37&&ps[1].v37.ss1||0)-Number(ps[0]&&ps[0].v37&&ps[0].v37.sct1||0))>.011)erreurs.push('report M→M+1 incohérent');
  return {ok:!erreurs.length,erreurs:erreurs};
}
function dateDansCycleV3712_(date,p){const d=jourCivilV3712_(date),a=jourCivilV3712_(p&&p.debut),z=jourCivilV3712_(p&&p.fin);return !!(d&&a&&z&&d>=a&&d<=z);}
function jourCivilV3712_(v){const d=dateV377_(v);return d?new Date(d.getFullYear(),d.getMonth(),d.getDate()):null;}
function formatJourV3712_(d){if(!d)return'';return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');}
function arrV3712_(n){return Math.round((Number(n)||0)*100)/100;}
