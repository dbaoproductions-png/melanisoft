const CLOTURE_DONNEES_STRUCTURE_20082026_VERSION='1.2';

const DECISIONS_CLOTURE_DONNEES_20082026_={
  'c2ec8b75-1ec4-4f6c-9571-226f75626f08':{categorie:'Revenus divers',raison:'BPCE Financement 42,28 €'},
  'ca576717-9533-4b40-a6ea-a1759561a939':{categorie:'Avantages employeur',raison:'COSAT avantage fonctionnaire'},
  'baa9f4d8-c81c-44d6-b4bf-897f4dde4a6b':{categorie:'Concerts',raison:'concert 121,65 €'},
  '42706c60-c45a-4cb7-84e1-7d1f286b757c':{categorie:'Concerts',raison:'concert Daansuren Dalaijargal'},
  'cde8b919-6b56-4d7b-a48b-7b8fc598fb17':{categorie:'Revenus divers',raison:'remise chèque résiduelle 5,22 €'},
  'adc6d981-2dd6-4e91-8b3d-1027f6e084d4':{categorie:'Argent de poche',raison:'virement Lou'},
  '93e629f8-a3e0-492f-86dc-39806677e179':{categorie:'Argent de poche',raison:'virement Lou'},
  'd4b36543-c4ae-4028-8ad3-a814812bc2ae':{categorie:'Argent de poche',raison:'virement Lou'},
  'cf7c6836-ab3c-45df-a363-44769e3af83b':{categorie:'Argent de poche',raison:'virement Lou'},
  'c79388cb-10f5-44cb-b09b-80b1fa9fe4d9':{categorie:'Argent de poche',raison:'virement Lou'},
  'fcd1e33f-7d89-4209-bd3f-a30a46c7d72c':{categorie:'Argent de poche',raison:'virement Lou'},
  '828577fe-d96b-47d8-bd71-41c0a3ad97e4':{categorie:'Argent de poche',raison:'virement Lou'},
  '5d9da57a-292e-4e94-85c9-306d7e211cfc':{categorie:'Argent de poche',raison:'virement Lou'}
};

function marqueurClotureDonnees_(commentaire){const m='[CLOTURE_DONNEES_20082026]';const c=String(commentaire||'').trim();return c.includes(m)?c:(c?c+' ':'')+m;}
function sensFluxClotureDonnees_(montant){const m=Number(montant||0);return m<0?'depense':m>0?'revenu':'';}

function enregistrerParamClotureDonnees_(cle,valeur){
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Parametres');if(!f)return false;
  const h=f.getRange(1,1,1,Math.max(2,f.getLastColumn())).getValues()[0].map(v=>String(v||'').trim()),ic=h.indexOf('cle'),iv=h.indexOf('valeur');if(ic<0||iv<0)return false;
  if(f.getLastRow()>1){const vals=f.getRange(2,ic+1,f.getLastRow()-1,1).getValues().flat(),p=vals.findIndex(v=>String(v)===String(cle));if(p>=0){f.getRange(p+2,iv+1).setValue(valeur);return true;}}
  const r=new Array(Math.max(f.getLastColumn(),Math.max(ic,iv)+1)).fill('');r[ic]=cle;r[iv]=valeur;f.appendRow(r);return true;
}

function assurerReglesClotureDonnees20082026_(){
  if(typeof assurerRegleMetier2026_!=='function')return{traitees:0,mode:'fonction_regles_absente'};
  const regles=[
    ['BEN MME LOU HERNEBRING','Argent de poche','depense'],['LOU HERNEBRING','Argent de poche','depense'],
    ['DAANSUREN','Concerts','revenu'],['COSAT','Avantages employeur','revenu'],['TOTALENERGIES','Remboursements','revenu'],
    ['CPAM','Remboursements santé','revenu'],['C.P.A.M','Remboursements santé','revenu'],['ASSURANCE MALADIE','Remboursements santé','revenu'],['MUTUELLE NATIONALE TERRITORIALE','Remboursements santé','revenu']
  ];
  regles.forEach(r=>assurerRegleMetier2026_(r[0],r[1],r[2]));
  return{traitees:regles.length,mode:'ok'};
}

function normaliserTypesReglesClotureDonnees_(){
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Regles_categories');if(!f||f.getLastRow()<2)return 0;
  const h=f.getRange(1,1,1,f.getLastColumn()).getValues()[0].map(v=>String(v||'').trim()),ic=h.indexOf('categorie'),it=h.indexOf('type');if(ic<0||it<0)return 0;
  const plage=f.getRange(2,1,f.getLastRow()-1,f.getLastColumn()),v=plage.getValues();let n=0;
  v.forEach(r=>{const cat=String(r[ic]||'').trim(),type=String(r[it]||'').toLowerCase();if(cat==='Crédits de trésorerie'&&type==='tresorerie'){r[it]='revenu';n++;}});
  if(n)plage.setValues(v);return n;
}

function migrerClotureDonneesStructure20082026(){
  verifierInitialisation_();
  const architecture=installerArchitectureCategoriesBudgetSoft();
  const operations=lireTable_('Operations');
  let operationsModifiees=0,typesSensCorriges=0;const detail={};
  operations.forEach(o=>{
    const x=Object.assign({},o);let change=false;
    const decision=DECISIONS_CLOTURE_DONNEES_20082026_[String(o.id||'')];
    if(decision&&String(x.categorie||'')!==decision.categorie){x.categorie=decision.categorie;x.commentaire=marqueurClotureDonnees_(x.commentaire);change=true;detail[decision.categorie]=(detail[decision.categorie]||0)+1;}
    const sens=sensFluxClotureDonnees_(x.montant);
    if(sens&&String(x.type||'').toLowerCase()!==sens){x.type=sens;change=true;typesSensCorriges++;}
    if(change){enregistrerLigne('Operations',x);operationsModifiees++;}
  });
  const regles=assurerReglesClotureDonnees20082026_(),typesReglesCorriges=normaliserTypesReglesClotureDonnees_();
  enregistrerParamClotureDonnees_('cloture_donnees_structure_version',CLOTURE_DONNEES_STRUCTURE_20082026_VERSION);
  SpreadsheetApp.flush();
  const resultat={version:CLOTURE_DONNEES_STRUCTURE_20082026_VERSION,ok:true,architecture,operationsModifiees,typesSensCorriges,typesReglesCorriges,detail,regles};console.log(JSON.stringify(resultat));return resultat;
}

function referencesCategoriesInconnuesCloture_(categories){
  const ss=SpreadsheetApp.getActiveSpreadsheet(),noms=new Set(categories.map(c=>String(c.nom||'').trim()).filter(Boolean)),anomalies=[];
  const specs=[['Operations','categorie'],['Charges_fixes','categorie'],['Regles_categories','categorie'],['Correspondances_bancaires','categorie'],['Budget','poste'],['Corrections_a_valider','categorie_actuelle'],['Corrections_a_valider','categorie_proposee']];
  specs.forEach(([feuilleNom,colonne])=>{const f=ss.getSheetByName(feuilleNom);if(!f||f.getLastRow()<2)return;const h=f.getRange(1,1,1,f.getLastColumn()).getValues()[0].map(v=>String(v||'').trim()),i=h.indexOf(colonne);if(i<0)return;f.getRange(2,i+1,f.getLastRow()-1,1).getValues().forEach((r,j)=>{const c=String(r[0]||'').trim();if(c&&!noms.has(c))anomalies.push({feuille:feuilleNom,ligne:j+2,colonne,categorie:c});});});
  return anomalies;
}

function incoherencesTypesTablesCloture_(categories){
  const ss=SpreadsheetApp.getActiveSpreadsheet(),types=Object.fromEntries(categories.map(c=>[String(c.nom||'').trim(),String(c.type||'').toLowerCase()])),anomalies=[];
  [['Regles_categories','categorie','type','actif'],['Correspondances_bancaires','categorie','type','actif'],['Charges_fixes','categorie','type','actif']].forEach(([nom,cc,ct,ca])=>{
    const f=ss.getSheetByName(nom);if(!f||f.getLastRow()<2)return;const h=f.getRange(1,1,1,f.getLastColumn()).getValues()[0].map(v=>String(v||'').trim()),ic=h.indexOf(cc),it=h.indexOf(ct),ia=h.indexOf(ca);if(ic<0||it<0)return;
    f.getRange(2,1,f.getLastRow()-1,f.getLastColumn()).getValues().forEach((r,j)=>{if(ia>=0&&String(r[ia]).toLowerCase()==='false')return;const cat=String(r[ic]||'').trim(),sens=String(r[it]||'').toLowerCase(),nature=types[cat];let ok=true;if(nature==='depense')ok=sens==='depense';else if(nature==='revenu')ok=sens==='revenu';else if(nature==='tresorerie'||nature==='epargne')ok=sens==='revenu'||sens==='depense';if(!ok)anomalies.push({feuille:nom,ligne:j+2,categorie:cat,nature,sens});});
  });return anomalies;
}

function auditerClotureDonneesStructure20082026(){
  verifierInitialisation_();
  const categories=lireTable_('Categories'),operations=lireTable_('Operations'),attendues=CATEGORIES_BUDGETSOFT_CIBLES_,parNom=Object.fromEntries(categories.map(c=>[String(c.nom||'').trim(),c]));
  const nomsAttendus=attendues.map(c=>c.nom),nomsActuels=categories.map(c=>String(c.nom||'').trim()).filter(Boolean),manquantes=nomsAttendus.filter(n=>!parNom[n]),extras=nomsActuels.filter(n=>!nomsAttendus.includes(n));
  const mauvaisTypesCategories=attendues.filter(c=>parNom[c.nom]&&String(parNom[c.nom].type||'').toLowerCase()!==c.type).map(c=>({nom:c.nom,actuel:parNom[c.nom].type,attendu:c.type}));
  const famillesIncorrectes=attendues.filter(c=>c.famille_analytique&&parNom[c.nom]&&String(parNom[c.nom].famille_analytique||'')!==c.famille_analytique).map(c=>({nom:c.nom,actuel:parNom[c.nom].famille_analytique,attendu:c.famille_analytique}));
  const sansCategorie=operations.filter(o=>!String(o.categorie||'').trim()).map(o=>({id:o.id,libelle:o.libelle,montant:o.montant}));
  const sensIncorrect=operations.filter(o=>{const s=sensFluxClotureDonnees_(o.montant);return s&&String(o.type||'').toLowerCase()!==s;}).map(o=>({id:o.id,montant:o.montant,type:o.type,categorie:o.categorie}));
  const decisionsIncorrectes=[];Object.entries(DECISIONS_CLOTURE_DONNEES_20082026_).forEach(([id,d])=>{const o=operations.find(x=>String(x.id)===id);if(!o)decisionsIncorrectes.push({id,erreur:'absente',attendue:d.categorie});else if(String(o.categorie||'')!==d.categorie)decisionsIncorrectes.push({id,actuelle:o.categorie,attendue:d.categorie});});
  const referencesInconnues=referencesCategoriesInconnuesCloture_(categories),typesTablesIncorrects=incoherencesTypesTablesCloture_(categories);
  const tresorerie=['Crédits de trésorerie','Virements internes','Remboursements','Remboursements santé'];
  const categoriesTresorerieOk=tresorerie.every(n=>parNom[n]&&String(parNom[n].type||'').toLowerCase()==='tresorerie');
  const idsLou=Object.entries(DECISIONS_CLOTURE_DONNEES_20082026_).filter(([,d])=>d.categorie==='Argent de poche').map(([id])=>id),louOk=idsLou.every(id=>{const o=operations.find(x=>String(x.id)===id);return o&&String(o.categorie||'')==='Argent de poche';});
  const remboursementsEnergie=operations.filter(o=>Number(o.montant||0)>0&&String(o.categorie||'')==='Remboursements'&&/TOTAL\s*ENERG|TOTALENERG/i.test(String((o.libelle_bancaire||'')+' '+(o.libelle||''))));
  const remboursementEnergieTotal=Math.round(remboursementsEnergie.reduce((s,o)=>s+Number(o.montant||0),0)*100)/100;

  let analyseOk=false,dashboardOk=false,coherenceOk=false,analyseErreur='',dashboardErreur='',coherenceErreur='';
  try{const a=chargerAnalysesBudgetairesV23(6);const cats=(a.categories||[]).map(x=>String(x.nom||''));const dep=a.depensesDetail&&a.depensesDetail.fenetres&&(a.depensesDetail.fenetres['6']||a.depensesDetail.fenetres[6]);analyseOk=String(a.version||'')==='2.5'&&!cats.includes('Gaz')&&!cats.includes('Électricité')&&!!(a.diagnostic&&a.diagnostic.tresorerieExclueDuResultatEconomique)&&String(a.diagnostic&&a.diagnostic.regroupementAnalytique||'').includes('Énergies')&&!!(dep&&dep.energie&&Number(dep.energie.remboursements||0)>=0);}catch(e){analyseErreur=String(e&&e.message||e);}
  try{const d=chargerDashboardReelV2();dashboardOk=!!(d&&String(d.versionCorrection||'')==='2.3'&&d.diagnosticEconomique&&d.diagnosticEconomique.tresorerieExclueDesRevenusDepenses&&d.diagnosticEconomique.soldeBancaireConserveTousFlux);}catch(e){dashboardErreur=String(e&&e.message||e);}
  try{const c=auditerCoherenceFinale19082026();coherenceOk=!!(c&&c.controles&&c.controles.dashboard_analyse_courant_identiques);}catch(e){coherenceErreur=String(e&&e.message||e);}

  const controles={referentiel_exact:manquantes.length===0&&extras.length===0,types_categories_coherents:mauvaisTypesCategories.length===0,familles_analytiques_coherentes:famillesIncorrectes.length===0,aucune_operation_sans_categorie:sansCategorie.length===0,sens_flux_operations_coherent:sensIncorrect.length===0,types_tables_metier_coherents:typesTablesIncorrects.length===0,decisions_finales_appliquees:decisionsIncorrectes.length===0,references_categories_resolues:referencesInconnues.length===0,tresorerie_nature_correcte:categoriesTresorerieOk,argent_de_poche_lou:louOk,remboursements_totalenergies_identifies:remboursementEnergieTotal===412.8,analyse_interface_coherente:analyseOk,dashboard_interface_coherent:dashboardOk,dashboard_analyse_alignes:coherenceOk};
  const ok=Object.values(controles).every(Boolean),resultat={version:CLOTURE_DONNEES_STRUCTURE_20082026_VERSION,ok,controles,compteurs:{categories:categories.length,operations:operations.length,sansCategorie:sansCategorie.length,sensIncorrect:sensIncorrect.length,typesTablesIncorrects:typesTablesIncorrects.length,referencesInconnues:referencesInconnues.length,decisionsIncorrectes:decisionsIncorrectes.length,argentDePoche:idsLou.length,remboursementsEnergie:remboursementsEnergie.length,remboursementEnergieTotal},manquantes,extras,mauvaisTypesCategories,famillesIncorrectes,sansCategorie,sensIncorrect,typesTablesIncorrects,decisionsIncorrectes,referencesInconnues,analyseErreur,dashboardErreur,coherenceErreur};console.log(JSON.stringify(resultat));return resultat;
}
