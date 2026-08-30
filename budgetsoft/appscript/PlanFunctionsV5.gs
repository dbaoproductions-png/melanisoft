const PLAN_FUNCTIONS_V5_VERSION='5.1.0';

/**
 * PLAN V5 — actions mesurables.
 *
 * Doctrine :
 * - un objectif décrit un résultat opérationnel ;
 * - une action possède une fonction de mesure ;
 * - l'enquête lit les faits BudgetSoft, sans fabriquer d'opération ;
 * - chaque résultat expose les preuves utilisées et un niveau de confiance ;
 * - une condition non remplie bloque l'effet prévisionnel sans supprimer l'action.
 */
const PLAN_FUNCTIONS_V5={
  REMBOURSER:{libelle:'Rembourser',unite:'€'},
  TRANSFERER:{libelle:'Épargner / transférer',unite:'€'},
  RECEVOIR:{libelle:'Recevoir',unite:'€'},
  REDUIRE:{libelle:'Réduire',unite:'€/mois'},
  SUPPRIMER:{libelle:'Supprimer',unite:'€/mois'},
  REMPLACER:{libelle:'Remplacer',unite:'€/mois'},
  PLAFONNER:{libelle:'Plafonner',unite:'€'},
  ATTEINDRE:{libelle:'Atteindre / maintenir un stock',unite:'€'}
};

function assurerPlanFunctionsV5_(){
  assurerPlanActionsV4_();
  assurerColonnesPlanV4_('Plan_Actions',[
    'fonction_plan','cible_valeur','date_cible','compte_source_id','compte_destination_id',
    'valeur_depart','valeur_remplacement','enquete_auto','tolerance_mesure','dernier_resultat_mesure','derniere_enquete',
    'condition_libelle','condition_statut','condition_date','source_remplacement_id','source_remplacement_libelle'
  ]);
}

function listerFonctionsPlanV5(){
  return Object.keys(PLAN_FUNCTIONS_V5).map(k=>({code:k,libelle:PLAN_FUNCTIONS_V5[k].libelle,unite:PLAN_FUNCTIONS_V5[k].unite}));
}

function chargerPlanActionsV5(){
  assurerPlanFunctionsV5_();
  const base=chargerPlanActionsV4();
  const comptes=(typeof chargerSyntheseComptes20260828==='function'?chargerSyntheseComptes20260828():{comptes:[]}).comptes||[];
  const actions=(base.actions||[]).map(a=>Object.assign({},a,{mesure:evaluerActionPlanV5_(a)}));
  const parId=Object.fromEntries(actions.map(a=>[String(a.id),a]));
  const groupes=(base.groupes||[]).map(g=>Object.assign({},g,{actions:(g.actions||[]).map(a=>parId[String(a.id)]||a),progression:agregerProgressionPlanV5_((g.actions||[]).map(a=>parId[String(a.id)]||a))}));
  const sansObjectif=(base.sansObjectif||[]).map(a=>parId[String(a.id)]||a);
  return serialiserCerberePourClient_(Object.assign({},base,{
    version:PLAN_FUNCTIONS_V5_VERSION,
    fonctions:listerFonctionsPlanV5(),
    comptes,
    actions,
    groupes,
    sansObjectif,
    progression_globale:agregerProgressionPlanV5_(actions)
  }));
}

function enregistrerActionPlanV5(d){
  assurerPlanFunctionsV5_();
  d=Object.assign({},d||{});
  const f=String(d.fonction_plan||'').toUpperCase();
  if(!PLAN_FUNCTIONS_V5[f])throw new Error('Fonction de mesure inconnue.');
  d.fonction_plan=f;
  d.cible_valeur=Math.max(0,Number(d.cible_valeur||d.impact_montant||0));
  d.date_cible=d.date_cible||'';
  d.compte_source_id=String(d.compte_source_id||'');
  d.compte_destination_id=String(d.compte_destination_id||'');
  d.source_remplacement_id=String(d.source_remplacement_id||'');
  d.source_remplacement_libelle=String(d.source_remplacement_libelle||'').trim();
  d.valeur_remplacement=Math.max(0,Number(d.valeur_remplacement||0));
  d.enquete_auto=d.enquete_auto!==false&&String(d.enquete_auto)!=='false';
  d.tolerance_mesure=Math.max(0,Number(d.tolerance_mesure||0));
  d.condition_libelle=String(d.condition_libelle||'').trim();
  d.condition_statut=String(d.condition_statut||'').trim();
  d.condition_date=d.condition_date||'';

  const ancienne=lireFeuilleDynamiquePlan_('Plan_Actions').find(x=>String(x.id)===String(d.id||''))||{};
  if(!d.valeur_depart)d.valeur_depart=ancienne.valeur_depart||valeurDepartPlanV5_(d);

  // Une condition non remplie interdit de présenter l'effet comme acquis dans Cerbère.
  if(d.condition_libelle&&d.condition_statut!=='Remplie')d.impact_confirme=false;

  // Compatibilité Cerbère V4 : on conserve un impact financier seulement quand il a un sens économique.
  if(f==='REDUIRE'||f==='SUPPRIMER'||f==='REMPLACER'){
    d.impact_type='baisse_charge';
    d.impact_montant=d.cible_valeur;
    d.impact_frequence='mensuel';
  }else if(f==='RECEVOIR'){
    d.impact_type='hausse_revenu';
    d.impact_montant=d.cible_valeur;
    d.impact_frequence=String(d.impact_frequence||'ponctuel')==='mensuel'?'mensuel':'ponctuel';
  }else if(f==='TRANSFERER'||f==='REMBOURSER'||f==='PLAFONNER'||f==='ATTEINDRE'){
    // Ces fonctions ne sont pas un « gain » additionnable.
    d.impact_type='aucun';
    d.impact_montant=d.cible_valeur;
    d.impact_frequence='ponctuel';
  }

  enregistrerActionPlanV4(d);
  return chargerPlanActionsV5();
}

function evaluerActionPlanV5(actionId){
  assurerPlanFunctionsV5_();
  const a=typeof actionId==='object'?actionId:lireFeuilleDynamiquePlan_('Plan_Actions').find(x=>String(x.id)===String(actionId));
  if(!a)throw new Error('Action introuvable.');
  return serialiserCerberePourClient_(evaluerActionPlanV5_(a));
}

function evaluerToutesActionsPlanV5(){
  assurerPlanFunctionsV5_();
  return serialiserCerberePourClient_(lireFeuilleDynamiquePlan_('Plan_Actions').map(a=>({id:a.id,libelle:a.libelle,mesure:evaluerActionPlanV5_(a)})));
}

function evaluerActionPlanV5_(a){
  const f=String(a.fonction_plan||'').toUpperCase();
  const cible=Math.max(0,Number(a.cible_valeur||a.impact_montant||0));
  const base={fonction:f,cible,realise:0,attendu_a_date:null,progression:0,ecart:null,statut:'À instruire',confiance:'à_valider',preuves:[],unite:(PLAN_FUNCTIONS_V5[f]||{}).unite||'€'};
  if(!PLAN_FUNCTIONS_V5[f])return base;
  if(a.condition_libelle&&String(a.condition_statut||'')!=='Remplie'){
    return Object.assign(base,{statut:'En attente : '+String(a.condition_libelle),condition:{libelle:a.condition_libelle,statut:a.condition_statut||'En attente',date:a.condition_date||''}});
  }
  if(a.enquete_auto===false||String(a.enquete_auto)==='false')return Object.assign(base,{statut:'Enquête manuelle'});
  try{
    let r;
    if(f==='REMBOURSER')r=evaluerRemboursementPlanV5_(a,cible);
    else if(f==='TRANSFERER')r=evaluerTransfertPlanV5_(a,cible);
    else if(f==='RECEVOIR')r=evaluerReceptionPlanV5_(a,cible);
    else if(f==='REDUIRE')r=evaluerReductionPlanV5_(a,cible);
    else if(f==='SUPPRIMER')r=evaluerSuppressionPlanV5_(a,cible);
    else if(f==='REMPLACER')r=evaluerRemplacementPlanV5_(a,cible);
    else if(f==='PLAFONNER')r=evaluerPlafondPlanV5_(a,cible);
    else if(f==='ATTEINDRE')r=evaluerStockPlanV5_(a,cible);
    return finaliserMesurePlanV5_(Object.assign(base,r||{}),a);
  }catch(e){
    return Object.assign(base,{statut:'Enquête impossible',erreur:e&&e.message?e.message:String(e)});
  }
}

function finaliserMesurePlanV5_(r,a){
  r.realise=arrondirPlanV5_(r.realise);
  if(r.attendu_a_date!==null&&r.attendu_a_date!==undefined)r.attendu_a_date=arrondirPlanV5_(r.attendu_a_date);
  if(r.ecart===null||r.ecart===undefined){
    const ref=r.attendu_a_date!==null&&r.attendu_a_date!==undefined?r.attendu_a_date:r.cible;
    r.ecart=arrondirPlanV5_(r.realise-ref);
  }
  if(r.progression===null||r.progression===undefined)r.progression=r.cible>0?Math.max(0,Math.min(100,(r.realise/r.cible)*100)):0;
  r.progression=Math.round(Number(r.progression||0)*10)/10;
  if(!r.statut||r.statut==='À instruire'){
    if(r.progression>=100)r.statut='Atteint';
    else if(r.attendu_a_date!==null&&r.realise+Number(a.tolerance_mesure||0)<r.attendu_a_date)r.statut='En retard';
    else r.statut='En cours';
  }
  return r;
}

function valeurDepartPlanV5_(a){
  const f=String(a.fonction_plan||'').toUpperCase();
  if(f==='REMBOURSER'&&(a.source_type==='credit'||a.source_type==='dette'))return capitalSourcePlanV4_(a.source_type,a.source_id);
  if(f==='ATTEINDRE'){
    const c=trouverCompteMesurePlanV5_(a.compte_destination_id||a.compte_source_id||a.source_id);
    return c?Number(c.soldeReel||0):0;
  }
  if((f==='REDUIRE'||f==='SUPPRIMER'||f==='REMPLACER')&&a.source_type==='charge_fixe'){
    const c=lireTable_('Charges_fixes').find(x=>String(x.id)===String(a.source_id));
    return c?Math.abs(Number(c.montant||0)):0;
  }
  return 0;
}

function evaluerRemboursementPlanV5_(a,cible){
  if(a.source_type!=='credit'&&a.source_type!=='dette')return {statut:'Source crédit/dette requise'};
  const depart=Math.max(0,Number(a.valeur_depart||0));
  const actuel=capitalSourcePlanV4_(a.source_type,a.source_id);
  const realise=Math.max(0,depart-actuel);
  return {realise,attendu_a_date:attenduLineairePlanV5_(a,cible),confiance:'certaine',preuves:[{type:a.source_type,id:a.source_id,valeur_actuelle:actuel,valeur_depart:depart}]};
}

function evaluerTransfertPlanV5_(a,cible){
  const source=String(a.compte_source_id||''),dest=String(a.compte_destination_id||'');
  if(!source||!dest)return {statut:'Deux comptes requis'};
  const ops=operationsDansFenetrePlanV5_(a).filter(o=>['tresorerie_sortie','tresorerie_entree'].includes(String(o.type||'').toLowerCase()));
  const sorties=ops.filter(o=>compteCorrespondPlanV5_(o.compte,source)&&String(o.type).toLowerCase()==='tresorerie_sortie');
  const entrees=ops.filter(o=>compteCorrespondPlanV5_(o.compte,dest)&&String(o.type).toLowerCase()==='tresorerie_entree');
  const utilise={};let realise=0,preuves=[];
  sorties.forEach(s=>{
    const sm=Math.abs(Number(s.montant||0)),sd=dateMesurePlanV5_(s);
    const i=entrees.findIndex((e,idx)=>!utilise[idx]&&Math.abs(Math.abs(Number(e.montant||0))-sm)<0.011&&Math.abs(dateMesurePlanV5_(e)-sd)<=3*86400000);
    if(i>=0){utilise[i]=true;realise+=sm;preuves.push({type:'transfert',sortie_id:s.id,entree_id:entrees[i].id,montant:sm,date:s.date_comptable||s.date||''});}
  });
  return {realise,attendu_a_date:attenduLineairePlanV5_(a,cible),confiance:preuves.length?'certaine':'à_valider',preuves};
}

function evaluerReceptionPlanV5_(a,cible){
  let ops=operationsDansFenetrePlanV5_(a).filter(o=>String(o.type||'').toLowerCase()==='revenu');
  ops=filtrerOperationsSourcePlanV5_(ops,a);
  const realise=ops.reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0);
  const attendu=String(a.impact_frequence||'ponctuel')==='mensuel'?attenduMensuelCumulePlanV5_(a,cible):attenduLineairePlanV5_(a,cible);
  return {realise,attendu_a_date:attendu,confiance:ops.length?'certaine':'à_valider',preuves:ops.slice(0,20).map(preuveOperationPlanV5_)};
}

function evaluerReductionPlanV5_(a,cible){
  if(a.source_type!=='charge_fixe')return {statut:'Charge fixe requise'};
  const cf=lireTable_('Charges_fixes').find(x=>String(x.id)===String(a.source_id));
  if(!cf)return {statut:'Charge fixe introuvable'};
  const reference=Math.max(0,Number(a.valeur_depart||cf.montant||0));
  const ops=operationsDansFenetrePlanV5_(a).filter(o=>String(o.charge_fixe_id||'')===String(a.source_id)).sort((x,y)=>dateMesurePlanV5_(y)-dateMesurePlanV5_(x));
  if(!ops.length)return {realise:0,statut:'En attente d’un débit réel',confiance:'à_valider',preuves:[]};
  const actuel=Math.abs(Number(ops[0].montant||0));
  const realise=Math.max(0,reference-actuel);
  return {realise,attendu_a_date:cible,confiance:'certaine',preuves:[preuveOperationPlanV5_(ops[0])],reference,actuel};
}

function evaluerSuppressionPlanV5_(a,cible){
  if(a.source_type!=='charge_fixe')return {statut:'Charge fixe requise'};
  const ops=operationsDansFenetrePlanV5_(a).filter(o=>String(o.charge_fixe_id||'')===String(a.source_id));
  const debut=dateDebutActionPlanV5_(a),jours=debut?Math.floor((new Date()-debut)/86400000):0;
  if(ops.length)return {realise:0,attendu_a_date:cible,statut:'Toujours débitée',confiance:'certaine',preuves:ops.slice(-5).map(preuveOperationPlanV5_)};
  if(jours<28)return {realise:0,attendu_a_date:cible,statut:'À vérifier après un cycle',confiance:'à_valider',preuves:[]};
  return {realise:cible,attendu_a_date:cible,progression:100,statut:'Suppression probable',confiance:'probable',preuves:[{type:'absence_debit',depuis:a.date_effet||'',jours}]};
}

function evaluerRemplacementPlanV5_(a,cible){
  if(a.source_type!=='charge_fixe'||!a.source_id)return {statut:'Ancienne charge fixe requise'};
  const cfs=lireTable_('Charges_fixes');
  const ancienne=cfs.find(x=>String(x.id)===String(a.source_id));
  if(!ancienne)return {statut:'Ancienne charge fixe introuvable'};
  const debut=dateDebutActionPlanV5_(a);if(!debut)return {statut:'Date d’effet requise'};
  const maintenant=new Date();
  if(maintenant<debut)return {realise:0,progression:0,attendu_a_date:0,statut:'Programmé',confiance:'certaine',preuves:[{type:'date_effet',date:a.date_effet||''}]};

  const ops=lireTable_('Operations').filter(o=>{const d=dateMesurePlanV5_(o);return !isNaN(d)&&d>=debut&&d<=maintenant;});
  const anciennesOps=ops.filter(o=>String(o.charge_fixe_id||'')===String(a.source_id));
  let nouvelle=cfs.find(x=>String(x.id)===String(a.source_remplacement_id||''))||null;
  if(!nouvelle&&a.source_remplacement_libelle){
    const q=normaliserRechercheAction_(a.source_remplacement_libelle);
    nouvelle=cfs.find(x=>normaliserRechercheAction_((x.libelle||'')+' '+(x.libelle_bancaire||'')).includes(q))||null;
  }
  let nouvellesOps=[];
  if(nouvelle)nouvellesOps=ops.filter(o=>String(o.charge_fixe_id||'')===String(nouvelle.id));
  if(!nouvellesOps.length&&a.source_remplacement_libelle){
    const q=normaliserRechercheAction_(a.source_remplacement_libelle),mots=q.split(' ').filter(x=>x.length>=3);
    nouvellesOps=ops.filter(o=>{const t=normaliserRechercheAction_((o.libelle_bancaire||'')+' '+(o.libelle||''));return mots.length&&mots.some(m=>t.includes(m));});
  }

  const jours=Math.floor((maintenant-debut)/86400000);
  const ancienneDisparue=anciennesOps.length===0&&jours>=28;
  const nouvelleVue=nouvellesOps.length>0;
  const progression=(ancienneDisparue?50:0)+(nouvelleVue?50:0);
  const reference=Math.max(0,Number(a.valeur_depart||ancienne.montant||0));
  const nouveauMontant=nouvelleVue?Math.abs(Number(nouvellesOps.sort((x,y)=>dateMesurePlanV5_(y)-dateMesurePlanV5_(x))[0].montant||0)):Math.max(0,Number(a.valeur_remplacement||(nouvelle&&nouvelle.montant)||0));
  const economie=Math.max(0,reference-nouveauMontant);
  const preuves=[];
  if(ancienneDisparue)preuves.push({type:'absence_debit',source_id:a.source_id,depuis:a.date_effet||'',jours});
  else anciennesOps.slice(-3).forEach(o=>preuves.push(preuveOperationPlanV5_(o)));
  nouvellesOps.slice(-3).forEach(o=>preuves.push(preuveOperationPlanV5_(o)));

  let statut='Transition en cours',confiance='à_valider';
  if(ancienneDisparue&&nouvelleVue){statut='Remplacement vérifié';confiance='certaine';}
  else if(nouvelleVue&&anciennesOps.length){statut='Double couverture à contrôler';confiance='certaine';}
  else if(ancienneDisparue&&!nouvelleVue){statut='Ancien contrat arrêté · nouveau à vérifier';confiance='probable';}
  else if(jours<28&&!nouvelleVue){statut='À vérifier après prise d’effet';}
  return {realise:ancienneDisparue&&nouvelleVue?economie:0,attendu_a_date:cible,progression,statut,confiance,preuves,reference,nouveau_montant:nouveauMontant,economie_constatee:economie};
}

function evaluerPlafondPlanV5_(a,cible){
  let ops=operationsDansFenetrePlanV5_(a).filter(o=>String(o.type||'').toLowerCase()==='depense');
  if(a.categorie)ops=ops.filter(o=>String(o.categorie||'')===String(a.categorie));
  const realise=ops.reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0);
  const respect=cible>0&&realise<=cible;
  return {realise,attendu_a_date:cible,progression:respect?100:(cible>0?Math.max(0,Math.min(100,cible/realise*100)):0),ecart:arrondirPlanV5_(cible-realise),statut:respect?'Plafond respecté':'Plafond dépassé',confiance:'certaine',preuves:ops.slice(-20).map(preuveOperationPlanV5_)};
}

function evaluerStockPlanV5_(a,cible){
  const id=a.compte_destination_id||a.compte_source_id||a.source_id;
  const c=trouverCompteMesurePlanV5_(id);
  if(!c)return {statut:'Compte requis'};
  const realise=Number(c.soldeReel||0);
  const tolerance=Math.max(0,Number(a.tolerance_mesure||0));
  return {realise,attendu_a_date:cible,progression:cible>0?Math.max(0,Math.min(100,realise/cible*100)):0,statut:realise+tolerance>=cible?'Stock atteint':'Stock à constituer',confiance:'certaine',preuves:[{type:'compte',id:c.id,nom:c.nom,date:c.dateSolde,solde:realise,source:c.sourceSolde}]};
}

function operationsDansFenetrePlanV5_(a){
  const debut=dateDebutActionPlanV5_(a),fin=a.date_cible?new Date(a.date_cible):new Date();
  return lireTable_('Operations').filter(o=>{
    const d=dateMesurePlanV5_(o);if(isNaN(d))return false;
    if(debut&&d<debut)return false;
    if(fin&&!isNaN(fin)&&d>fin&&fin<new Date())return false;
    return d<=new Date();
  });
}

function filtrerOperationsSourcePlanV5_(ops,a){
  const q=normaliserRechercheAction_(a.source_libelle||a.libelle||'');
  const cat=String(a.categorie||'');
  if(cat){const cc=ops.filter(o=>String(o.categorie||'')===cat);if(cc.length)return cc;}
  if(q.length>=3){const mots=q.split(' ').filter(x=>x.length>=3);const mm=ops.filter(o=>{const t=normaliserRechercheAction_((o.libelle_bancaire||'')+' '+(o.libelle||''));return mots.some(m=>t.includes(m));});if(mm.length)return mm;}
  return ops;
}

function trouverCompteMesurePlanV5_(id){
  const v=chargerSyntheseComptes20260828();
  return (v.comptes||[]).find(c=>String(c.id)===String(id)||String(c.nom)===String(id))||null;
}
function compteCorrespondPlanV5_(val,id){const c=trouverCompteMesurePlanV5_(id);return c&&(String(val)===String(c.id)||String(val)===String(c.nom));}
function dateDebutActionPlanV5_(a){const d=new Date(a.date_effet||a.date_prevue||a.cree_le||'');return isNaN(d)?null:d;}
function dateMesurePlanV5_(o){return new Date(o.date_comptable||o.date||o.date_operation||0);}
function preuveOperationPlanV5_(o){return {type:'operation',id:o.id||'',date:o.date_comptable||o.date||'',libelle:o.libelle||o.libelle_bancaire||'',montant:Math.abs(Number(o.montant||0)),categorie:o.categorie||'',compte:o.compte||''};}
function arrondirPlanV5_(n){return Math.round((Number(n)||0)*100)/100;}

function attenduLineairePlanV5_(a,cible){
  const d0=dateDebutActionPlanV5_(a),d1=a.date_cible?new Date(a.date_cible):null,now=new Date();
  if(!d0||!d1||isNaN(d1)||d1<=d0)return null;
  if(now<=d0)return 0;if(now>=d1)return cible;
  return arrondirPlanV5_(cible*((now-d0)/(d1-d0)));
}

function attenduMensuelCumulePlanV5_(a,montantMensuel){
  const d0=dateDebutActionPlanV5_(a),now=new Date();if(!d0||now<d0)return 0;
  const fin=a.date_cible?new Date(a.date_cible):now,limite=!isNaN(fin)&&fin<now?fin:now;
  const mois=Math.max(1,(limite.getFullYear()-d0.getFullYear())*12+(limite.getMonth()-d0.getMonth())+1);
  return arrondirPlanV5_(Math.max(0,Number(montantMensuel||0))*mois);
}

function agregerProgressionPlanV5_(actions){
  const ms=(actions||[]).map(a=>a.mesure||evaluerActionPlanV5_(a)).filter(m=>m&&PLAN_FUNCTIONS_V5[m.fonction]);
  if(!ms.length)return {actions_mesurables:0,progression:null,atteintes:0,en_retard:0,a_valider:0};
  return {
    actions_mesurables:ms.length,
    progression:Math.round(ms.reduce((s,m)=>s+Number(m.progression||0),0)/ms.length*10)/10,
    atteintes:ms.filter(m=>Number(m.progression||0)>=100).length,
    en_retard:ms.filter(m=>/retard|dépassé|toujours débitée|double couverture/i.test(String(m.statut||''))).length,
    a_valider:ms.filter(m=>String(m.confiance||'')==='à_valider').length
  };
}