const TREASURY_FORECAST_DOCTRINE_20260901_VERSION='2026-09-01.2';

/**
 * Passe terminale du solde prévisionnel bancaire.
 * Elle ne crée aucune donnée : elle recadre seulement les dépenses Plan explicitement
 * payées par CB sur la date bancaire de débit différé.
 */
function chargerTresoreriePrevisionnelle20260901(dateCible){
  const r=chargerTresoreriePrevisionnelle20260831(dateCible);
  if(!r||!r.ok)return r;
  const reference=new Date(r.dateReference||new Date()),cible=new Date(r.dateCible||new Date());
  const evenements=lireFeuilleDynamiquePlan_('Plan_Evenements');
  const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
  const hard=(r.lignes||[]).filter(x=>x.source==='operation_future');
  let lignes=recalerFluxPlanCarteTresorerie20260901_(r.lignes||[],evenements,actions,hard,reference,cible);
  lignes=dedoublonnerPrevisionsTresorerie20260831_(lignes);
  lignes.sort((a,b)=>new Date(a.date)-new Date(b.date)||rangCertitudeTresorerie_(a.certitude)-rangCertitudeTresorerie_(b.certitude));
  return recalculerSortieTresorerie20260901_(r,lignes,reference,cible);
}

function listerMouvementsFutursTresorerie20260901(dateCible){
  const r=chargerTresoreriePrevisionnelle20260901(dateCible||dateDansJoursTresorerie_(45));
  return {ok:r.ok,version:r.version,dateReference:r.dateReference,dateCible:r.dateCible,lignes:r.lignes||[],confiance:r.confiance,diagnostic20260831:r.diagnostic20260831||{}};
}

function paiementCartePlanTresorerie20260901_(o){return /^(cb|carte|carte bancaire)$/i.test(String(o&&o.mode_paiement||'').trim());}

function recalerFluxPlanCarteTresorerie20260901_(lignes,evenements,actions,hard,reference,cible){
  const ev=Object.fromEntries((evenements||[]).map(x=>[String(x.id||''),x]));
  const ac=Object.fromEntries((actions||[]).map(x=>[String(x.id||''),x]));
  const out=[];
  (lignes||[]).forEach(x=>{
    const src=x.source==='evenement'?ev[String(x.sourceId||'')]:x.source==='action'?ac[String(x.sourceId||'')]:null;
    if(!src||Number(x.montantSigne||0)>=0||!paiementCartePlanTresorerie20260901_(src)){out.push(x);return;}
    const d0=new Date(x.date);if(isNaN(d0)){out.push(x);return;}
    const d=dernierJourMoisTresorerie20260901_(d0.getFullYear(),d0.getMonth());
    if(d<=reference||d>cible)return;
    if(operationCouvrePrevisionTresorerie_(hard,d,Number(x.montantSigne||0),x.libelle||''))return;
    out.push(Object.assign({},x,{date:d.toISOString(),preuve:String(x.preuve||'Flux Plan')+' · paiement CB : débit bancaire différé fin de mois'}));
  });

  // Une dépense Plan CB peut avoir eu lieu avant la date de référence tout en restant
  // à débiter à la fin du mois. Elle doit donc être restaurée si aucune opération CB
  // future certaine ne la remplace encore.
  (evenements||[]).forEach(e=>{
    if(!statutEffectifTresorerie20260831_(e.statut)||!paiementCartePlanTresorerie20260901_(e)||estSuspensionTemporaireTresorerie20260831_(e)||String(e.type||'').toLowerCase()!=='depense')return;
    const dr=datePlanTresorerie_(e,reference,false),base=dr.date;if(!base||isNaN(base))return;
    const n=(e.fractionne===true||String(e.fractionne)==='true')?Math.max(1,Number(e.nombre_fois||1)):1;
    const per=String(e.periodicite_fractionnement||'mensuel').toLowerCase(),total=Math.abs(Number(e.montant||0));
    for(let i=0;i<n;i++){
      const achat=new Date(base);if(i){if(per==='annuel')achat.setFullYear(achat.getFullYear()+i);else achat.setMonth(achat.getMonth()+i);}
      const d=dernierJourMoisTresorerie20260901_(achat.getFullYear(),achat.getMonth());if(d<=reference||d>cible)continue;
      const m=-arrondiTresorerie_(total/n);
      if(out.some(x=>x.source==='evenement'&&String(x.sourceId||'')===String(e.id||'')&&Math.abs(new Date(x.date)-d)<43200000))continue;
      if(operationCouvrePrevisionTresorerie_(hard,d,m,e.libelle||''))continue;
      out.push({id:'eventcb:'+String(e.id||'')+':'+i,source:'evenement',sourceId:e.id||'',date:d.toISOString(),libelle:e.libelle||'Événement',categorie:e.categorie||'',compte:e.compte||'',montantSigne:m,certitude:'tres_probable',preuve:'Événement effectif · paiement CB : débit bancaire différé fin de mois',dateConventionnelle:false});
    }
  });
  return out;
}

function recalculerSortieTresorerie20260901_(r,lignes,reference,cible){
  const variation=arrondiTresorerie_((lignes||[]).reduce((s,x)=>s+Number(x.montantSigne||0),0));
  const certain=arrondiTresorerie_((lignes||[]).filter(x=>x.certitude==='certain').reduce((s,x)=>s+Number(x.montantSigne||0),0));
  const tresProbable=arrondiTresorerie_((lignes||[]).filter(x=>['certain','tres_probable'].includes(x.certitude)).reduce((s,x)=>s+Number(x.montantSigne||0),0));
  r.version=TREASURY_FORECAST_DOCTRINE_20260901_VERSION;
  r.lignes=lignes;
  r.variationPrevue=variation;
  r.soldePrevisionnel=arrondiTresorerie_(Number(r.soldeReel||0)+variation);
  r.fourchette={certain:arrondiTresorerie_(Number(r.soldeReel||0)+certain),tresProbable:arrondiTresorerie_(Number(r.soldeReel||0)+tresProbable),toutesHypotheses:r.soldePrevisionnel};
  r.resume=resumeTresorerie20260831_(lignes);
  r.confiance=confianceTresorerie_(reference,cible,lignes);
  r.diagnostic20260831=r.diagnostic20260831||{};
  r.diagnostic20260831.passeTerminalePlanCb=true;
  return r;
}
