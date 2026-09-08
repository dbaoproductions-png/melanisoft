const BUDGETSOFT_REVENUE_ARREARS_20260908_VERSION='2026-09-08.2';

/**
 * Une recette structurelle échue mais non encaissée reste due dans la trajectoire
 * courante. Elle ne saute au mois suivant que lorsqu'une occurrence réelle du mois
 * courant l'a effectivement remplacée.
 */
function revenuCanonMoisDejaEncaisseBudgetSoft20260908_(ops,reference,categorie,montant){
  const debut=new Date(reference.getFullYear(),reference.getMonth(),1,0,0,0,0);
  const cible=Math.abs(Number(montant||0));
  const canon=normaliserLibelleTresorerie20260831_(categorie||'');
  const motsCanon=canon.split(' ').filter(x=>x.length>=4);
  return (ops||[]).some(o=>{
    const d=dateOpTresorerie_(o);if(!d||d<debut||d>reference)return false;
    const type=String(o&&o.type||'').toLowerCase();
    const signe=Number(o&&o.montant||0);
    if(!(type==='revenu'||signe>0))return false;
    const m=Math.abs(signe);
    const montantCompatible=Math.abs(m-cible)<=Math.max(1,cible*.08);
    if(!montantCompatible)return false;

    // Le rapprochement canon -> Réel ne doit pas dépendre d'une catégorisation parfaite.
    // On privilégie la catégorie exacte, mais on accepte aussi un libellé bancaire qui
    // identifie clairement la recette canonique (ex. France Travail catégorisé autrement).
    const catOp=String(o&&o.categorie||'').trim();
    if(catOp===String(categorie||'').trim())return true;
    const libOp=normaliserLibelleTresorerie20260831_(
      String(o&&o.libelle_bancaire||'')+' '+String(o&&o.libelle||'')+' '+catOp
    );
    return motsCanon.length&&motsCanon.some(w=>libOp.includes(w));
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
  (canon||[]).forEach(c=>{
    if(!actifTresorerie_(c.actif)||String(c.nature||'').toLowerCase()!=='structurelle')return;
    const cat=String(c.categorie||'').trim();if(!cat)return;
    const baseMont=Math.abs(Number(c.montant||0));if(!baseMont)return;

    const hist=(ops||[]).map(o=>({o:o,d:dateOpTresorerie_(o),m:Math.abs(Number(o.montant||0))}))
      .filter(x=>x.d&&x.d<=reference&&x.d>=new Date(reference.getFullYear(),reference.getMonth()-6,1)
        &&(String(x.o.type||'').toLowerCase()==='revenu'||Number(x.o.montant||0)>0)
        &&String(x.o.categorie||'').trim()===cat);
    const histSignif=hist.filter(x=>x.m>=Math.max(20,baseMont*.35));
    const jours=(histSignif.length?histSignif:hist).map(x=>x.d.getDate()).sort((a,b)=>a-b);
    const jour=Math.max(1,Math.min(28,jours.length?jours[Math.floor(jours.length/2)]:15));

    const echeanceMois=new Date(reference.getFullYear(),reference.getMonth(),jour,12,0,0,0);
    const dejaEncaisse=revenuCanonMoisDejaEncaisseBudgetSoft20260908_(ops,reference,cat,baseMont);
    let d,echu=false;
    if(echeanceMois<=reference&&!dejaEncaisse){d=dateRevenuCanonEchuBudgetSoft20260908_(reference);echu=true;}
    else if(echeanceMois>reference){d=echeanceMois;}
    else d=new Date(reference.getFullYear(),reference.getMonth()+1,jour,12,0,0,0);

    let guard=0;
    while(d<=cible&&guard++<7){
      let montant=baseMont;const de=c.date_effet?new Date(c.date_effet):null;
      if(de&&!isNaN(de)&&d<de&&Number(c.montant_precedent)>0)montant=Math.abs(Number(c.montant_precedent));
      if(montant>0){
        const cand={
          id:'revcanon:'+cat+':'+d.getTime(),source:'revenu_recurrent',sourceId:'canon:'+cat,
          date:d.toISOString(),libelle:cat,categorie:cat,
          compte:histSignif.length?histSignif[histSignif.length-1].o.compte||'':'',
          montantSigne:arrondiTresorerie_(montant),
          certitude:histSignif.length>=3?'tres_probable':'prevu',
          preuve:echu?'Revenu structurel du canon Cerbère · échéance dépassée, toujours attendu':'Revenu structurel du canon Cerbère · date habituelle estimée',
          dateConventionnelle:true,
          echeanceDepassee:echu
        };
        if(!(lignesExistantes||[]).some(x=>ressemblentTresorerie20260831_(cand,x)))out.push(cand);
      }
      echu=false;
      d=new Date(d.getFullYear(),d.getMonth()+1,jour,12,0,0,0);
    }
  });
  return out;
}

function auditerRecettesCanoniques30092026BudgetSoft20260908(){
  const r=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907('2026-09-30');
  const lignes=(r&&r.lignes||[]).filter(x=>x.source==='revenu_recurrent'||x.source==='evenement');
  const out={ok:!!(r&&r.ok),version:BUDGETSOFT_REVENUE_ARREARS_20260908_VERSION,dateCible:r&&r.dateCible,soldePrevisionnel:r&&r.soldePrevisionnel,recettes:lignes.map(x=>({source:x.source,libelle:x.libelle,categorie:x.categorie,montant:x.montantSigne,date:x.date,preuve:x.preuve,echeanceDepassee:!!x.echeanceDepassee}))};
  console.log('[AUDIT Recettes canoniques 30-09] '+JSON.stringify(out));return out;
}
