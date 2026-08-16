const CREDITS_VERSION = '1.6';

function assurerColonnesCredits_(){
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Credits');
  if(!f)return;
  const attendues=[...new Set([...(TABLES.Credits||[]),'cout_restant','cout_restant_precision'])], largeur=Math.max(1,f.getLastColumn());
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
    ...credits.map(c => Object.assign({ table: 'Credits', nature: 'Crédit' }, c)),
    ...dettes.map(d => Object.assign({ table: 'Dettes', nature: 'Dette' }, d))
  ].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));

  const capitalRestant = tous.reduce((s, ligne) => s + Math.abs(Number(ligne.capital_restant || 0)), 0);
  const mensualites = tous.reduce((s, ligne) => s + Math.abs(Number(ligne.mensualite || 0)), 0);
  const tauxPondere = capitalRestant
    ? tous.reduce((s, ligne) => s + Math.abs(Number(ligne.capital_restant || 0)) * Math.abs(Number(ligne.taux || 0)), 0) / capitalRestant
    : 0;
  const echeancesRestantes=credits.reduce((s,c)=>s+Math.max(0,Number(c.echeances_restantes||0)),0);
  const coutRestant=credits.reduce((s,c)=>s+Math.max(0,Number(c.cout_restant||0)),0);

  return { version: CREDITS_VERSION, lignes: tous, capitalRestant, mensualites, tauxPondere, echeancesRestantes, coutRestant };
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
  credit=Object.assign({},credit||{}, {
    nom:(credit&&credit.nom)||'CASDEN',
    numero_pret:'S0064401451',
    capital_restant:40562.30,
    mensualite:576.33,
    taux:0.94,
    date_debut:(credit&&credit.date_debut)||'2010-05-04',
    prochaine_echeance:'2026-11-04',
    date_fin:'2032-11-04',
    echeances_restantes:73,
    cout_restant:1244.66,
    cout_restant_precision:'Coût restant calculé sur 72 échéances de 576,33 € et une dernière de 311,20 €, moins le capital restant dû de 40 562,30 €.',
    commentaire:'TAEG de référence : 0,94 %. Avenant du 22/07/2026 : échéances du 04/09/2026 et du 04/10/2026 suspendues ; reprise le 04/11/2026. Dernière échéance 311,20 € le 04/11/2032.'
  });
  enregistrerLigne('Credits',credit);
  return {ok:true,chargeFixeId:charge.id,credit:enrichirCredit_(credit),ajustements:['2026-09-04','2026-10-04']};
}

function ajouterCreditCofidis2026(){
  verifierInitialisation_();
  assurerColonnesCredits_();
  const credits=lireTable_('Credits');
  let credit=credits.find(c=>/cofidis/i.test(String(c.nom||''))||String(c.numero_pret||'').includes('289.2'));
  credit=Object.assign({},credit||{}, {
    nom:(credit&&credit.nom)||'Cofidis',
    numero_pret:'289.2XX.XXX.715.00',
    capital_restant:8948.04,
    mensualite:207.89,
    taux:4.70,
    date_debut:'2026-01-06',
    prochaine_echeance:'2026-09-01',
    date_fin:'2031-01-01',
    echeances_restantes:53,
    cout_restant:2070.13,
    cout_restant_precision:'Estimation : 53 mensualités de 207,89 € moins le capital restant dû de 8 948,04 €. À affiner avec l’échéancier détaillé, notamment si la dernière échéance diffère.',
    commentaire:'TAEG fixe 4,70 %. Montant emprunté 10 000 €. Durée restante annoncée : 53 mois au 16/08/2026. Date de fin estimée au 01/01/2031 à partir de la prochaine échéance du 01/09/2026 ; à remplacer par la date contractuelle exacte si un échéancier détaillé est fourni.'
  });
  enregistrerLigne('Credits',credit);
  return {ok:true,credit:enrichirCredit_(credit)};
}

function ajouterCreditCreatis2026(){
  verifierInitialisation_();
  assurerColonnesCredits_();
  const credits=lireTable_('Credits');
  let credit=credits.find(c=>/creatis/i.test(String(c.nom||''))||String(c.numero_pret||'')==='28904001986964');
  credit=Object.assign({},credit||{}, {
    nom:(credit&&credit.nom)||'Creatis',
    numero_pret:'28904001986964',
    capital_restant:58860.53,
    mensualite:865.11,
    taux:8.29,
    date_debut:'2025-05-31',
    prochaine_echeance:'2026-09-30',
    date_fin:'2033-06-30',
    echeances_restantes:82,
    cout_restant:12078.85,
    cout_restant_precision:'Base connue avant le report d’août 2026 : échéancier du 30/05/2025, après l’échéance du 31/07/2026. Le coût réel restant sera à réactualiser avec l’avenant de report, qui peut ajouter intérêts ou frais.',
    commentaire:'TAEG 8,29 % ; TNA 5,89 %. Montant initial 66 100 €. Capital restant dû après l’échéance du 31/07/2026 : 58 860,53 €. L’échéance du 31/08/2026 a été reportée ; prochaine échéance et fin de crédit sont donc provisoirement estimées au 30/09/2026 et 30/06/2033, sous réserve du nouvel échéancier Creatis.'
  });
  enregistrerLigne('Credits',credit);
  return {ok:true,credit:enrichirCredit_(credit)};
}
