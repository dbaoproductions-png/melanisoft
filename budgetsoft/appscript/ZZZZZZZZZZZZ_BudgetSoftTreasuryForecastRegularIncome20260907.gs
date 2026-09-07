/*
 * Complément du moteur prévisionnel de trésorerie : recettes régulières.
 *
 * Doctrine BudgetSoft :
 * - la trésorerie reste propriétaire des soldes prévisionnels ;
 * - Cerbère peut fournir l'attendu de recettes d'un cycle (rt1), mais ne produit
 *   pas lui-même les soldes bancaires du Dashboard ;
 * - les opérations futures déjà connues restent prioritaires ;
 * - on ne double-compte jamais une recette déjà réalisée ou déjà datée dans Operations.
 */
const BUDGETSOFT_TREASURY_REGULAR_INCOME_VERSION='2026-09-07.1';

function dateJourTreasuryIncome20260907_(v){const d=v instanceof Date?new Date(v):new Date(v||0);if(isNaN(d))return null;d.setHours(0,0,0,0);return d;}
function arrTreasuryIncome20260907_(n){return Math.round(Number(n||0)*100)/100;}
function montantPositifTreasuryIncome20260907_(o){const t=String(o&&o.type||'').toLowerCase(),n=Number(o&&o.montant||0);if(t==='revenu'||t==='tresorerie_entree')return Math.abs(n);return n>0?n:0;}
function dateComptableTreasuryIncome20260907_(o){return dateJourTreasuryIncome20260907_(o&&(o.date_comptable||o.date||o.date_operation));}

function recettesRegulieresTresorerieBudgetSoft20260907_(ops,hard,now,cible,comptes){
  let cerbere=null;
  try{cerbere=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;}catch(e){return [];}
  const periodes=cerbere&&Array.isArray(cerbere.periodes)?cerbere.periodes:[];
  const out=[];
  periodes.forEach((p,index)=>{
    const per=p&&(p.periode||p)||{},debut=dateJourTreasuryIncome20260907_(per.debut),fin=dateJourTreasuryIncome20260907_(per.fin),v=p&&p.v37||{};
    const attendu=Number(v.rt1);
    if(!debut||!fin||!Number.isFinite(attendu)||attendu<=0||fin<=now||debut>cible)return;
    const borneRealisee=new Date(Math.min(now.getTime(),fin.getTime()));
    let realise=0;
    (ops||[]).forEach(o=>{
      const d=dateComptableTreasuryIncome20260907_(o);if(!d||d<debut||d>borneRealisee)return;
      if(comptes&&comptes.length&&typeof compteDansPerimetreTresorerie_==='function'&&!compteDansPerimetreTresorerie_(o.compte,comptes))return;
      realise+=montantPositifTreasuryIncome20260907_(o);
    });
    let dejaFutur=0;
    (hard||[]).forEach(h=>{const d=dateJourTreasuryIncome20260907_(h&&h.date),m=Number(h&&h.montantSigne||0);if(d&&d>=debut&&d<=fin&&m>0)dejaFutur+=m;});
    const restant=arrTreasuryIncome20260907_(Math.max(0,attendu-realise-dejaFutur));
    if(restant<=0.009)return;
    let datePrevue=new Date(debut);
    if(datePrevue<=now){datePrevue=new Date(now);datePrevue.setDate(datePrevue.getDate()+1);datePrevue.setHours(12,0,0,0);}
    if(datePrevue>fin||datePrevue>cible)return;
    out.push({
      id:'revenu_regulier:'+String(index)+':'+datePrevue.getTime(),source:'revenu_regulier',sourceId:String(p&&p.clePilotage||''),
      date:datePrevue.toISOString(),libelle:'Recettes régulières attendues',categorie:'Revenus',compte:'',montantSigne:restant,
      certitude:'tres_probable',preuve:'Attendu de recettes Cerbère rt1 moins recettes déjà réalisées et futures connues',dateConventionnelle:true,
      attenduCycle:arrTreasuryIncome20260907_(attendu),realiseCycle:arrTreasuryIncome20260907_(realise),dejaFuturCycle:arrTreasuryIncome20260907_(dejaFutur)
    });
  });
  return out;
}

/* Entrée publique autoritaire : même moteur 20260830, complété par les recettes régulières. */
function chargerTresoreriePrevisionnelle20260830(dateCible){
  const t0=Date.now();
  return avecContexteLectureBudgetSoft20260827_('tresorerie_previsionnelle',function(){
    const now=finJourTresorerie_(new Date()),cible=normaliserDateCibleTresorerie_(dateCible,now),synthese=chargerSyntheseComptes20260828();
    const comptes=(synthese.comptes||[]).filter(c=>actifComptes20260828_(c.actif)),courants=comptes.filter(estCompteCourantTresorerie_),comptesBase=courants.length?courants:comptes.filter(c=>!estEpargneTresorerie_(c));
    const soldeInitial=arrondiTresorerie_(comptesBase.reduce((s,c)=>s+Number(c.soldeReel||0),0));
    const ops0=lireTable_('Operations'),ops=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0,charges=lireTable_('Charges_fixes'),events=lireFeuilleDynamiquePlan_('Plan_Evenements'),actions=lireFeuilleDynamiquePlan_('Plan_Actions');
    const lignes=[],hard=operationsFuturesTresorerie_(ops,now,cible,comptesBase);hard.forEach(x=>lignes.push(x));
    occurrencesChargesTresorerie_(charges,hard,actions,now,cible,comptesBase).forEach(x=>lignes.push(x));
    occurrencesEvenementsTresorerie_(events,hard,now,cible,comptesBase).forEach(x=>lignes.push(x));
    occurrencesActionsTresorerie_(actions,hard,now,cible,comptesBase).forEach(x=>lignes.push(x));
    recettesRegulieresTresorerieBudgetSoft20260907_(ops,hard,now,cible,comptesBase).forEach(x=>lignes.push(x));
    const pilot=estimationPilotableTresorerie_(now,cible);if(pilot&&Math.abs(pilot.montant)>0.009)lignes.push(pilot);
    lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));
    const variation=arrondiTresorerie_(lignes.reduce((s,x)=>s+Number(x.montantSigne||0),0)),certain=arrondiTresorerie_(lignes.filter(x=>x.certitude==='certain').reduce((s,x)=>s+Number(x.montantSigne||0),0)),tresProbable=arrondiTresorerie_(lignes.filter(x=>['certain','tres_probable'].includes(x.certitude)).reduce((s,x)=>s+Number(x.montantSigne||0),0)),solde=arrondiTresorerie_(soldeInitial+variation),resume=resumeTresorerie_(lignes);
    resume.revenus_reguliers=arrondiTresorerie_(lignes.filter(x=>x.source==='revenu_regulier').reduce((s,x)=>s+Number(x.montantSigne||0),0));
    return serialiserCerberePourClient_({ok:true,version:'2026-09-07.3',versionMoteurBase:TREASURY_FORECAST_20260830_VERSION,versionRecettesRegulieres:BUDGETSOFT_TREASURY_REGULAR_INCOME_VERSION,dateReference:now.toISOString(),dateCible:cible.toISOString(),soldeReel:soldeInitial,variationPrevue:variation,soldePrevisionnel:solde,fourchette:{certain:arrondiTresorerie_(soldeInitial+certain),tresProbable:arrondiTresorerie_(soldeInitial+tresProbable),toutesHypotheses:solde},confiance:confianceTresorerie_(now,cible,lignes),lignes:lignes,resume:resume,pilotable:pilot||null,comptes:comptesBase.map(c=>({id:c.id,nom:c.nom,soldeReel:c.soldeReel,dateSolde:c.dateSolde,sourceSolde:c.sourceSolde})),performance:{dureeMs:Date.now()-t0}});
  });
}

function auditerRecettesRegulieresTresorerieBudgetSoft20260907(){
  const maintenant=new Date(),fin=new Date(maintenant.getFullYear(),maintenant.getMonth()+1,27),r=chargerTresoreriePrevisionnelle20260830(Utilities.formatDate(fin,Session.getScriptTimeZone(),'yyyy-MM-dd'));
  const reg=(r.lignes||[]).filter(x=>x.source==='revenu_regulier');
  const out={ok:!!r.ok,version:r.version,dateReference:r.dateReference,dateCible:r.dateCible,soldeReel:r.soldeReel,soldePrevisionnel:r.soldePrevisionnel,resume:r.resume,recettesRegulieres:reg};
  console.log('[AUDIT Tresorerie recettes regulieres] '+JSON.stringify(out));return out;
}
