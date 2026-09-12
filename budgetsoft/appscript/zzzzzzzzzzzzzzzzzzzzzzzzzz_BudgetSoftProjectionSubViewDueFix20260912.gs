const BUDGETSOFT_PROJECTION_SUBVIEW_DUE_FIX_20260912_VERSION='2026-09-12.2';

function statutRecetteEncoreDueProjection20260912_(ev){
  if(!ev||String(ev.type||'').trim().toLowerCase()!=='recette')return false;
  if(typeof evenementClosProuveRevenuePublicationFix20260912_==='function'&&evenementClosProuveRevenuePublicationFix20260912_(ev))return false;
  const n=typeof normRevenuePublicationFix20260912_==='function'?normRevenuePublicationFix20260912_(ev.statut):String(ev.statut||'').trim().toLowerCase();
  return ['effective','effectif','effectives','effectifs','realise a rapprocher','realisee a rapprocher'].includes(n);
}

/**
 * Vrai point de correction du moteur 20260831 : une recette certaine encore due
 * ne disparait jamais parce que sa date planifiee est passee. Elle est reportee
 * au lendemain de la frontiere bancaire, jusqu'a preuve reelle de son encaissement.
 */
completerEvenementsEffectifsTresorerie20260831_=function(lignes,evenements,reference,cible){
  const out=(lignes||[]).slice(),debut=debutJourTresorerie20260831_(reference);
  const report=new Date(reference);report.setDate(report.getDate()+1);report.setHours(12,0,0,0);
  (evenements||[]).forEach(function(e){
    const encoreDue=statutRecetteEncoreDueProjection20260912_(e);
    if((!statutEffectifTresorerie20260831_(e&&e.statut)&&!encoreDue)||estSuspensionTemporaireTresorerie20260831_(e))return;
    const dr=datePlanTresorerie_(e,reference,false),base=dr.date;if(!base||isNaN(base))return;
    const n=(e.fractionne===true||String(e.fractionne)==='true')?Math.max(1,Number(e.nombre_fois||1)):1;
    const per=String(e.periodicite_fractionnement||'mensuel').toLowerCase(),total=Math.abs(Number(e.montant||0));
    for(let i=0;i<n;i++){
      const origine=new Date(base);if(i){if(per==='annuel')origine.setFullYear(origine.getFullYear()+i);else origine.setMonth(origine.getMonth()+i);}
      if(origine>cible)continue;
      const type=String(e.type||'depense').toLowerCase();if(!['depense','recette'].includes(type))continue;
      let d=new Date(origine);
      if(d<debut){
        if(!(encoreDue&&type==='recette'))continue;
        d=new Date(report);
      }
      if(d>cible)continue;
      if(out.some(function(x){return x.source==='evenement'&&String(x.sourceId||'')===String(e.id||'')&&Math.abs(new Date(x.date)-d)<43200000;}))continue;
      const m=(type==='recette'?1:-1)*(total/n);
      out.push({
        id:'event:'+String(e.id||'')+':'+i,
        source:'evenement',sourceId:e.id||'',date:d.toISOString(),
        libelle:e.libelle||'Événement',categorie:e.categorie||'',compte:e.compte||'',
        montantSigne:arrondiTresorerie_(m),certitude:'tres_probable',
        preuve:encoreDue&&origine<debut
          ?'Événement certain encore dû · échéance dépassée reportée après la frontière bancaire · aucune opération réelle ni rapprochement confirmé'
          :preuveDatePlanTresorerie_('Événement effectif du Plan',dr),
        dateConventionnelle:!!dr.conventionnelle,
        enRetard:encoreDue&&origine<debut,
        datePrevueOrigine:encoreDue&&origine<debut&&typeof isoRevenuePublicationFix20260912_==='function'?isoRevenuePublicationFix20260912_(origine):''
      });
    }
  });
  return out;
};

/**
 * Garde secondaire de sous-vue : conserve les lignes du propriétaire canonique et
 * complete, si necessaire, une recette certaine encore due avant de recalculer le contrat.
 */
sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_=function(trajectoire,dateCible){
  if(!trajectoire||trajectoire.ok===false)return trajectoire;
  const tz=Session.getScriptTimeZone();
  const cibleDate=typeof dateRevenuePublicationFix20260912_==='function'?dateRevenuePublicationFix20260912_(dateCible):new Date(dateCible);
  if(!cibleDate||isNaN(cibleDate))return trajectoire;
  const cible=Utilities.formatDate(cibleDate,tz,'yyyy-MM-dd');
  const copie=Object.assign({},trajectoire);
  copie.lignes=(trajectoire.lignes||[]).filter(function(l){const d=new Date(l&&l.date);if(isNaN(d.getTime()))return false;return Utilities.formatDate(d,tz,'yyyy-MM-dd')<=cible;});
  const reference=typeof dateRevenuePublicationFix20260912_==='function'?dateRevenuePublicationFix20260912_(trajectoire.dateReference||new Date()):new Date(trajectoire.dateReference||new Date());
  const fin=cibleDate,dus=typeof evenementsRecettesCertainesDuesRevenuePublicationFix20260912_==='function'?evenementsRecettesCertainesDuesRevenuePublicationFix20260912_(reference,null,fin):[];
  const report=new Date(reference);report.setDate(report.getDate()+1);report.setHours(12,0,0,0);
  const ajoutes=[];
  (dus||[]).forEach(function(ev){
    const id=String(ev&&ev.id||''),montant=Math.abs(Number(ev&&ev.montant||0));if(!id||!Number.isFinite(montant)||montant<=0)return;
    const deja=copie.lignes.some(function(l){const d=typeof dateRevenuePublicationFix20260912_==='function'?dateRevenuePublicationFix20260912_(l&&l.date):new Date(l&&l.date);return String(l&&l.source||'')==='evenement'&&String(l&&l.sourceId||'')===id&&d&&!isNaN(d)&&d>reference&&d<=fin&&Number(l&&l.montantSigne||0)>0;});
    if(deja)return;
    let origine=null;try{const dr=typeof datePlanTresorerie_==='function'?datePlanTresorerie_(ev,reference,false):null;origine=dr&&dr.date?new Date(dr.date):null;}catch(e){}
    if(!origine||isNaN(origine))origine=new Date(ev&&ev.date_effet||ev&&ev.date_prevue||0);
    const d=origine&&!isNaN(origine)&&origine>reference?origine:report;if(d>fin)return;
    const ligne={id:'event:'+id+':certain-du-subview',source:'evenement',sourceId:id,date:new Date(d).toISOString(),libelle:String(ev&&ev.libelle||'Événement'),categorie:String(ev&&ev.categorie||''),compte:String(ev&&ev.compte||''),montantSigne:Math.round(montant*100)/100,certitude:'certaine',preuve:'Événement certain encore dû · conservé dans la sous-vue canonique · aucune opération réelle ni rapprochement confirmé',enRetard:!!(origine&&!isNaN(origine)&&origine<=reference),datePrevueOrigine:origine&&!isNaN(origine)&&typeof isoRevenuePublicationFix20260912_==='function'?isoRevenuePublicationFix20260912_(origine):''};
    copie.lignes.push(ligne);ajoutes.push(ligne);
  });
  copie.lignes.sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  const variation=typeof sommeLignesTresorerieCanonique20260907_==='function'?sommeLignesTresorerieCanonique20260907_(copie.lignes):Math.round(copie.lignes.reduce(function(s,l){return s+Number(l&&l.montantSigne||0);},0)*100)/100;
  copie.dateCible=cible;copie.variationPrevue=variation;copie.soldePrevisionnel=Math.round((Number(copie.soldeReel||0)+Number(variation||0))*100)/100;
  copie.proprietaireBudgetSoft='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907';copie.moteurSousJacent='chargerTresoreriePrevisionnelle20260901';copie.versionContratCanonique=typeof BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION!=='undefined'?BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION:'';copie.versionProjectionSubviewDueFix=BUDGETSOFT_PROJECTION_SUBVIEW_DUE_FIX_20260912_VERSION;copie.evenementsCertainsDusInjectesSousVue=ajoutes.map(function(l){return{sourceId:l.sourceId,libelle:l.libelle,montant:l.montantSigne,date:l.date};});
  if(typeof decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_==='function'){copie.decompositionCanonique=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(copie);if(!copie.decompositionCanonique.ok){copie.ok=false;copie.erreur='Contrat canonique de trésorerie non satisfait après conservation des événements certains dus dans la sous-vue.';copie.erreursContrat=(copie.decompositionCanonique.erreurs||[]).slice();}}
  copie.optimisationSnapshot={version:'2026-09-12.2',mode:'sous_vue_trajectoire_etendue',sansRecalculMetier:true,conservationEvenementsCertainsDus:true};
  return copie;
};

function auditerEvenementCertainRetardeTresorerieBudgetSoft20260912(){
  const cible=Utilities.formatDate(typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(new Date()):new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const r=chargerTresoreriePrevisionnelle20260901(cible),id='1d207b7c-b59f-41f9-aade-babee152d967';
  const lignes=(r&&r.lignes||[]).filter(function(l){return String(l&&l.sourceId||'')===id;});
  const out={ok:!!(r&&r.ok&&lignes.length),version:BUDGETSOFT_PROJECTION_SUBVIEW_DUE_FIX_20260912_VERSION,dateReference:r&&r.dateReference||'',dateCible:r&&r.dateCible||'',lignes:lignes};
  console.log('[AUDIT evenement certain retarde tresorerie] '+JSON.stringify(out));return out;
}
