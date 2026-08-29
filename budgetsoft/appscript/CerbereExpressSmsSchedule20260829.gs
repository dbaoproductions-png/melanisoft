const CERBERE_EXPRESS_SMS_SCHEDULE_VERSION='2026-08-29.1';
const CERBERE_EXPRESS_SMS_SCHEDULE_HANDLER='envoyerSmsCerbereExpressProgramme20260829';
const CERBERE_EXPRESS_SMS_SCHEDULE_TZ='Europe/Paris';

/**
 * Envoi programme Cerbere Express :
 * - rafraichit d'abord le snapshot ;
 * - envoie ensuite le SMS aux deux profils configures.
 */
function envoyerSmsCerbereExpressProgramme20260829(){
  if(typeof rafraichirSnapshotCerbereExpress20260827==='function'){
    rafraichirSnapshotCerbereExpress20260827();
  }
  return envoyerSmsOvhCerbereExpressAuxDeux20260827();
}

/**
 * Installe trois declencheurs hebdomadaires, lundi/mercredi/samedi vers 08:00 Europe/Paris.
 * La fonction supprime d'abord uniquement les anciens declencheurs portant le meme handler,
 * afin d'eviter les doublons lors d'une reinstalllation.
 */
function installerProgrammationSmsCerbereExpress20260829(){
  supprimerProgrammationSmsCerbereExpress20260829_();
  const jours=[ScriptApp.WeekDay.MONDAY,ScriptApp.WeekDay.WEDNESDAY,ScriptApp.WeekDay.SATURDAY];
  const crees=jours.map(function(jour){
    const t=ScriptApp.newTrigger(CERBERE_EXPRESS_SMS_SCHEDULE_HANDLER)
      .timeBased()
      .onWeekDay(jour)
      .atHour(8)
      .nearMinute(0)
      .everyWeeks(1)
      .inTimezone(CERBERE_EXPRESS_SMS_SCHEDULE_TZ)
      .create();
    return {id:t.getUniqueId(),handler:t.getHandlerFunction()};
  });
  const out={ok:crees.length===3,version:CERBERE_EXPRESS_SMS_SCHEDULE_VERSION,timezone:CERBERE_EXPRESS_SMS_SCHEDULE_TZ,heure:'08:00',jours:['lundi','mercredi','samedi'],declencheurs:crees};
  console.log(JSON.stringify(out));
  return out;
}

function supprimerProgrammationSmsCerbereExpress20260829(){
  const n=supprimerProgrammationSmsCerbereExpress20260829_();
  const out={ok:true,version:CERBERE_EXPRESS_SMS_SCHEDULE_VERSION,supprimes:n};
  console.log(JSON.stringify(out));
  return out;
}

function supprimerProgrammationSmsCerbereExpress20260829_(){
  let n=0;
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()===CERBERE_EXPRESS_SMS_SCHEDULE_HANDLER){
      ScriptApp.deleteTrigger(t);
      n++;
    }
  });
  return n;
}

function auditerProgrammationSmsCerbereExpress20260829(){
  const ts=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()===CERBERE_EXPRESS_SMS_SCHEDULE_HANDLER;});
  const out={ok:ts.length===3,version:CERBERE_EXPRESS_SMS_SCHEDULE_VERSION,nombreDeclencheurs:ts.length,handler:CERBERE_EXPRESS_SMS_SCHEDULE_HANDLER,timezone:CERBERE_EXPRESS_SMS_SCHEDULE_TZ,heure:'08:00',jours:['lundi','mercredi','samedi'],ids:ts.map(function(t){return t.getUniqueId();})};
  console.log(JSON.stringify(out));
  return out;
}
