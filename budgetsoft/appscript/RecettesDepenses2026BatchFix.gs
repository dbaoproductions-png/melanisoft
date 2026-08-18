function assurerTableReglesCategories2026_v3_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const entetes = ['id','motif','categorie','type','actif','cree_le','modifie_le'];
  TABLES.Regles_categories = entetes;
  let feuille = ss.getSheetByName('Regles_categories');
  if (!feuille) feuille = ss.insertSheet('Regles_categories');
  if (feuille.getLastRow() === 0) {
    feuille.getRange(1,1,1,entetes.length).setValues([entetes]);
  } else {
    const largeur = Math.max(feuille.getLastColumn(),1);
    const presentes = feuille.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim());
    const manquantes = entetes.filter(e=>!presentes.includes(e));
    if (manquantes.length) feuille.getRange(1,largeur+1,1,manquantes.length).setValues([manquantes]);
  }
  feuille.setFrozenRows(1);
  return feuille;
}

function ecrireParametresRecettesDepenses2026_v3_() {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Parametres');
  if (!feuille) throw new Error('Onglet Parametres introuvable.');
  const voulus = {
    modele_recettes_depenses_version: '2026-08-18.3',
    loyer_reference_mensuel: 750,
    loyer_reference_depuis: '2026-08-13',
    garage_reference_mensuel: 30,
    salaire_mois_primes: '6,11,12',
    salaire_remboursement_pro_2026_07: 153.49,
    pluxee_montant_mensuel: 154,
    pluxee_mois_carence: 5,
    pluxee_depenses_observees_5m: 655.43,
    pluxee_courses_observees_5m: 449.38,
    pluxee_restaurants_observees_5m: 206.05,
    pluxee_depenses_observees_3m: 315.17,
    pluxee_depenses_estimees_12m: 1573.03
  };
  const existants = feuille.getLastRow()>1 ? feuille.getRange(2,1,feuille.getLastRow()-1,2).getValues() : [];
  const map = new Map();
  existants.forEach(r=>{ const k=String(r[0]||'').trim(); if(k) map.set(k,r[1]); });
  Object.keys(voulus).forEach(k=>map.set(k,voulus[k]));
  const lignes = Array.from(map.entries()).map(([k,v])=>[k,v]);
  if (feuille.getLastRow()>1) feuille.getRange(2,1,feuille.getLastRow()-1,2).clearContent();
  if (lignes.length) feuille.getRange(2,1,lignes.length,2).setValues(lignes);
  return Object.keys(voulus).length;
}

function ecrireReglesRecettesDepenses2026_v3_() {
  const feuille = assurerTableReglesCategories2026_v3_();
  const entetes = TABLES.Regles_categories;
  const maintenant = new Date();
  const reglesVoulues = [
    ['sodex','Restaurants','depense'], ['nyx','Restaurants','depense'],
    ['billetweb','Loisirs','depense'], ['weezevent','Loisirs','depense'], ['pathe','Loisirs','depense'],
    ['intersport','Loisirs','depense'], ['jonak','Achats personnels','depense'],
    ['zettle les jar','Restaurants','depense'], ['les jardins de','Restaurants','depense'],
    ['spirale castanet','Courses','depense'], ['sumup atelier','Courses','depense'],
    ['mairie de toulouse','Salaires','revenu'], ['conges spectacles','Congés spectacles','revenu'],
    ['spedidam','Droits artistiques','revenu'], ['casc svp','Avantages employeur','revenu'],
    ['c.p.a.m','Remboursements santé','revenu'], ['cpam','Remboursements santé','revenu']
  ];
  const existants = feuille.getLastRow()>1 ? feuille.getRange(2,1,feuille.getLastRow()-1,entetes.length).getValues() : [];
  const map = new Map();
  existants.forEach(r=>{
    const o = Object.fromEntries(entetes.map((k,i)=>[k,r[i]]));
    const cle = String(o.motif||'').trim().toLowerCase()+'|'+String(o.type||'').trim().toLowerCase();
    if (String(o.motif||'').trim()) map.set(cle,o);
  });
  reglesVoulues.forEach(([motif,categorie,type])=>{
    const cle = motif.toLowerCase()+'|'+type.toLowerCase();
    const ancien = map.get(cle) || {};
    map.set(cle, {
      id: ancien.id || Utilities.getUuid(), motif, categorie, type, actif: true,
      cree_le: ancien.cree_le || maintenant, modifie_le: maintenant
    });
  });
  const lignes = Array.from(map.values()).map(o=>entetes.map(k=>o[k] == null ? '' : o[k]));
  if (feuille.getLastRow()>1) feuille.getRange(2,1,feuille.getLastRow()-1,entetes.length).clearContent();
  if (lignes.length) feuille.getRange(2,1,lignes.length,entetes.length).setValues(lignes);
  return reglesVoulues.length;
}

function corrigerOperationsRecettesDepenses2026_v3_() {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');
  if (!feuille || feuille.getLastRow()<2) return {modifiees:0,detail:{}};
  const entetes = TABLES.Operations;
  const nb = feuille.getLastRow()-1;
  const valeurs = feuille.getRange(2,1,nb,entetes.length).getValues();
  const iCategorie = entetes.indexOf('categorie');
  let modifiees = 0;
  const detail = {};
  const categories = [];
  valeurs.forEach((ligne,idx)=>{
    const o = Object.fromEntries(entetes.map((k,i)=>[k,ligne[i]]));
    const cible = cibleCorrectionMetier2026_(o);
    const actuelle = String(o.categorie||'').trim();
    let finale = actuelle;
    if (cible && cible !== actuelle) {
      finale = cible;
      modifiees++;
      detail[cible] = (detail[cible]||0)+1;
    }
    categories.push([finale]);
  });
  if (iCategorie < 0) throw new Error('Colonne categorie introuvable dans Operations.');
  feuille.getRange(2,iCategorie+1,nb,1).setValues(categories);
  return {modifiees,detail};
}

function appliquerCorrectifsRecettesDepenses18082026_v3() {
  verifierInitialisation_();
  assurerTableReglesCategories2026_v3_();
  assurerCategorieMetier2026_('Restaurants','depense');
  assurerCategorieMetier2026_('Droits artistiques','revenu');
  assurerCategorieMetier2026_('Avantages employeur','revenu');
  const parametres = ecrireParametresRecettesDepenses2026_v3_();
  const regles = ecrireReglesRecettesDepenses2026_v3_();
  const correction = corrigerOperationsRecettesDepenses2026_v3_();
  desactiverCategorieMetier2026_('Restaurants / sorties');
  return {
    version:'2026-08-18.3',
    parametresEcrits:parametres,
    reglesEcrites:regles,
    operationsModifiees:correction.modifiees,
    detail:correction.detail,
    auditTypes: typeof auditTypesOperationsBudgetSoft2026 === 'function' ? auditTypesOperationsBudgetSoft2026() : null
  };
}
