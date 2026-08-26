const PLUXEE_DEDUPE_FIX_VERSION='1.0.2';

/**
 * Le site Pluxee expose l'heure à la minute, le PDF à la seconde.
 * La clé métier est donc volontairement ramenée à la minute afin que
 * PDF et copier-coller reconnaissent la même transaction.
 */
function clePluxee_(iso,lib,m,type){
  const minute=String(iso||'').replace(/(T\d{2}:\d{2}).*$/,'$1');
  return ['PLUXEE',minute,String(Math.round(Math.abs(Number(m))*100)),normaliserTexteBanque_(lib),type].join('|');
}
