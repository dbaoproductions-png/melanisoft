const CLOTURE_CF_DECIDEES_20260826_VERSION='1.0.0';

/**
 * Migration contrôlée des décisions métier du 26/08/2026.
 * - Carrefour Banque 168,00 EUR exactement = CF crédit revolving.
 * - Carrefour Banque hors 168,00 EUR = PAS CF (usage carte, traité Courses).
 * - Avanssur = CF Assurance : trois contrats distincts, désambiguïsés par leur montant courant.
 * - Google 2,99 EUR = PAS CF.
 * - Amazon Digital 3,99 EUR = PAS CF.
 *
 * La fonction est idempotente : elle réutilise les CF qu'elle a déjà créées.
 * Elle ne change ni catégorie ni montant des Operations ; elle ne fait que créer
 * les référentiels CF manquants et poser charge_fixe_id sur les opérations certaines.
 */
function appliquerClotureCfDecidees20260826(){
  verifierInitialisation_();
  const ops=lireTable_('Operations');
  const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const txt=o=>norm([o&&o.libelle_bancaire,o&&o.libelle,o&&o.marchand_normalise].filter(Boolean).join(' '));
  const abs=o=>Math.round(Math.abs(Number(o&&o.montant||0))*100)/100;
  const dateIso=o=>String(o&&o.date_comptable||o&&o.date||'').slice(0,10);
  const estDep=o=>String(o&&o.type||'depense').toLowerCase()==='depense'&&Number(o&&o.montant||0)<0;
  const marque='[DOCTRINE_CF_20260826]';

  function trouverOuCreer_(spec,opRef){
    let charges=lireTable_('Charges_fixes');
    let cf=charges.find(c=>String(c&&c.commentaire||'').includes(spec.cle));
    if(cf)return cf;
    if(!opRef)throw new Error('Operation de reference introuvable pour '+spec.cle);
    cf=enregistrerLigne('Charges_fixes',{
      libelle:spec.libelle,
      categorie:spec.categorie,
      compte:String(opRef.compte||''),
      montant:spec.montant,
      type:'depense',
      jour_execution:spec.jour,
      date_debut:spec.dateDebut,
      actif:true,
      commentaire:marque+' '+spec.cle+' — '+spec.doctrine,
      frequence:'Mensuelle',
      libelle_bancaire:String(opRef.libelle_bancaire||opRef.libelle||''),
      tolerance:spec.tolerance,
      nature:spec.nature
    });
    return cf;
  }

  const carrefour=ops.filter(o=>estDep(o)&&/carrefour banque/.test(txt(o))&&Math.abs(abs(o)-168)<.011).sort((a,b)=>dateIso(a).localeCompare(dateIso(b)));
  const cfCarrefour=trouverOuCreer_({cle:'CARREFOUR_PASS_168',libelle:'Carrefour PASS — renouvelable',categorie:'Crédits revolving',montant:168,jour:5,dateDebut:'2025-01-05',tolerance:.02,nature:'Crédit',doctrine:'168 EUR exactement = mensualité CF ; tout autre montant Carrefour Banque reste hors CF et relève de Courses.'},carrefour[carrefour.length-1]);

  const avanssur=ops.filter(o=>estDep(o)&&/avanssur/.test(txt(o))).sort((a,b)=>dateIso(a).localeCompare(dateIso(b)));
  const specs=[
    {cle:'AVANSSUR_A',montant:12.90,jour:29,dateDebut:'2025-09-30'},
    {cle:'AVANSSUR_B',montant:20.84,jour:29,dateDebut:'2025-07-30'},
    {cle:'AVANSSUR_C',montant:21.90,jour:29,dateDebut:'2025-08-28'}
  ];
  const cfsAvanssur=specs.map(s=>{
    const ref=avanssur.slice().sort((a,b)=>Math.abs(abs(a)-s.montant)-Math.abs(abs(b)-s.montant))[0];
    return trouverOuCreer_({cle:s.cle,libelle:'Avanssur — Assurance '+s.cle.slice(-1),categorie:'Assurances',montant:s.montant,jour:s.jour,dateDebut:s.dateDebut,tolerance:.60,nature:'Assurance',doctrine:'contrat Avanssur mensuel ; montant réel ajuste par rapprochement.'},ref);
  });

  // Liens certains seulement. Aucun reclassement Operations.
  let liens=0;
  carrefour.forEach(o=>{if(String(o.charge_fixe_id||'')!==String(cfCarrefour.id)){lierOperationChargeFixe_(o.id,cfCarrefour.id);liens++;}});
  avanssur.forEach(o=>{
    const m=abs(o);
    // Historique en trois séries : on choisit la série la plus proche, à condition
    // qu'elle soit nettement identifiable. Le remboursement Avanssur positif est exclu.
    const distances=specs.map((s,i)=>({i,d:Math.abs(m-s.montant)})).sort((a,b)=>a.d-b.d);
    if(!distances.length||distances[0].d>1.10)return;
    const cf=cfsAvanssur[distances[0].i];
    if(String(o.charge_fixe_id||'')!==String(cf.id)){lierOperationChargeFixe_(o.id,cf.id);liens++;}
  });

  const res={ok:true,version:CLOTURE_CF_DECIDEES_20260826_VERSION,chargesFixes:{carrefour:cfCarrefour.id,avanssur:cfsAvanssur.map(c=>c.id)},operationsLiees:liens,doctrine:{google299:'NON_CF',amazonDigital399:'NON_CF',carrefourHors168:'COURSES_NON_CF'}};
  Logger.log('=== CLOTURE CF DECIDEES 2026-08-26 ===');
  Logger.log('Carrefour PASS 168 : CF '+cfCarrefour.id);
  Logger.log('Avanssur : '+cfsAvanssur.length+' CF distinctes');
  Logger.log('Operations liees / corrigees : '+liens);
  Logger.log('Google 2,99 : NON CF | Amazon Digital 3,99 : NON CF');
  Logger.log('=== FIN CLOTURE CF ===');
  return res;
}
