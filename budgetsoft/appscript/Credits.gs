const CREDITS_VERSION = '1.8';

function assurerColonnesCredits_(){
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Credits');
  if(!f)return;
  const attendues=[...new Set([...(TABLES.Credits||[]),'cout_restant','cout_restant_precision','type_credit','plafond_credit','disponible_credit','assurance_mensuelle'])], largeur=Math.max(1,f.getLastColumn());
  const presentes=f.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim());
  const manquantes=attendues.filter(h=>!presentes.includes(h));
  if(manquantes.length)f.getRange(1,largeur+1,1,manquantes.length).setValues([manquantes]);
}

function enrichirCredit_(c){
  const x=Object.assign({},c);
  x.capital_restant=Math.max(0,Number(x.capital_restant||0));
  x.mensualite=Math.max(0,Number(x.mensualite||0));
  x.taux=Math.max(0,Number(x.taux||0));
  x.echeances_restantes=Math.max(0,parseInt(x.echeances_restantes,10)||0);
  x.type_credit=String(x.type_credit||'amortissable').toLowerCase()==='revolving'?'revolving':'amortissable';
  x.plafond_credit=Math.max(0,Number(x.plafond_credit||0));
  x.disponible_credit=Math.max(0,Number(x.disponible_credit||0));
  x.assurance_mensuelle=Math.max(0,Number(x.assurance_mensuelle||0));
  if(!x.echeances_restantes&&x.mensualite>0&&x.capital_restant>0)x.echeances_restantes=Math.ceil(x.capital_restant/x.mensualite);
  const coutSaisi=Number(x.cout_restant);
  if(Number.isFinite(coutSaisi)&&coutSaisi>=0)x.cout_restant=Math.round(coutSaisi*100)/100;
  else if(x.echeances_restantes&&x.mensualite)x.cout_restant=Math.max(0,Math.round((x.echeances_restantes*x.mensualite-x.capital_restant)*100)/100);
  else x.cout_restant=0;
  x.cout_restant_precision=String(x.cout_restant_precision||'Estimation à partir des échéances restantes et du capital restant dû.');
  return x;
}

function chargerCreditsEtDettes() {
  verifierInitialisation_();
  assurerColonnesCredits_();
  const credits = lireTable_('Credits').map(enrichirCredit_);
  const dettes = lireTable_('Dettes');
  const tous = [
    ...credits.map(c => Object.assign({ table: 'Credits', nature: c.type_credit==='revolving'?'Crédit renouvelable':'Crédit' }, c)),
    ...dettes.map(d => Object.assign({ table: 'Dettes', nature: 'Dette' }, d))
  ].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));

  const capitalRestant = tous.reduce((s, ligne) => s + Math.abs(Number(ligne.capital_restant || 0)), 0);
  const mensualites = tous.reduce((s, ligne) => s + Math.abs(Number(ligne.mensualite || 0)), 0);
  const tauxPondere = capitalRestant
    ? tous.reduce((s, ligne) => s + Math.abs(Number(ligne.capital_restant || 0)) * Math.abs(Number(ligne.taux || 0)), 0) / capitalRestant
    : 0;
  const echeancesRestantes=credits.reduce((s,c)=>s+Math.max(0,Number(c.echeances_restantes||0)),0);
  const coutRestant=credits.reduce((s,c)=>s+Math.max(0,Number(c.cout_restant||0)),0);
  const amortissables=credits.filter(c=>c.type_credit!=='revolving');
  const renouvelables=credits.filter(c=>c.type_credit==='revolving');
  const capitalRenouvelable=renouvelables.reduce((s,c)=>s+Number(c.capital_restant||0),0);
  const coutRenouvelable=renouvelables.reduce((s,c)=>s+Number(c.cout_restant||0),0);
  const tauxRenouvelablePondere=capitalRenouvelable?renouvelables.reduce((s,c)=>s+Number(c.capital_restant||0)*Number(c.taux||0),0)/capitalRenouvelable:0;

  return { version: CREDITS_VERSION, lignes: tous, capitalRestant, mensualites, tauxPondere, echeancesRestantes, coutRestant, amortissables, renouvelables, capitalRenouvelable, coutRenouvelable, tauxRenouvelablePondere };
}

function enregistrerCreditOuDette(donnees) {
  verifierInitialisation_();
  assurerColonnesCredits_();
  if (!donnees || typeof donnees !== 'object') throw new Error('Données invalides.');
  const table = String(donnees.table || 'Credits') === 'Dettes' ? 'Dettes' : 'Credits';
  const nom = String(donnees.nom || '').trim();
  if (!nom) throw new Error('Le nom est obligatoire.');

  const ligne = {
    id: donnees.id || '',
    nom,
    capital_restant: Math.max(0, convertirNombre_(donnees.capital_restant || 0)),
    mensualite: Math.max(0, convertirNombre_(donnees.mensualite || 0)),
    taux: Math.max(0, convertirNombre_(donnees.taux || 0)),
    date_fin: donnees.date_fin ? new Date(donnees.date_fin) : ''
  };
  if (table === 'Credits') {
    ligne.date_debut = donnees.date_debut ? new Date(donnees.date_debut) : '';
    ligne.numero_pret=String(donnees.numero_pret||'').trim();
    ligne.prochaine_echeance=donnees.prochaine_echeance?new Date(donnees.prochaine_echeance):'';
    ligne.echeances_restantes=Math.max(0,parseInt(donnees.echeances_restantes,10)||0);
    ligne.cout_restant=Math.max(0,convertirNombre_(donnees.cout_restant||0));
    ligne.cout_restant_precision=String(donnees.cout_restant_precision||'').trim();
    ligne.type_credit=String(donnees.type_credit||'amortissable').toLowerCase()==='revolving'?'revolving':'amortissable';
    ligne.plafond_credit=Math.max(0,convertirNombre_(donnees.plafond_credit||0));
    ligne.disponible_credit=Math.max(0,convertirNombre_(donnees.disponible_credit||0));
    ligne.assurance_mensuelle=Math.max(0,convertirNombre_(donnees.assurance_mensuelle||0));
    ligne.commentaire=String(donnees.commentaire||'').trim();
  }
  enregistrerLigne(table, ligne);
  return chargerCreditsEtDettes();
}

function supprimerCreditOuDette(table, id) {
  const nomTable = String(table) === 'Dettes' ? 'Dettes' : 'Credits';
  supprimerLigne(nomTable, id);
  return chargerCreditsEtDettes();
}

function trouverChargeCasden_(){
  return lireTable_('Charges_fixes').find(c=>convertirBooleen_(c.actif)&&/casden/i.test(String(c.libelle||'')+' '+String(c.libelle_bancaire||'')))||null;
}

function appliquerAvenantCasden2026(){
  verifierInitialisation_();
  assurerColonnesCredits_();
  const charge=trouverChargeCasden_();
  if(!charge)throw new Error('Charge fixe CASDEN introuvable.');
  const existants=lireAjustementsChargesFixes().filter(a=>String(a.charge_fixe_id)===String(charge.id)&&String(a.action)==='ignorer');
  ['2026-09-04','2026-10-04'].forEach(date=>{
    if(!existants.some(a=>String(a.date_cible)===date))enregistrerAjustementChargeFixe({charge_fixe_id:charge.id,action:'ignorer',date_cible:date,commentaire:'Avenant CASDEN du 22/07/2026 — report de 2 échéances',actif:true});
  });
  const credits=lireTable_('Credits');
  let credit=credits.find(c=>/casden/i.test(String(c.nom||''))||String(c.numero_pret||'')==='S0064401451');
  credit=Object.assign({},credit||{}, {nom:(credit&&credit.nom)||'CASDEN',numero_pret:'S0064401451',capital_restant:40562.30,mensualite:576.33,taux:0.94,type_credit:'amortissable',date_debut:(credit&&credit.date_debut)||'2010-05-04',prochaine_echeance:'2026-11-04',date_fin:'2032-11-04',echeances_restantes:73,cout_restant:1244.66,cout_restant_precision:'Coût restant calculé sur 72 échéances de 576,33 € et une dernière de 311,20 €, moins le capital restant dû de 40 562,30 €.',commentaire:'TAEG de référence : 0,94 %. Avenant du 22/07/2026 : échéances du 04/09/2026 et du 04/10/2026 suspendues ; reprise le 04/11/2026. Dernière échéance 311,20 € le 04/11/2032.'});
  enregistrerLigne('Credits',credit);
  return {ok:true,chargeFixeId:charge.id,credit:enrichirCredit_(credit),ajustements:['2026-09-04','2026-10-04']};
}

function ajouterCreditCofidis2026(){
  verifierInitialisation_(); assurerColonnesCredits_();
  const credits=lireTable_('Credits'); let credit=credits.find(c=>/cofidis/i.test(String(c.nom||''))||String(c.numero_pret||'').includes('289.2'));
  credit=Object.assign({},credit||{}, {nom:(credit&&credit.nom)||'Cofidis',numero_pret:'289.2XX.XXX.715.00',capital_restant:8948.04,mensualite:207.89,taux:4.70,type_credit:'amortissable',date_debut:'2026-01-06',prochaine_echeance:'2026-09-01',date_fin:'2031-01-01',echeances_restantes:53,cout_restant:2070.13,cout_restant_precision:'Estimation : 53 mensualités de 207,89 € moins le capital restant dû de 8 948,04 €. À affiner avec l’échéancier détaillé, notamment si la dernière échéance diffère.',commentaire:'TAEG fixe 4,70 %. Montant emprunté 10 000 €. Durée restante annoncée : 53 mois au 16/08/2026. Date de fin estimée au 01/01/2031 à partir de la prochaine échéance du 01/09/2026 ; à remplacer par la date contractuelle exacte si un échéancier détaillé est fourni.'});
  enregistrerLigne('Credits',credit); return {ok:true,credit:enrichirCredit_(credit)};
}

function ajouterCreditCreatis2026(){
  verifierInitialisation_(); assurerColonnesCredits_();
  const credits=lireTable_('Credits'); let credit=credits.find(c=>/creatis/i.test(String(c.nom||''))||String(c.numero_pret||'')==='28904001986964');
  credit=Object.assign({},credit||{}, {nom:(credit&&credit.nom)||'Creatis',numero_pret:'28904001986964',capital_restant:58860.53,mensualite:865.11,taux:8.29,type_credit:'amortissable',date_debut:'2025-05-31',prochaine_echeance:'2026-09-30',date_fin:'2033-06-30',echeances_restantes:82,cout_restant:12078.85,cout_restant_precision:'Base connue avant le report d’août 2026 : échéancier du 30/05/2025, après l’échéance du 31/07/2026. Le coût réel restant sera à réactualiser avec l’avenant de report, qui peut ajouter intérêts ou frais.',commentaire:'TAEG 8,29 % ; TNA 5,89 %. Montant initial 66 100 €. Capital restant dû après l’échéance du 31/07/2026 : 58 860,53 €. L’échéance du 31/08/2026 a été reportée ; prochaine échéance et fin de crédit sont donc provisoirement estimées au 30/09/2026 et 30/06/2033, sous réserve du nouvel échéancier Creatis.'});
  enregistrerLigne('Credits',credit); return {ok:true,credit:enrichirCredit_(credit)};
}

function ajouterRevolvingOney2026(){
  verifierInitialisation_(); assurerColonnesCredits_();
  const credits=lireTable_('Credits'); let credit=credits.find(c=>/oney.*b\+|carte b\+/i.test(String(c.nom||''))||String(c.numero_pret||'').includes('1579'));
  credit=Object.assign({},credit||{}, {
    nom:'Oney Carte b+ — renouvelable', numero_pret:'202 ** **** ***1579', type_credit:'revolving',
    capital_restant:2773.71, mensualite:117.29, taux:23.30, prochaine_echeance:'2026-08-07',
    echeances_restantes:36, date_fin:'2029-07-07', plafond_credit:3000, disponible_credit:100, assurance_mensuelle:19.74,
    cout_restant:1448.73,
    cout_restant_precision:'Estimation instantanée : 36 mensualités au niveau actuel de 117,29 € moins 2 773,71 € de capital restant dû. Crédit renouvelable : coût et date de fin varieront en cas de nouvelle utilisation, changement de TAEG, mensualité ou assurance.',
    commentaire:'Relevé arrêté au 25/07/2026. TAEG révisable applicable à l’encours jusqu’à 3 000 € : 23,30 %. Prochain prélèvement 07/08/2026 : 117,29 €, dont 50,99 € de capital, 46,56 € d’intérêts et 19,74 € d’assurance. Estimation Oney : 36 mensualités restantes. Fin estimée au 07/07/2029 sans nouvelle utilisation.'
  });
  enregistrerLigne('Credits',credit); return {ok:true,credit:enrichirCredit_(credit)};
}

function ajouterRevolvingCarrefourPass2026(){
  verifierInitialisation_(); assurerColonnesCredits_();
  const credits=lireTable_('Credits'); let credit=credits.find(c=>/carrefour.*pass|credit pass/i.test(String(c.nom||''))||String(c.numero_pret||'')==='50209416123100');
  credit=Object.assign({},credit||{}, {
    nom:'Carrefour PASS — renouvelable', numero_pret:'50209416123100', type_credit:'revolving',
    capital_restant:5942.42, mensualite:168.00, taux:15.66, prochaine_echeance:'2026-08-05',
    echeances_restantes:59, date_fin:'2031-06-05', plafond_credit:6000, disponible_credit:8.05, assurance_mensuelle:38.49,
    cout_restant:3969.58,
    cout_restant_precision:'Estimation instantanée : 59 mensualités au niveau actuel de 168 € moins 5 942,42 € d’encours utilisé. Crédit renouvelable : coût et date de fin varieront avec les nouvelles utilisations, le TAEG, la mensualité et l’assurance.',
    commentaire:'Relevé du 21/06/2026 au 20/07/2026. Encours utilisé au 20/07/2026 : 5 942,42 € sur 6 000 €. TAEG révisable de la tranche 3 000,01 € à 6 000 € : 15,66 %. Échéance du 05/08/2026 : 168 €, dont 57,68 € de capital, 71,83 € d’intérêts et 38,49 € d’assurance. Estimation Carrefour : 59 mensualités restantes. Fin estimée au 05/06/2031 sans nouvelle utilisation.'
  });
  enregistrerLigne('Credits',credit); return {ok:true,credit:enrichirCredit_(credit)};
}

function ajouterRevolvingFloa2026(){
  verifierInitialisation_(); assurerColonnesCredits_();
  const credits=lireTable_('Credits'); let credit=credits.find(c=>/floa|cdiscount/i.test(String(c.nom||''))||String(c.numero_pret||'')==='4219 277 327 1100');
  credit=Object.assign({},credit||{}, {
    nom:'FLOA / Cdiscount — renouvelable', numero_pret:'4219 277 327 1100', type_credit:'revolving',
    capital_restant:3035.46, mensualite:114.00, taux:15.66, prochaine_echeance:'2026-08-05',
    echeances_restantes:36, date_fin:'2029-07-05', plafond_credit:3000, disponible_credit:0, assurance_mensuelle:0,
    cout_restant:1068.54,
    cout_restant_precision:'Estimation instantanée : 36 mensualités au niveau contractuel actuel de 114 € moins 3 035,46 € d’encours restant dû. Le prochain prélèvement annoncé est de 115,25 € car il inclut vraisemblablement la cotisation carte de 1,25 €. Crédit renouvelable : coût et date de fin varieront en cas de nouvelle utilisation ou de changement du TAEG ou de la mensualité.',
    commentaire:'Relevé de situation juillet 2026, arrêté au 22/07/2026. Encours restant dû : 3 035,46 € pour un maximum consenti de 3 000 € et 0 € disponible. Mensualité de crédit : 114 € ; prochain prélèvement le 05/08/2026 : 115,25 €. TAEG révisable applicable à la tranche 3 000,01 € à 6 000 € : 15,66 %. 36 mensualités restantes annoncées. Sur la période, 34,21 € d’intérêts et 0 € d’assurance ; cotisation carte 1,25 €. Fin estimée au 05/07/2029 sans nouvelle utilisation.'
  });
  enregistrerLigne('Credits',credit); return {ok:true,credit:enrichirCredit_(credit)};
}
