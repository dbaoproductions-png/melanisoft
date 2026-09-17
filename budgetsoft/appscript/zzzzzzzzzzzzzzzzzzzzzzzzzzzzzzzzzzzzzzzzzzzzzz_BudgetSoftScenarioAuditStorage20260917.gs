/*
 * BudgetSoft — stockage durable et léger du scénario d'audit — 2026-09-17.
 *
 * Les captures T0..T4 étaient stockées dans DocumentProperties. Ce stockage est
 * global au document et partagé avec le reste de BudgetSoft : une capture T2 a
 * fini par dépasser son quota. Les états de scénario sont désormais conservés
 * dans une feuille technique masquée, une ligne par étape.
 *
 * Compatibilité : les anciennes captures encore présentes dans
 * DocumentProperties restent lisibles et sont migrées automatiquement lors de
 * la première écriture.
 */
const BUDGETSOFT_SCENARIO_AUDIT_STORAGE_20260917_VERSION='2026-09-17.1';
const BUDGETSOFT_SCENARIO_AUDIT_STORAGE_20260917_SHEET='_BS_SCENARIO_AUDIT';

function feuilleScenarioAuditBudgetSoft20260917_(creer){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName(BUDGETSOFT_SCENARIO_AUDIT_STORAGE_20260917_SHEET);
  if(!sh&&creer){
    sh=ss.insertSheet(BUDGETSOFT_SCENARIO_AUDIT_STORAGE_20260917_SHEET);
    sh.getRange(1,1,1,3).setValues([['Etape','EtatJson','MisAJourLe']]);
    sh.setFrozenRows(1);
    try{sh.hideSheet();}catch(e){}
  }
  return sh;
}

function indexEtapeScenarioAuditBudgetSoft20260917_(sh,etape){
  if(!sh||sh.getLastRow()<2)return 0;
  const cible=String(etape||'').trim().toUpperCase();
  const vals=sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues();
  for(let i=0;i<vals.length;i++)if(String(vals[i][0]||'').trim().toUpperCase()===cible)return i+2;
  return 0;
}

function ecrireEtatControleBudgetSoft20260917_(etape,etat){
  const sh=feuilleScenarioAuditBudgetSoft20260917_(true);
  const cle=String(etape||'MANUEL').trim().toUpperCase();
  const json=JSON.stringify(etat);
  // Une cellule Google Sheets accepte largement les résumés compacts du scénario.
  if(json.length>45000)throw new Error('Capture scénario anormalement volumineuse ('+json.length+' caractères).');
  let row=indexEtapeScenarioAuditBudgetSoft20260917_(sh,cle);
  if(!row)row=Math.max(2,sh.getLastRow()+1);
  sh.getRange(row,1,1,3).setValues([[cle,json,new Date()]]);
  SpreadsheetApp.flush();
  return{ok:true,etape:cle,ligne:row,taille:json.length,stockage:'feuille_masquee'};
}

function lireEtatControleBudgetSoft20260917DepuisFeuille_(etape){
  const sh=feuilleScenarioAuditBudgetSoft20260917_(false);
  if(!sh)return null;
  const row=indexEtapeScenarioAuditBudgetSoft20260917_(sh,etape);
  if(!row)return null;
  const raw=String(sh.getRange(row,2).getValue()||'');
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e){return null;}
}

function migrerAnciennesCapturesScenarioBudgetSoft20260917_(){
  const p=PropertiesService.getDocumentProperties();
  const etapes=['T0','T1','T2','T3','T4','MANUEL'];
  let migrees=0,supprimees=0;
  etapes.forEach(function(etape){
    const cle=BUDGETSOFT_SCENARIO_AUDIT_20260916_PREFIX+etape;
    const raw=p.getProperty(cle);
    if(!raw)return;
    if(!lireEtatControleBudgetSoft20260917DepuisFeuille_(etape)){
      try{ecrireEtatControleBudgetSoft20260917_(etape,JSON.parse(raw));migrees++;}catch(e){}
    }
    // On ne supprime que les propriétés appartenant explicitement à cet audit.
    try{p.deleteProperty(cle);supprimees++;}catch(e){}
  });
  return{ok:true,migrees:migrees,supprimees:supprimees};
}

/* Override de lecture : nouvelle feuille d'abord, ancien DocumentProperties en secours. */
function lireEtatControleBudgetSoft20260916_(etape){
  const cle=String(etape||'').trim().toUpperCase();
  const feuille=lireEtatControleBudgetSoft20260917DepuisFeuille_(cle);
  if(feuille)return feuille;
  try{
    const raw=PropertiesService.getDocumentProperties().getProperty(BUDGETSOFT_SCENARIO_AUDIT_20260916_PREFIX+cle);
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}

/* Override de capture : mêmes calculs et même format, mais plus de DocumentProperties. */
function capturerEtatControleBudgetSoft20260916(etape){
  etape=String(etape||'MANUEL').trim().toUpperCase();
  // Libère d'abord la place occupée par les anciennes captures T0/T1 sans toucher
  // aux autres propriétés métier BudgetSoft.
  migrerAnciennesCapturesScenarioBudgetSoft20260917_();

  const operations=lireSansEchecScenarioBudgetSoft20260916_('operations',resumeOperationsScenarioBudgetSoft20260916_);
  const comptes=lireSansEchecScenarioBudgetSoft20260916_('comptes',resumeComptesScenarioBudgetSoft20260916_);
  const tresorerie=lireSansEchecScenarioBudgetSoft20260916_('tresorerie',resumeTresorerieScenarioBudgetSoft20260916_);
  const cerbere=lireSansEchecScenarioBudgetSoft20260916_('cerbere',resumeCerbereScenarioBudgetSoft20260916_);
  const creditsPatrimoine=lireSansEchecScenarioBudgetSoft20260916_('credits_patrimoine',resumeCreditsPatrimoineScenarioBudgetSoft20260916_);
  const modules={
    operations:operations.ok?operations.valeur:{ok:false,erreur:operations.erreur},
    comptes:comptes.ok?comptes.valeur:{ok:false,erreur:comptes.erreur},
    tresorerie:tresorerie.ok?tresorerie.valeur:{ok:false,erreur:tresorerie.erreur},
    cerbere:cerbere.ok?cerbere.valeur:{ok:false,erreur:cerbere.erreur},
    creditsPatrimoine:creditsPatrimoine.ok?creditsPatrimoine.valeur:{ok:false,erreur:creditsPatrimoine.erreur}
  };
  const out={ok:[operations,comptes,tresorerie,cerbere,creditsPatrimoine].every(x=>x.ok),version:BUDGETSOFT_SCENARIO_AUDIT_20260916_VERSION,stockageVersion:BUDGETSOFT_SCENARIO_AUDIT_STORAGE_20260917_VERSION,etape:etape,date:new Date().toISOString(),modules:modules};
  const stockage=ecrireEtatControleBudgetSoft20260917_(etape,out);
  console.log('[SCENARIO BUDGETSOFT '+etape+'] '+JSON.stringify(out));
  console.log('[SCENARIO BUDGETSOFT STOCKAGE] '+JSON.stringify(stockage));
  return out;
}

/* Override de reset : nettoie la feuille technique et l'ancien stockage seulement pour cet audit. */
function reinitialiserScenarioBudgetSoft20260916(){
  const sh=feuilleScenarioAuditBudgetSoft20260917_(false);
  if(sh&&sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,3).clearContent();
  const p=PropertiesService.getDocumentProperties();
  ['T0','T1','T2','T3','T4','MANUEL'].forEach(function(x){
    try{p.deleteProperty(BUDGETSOFT_SCENARIO_AUDIT_20260916_PREFIX+x);}catch(e){}
  });
  const out={ok:true,version:BUDGETSOFT_SCENARIO_AUDIT_20260916_VERSION,stockageVersion:BUDGETSOFT_SCENARIO_AUDIT_STORAGE_20260917_VERSION,reinitialise:true};
  console.log('[SCENARIO BUDGETSOFT RESET] '+JSON.stringify(out));
  return out;
}

function auditerStockageScenarioBudgetSoft20260917(){
  const sh=feuilleScenarioAuditBudgetSoft20260917_(false);
  const etapes=['T0','T1','T2','T3','T4','MANUEL'];
  const presentes={};
  etapes.forEach(function(x){presentes[x]=!!lireEtatControleBudgetSoft20260916_(x);});
  const out={ok:true,version:BUDGETSOFT_SCENARIO_AUDIT_STORAGE_20260917_VERSION,feuille:!!sh,presentes:presentes};
  console.log('[AUDIT STOCKAGE SCENARIO 20260917] '+JSON.stringify(out));
  return out;
}
