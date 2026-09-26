const BUDGETSOFT_REVENUE_ARREARS_20260908_VERSION='2026-09-25.1';

/**
 * Une recette structurelle échue mais non encaissée reste due dans la trajectoire
 * courante. Elle ne saute au mois suivant que lorsqu'une occurrence réelle du mois
 * courant l'a effectivement remplacée.
 */
function normaliserRapprochementRevenuBudgetSoft20260908_(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function aliasesRevenuCanonBudgetSoft20260908_(categorie){
  const c=normaliserRapprochementRevenuBudgetSoft20260908_(categorie);
  const a=[c];
  if(c==='france travail')a.push('pole emploi','poleemploi','france travail');
  return Array.from(new Set(a.filter(Boolean)));
}

function revenuCanonMontantVariableBudgetSoft20260908_(categorie){
  return normaliserRapprochementRevenuBudgetSoft20260908_(categorie)==='france travail';
}

function montantSigneOperationRevenuBudgetSoft20260908_(o){
  try{
    if(typeof montantSigneCanoniqueBudgetSoft20260906_==='function'){
      const n=Number(montantSigneCanoniqueBudgetSoft20260906_(o));
      if(Number.isFinite(n))return n;
    }
  }catch(e){}
  const brut=Number(o&&o.montant||0);
  const type=String(o&&o.type||'').toLowerCase();
  if(type==='revenu')return Math.abs(brut);
  if(type==='depense')return-Math.abs(brut);
  return brut;
}

function texteOperationRevenuBudgetSoft20260908_(o){
  return normaliserRapprochementRevenuBudgetSoft20260908_([
    o&&o.libelle_bancaire,o&&o.libelle,o&&o.description,o&&o.tiers,
    o&&o.contrepartie,o&&o.emetteur,o&&o.categorie,o&&o.commentaire
  ].filter(Boolean).join(' '));
}

function revenuCanonMoisDejaEncaisseBudgetSoft20260908_(ops,reference,categorie,montant){
  const debut=new Date(reference.getFullYear(),reference.getMonth(),1,0,0,0,0);
  const cible=Math.abs(Number(montant||0));
  const aliases=aliasesRevenuCanonBudgetSoft20260908_(categorie);
  const catCanon=normaliserRapprochementRevenuBudgetSoft20260908_(categorie);
  const montantVariable=revenuCanonMontantVariableBudgetSoft20260908_(categorie);
  return (ops||[]).some(o=>{
    const d=dateOpTresorerie_(o);if(!d||d<debut||d>reference)return false;
    const signe=montantSigneOperationRevenuBudgetSoft20260908_(o);
    if(!(signe>0))return false;

    const catOp=normaliserRapprochementRevenuBudgetSoft20260908_(o&&o.categorie||'');
    const texte=texteOperationRevenuBudgetSoft20260908_(o);
    const identiteSource=(catOp&&catOp===catCanon)||aliases.some(a=>a&&texte.includes(a));
    if(!identiteSource)return false;

    // France Travail : le montant mensuel est intrinsèquement variable et peut
    // s'écarter fortement du canon. L'identité du payeur + mois comptable suffit
    // à constater que l'occurrence mensuelle a été encaissée.
    if(montantVariable)return true;

    const m=Math.abs(signe);
    return Math.abs(m-cible)<=Math.max(1,cible*.08);
  });
}

function dateRevenuCanonEchuBudgetSoft20260908_(reference){
  return new Date(reference.getFullYear(),reference.getMonth(),reference.getDate()+1,12,0,0,0);
}

/**
 * Override terminal de revenusCanoniquesTresorerie20260831_.
 * Règle : si l'échéance habituelle du mois courant est dépassée et qu'aucun Réel
 * correspondant n'est présent, l'occurrence reste projetée comme "échue, toujours
 * attendue" à J+1. Le mois suivant n'est ajouté qu'après cette occurrence.
 */
function revenusCanoniquesTresorerie20260831_(ops,lignesExistantes,reference,cible){
  const canon=lireCanonRecettesTresorerie20260831_(),out=[];
  const norm=normaliserRapprochementRevenuBudgetSoft20260908_;
  const uniques=new Set(['salaires','france travail']);
  const agregats=new Set(['revenus fonciers','cours','concerts']);

  function operationsCategorieMois_(cat,annee,mois){
    const cle=norm(cat),aliases=aliasesRevenuCanonBudgetSoft20260908_(cat);
    return (ops||[]).filter(o=>{
      const d=dateOpTresorerie_(o),s=montantSigneOperationRevenuBudgetSoft20260908_(o);
      if(!d||d.getFullYear()!==annee||d.getMonth()!==mois||!(s>0))return false;
      const catOp=norm(o&&o.categorie||''),texte=texteOperationRevenuBudgetSoft20260908_(o);
      return (catOp&&catOp===cle)||aliases.some(a=>a&&texte.includes(a));
    });
  }

  function jourHabituel_(cat,baseMont){
    const hist=(ops||[]).map(o=>({o:o,d:dateOpTresorerie_(o),m:Math.abs(montantSigneOperationRevenuBudgetSoft20260908_(o))}))
      .filter(x=>x.d&&x.d<=reference&&x.d>=new Date(reference.getFullYear(),reference.getMonth()-6,1)
        &&montantSigneOperationRevenuBudgetSoft20260908_(x.o)>0
        &&norm(x.o.categorie||'')===norm(cat));
    const histSignif=hist.filter(x=>x.m>=Math.max(20,baseMont*.20));
    const jours=(histSignif.length?histSignif:hist).map(x=>x.d.getDate()).sort((a,b)=>a-b);
    return Math.max(1,Math.min(28,jours.length?jours[Math.floor(jours.length/2)]:15));
  }

  const finCycleCourant=typeof dateFinCycleCanonBudgetSoft20260906_==='function'
    ?dateFinCycleCanonBudgetSoft20260906_(reference)
    :new Date(reference.getDate()<=27?reference.getFullYear():reference.getFullYear(),reference.getDate()<=27?reference.getMonth():reference.getMonth()+1,27);
  finCycleCourant.setHours(23,59,59,999);

  (canon||[]).forEach(c=>{
    if(!actifTresorerie_(c.actif))return;
    const cat=String(c.categorie||'').trim(),cle=norm(cat),baseMont=Math.abs(Number(c.montant||0));
    if(!cat||!baseMont||(!uniques.has(cle)&&!agregats.has(cle)&&String(c.nature||'').toLowerCase()!=='structurelle'))return;

    const jour=jourHabituel_(cat,baseMont);
    let curseur=new Date(reference.getFullYear(),reference.getMonth(),1,12,0,0,0),guard=0;
    while(curseur<=cible&&guard++<8){
      const y=curseur.getFullYear(),m=curseur.getMonth(),reels=operationsCategorieMois_(cat,y,m);
      const reelTotal=arrondiTresorerie_(reels.reduce((s,o)=>s+Math.max(0,montantSigneOperationRevenuBudgetSoft20260908_(o)),0));
      let restant=baseMont,mode='reference';

      if(uniques.has(cle)){
        // Salaire / France Travail : une occurrence réelle du mois remplace
        // intégralement la prévision ; aucun "complément jusqu'à la moyenne".
        if(reels.length)restant=0;
        mode='occurrence_unique';
      }else if(agregats.has(cle)){
        // Foncier / Cours / Concerts : plusieurs encaissements peuvent composer
        // le mois. Le réel cumulé consomme progressivement la cible mensuelle.
        restant=arrondiTresorerie_(Math.max(0,baseMont-reelTotal));
        mode='cible_mensuelle_agregee';
      }

      if(restant>0){
        let d=new Date(y,m,Math.min(jour,new Date(y,m+1,0).getDate()),12,0,0,0);
        const moisReference=y===reference.getFullYear()&&m===reference.getMonth();
        if(moisReference&&d<=reference){
          d=new Date(reference);d.setDate(d.getDate()+1);d.setHours(12,0,0,0);
        }
        if(d>reference&&d<=cible&&d>finCycleCourant){
          const cand={
            id:'revcanon:'+cat+':'+y+'-'+String(m+1).padStart(2,'0'),
            source:'revenu_recurrent',sourceId:'canon:'+cat,date:d.toISOString(),libelle:cat,categorie:cat,
            compte:reels.length?String(reels[reels.length-1].compte||''):'',
            montantSigne:arrondiTresorerie_(restant),
            certitude:(c.mode_prevision==='moyenne_glissante_6_mois_complets'||reels.length>=3)?'tres_probable':'prevu',
            preuve:(mode==='occurrence_unique'
              ?'R0 effectif · occurrence mensuelle absente du Réel'
              :'R0 effectif · cible mensuelle moins encaissements réels déjà constatés'),
            dateConventionnelle:true,
            modeRapprochementReel:mode,
            cibleMensuelle:arrondiTresorerie_(baseMont),
            reelMois:reelTotal,
            resteMois:arrondiTresorerie_(restant),
            sourcePrevision:String(c.source_prevision||'R0 effectif')
          };
          if(!(lignesExistantes||[]).some(x=>ressemblentTresorerie20260831_(cand,x)))out.push(cand);
        }
      }
      curseur=new Date(y,m+1,1,12,0,0,0);
    }
  });
  return out;
}

function auditerRapprochementFranceTravailBudgetSoft20260908(){
  const ops=lireTable_('Operations'),reference=new Date();
  reference.setHours(23,59,59,999);
  const canon=lireCanonRecettesTresorerie20260831_();
  const c=(canon||[]).find(x=>normaliserRapprochementRevenuBudgetSoft20260908_(x.categorie)==='france travail');
  const montant=c?Math.abs(Number(c.montant||0)):0;
  const debut=new Date(reference.getFullYear(),reference.getMonth(),1,0,0,0,0);
  const aliases=aliasesRevenuCanonBudgetSoft20260908_('France Travail');
  const candidats=(ops||[]).filter(o=>{const d=dateOpTresorerie_(o),s=montantSigneOperationRevenuBudgetSoft20260908_(o);if(!(d&&d>=debut&&d<=reference&&s>0))return false;const texte=texteOperationRevenuBudgetSoft20260908_(o);const cat=normaliserRapprochementRevenuBudgetSoft20260908_(o&&o.categorie||'');return cat==='france travail'||aliases.some(a=>a&&texte.includes(a));})
    .map(o=>({date:dateOpTresorerie_(o).toISOString(),montant:montantSigneOperationRevenuBudgetSoft20260908_(o),categorie:o.categorie||'',libelle:o.libelle_bancaire||o.libelle||'',texte:texteOperationRevenuBudgetSoft20260908_(o)}));
  const out={version:BUDGETSOFT_REVENUE_ARREARS_20260908_VERSION,montantCanon:montant,regleMontant:'variable_non_bloquant',dejaEncaisse:revenuCanonMoisDejaEncaisseBudgetSoft20260908_(ops,reference,'France Travail',montant),candidats:candidats};
  console.log('[AUDIT Rapprochement France Travail] '+JSON.stringify(out));return out;
}

function auditerRecettesCanoniques30092026BudgetSoft20260908(){
  const r=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907('2026-09-30');
  const lignes=(r&&r.lignes||[]).filter(x=>x.source==='revenu_recurrent'||x.source==='evenement');
  const out={ok:!!(r&&r.ok),version:BUDGETSOFT_REVENUE_ARREARS_20260908_VERSION,dateCible:r&&r.dateCible,soldePrevisionnel:r&&r.soldePrevisionnel,recettes:lignes.map(x=>({source:x.source,libelle:x.libelle,categorie:x.categorie,montant:x.montantSigne,date:x.date,preuve:x.preuve,echeanceDepassee:!!x.echeanceDepassee}))};
  console.log('[AUDIT Recettes canoniques 30-09] '+JSON.stringify(out));return out;
}
