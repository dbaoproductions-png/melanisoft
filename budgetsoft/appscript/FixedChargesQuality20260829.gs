const FIXED_CHARGES_QUALITY_20260829_VERSION='2026-08-29.4';
const FIXED_CHARGES_QUALITY_MIGRATION_KEY_='FIXED_CHARGES_QUALITY_MIGRATION_20260829_1';

function normaliserChargeFixeQualite20260829_(v){
  return String(v||'')
    .toLowerCase()
    .replace(/d[\W_]*g[\W_]*f[\W_]*i[\W_]*p/g,'dgfip')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function motsCrediteurChargeFixe20260829_(v){
  const stop=new Set(['prelevement','prelev','prlv','sepa','facture','factures','carte','ech','emetteur','id','mdt','ref','lib','du','de','la','le','les','des','et','eng','engt','echeance','pret','reference','client','contrat','cotisation','fact','numero','nr','par','cb']);
  return normaliserChargeFixeQualite20260829_(v).split(' ').filter(x=>x.length>=4&&!/^\d+$/.test(x)&&!stop.has(x)&&!/^[a-z]{0,3}\d{4,}/.test(x));
}

function similariteCrediteurChargeFixe20260829_(chargeBank,operationBank){
  const a=motsCrediteurChargeFixe20260829_(chargeBank),b=motsCrediteurChargeFixe20260829_(operationBank);
  if(!a.length||!b.length)return 0;
  let commun=0;
  a.forEach(x=>{if(b.some(y=>x===y||(x.length>=4&&y.length>=4&&(x.startsWith(y)||y.startsWith(x)))))commun++;});
  return commun/Math.max(1,Math.min(a.length,b.length));
}

function operationCarteDiffereeChargeFixe20260829_(o){
  if(String(o.carte_fin||'').trim())return true;
  if(String(o.date_achat||'').trim())return true;
  const t=normaliserChargeFixeQualite20260829_([o.source_bancaire,o.libelle_bancaire,o.commentaire].filter(Boolean).join(' '));
  return /(^| )(cb|carte)( |$)/.test(t)||t.includes('facture carte')||t.includes('factures carte');
}

function dateRapprochementChargeFixe20260829_(o){
  const comptable=o.date_comptable?new Date(o.date_comptable):null;
  if(comptable&&!isNaN(comptable))return comptable;
  const base=new Date(o.date_achat||o.date);
  if(isNaN(base))return null;
  if(operationCarteDiffereeChargeFixe20260829_(o))return new Date(base.getFullYear(),base.getMonth()+1,0,23,59,59,999);
  return base;
}

function cleCycleChargeFixe20260829_(d){
  const c=cycle28DepuisDate20260828_(d);
  return c?c.cle:'';
}

function migrerCategoriesChargesFixes20260829_(){
  const props=PropertiesService.getDocumentProperties();
  if(props.getProperty(FIXED_CHARGES_QUALITY_MIGRATION_KEY_)==='1')return {ok:true,modifiees:0,dejaFaite:true};
  const ss=SpreadsheetApp.getActiveSpreadsheet(),feuille=ss.getSheetByName('Charges_fixes');
  if(!feuille||feuille.getLastRow()<2){props.setProperty(FIXED_CHARGES_QUALITY_MIGRATION_KEY_,'1');return {ok:true,modifiees:0};}
  const h=TABLES.Charges_fixes,idxLib=h.indexOf('libelle'),idxCat=h.indexOf('categorie');
  if(idxLib<0||idxCat<0)return {ok:false,modifiees:0};
  const n=feuille.getLastRow()-1,valeurs=feuille.getRange(2,1,n,h.length).getValues();let modifiees=0;
  valeurs.forEach((row,i)=>{
    const lib=normaliserChargeFixeQualite20260829_(row[idxLib]),cat=String(row[idxCat]||'');
    if((lib==='cofidis accessio'||lib==='floa')&&cat!=='Crédits revolving'){
      feuille.getRange(i+2,idxCat+1).setValue('Crédits revolving');modifiees++;
    }
  });
  if(modifiees&&typeof supprimerSnapshotChargesFixes20260828_==='function')supprimerSnapshotChargesFixes20260828_();
  props.setProperty(FIXED_CHARGES_QUALITY_MIGRATION_KEY_,'1');
  return {ok:true,modifiees};
}

function chargerChargesFixesReview20260829(){
  migrerCategoriesChargesFixes20260829_();
  return chargerChargesFixesReview20260828();
}

function evaluerRapprochementChargeFixeSouple20260829_(charge,operation,contexte){
  if(String(operation.type||'').toLowerCase()!=='depense')return null;
  const opDate=dateRapprochementChargeFixe20260829_(operation),debut=charge.date_debut?new Date(charge.date_debut):null,fin=charge.date_fin?new Date(charge.date_fin):null;
  if(!opDate)return null;
  const derniereDate=contexte&&contexte.derniereDate?new Date(contexte.derniereDate):null;
  const avantDebut=!!(debut&&!isNaN(debut)&&opDate<debut);
  // Beaucoup de charges historiques ont reçu comme date_debut la date technique
  // de création du référentiel. Pour l'audit rétroactif, cette date ne doit pas
  // masquer une opération antérieure dès lors que la charge était déjà censée
  // exister à la dernière date bancaire connue. Une vraie date de début future
  // (ex. crédit qui commence en octobre) reste en revanche bloquante.
  if(avantDebut&&(!derniereDate||isNaN(derniereDate)||debut>derniereDate))return null;
  if(fin&&!isNaN(fin)&&opDate>fin)return null;

  const montantReel=Math.abs(Number(operation.montant||0)),montantAttendu=Math.abs(Number(charge.montant||0));
  if(!Number.isFinite(montantReel)||montantReel<=0)return null;
  const tolerance=Math.max(Number(charge.tolerance||0.5),Math.max(1,montantAttendu*0.05));
  const ecartMontant=Math.abs(montantReel-montantAttendu),jourAttendu=Math.max(1,Math.min(31,Number(charge.jour_execution)||opDate.getDate())),ecartJours=Math.abs(opDate.getDate()-jourAttendu);
  const brut=typeof brutAudit_==='function'?brutAudit_(operation):[operation.libelle,operation.libelle_bancaire,operation.commentaire].filter(Boolean).join(' ');
  const banqueCharge=String(charge.libelle_bancaire||charge.libelle||'').trim();
  const motifCharge=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(banqueCharge):normaliserChargeFixeQualite20260829_(banqueCharge);
  const motifOperation=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(brut):normaliserChargeFixeQualite20260829_(brut);
  const texteCharge=normaliserChargeFixeQualite20260829_(banqueCharge),texteOperation=normaliserChargeFixeQualite20260829_(brut);
  const simCrediteur=similariteCrediteurChargeFixe20260829_(banqueCharge,brut);

  let scoreLibelle=0;
  if(motifCharge&&motifOperation&&motifCharge===motifOperation)scoreLibelle=55;
  else if(motifCharge&&texteOperation.includes(normaliserChargeFixeQualite20260829_(motifCharge)))scoreLibelle=48;
  else if(simCrediteur>=.99)scoreLibelle=48;
  else if(simCrediteur>=.5)scoreLibelle=38;
  else if(simCrediteur>0)scoreLibelle=28;
  else if(texteCharge&&texteOperation&&(texteOperation.includes(texteCharge)||texteCharge.includes(texteOperation)))scoreLibelle=35;

  // Doctrine : une proposition doit toujours reposer sur un signal de créancier.
  // Un montant et une date proches ne suffisent jamais à eux seuls.
  if(scoreLibelle===0)return null;

  let scoreMontant=0;
  const exactMontant=ecartMontant<=Math.max(.01,Math.min(tolerance,1));
  if(exactMontant)scoreMontant=40;
  else if(ecartMontant<=tolerance)scoreMontant=32;
  else scoreMontant=Math.max(0,25-(ecartMontant/Math.max(1,montantAttendu))*100);

  const carte=operationCarteDiffereeChargeFixe20260829_(operation);
  // Pour les CB différées, le jour comptable de fin de mois n'est pas discriminant :
  // il sert à rattacher l'opération au bon cycle, pas à augmenter artificiellement le score.
  const scoreDate=carte?0:(ecartJours<=2?20:ecartJours<=4?16:ecartJours<=7?10:ecartJours<=12?5:0);
  const compteCharge=String(charge.compte||''),compteOperation=String(operation.compte||''),compteCompatible=!compteCharge||!compteOperation||compteCharge===compteOperation,scoreCompte=compteCompatible?5:0;
  const score=Math.round(Math.min(100,scoreLibelle+scoreMontant+scoreDate+scoreCompte));
  return {score,date_operation:opDate.toISOString(),montant_reel:montantReel,montant_attendu:montantAttendu,ecart_montant:Math.round(ecartMontant*100)/100,ecart_jours:ecartJours,libelle_operation:String(operation.libelle||''),libelle_charge:String(charge.libelle||''),compte:compteOperation,compte_charge:compteCharge,compte_compatible:compteCompatible,score_libelle:Math.round(scoreLibelle),score_montant:Math.round(scoreMontant),score_date:scoreDate,similarite_crediteur:Math.round(simCrediteur*100)/100,carte_differee:carte,date_debut_ignoree:avantDebut};
}

function chargerPropositionsRapprochementChargesFixes20260829(){
  migrerCategoriesChargesFixes20260829_();verifierInitialisation_();const t0=Date.now();
  const charges=lireTable_('Charges_fixes').filter(c=>convertirBooleen_(c.actif)),operations=lireTable_('Operations').filter(operationReelleChargeFixe20260828_),dates=operations.map(dateRapprochementChargeFixe20260829_).filter(Boolean);
  const derniere=dates.length?new Date(Math.max.apply(null,dates.map(d=>d.getTime()))):new Date(),courant=cycle28DepuisDate20260828_(derniere),precedent=cyclePrecedent20260828_(courant),debutRecherche=precedent.debut;
  const historique=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[],traites=new Set(historique.filter(r=>['Validé','Ignoré'].includes(String(r.statut))).map(r=>String(r.charge_fixe_id)+'|'+String(r.operation_id)));
  const opsCandidates=operations.filter(o=>{if(chargeFixeLieeOperation20260828_(o))return false;const d=dateRapprochementChargeFixe20260829_(o);return d&&d>=debutRecherche&&d<=courant.fin;});
  const candidats=[];
  charges.forEach(charge=>opsCandidates.forEach(operation=>{
    const cle=String(charge.id)+'|'+String(operation.id);if(traites.has(cle))return;
    const r=evaluerRapprochementChargeFixeSouple20260829_(charge,operation,{derniereDate:derniere});if(!r||r.score<65)return;
    candidats.push(Object.assign({},r,{charge_fixe_id:String(charge.id),operation_id:String(operation.id),cycle_cle:cleCycleChargeFixe20260829_(new Date(r.date_operation))}));
  }));

  // Une opération ne peut servir qu'à une charge et, pour une charge mensuelle,
  // une seule opération est proposée par cycle. Cela permet notamment aux deux
  // charges Google One distinctes de recevoir chacune au plus une CB du mois.
  const operationPrise=new Set(),chargeCyclePris=new Set(),propositions=[];
  candidats.sort((a,b)=>Number(b.score)-Number(a.score)||Number(a.ecart_montant)-Number(b.ecart_montant)||Number(a.ecart_jours)-Number(b.ecart_jours)).forEach(c=>{
    const op=String(c.operation_id),cc=String(c.charge_fixe_id)+'|'+String(c.cycle_cle||'');
    if(operationPrise.has(op)||chargeCyclePris.has(cc))return;
    operationPrise.add(op);chargeCyclePris.add(cc);propositions.push(c);
  });
  return {ok:true,version:FIXED_CHARGES_QUALITY_20260829_VERSION,propositions,nombre:propositions.length,_performance:{serveurMs:Date.now()-t0,operationsCandidates:opsCandidates.length,comparaisons:charges.length*opsCandidates.length}};
}

function auditerChargesFixesCyclePrecedent20260829(){
  migrerCategoriesChargesFixes20260829_();verifierInitialisation_();
  const charges=lireTable_('Charges_fixes').filter(c=>convertirBooleen_(c.actif)),operations=lireTable_('Operations').filter(operationReelleChargeFixe20260828_),dates=operations.map(dateRapprochementChargeFixe20260829_).filter(Boolean);
  const derniere=dates.length?new Date(Math.max.apply(null,dates.map(d=>d.getTime()))):new Date(),courant=cycle28DepuisDate20260828_(derniere),precedent=cyclePrecedent20260828_(courant);
  const opsPrev=operations.filter(o=>{const d=dateRapprochementChargeFixe20260829_(o);return d&&d>=precedent.debut&&d<=precedent.fin;});
  return charges.map(charge=>{
    const liees=opsPrev.filter(o=>chargeFixeLieeOperation20260828_(o)===String(charge.id));
    if(liees.length)return {charge_fixe_id:String(charge.id),libelle:String(charge.libelle||''),categorie:String(charge.categorie||''),statut:'rapprochee',operations:liees.length,reel:Math.round(liees.reduce((s,o)=>s+Math.abs(Number(o.montant||0)),0)*100)/100};
    const meilleurs=opsPrev.map(o=>({o,r:evaluerRapprochementChargeFixeSouple20260829_(charge,o,{derniereDate:derniere})})).filter(x=>x.r).sort((a,b)=>b.r.score-a.r.score).slice(0,3);
    const best=meilleurs[0];return {charge_fixe_id:String(charge.id),libelle:String(charge.libelle||''),categorie:String(charge.categorie||''),statut:'non_rapprochee',meilleur_score:best?best.r.score:0,meilleur_operation:best?String(best.o.libelle||''):'',meilleur_montant:best?Math.abs(Number(best.o.montant||0)):null,compte_compatible:best?best.r.compte_compatible:null,score_libelle:best?best.r.score_libelle:0,score_montant:best?best.r.score_montant:0,score_date:best?best.r.score_date:0,date_debut_ignoree:best?!!best.r.date_debut_ignoree:false};
  });
}
