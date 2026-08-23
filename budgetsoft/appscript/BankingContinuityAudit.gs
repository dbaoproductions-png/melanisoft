const BANKING_CONTINUITY_AUDIT_VERSION = '1.1';

function bcaDate_(v){
  if(!v) return null;
  const d = v instanceof Date ? new Date(v) : new Date(v);
  return isNaN(d) ? null : d;
}
function bcaNumber_(v){
  if(v===undefined || v===null || String(v).trim()==='') return null;
  const n = Number(String(v).replace(/\s/g,'').replace(',','.'));
  return Number.isFinite(n) ? n : null;
}
function bcaRound_(n){ return Math.round(Number(n||0)*100)/100; }
function bcaSigned_(o){
  const m = Math.abs(Number(o.montant||0));
  return String(o.type||'').toLowerCase()==='depense' ? -m : m;
}
function bcaInWindow_(d,startExclusive,endInclusive){
  return !!d && d>startExclusive && d<=endInclusive;
}

/**
 * Audit de continuité bancaire strictement en lecture seule.
 * Formule : solde de départ + crédits - débits = solde d'arrivée.
 * Bornes : date de départ EXCLUE ; date d'arrivée INCLUSE.
 * Horloge : date_comptable uniquement.
 */
function auditerContinuiteBancaire(compte, dateDepart, soldeDepart, dateArrivee, soldeArrivee){
  verifierInitialisation_();

  const d0=bcaDate_(dateDepart), d1=bcaDate_(dateArrivee);
  const s0=bcaNumber_(soldeDepart), s1=bcaNumber_(soldeArrivee);
  if(!compte) throw new Error('Choisissez un compte.');
  if(!d0 || !d1) throw new Error('Renseignez les deux dates de solde.');
  if(d1<=d0) throw new Error('La date d’arrivée doit être postérieure à la date de départ.');
  if(s0===null || s1===null) throw new Error('Renseignez les deux soldes bancaires certifiés.');

  const comptes=lireTable_('Comptes');
  const c=comptes.find(x=>String(x.id||'')===String(compte) || String(x.nom||'')===String(compte));
  if(!c) throw new Error('Compte introuvable : '+compte);

  const id=String(c.id||''), nom=String(c.nom||id);
  const ops=lireOperationsBancaires_()
    .map(enrichirDepuisCommentaireBanque_)
    .filter(o=>!(/\[RECURRENCE:/i.test(String(o.commentaire||''))))
    .filter(o=>String(o.compte||'')===id || String(o.compte||'')===nom);

  let debits=0, credits=0, datesComptablesManquantes=0;
  const lignes=[];

  ops.forEach(o=>{
    const dc=bcaDate_(o.date_comptable);
    if(!dc){ datesComptablesManquantes++; return; }
    if(!bcaInWindow_(dc,d0,d1)) return;

    const signe=bcaSigned_(o), m=Math.abs(signe);
    if(signe<0) debits+=m; else credits+=m;
    lignes.push({
      id:String(o.id||''),
      dateComptable:dc.toISOString(),
      dateAchat:bcaDate_(o.date)?bcaDate_(o.date).toISOString():null,
      libelle:String(o.libelle_bancaire||o.libelle||''),
      type:String(o.type||''),
      montant:bcaRound_(signe),
      source:String(o.source_bancaire||''),
      statut:String(o.statut_bancaire||'')
    });
  });

  debits=bcaRound_(debits);
  credits=bcaRound_(credits);
  const soldeCalcule=bcaRound_(s0+credits-debits);
  const ecart=bcaRound_(soldeCalcule-s1);
  const certifie=Math.abs(ecart)<0.005 && datesComptablesManquantes===0;

  return {
    version:BANKING_CONTINUITY_AUDIT_VERSION,
    compte:{id,nom},
    dateDepart:d0.toISOString(),
    dateArrivee:d1.toISOString(),
    soldeDepart:bcaRound_(s0),
    soldeArrivee:bcaRound_(s1),
    credits,
    debits,
    net:bcaRound_(credits-debits),
    soldeCalcule,
    ecart,
    certifie,
    nombreOperations:lignes.length,
    datesComptablesManquantes,
    operations:lignes.sort((a,b)=>String(a.dateComptable).localeCompare(String(b.dateComptable)) || String(a.id).localeCompare(String(b.id))),
    formule:'solde départ + crédits - débits = solde arrivée',
    lectureSeule:true,
    diagnostic:certifie
      ? 'Continuité bancaire certifiée au centime : écart 0,00 €.'
      : 'Continuité NON certifiée : l’écart doit être expliqué avant toute validation de la base.'
  };
}

/** Cas étalon certifié : Compte joint, 15/07/2026 -> 11/08/2026. */
function testerContinuiteCompteJointEtalon(){
  const r=auditerContinuiteBancaire('Compte joint','2026-07-15',121.82,'2026-08-11',-471.68);
  console.log(JSON.stringify(r,null,2));
  return r;
}
