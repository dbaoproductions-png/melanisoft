const CERBERE_ROLLING_VERSION='3.6.0';

/**
 * Doctrine Cerbère court terme :
 * - cycle BudgetSoft 28 -> 27 ;
 * - dépense faite par un compte de type carte en M => engagement réel imputé à M+1 ;
 * - autres mouvements => M ;
 * - le poste de commandement quotidien est la fenêtre roulante M/M+1 ;
 * - P0/R0 restent des canons ; le Plan les déforme sans les réécrire.
 */
function chargerCerbereRoulant(){
  const base=chargerCerbereV33();
  if(!base||base.ok===false)return base;
  const operations=lireTable_('Operations');
  let comptes=[];try{comptes=lireTable_('Comptes');}catch(e){}
  const cartes=identifierComptesCarteCerbere36_(comptes);
  const periodes=base.periodes||[];
  const rolling=periodes.map((p,i)=>({
    index:i+1,
    cbHeritee:0,
    cbEngageePourSuivant:0,
    reelNonCb:0,
    cbParCategorie:{},
    nonCbParCategorie:{},
    reglementsCarteNeutralises:0,
    operationsCb:0,
    operationsNonCb:0
  }));

  (operations||[]).forEach(o=>{
    const d=dateComptableCerbere_(o);if(!d)return;
    const pi=indicePeriodeCerbere36_(d,periodes);if(pi<0)return;
    const m=montantSigneCerbereV3_(o),cat=String(o.categorie||'Divers').trim()||'Divers';
    const cb=estOperationCarteCerbere36_(o,cartes);
    const reglement=estReglementGlobalCarteCerbere36_(o);
    if(reglement){rolling[pi].reglementsCarteNeutralises+=Math.abs(m);return;}
    if(cb&&m<0){
      const cible=pi+1;
      rolling[pi].cbEngageePourSuivant+=Math.abs(m);
      rolling[pi].operationsCb++;
      if(cible<rolling.length){
        rolling[cible].cbHeritee+=Math.abs(m);
        rolling[cible].cbParCategorie[cat]=(rolling[cible].cbParCategorie[cat]||0)+Math.abs(m);
      }
      return;
    }
    // Le réel non-CB reste imputé à sa période d'origine.
    if(m<0){rolling[pi].reelNonCb+=Math.abs(m);rolling[pi].nonCbParCategorie[cat]=(rolling[pi].nonCbParCategorie[cat]||0)+Math.abs(m);}
    rolling[pi].operationsNonCb++;
  });

  periodes.forEach((p,i)=>{
    const r=rolling[i];
    p.roulant={
      reelNonCb:arrondirCerbereV3_(r.reelNonCb),
      cbHeritee:arrondirCerbereV3_(r.cbHeritee),
      cbEngageePourSuivant:arrondirCerbereV3_(r.cbEngageePourSuivant),
      cbParCategorie:r.cbParCategorie,
      nonCbParCategorie:r.nonCbParCategorie,
      reglementsCarteNeutralises:arrondirCerbereV3_(r.reglementsCarteNeutralises),
      operationsCb:r.operationsCb,operationsNonCb:r.operationsNonCb
    };
    // Les enveloppes affichent le réel imputé : non-CB de M + CB héritée de M-1.
    (p.enveloppes||[]).forEach(x=>{
      const cat=String(x.categorie||'');
      const nonCb=Number(r.nonCbParCategorie[cat]||0),cbH=Number(r.cbParCategorie[cat]||0);
      x.reelNonCb=arrondirCerbereV3_(nonCb);x.cbHeritee=arrondirCerbereV3_(cbH);
      x.reelImpute=arrondirCerbereV3_(nonCb+cbH);
    });
  });

  base.fenetreRoulante=construireFenetreRoulanteCerbere36_(periodes);
  base.version=CERBERE_ROLLING_VERSION;
  base.principe='Cerbère pilote M et M+1 ensemble : CB de M imputée à M+1, autres mouvements à M.';
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.cartes_identifiees=Array.from(cartes.ids);
  base.diagnostic.moteur_roulant=CERBERE_ROLLING_VERSION;
  return serialiserCerberePourClient_(base);
}

function construireFenetreRoulanteCerbere36_(periodes){
  const m=periodes[0]||null,n=periodes[1]||null;
  if(!m||!n)return null;
  const tensionM=Number(m.resteAVentiler||0)-Number(m.roulant&&m.roulant.cbHeritee||0)-Number(m.engagementsPlanifies||0);
  const tensionN=Number(n.resteAVentiler||0)-Number(n.roulant&&n.roulant.cbHeritee||0)-Number(n.engagementsPlanifies||0);
  let niveau='vert',titre='Trajectoire saine sur deux mois';
  if(tensionM<0||tensionN<0){niveau='rouge';titre='Risque de surengagement sur la fenêtre roulante';}
  else if(Number(n.roulant&&n.roulant.cbHeritee||0)>Number(n.budgetReparti||0)*.6||tensionN<Number(n.budgetReparti||0)*.15){niveau='orange';titre='Vigilance : le mois suivant est déjà fortement engagé';}
  const raisons=[];
  if(Number(n.roulant&&n.roulant.cbHeritee||0)>0)raisons.push(arrondirCerbereV3_(n.roulant.cbHeritee)+' € de CB de M déjà imputés à M+1');
  if(Number(m.engagementsPlanifies||0)>0)raisons.push(arrondirCerbereV3_(m.engagementsPlanifies)+' € de Plan à venir sur M');
  if(Number(n.engagementsPlanifies||0)>0)raisons.push(arrondirCerbereV3_(n.engagementsPlanifies)+' € de Plan à venir sur M+1');
  return{niveau,titre,raisons,resteM:arrondirCerbereV3_(tensionM),resteM1:arrondirCerbereV3_(tensionN)};
}

function identifierComptesCarteCerbere36_(comptes){
  const ids=new Set(),noms=new Set();
  (comptes||[]).forEach(c=>{
    const s=normaliserTexteCerbereV35_([c.type,c.nature,c.nom].join(' '));
    if(/\bcarte\b|cb|debit differe/.test(s)){if(c.id!==undefined)ids.add(String(c.id));if(c.nom)noms.add(normaliserTexteCerbereV35_(c.nom));}
  });
  return{ids,noms};
}
function estOperationCarteCerbere36_(o,cartes){
  const compte=String(o.compte||o.compte_id||'');
  if(cartes.ids.has(compte)||cartes.noms.has(normaliserTexteCerbereV35_(compte)))return true;
  const mode=normaliserTexteCerbereV35_([o.mode,o.mode_paiement,o.moyen_paiement,o.type_paiement].filter(Boolean).join(' '));
  return /\bcb\b|carte bancaire|debit differe/.test(mode);
}
function estReglementGlobalCarteCerbere36_(o){
  const s=normaliserTexteCerbereV35_([o.categorie,o.libelle,o.libelle_bancaire,o.commentaire].filter(Boolean).join(' '));
  return /\[reglement cb\]|\[debit cb\]|reglement carte differee|debit differe carte|prelevement carte differee/.test(s);
}
function indicePeriodeCerbere36_(date,periodes){
  const t=debutJour_(new Date(date)).getTime();if(!isFinite(t))return-1;
  for(let i=0;i<(periodes||[]).length;i++){
    const p=periodes[i].periode||periodes[i],a=debutJour_(new Date(p.debut)).getTime(),b=debutJour_(new Date(p.fin)).getTime();
    if(t>=a&&t<=b)return i;
  }
  return-1;
}
