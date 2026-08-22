const CERBERE_V2_VERSION = '2.0.0';
const CERBERE_EPARGNE_MENSUELLE = 50;

/** Cerbère V2 : moteur de contrôle court terme. Lecture seule du réel. */
function chargerCerbereV2() {
  verifierInitialisation_();
  assurerTablesPlanCerbere_();
  const periodes = construirePeriodesCerbere_();
  const charges = lireTable_('Charges_fixes');
  const operations = lireTable_('Operations');
  const credits = lireTable_('Credits');
  const canon = chargerBudgetCanoniqueCerbere_();
  const resultats = periodes.map((p, i) => calculerPeriodeCerbere_(p, i, charges, operations, credits, canon));
  return {
    version:CERBERE_V2_VERSION,
    principe:'Cerbère applique la stratégie ; il ne la définit pas et ne modifie jamais le réel.',
    periodes:resultats,
    plan:chargerPlanCerbere()
  };
}

function construirePeriodesCerbere_() {
  // On privilégie le moteur de cycles existant s'il est disponible.
  try {
    if (typeof obtenirPeriodesBudget === 'function') {
      const p = obtenirPeriodesBudget();
      if (Array.isArray(p) && p.length) return p.slice(0,6).map(x=>({debut:new Date(x.debut),fin:new Date(x.fin),libelle:x.libelle||''}));
    }
  } catch(e) {}
  const now = debutJour_(new Date());
  const out=[];
  for(let i=0;i<6;i++){
    const d=new Date(now.getFullYear(),now.getMonth()+i,1), f=new Date(now.getFullYear(),now.getMonth()+i+1,0);
    out.push({debut:d,fin:f,libelle:'P'+(i+1)});
  }
  return out;
}

function calculerPeriodeCerbere_(p, index, charges, operations, credits, canon) {
  const plan = projeterPlanCerbere(p.debut,p.fin);
  const fixesBrutes = charges.filter(c=>chargeActiveCerbere_(c,p)).reduce((s,c)=>s+Math.abs(Number(c.montant||c.montant_indicatif||0)),0);
  const fixesPonderees = Math.max(0, fixesBrutes + plan.effets.correctionCharges - plan.effets.chargesEvitees);
  const ops = operations.filter(o=>dateDansPeriodeCerbere_(dateComptableCerbere_(o),p));
  const recettesReelles = ops.filter(o=>Number(o.montant||0)>0 && !estTresorerieCerbere_(o)).reduce((s,o)=>s+Number(o.montant||0),0);
  const depensesReelles = ops.filter(o=>Number(o.montant||0)<0 && !estTresorerieCerbere_(o)).reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0);
  const recettesStructurelles = estimerRecettesStructurellesCerbere_(operations,p,index);
  const ressources = recettesStructurelles + plan.effets.ressources;
  const reserve = plan.effets.reserveObjectifs;
  const pilotable = ressources - fixesPonderees - plan.effets.depenses - CERBERE_EPARGNE_MENSUELLE - reserve;
  const enveloppes = repartirCanonCerbere_(canon, pilotable, ops);
  const ecarts = enveloppes.filter(x=>x.reel>x.prevu).map(x=>({categorie:x.categorie,montant:x.reel-x.prevu}));
  const propositions = proposerCompensationsCerbere_(ecarts,enveloppes,index);
  const etat = pilotable < 0 || propositions.some(x=>x.niveau==='escalade') ? 'rouge' : ecarts.length ? 'orange' : 'vert';
  return {index:index+1,periode:p,plan,ressources,recettesStructurelles,fixesBrutes,fixesPonderees,epargne:CERBERE_EPARGNE_MENSUELLE,reserveObjectifs:reserve,depensesExceptionnelles:plan.effets.depenses,recettesReelles,depensesReelles,enveloppePilotable:pilotable,enveloppes,ecarts,propositions,etat};
}

function chargerBudgetCanoniqueCerbere_() {
  // Première grille explicite et modifiable : jamais dérivée automatiquement de l'historique.
  const defaults=[
    ['Courses',500,'essentiel',1],['Transports',120,'essentiel',2],['Voitures',160,'ajustable',3],['Santé',100,'essentiel',4],['Animaux',80,'ajustable',5],
    ['Maison / entretien',120,'ajustable',6],['Restaurants',80,'discretionnaire',7],['Loisirs',80,'discretionnaire',8],['Achats personnels',80,'discretionnaire',9],['Frais professionnels',50,'ajustable',10]
  ];
  const ss=SpreadsheetApp.getActive(); let sh=ss.getSheetByName('Cerbere_Budget_Canonique');
  if(!sh){sh=ss.insertSheet('Cerbere_Budget_Canonique');sh.getRange(1,1,1,5).setValues([['categorie','montant','nature','priorite','actif']]);sh.getRange(2,1,defaults.length,5).setValues(defaults.map(x=>[x[0],x[1],x[2],x[3],true]));sh.setFrozenRows(1);}
  return lireTablePlanCerbere_('Cerbere_Budget_Canonique').filter(x=>String(x.actif).toLowerCase()!=='false').map(x=>({categorie:String(x.categorie),montant:Math.max(0,Number(x.montant||0)),nature:String(x.nature||'ajustable'),priorite:Number(x.priorite||99)}));
}

function repartirCanonCerbere_(canon,pilotable,ops){
  const total=canon.reduce((s,c)=>s+c.montant,0), facteur=total>0?Math.min(1,Math.max(0,pilotable)/total):0;
  return canon.map(c=>{
    const prevu=c.nature==='essentiel'?c.montant:c.montant*facteur;
    const reel=ops.filter(o=>String(o.categorie||'').trim()===c.categorie && Number(o.montant||0)<0).reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0);
    return Object.assign({},c,{prevu,reel,reste:prevu-reel,etat:reel>prevu?'rouge':reel>prevu*.8?'orange':'vert'});
  });
}
function proposerCompensationsCerbere_(ecarts,enveloppes,index){
  const out=[];
  ecarts.forEach(e=>{
    let besoin=e.montant;
    const donneurs=enveloppes.filter(x=>x.categorie!==e.categorie && x.reste>0 && x.nature!=='essentiel').sort((a,b)=>(b.nature==='discretionnaire'?1:0)-(a.nature==='discretionnaire'?1:0)||b.reste-a.reste);
    const joints=[];
    donneurs.forEach(d=>{if(besoin<=.01)return;const m=Math.min(besoin,d.reste);if(m>0){joints.push({categorie:d.categorie,montant:m});besoin-=m;}});
    if(besoin<=.01) out.push({niveau:'periode',origine:e.categorie,montant:e.montant,compensations:joints,validation_requise:true});
    else if(index<5) out.push({niveau:'periode_suivante',origine:e.categorie,montant:e.montant,compensations:joints,reste_a_reporter:besoin,periode_cible:index+2,validation_requise:true});
    else out.push({niveau:'escalade',origine:e.categorie,montant:e.montant,reste:besoin,message:'Les compensations ordinaires ne suffisent plus : retour à la stratégie.',validation_requise:true});
  });
  return out;
}
function chargeActiveCerbere_(c,p){if(String(c.actif).toLowerCase()==='false')return false;const deb=c.date_debut?new Date(c.date_debut):null,fin=c.date_fin?new Date(c.date_fin):null;return(!deb||deb<=p.fin)&&(!fin||fin>=p.debut);}
function dateComptableCerbere_(o){return o.date_comptable||o.date||o.date_operation||'';}
function dateDansPeriodeCerbere_(v,p){if(!v)return false;const d=debutJour_(new Date(v));return !isNaN(d)&&d>=p.debut&&d<=p.fin;}
function estTresorerieCerbere_(o){return /^tresorerie_/i.test(String(o.type||''));}
function estimerRecettesStructurellesCerbere_(operations,p,index){
  // V2 : utilise les revenus réels de la période lorsqu'ils existent ; sinon moyenne prudente des 3 mois antérieurs.
  const courant=operations.filter(o=>dateDansPeriodeCerbere_(dateComptableCerbere_(o),p)&&Number(o.montant||0)>0&&!estTresorerieCerbere_(o)).reduce((s,o)=>s+Number(o.montant||0),0);
  if(index===0&&courant>0)return courant;
  const avant=new Date(p.debut);avant.setMonth(avant.getMonth()-3);
  const vals=operations.filter(o=>{const d=new Date(dateComptableCerbere_(o));return d>=avant&&d<p.debut&&Number(o.montant||0)>0&&!estTresorerieCerbere_(o)}).reduce((m,o)=>{const d=new Date(dateComptableCerbere_(o));const k=d.getFullYear()+'-'+d.getMonth();m[k]=(m[k]||0)+Number(o.montant||0);return m;},{});
  const mois=Object.values(vals);return mois.length?mois.reduce((a,b)=>a+b,0)/mois.length:0;
}
