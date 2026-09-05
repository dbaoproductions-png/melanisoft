/*
 * BudgetSoft — Banking Safety 3.2
 * Correctif ciblé des séries bancaires répétées : lorsqu'un lot entrant et un
 * lot déjà présent contiennent le même nombre d'opérations pour une même date
 * comptable et un même montant, le rapprochement peut se faire par multiplicité
 * si toutes les lignes restent fortement compatibles entre elles.
 *
 * Cette surcharge tardive remplace uniquement la règle 3.1 de regroupement.
 * La validation manuelle des ambiguïtés reste le filet de sécurité par défaut.
 */

const BANKING_MULTIPLICITY_V32='3.2';

function cleMultipliciteV32_(o){
  return [
    dateJourV23_(o&&o.date_comptable||o&&o.date),
    centimesBanque_(o&&o.montant)
  ].join('|');
}

function rapprocherGroupesEquivalentsV31_(incoming,existants,used){
  const gi={},ge={},matches=[],indexes=new Set(),groupes=[];

  (incoming||[]).forEach((n,i)=>{
    const k=cleMultipliciteV32_(n);
    if(!k||k.charAt(0)==='|')return;
    (gi[k]||(gi[k]=[])).push({n,i});
  });
  (existants||[]).forEach(o=>{
    const k=cleMultipliciteV32_(o);
    if(!k||k.charAt(0)==='|')return;
    (ge[k]||(ge[k]=[])).push(o);
  });

  Object.keys(gi).forEach(k=>{
    const ins=gi[k];
    const ex=(ge[k]||[]).filter(o=>!used.has(String(o&&o.id||'')));
    if(ins.length<2||ins.length!==ex.length)return;

    const tousCompatibles=ins.every(x=>ex.every(o=>{
      const score=Number(scoreMatchBancaire_(x.n,o)||0);
      return score>=90&&identiteProcheV23_(
        x.n&& (x.n.libelle_bancaire||x.n.libelle),
        o&& (o.libelle_bancaire||o.libelle)
      );
    }));
    if(!tousCompatibles)return;

    const triesIn=ins.slice().sort((a,b)=>a.i-b.i);
    const triesEx=ex.slice().sort((a,b)=>{
      const ar=estRecurrenceV23_(a)?0:1,br=estRecurrenceV23_(b)?0:1;
      if(ar!==br)return ar-br;
      return String(a&&a.id||'').localeCompare(String(b&&b.id||''));
    });

    triesIn.forEach((x,j)=>{
      const o=triesEx[j];
      indexes.add(x.i);
      used.add(String(o.id));
      matches.push({
        n:x.n,
        o,
        raison:'groupe '+ins.length+'×'+ex.length+' date+montant/identité validé'
      });
    });

    groupes.push({
      cle:k,
      nombre:ins.length,
      date:dateJourV23_(ins[0].n.date_comptable||ins[0].n.date),
      montant:ins[0].n.montant,
      marchand:typeof identiteGroupeV31_==='function'?identiteGroupeV31_(ins[0].n):String(ins[0].n.libelle_bancaire||ins[0].n.libelle||'')
    });
  });

  return{matches,indexes,groupes};
}
