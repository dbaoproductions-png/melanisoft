const PDF_AMBIGUITY_RESOLUTION_VERSION = '1.0';

function serialiserCandidatAmbiguPdf_(c) {
  const o = c.o || {};
  return {
    id:String(o.id || ''),
    date:isoJourBanque_(o.date),
    date_comptable:isoJourBanque_(o.date_comptable || o.date),
    date_achat:isoJourBanque_(o.date_achat || o.date),
    libelle:String(o.libelle || ''),
    libelle_bancaire:String(o.libelle_bancaire || o.libelle || ''),
    categorie:String(o.categorie || ''),
    montant:Number(o.montant || 0),
    type:String(o.type || ''),
    source:String(o.source_bancaire || ''),
    statut:String(o.statut_bancaire || ''),
    carte_fin:String(o.carte_fin || ''),
    score:Number(c.score || 0)
  };
}

function analyserAmbiguitesPdfBancaire(lignes, compte) {
  const incoming = (lignes || []).map(x => normaliserEntreeBancaire_(Object.assign({}, x, {compte:x.compte || compte}), 'pdf'))
    .filter(x => x.compte && Number.isFinite(x.montant) && x.date_comptable);
  const ops = lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_);
  const actions = planifierUpsertBancaire_(incoming, ops, 'pdf');
  const ambigues = [];
  actions.forEach((a, index) => {
    if (a.kind !== 'ambiguous') return;
    ambigues.push({
      index:index,
      operationPdf:{
        date:isoJourBanque_(a.n.date),
        date_comptable:isoJourBanque_(a.n.date_comptable),
        date_achat:isoJourBanque_(a.n.date_achat),
        libelle:String(a.n.libelle || ''),
        libelle_bancaire:String(a.n.libelle_bancaire || ''),
        categorie:String(a.n.categorie || ''),
        montant:Number(a.n.montant || 0),
        type:String(a.n.type || ''),
        carte_fin:String(a.n.carte_fin || '')
      },
      candidats:(a.candidates || []).map(serialiserCandidatAmbiguPdf_)
    });
  });
  return {
    version:PDF_AMBIGUITY_RESOLUTION_VERSION,
    recues:incoming.length,
    rapprochementsAutomatiques:actions.filter(a => a.kind === 'replace').length,
    nouvelles:actions.filter(a => a.kind === 'create').length,
    ambigues:ambigues.length,
    details:ambigues,
    aucuneEcriture:true
  };
}

function appliquerDecisionsAmbiguitesPdf_(actions, decisions) {
  const parIndex = new Map((decisions || []).map(d => [Number(d.index), d]));
  const ciblesDejaUtilisees = new Set(actions.filter(a => a.kind === 'replace').map(a => String(a.o && a.o.id || '')));
  const erreurs = [];

  actions.forEach((a, index) => {
    if (a.kind !== 'ambiguous') return;
    const d = parIndex.get(index);
    if (!d) return;
    if (d.action === 'create') {
      a.kind = 'create';
      a.raison = 'création validée manuellement';
      delete a.candidates;
      return;
    }
    if (d.action !== 'match' || !d.operationId) {
      erreurs.push('Décision invalide pour l’opération PDF #' + (index + 1) + '.');
      return;
    }
    const choisi = (a.candidates || []).find(c => String(c.o && c.o.id || '') === String(d.operationId));
    if (!choisi) {
      erreurs.push('Le candidat choisi n’est plus disponible pour l’opération PDF #' + (index + 1) + '.');
      return;
    }
    const id = String(choisi.o.id || '');
    if (ciblesDejaUtilisees.has(id)) {
      erreurs.push('L’opération existante ' + id + ' est déjà utilisée par un autre rapprochement.');
      return;
    }
    ciblesDejaUtilisees.add(id);
    a.kind = 'replace';
    a.o = choisi.o;
    a.score = choisi.score;
    a.raison = 'rapprochement validé manuellement';
    delete a.candidates;
  });
  return erreurs;
}

function upsertOperationsBancairesTransactionnelAvecDecisions(lignes, compte, meta, decisions) {
  const source = 'pdf';
  const incoming = (lignes || []).map(x => normaliserEntreeBancaire_(Object.assign({}, x, {compte:x.compte || compte}), source))
    .filter(x => x.compte && Number.isFinite(x.montant) && x.date_comptable);
  if (!incoming.length) return {recues:0,creees:0,remplacees:0,ambigues:0,ignorees:0,bloque:false};

  const lot = controlerLotBancaire_(incoming, meta || null);
  if (!lot.ok) throw new Error('Lot bancaire refusé : ' + lot.erreurs.join(' '));

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  let backup = null;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const f = ss.getSheetByName('Operations');
    const headers = assurerColonnesBancaires_();
    const ops = lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_);
    const avant = checksumOperationsBanque_(ops);
    const actions = planifierUpsertBancaire_(incoming, ops, source);
    const erreursDecisions = appliquerDecisionsAmbiguitesPdf_(actions, decisions);
    if (erreursDecisions.length) throw new Error('Décisions de rapprochement refusées : ' + erreursDecisions.join(' '));

    const amb = actions.filter(a => a.kind === 'ambiguous');
    if (amb.length) {
      return {
        recues:incoming.length,
        creees:actions.filter(a => a.kind === 'create').length,
        remplacees:actions.filter(a => a.kind === 'replace').length,
        ambigues:amb.length,
        ignorees:0,
        bloque:true,
        message:'Import PDF bloqué : ' + amb.length + ' rapprochement(s) restent à décider.',
        detailsAmbigus:analyserAmbiguitesPdfBancaire(lignes, compte).details
      };
    }

    backup = creerSauvegardeOperationsSecurite_('import PDF après décisions manuelles');
    const parRow = new Map(ops.map((o,i) => [o._row,i]));
    actions.forEach(a => {
      if (a.kind === 'replace') {
        const idx = parRow.get(a.o._row), old = ops[idx], n = a.n;
        const out = Object.assign({}, old, {
          date:n.date,
          date_comptable:n.date_comptable,
          date_achat:n.date_achat,
          libelle:n.libelle || old.libelle,
          libelle_bancaire:n.libelle_bancaire,
          marchand_normalise:n.marchand_normalise,
          carte_fin:n.carte_fin,
          source_bancaire:n.source_bancaire,
          statut_bancaire:n.statut_bancaire,
          modifie_le:new Date()
        });
        if (!String(out.categorie || '').trim() && String(n.categorie || '').trim()) out.categorie = n.categorie;
        out.cle_rapprochement = cleTransactionUnique_(out);
        ops[idx] = out;
      } else if (a.kind === 'create') {
        const now = new Date();
        const out = Object.assign({id:Utilities.getUuid(),categorie:'',commentaire:'',cree_le:now,modifie_le:now}, a.n);
        out.cle_rapprochement = cleTransactionUnique_(out);
        a.newId = out.id;
        ops.push(out);
      }
    });

    const values = ops.map(o => serialiserOpBancaire_(o, headers));
    f.clearContents();
    f.getRange(1,1,1,headers.length).setValues([headers]);
    if (values.length) f.getRange(2,1,values.length,headers.length).setValues(values);
    f.setFrozenRows(1);
    SpreadsheetApp.flush();

    const apresOps = lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_);
    const apres = checksumOperationsBanque_(apresOps);
    const erreurs = verifierActionsAppliquees_(actions, apresOps);
    const expectedCreates = actions.filter(a => a.kind === 'create').length;
    if (apres.nombre !== avant.nombre + expectedCreates) erreurs.push('Nombre total inattendu après écriture.');
    if (apres.ids !== apres.nombre) erreurs.push('Identifiants non uniques après écriture.');
    const cles = apresOps.map(o => String(o.cle_rapprochement || '').trim()).filter(Boolean);
    if (cles.length !== new Set(cles).size) erreurs.push('Clés de rapprochement non uniques après écriture.');

    if (erreurs.length) {
      f.clearContents();
      const bv = backup.getDataRange().getValues();
      f.getRange(1,1,bv.length,bv[0].length).setValues(bv);
      SpreadsheetApp.flush();
      throw new Error('Contrôle transactionnel échoué ; restauration effectuée : ' + erreurs.slice(0,10).join(' '));
    }

    const remp = actions.filter(a => a.kind === 'replace').length;
    const crea = expectedCreates;
    journalBanque_({
      horodatage:new Date(),source:'pdf',compte,recues:incoming.length,remplacees:remp,creees:crea,ambigues:0,
      debits_lot:lot.debits,credits_lot:lot.credits,sauvegarde:backup.getName(),statut:'OK',detail:'Import PDF avec décisions manuelles + contrôle transactionnel'
    });
    return {recues:incoming.length,creees:crea,remplacees:remp,ambigues:0,ignorees:0,bloque:false,controle:lot,sauvegarde:backup.getName(),decisionsManuelles:(decisions || []).length};
  } catch (e) {
    journalBanque_({horodatage:new Date(),source:'pdf',compte,recues:incoming.length,debits_lot:lot.debits,credits_lot:lot.credits,sauvegarde:backup?backup.getName():'',statut:'ERREUR',detail:e.message});
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function importerPdfBancaireCertifieAvecDecisions(lignes, compte, meta, decisions) {
  const controle = controlerReleveAvantImport(meta, compte);
  if (!controle || controle.ok !== true) throw new Error(controle && controle.message ? controle.message : 'Import bloqué : contrôle du relevé impossible.');

  const resultat = upsertOperationsBancairesTransactionnelAvecDecisions(lignes, compte, meta, decisions || []);
  if (resultat && resultat.bloque) return resultat;

  const m = meta || {}, soldeCloture = Number(m.soldeCloture), soldeOuverture = Number(m.soldeOuverture);
  if (!m.dateCloture || !Number.isFinite(soldeCloture)) throw new Error('Import effectué mais relevé non certifiable : solde/date de clôture absent.');

  enregistrerParametreBudgetaire_('solde_releve_' + String(compte), soldeCloture);
  enregistrerParametreBudgetaire_('date_solde_releve_' + String(compte), m.dateCloture);
  const historique = lireHistoriqueReleves_(compte);
  const releve = {dateOuverture:m.dateOuverture || null,soldeOuverture:Number.isFinite(soldeOuverture)?soldeOuverture:null,dateCloture:m.dateCloture,soldeCloture:soldeCloture,importeLe:new Date().toISOString()};
  if (releve.dateOuverture && releve.soldeOuverture !== null && historique.length === 0) {
    enregistrerParametreBudgetaire_('solde_ouverture_premier_releve_' + String(compte), releve.soldeOuverture);
    enregistrerParametreBudgetaire_('date_ouverture_premier_releve_' + String(compte), releve.dateOuverture);
  }
  const deja = historique.some(r => String(r.dateOuverture || '') === String(releve.dateOuverture || '') && String(r.dateCloture || '') === String(releve.dateCloture || '') && Math.abs(Number(r.soldeCloture) - releve.soldeCloture) < 0.005);
  if (!deja) {
    historique.push(releve);
    historique.sort((a,b) => new Date(a.dateOuverture || a.dateCloture || 0) - new Date(b.dateOuverture || b.dateCloture || 0));
    enregistrerHistoriqueReleves_(compte, historique);
  }
  enregistrerControleReleve(controle, {source:'HELLOBANK_PDF',creees:Number(resultat.creees || 0),remplacees:Number(resultat.remplacees || 0),recues:Number(resultat.recues || 0)});
  resultat.controleReleveEnregistre = true;
  resultat.soldeCloture = soldeCloture;
  resultat.dateCloture = m.dateCloture;
  return resultat;
}
