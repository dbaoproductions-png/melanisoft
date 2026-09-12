const BUDGETSOFT_TREASURY_DUE_EVENTS_FINAL_20260912_VERSION='2026-09-12.4';

var construireTrajectoireTresorerieCanoniqueAvantDueEventsFinal20260912_=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907;

function construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateCible,cerberePrecharge){
  const r=construireTrajectoireTresorerieCanoniqueAvantDueEventsFinal20260912_(dateCible,cerberePrecharge);
  if(!r||r.ok===false)return r;

  const reference=typeof dateRevenueFinal20260912_==='function'?dateRevenueFinal20260912_(r.dateReference||new Date()):new Date(r.dateReference||new Date());
  const cible=typeof dateRevenueFinal20260912_==='function'?dateRevenueFinal20260912_(dateCible||r.dateCible):new Date(dateCible||r.dateCible);
  if(!reference||isNaN(reference)||!cible||isNaN(cible))return r;

  const debutCycle=typeof dateDebutCycleCanonBudgetSoft20260906_==='function'?dateDebutCycleCanonBudgetSoft20260906_(reference):new Date(reference.getFullYear(),reference.getMonth(),28);
  const finCycle=typeof dateFinCycleCanonBudgetSoft20260906_==='function'?dateFinCycleCanonBudgetSoft20260906_(reference):new Date(reference.getFullYear(),reference.getMonth()+1,27,23,59,59,999);
  const periode={debut:debutCycle,fin:finCycle};
  const dus=typeof evenementsCertainsDusCycleRevenueFinal20260912_==='function'?evenementsCertainsDusCycleRevenueFinal20260912_(periode,reference):[];
  const lignes=Array.isArray(r.lignes)?r.lignes.slice():[];
  const lendemain=new Date(reference);lendemain.setDate(lendemain.getDate()+1);lendemain.setHours(12,0,0,0);
  const ajoutes=[];

  (dus||[]).forEach(function(ev){
    const id=String(ev&&ev.id||''),montant=Math.abs(Number(ev&&ev.montant||0));
    if(!id||!Number.isFinite(montant)||montant<=0)return;
    const deja=lignes.some(function(l){
      const d=typeof dateRevenueFinal20260912_==='function'?dateRevenueFinal20260912_(l&&l.date):new Date(l&&l.date);
      return String(l&&l.source||'')==='evenement'&&String(l&&l.sourceId||'')===id&&d&&!isNaN(d)&&d>reference&&d<=cible&&Number(l&&l.montantSigne||0)>0;
    });
    if(deja)return;
    const origine=typeof dateEvenementRevenueFinal20260912_==='function'?dateEvenementRevenueFinal20260912_(ev,reference):new Date(ev&&ev.date_effet||ev&&ev.date_prevue||0);
    const dateFlux=origine&&origine>reference?new Date(origine):new Date(lendemain);
    if(dateFlux>cible)return;
    const ligne={
      id:'event:'+id+':certain-du',source:'evenement',sourceId:id,date:dateFlux.toISOString(),
      libelle:String(ev&&ev.libelle||'Événement'),categorie:String(ev&&ev.categorie||''),compte:String(ev&&ev.compte||''),
      montantSigne:Math.round(montant*100)/100,certitude:'certaine',
      preuve:'Événement certain encore dû sans opération réelle ni rapprochement confirmé',
      enRetard:!!(origine&&origine<=reference),datePrevueOrigine:origine&&typeof isoRevenueFinal20260912_==='function'?isoRevenueFinal20260912_(origine):''
    };
    lignes.push(ligne);ajoutes.push(ligne);
  });

  if(!ajoutes.length){r.versionDueEventsFinal=BUDGETSOFT_TREASURY_DUE_EVENTS_FINAL_20260912_VERSION;return r;}

  lignes.sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  r.lignes=lignes;
  const net=lignes.reduce(function(s,l){const d=new Date(l&&l.date);return !isNaN(d)&&d>reference&&d<=cible?s+Number(l&&l.montantSigne||0):s;},0);
  r.soldePrevisionnel=Math.round((Number(r.soldeReel||0)+net)*100)/100;
  r.variationPrevue=Math.round(net*100)/100;
  r.proprietaireBudgetSoft='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907';
  r.versionDueEventsFinal=BUDGETSOFT_TREASURY_DUE_EVENTS_FINAL_20260912_VERSION;
  r.evenementsCertainsDusInjectes=ajoutes.map(function(l){return{sourceId:l.sourceId,libelle:l.libelle,montant:l.montantSigne,date:l.date};});
  if(typeof decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_==='function'){
    r.decompositionCanonique=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(r);
    if(!r.decompositionCanonique.ok){r.ok=false;r.erreur='Contrat canonique de trésorerie non satisfait après injection des événements certains dus.';r.erreursContrat=(r.decompositionCanonique.erreurs||[]).slice();}
  }
  return r;
}
