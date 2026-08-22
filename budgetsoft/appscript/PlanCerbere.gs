const PLAN_CERBERE_VERSION = '2.0.1';

/**
 * Couche PLAN de BudgetSoft.
 * Objectifs = stratégie ; Actions = exécution ; Evénements = faits futurs connus.
 * Cette couche n'écrit jamais dans Operations, Charges_fixes ou Credits.
 * Elle possède volontairement son propre stockage, indépendant de TABLES.
 */
function chargerPlanCerbere() {
  assurerTablesPlanCerbere_();
  return serialiserCerberePourClient_({
    version: PLAN_CERBERE_VERSION,
    objectifs: lireTablePlanCerbere_('Plan_Objectifs'),
    actions: lireTablePlanCerbere_('Plan_Actions'),
    evenements: lireTablePlanCerbere_('Plan_Evenements')
  });
}

function enregistrerObjectifPlan(d) {
  assurerTablesPlanCerbere_();
  d = Object.assign({}, d || {});
  d.nom = String(d.nom || '').trim();
  if (!d.nom) throw new Error('Le nom de l’objectif est obligatoire.');
  d.type = String(d.type || 'orientation');
  d.horizon = String(d.horizon || 'court');
  d.priorite = String(d.priorite || 'normale');
  d.date_cible = normaliserDatePlan_(d.date_cible);
  d.montant_cible = Math.max(0, convertirNombre_(d.montant_cible || 0));
  d.statut = String(d.statut || 'Actif');
  d.commentaire = String(d.commentaire || '');
  upsertPlanCerbere_('Plan_Objectifs', d);
  return chargerPlanCerbere();
}

function enregistrerActionPlan(d) {
  assurerTablesPlanCerbere_();
  d = Object.assign({}, d || {});
  d.libelle = String(d.libelle || '').trim();
  if (!d.libelle) throw new Error('Le libellé de l’action est obligatoire.');
  d.objectif_id = String(d.objectif_id || '');
  d.type = String(d.type || 'autre');
  d.date_prevue = normaliserDatePlan_(d.date_prevue);
  d.date_effet = normaliserDatePlan_(d.date_effet || d.date_prevue);
  d.impact_type = String(d.impact_type || 'aucun');
  d.impact_montant = convertirNombre_(d.impact_montant || 0);
  d.impact_frequence = String(d.impact_frequence || 'ponctuel');
  d.cible = String(d.cible || '');
  d.statut = String(d.statut || 'Prévue');
  d.certitude = String(d.certitude || 'certaine');
  d.commentaire = String(d.commentaire || '');
  upsertPlanCerbere_('Plan_Actions', d);
  return chargerPlanCerbere();
}

function enregistrerEvenementPlan(d) {
  assurerTablesPlanCerbere_();
  d = Object.assign({}, d || {});
  d.libelle = String(d.libelle || '').trim();
  if (!d.libelle) throw new Error('Le libellé de l’événement est obligatoire.');
  d.type = String(d.type || 'recette');
  d.montant = Math.abs(convertirNombre_(d.montant || 0));
  if (!d.montant) throw new Error('Le montant doit être supérieur à zéro.');
  d.date_prevue = normaliserDatePlan_(d.date_prevue);
  d.date_effet = normaliserDatePlan_(d.date_effet || d.date_prevue);
  d.certitude = String(d.certitude || 'certaine');
  d.affectation = String(d.affectation || '');
  d.statut = String(d.statut || 'Prévu');
  d.operation_reelle_id = String(d.operation_reelle_id || '');
  d.commentaire = String(d.commentaire || '');
  upsertPlanCerbere_('Plan_Evenements', d);
  return chargerPlanCerbere();
}

function supprimerElementPlan(type, id) {
  assurerTablesPlanCerbere_();
  const map = {objectif:'Plan_Objectifs', action:'Plan_Actions', evenement:'Plan_Evenements'};
  const table = map[String(type || '').toLowerCase()];
  if (!table || !id) throw new Error('Élément du plan introuvable.');
  supprimerLignePlanCerbere_(table, id);
  return chargerPlanCerbere();
}

/** Projection pure : effets du Plan sur une période, sans aucune écriture. */
function projeterPlanCerbere(debut, fin) {
  assurerTablesPlanCerbere_();
  const d0 = debutJour_(new Date(debut));
  const d1 = debutJour_(new Date(fin));
  const objectifs = lireTablePlanCerbere_('Plan_Objectifs').filter(x => String(x.statut) !== 'Terminé' && String(x.statut) !== 'Abandonné');
  const actions = lireTablePlanCerbere_('Plan_Actions').filter(x => actionActiveSurPeriode_(x, d0, d1));
  const evenements = lireTablePlanCerbere_('Plan_Evenements').filter(x => evenementActifSurPeriode_(x, d0, d1));
  let ressources = 0, depenses = 0, chargesEvitees = 0, reserveObjectifs = 0;
  evenements.forEach(e => {
    const m = Math.abs(Number(e.montant || 0));
    if (e.type === 'depense') depenses += m;
    else if (e.type === 'charge_supprimee_temporairement' || e.type === 'charge_deplacee') chargesEvitees += m;
    else if (e.type === 'argent_reserve') reserveObjectifs += m;
    else ressources += m;
  });
  let correctionCharges = 0;
  actions.forEach(a => {
    const m = Number(a.impact_montant || 0);
    if (a.impact_type === 'baisse_charge') correctionCharges -= Math.abs(m);
    if (a.impact_type === 'hausse_charge') correctionCharges += Math.abs(m);
    if (a.impact_type === 'reservation_objectif') reserveObjectifs += Math.abs(m);
  });
  return {debut:d0, fin:d1, objectifs, actions, evenements, effets:{ressources, depenses, chargesEvitees, correctionCharges, reserveObjectifs}};
}

function actionActiveSurPeriode_(a, d0, d1) {
  if (['Annulée','Abandonnée'].indexOf(String(a.statut)) >= 0) return false;
  const effet = a.date_effet ? debutJour_(new Date(a.date_effet)) : null;
  if (!effet || isNaN(effet.getTime())) return false;
  if (String(a.impact_frequence) === 'ponctuel') return effet >= d0 && effet <= d1;
  return effet <= d1;
}
function evenementActifSurPeriode_(e, d0, d1) {
  if (['Réalisé','Annulé','Rapproché'].indexOf(String(e.statut)) >= 0) return false;
  const effet = e.date_effet ? debutJour_(new Date(e.date_effet)) : null;
  return !!effet && !isNaN(effet.getTime()) && effet >= d0 && effet <= d1;
}
function normaliserDatePlan_(v) {
  if (!v) return '';
  const d = dateLocaleBudgetSoft_(v);
  if (isNaN(d.getTime())) throw new Error('Date invalide.');
  return d;
}

function schemasPlanCerbere_() {
  return {
    Plan_Objectifs:['id','nom','type','horizon','priorite','date_cible','montant_cible','statut','commentaire','cree_le','modifie_le'],
    Plan_Actions:['id','objectif_id','libelle','type','date_prevue','date_effet','impact_type','impact_montant','impact_frequence','cible','statut','certitude','commentaire','cree_le','modifie_le'],
    Plan_Evenements:['id','libelle','type','montant','date_prevue','date_effet','certitude','affectation','statut','operation_reelle_id','commentaire','cree_le','modifie_le'],
    Cerbere_Budget_Canonique:['categorie','montant','nature','priorite','actif']
  };
}
function lireTablePlanCerbere_(nom) {
  const schema=schemasPlanCerbere_()[nom];
  if(!schema) throw new Error('Table Plan inconnue : '+nom);
  const sh=SpreadsheetApp.getActive().getSheetByName(nom);
  if(!sh||sh.getLastRow()<2)return[];
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim());
  const vals=sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues();
  return vals.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,serialiserValeur_(r[i])])));
}
function upsertPlanCerbere_(nom, d) {
  const schema=schemasPlanCerbere_()[nom];
  if(!schema)throw new Error('Table Plan inconnue : '+nom);
  const sh=SpreadsheetApp.getActive().getSheetByName(nom);
  const now=new Date().toISOString(); const copie=Object.assign({},d);
  if(schema.includes('id')&&!copie.id)copie.id=Utilities.getUuid();
  if(schema.includes('cree_le')&&!copie.cree_le)copie.cree_le=now;
  if(schema.includes('modifie_le'))copie.modifie_le=now;
  let row=-1;
  if(schema.includes('id')&&copie.id&&sh.getLastRow()>1){const ids=sh.getRange(2,1,sh.getLastRow()-1,1).getValues().flat();const pos=ids.findIndex(x=>String(x)===String(copie.id));if(pos>=0)row=pos+2;}
  const values=schema.map(k=>normaliserValeur_(copie[k]));
  if(row>0)sh.getRange(row,1,1,schema.length).setValues([values]);else sh.appendRow(values);
  return copie;
}
function supprimerLignePlanCerbere_(nom,id){const sh=SpreadsheetApp.getActive().getSheetByName(nom);if(!sh||sh.getLastRow()<2)return false;const ids=sh.getRange(2,1,sh.getLastRow()-1,1).getValues().flat();const pos=ids.findIndex(x=>String(x)===String(id));if(pos<0)return false;sh.deleteRow(pos+2);return true;}

function assurerTablesPlanCerbere_() {
  const ss = SpreadsheetApp.getActive();
  const schemas=schemasPlanCerbere_();
  ['Plan_Objectifs','Plan_Actions','Plan_Evenements'].forEach(n=>assurerFeuillePlan_(ss,n,schemas[n]));
}
function assurerFeuillePlan_(ss, nom, entetes) {
  let sh = ss.getSheetByName(nom);
  if (!sh) { sh = ss.insertSheet(nom); sh.getRange(1,1,1,entetes.length).setValues([entetes]); sh.setFrozenRows(1); return; }
  const current=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim()):[];
  const missing=entetes.filter(x=>!current.includes(x));
  if(!current.length)sh.getRange(1,1,1,entetes.length).setValues([entetes]);
  else if(missing.length)sh.getRange(1,current.length+1,1,missing.length).setValues([missing]);
  sh.setFrozenRows(1);
}
