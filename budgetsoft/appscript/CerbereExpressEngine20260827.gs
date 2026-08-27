const CERBERE_EXPRESS_VERSION = '2026-08-27.1';

/**
 * Cerbère Express — moteur comportemental V1.
 *
 * Doctrine :
 * - l'allocation de référence est P1, telle que décidée dans les molettes Cerbère ;
 * - Express ne réinterprète jamais P1 et ne modifie aucune donnée ;
 * - une dépense est consommée à sa date réelle d'achat : date_achat pour une CB
 *   structurée, sinon date comptable/date de l'opération ;
 * - les CB différées ne sont donc PAS translatées vers M+1 dans les jauges Express ;
 * - les charges fixes, revenus et mouvements hors catégories P1 sont exclus ;
 * - le rythme compare la part consommée à la part du cycle 28 -> 27 écoulée ;
 * - Pluxee conserve sa fenêtre propre depuis le dernier rechargement ;
 * - Cerbère complet reste l'autorité pour la trajectoire financière M/M+1.
 */
function chargerCerbereExpress20260827() {
  const cerbere = chargerCerbereV374();
  if (!cerbere || cerbere.ok === false) return cerbere || {ok:false, erreur:'Cerbère indisponible'};

  const p = Array.isArray(cerbere.periodes) ? cerbere.periodes[0] : null;
  if (!p || !p.periode) throw new Error('Période courante Cerbère introuvable.');

  const maintenant = new Date();
  const debut = dateExpress_(p.periode.debut);
  const fin = dateExpress_(p.periode.fin);
  if (!debut || !fin) throw new Error('Bornes du cycle Cerbère invalides.');

  const enveloppes = (p.enveloppes || []).map(x => ({
    categorie:String(x && x.categorie || '').trim(),
    allocation:arrExpress_(Math.max(0, Number(x && x.prevu || 0))),
    canon:arrExpress_(Math.max(0, Number(x && x.canon || 0)))
  })).filter(x => x.categorie);
  const categoriesPilotables = new Set(enveloppes.map(x => x.categorie));

  const operationsBrutes = lireTable_('Operations') || [];
  const operations = typeof dedoublonnerOperationsCartesBudgetSoft_ === 'function'
    ? dedoublonnerOperationsCartesBudgetSoft_(operationsBrutes)
    : operationsBrutes;

  const consommeParCategorie = {};
  let nbDepenses = 0;
  operations.forEach(o => {
    const montant = Number(o && o.montant || 0);
    if (!Number.isFinite(montant) || montant >= 0) return;
    if (String(o && o.charge_fixe_id || '').trim()) return;
    const categorie = String(o && o.categorie || '').trim();
    if (!categoriesPilotables.has(categorie)) return;
    const d = dateAchatExpress_(o);
    if (!d || d > maintenant || !dansCycleExpress_(d, debut, fin)) return;
    consommeParCategorie[categorie] = Number(consommeParCategorie[categorie] || 0) + Math.abs(montant);
    nbDepenses++;
  });

  const progression = progressionCycleExpress_(debut, fin, maintenant);
  const lignes = enveloppes.map(x => {
    const consomme = arrExpress_(consommeParCategorie[x.categorie] || 0);
    const reste = arrExpress_(x.allocation - consomme);
    const partConsommee = x.allocation > 0 ? consomme / x.allocation : (consomme > 0 ? 1 : 0);
    const vigilance = vigilanceExpress_(partConsommee, progression.ratio, reste, x.allocation, progression.jour);
    return {
      categorie:x.categorie,
      allocation:x.allocation,
      canon:x.canon,
      consomme,
      reste,
      partConsommee:arrExpress_(partConsommee * 100),
      vigilance
    };
  });

  const totalAllocation = arrExpress_(lignes.reduce((s,x)=>s+x.allocation,0));
  const totalConsomme = arrExpress_(lignes.reduce((s,x)=>s+x.consomme,0));
  const totalReste = arrExpress_(totalAllocation-totalConsomme);

  const pluxee = construirePluxeeExpress_();
  const contexteFinancier = contexteFinancierExpress_(cerbere);
  const meteo = meteoExpress_(lignes, pluxee, contexteFinancier);
  const consigne = consigneSaillanteExpress_(lignes, pluxee, contexteFinancier, meteo);

  return {
    ok:true,
    version:CERBERE_EXPRESS_VERSION,
    genereLe:Utilities.formatDate(maintenant, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"),
    doctrine:'Lecture comportementale : P1 des molettes comme référence ; consommation à la date réelle d’achat ; aucune translation CB vers M+1.',
    cycle:{
      debut:formatDateExpress_(debut),
      fin:formatDateExpress_(fin),
      jour:progression.jour,
      jours:progression.jours,
      progressionPct:arrExpress_(progression.ratio*100)
    },
    pilotable:{
      allocation:totalAllocation,
      consomme:totalConsomme,
      reste:totalReste,
      nombreDepenses:nbDepenses,
      lignes
    },
    pluxee,
    contexteFinancier,
    meteo,
    consigneSaillante:consigne
  };
}

function dateAchatExpress_(o) {
  if (typeof estCarteStructureeBudgetSoft_ === 'function' && estCarteStructureeBudgetSoft_(o, Number(o && o.montant || 0))) {
    const achat = typeof dateAchatMetierBudgetSoft_ === 'function' ? dateAchatMetierBudgetSoft_(o) : null;
    if (achat) return achat;
  }
  if (typeof dateOperationCouranteBudgetSoft_ === 'function') return dateOperationCouranteBudgetSoft_(o);
  return dateExpress_(o && (o.date_comptable || o.date));
}

function vigilanceExpress_(partConsommee, partTemps, reste, allocation, jour) {
  const pc = Math.max(0, Number(partConsommee || 0));
  const pt = Math.max(0, Math.min(1, Number(partTemps || 0)));
  const ecartPts = (pc - pt) * 100;
  let niveau='vert', libelle='Cap tenu';

  if (reste < -.009 || pc > 1.0001) {
    niveau='rouge'; libelle='Enveloppe dépassée';
  } else if (allocation <= 0 && pc <= 0) {
    niveau='vert'; libelle='Aucune dépense engagée';
  } else if (jour <= 3) {
    // Début de cycle : un achat hebdomadaire peut mécaniquement créer un gros écart.
    if (pc >= .65) {niveau='orange'; libelle='Départ très rapide';}
    else {niveau='vert'; libelle='Début de cycle à observer';}
  } else if (ecartPts > 25) {
    niveau='rouge'; libelle='Rythme très supérieur au cap';
  } else if (ecartPts > 10) {
    niveau='orange'; libelle='Un peu rapide';
  } else if (ecartPts < -15) {
    niveau='vert'; libelle='Marge confortable';
  }

  return {
    niveau,
    libelle,
    ecartRythmePoints:arrExpress_(ecartPts),
    partTempsPct:arrExpress_(pt*100),
    message:messageVigilanceExpress_(niveau, libelle, pc, pt, reste)
  };
}

function messageVigilanceExpress_(niveau, libelle, pc, pt, reste) {
  const c=Math.round(pc*100), t=Math.round(pt*100);
  if (reste < -.009) return libelle+' · dépassement de '+formatEuroExpress_(Math.abs(reste));
  if (niveau==='orange'||niveau==='rouge') return libelle+' · '+c+' % consommés pour '+t+' % du cycle écoulé';
  if (libelle==='Marge confortable') return 'Marge confortable · '+c+' % consommés pour '+t+' % du cycle écoulé';
  return libelle+' · rythme compatible avec la date';
}

function construirePluxeeExpress_() {
  if (typeof chargerPluxeeCerbere20260827 !== 'function') return {ok:false, disponible:false};
  const e = chargerPluxeeCerbere20260827();
  const debut = e && e.cycle && e.cycle.dateRecharge ? dateExpress_(e.cycle.dateRecharge) : null;
  const maintenant = new Date();
  // Fenêtre comportementale simple Pluxee : 30 jours après la recharge.
  const ratio = debut ? Math.max(0, Math.min(1, (jourCivilExpress_(maintenant)-jourCivilExpress_(debut)+1)/30)) : 0;
  const jour = debut ? Math.max(1, Math.floor(jourCivilExpress_(maintenant)-jourCivilExpress_(debut))+1) : 1;
  const cats=['Courses','Restaurants'];
  const lignes=cats.map(c=>{
    const allocation=arrExpress_(Number(e && e.allocation && e.allocation[c] || 0));
    const consomme=arrExpress_(Number(e && e.reelParCategorie && e.reelParCategorie[c] || 0));
    const reste=arrExpress_(allocation-consomme);
    const part=allocation>0?consomme/allocation:(consomme>0?1:0);
    return {categorie:c,allocation,consomme,reste,partConsommee:arrExpress_(part*100),vigilance:vigilanceExpress_(part,ratio,reste,allocation,jour)};
  });
  return {
    ok:true,
    disponible:true,
    cycle:e.cycle,
    progressionPct:arrExpress_(ratio*100),
    lignes,
    aClasser:arrExpress_(Number(e && e.reelParCategorie && e.reelParCategorie['À classer'] || 0)),
    soldeTheorique:arrExpress_(Number(e.soldeTheorique||0)),
    soldeReel:arrExpress_(Number(e.soldeReel||0)),
    ecartReelTheorique:arrExpress_(Number(e.ecartReelTheorique||0))
  };
}

function contexteFinancierExpress_(cerbere) {
  const ps=Array.isArray(cerbere&&cerbere.periodes)?cerbere.periodes:[];
  const m=ps[0]||{},n=ps[1]||{};
  return {
    disponibleCerbereM:arrExpress_(Number(m&&m.v37&&m.v37.sct1||0)),
    disponibleCerbereM1:arrExpress_(Number(n&&n.v37&&n.v37.sct1||0)),
    cbDejaEngageeM1:arrExpress_(Number(n&&n.roulant&&n.roulant.cbHeritee||0)),
    // Contexte uniquement : ces montants ne modifient jamais les jauges Express.
    doctrine:'Contexte de vigilance issu de Cerbère complet ; sans effet sur la consommation comportementale Express.'
  };
}

function meteoExpress_(lignes, pluxee, contexte) {
  const rang={vert:0,orange:1,rouge:2};
  let score=0,raisons=[];
  (lignes||[]).forEach(x=>{const n=x&&x.vigilance&&x.vigilance.niveau||'vert';score=Math.max(score,rang[n]||0);if(n!=='vert')raisons.push(x.categorie+' : '+x.vigilance.libelle);});
  if(pluxee&&pluxee.disponible){
    (pluxee.lignes||[]).forEach(x=>{const n=x&&x.vigilance&&x.vigilance.niveau||'vert';score=Math.max(score,rang[n]||0);if(n!=='vert')raisons.push('Pluxee '+x.categorie+' : '+x.vigilance.libelle);});
    if(Number(pluxee.aClasser||0)>0){score=Math.max(score,1);raisons.push('Pluxee : '+formatEuroExpress_(pluxee.aClasser)+' à classer');}
  }
  if(Number(contexte&&contexte.disponibleCerbereM||0)<0){score=2;raisons.unshift('Trajectoire financière du cycle négative');}
  else if(Number(contexte&&contexte.disponibleCerbereM1||0)<0){score=Math.max(score,1);raisons.push('Prochain cycle sous tension');}

  if(score>=2)return{niveau:'rouge',emoji:'⛈️',libelle:'Orage',resume:'Écart important : un arbitrage est nécessaire.',raisons};
  if(score===1)return{niveau:'orange',emoji:'🌧️',libelle:'Pluvieux',resume:'Le cap reste récupérable, avec un point de vigilance.',raisons};
  const confortable=(lignes||[]).length&&lignes.every(x=>Number(x.vigilance&&x.vigilance.ecartRythmePoints||0)<=5);
  return confortable
    ?{niveau:'vert',emoji:'☀️',libelle:'Grand soleil',resume:'Cap tenu et marges globalement confortables.',raisons:[]}
    :{niveau:'vert',emoji:'🌤️',libelle:'Éclaircies',resume:'Cap global tenu.',raisons:[]};
}

function consigneSaillanteExpress_(lignes, pluxee, contexte, meteo) {
  const rang={vert:0,orange:1,rouge:2};
  const candidats=[];
  (lignes||[]).forEach(x=>candidats.push({source:'pilotable',categorie:x.categorie,niveau:x.vigilance.niveau,score:(rang[x.vigilance.niveau]||0)*100+Number(x.vigilance.ecartRythmePoints||0),reste:x.reste,allocation:x.allocation,consomme:x.consomme}));
  if(pluxee&&pluxee.disponible)(pluxee.lignes||[]).forEach(x=>candidats.push({source:'pluxee',categorie:x.categorie,niveau:x.vigilance.niveau,score:(rang[x.vigilance.niveau]||0)*100+Number(x.vigilance.ecartRythmePoints||0),reste:x.reste,allocation:x.allocation,consomme:x.consomme}));
  candidats.sort((a,b)=>b.score-a.score);
  const pire=candidats[0];

  if(Number(contexte&&contexte.disponibleCerbereM||0)<0) return {niveau:'rouge',texte:'Stop aux dépenses non nécessaires : le cycle doit être réarbitré.',raison:'trajectoire financière M négative'};
  if(pire&&pire.niveau==='rouge') {
    if(pire.categorie==='Achats personnels') return {niveau:'rouge',texte:'Nouveaux achats personnels : attendre le prochain cycle ou réallouer explicitement.',raison:'enveloppe Achats personnels en rouge'};
    return {niveau:'rouge',texte:'Ralentir '+pire.categorie+' ou réallouer avant toute nouvelle dépense.',raison:pire.categorie+' en rouge'};
  }
  if(pire&&pire.niveau==='orange') return {niveau:'orange',texte:'Surveiller '+(pire.source==='pluxee'?'Pluxee ':'')+pire.categorie+' : le rythme est trop rapide.',raison:pire.categorie+' au-dessus du rythme'};
  if(pluxee&&Number(pluxee.aClasser||0)>0) return {niveau:'orange',texte:'Classer '+formatEuroExpress_(pluxee.aClasser)+' de dépenses Pluxee pour fiabiliser les deux jauges.',raison:'Pluxee non classé'};
  if(Number(contexte&&contexte.disponibleCerbereM1||0)<0) return {niveau:'orange',texte:'Éviter une grosse dépense : le prochain cycle est déjà sous tension.',raison:'trajectoire M+1 négative'};
  return {niveau:'vert',texte:'Dépenses courantes possibles : le cap est tenu.',raison:meteo&&meteo.libelle||'cap tenu'};
}

function progressionCycleExpress_(debut, fin, maintenant) {
  const a=jourCivilExpress_(debut), z=jourCivilExpress_(fin), n=jourCivilExpress_(maintenant);
  const jours=Math.max(1,Math.round(z-a)+1);
  const jour=Math.max(1,Math.min(jours,Math.floor(n-a)+1));
  return {jour,jours,ratio:Math.max(0,Math.min(1,jour/jours))};
}
function dansCycleExpress_(d,a,z){const t=jourCivilExpress_(d);return t>=jourCivilExpress_(a)&&t<=jourCivilExpress_(z);}
function jourCivilExpress_(d){const x=new Date(d);return Date.UTC(x.getFullYear(),x.getMonth(),x.getDate())/86400000;}
function dateExpress_(v){if(!v)return null;const d=v instanceof Date?new Date(v.getTime()):new Date(v);return isNaN(d.getTime())?null:d;}
function formatDateExpress_(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function formatEuroExpress_(n){return arrExpress_(n).toFixed(2).replace('.',',')+' €';}
function arrExpress_(n){return Math.round(Number(n||0)*100)/100;}

/** Audit sans écriture : permet de valider la couche moteur avant toute UI/SMS. */
function auditerCerbereExpress20260827() {
  const e=chargerCerbereExpress20260827();
  const sommeAlloc=arrExpress_((e.pilotable.lignes||[]).reduce((s,x)=>s+Number(x.allocation||0),0));
  const sommeCons=arrExpress_((e.pilotable.lignes||[]).reduce((s,x)=>s+Number(x.consomme||0),0));
  const sommeReste=arrExpress_((e.pilotable.lignes||[]).reduce((s,x)=>s+Number(x.reste||0),0));
  const ok=Math.abs(sommeAlloc-e.pilotable.allocation)<.01&&Math.abs(sommeCons-e.pilotable.consomme)<.01&&Math.abs(sommeReste-e.pilotable.reste)<.01&&Math.abs(arrExpress_(e.pilotable.allocation-e.pilotable.consomme)-e.pilotable.reste)<.01;
  const out={ok,version:e.version,cycle:e.cycle,pilotable:{allocation:e.pilotable.allocation,consomme:e.pilotable.consomme,reste:e.pilotable.reste,nombreDepenses:e.pilotable.nombreDepenses,lignes:e.pilotable.lignes},pluxee:e.pluxee,contexteFinancier:e.contexteFinancier,meteo:e.meteo,consigneSaillante:e.consigneSaillante};
  console.log(JSON.stringify(out));
  return out;
}
