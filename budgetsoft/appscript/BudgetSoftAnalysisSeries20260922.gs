/*
 * BudgetSoft — séries temporelles du module Analyses — 2026-09-22.
 *
 * Doctrine :
 * - Revenus / Charges fixes / Pilotable : historique reconstruit exclusivement
 *   depuis le Réel Operations, sur les périodes canoniques d'Analyses.
 * - Pilotable : même classification P0 et même ventilation que Cerbère.
 * - Dettes / Capital : aucune rétroprojection fictive. Les points structurels
 *   sont historisés après publication du snapshot global, un point par cycle.
 * - Dette : Crédits est propriétaire. Capital : Patrimoine est propriétaire.
 */
const BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION='2026-09-22.3';
const BUDGETSOFT_ANALYSIS_STRUCTURAL_HISTORY_SHEET_20260922='Analyse_HistoriqueStructurel';
const BUDGETSOFT_ANALYSIS_STRUCTURAL_HISTORY_HEADERS_20260922=[
  'periode','date_point','revision_budgetsoft','famille','sous_poste','montant','source','maj_le'
];

function arrAnalyseSeries20260922_(n){return Math.round(Number(n||0)*100)/100;}
function normAnalyseSeries20260922_(v){return String(v==null?'':v).trim();}
function dateAnalyseSeries20260922_(v){
  if(typeof dateValideVentilationBudgetSoft_==='function')return dateValideVentilationBudgetSoft_(v);
  const d=v instanceof Date?new Date(v):new Date(v||0);return isNaN(d)?null:d;
}
function clePeriodeAnalyseSeries20260922_(p){return String(p&&p.cle||'').trim()||String(p&&p.debut||'').slice(0,10);}
function libellePeriodeAnalyseSeries20260922_(p){return String(p&&p.libelle||clePeriodeAnalyseSeries20260922_(p));}

function assurerHistoriqueStructurelAnalyses20260922_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName(BUDGETSOFT_ANALYSIS_STRUCTURAL_HISTORY_SHEET_20260922);
  if(!sh)sh=ss.insertSheet(BUDGETSOFT_ANALYSIS_STRUCTURAL_HISTORY_SHEET_20260922);
  const h=BUDGETSOFT_ANALYSIS_STRUCTURAL_HISTORY_HEADERS_20260922;
  if(sh.getLastRow()===0)sh.getRange(1,1,1,h.length).setValues([h]);
  else{
    const width=Math.max(sh.getLastColumn(),h.length);
    const actuels=sh.getRange(1,1,1,width).getValues()[0].map(function(x){return String(x||'').trim();});
    const manquants=h.filter(function(x){return !actuels.includes(x);});
    if(manquants.length)sh.getRange(1,actuels.filter(Boolean).length+1,1,manquants.length).setValues([manquants]);
  }
  sh.setFrozenRows(1);
  return sh;
}

function lireHistoriqueStructurelAnalyses20260922_(){
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BUDGETSOFT_ANALYSIS_STRUCTURAL_HISTORY_SHEET_20260922);
  if(!sh||sh.getLastRow()<2)return[];
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(function(x){return String(x||'').trim();});
  return sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues().filter(function(r){return r.some(function(v){return v!==''&&v!==null;});}).map(function(r){
    const o={};h.forEach(function(k,i){if(k)o[k]=serialiserValeur_(r[i]);});return o;
  });
}

function lignesDettesCourantesAnalyseSeries20260922_(credits){
  credits=credits||{};
  const out=[];
  (credits.amortissables||[]).forEach(function(x){const m=Math.max(0,Number(x&&x.capital_restant||0));if(m>0)out.push({nom:'Crédit · '+String(x&&x.nom||'Amortissable'),montant:arrAnalyseSeries20260922_(m),source:'Crédits · amortissable'});});
  (credits.renouvelables||[]).forEach(function(x){const m=Math.max(0,Number(x&&x.capital_restant||0));if(m>0)out.push({nom:'Revolving · '+String(x&&x.nom||'Renouvelable'),montant:arrAnalyseSeries20260922_(m),source:'Crédits · revolving'});});
  (credits.dettesActives||[]).forEach(function(x){const m=Math.max(0,Number(x&&x.capital_restant||0));if(m>0)out.push({nom:'Dette · '+String(x&&x.nom||'Hors crédit'),montant:arrAnalyseSeries20260922_(m),source:'Dettes'});});
  return out;
}

function lignesCapitalCourantAnalyseSeries20260922_(patrimoine){
  patrimoine=patrimoine||{};
  const out=[];
  (patrimoine.actifs||[]).forEach(function(x){const m=Math.max(0,Number(x&&x.valeur||0));if(m>0)out.push({nom:'Actif · '+String(x&&x.nom||x&&x.type||'Patrimoine'),montant:arrAnalyseSeries20260922_(m),source:'Actifs'});});
  (patrimoine.livrets||[]).forEach(function(x){const m=Math.max(0,Number(x&&x.solde||0));if(m>0)out.push({nom:'Livret · '+String(x&&x.nom||'Épargne'),montant:arrAnalyseSeries20260922_(m),source:'Comptes · épargne'});});
  (patrimoine.placements||[]).forEach(function(x){const m=Math.max(0,Number(x&&x.solde||0));if(m>0)out.push({nom:'Placement · '+String(x&&x.nom||'Placement'),montant:arrAnalyseSeries20260922_(m),source:'Comptes · placement'});});
  return out;
}

function enregistrerHistoriqueStructurelAnalysesBudgetSoft20260922_(etat){
  try{
    etat=etat||((typeof lireEtatGlobalBudgetSoftSiDisponible20260906_==='function')?lireEtatGlobalBudgetSoftSiDisponible20260906_():null);
    if(!etat||!etat.modules)return{ok:false,ignore:true,raison:'snapshot global indisponible'};
    const analyses=etat.modules.analyses||{},variante=analyses.variantes&&(analyses.variantes['6']||analyses.variantes['3']||analyses.variantes['12']);
    const courante=variante&&variante.courante||null,periode=clePeriodeAnalyseSeries20260922_(courante);
    if(!periode)return{ok:false,ignore:true,raison:'période Analyses courante absente'};
    const revision=String(etat.revisionBudgetSoft||''),datePoint=String(etat.genereLe||new Date().toISOString());
    const lignes=[];
    lignesDettesCourantesAnalyseSeries20260922_(etat.modules.credits).forEach(function(x){lignes.push({periode:periode,date_point:datePoint,revision_budgetsoft:revision,famille:'dettes',sous_poste:x.nom,montant:x.montant,source:x.source,maj_le:new Date().toISOString()});});
    lignesCapitalCourantAnalyseSeries20260922_(etat.modules.patrimoine).forEach(function(x){lignes.push({periode:periode,date_point:datePoint,revision_budgetsoft:revision,famille:'capital',sous_poste:x.nom,montant:x.montant,source:x.source,maj_le:new Date().toISOString()});});
    if(!lignes.length)return{ok:true,ignore:true,raison:'aucun poste structurel'};
    const sh=assurerHistoriqueStructurelAnalyses20260922_(),h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(function(x){return String(x||'').trim();});
    const exist=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues():[];
    const idxPer=h.indexOf('periode'),idxFam=h.indexOf('famille'),idxSous=h.indexOf('sous_poste');
    const map={};exist.forEach(function(r,i){map[String(r[idxPer])+'|'+String(r[idxFam])+'|'+String(r[idxSous])]=i+2;});
    let ajoutes=0,maj=0;
    lignes.forEach(function(o){
      const key=o.periode+'|'+o.famille+'|'+o.sous_poste,row=h.map(function(k){return Object.prototype.hasOwnProperty.call(o,k)?o[k]:'';});
      if(map[key]){sh.getRange(map[key],1,1,h.length).setValues([row]);maj++;}
      else{sh.appendRow(row);ajoutes++;}
    });
    return{ok:true,version:BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION,periode:periode,revisionBudgetSoft:revision,ajoutes:ajoutes,misAJour:maj,lignes:lignes.length};
  }catch(e){return{ok:false,version:BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION,erreur:String(e&&e.message||e)};}
}

function construireLiensChargesFixesAnalyseSeries20260922_(operations){
  const liens={};
  (operations||[]).forEach(function(o){const id=String(o&&o.id||''),cf=String(o&&o.charge_fixe_id||'').trim();if(id&&cf)liens[id]=cf;});
  try{
    const rs=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
    rs.forEach(function(r){
      const op=String(r&&r.operation_id||'').trim(),cf=String(r&&r.charge_fixe_id||'').trim();
      let valide=false;
      if(typeof estRapprochementValideP1Cerbere20260912_==='function')valide=estRapprochementValideP1Cerbere20260912_(r);
      else valide=/valid|rapproch/i.test(String(r&&r.statut||r&&r.decision||''));
      if(op&&cf&&valide)liens[op]=cf;
    });
  }catch(e){}
  return liens;
}

function seriesDepuisMatriceAnalyse20260922_(periodes,noms,valeurs,totalNom){
  const labels=(periodes||[]).map(libellePeriodeAnalyseSeries20260922_);
  const series=(noms||[]).map(function(nom){return{id:'s_'+Utilities.base64EncodeWebSafe(String(nom)).replace(/=+$/,''),nom:String(nom),valeurs:(valeurs[nom]||[]).map(function(v){return v==null?null:arrAnalyseSeries20260922_(v);})};});
  const total=labels.map(function(_,i){return arrAnalyseSeries20260922_(series.reduce(function(s,x){const v=x.valeurs[i];return s+(v==null?0:Number(v));},0));});
  return{labels:labels,series:[{id:'total',nom:totalNom,total:true,valeurs:total}].concat(series)};
}


function dateImputationSalaireAnalyseSeries20260922_(o){
  const texte=[o&&o.libelle_bancaire,o&&o.libelle,o&&o.details,o&&o.commentaire].filter(Boolean).join(' ').toUpperCase();
  let m=texte.match(/\bPAYE\s*([01]?\d)[\s\/\-]+(20\d{2})\b/);
  if(!m)m=texte.match(/\bPAYE([01]?\d)[\s\/\-]?(20\d{2})\b/);
  if(m){
    const mois=Math.max(1,Math.min(12,parseInt(m[1],10))),annee=parseInt(m[2],10);
    if(Number.isFinite(mois)&&Number.isFinite(annee))return new Date(annee,mois-1,15,12,0,0,0);
  }
  return typeof dateOperationCouranteBudgetSoft_==='function'
    ?dateOperationCouranteBudgetSoft_(o)
    :dateAnalyseSeries20260922_(o&&o.date_comptable||o&&o.date);
}

function construireSerieSalairesEconomiqueAnalyse20260922_(periodes,operations){
  const vals=(periodes||[]).map(function(){return 0;});
  const dedup=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(operations||[]):operations||[];
  (dedup||[]).forEach(function(o){
    if(String(o&&o.categorie||'').trim()!=='Salaires')return;
    const montant=Number(o&&o.montant||0);if(!Number.isFinite(montant)||montant<=0)return;
    const d=dateImputationSalaireAnalyseSeries20260922_(o);if(!d)return;
    const idx=(periodes||[]).findIndex(function(p){
      const cle=clePeriodeAnalyseSeries20260922_(p),ym=Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM');
      return cle===ym;
    });
    if(idx>=0)vals[idx]+=montant;
  });
  return vals.map(arrAnalyseSeries20260922_);
}

function construireSeriesFluxAnalysesBudgetSoft20260922_(periodes,operations,categories,charges){
  const periodesVent=(periodes||[]).map(function(p){return{debut:p.debut,fin:p.fin};});
  const ops=(operations||[]).map(function(o){const x=Object.assign({},o);if(typeof categorieCibleBudgetSoft_==='function')x.categorie=categorieCibleBudgetSoft_(x.categorie);return x;});
  let canon=null;try{canon=typeof chargerCanonCerbereV1==='function'?chargerCanonCerbereV1():null;}catch(e){canon=null;}
  const p0Cats=new Set((canon&&canon.postes||[]).map(function(x){return String(x&&x.categorie||'').trim();}).filter(Boolean));
  const vent=construireVentilationOperationsBudgetSoft_(ops,categories||[],periodesVent,p0Cats);

  const revenuCanon=typeof categoriesRevenusBudgetSoftCanoniques20260921_==='function'?categoriesRevenusBudgetSoftCanoniques20260921_():['Salaires','France Travail','Cours','Concerts','Droits artistiques','Congés spectacles','Avantages employeur','Revenus fonciers','Prestations / aides','Revenus divers'];
  const revenusVals={};revenuCanon.forEach(function(c){revenusVals[c]=(periodes||[]).map(function(_,i){return Number(vent.buckets[i]&&vent.buckets[i].revenusReels&&vent.buckets[i].revenusReels[c]||0);});});
  if(revenuCanon.includes('Salaires'))revenusVals['Salaires']=construireSerieSalairesEconomiqueAnalyse20260922_(periodes,ops);

  const pilotVals={};Array.from(p0Cats).sort(function(a,b){return a.localeCompare(b,'fr');}).forEach(function(c){
    pilotVals[c]=(periodes||[]).map(function(_,i){const b=vent.buckets[i]||{};return Number(b.nonCbParCategorie&&b.nonCbParCategorie[c]||0)+Number(b.cbParCategorie&&b.cbParCategorie[c]||0);});
  });

  const chargesById={};(charges||[]).forEach(function(c){const id=String(c&&c.id||'').trim();if(id)chargesById[id]=c;});
  const nomsCf={};Object.keys(chargesById).forEach(function(id){nomsCf[id]=String(chargesById[id].libelle||id);});
  const liens=construireLiensChargesFixesAnalyseSeries20260922_(ops),cfVals={};
  Object.keys(nomsCf).forEach(function(id){cfVals[id]=(periodes||[]).map(function(){return 0;});});
  const dedup=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops):ops;
  (dedup||[]).forEach(function(o){
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||m>=0)return;
    const opId=String(o&&o.id||'');let cfId=String(o&&o.charge_fixe_id||'').trim()||liens[opId]||'';
    if(!cfId&&typeof chargeFixeLieeOperation20260828_==='function')cfId=String(chargeFixeLieeOperation20260828_(o)||'').trim();
    if(!cfId||!cfVals[cfId])return;
    const d=typeof dateOperationCouranteBudgetSoft_==='function'?dateOperationCouranteBudgetSoft_(o):dateAnalyseSeries20260922_(o&&o.date_comptable||o&&o.date);
    if(!d)return;
    const idx=(periodes||[]).findIndex(function(p){const a=dateAnalyseSeries20260922_(p.debut),z=dateAnalyseSeries20260922_(p.fin);return a&&z&&d>=a&&d<=z;});
    if(idx>=0)cfVals[cfId][idx]+=Math.abs(m);
  });
  const cfByName={};Object.keys(cfVals).forEach(function(id){
    let nom=nomsCf[id]||id;if(Object.prototype.hasOwnProperty.call(cfByName,nom))nom=nom+' · '+String(id).slice(0,6);
    cfByName[nom]=cfVals[id];
  });

  return{
    revenus:Object.assign({titre:'Revenus',unite:'€',source:'Operations · revenus économiques',doctrine:'Réel économique par cycle ; une ligne par catégorie canonique de revenu.'},seriesDepuisMatriceAnalyse20260922_(periodes,revenuCanon,revenusVals,'Total revenus')),
    chargesFixes:Object.assign({titre:'Charges fixes',unite:'€',source:'Operations · rapprochements Charges_fixes',doctrine:'Réel bancaire explicitement rattaché aux charges fixes ; une ligne par charge.'},seriesDepuisMatriceAnalyse20260922_(periodes,Object.keys(cfByName).sort(function(a,b){return a.localeCompare(b,'fr');}),cfByName,'Total charges fixes')),
    pilotable:Object.assign({titre:'Dépenses pilotables',unite:'€',source:'OperationsVentilation · P0 Cerbère',doctrine:'Même classification P0 que Cerbère ; CB imputées à la date d’achat, Santé nette, charges fixes exclues.'},seriesDepuisMatriceAnalyse20260922_(periodes,Object.keys(pilotVals).sort(function(a,b){return a.localeCompare(b,'fr');}),pilotVals,'Total pilotable'))
  };
}

function construireSeriesStructurellesAnalysesBudgetSoft20260922_(periodes,credits,patrimoine,historique){
  const cleSet=new Set((periodes||[]).map(clePeriodeAnalyseSeries20260922_));
  const hist=(historique||[]).filter(function(x){return cleSet.has(String(x&&x.periode||''));});
  const courant=periodes&&periodes.length?periodes[periodes.length-1]:null,cleCour=clePeriodeAnalyseSeries20260922_(courant);

  function construire(famille,lignesCourantes,totalNom,titre,source,doctrine){
    const noms=new Set(hist.filter(function(x){return String(x&&x.famille||'')===famille;}).map(function(x){return String(x&&x.sous_poste||'');}).filter(Boolean));
    (lignesCourantes||[]).forEach(function(x){noms.add(String(x.nom||''));});
    const vals={};Array.from(noms).forEach(function(nom){vals[nom]=(periodes||[]).map(function(){return null;});});
    hist.filter(function(x){return String(x&&x.famille||'')===famille;}).forEach(function(x){
      const nom=String(x&&x.sous_poste||''),idx=(periodes||[]).findIndex(function(p){return clePeriodeAnalyseSeries20260922_(p)===String(x&&x.periode||'');});
      if(idx>=0&&vals[nom])vals[nom][idx]=Number(x&&x.montant||0);
    });
    (lignesCourantes||[]).forEach(function(x){const nom=String(x.nom||'');if(!vals[nom])vals[nom]=(periodes||[]).map(function(){return null;});const idx=(periodes||[]).findIndex(function(p){return clePeriodeAnalyseSeries20260922_(p)===cleCour;});if(idx>=0)vals[nom][idx]=Number(x.montant||0);});
    const base=seriesDepuisMatriceAnalyse20260922_(periodes,Array.from(noms).sort(function(a,b){return a.localeCompare(b,'fr');}),vals,totalNom);
    base.series[0].valeurs=(periodes||[]).map(function(_,i){const presents=base.series.slice(1).map(function(s){return s.valeurs[i];}).filter(function(v){return v!=null;});return presents.length?arrAnalyseSeries20260922_(presents.reduce(function(s,v){return s+Number(v||0);},0)):null;});
    return Object.assign({titre:titre,unite:'€',source:source,doctrine:doctrine,historiqueDepuis:hist.length?String(hist.map(function(x){return x.date_point||'';}).sort()[0]||''):'',historiquePartiel:true},base);
  }

  return{
    dettes:construire('dettes',lignesDettesCourantesAnalyseSeries20260922_(credits),'Dette totale','Dette totale','Crédits / Dettes canoniques','Historique structurel enregistré à chaque cycle ; aucune rétroprojection antérieure au premier point fiable.'),
    capital:construire('capital',lignesCapitalCourantAnalyseSeries20260922_(patrimoine),'Capital total','Capital','Patrimoine · actifs bruts','Actifs patrimoniaux + livrets + placements ; aucune valeur historique inventée avant son premier point enregistré.')
  };
}

function construireSeriesAnalysesBudgetSoft20260922_(periodes,contexte){
  contexte=contexte||{};
  const flux=construireSeriesFluxAnalysesBudgetSoft20260922_(periodes,contexte.operations||[],contexte.categories||[],contexte.charges||[]);
  const struct=construireSeriesStructurellesAnalysesBudgetSoft20260922_(periodes,contexte.credits||{},contexte.patrimoine||{},contexte.historique||[]);
  return{
    ok:true,version:BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION,
    revenus:flux.revenus,chargesFixes:flux.chargesFixes,pilotable:flux.pilotable,
    dettes:struct.dettes,capital:struct.capital,
    doctrine:'Flux historiques depuis Operations ; structurel historisé sans rétroprojection fictive.'
  };
}

function auditerSeriesAnalysesBudgetSoft20260922(){
  const r=chargerAnalysesBudgetairesV23(6),s=r&&r.seriesCourbes||null;
  const familles=['revenus','chargesFixes','pilotable','dettes','capital'];
  const controles=familles.map(function(k){const x=s&&s[k];return{code:'SERIE_'+k.toUpperCase(),ok:!!(x&&Array.isArray(x.labels)&&Array.isArray(x.series)&&x.series.length>=1),labels:x&&x.labels&&x.labels.length||0,series:x&&x.series&&x.series.length||0};});
  const out={ok:!!s&&controles.every(function(x){return x.ok;}),version:BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION,source:r&&r.sourceBudgetSoft||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',controles:controles};
  console.log('[AUDIT SERIES ANALYSES 20260922] '+JSON.stringify(out));return out;
}


/**
 * Audit de preuve — imputation des salaires dans les courbes Analyses.
 * Lecture seule : aucune écriture, aucun recalcul métier alternatif.
 * Retourne, pour chaque période demandée, les opérations classées Salaires
 * et le total qui alimente la série correspondante.
 */
function auditerImputationSalairesAnalysesBudgetSoft20260922(nombrePeriodes){
  const nb=[3,6,12].includes(parseInt(nombrePeriodes,10))?parseInt(nombrePeriodes,10):6;
  const analyse=typeof chargerAnalysesBudgetairesV23==='function'?chargerAnalysesBudgetairesV23(nb):null;
  const periodes=analyse&&Array.isArray(analyse.periodes)?analyse.periodes:[];
  const operations=(lireTable_('Operations')||[]).map(function(o){
    const x=Object.assign({},o);
    if(typeof categorieCibleBudgetSoft_==='function')x.categorie=categorieCibleBudgetSoft_(x.categorie);
    return x;
  });

  const lignes=periodes.map(function(p){
    const cle=clePeriodeAnalyseSeries20260922_(p);
    const ops=operations.filter(function(o){
      if(String(o&&o.categorie||'').trim()!=='Salaires'||Number(o&&o.montant||0)<=0)return false;
      const d=dateImputationSalaireAnalyseSeries20260922_(o);
      if(!d)return false;
      const ym=Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM');
      return ym===cle;
    }).map(function(o){
      const dEco=dateImputationSalaireAnalyseSeries20260922_(o);
      const dBanque=typeof dateOperationCouranteBudgetSoft_==='function'
        ?dateOperationCouranteBudgetSoft_(o)
        :dateAnalyseSeries20260922_(o&&o.date_comptable||o&&o.date);
      return{
        id:String(o&&o.id||''),
        date:String(o&&o.date||''),
        dateComptable:String(o&&o.date_comptable||''),
        dateImputationBancaire:dBanque?Utilities.formatDate(dBanque,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
        dateImputationEconomique:dEco?Utilities.formatDate(dEco,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
        libelle:String(o&&o.libelle_bancaire||o&&o.libelle||o&&o.details||''),
        montant:arrAnalyseSeries20260922_(Number(o&&o.montant||0)),
        categorie:String(o&&o.categorie||'')
      };
    });
    const total=arrAnalyseSeries20260922_(ops.reduce(function(s,o){return s+Number(o&&o.montant||0);},0));
    return{
      cle:cle,
      libelle:libellePeriodeAnalyseSeries20260922_(p),
      debut:String(p&&p.debut||''),
      fin:String(p&&p.fin||''),
      totalSalaires:total,
      nombreOperations:ops.length,
      operations:ops
    };
  });

  const serie=analyse&&analyse.seriesCourbes&&analyse.seriesCourbes.revenus&&Array.isArray(analyse.seriesCourbes.revenus.series)
    ?analyse.seriesCourbes.revenus.series.find(function(s){return String(s&&s.nom||'')==='Salaires';})
    :null;
  const controles=lignes.map(function(x,i){
    const trace=serie&&Array.isArray(serie.valeurs)?Number(serie.valeurs[i]||0):null;
    return{
      periode:x.cle,
      totalOperations:x.totalSalaires,
      valeurSerie:trace,
      ok:trace!==null&&Math.abs(Number(trace)-Number(x.totalSalaires))<.01
    };
  });
  const out={
    ok:controles.every(function(x){return x.ok;}),
    lectureSeule:true,
    version:BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION,
    sourceAnalyse:analyse&&analyse.sourceBudgetSoft||'',
    revisionBudgetSoft:analyse&&analyse.revisionBudgetSoft||'',
    doctrine:'Preuve directe de la série Salaires selon le mois de paie explicite (PAYE MM YYYY) ; repli sur date_comptable puis date.',
    lignes:lignes,
    controles:controles
  };
  console.log('[AUDIT IMPUTATION SALAIRES ANALYSES 20260922] '+JSON.stringify(out));
  return out;
}
