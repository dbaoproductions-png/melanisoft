const CERBERE_CB_REPORT_HORS_CF_20260927_VERSION='2026-09-27.1';

/**
 * Report CB C1 -> C2 après exclusion des opérations déjà reconnues comme Charges_fixes.
 * Doctrine : une dépense CB liée à une charge fixe est portée par CFt2 et ne doit
 * jamais être retranchée une seconde fois dans reportCb.
 */
function calculerReportCbCycleSuivantHorsChargesFixes20260927_(base){
  const brut=calculerReportCbCycleSuivant20260905_(base);
  const lignes=Array.isArray(brut&&brut.lignes)?brut.lignes:[];
  if(!lignes.length)return Object.assign({},brut,{version:CERBERE_CB_REPORT_HORS_CF_20260927_VERSION,excluesChargesFixes:0,montantExcluChargesFixes:0});

  const ops=lireTable_('Operations')||[];
  const rap=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  const parId={};ops.forEach(function(o){parId[String(o&&o.id||'')]=o;});

  let exclu=0,nExclues=0;
  const gardees=[];
  lignes.forEach(function(l){
    const op=parId[String(l&&l.id||'')]||null;
    let cf='';
    if(op){
      if(typeof idCfPersisteCommun_==='function')cf=String(idCfPersisteCommun_(op,rap)||'').trim();
      else cf=String(op&&op.charge_fixe_id||'').trim();
    }
    if(cf){
      exclu+=Math.abs(Number(l&&l.montant||0));nExclues++;
      return;
    }
    gardees.push(l);
  });

  exclu=Math.round(exclu*100)/100;
  const montant=Math.round(gardees.reduce(function(s,l){return s+Math.abs(Number(l&&l.montant||0));},0)*100)/100;
  const diagnostic=Object.assign({},brut&&brut.diagnostic||{},{
    versionFiltre:CERBERE_CB_REPORT_HORS_CF_20260927_VERSION,
    rejetsChargeFixe:nExclues,
    montantExcluChargesFixes:exclu,
    doctrine:'CF liee persistante => exclue du report CB ; elle reste uniquement dans CFt2.'
  });
  return Object.assign({},brut,{
    version:CERBERE_CB_REPORT_HORS_CF_20260927_VERSION,
    montant:montant,
    lignes:gardees,
    diagnostic:diagnostic,
    excluesChargesFixes:nExclues,
    montantExcluChargesFixes:exclu
  });
}

function auditerReportCbHorsChargesFixes20260927(){
  const base=chargerCerbereCockpitBaseRapide20260903_();
  const brut=calculerReportCbCycleSuivant20260905_(base);
  const filtre=calculerReportCbCycleSuivantHorsChargesFixes20260927_(base);
  const out={
    ok:Number(filtre&&filtre.montant||0)<=Number(brut&&brut.montant||0),
    version:CERBERE_CB_REPORT_HORS_CF_20260927_VERSION,
    lectureSeule:true,
    brut:Number(brut&&brut.montant||0),
    horsChargesFixes:Number(filtre&&filtre.montant||0),
    montantExcluChargesFixes:Number(filtre&&filtre.montantExcluChargesFixes||0),
    nombreExclues:Number(filtre&&filtre.excluesChargesFixes||0),
    lignes:(filtre&&filtre.lignes||[]).slice(0,120)
  };
  console.log('[AUDIT REPORT CB HORS CF 20260927] '+JSON.stringify(out));
  return out;
}
