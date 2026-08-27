const CERBERE_EXPRESS_SMS_OVH_VERSION='2026-08-27.1';
const CERBERE_EXPRESS_SMS_OVH_ENDPOINT='https://eu.api.ovh.com/1.0';
const CERBERE_EXPRESS_SMS_OVH_PROPS={
  applicationKey:'OVH_SMS_APPLICATION_KEY',
  applicationSecret:'OVH_SMS_APPLICATION_SECRET',
  consumerKey:'OVH_SMS_CONSUMER_KEY',
  serviceName:'OVH_SMS_SERVICE_NAME',
  principal:'CERBERE_SMS_PRINCIPAL',
  conjointe:'CERBERE_SMS_CONJOINTE'
};

/**
 * Transport SMS OVHcloud pour Cerbère Express.
 * Aucun secret ni numéro n'est conservé dans le dépôt : tout vient des ScriptProperties.
 * Droits OVH minimum recommandés : GET /sms/ et POST /sms/*/jobs/.
 */
function auditerConfigurationSmsCerbereExpress20260827(){
  const p=PropertiesService.getScriptProperties();
  const etat={
    ok:!!(p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.applicationKey)&&p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.applicationSecret)&&p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.consumerKey)&&p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.principal)),
    version:CERBERE_EXPRESS_SMS_OVH_VERSION,
    applicationKey:!!p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.applicationKey),
    applicationSecret:!!p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.applicationSecret),
    consumerKey:!!p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.consumerKey),
    serviceNameConfigure:!!p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.serviceName),
    principalConfigure:!!p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.principal),
    conjointeConfigure:!!p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.conjointe),
    urlProductionConfigure:!!p.getProperty('CERBERE_EXPRESS_WEBAPP_URL')
  };
  console.log(JSON.stringify(etat));
  return etat;
}

/** Teste l'authentification et retourne les comptes SMS accessibles, sans envoyer de SMS. */
function testerConnexionOvhSmsCerbereExpress20260827(){
  const services=requeteOvhSmsCerbereExpress20260827_('GET','/sms','');
  const out={ok:Array.isArray(services)&&services.length>0,version:CERBERE_EXPRESS_SMS_OVH_VERSION,nombreServices:Array.isArray(services)?services.length:0,services:services||[]};
  console.log(JSON.stringify(out));
  return out;
}

/** Prévisualise le SMS réellement transmis à OVH, sans l'envoyer. */
function previsualiserSmsOvhCerbereExpress20260827(profil){
  profil=normaliserProfilCerbereExpress20260827_(profil||'principal');
  const brut=genererSmsCerbereExpress20260827(profil);
  const texte=normaliserTexteSmsGsmCerbereExpress20260827_(brut.texte);
  const out={
    ok:true,
    version:CERBERE_EXPRESS_SMS_OVH_VERSION,
    profil,
    texte,
    longueur:texte.length,
    segmentsEstimes:estimerSegmentsSmsCerbereExpress20260827_(texte),
    destinataireConfigure:!!numeroSmsCerbereExpress20260827_(profil)
  };
  console.log(JSON.stringify(out));
  return out;
}

/**
 * Envoie UN SMS au profil demandé. Fonction volontairement explicite : aucun envoi automatique ici.
 */
function envoyerSmsOvhCerbereExpress20260827(profil){
  profil=normaliserProfilCerbereExpress20260827_(profil||'principal');
  const numero=numeroSmsCerbereExpress20260827_(profil);
  if(!numero)throw new Error('Numéro SMS non configuré pour '+profil+'.');

  const message=genererSmsCerbereExpress20260827(profil);
  const texte=normaliserTexteSmsGsmCerbereExpress20260827_(message.texte);
  const service=serviceSmsOvhCerbereExpress20260827_();
  const payload={
    message:texte,
    receivers:[numero],
    senderForResponse:true,
    noStopClause:true
  };
  const resultat=requeteOvhSmsCerbereExpress20260827_('POST','/sms/'+encodeURIComponent(service)+'/jobs',JSON.stringify(payload));
  const out={
    ok:true,
    version:CERBERE_EXPRESS_SMS_OVH_VERSION,
    profil,
    serviceName:service,
    segmentsEstimes:estimerSegmentsSmsCerbereExpress20260827_(texte),
    creditsRetires:Number(resultat&&resultat.totalCreditsRemoved||0),
    ids:resultat&&resultat.ids||[],
    validReceivers:resultat&&resultat.validReceivers||[],
    invalidReceivers:resultat&&resultat.invalidReceivers||[]
  };
  console.log(JSON.stringify(out));
  return out;
}

/** Envoi volontaire aux deux profils ; échoue avant tout envoi si un numéro manque. */
function envoyerSmsOvhCerbereExpressAuxDeux20260827(){
  const a=numeroSmsCerbereExpress20260827_('principal');
  const b=numeroSmsCerbereExpress20260827_('conjointe');
  if(!a||!b)throw new Error('Les deux numéros doivent être configurés avant l’envoi groupé.');
  return {
    ok:true,
    version:CERBERE_EXPRESS_SMS_OVH_VERSION,
    principal:envoyerSmsOvhCerbereExpress20260827('principal'),
    conjointe:envoyerSmsOvhCerbereExpress20260827('conjointe')
  };
}

function serviceSmsOvhCerbereExpress20260827_(){
  const p=PropertiesService.getScriptProperties();
  const configure=String(p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.serviceName)||'').trim();
  if(configure)return configure;
  const services=requeteOvhSmsCerbereExpress20260827_('GET','/sms','');
  if(!Array.isArray(services)||services.length===0)throw new Error('Aucun compte SMS OVHcloud accessible.');
  if(services.length>1)throw new Error('Plusieurs comptes SMS OVHcloud trouvés : renseignez OVH_SMS_SERVICE_NAME dans les propriétés du script.');
  return String(services[0]);
}

function numeroSmsCerbereExpress20260827_(profil){
  const p=PropertiesService.getScriptProperties();
  const cle=profil==='conjointe'?CERBERE_EXPRESS_SMS_OVH_PROPS.conjointe:CERBERE_EXPRESS_SMS_OVH_PROPS.principal;
  return normaliserNumeroInternationalSmsCerbereExpress20260827_(p.getProperty(cle)||'');
}

function normaliserNumeroInternationalSmsCerbereExpress20260827_(numero){
  let n=String(numero||'').replace(/[\s.()\-]/g,'');
  if(/^0[67]\d{8}$/.test(n))n='+33'+n.slice(1);
  else if(/^0033\d{9}$/.test(n))n='+'+n.slice(2);
  if(!/^\+[1-9]\d{9,15}$/.test(n))return '';
  return n;
}

function requeteOvhSmsCerbereExpress20260827_(methode,path,body){
  const p=PropertiesService.getScriptProperties();
  const ak=String(p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.applicationKey)||'');
  const as=String(p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.applicationSecret)||'');
  const ck=String(p.getProperty(CERBERE_EXPRESS_SMS_OVH_PROPS.consumerKey)||'');
  if(!ak||!as||!ck)throw new Error('Identifiants API OVH SMS incomplets dans les propriétés du script.');

  methode=String(methode||'GET').toUpperCase();
  body=body==null?'':String(body);
  const url=CERBERE_EXPRESS_SMS_OVH_ENDPOINT+String(path||'');
  const timestamp=timestampOvhSmsCerbereExpress20260827_();
  const aSigner=[as,ck,methode,url,body,String(timestamp)].join('+');
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1,aSigner,Utilities.Charset.UTF_8);
  const signature='$1$'+digest.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
  const options={
    method:methode.toLowerCase(),
    muteHttpExceptions:true,
    headers:{
      'X-Ovh-Application':ak,
      'X-Ovh-Consumer':ck,
      'X-Ovh-Timestamp':String(timestamp),
      'X-Ovh-Signature':signature,
      'Accept':'application/json'
    }
  };
  if(body){options.contentType='application/json; charset=utf-8';options.payload=body;}
  const rep=UrlFetchApp.fetch(url,options);
  const code=rep.getResponseCode();
  const texte=rep.getContentText();
  if(code<200||code>=300){
    let detail=texte;
    try{const j=JSON.parse(texte);detail=j.message||j.errorCode||texte;}catch(e){}
    throw new Error('OVH SMS HTTP '+code+' : '+detail);
  }
  if(!texte)return null;
  try{return JSON.parse(texte);}catch(e){return texte;}
}

function timestampOvhSmsCerbereExpress20260827_(){
  const rep=UrlFetchApp.fetch(CERBERE_EXPRESS_SMS_OVH_ENDPOINT+'/auth/time',{method:'get',muteHttpExceptions:true});
  if(rep.getResponseCode()!==200)throw new Error('Impossible de synchroniser l’heure avec OVHcloud.');
  const n=Number(rep.getContentText());
  if(!Number.isFinite(n))throw new Error('Horodatage OVHcloud invalide.');
  return Math.floor(n);
}

/**
 * Évite de basculer tout le message en Unicode à cause des emoji / ponctuations typographiques.
 * OVH facture les SMS en segments ; rester en GSM-7 réduit fortement le nombre de crédits.
 */
function normaliserTexteSmsGsmCerbereExpress20260827_(texte){
  const map={
    '🐺':'','☀️':'','🌤️':'','🌧️':'','⛈️':'','⚠️':'',
    '—':'-','–':'-','’':"'",'‘':"'",'“':'"','”':'"','…':'...',
    'ê':'e','ë':'e','â':'a','ä':'a','á':'a','í':'i','î':'i','ï':'i','ô':'o','ö':'o','ó':'o','ú':'u','û':'u','ü':'u','ÿ':'y',
    'Ê':'E','Ë':'E','Â':'A','Ä':'A','Á':'A','Í':'I','Î':'I','Ï':'I','Ô':'O','Ö':'O','Ó':'O','Ú':'U','Û':'U','Ü':'U','Ÿ':'Y','œ':'oe','Œ':'OE'
  };
  let s=String(texte||'');
  Object.keys(map).forEach(k=>{s=s.split(k).join(map[k]);});
  return s.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}

function estimerSegmentsSmsCerbereExpress20260827_(texte){
  const n=String(texte||'').length;
  if(n<=160)return 1;
  return Math.ceil(n/153);
}
