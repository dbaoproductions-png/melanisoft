function chargerDashboardReel() {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const maintenant = new Date();
  const dateOp = o => {
    try { return typeof dateEffectiveOperationCycle_ === 'function' ? dateEffectiveOperationCycle_(o) : new Date(o.date); }
    catch (e) { return new Date(o.date); }
  };
  const valides = operations.map(o => ({
    date: dateOp(o),
    libelle: String(o.libelle || o.libelle_bancaire || 'Opération'),
    categorie: String(o.categorie || ''),
    compte: String(o.compte || ''),
    type: String(o.type || '').toLowerCase(),
    montant: Math.abs(Number(o.montant || 0))
  })).filter(o => !isNaN(o.date) && Number.isFinite(o.montant) && o.montant > 0 && o.date <= maintenant);

  const recents = valides.slice().sort((a,b)=>b.date-a.date).slice(0,6).map(o=>({
    date:o.date.toISOString(), libelle:o.libelle, categorie:o.categorie, compte:o.compte, type:o.type, montant:o.montant
  }));

  const mois = {};
  valides.forEach(o => {
    const cle = Utilities.formatDate(o.date, Session.getScriptTimeZone(), 'yyyy-MM');
    if (!mois[cle]) mois[cle] = { cle, revenus:0, depenses:0 };
    if (o.type === 'revenu') mois[cle].revenus += o.montant;
    if (o.type === 'depense') mois[cle].depenses += o.montant;
  });
  const evolution = Object.values(mois).sort((a,b)=>a.cle.localeCompare(b.cle)).slice(-6).map(m=>{
    const d=new Date(Number(m.cle.slice(0,4)),Number(m.cle.slice(5,7))-1,1);
    return { cle:m.cle, libelle:d.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}), revenus:arrondirCycle_(m.revenus), depenses:arrondirCycle_(m.depenses), solde:arrondirCycle_(m.revenus-m.depenses) };
  });

  const sansCategorie = valides.filter(o=>!o.categorie || normaliserTexteCycle_(o.categorie)==='SANS CATEGORIE').length;
  const dernierMois = evolution.length ? evolution[evolution.length-1] : null;
  const trois = evolution.slice(-3);
  const epargneMoyenne = trois.length ? trois.reduce((s,m)=>s+m.solde,0)/trois.length : 0;
  const ratioCategorie = valides.length ? sansCategorie/valides.length : 0;
  let score = 50;
  if (epargneMoyenne > 0) score += 25; else if (epargneMoyenne < 0) score -= 20;
  if (ratioCategorie < 0.10) score += 15; else if (ratioCategorie > 0.30) score -= 15;
  if (evolution.length >= 3) score += 10;
  score = Math.max(0,Math.min(100,Math.round(score)));
  const santeLibelle = score >= 75 ? 'Bonne' : score >= 55 ? 'À surveiller' : 'Fragile';

  const parametres = Object.fromEntries(lireTable_('Parametres').map(p=>[String(p.cle),p.valeur]));
  const datesReleves = Object.keys(parametres).filter(k=>k.indexOf('date_solde_releve_')===0).map(k=>new Date(parametres[k])).filter(d=>!isNaN(d));
  const dernierReleve = datesReleves.length ? datesReleves.sort((a,b)=>b-a)[0] : null;

  // Référence du cycle courant = dernière donnée réellement importée.
  const derniereOperation = valides.length ? valides.slice().sort((a,b)=>b.date-a.date)[0].date : null;
  let referenceCourante = null;
  if (dernierReleve && derniereOperation) referenceCourante = dernierReleve > derniereOperation ? dernierReleve : derniereOperation;
  else referenceCourante = dernierReleve || derniereOperation || maintenant;
  referenceCourante = new Date(referenceCourante.getFullYear(), referenceCourante.getMonth(), referenceCourante.getDate(), 12, 0, 0, 0);

  let salaire = null;
  try { salaire = detecterSalairePrincipal_(operations, 12); } catch (e) {}
  const jourRef = Math.max(1, Math.min(28, Number(salaire && salaire.jourMoyen) || Number(parametres.jour_debut_mois) || 28));
  const debutCourant = referenceCourante.getDate() >= jourRef
    ? new Date(referenceCourante.getFullYear(), referenceCourante.getMonth(), jourRef, 12, 0, 0, 0)
    : new Date(referenceCourante.getFullYear(), referenceCourante.getMonth()-1, jourRef, 12, 0, 0, 0);
  const finCourant = new Date(debutCourant.getFullYear(), debutCourant.getMonth()+1, jourRef, 12, 0, 0, 0);
  finCourant.setDate(finCourant.getDate()-1);

  const opsCourantes = valides.filter(o => o.date >= debutCourant && o.date <= referenceCourante);
  const revenusCourants = opsCourantes.filter(o=>o.type==='revenu').reduce((s,o)=>s+o.montant,0);
  const depensesCourantes = opsCourantes.filter(o=>o.type==='depense').reduce((s,o)=>s+o.montant,0);
  const dureeCourante = Math.round((finCourant-debutCourant)/86400000)+1;
  const jourCourant = Math.max(1,Math.min(dureeCourante,Math.round((referenceCourante-debutCourant)/86400000)+1));
  const moisNom = new Date(debutCourant.getFullYear(),debutCourant.getMonth()+1,1);
  const libelleCourant = moisNom.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
  const couvertureCourante = !!(dernierReleve && dernierReleve >= finCourant);

  const alertes = [];
  if (sansCategorie > 0) alertes.push({niveau:'attention',message:sansCategorie+' opération(s) restent sans catégorie.'});
  if (dernierReleve) {
    const jours = Math.floor((maintenant-dernierReleve)/86400000);
    if (jours > 45) alertes.push({niveau:'attention',message:'Dernier relevé bancaire importé il y a '+jours+' jours ('+Utilities.formatDate(dernierReleve,Session.getScriptTimeZone(),'dd/MM/yyyy')+').'});
  } else alertes.push({niveau:'attention',message:'Aucun relevé bancaire de clôture n’est mémorisé.'});
  if (dernierMois && dernierMois.solde < 0) alertes.push({niveau:'attention',message:'Le dernier mois importé présente un solde de mouvements négatif de '+Math.abs(dernierMois.solde).toFixed(2).replace('.',',')+' €.'});
  if (!alertes.length) alertes.push({niveau:'ok',message:'Aucune alerte importante détectée dans les données importées.'});

  return {
    compteurs:{operations:valides.length,sansCategorie},
    evolution,
    recents,
    sante:{score,label:santeLibelle,epargneMoyenne:arrondirCycle_(epargneMoyenne),ratioCategorie:Math.round(ratioCategorie*100)},
    alertes,
    dernierReleve:dernierReleve?dernierReleve.toISOString():null,
    cycleCourant:{
      libelle:libelleCourant,
      debut:debutCourant.toISOString(),
      fin:finCourant.toISOString(),
      dateReference:referenceCourante.toISOString(),
      jour:jourCourant,
      duree:dureeCourante,
      revenus:arrondirCycle_(revenusCourants),
      depenses:arrondirCycle_(depensesCourantes),
      epargne:arrondirCycle_(revenusCourants-depensesCourants),
      operations:opsCourantes.length,
      couvertParReleve:couvertureCourante,
      dateDernierReleve:dernierReleve?dernierReleve.toISOString():null
    }
  };
}
