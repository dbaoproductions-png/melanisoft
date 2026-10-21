/** Creation explicite, unique et sans donnees du registre d'occurrences TEST.
 * A lancer manuellement apres verification de l'environnement Apps Script.
 * Ne modifie aucune operation bancaire, projection ni donnee existante.
 */
function creerFeuilleDecisionsOccurrencesCfBudgetSoft20261021(){
 const ss=SpreadsheetApp.getActiveSpreadsheet();
 if(!ss)throw new Error('Aucun classeur actif : creation refusee.');
 const nom='Decisions_occurrences_charges_fixes';
 const entetes=BUDGETSOFT_CF_OCCURRENCE_DECISIONS_20261021_HEADERS;
 let f=ss.getSheetByName(nom);
 if(f){
  const existants=f.getLastRow()>0?f.getRange(1,1,1,Math.min(f.getLastColumn(),entetes.length)).getValues()[0].map(String):[];
  const conforme=entetes.length===existants.length&&entetes.every((x,i)=>x===existants[i]);
  const sortie={ok:conforme,lectureSeule:true,dejaPresente:true,aucuneModification:true,entetesConformes:conforme,lignes:f.getLastRow()>1?f.getLastRow()-1:0};
  console.log('[CREATION REGISTRE DECISIONS CF] '+JSON.stringify(sortie));return sortie;
 }
 f=ss.insertSheet(nom);
 f.getRange(1,1,1,entetes.length).setValues([entetes]);
 f.setFrozenRows(1);
 const sortie={ok:true,creationExplicite:true,dejaPresente:false,feuille:nom,lignes:0,entetes:entetes.length,
  ecritureEffectuee:'entetes_seulement',donneesBancairesInchangees:true,publicationActive:false};
 console.log('[CREATION REGISTRE DECISIONS CF] '+JSON.stringify(sortie));return sortie;
}
