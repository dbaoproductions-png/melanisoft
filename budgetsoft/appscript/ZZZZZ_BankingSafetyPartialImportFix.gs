// Correctif de securite pour les copier-coller bancaires partiels.
// Un lot peut ne contenir qu'un sous-ensemble des operations (par ex. les CB differees).
// L'absence d'une operation dans ce lot ne permet donc jamais de la declarer orpheline.
// Seuls les placeholders/recurrences explicitement rapproches peuvent etre absorbes.

function planifierSnapshotV23_(incoming,ops,compte){
  const existants=ops.filter(o=>String(o.compte)===String(compte)),groupIn={},groupEx={};
  incoming.forEach((n,i)=>{const k=empreinteExacteV23_(n);(groupIn[k]||(groupIn[k]=[])).push({n,i});});
  existants.forEach(o=>{const k=empreinteExacteV23_(o);(groupEx[k]||(groupEx[k]=[])).push(o);});
  const used=new Set(),matches=[],ambigues=[],nouvelles=[],absorbees=[];
  Object.keys(groupIn).forEach(k=>{
    const ins=groupIn[k],cands=(groupEx[k]||[]).slice().sort((a,b)=>{const ar=estRecurrenceV23_(a)?0:1,br=estRecurrenceV23_(b)?0:1;if(ar!==br)return ar-br;return String(a.id).localeCompare(String(b.id));});
    if(cands.length>=ins.length){ins.forEach((x,j)=>{const o=cands[j];used.add(String(o.id));matches.push({n:x.n,o,raison:'empreinte bancaire exacte'});});return;}
    ins.forEach((x,j)=>{
      if(j<cands.length){const o=cands[j];used.add(String(o.id));matches.push({n:x.n,o,raison:'empreinte bancaire exacte'});return;}
      const possibles=existants.filter(o=>!used.has(String(o.id))&&centimesBanque_(o.montant)===centimesBanque_(x.n.montant)&&dateJourV23_(o.date_comptable||o.date)===dateJourV23_(x.n.date_comptable||x.n.date)).map(o=>({o,score:scoreMatchBancaire_(x.n,o)})).filter(c=>c.score>=60).sort((a,b)=>b.score-a.score);
      if(possibles.length===1){used.add(String(possibles[0].o.id));matches.push({n:x.n,o:possibles[0].o,raison:'date + montant + score unique'});}
      else if(possibles.length>1)ambigues.push({n:x.n,candidates:possibles.slice(0,5),raison:'plusieurs candidats residuels'});
      else nouvelles.push({n:x.n,raison:'aucune correspondance'});
    });
  });
  matches.forEach(m=>{existants.forEach(o=>{if(used.has(String(o.id))||!estRecurrenceV23_(o))return;if(centimesBanque_(o.montant)!==centimesBanque_(m.n.montant))return;if(dateJourV23_(o.date_comptable||o.date)!==dateJourV23_(m.n.date_comptable||m.n.date))return;if(!identiteProcheV23_(o.libelle_bancaire||o.libelle,m.n.libelle_bancaire||m.n.libelle))return;used.add(String(o.id));absorbees.push({placeholder:o,cible:m.o,n:m.n});});});
  const dates=incoming.map(n=>dateJourV23_(n.date_comptable||n.date)).filter(Boolean).sort(),minDate=dates[0]||'',maxDate=dates[dates.length-1]||'';
  const orphelines=[];
  return{matches,nouvelles,ambigues,absorbees,orphelines,minDate,maxDate};
}
