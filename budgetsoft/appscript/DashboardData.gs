// DashboardData v1.6 — mêmes opérations réelles que l'onglet Opérations, cycles calculés sur date comptable
function chargerDashboardReel() {
  verifierInitialisation_();

  // Source unique : toutes les opérations réellement enregistrées dans BudgetSoft.
  // Ne pas utiliser lireOperationsBancaires_ ici : cela excluait certaines lignes
  // valides (opérations saisies/manuelles ou anciennes lignes sans métadonnées bancaires).
  const operations = lireTable_('Operations').map(o => {
    try { return typeof enrichirDepuisCommentaireBanque_ === 'function' ? enrichirDepuisCommentaireBanque_(o) : o; }
    catch (e) { return o; }
  });
  const tousComptes = lireTable_('Comptes').filter(c => convertirBooleen_(c.actif));
  const chargesFixesRef = lireTable_('Charges_fixes');
  const parametres = Object.fromEntries(lireTable_('Parametres').map(p => [String(p.cle), p.valeur]));
  const maintenant = new Date();
  const finAujourdHui = dateJourCycle_(maintenant);
  finAujourdHui.setHours(23, 59, 59, 999);

  const estCompteCourant = c => {
    const s = String((c.nom || '') + ' ' + (c.type || '') + ' ' + (c.nature || '')).toLowerCase();
    return /compte\s*(joint|courant)|compte\s*cheques?|courant/.test(s) && !/livret|epargne|épargne/.test(s);
  };
  const comptes = tousComptes.filter(estCompteCourant);
  const comptesSolde = comptes.length ? comptes : tousComptes.filter(c => !/livret|epargne|épargne/i.test(String((c.nom || '') + ' ' + (c.type || ''))));
  const estAuto = o => /\[RECURRENCE:[^\]]+\]/.test(String(o && o.commentaire || ''));
  const opsReelles = operations.filter(o => !estAuto(o));

  // Une opération bancaire réelle appartient au cycle de sa date comptable.
  // date_achat n'est conservée que comme information pour les CB différées.
  const valides = opsReelles.map(o => {
    const dateComptable = new Date(o.date_comptable || o.date);
    const dateAchat = new Date(o.date_achat || o.date || o.date_comptable);
    const type = String(o.type || '').toLowerCase();
    const montant = Math.abs(Number(o.montant || 0));
    return {
      brut: o,
      date: dateComptable,
      dateAnalyse: dateComptable,
      dateComptable,
      dateAchat,
      libelle: String(o.libelle || o.libelle_bancaire || ''),
      compte: String(o.compte || ''),
      categorie: String(o.categorie || '').trim(),
      type,
      montant
    };
  }).filter(o => !isNaN(o.dateComptable) && Number.isFinite(o.montant) && o.montant > 0 && (o.type === 'revenu' || o.type === 'depense') && o.dateComptable <= finAujourdHui);

  const datesReleves = Object.keys(parametres)
    .filter(k => k.indexOf('date_solde_releve_') === 0)
    .map(k => new Date(parametres[k]))
    .filter(d => !isNaN(d));
  const dernierReleve = datesReleves.length ? datesReleves.sort((a, b) => b - a)[0] : null;
  const derniereOp = valides.length ? valides.slice().sort((a, b) => b.dateComptable - a.dateComptable)[0].dateComptable : null;
  let reference = dateJourCycle_(dernierReleve && derniereOp ? (dernierReleve > derniereOp ? dernierReleve : derniereOp) : (dernierReleve || derniereOp || maintenant));

  let salaire = null;
  try { salaire = detecterSalairePrincipal_(opsReelles, 12); } catch (e) {}
  const jourRepli = Number(salaire && salaire.jourMoyen) || Number(parametres.jour_debut_mois) || 28;

  function periodePour(d) {
    try { return calculerCycleDepuisSalaire_(d, opsReelles, jourRepli, salaire); }
    catch (e) {
      const j = Math.max(1, Math.min(28, jourRepli));
      const x = new Date(d);
      const deb = x.getDate() >= j ? new Date(x.getFullYear(), x.getMonth(), j) : new Date(x.getFullYear(), x.getMonth() - 1, j);
      const fin = new Date(new Date(deb.getFullYear(), deb.getMonth() + 1, j).getTime() - 1);
      return construirePeriodeCycle_(deb, fin, false);
    }
  }

  function stats(p, lim) {
    const deb = new Date(p.debut), fin = new Date(p.fin);
    const borne = lim && new Date(lim) < fin ? new Date(lim) : fin;
    const ops = valides.filter(o => o.dateComptable >= deb && o.dateComptable <= borne);
    const rev = ops.filter(o => o.type === 'revenu').reduce((s, o) => s + o.montant, 0);
    const dep = ops.filter(o => o.type === 'depense').reduce((s, o) => s + o.montant, 0);
    return { revenus: arrondirCycle_(rev), depenses: arrondirCycle_(dep), epargne: arrondirCycle_(rev - dep), operations: ops.length };
  }

  function soldeCompte(c, dateRef) {
    const id = String(c.id), nom = String(c.nom || '');
    const sp = parametres['solde_releve_' + id];
    const dp = parametres['date_solde_releve_' + id] ? new Date(parametres['date_solde_releve_' + id]) : null;
    const cor = o => String(o.compte) === id || String(o.compte) === nom;
    if (sp !== undefined && sp !== '' && dp && !isNaN(dp)) {
      const base = Number(String(sp).replace(',', '.'));
      if (Number.isFinite(base)) {
        const mv = valides.filter(o => cor(o) && o.dateComptable > dp && dateJourCycle_(o.dateComptable) <= dateJourCycle_(dateRef))
          .reduce((s, o) => s + (o.type === 'depense' ? -o.montant : o.montant), 0);
        return { solde: arrondirCycle_(base + mv), date: dateRef > dp ? dateRef : dp, fiable: true };
      }
    }
    const mv = valides.filter(o => cor(o) && dateJourCycle_(o.dateComptable) <= dateJourCycle_(dateRef))
      .reduce((s, o) => s + (o.type === 'depense' ? -o.montant : o.montant), 0);
    return { solde: arrondirCycle_(Number(c.solde_initial || 0) + mv), date: dateRef, fiable: false };
  }

  function soldeGlobal(dateRef) {
    let total = 0, fiable = comptesSolde.length > 0, dateMax = null;
    comptesSolde.forEach(c => {
      const r = soldeCompte(c, dateRef);
      total += r.solde;
      fiable = fiable && r.fiable;
      if (r.date && (!dateMax || r.date > dateMax)) dateMax = r.date;
    });
    return { solde: arrondirCycle_(total), fiable, date: dateMax, comptes: comptesSolde.map(c => String(c.nom || c.id)) };
  }

  function v(c, noms, def) {
    for (const n of noms) if (c[n] !== undefined && c[n] !== null && String(c[n]).trim() !== '') return c[n];
    return def;
  }

  function fixes(apres, jusqua) {
    const charges = chargesFixesRef.filter(c => convertirBooleen_(v(c, ['actif', 'active', 'est_actif'], true)));
    const deb = dateJourCycle_(apres), fin = dateJourCycle_(jusqua), items = [];
    charges.forEach(c => {
      const debutCharge = c.date_debut ? dateLocaleBudgetSoft_(c.date_debut) : deb;
      const finCharge = c.date_fin ? dateLocaleBudgetSoft_(c.date_fin) : null;
      const debutCalcul = debutCharge > deb ? debutCharge : deb;
      if (finCharge && finCharge < debutCalcul) return;
      let echeances = [];
      try {
        echeances = typeof calculerEcheancesChargeFixeAjustees_ === 'function'
          ? calculerEcheancesChargeFixeAjustees_(c, debutCalcul, finCharge, fin)
          : calculerEcheancesJusqua_(c, debutCalcul, finCharge, fin).map(d => ({ date: d, montant: Math.abs(Number(c.montant || 0)) }));
      } catch (e) { echeances = []; }
      echeances.filter(e => new Date(e.date) > deb && new Date(e.date) <= fin).forEach(e => items.push({
        id: String(c.id || ''),
        libelle: String(v(c, ['libelle', 'nom', 'intitule'], 'Charge fixe')),
        montant: arrondirCycle_(Math.abs(Number(e.montant || c.montant || 0))),
        date: new Date(e.date).toISOString(),
        ajustement: String(e.ajustement || '')
      }));
    });
    return items.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function cbDifferees(debut, fin) {
    const a = dateJourCycle_(debut), b = dateJourCycle_(fin);
    return opsReelles.map(o => {
      if (String(o.type || '').toLowerCase() !== 'depense') return null;
      const dateAchat = new Date(o.date_achat || o.date);
      const dateDebit = new Date(o.date_comptable || o.date);
      const jourDebit = isNaN(dateDebit) ? dateDebit : dateJourCycle_(dateDebit);
      const montant = Math.abs(Number(o.montant || 0));
      const estCarte = !!String(o.carte_fin || '').trim() || /\b(?:paiement\s+)?cb\b/i.test(String(o.libelle_bancaire || o.libelle || ''));
      if (!estCarte || isNaN(jourDebit) || jourDebit < a || jourDebit > b || jourDebit <= reference || !Number.isFinite(montant) || montant <= 0) return null;
      return {
        id: String(o.id || ''),
        dateAchat: isNaN(dateAchat) ? null : dateAchat.toISOString(),
        dateDebit: dateDebit.toISOString(),
        montant: arrondirCycle_(montant),
        libelle: String(o.libelle_bancaire || o.libelle || 'Carte différée'),
        carteFin: String(o.carte_fin || '')
      };
    }).filter(Boolean);
  }

  const courant = periodePour(reference);
  const deb = dateJourCycle_(new Date(courant.debut)), fin = dateJourCycle_(new Date(courant.fin));
  const st = stats(courant, reference);
  const duree = Math.max(1, ecartJoursCycle_(deb, fin) + 1);
  const jour = Math.max(1, Math.min(duree, ecartJoursCycle_(deb, reference) + 1));
  const joursRestants = Math.max(0, ecartJoursCycle_(reference, fin));

  const solde = soldeGlobal(reference);
  const fixesCourantes = fixes(reference, fin);
  const totalFixes = arrondirCycle_(fixesCourantes.reduce((s, x) => s + x.montant, 0));
  const cbCourantes = cbDifferees(reference, fin);
  const totalCb = arrondirCycle_(cbCourantes.reduce((s, x) => s + x.montant, 0));
  const disponible = solde.fiable ? arrondirCycle_(solde.solde - totalFixes - totalCb) : null;
  const budgetJour = disponible != null && joursRestants > 0 ? arrondirCycle_(disponible / joursRestants) : disponible;

  const prochainDeb = new Date(fin); prochainDeb.setDate(prochainDeb.getDate() + 1);
  const prochain = periodePour(prochainDeb);
  const prochainFin = dateJourCycle_(new Date(prochain.fin));
  const fixesSuivantes = fixes(new Date(prochainDeb.getTime() - 86400000), prochainFin);
  const totalFixesSuiv = arrondirCycle_(fixesSuivantes.reduce((s, x) => s + x.montant, 0));
  const cbSuiv = cbDifferees(prochainDeb, prochainFin);
  const totalCbSuiv = arrondirCycle_(cbSuiv.reduce((s, x) => s + x.montant, 0));

  // Salaire attendu : se baser d'abord sur la catégorie Salaires désormais fiabilisée.
  // L'éventuel remboursement professionnel de juillet est neutralisé avant moyenne.
  const ajustementJuillet = Number(parametres.salaire_remboursement_pro_2026_07 || 153.49);
  const salairesHist = valides.filter(o => o.type === 'revenu' && (o.categorie === 'Salaires' || /MAIRIE DE TOULOUSE/i.test(o.libelle)))
    .sort((a, b) => a.dateComptable - b.dateComptable)
    .slice(-6)
    .map(o => ({
      montant: (cleMoisMetier2026_ && typeof cleMoisMetier2026_ === 'function' && cleMoisMetier2026_(o.dateComptable) === '2026-07')
        ? Math.max(0, o.montant - (Number.isFinite(ajustementJuillet) ? ajustementJuillet : 0))
        : o.montant
    }));
  const salaireAttendu = salairesHist.length ? arrondirCycle_(salairesHist.reduce((s, o) => s + o.montant, 0) / salairesHist.length) : null;
  const margeSuiv = salaireAttendu != null ? arrondirCycle_(salaireAttendu - totalFixesSuiv - totalCbSuiv) : null;

  const finPrec = new Date(deb); finPrec.setDate(finPrec.getDate() - 1);
  const prec = periodePour(finPrec);
  prec.fin = new Date(finPrec.getFullYear(), finPrec.getMonth(), finPrec.getDate(), 23, 59, 59, 999).toISOString();
  const stPrec = stats(prec, new Date(prec.fin));
  const lib = p => p.libelle || new Date(p.debut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase());

  return {
    referenceImport: reference.toISOString(), salaire,
    courtTerme: {
      libelle: lib(courant), debut: courant.debut, fin: courant.fin, jour, duree, joursRestants,
      dateReference: reference.toISOString(), soldeBancaire: solde.solde,
      dateSolde: solde.date ? solde.date.toISOString() : null, soldeFiable: solde.fiable,
      comptesSolde: solde.comptes, chargesFixes: totalFixes, nombreCharges: fixesCourantes.length,
      cbDifferees: totalCb, nombreCb: cbCourantes.length, disponible, budgetJour,
      revenusConstates: st.revenus, depensesConstatees: st.depenses, epargne: st.epargne, operations: st.operations
    },
    cycleSuivant: {
      libelle: lib(prochain), debut: prochain.debut, fin: prochain.fin, salaireAttendu,
      chargesFixes: totalFixesSuiv, nombreCharges: fixesSuivantes.length,
      cbDifferees: totalCbSuiv, nombreCb: cbSuiv.length, marge: margeSuiv, detailCb: cbSuiv.slice(0, 8)
    },
    cyclePrecedent: {
      libelle: lib(prec), debut: prec.debut, fin: prec.fin,
      revenus: stPrec.revenus, depenses: stPrec.depenses, epargne: stPrec.epargne, operations: stPrec.operations
    }
  };
}
