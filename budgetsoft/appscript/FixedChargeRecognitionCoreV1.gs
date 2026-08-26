const FIXED_CHARGE_RECOGNITION_CORE_VERSION='1.0.2';

/**
 * Coeur commun de reconnaissance des charges fixes.
 * Principe anti-regression : Operations reste souverain et Cerbere ne change pas
 * de resultat tant que la parite avec son moteur stabilise 3.7.22 n'est pas prouvee.
 * PDF et copier-coller sont normalises avant reconnaissance.
 */
function normaliserOperationCfCommune_(o){
  o=o||{};
  const brut=String(o.libelle_bancaire||o.details||o.libelle||'').trim();
  const d=typeof dateLocaleBudgetSoft_==='function'?dateLocaleBudgetSoft_(o.date_comptable||o.date||o.date_achat||''):new Date(o.date_comptable||o.date||o.date_achat||'');
  const m=Number(o.montant||0),type=String(o.type||'').toLowerCase()==='revenu'||m>0?'revenu':'depense';
  const motif=typeof extraireMotifStableBanque_==='function'?extraireMotifStableBanque_(brut):(typeof normaliserTexteBanque_==='function'?normaliserTexteBanque_(brut):String(brut).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim());
  return {id:String(o.id||''),date:d,date_comptable:d,date_achat:o.date_achat||'',libelle:brut,libelle_bancaire:brut,motif_bancaire_stable:String(motif||''),marchand_normalise:String(o.marchand_normalise||''),carte_fin:String(o.carte_fin||''),compte:String(o.compte||''),montant:type==='depense'?-Math.abs(m):Math.abs(m),type:type,source_bancaire:String(o.source_bancaire||''),statut_bancaire:String(o.statut_bancaire||''),charge_fixe_id:String(o.charge_fixe_id||''),commentaire:String(o.commentaire||'')};
}

function idCfPersisteCommun_(o,rapprochements){
  const direct=String(o&&o.charge_fixe_id||'').trim();if(direct)return direct;
  const m=String(o&&o.commentaire||'').match(/\[CHARGE_FIXE:([^\]]+)\]/i);if(m&&m[1])return String(m[1]).trim();
  const id=String(o&&o.id||'').trim();if(!id)return'';
  const r=(rapprochements||[]).find(x=>String(x&&x.operation_id||'').trim()===id&&/valid/i.test(String(x&&x.statut||'')));
  return r?String(r.charge_fixe_id||'').trim():'';
}

function reconnaitreChargeFixeCommune_(operation,charges,rapprochements){
  const canon=normaliserOperationCfCommune_(operation);if(canon.type!=='depense')return null;
  const persist=idCfPersisteCommun_(operation,rapprochements);if(persist){const c=(charges||[]).find(x=>String(x&&x.id||'').trim()===persist)||null;return{charge_fixe_id:persist,charge:c,source:'persisted',score:100,operation:canon};}
  // Reconnaissance automatique en ecriture : STRICTEMENT le matcher PDF historique.
  if(typeof rapprocherChargeFixe_==='function'){
    const r=rapprocherChargeFixe_(canon.libelle_bancaire,Math.abs(canon.montant),canon.compte,charges||[],canon.date_comptable);
    if(r&&r.charge)return{charge_fixe_id:String(r.charge.id||''),charge:r.charge,source:'legacy_pdf_matcher',score:Number(r.score||0),legacy:r,operation:canon};
  }
  // Evaluateur Operations : diagnostic/proposition, jamais auto-persiste par le coeur.
  if(typeof evaluerRapprochementChargeFixe_==='function'){
    const cs=(charges||[]).map(c=>{const r=evaluerRapprochementChargeFixe_(c,canon);return r?{charge:c,r:r}:null;}).filter(Boolean).sort((a,b)=>Number(b.r.score||0)-Number(a.r.score||0));
    if(cs.length&&Number(cs[0].r.score||0)>=55&&(!cs[1]||Number(cs[1].r.score||0)<Number(cs[0].r.score||0)))return{charge_fixe_id:String(cs[0].charge.id||''),charge:cs[0].charge,source:'operations_evaluator',score:Number(cs[0].r.score||0),legacy:cs[0].r,operation:canon};
  }
  return null;
}

/**
 * Construction commune des liens pour les calculs de masse.
 * Tant que la migration n'est pas entierement certifiee, la sortie est EXACTEMENT
 * celle du moteur Cerbere stabilise 3.7.22 lorsqu'il est disponible. Cela evite
 * toute regression de CFt1/HEt1 pendant l'unification. Le coeur commun devient
 * donc la porte d'entree, mais conserve la semantique validee.
 */
function construireLiensChargesFixesCommuns_(operations,charges,rapprochements){
  if(typeof construireLiensCfV3717_==='function'){
    const legacy=construireLiensCfV3717_(operations||[],charges||[],rapprochements||[]);
    const copie={};Object.keys(legacy||{}).forEach(k=>copie[k]=legacy[k]);
    return copie;
  }
  const out={};(operations||[]).forEach(o=>{const id=String(o&&o.id||'').trim();if(!id)return;const r=reconnaitreChargeFixeCommune_(o,charges||[],rapprochements||[]);if(r&&r.charge_fixe_id)out[id]=r.charge_fixe_id;});return out;
}

/** Audit LECTURE SEULE : aucune decision Operations existante ne doit regresser. */
function auditerNonRegressionReconnaissanceChargesFixesCommune(){
  verifierInitialisation_();
  const ops=lireTable_('Operations'),charges=lireTable_('Charges_fixes').filter(c=>typeof convertirBooleen_==='function'?convertirBooleen_(c.actif):c.actif!==false),rap=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  let depenses=0,persistes=0,reconnus=0,ecarts=0,pdf=0,flux=0,autres=0;const details=[];
  ops.forEach(o=>{const c=normaliserOperationCfCommune_(o);if(c.type!=='depense')return;depenses++;const src=String(o.source_bancaire||'').toLowerCase();if(src.indexOf('pdf')>=0)pdf++;else if(src==='flux'||src.indexOf('clipboard')>=0)flux++;else autres++;const ancien=idCfPersisteCommun_(o,rap);if(ancien)persistes++;const n=reconnaitreChargeFixeCommune_(o,charges,rap),nid=n?String(n.charge_fixe_id||''):'';if(nid)reconnus++;if(ancien&&nid!==ancien){ecarts++;details.push({operation_id:String(o.id||''),source:src,libelle:c.libelle_bancaire,montant:c.montant,ancien:ancien,nouveau:nid,origine:n&&n.source||''});}});
  const resultat={ok:ecarts===0,version:FIXED_CHARGE_RECOGNITION_CORE_VERSION,lectureSeule:true,depenses:depenses,sources:{pdf:pdf,flux:flux,autres:autres},liensPersistes:persistes,reconnusParCoeurCommun:reconnus,regressionsPersistantes:ecarts,details:details.slice(0,100),doctrine:'Operations inchange tant que regressionsPersistantes != 0. PDF et copier-coller convergent apres normalisation bancaire.'};
  Logger.log('=== AUDIT NON-REGRESSION CHARGES FIXES ===');Logger.log('Version coeur commun : %s',resultat.version);Logger.log('Mode : LECTURE SEULE — aucune feuille modifiee');Logger.log('Depenses analysees : %s',depenses);Logger.log('Sources : PDF=%s | flux/copier-coller=%s | autres=%s',pdf,flux,autres);Logger.log('Liens CF deja persistes : %s',persistes);Logger.log('Reconnaissances par coeur commun : %s',reconnus);Logger.log('Regressions persistantes : %s',ecarts);
  if(details.length){Logger.log('--- DETAILS DES REGRESSIONS ---');details.slice(0,100).forEach((d,i)=>Logger.log('#%s op=%s | source=%s | montant=%s | ancien=%s | nouveau=%s | origine=%s | libelle=%s',i+1,d.operation_id,d.source,d.montant,d.ancien,d.nouveau||'(aucun)',d.origine||'(aucune)',d.libelle));}
  Logger.log(ecarts===0?'VERDICT : OK — aucune regression persistante':'VERDICT : STOP — regression(s) detectee(s), aucune bascule autorisee');Logger.log('=== FIN AUDIT ===');return resultat;
}

/**
 * Audit LECTURE SEULE de parite Cerbere. Il compare la porte d'entree commune a
 * la semantique 3.7.22. Ce test aurait bloque la regression observee en 3.7.23.
 */
function auditerPariteCerbereChargesFixesCommune(){
  verifierInitialisation_();
  const ops=lireTable_('Operations'),charges=lireTable_('Charges_fixes').filter(c=>typeof convertirBooleen_==='function'?convertirBooleen_(c.actif):c.actif!==false),rap=typeof lireRapprochementsChargesFixes==='function'?lireRapprochementsChargesFixes():[];
  if(typeof construireLiensCfV3717_!=='function')throw new Error('Moteur Cerbere 3.7.22 de reference indisponible.');
  const ref=construireLiensCfV3717_(ops,charges,rap),commun=construireLiensChargesFixesCommuns_(ops,charges,rap),ids=new Set(Object.keys(ref||{}).concat(Object.keys(commun||{}))),details=[];
  ids.forEach(id=>{const a=String(ref&&ref[id]||''),b=String(commun&&commun[id]||'');if(a!==b){const o=ops.find(x=>String(x&&x.id||'')===String(id))||{};details.push({operation_id:id,reference:a,commun:b,source:String(o.source_bancaire||''),libelle:String(o.libelle_bancaire||o.libelle||''),montant:Number(o.montant||0)});}});
  const res={ok:details.length===0,version:FIXED_CHARGE_RECOGNITION_CORE_VERSION,liensReference:Object.keys(ref||{}).length,liensCommuns:Object.keys(commun||{}).length,ecarts:details.length,details:details.slice(0,100)};
  Logger.log('=== AUDIT PARITE CERBERE / COEUR COMMUN ===');Logger.log('Version coeur commun : %s',res.version);Logger.log('Liens reference 3.7.22 : %s',res.liensReference);Logger.log('Liens coeur commun : %s',res.liensCommuns);Logger.log('Ecarts : %s',res.ecarts);if(details.length)details.slice(0,100).forEach((d,i)=>Logger.log('#%s op=%s | ref=%s | commun=%s | source=%s | montant=%s | libelle=%s',i+1,d.operation_id,d.reference,d.commun,d.source,d.montant,d.libelle));Logger.log(res.ok?'VERDICT : OK — parite exacte':'VERDICT : STOP — parite non atteinte');Logger.log('=== FIN AUDIT PARITE ===');return res;
}

function comparerDeuxFormatsPourChargeFixeCommune(opPdf,opCopierColler){
  const a=normaliserOperationCfCommune_(opPdf||{}),b=normaliserOperationCfCommune_(opCopierColler||{});return{memeCompte:a.compte===b.compte,memeMontant:Math.abs(Math.abs(a.montant)-Math.abs(b.montant))<.011,memeMotif:a.motif_bancaire_stable===b.motif_bancaire_stable,motifPdf:a.motif_bancaire_stable,motifCopierColler:b.motif_bancaire_stable,canonPdf:a,canonCopierColler:b};
}
