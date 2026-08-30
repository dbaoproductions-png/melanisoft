const PLAN_PERFORMANCE_V56_VERSION='5.6.0';

/** Une seule lecture des grosses tables par enquête Plan. */
function contextePlanV56_(){
  const t0=Date.now();
  const ops=lireTable_('Operations');
  const cfs=lireTable_('Charges_fixes');
  const comptes=(typeof chargerSyntheseComptes20260828==='function'?chargerSyntheseComptes20260828():{comptes:[]}).comptes||[];
  return {ops,cfs,comptes,now:new Date(),lecture_ms:Date.now()-t0};
}

function evaluerToutesActionsPlanV56_(actions){
  const ctx=contextePlanV56_();
  const t0=Date.now();
  const mesures=(actions||[]).map(a=>({id:a.id,libelle:a.libelle,mesure:evaluerActionPlanV56_(a,ctx)}));
  return {mesures,performance:{version:PLAN_PERFORMANCE_V56_VERSION,lecture_ms:ctx.lecture_ms,evaluation_ms:Date.now()-t0,operations:ctx.ops.length,charges_fixes:ctx.cfs.length,comptes:ctx.comptes.length}};
}

function evaluerActionPlanV56_(a,ctx){
  const f=String(a.fonction_plan||'').toUpperCase(),cible=Math.max(0,Number(a.cible_valeur||a.impact_montant||0));
  const base={fonction:f,cible,realise:0,attendu_a_date:null,progression:0,ecart:null,statut:'À instruire',confiance:'à_valider',preuves:[],unite:(PLAN_FUNCTIONS_V5[f]||{}).unite||'€'};
  if(!PLAN_FUNCTIONS_V5[f])return base;
  if(a.condition_libelle&&String(a.condition_statut||'')!=='Remplie')return Object.assign(base,{statut:'En attente : '+String(a.condition_libelle),condition:{libelle:a.condition_libelle,statut:a.condition_statut||'En attente',date:a.condition_date||''}});
  if(a.enquete_auto===false||String(a.enquete_auto)==='false')return Object.assign(base,{statut:'Enquête manuelle'});
  try{
    let r={};
    if(f==='REMBOURSER')r=evaluerRemboursementPlanV5_(a,cible);
    else if(f==='TRANSFERER')r=evaluerTransfertPlanV56_(a,cible,ctx);
    else if(f==='RECEVOIR')r=evaluerReceptionPlanV56_(a,cible,ctx);
    else if(f==='REDUIRE')r=evaluerReductionPlanV56_(a,cible,ctx);
    else if(f==='SUPPRIMER')r=evaluerSuppressionPlanV56_(a,cible,ctx);
    else if(f==='REMPLACER')r=evaluerRemplacementPlanV56_(a,cible,ctx);
    else if(f==='PLAFONNER')r=evaluerPlafondPlanV56_(a,cible,ctx);
    else if(f==='ATTEINDRE')r=evaluerStockPlanV56_(a,cible,ctx);
    return finaliserMesurePlanV5_(Object.assign(base,r||{}),a);
  }catch(e){return Object.assign(base,{statut:'Enquête impossible',erreur:e&&e.message?e.message:String(e)});}
}

function opsFenetrePlanV56_(a,ctx){
  const debut=dateDebutActionPlanV5_(a),fin=a.date_cible?new Date(a.date_cible):ctx.now;
  return ctx.ops.filter(o=>{const d=dateMesurePlanV5_(o);if(isNaN(d)||d>ctx.now)return false;if(debut&&d<debut)return false;if(fin&&!isNaN(fin)&&fin<ctx.now&&d>fin)return false;return true;});
}
function compteV56_(ctx,id){return (ctx.comptes||[]).find(c=>String(c.id)===String(id)||String(c.nom)===String(id))||null;}
function compteOpV56_(ctx,val,id){const c=compteV56_(ctx,id);return !!c&&(String(val)===String(c.id)||String(val)===String(c.nom));}

function evaluerTransfertPlanV56_(a,cible,ctx){
  const source=String(a.compte_source_id||''),dest=String(a.compte_destination_id||'');if(!source||!dest)return {statut:'Deux comptes requis'};
  const ops=opsFenetrePlanV56_(a,ctx).filter(o=>['tresorerie_sortie','tresorerie_entree'].includes(String(o.type||'').toLowerCase()));
  const sorties=ops.filter(o=>compteOpV56_(ctx,o.compte,source)&&String(o.type).toLowerCase()==='tresorerie_sortie');
  const entrees=ops.filter(o=>compteOpV56_(ctx,o.compte,dest)&&String(o.type).toLowerCase()==='tresorerie_entree');
  const used={};let realise=0,preuves=[];
  sorties.forEach(s=>{const sm=Math.abs(Number(s.montant||0)),sd=dateMesurePlanV5_(s);const i=entrees.findIndex((e,k)=>!used[k]&&Math.abs(Math.abs(Number(e.montant||0))-sm)<.011&&Math.abs(dateMesurePlanV5_(e)-sd)<=259200000);if(i>=0){used[i]=1;realise+=sm;preuves.push({type:'transfert',sortie_id:s.id,entree_id:entrees[i].id,montant:sm,date:s.date_comptable||s.date||''});}});
  return {realise,attendu_a_date:attenduLineairePlanV5_(a,cible),confiance:preuves.length?'certaine':'à_valider',preuves};
}
function evaluerReceptionPlanV56_(a,cible,ctx){
  let ops=opsFenetrePlanV56_(a,ctx).filter(o=>String(o.type||'').toLowerCase()==='revenu');ops=filtrerOperationsSourcePlanV5_(ops,a);
  const realise=ops.reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0),attendu=String(a.impact_frequence||'ponctuel')==='mensuel'?attenduMensuelCumulePlanV5_(a,cible):attenduLineairePlanV5_(a,cible);
  return {realise,attendu_a_date:attendu,confiance:ops.length?'certaine':'à_valider',preuves:ops.slice(0,20).map(preuveOperationPlanV5_)};
}
function evaluerReductionPlanV56_(a,cible,ctx){
  if(a.source_type!=='charge_fixe')return {statut:'Charge fixe requise'};const cf=ctx.cfs.find(x=>String(x.id)===String(a.source_id));if(!cf)return {statut:'Charge fixe introuvable'};
  const reference=Math.max(0,Number(a.valeur_depart||cf.montant||0));const ops=opsFenetrePlanV56_(a,ctx).filter(o=>String(o.charge_fixe_id||'')===String(a.source_id)).sort((x,y)=>dateMesurePlanV5_(y)-dateMesurePlanV5_(x));
  if(!ops.length)return {realise:0,statut:'En attente d’un débit réel',confiance:'à_valider',preuves:[]};const actuel=Math.abs(Number(ops[0].montant||0));return {realise:Math.max(0,reference-actuel),attendu_a_date:cible,confiance:'certaine',preuves:[preuveOperationPlanV5_(ops[0])],reference,actuel};
}
function evaluerSuppressionPlanV56_(a,cible,ctx){
  if(a.source_type!=='charge_fixe')return {statut:'Charge fixe requise'};const ops=opsFenetrePlanV56_(a,ctx).filter(o=>String(o.charge_fixe_id||'')===String(a.source_id)),debut=dateDebutActionPlanV5_(a),jours=debut?Math.floor((ctx.now-debut)/86400000):0;
  if(ops.length)return {realise:0,attendu_a_date:cible,statut:'Toujours débitée',confiance:'certaine',preuves:ops.slice(-5).map(preuveOperationPlanV5_)};if(jours<28)return {realise:0,attendu_a_date:cible,statut:'À vérifier après un cycle',confiance:'à_valider',preuves:[]};return {realise:cible,attendu_a_date:cible,progression:100,statut:'Suppression probable',confiance:'probable',preuves:[{type:'absence_debit',depuis:a.date_effet||'',jours}]};
}
function evaluerRemplacementPlanV56_(a,cible,ctx){
  if(a.source_type!=='charge_fixe'||!a.source_id)return {statut:'Ancienne charge fixe requise'};const ancienne=ctx.cfs.find(x=>String(x.id)===String(a.source_id));if(!ancienne)return {statut:'Ancienne charge fixe introuvable'};
  const debut=dateDebutActionPlanV5_(a);if(!debut)return {statut:'Date d’effet requise'};if(ctx.now<debut)return {realise:0,progression:0,attendu_a_date:0,statut:'Programmé',confiance:'certaine',preuves:[{type:'date_effet',date:a.date_effet||''}]};
  const ops=ctx.ops.filter(o=>{const d=dateMesurePlanV5_(o);return !isNaN(d)&&d>=debut&&d<=ctx.now;}),anciennesOps=ops.filter(o=>String(o.charge_fixe_id||'')===String(a.source_id));
  let nouvelle=ctx.cfs.find(x=>String(x.id)===String(a.source_remplacement_id||''))||null;if(!nouvelle&&a.source_remplacement_libelle){const q=normaliserRechercheAction_(a.source_remplacement_libelle);nouvelle=ctx.cfs.find(x=>normaliserRechercheAction_((x.libelle||'')+' '+(x.libelle_bancaire||'')).includes(q))||null;}
  let nouvellesOps=nouvelle?ops.filter(o=>String(o.charge_fixe_id||'')===String(nouvelle.id)):[];if(!nouvellesOps.length&&a.source_remplacement_libelle){const q=normaliserRechercheAction_(a.source_remplacement_libelle),mots=q.split(' ').filter(x=>x.length>=3);nouvellesOps=ops.filter(o=>{const t=normaliserRechercheAction_((o.libelle_bancaire||'')+' '+(o.libelle||''));return mots.length&&mots.some(m=>t.includes(m));});}
  const jours=Math.floor((ctx.now-debut)/86400000),ancienneDisparue=anciennesOps.length===0&&jours>=28,nouvelleVue=nouvellesOps.length>0,progression=(ancienneDisparue?50:0)+(nouvelleVue?50:0),reference=Math.max(0,Number(a.valeur_depart||ancienne.montant||0)),nouveauMontant=nouvelleVue?Math.abs(Number(nouvellesOps.slice().sort((x,y)=>dateMesurePlanV5_(y)-dateMesurePlanV5_(x))[0].montant||0)):Math.max(0,Number(a.valeur_remplacement||(nouvelle&&nouvelle.montant)||0)),economie=Math.max(0,reference-nouveauMontant),preuves=[];
  if(ancienneDisparue)preuves.push({type:'absence_debit',source_id:a.source_id,depuis:a.date_effet||'',jours});else anciennesOps.slice(-3).forEach(o=>preuves.push(preuveOperationPlanV5_(o)));nouvellesOps.slice(-3).forEach(o=>preuves.push(preuveOperationPlanV5_(o)));
  let statut='Transition en cours',confiance='à_valider';if(ancienneDisparue&&nouvelleVue){statut='Remplacement vérifié';confiance='certaine';}else if(nouvelleVue&&anciennesOps.length){statut='Double couverture à contrôler';confiance='certaine';}else if(ancienneDisparue&&!nouvelleVue){statut='Ancien contrat arrêté · nouveau à vérifier';confiance='probable';}else if(jours<28&&!nouvelleVue)statut='À vérifier après prise d’effet';
  return {realise:ancienneDisparue&&nouvelleVue?economie:0,attendu_a_date:cible,progression,statut,confiance,preuves,reference,nouveau_montant:nouveauMontant,economie_constatee:economie};
}
function evaluerPlafondPlanV56_(a,cible,ctx){let ops=opsFenetrePlanV56_(a,ctx).filter(o=>String(o.type||'').toLowerCase()==='depense');if(a.categorie)ops=ops.filter(o=>String(o.categorie||'')===String(a.categorie));const realise=ops.reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0),respect=cible>0&&realise<=cible;return {realise,attendu_a_date:cible,progression:respect?100:(cible>0?Math.max(0,Math.min(100,cible/realise*100)):0),ecart:arrondirPlanV5_(cible-realise),statut:respect?'Plafond respecté':'Plafond dépassé',confiance:'certaine',preuves:ops.slice(-20).map(preuveOperationPlanV5_)}};
function evaluerStockPlanV56_(a,cible,ctx){const id=a.compte_destination_id||a.compte_source_id||a.source_id,c=compteV56_(ctx,id);if(!c)return {statut:'Compte requis'};const realise=Number(c.soldeReel||0),tol=Math.max(0,Number(a.tolerance_mesure||0));return {realise,attendu_a_date:cible,progression:cible>0?Math.max(0,Math.min(100,realise/cible*100)):0,statut:realise+tol>=cible?'Stock atteint':'Stock à constituer',confiance:'certaine',preuves:[{type:'compte',id:c.id,nom:c.nom,date:c.dateSolde,solde:realise,source:c.sourceSolde}]};}
