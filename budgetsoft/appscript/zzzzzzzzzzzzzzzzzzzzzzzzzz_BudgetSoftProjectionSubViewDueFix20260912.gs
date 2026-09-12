const BUDGETSOFT_PROJECTION_SUBVIEW_DUE_FIX_20260912_VERSION='2026-09-12.1';

/**
 * Correctif terminal de la SOUS-VUE canonique uniquement.
 * La sous-vue ne doit jamais faire disparaître une recette certaine encore due.
 * Aucun recalcul métier concurrent : on conserve les lignes du propriétaire
 * canonique, on complète seulement un événement certain manquant, puis on
 * réconcilie le contrat canonique.
 */
sousVueTrajectoireTresorerieCanoniqueBudgetSoft20260910_=function(trajectoire,dateCible){
  if(!trajectoire||trajectoire.ok===false)return trajectoire;
  const tz=Session.getScriptTimeZone();
  const cibleDate=typeof dateRevenuePublicationFix20260912_==='function'
    ?dateRevenuePublicationFix20260912_(dateCible)
    :new Date(dateCible);
  if(!cibleDate||isNaN(cibleDate))return trajectoire;
  const cible=Utilities.formatDate(cibleDate,tz,'yyyy-MM-dd');
  const copie=Object.assign({},trajectoire);
  copie.lignes=(trajectoire.lignes||[]).filter(function(l){
    const d=new Date(l&&l.date);if(isNaN(d.getTime()))return false;
    return Utilities.formatDate(d,tz,'yyyy-MM-dd')<=cible;
  });

  const reference=typeof dateRevenuePublicationFix20260912_==='function'
    ?dateRevenuePublicationFix20260912_(trajectoire.dateReference||new Date())
    :new Date(trajectoire.dateReference||new Date());
  const fin=cibleDate;
  const dus=typeof evenementsRecettesCertainesDuesRevenuePublicationFix20260912_==='function'
    ?evenementsRecettesCertainesDuesRevenuePublicationFix20260912_(reference,null,fin)
    :[];
  const report=new Date(reference);report.setDate(report.getDate()+1);report.setHours(12,0,0,0);
  const ajoutes=[];

  (dus||[]).forEach(function(ev){
    const id=String(ev&&ev.id||''),montant=Math.abs(Number(ev&&ev.montant||0));
    if(!id||!Number.isFinite(montant)||montant<=0)return;
    const deja=copie.lignes.some(function(l){
      const d=typeof dateRevenuePublicationFix20260912_==='function'
        ?dateRevenuePublicationFix20260912_(l&&l.date)
        :new Date(l&&l.date);
      return String(l&&l.source||'')==='evenement'&&String(l&&l.sourceId||'')===id&&d&&!isNaN(d)&&d>reference&&d<=fin&&Number(l&&l.montantSigne||0)>0;
    });
    if(deja)return;
    let origine=null;
    try{const dr=typeof datePlanTresorerie_==='function'?datePlanTresorerie_(ev,reference,false):null;origine=dr&&dr.date?new Date(dr.date):null;}catch(e){}
    if(!origine||isNaN(origine))origine=new Date(ev&&ev.date_effet||ev&&ev.date_prevue||0);
    const d=origine&&!isNaN(origine)&&origine>reference?origine:report;
    if(d>fin)return;
    const ligne={
      id:'event:'+id+':certain-du-subview',source:'evenement',sourceId:id,date:new Date(d).toISOString(),
      libelle:String(ev&&ev.libelle||'Événement'),categorie:String(ev&&ev.categorie||''),compte:String(ev&&ev.compte||''),
      montantSigne:Math.round(montant*100)/100,certitude:'certaine',
      preuve:'Événement certain encore dû · conservé dans la sous-vue canonique · aucune opération réelle ni rapprochement confirmé',
      enRetard:!!(origine&&!isNaN(origine)&&origine<=reference),
      datePrevueOrigine:origine&&!isNaN(origine)&&typeof isoRevenuePublicationFix20260912_==='function'?isoRevenuePublicationFix20260912_(origine):''
    };
    copie.lignes.push(ligne);ajoutes.push(ligne);
  });

  copie.lignes.sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  const variation=typeof sommeLignesTresorerieCanonique20260907_==='function'
    ?sommeLignesTresorerieCanonique20260907_(copie.lignes)
    :Math.round(copie.lignes.reduce(function(s,l){return s+Number(l&&l.montantSigne||0);},0)*100)/100;
  copie.dateCible=cible;
  copie.variationPrevue=variation;
  copie.soldePrevisionnel=Math.round((Number(copie.soldeReel||0)+Number(variation||0))*100)/100;
  copie.proprietaireBudgetSoft='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907';
  copie.moteurSousJacent='chargerTresoreriePrevisionnelle20260901';
  copie.versionContratCanonique=typeof BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION!=='undefined'?BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION:'';
  copie.versionProjectionSubviewDueFix=BUDGETSOFT_PROJECTION_SUBVIEW_DUE_FIX_20260912_VERSION;
  copie.evenementsCertainsDusInjectesSousVue=ajoutes.map(function(l){return{sourceId:l.sourceId,libelle:l.libelle,montant:l.montantSigne,date:l.date};});
  if(typeof decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_==='function'){
    copie.decompositionCanonique=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(copie);
    if(!copie.decompositionCanonique.ok){
      copie.ok=false;
      copie.erreur='Contrat canonique de trésorerie non satisfait après conservation des événements certains dus dans la sous-vue.';
      copie.erreursContrat=(copie.decompositionCanonique.erreurs||[]).slice();
    }
  }
  copie.optimisationSnapshot={version:'2026-09-12.1',mode:'sous_vue_trajectoire_etendue',sansRecalculMetier:true,conservationEvenementsCertainsDus:true};
  return copie;
};
