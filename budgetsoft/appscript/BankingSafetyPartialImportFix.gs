// Correctif de securite pour les copier-coller bancaires partiels.
// Un lot peut ne contenir qu'un sous-ensemble des operations (par ex. les CB differees).
// L'absence d'une operation dans ce lot ne permet donc jamais de la declarer orpheline.
// Seuls les placeholders/recurrences explicitement rapproches peuvent etre absorbes.
//
// IMPORTANT : cette surcharge tardive doit conserver les rapprochements par multiplicite
// du socle Banking Safety. La version precedente reconstruisait planifierSnapshotV23_
// sans appeler rapprocherGroupesEquivalentsV31_, ce qui annulait de fait les correctifs 3.2/3.3.


// Preuve structurée d'identité pour les anciennes lignes dont date_comptable
// a pu diverger de la clé bancaire déjà construite. La clé HB|FLOW reste une
// preuve factuelle ; on ne fait aucune tolérance de date ni heuristique métier.
// Les groupes ne sont rapprochés automatiquement que si leurs multiplicités
// sont strictement identiques.
function signatureCleStructureeFluxV34_(o,depuisCleExistante){
  if(depuisCleExistante){
    const brut=String(o&&o.cle_rapprochement||'').trim();
    const base=brut.indexOf('|ID:')>=0?brut.slice(0,brut.indexOf('|ID:')):brut;
    const p=base.split('|');
    if(p.length>=8&&p[0]==='HB'&&p[1]==='FLOW'){
      return [p[0],p[1],p[2],p[3],p[4],p[5],p[6]].join('|');
    }
    return '';
  }
  const compta=dateJourV23_(o&&o.date_comptable||o&&o.date);
  const achat=dateJourV23_(o&&o.date_achat||o&&o.date);
  if(!compta||!achat)return '';
  const montant=centimesBanque_(o&&o.montant);
  const marchand=normaliserTexteBanqueFiable_(o&&o.marchand_normalise||o&&o.libelle)
    .replace(/\s/g,'').slice(0,60);
  const carte=String(o&&o.carte_fin||'');
  return ['HB','FLOW',compta,achat,montant,marchand,carte].join('|');
}

function rapprocherParCleStructureeFluxV34_(incoming,existants,used,indexesDejaPris){
  const gi={},ge={},matches=[],indexes=new Set(),groupes=[];
  (incoming||[]).forEach((n,i)=>{
    if(indexesDejaPris&&indexesDejaPris.has(i))return;
    const k=signatureCleStructureeFluxV34_(n,false);
    if(!k)return;
    (gi[k]||(gi[k]=[])).push({n,i});
  });
  (existants||[]).forEach(o=>{
    if(used.has(String(o&&o.id||'')))return;
    const k=signatureCleStructureeFluxV34_(o,true);
    if(!k)return;
    (ge[k]||(ge[k]=[])).push(o);
  });
  Object.keys(gi).forEach(k=>{
    const ins=gi[k],ex=(ge[k]||[]).filter(o=>!used.has(String(o&&o.id||'')));
    if(!ins.length||ins.length!==ex.length)return;
    const triesIn=ins.slice().sort((a,b)=>a.i-b.i);
    const triesEx=ex.slice().sort((a,b)=>String(a&&a.id||'').localeCompare(String(b&&b.id||'')));
    triesIn.forEach((x,j)=>{
      const o=triesEx[j];
      indexes.add(x.i);
      used.add(String(o.id));
      matches.push({n:x.n,o,raison:'clé bancaire HB|FLOW structurée'});
    });
    groupes.push({cle:k,nombre:triesIn.length,raison:'preuve structurée HB|FLOW'});
  });
  return{matches,indexes,groupes};
}

function planifierSnapshotV23_(incoming,ops,compte){
  const existants=ops.filter(o=>String(o.compte)===String(compte)),groupIn={},groupEx={};
  incoming.forEach((n,i)=>{const k=empreinteExacteV23_(n);(groupIn[k]||(groupIn[k]=[])).push({n,i});});
  existants.forEach(o=>{const k=empreinteExacteV23_(o);(groupEx[k]||(groupEx[k]=[])).push(o);});

  const used=new Set(),protegesAmbigus=new Set(),matches=[],ambigues=[],nouvelles=[],absorbees=[];
  const groupesAuto=typeof rapprocherGroupesEquivalentsV31_==='function'
    ?rapprocherGroupesEquivalentsV31_(incoming,existants,used)
    :{matches:[],indexes:new Set(),groupes:[]};
  groupesAuto.matches.forEach(m=>matches.push(m));

  const clesStructurees=rapprocherParCleStructureeFluxV34_(incoming,existants,used,groupesAuto.indexes);
  clesStructurees.matches.forEach(m=>matches.push(m));

  Object.keys(groupIn).forEach(k=>{
    const ins=groupIn[k].filter(x=>!groupesAuto.indexes.has(x.i)&&!clesStructurees.indexes.has(x.i));
    if(!ins.length)return;
    const cands=(groupEx[k]||[]).filter(o=>!used.has(String(o.id))).slice().sort((a,b)=>{
      const ar=estRecurrenceV23_(a)?0:1,br=estRecurrenceV23_(b)?0:1;
      if(ar!==br)return ar-br;
      return String(a.id).localeCompare(String(b.id));
    });
    if(cands.length>=ins.length){
      ins.forEach((x,j)=>{const o=cands[j];used.add(String(o.id));matches.push({n:x.n,o,raison:'empreinte bancaire exacte'});});
      return;
    }
    ins.forEach((x,j)=>{
      if(j<cands.length){
        const o=cands[j];used.add(String(o.id));matches.push({n:x.n,o,raison:'empreinte bancaire exacte'});return;
      }
      const possibles=existants
        .filter(o=>!used.has(String(o.id))&&!protegesAmbigus.has(String(o.id))&&centimesBanque_(o.montant)===centimesBanque_(x.n.montant)&&dateJourV23_(o.date_comptable||o.date)===dateJourV23_(x.n.date_comptable||x.n.date))
        .map(o=>({o,score:scoreMatchBancaire_(x.n,o)}))
        .filter(c=>c.score>=60)
        .sort((a,b)=>b.score-a.score);
      if(possibles.length===1){
        used.add(String(possibles[0].o.id));matches.push({n:x.n,o:possibles[0].o,raison:'date + montant + score unique'});
      }else if(possibles.length>1){
        possibles.forEach(c=>protegesAmbigus.add(String(c.o.id)));
        ambigues.push({n:x.n,candidates:possibles.slice(0,5),raison:'plusieurs candidats residuels'});
      }else nouvelles.push({n:x.n,raison:'aucune correspondance'});
    });
  });

  matches.forEach(m=>{existants.forEach(o=>{
    if(used.has(String(o.id))||protegesAmbigus.has(String(o.id))||!estRecurrenceV23_(o))return;
    if(centimesBanque_(o.montant)!==centimesBanque_(m.n.montant))return;
    if(dateJourV23_(o.date_comptable||o.date)!==dateJourV23_(m.n.date_comptable||m.n.date))return;
    if(!identiteProcheV23_(o.libelle_bancaire||o.libelle,m.n.libelle_bancaire||m.n.libelle))return;
    used.add(String(o.id));absorbees.push({placeholder:o,cible:m.o,n:m.n});
  });});

  const dates=incoming.map(n=>dateJourV23_(n.date_comptable||n.date)).filter(Boolean).sort(),minDate=dates[0]||'',maxDate=dates[dates.length-1]||'';
  const orphelines=[];
  return{matches,nouvelles,ambigues,absorbees,orphelines,protegesAmbigus:[...protegesAmbigus],groupesRapproches:(groupesAuto.groupes||[]).concat(clesStructurees.groupes||[]),minDate,maxDate};
}
