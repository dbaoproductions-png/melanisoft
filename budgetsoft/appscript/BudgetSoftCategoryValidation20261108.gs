/**
 * Catégorisation ciblée des mouvements explicitement validés par l'utilisateur.
 *
 * Règles génériques par libellé commercial, sans UUID ni montant personnel
 * codé dans GitHub. Audit préalable, vérification des comptes, date, montant,
 * catégorie et empreinte avant écriture. Copie intégrale des deux feuilles.
 * Aucun mouvement bancaire ajouté, supprimé ou altéré financièrement.
 *
 * Le classement du Hoppy Monkey Club en Restaurants est une PROPOSITION :
 * l'utilisateur doit la confirmer dans la boîte de dialogue avant application.
 */
const BUDGETSOFT_CATEGORY_VALIDATION_VERSION_20261108='2026-11-08.1';
const BUDGETSOFT_CATEGORY_BACKUP_OPS_20261108='Backup_Operations_Categories_20261108';
const BUDGETSOFT_CATEGORY_BACKUP_PLUXEE_20261108='Backup_Pluxee_Categories_20261108';

function normaliserLibelleCategorie20261108_(v){
  return String(v==null?'':v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function reglesBanqueCategorie20261108_(){
  return [
    {cle:'norauto',motif:/\bnorauto\b/,categorie:'Voitures',nombre:1},
    {cle:'moulin_de_laure',motif:/\bmoulin de laure\b/,categorie:'Loisirs',nombre:1},
    {cle:'moulin_de_la',motif:/\bmoulin de la\b/,categorie:'Restaurants',nombre:1},
    {cle:'savilao',motif:/\bsavilao\b/,categorie:'Courses',nombre:2},
    {cle:'couteaux_fourch',motif:/\bcouteaux fourch\b/,categorie:'Restaurants',nombre:2},
    {cle:'blablacar',motif:/\bblablacar\b/,categorie:'Transports',nombre:1},
    {cle:'grand_kaf',motif:/\bgrand kaf\b/,categorie:'Restaurants',nombre:1},
    {cle:'maison_carlier',motif:/\bmaison carlier\b/,categorie:'Courses',nombre:2},
    {cle:'le_comptoir_ax',motif:/\ble comptoir ax\b/,categorie:'Restaurants',nombre:1},
    {cle:'proxy_ax',motif:/\bproxy 09110 ax\b/,categorie:'Courses',nombre:1},
    {cle:'sumup_grains',motif:/\bsumup grains\b/,categorie:'Courses',nombre:1},
    {cle:'paypal_maison',motif:/\bpaypal maison\b/,categorie:'Dépenses diverses',nombre:1},
    {cle:'societe_les_3f',motif:/\bsociete les 3 f\b/,categorie:'Courses',nombre:1},
    {cle:'qi9ywq35azt7',motif:/\bqi9ywq35azt7\b/,categorie:'Courses',nombre:1},
    {cle:'paypal_les_jar',motif:/\bpaypal les jar\b/,categorie:'Courses',nombre:1}
  ];
}

function reglesPluxeeCategorie20261108_(){
  return [
    {cle:'8_a_huit',motif:/\b8 a huit\b/,categorie:'Courses',nombre:7},
    {cle:'maison_chadli',motif:/\bmaison chadli\b/,categorie:'Courses',nombre:1},
    {cle:'autre_boulangerie',motif:/\bl autre boulangerie\b/,categorie:'Courses',nombre:5},
    {cle:'picard',motif:/\bpicard surgeles\b/,categorie:'Courses',nombre:1},
    {cle:'hoppy_monkey',motif:/\bhoppy monkey club\b/,categorie:'Restaurants',nombre:1}
  ];
}

function preparerFeuilleCategorie20261108_(ss,nom,colonnes){
  const f=ss.getSheetByName(nom);
  if(!f||f.getLastRow()<2)throw new Error('Feuille source '+nom+' absente ou vide.');
  const entetes=f.getRange(1,1,1,f.getLastColumn()).getValues()[0]
    .map(x=>String(x||'').trim());
  const col={};
  colonnes.forEach(n=>{
    const i=entetes.indexOf(n);
    if(i<0)throw new Error('Colonne '+nom+'.'+n+' absente.');
    col[n]=i;
  });
  const valeurs=f.getRange(2,1,f.getLastRow()-1,f.getLastColumn()).getValues();
  return{f,nom,col,valeurs};
}

function construireProjetCategoriesBudgetSoft20261108_(){
  verifierInitialisation_();
  const ss=SpreadsheetApp.getActiveSpreadsheet(),erreurs=[];
  const op=preparerFeuilleCategorie20261108_(ss,'Operations',
    ['id','montant','categorie','date','libelle_bancaire']);
  const pl=preparerFeuilleCategorie20261108_(ss,'Pluxee',
    ['id','montant','categorie','date','libelle','statut']);
  const banques=reglesBanqueCategorie20261108_(),pluxees=reglesPluxeeCategorie20261108_();
  const categories=lireTable_('Categories')||[];
  const actives=new Map(categories.filter(c=>{
    const statut=String(c.actif==null?'':c.actif).trim().toLowerCase();
    return !['false','0','non','inactif','inactive'].includes(statut);
  }).map(c=>[String(c.nom||'').trim(),String(c.type||'').trim().toLowerCase()]));
  [...banques,...pluxees].forEach(r=>{
    const t=actives.get(r.categorie);
    if(t!=='depense')erreurs.push('Catégorie inactive/absente ou non dépense : '+r.categorie);
  });
  const projets={banque:[],pluxee:[]};
  const normaliserDate=x=>x instanceof Date?x.toISOString():String(x||'');
  const expliciter=(ligne,idx,f,regles,libelle)=>{
    const id=String(ligne[f.col.id]||'').trim(),montant=Number(ligne[f.col.montant]);
    const nomNormalise=normaliserLibelleCategorie20261108_(libelle);
    const correspondances=regles.filter(r=>r.motif.test(nomNormalise));
    if(correspondances.length!==1)
      erreurs.push(f.nom+' ligne '+(idx+2)+' : '+correspondances.length+' règle(s) pour le commerçant.');
    if(!id||!Number.isFinite(montant)||montant>=0||correspondances.length!==1)return null;
    const choisi=correspondances[0];
    return{feuille:f.nom,ligne:idx+2,id,libelle:String(libelle||'').slice(0,180),
      date:normaliserDate(ligne[f.col.date]),montant:Math.round(montant*100)/100,
      ancienneCategorie:String(ligne[f.col.categorie]||'').trim(),
      categorie:choisi.categorie,regle:choisi.cle};
  };

  // Toute opération bancaire non nulle et sans catégorie doit être validée par
  // une règle unique. Le nombre et la répartition attendue empêchent les
  // catégorisations excessives de nouvelles lignes lors d'une réimportation.
  op.valeurs.forEach((l,i)=>{
    const categorie=String(l[op.col.categorie]||'').trim();
    const m=Number(l[op.col.montant]||0);
    if(!m||categorie)return;
    const libelle=String(l[op.col.libelle_bancaire]||l[op.col.libelle]||'');
    const cible=expliciter(l,i,op,banques,libelle);
    if(cible)projets.banque.push(cible);
  });

  pl.valeurs.forEach((l,i)=>{
    const m=Number(l[pl.col.montant]||0),statut=String(l[pl.col.statut]||'valide').trim().toLowerCase();
    const categorie=String(l[pl.col.categorie]||'').trim();
    if(m>=0||statut==='refuse'||['Courses','Restaurants'].includes(categorie))return;
    const cible=expliciter(l,i,pl,pluxees,l[pl.col.libelle]);
    if(cible)projets.pluxee.push(cible);
  });

  const distrib=(items,rs,nom)=>{
    rs.forEach(r=>{
      const trouve=items.filter(x=>x.regle===r.cle).length;
      if(trouve!==r.nombre)erreurs.push(nom+' : '+r.cle+' = '+trouve+' occurrence(s), '+r.nombre+' attendue(s).');
    });
  };
  distrib(projets.banque,banques,'Operations');
  distrib(projets.pluxee,pluxees,'Pluxee');
  if(projets.banque.length!==18)erreurs.push('Operations : 18 opérations attendues, '+projets.banque.length+' trouvées.');
  if(projets.pluxee.length!==15)erreurs.push('Pluxee : 15 dépenses attendues, '+projets.pluxee.length+' trouvées.');
  for(const [nom,items] of Object.entries(projets)){
    if(new Set(items.map(x=>x.id)).size!==items.length)
      erreurs.push(nom+' : identifiants d’opérations dupliqués.');
    if(new Set(items.map(x=>x.ligne)).size!==items.length)
      erreurs.push(nom+' : lignes d’opérations dupliquées.');
  }
  const sauvegardesExistantes=[
    BUDGETSOFT_CATEGORY_BACKUP_OPS_20261108,BUDGETSOFT_CATEGORY_BACKUP_PLUXEE_20261108
  ].filter(n=>!!ss.getSheetByName(n));
  if(sauvegardesExistantes.length)
    erreurs.push('Sauvegardes de cette correction déjà présentes : '+sauvegardesExistantes.join(', ')+'. Ne pas réappliquer.');

  const empreinteMatiere=[
    BUDGETSOFT_CATEGORY_VALIDATION_VERSION_20261108,
    projets.banque.map(x=>[x.feuille,x.ligne,x.id,x.libelle,x.date,x.montant,x.ancienneCategorie,x.categorie]),
    projets.pluxee.map(x=>[x.feuille,x.ligne,x.id,x.libelle,x.date,x.montant,x.ancienneCategorie,x.categorie])
  ];
  const empreinte=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(empreinteMatiere))
    .map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');
  const res={
    ok:erreurs.length===0,lectureSeule:true,version:BUDGETSOFT_CATEGORY_VALIDATION_VERSION_20261108,
    nombreBanque:projets.banque.length,nombrePluxee:projets.pluxee.length,
    montantBanque:Math.round(projets.banque.reduce((s,x)=>s+Math.abs(x.montant),0)*100)/100,
    montantPluxee:Math.round(projets.pluxee.reduce((s,x)=>s+Math.abs(x.montant),0)*100)/100,
    banque:projets.banque,pluxee:projets.pluxee,empreinte:erreurs.length?'':empreinte,
    erreurs,attention:'Catégorisation seulement ; les montants, dates et comptes ne seront pas modifiés.'
  };
  return res;
}

function auditerCategoriesValideesBudgetSoft20261108(){
  const p=construireProjetCategoriesBudgetSoft20261108_();
  const out={...p,lectureSeule:true};
  console.log('[AUDIT PREPARATION CATEGORISATION 33 BUDGETSOFT] '+JSON.stringify(out));
  return out;
}

/**
 * Appliquer uniquement après audit explicite et confirmation en interface.
 * Refuse une autre sélection, un import intervenu entre temps et un second essai.
 */
function appliquerCategoriesValideesBudgetSoft20261108(empreintePrevue){
  if(!/^[a-f0-9]{64}$/.test(String(empreintePrevue||'')))
    throw new Error('Empreinte de validation absente. Lancez d’abord la simulation et confirmez les lignes.');
  const lock=LockService.getDocumentLock()||LockService.getScriptLock();
  lock.waitLock(30000);
  let out=null;
  try{
    const audit=construireProjetCategoriesBudgetSoft20261108_();
    if(!audit.ok)throw new Error('Audit de préparation non conforme : '+audit.erreurs.join(' | '));
    if(audit.empreinte!==String(empreintePrevue))
      throw new Error('Opérations modifiées depuis la validation : relancer l’audit.');
    const ss=SpreadsheetApp.getActiveSpreadsheet(),ops=ss.getSheetByName('Operations'),pl=ss.getSheetByName('Pluxee');
    const cataloguer=(f)=>{
      const hdr=f.getRange(1,1,1,f.getLastColumn()).getValues()[0].map(String);
      const cat=hdr.indexOf('categorie')+1,id=hdr.indexOf('id')+1;
      if(!cat||!id)throw new Error('Colonnes catégories/identifiants indisponibles.');
      return{f,cat,id};
    };
    const op=cataloguer(ops),p=cataloguer(pl);
    // Sauvegarder intégralement les deux registres AVANT la première modification.
    const copieOps=ops.copyTo(ss);
    copieOps.setName(BUDGETSOFT_CATEGORY_BACKUP_OPS_20261108);
    copieOps.hideSheet();
    const copiePl=pl.copyTo(ss);
    copiePl.setName(BUDGETSOFT_CATEGORY_BACKUP_PLUXEE_20261108);
    copiePl.hideSheet();
    // En cas d'interruption au milieu des 33 écritures, les vues doivent
    // refuser de traiter l'ancien snapshot comme frais.
    if(typeof marquerSnapshotGlobalBudgetSoftObsolete20260916_==='function')
      marquerSnapshotGlobalBudgetSoftObsolete20260916_('categorisation_confirmee_20261108');
    let banque=0,pluxee=0;
    audit.banque.forEach(x=>{op.f.getRange(x.ligne,op.cat).setValue(x.categorie);banque++;});
    audit.pluxee.forEach(x=>{p.f.getRange(x.ligne,p.cat).setValue(x.categorie);pluxee++;});
    SpreadsheetApp.flush();
    out={ok:true,applique:true,nombreBanque:banque,nombrePluxee:pluxee,
      sauvegardeBanque:BUDGETSOFT_CATEGORY_BACKUP_OPS_20261108,
      sauvegardePluxee:BUDGETSOFT_CATEGORY_BACKUP_PLUXEE_20261108,
      montantBanque:audit.montantBanque,montantPluxee:audit.montantPluxee,
      note:'Aucun montant, date, crédit ou opération bancaire ajouté/supprimé. Sauvegardes masquées avant modification.'};
  }finally{lock.releaseLock();}
  if(out&&out.applique){
    if(typeof reconstruireSnapshotGlobalSyntheseBudgetSoft20260907==='function'){
      try{const r=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('categories_banque_pluxee_confirmees_20261108');
        out.snapshot={ok:!!(r&&r.ok),revisionBudgetSoft:r&&r.revisionBudgetSoft||'',erreur:r&&r.erreur||''};
      }catch(e){out.snapshot={ok:false,erreur:String(e&&e.message||e)};}
    }
  }
  console.log('[APPLICATION CATEGORIES BANQUE PLUXEE 20261108] '+JSON.stringify(out));
  return out;
}
