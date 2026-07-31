function estOperationSalaire_(operation) {
  const montant = Number(operation && operation.montant || 0);
  if (montant <= 0) return false;
  const texte = normaliserTexteCycle_([operation.libelle, operation.categorie, operation.commentaire].join(' '));
  return CYCLE_SALARY_WORDS.some(mot => texte.indexOf(mot) >= 0);
}

function estOperationCarte_(operation) {
  if (operation && operation.estCarte === true) return true;
  const texte = normaliserTexteCycle_([operation && operation.libelle, operation && operation.details, operation && operation.commentaire].join(' '));
  return CYCLE_CARD_WORDS.some(mot => texte.indexOf(mot) >= 0);
}

function normaliserTexteCycle_(texte) {
  return String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9()]+/g, ' ').trim();
}

function dernierJourDuMois_(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 12, 0, 0, 0);
}

function dateDebitCarte_(dateAchat) {
  return dernierJourDuMois_(dateAchat);
}

function detecterSalairePrincipal_(operations, moisHistorique) {
  const limite = new Date();
  limite.setMonth(limite.getMonth() - Math.max(3, Number(moisHistorique) || 12));
  const candidats = (operations || []).filter(estOperationSalaire_).map(o => ({
    operation: o,
    date: new Date(o.date),
    montant: Math.abs(Number(o.montant || 0)),
    cle: normaliserTexteCycle_(o.libelle).replace(/\b(SALAIRE|PAYE|TRAITEMENT)\b/g, '').trim() || 'SALAIRE'
  })).filter(c => !isNaN(c.date) && c.date >= limite);

  if (!candidats.length) return null;
  const groupes = {};
  candidats.forEach(c => {
    if (!groupes[c.cle]) groupes[c.cle] = [];
    groupes[c.cle].push(c);
  });
  const groupe = Object.values(groupes).sort((a, b) => b.length - a.length || moyenne_(b.map(x => x.montant)) - moyenne_(a.map(x => x.montant)))[0];
  const jours = groupe.map(c => c.date.getDate()).sort((a,b)=>a-b);
  const montants = groupe.map(c => c.montant);
  const dernier = groupe.sort((a,b)=>b.date-a.date)[0];
  return {
    libelle: dernier.operation.libelle || 'Salaire principal',
    compte: dernier.operation.compte || '',
    occurrences: groupe.length,
    montantMoyen: arrondirCycle_(moyenne_(montants)),
    jourMoyen: Math.round(moyenne_(jours)),
    jourMin: Math.min.apply(null, jours),
    jourMax: Math.max.apply(null, jours),
    derniereDate: dernier.date.toISOString(),
    confiance: Math.min(100, 35 + groupe.length * 10)
  };
}

function calculerCycleDepuisSalaire_(reference, operations, jourRepli) {
  const dateRef = reference instanceof Date ? reference : new Date(reference || new Date());
  const salaires = (operations || []).filter(estOperationSalaire_).map(o => new Date(o.date)).filter(d => !isNaN(d)).sort((a,b)=>a-b);
  const precedent = salaires.filter(d => d <= dateRef).pop();
  const suivant = salaires.find(d => d > dateRef);
  if (precedent) {
    const fin = suivant ? new Date(suivant.getTime() - 1) : new Date(new Date(precedent.getFullYear(), precedent.getMonth() + 1, precedent.getDate()).getTime() - 1);
    return construirePeriodeCycle_(precedent, fin, true);
  }
  const jour = Math.max(1, Math.min(28, Number(jourRepli) || 28));
  const debut = dateRef.getDate() >= jour ? new Date(dateRef.getFullYear(), dateRef.getMonth(), jour) : new Date(dateRef.getFullYear(), dateRef.getMonth()-1, jour);
  const fin = new Date(new Date(debut.getFullYear(), debut.getMonth()+1, jour).getTime()-1);
  return construirePeriodeCycle_(debut, fin, false);
}

function construirePeriodeCycle_(debut, fin, salaireDetecte) {
  const maintenant = new Date();
  const duree = Math.max(1, Math.ceil((fin - debut) / 86400000) + 1);
  const jourCourant = maintenant < debut ? 0 : maintenant > fin ? duree : Math.min(duree, Math.floor((maintenant - debut) / 86400000) + 1);
  return {
    debut: debut.toISOString(),
    fin: fin.toISOString(),
    cle: Utilities.formatDate(debut, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    libelle: 'Cycle du ' + Utilities.formatDate(debut, Session.getScriptTimeZone(), 'dd/MM') + ' au ' + Utilities.formatDate(fin, Session.getScriptTimeZone(), 'dd/MM'),
    salaireDetecte: salaireDetecte,
    dureeJours: duree,
    jourCourant: jourCourant,
    progression: Math.max(0, Math.min(100, Math.round(jourCourant / duree * 100))),
    joursRestants: Math.max(0, Math.ceil((fin - maintenant) / 86400000))
  };
}

function moyenne_(valeurs) {
  return valeurs.length ? valeurs.reduce((s,v)=>s+Number(v||0),0) / valeurs.length : 0;
}

function arrondirCycle_(valeur) {
  return Math.round(Number(valeur || 0) * 100) / 100;
}
