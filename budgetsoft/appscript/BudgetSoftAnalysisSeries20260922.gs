/*
 * BudgetSoft — séries temporelles du module Analyses — 2026-09-22.
 *
 * Doctrine :
 * - Revenus / Charges fixes / Pilotable : historique reconstruit exclusivement
 *   depuis le Réel Operations, sur les périodes canoniques d'Analyses.
 * - Pilotable : même classification P0 et même ventilation que Cerbère.
 * - Dettes / Capital : reconstruction historique uniquement lorsqu'une preuve
 *   existe (relevé/échéancier exact, journal d'amortissement, date de valeur
 *   d'un actif, mouvements d'un compte financier). Sinon la période reste vide.
 * - Dette : Crédits reste propriétaire. Capital : Patrimoine reste propriétaire.
 */
const BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION='2026-09-29.2';
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

function dateImputationChargeFixeAnalyse20260924_(o,cfId,chargesById){
  const c=chargesById&&chargesById[cfId]||{};
  const nom=String(c&&c.libelle||'').trim().toLowerCase();

  // Doctrine ciblée IONOS : quand le libellé bancaire porte une date économique
  // explicite "DU JJMMYY", on impute la dépense au mois correspondant.
  // Les autres charges fixes conservent la date bancaire canonique.
  if(nom==='ionos sarl'){
    const texte=String(o&&o.libelle_bancaire||o&&o.libelle||'');
    const m=texte.match(/\bDU\s+(\d{2})(\d{2})(\d{2})\b/i);
    if(m){
      const j=parseInt(m[1],10),mo=parseInt(m[2],10),a=2000+parseInt(m[3],10);
      const d=new Date(a,mo-1,j,12,0,0,0);
      if(!isNaN(d)&&d.getFullYear()===a&&d.getMonth()===mo-1&&d.getDate()===j)return d;
    }
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
    const d=dateImputationChargeFixeAnalyse20260924_(o,cfId,chargesById);
    if(!d)return;
    const idx=(periodes||[]).findIndex(function(p){const a=dateAnalyseSeries20260922_(p.debut),z=dateAnalyseSeries20260922_(p.fin);return a&&z&&d>=a&&d<=z;});
    if(idx>=0)cfVals[cfId][idx]+=Math.abs(m);
  });
  const cfParCategorie={};
  Object.keys(cfVals).forEach(function(id){
    const c=chargesById[id]||{};
    const cat=String(c.categorie||'Sans catégorie').trim()||'Sans catégorie';
    if(!cfParCategorie[cat])cfParCategorie[cat]=(periodes||[]).map(function(){return 0;});
    (cfVals[id]||[]).forEach(function(v,i){cfParCategorie[cat][i]+=Number(v||0);});
  });
  Object.keys(cfParCategorie).forEach(function(cat){
    cfParCategorie[cat]=cfParCategorie[cat].map(arrAnalyseSeries20260922_);
  });

  return{
    revenus:Object.assign({titre:'Revenus',unite:'€',source:'Operations · revenus économiques',doctrine:'Réel économique par cycle ; une ligne par catégorie canonique de revenu.'},seriesDepuisMatriceAnalyse20260922_(periodes,revenuCanon,revenusVals,'Total revenus')),
    chargesFixes:Object.assign({titre:'Charges fixes',unite:'€',source:'Operations · rapprochements Charges_fixes',doctrine:'Réel bancaire explicitement rattaché aux charges fixes ; total + une ligne par catégorie de charge fixe.'},seriesDepuisMatriceAnalyse20260922_(periodes,Object.keys(cfParCategorie).sort(function(a,b){return a.localeCompare(b,'fr');}),cfParCategorie,'Total charges fixes')),
    pilotable:Object.assign({titre:'Dépenses pilotables',unite:'€',source:'OperationsVentilation · P0 Cerbère',doctrine:'Même classification P0 que Cerbère ; CB imputées à la date d’achat, Santé nette, charges fixes exclues.'},seriesDepuisMatriceAnalyse20260922_(periodes,Object.keys(pilotVals).sort(function(a,b){return a.localeCompare(b,'fr');}),pilotVals,'Total pilotable'))
  };
}


function finPeriodeStructurelleAnalyse20260929_(p){
  const d=dateAnalyseSeries20260922_(p&&p.fin);if(!d)return null;
  d.setHours(23,59,59,999);return d;
}
function jourStructurelAnalyse20260929_(v){
  const d=dateAnalyseSeries20260922_(v);return d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';
}
function lireJournalAmortissementsAnalyseSeries20260929_(){
  try{
    const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Amortissements_credits');
    if(!sh||sh.getLastRow()<2)return[];
    const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(function(x){return String(x||'').trim();});
    return sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues().filter(function(r){return r.some(function(v){return v!==''&&v!==null;});}).map(function(r){
      const o={};h.forEach(function(k,i){if(k)o[k]=r[i] instanceof Date?r[i].toISOString():r[i];});return o;
    });
  }catch(e){return[];}
}
function referencesExactesCreditAnalyse20260929_(credit){
  const refs=[];
  function ajouter(x,source){
    if(!x)return;const d=dateAnalyseSeries20260922_(x.date),m=Number(x.capital);
    if(d&&Number.isFinite(m)&&m>=0)refs.push({date:d,capital:arrAnalyseSeries20260922_(m),source:String(source||x.source||'reference_exacte')});
  }
  try{if(typeof estCreditCasdenEcheancier20260915_==='function'&&estCreditCasdenEcheancier20260915_(credit))ajouter({date:'2026-08-04',capital:40562.30},'échéancier exact CASDEN · référence 04/08/2026');}catch(e){}
  try{if(typeof estCreditAccessio20260915_==='function'&&estCreditAccessio20260915_(credit))ajouter({date:'2026-09-04',capital:776.53},'relevé exact Accessio · après échéance 04/09/2026');}catch(e){}
  try{if(typeof referenceReleveCarrefourPass20260915_==='function')ajouter(referenceReleveCarrefourPass20260915_(credit),'relevé exact Carrefour PASS');}catch(e){}
  try{if(typeof referenceReleveFloa20260916_==='function')ajouter(referenceReleveFloa20260916_(credit),'relevé exact FLOA');}catch(e){}
  try{if(typeof referenceReleveOney20260916_==='function')ajouter(referenceReleveOney20260916_(credit),'relevé exact Oney');}catch(e){}
  try{if(typeof referenceSiteCofidis20260915_==='function')ajouter(referenceSiteCofidis20260915_(credit),'référence exacte espace Cofidis');}catch(e){}
  return refs.sort(function(a,b){return a.date-b.date;});
}
function capitalCreditHistoriqueAnalyse20260929_(credit,cible,journal){
  if(!credit||!cible)return null;
  const id=String(credit.id||''),nom=String(credit.nom||''),type=String(credit.type_credit||'amortissable').toLowerCase();
  const rows=(journal||[]).filter(function(x){
    if(String(x&&x.statut||'').toLowerCase()!=='applique')return false;
    return (id&&String(x&&x.credit_id||'')===id)||(!id&&nom&&String(x&&x.credit_nom||'')===nom);
  }).map(function(x){
    const d=dateAnalyseSeries20260922_(x&&x.date_operation),avant=Number(x&&x.capital_avant),apres=Number(x&&x.capital_apres);
    return d&&Number.isFinite(avant)&&Number.isFinite(apres)?{date:d,avant:avant,apres:apres,source:'journal amortissement · '+String(x&&x.methode||'')}:null;
  }).filter(Boolean).sort(function(a,b){return a.date-b.date;});

  const observations=referencesExactesCreditAnalyse20260929_(credit).slice();
  rows.forEach(function(x){if(x.date<=cible)observations.push({date:x.date,capital:x.apres,source:x.source});});
  observations.sort(function(a,b){return a.date-b.date;});
  const avant=observations.filter(function(x){return x.date<=cible;}).slice(-1)[0];
  if(avant)return{montant:arrAnalyseSeries20260922_(avant.capital),source:avant.source,date:jourStructurelAnalyse20260929_(avant.date)};

  // Pour un amortissable, le capital juste avant la première échéance journalisée
  // dans les 15 jours suivant la clôture est une preuve du CRD à cette clôture :
  // aucun nouveau tirage n'est possible entre les deux dates.
  if(type==='amortissable'){
    const apres=rows.find(function(x){return x.date>cible&&(x.date-cible)<=15*86400000;});
    if(apres)return{montant:arrAnalyseSeries20260922_(apres.avant),source:apres.source+' · capital avant échéance',date:jourStructurelAnalyse20260929_(apres.date)};
  }
  return null;
}
function dateSourceDetteAnalyse20260929_(dette){
  const txt=String(dette&&dette.commentaire||'');
  const m=txt.match(/(?:communiqu[ée]e?|constat[ée]e?|saisi[ée]e?|au)\D{0,18}(\d{1,2})\/(\d{1,2})\/(20\d{2})/i)||txt.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if(!m)return null;
  const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12);return isNaN(d)?null:d;
}
function idsDetteAnalyse20260929_(dette){
  return String(dette&&dette.operations_rapprochees||'').split(/[,\s;]+/).map(function(x){return x.trim();}).filter(Boolean);
}
function capitalDetteHorsCreditHistoriqueAnalyse20260929_(dette,cible,operations){
  const source=dateSourceDetteAnalyse20260929_(dette);if(!source||!cible||cible<source)return null;
  const initial=Math.max(0,Number(dette&&dette.montant_initial||0)),courant=Math.max(0,Number(dette&&dette.capital_restant||0));
  if(!Number.isFinite(initial))return null;
  const ids=new Set(idsDetteAnalyse20260929_(dette)),ops=(operations||[]).filter(function(o){return ids.has(String(o&&o.id||''));});
  const regleTotal=ops.reduce(function(s,o){return s+Math.abs(Number(o&&o.montant||0));},0);
  // Si le reste courant ne se réconcilie pas avec les règlements tracés, il y a
  // eu une correction manuelle non historisée : on refuse toute rétroprojection.
  if(Math.abs(Math.max(0,initial-regleTotal)-courant)>.011)return null;
  const regleAvant=ops.filter(function(o){
    const d=dateAnalyseSeries20260922_(o&&o.date_comptable||o&&o.date||o&&o.date_operation);return d&&d<=cible;
  }).reduce(function(s,o){return s+Math.abs(Number(o&&o.montant||0));},0);
  return{montant:arrAnalyseSeries20260922_(Math.max(0,initial-regleAvant)),source:'Dette · montant initial + règlements rapprochés',date:jourStructurelAnalyse20260929_(source)};
}
function valeurActifHistoriqueAnalyse20260929_(actif,cible){
  const d=dateAnalyseSeries20260922_(actif&&actif.date_valeur),v=Number(actif&&actif.valeur);
  if(!d||!cible||d>cible||!Number.isFinite(v)||v<0)return null;
  return{montant:arrAnalyseSeries20260922_(v),source:'Actifs · dernière valeur datée connue',date:jourStructurelAnalyse20260929_(d)};
}
function soldeFinancierHistoriqueAnalyse20260929_(ligne,cible,operations){
  if(!ligne||!cible)return null;
  const courant=Number(ligne.solde);if(!Number.isFinite(courant))return null;
  const cles=new Set([String(ligne.id||''),String(ligne.nom||'')].filter(Boolean));
  let apres=0;
  (operations||[]).forEach(function(o){
    if(!cles.has(String(o&&o.compte||'')))return;
    const d=dateAnalyseSeries20260922_(o&&o.date_comptable||o&&o.date);if(!d||d<=cible)return;
    const m=Number(o&&o.montant||0);if(Number.isFinite(m))apres+=m;
  });
  return{montant:arrAnalyseSeries20260922_(courant-apres),source:'Comptes · solde courant neutralisé des mouvements postérieurs',date:jourStructurelAnalyse20260929_(cible)};
}
function preuvesStructurellesAnalyse20260929_(periodes,credits,patrimoine,contexte){
  contexte=contexte||{};
  const journal=Array.isArray(contexte.journalAmortissements)?contexte.journalAmortissements:[],
        operations=Array.isArray(contexte.operations)?contexte.operations:[],
        dette={},capital={};

  function assurer(map,nom){if(!map[nom])map[nom]=(periodes||[]).map(function(){return null;});return map[nom];}
  (credits&&credits.amortissables||[]).forEach(function(x){
    const nom='Crédit · '+String(x&&x.nom||'Amortissable'),vals=assurer(dette,nom);
    (periodes||[]).forEach(function(p,i){const z=finPeriodeStructurelleAnalyse20260929_(p),r=capitalCreditHistoriqueAnalyse20260929_(x,z,journal);if(r)vals[i]=r;});
  });
  (credits&&credits.renouvelables||[]).forEach(function(x){
    const nom='Revolving · '+String(x&&x.nom||'Renouvelable'),vals=assurer(dette,nom);
    (periodes||[]).forEach(function(p,i){const z=finPeriodeStructurelleAnalyse20260929_(p),r=capitalCreditHistoriqueAnalyse20260929_(x,z,journal);if(r)vals[i]=r;});
  });
  (credits&&credits.dettes||credits&&credits.dettesActives||[]).forEach(function(x){
    const nom='Dette · '+String(x&&x.nom||'Hors crédit'),vals=assurer(dette,nom);
    (periodes||[]).forEach(function(p,i){const z=finPeriodeStructurelleAnalyse20260929_(p),r=capitalDetteHorsCreditHistoriqueAnalyse20260929_(x,z,operations);if(r)vals[i]=r;});
  });

  (patrimoine&&patrimoine.actifs||[]).forEach(function(x){
    const nom='Actif · '+String(x&&x.nom||x&&x.type||'Patrimoine'),vals=assurer(capital,nom);
    (periodes||[]).forEach(function(p,i){const z=finPeriodeStructurelleAnalyse20260929_(p),r=valeurActifHistoriqueAnalyse20260929_(x,z);if(r)vals[i]=r;});
  });
  (patrimoine&&patrimoine.livrets||[]).forEach(function(x){
    const nom='Livret · '+String(x&&x.nom||'Épargne'),vals=assurer(capital,nom);
    (periodes||[]).forEach(function(p,i){const z=finPeriodeStructurelleAnalyse20260929_(p),r=soldeFinancierHistoriqueAnalyse20260929_(x,z,operations);if(r)vals[i]=r;});
  });
  (patrimoine&&patrimoine.placements||[]).forEach(function(x){
    const nom='Placement · '+String(x&&x.nom||'Placement'),vals=assurer(capital,nom);
    (periodes||[]).forEach(function(p,i){const z=finPeriodeStructurelleAnalyse20260929_(p),r=soldeFinancierHistoriqueAnalyse20260929_(x,z,operations);if(r)vals[i]=r;});
  });
  return{dettes:dette,capital:capital};
}

function construireSeriesStructurellesAnalysesBudgetSoft20260922_(periodes,credits,patrimoine,historique,contexte){
  const cleSet=new Set((periodes||[]).map(clePeriodeAnalyseSeries20260922_));
  const hist=(historique||[]).filter(function(x){return cleSet.has(String(x&&x.periode||''));});
  const courant=periodes&&periodes.length?periodes[periodes.length-1]:null,cleCour=clePeriodeAnalyseSeries20260922_(courant);
  const preuves=preuvesStructurellesAnalyse20260929_(periodes,credits||{},patrimoine||{},contexte||{});

  function construire(famille,lignesCourantes,totalNom,titre,source,doctrine,totalCourantProprietaire){
    const noms=new Set(hist.filter(function(x){return String(x&&x.famille||'')===famille;}).map(function(x){return String(x&&x.sous_poste||'');}).filter(Boolean));
    (lignesCourantes||[]).forEach(function(x){noms.add(String(x.nom||''));});
    Object.keys(preuves[famille]||{}).forEach(function(n){noms.add(n);});
    const vals={},sourcesPreuves={};Array.from(noms).forEach(function(nom){vals[nom]=(periodes||[]).map(function(){return null;});sourcesPreuves[nom]=(periodes||[]).map(function(){return null;});});

    // 1. Historique explicitement enregistré : priorité absolue.
    hist.filter(function(x){return String(x&&x.famille||'')===famille;}).forEach(function(x){
      const nom=String(x&&x.sous_poste||''),idx=(periodes||[]).findIndex(function(p){return clePeriodeAnalyseSeries20260922_(p)===String(x&&x.periode||'');});
      if(idx>=0&&vals[nom]){vals[nom][idx]=Number(x&&x.montant||0);sourcesPreuves[nom][idx]='Historique structurel enregistré';}
    });

    // 2. Reconstruction prouvée : uniquement pour les cases encore vides.
    Object.keys(preuves[famille]||{}).forEach(function(nom){
      if(!vals[nom])vals[nom]=(periodes||[]).map(function(){return null;});
      (preuves[famille][nom]||[]).forEach(function(p,i){
        if(vals[nom][i]==null&&p&&Number.isFinite(Number(p.montant))){vals[nom][i]=Number(p.montant);sourcesPreuves[nom][i]=String(p.source||'preuve structurelle');}
      });
    });

    // 3. Période courante : le propriétaire courant est autoritaire.
    // Toute ancienne sous-série absente de ce propriétaire vaut 0 aujourd'hui :
    // cela empêche une dette soldée ou un actif supprimé de survivre par inertie
    // dans l'historique du cycle courant.
    const idxCour=(periodes||[]).findIndex(function(p){return clePeriodeAnalyseSeries20260922_(p)===cleCour;});
    if(idxCour>=0){
      Array.from(noms).forEach(function(nom){
        vals[nom][idxCour]=0;
        sourcesPreuves[nom][idxCour]='Absent du propriétaire courant · valeur 0';
      });
    }
    (lignesCourantes||[]).forEach(function(x){
      const nom=String(x.nom||'');if(!vals[nom])vals[nom]=(periodes||[]).map(function(){return null;});
      if(!sourcesPreuves[nom])sourcesPreuves[nom]=(periodes||[]).map(function(){return null;});
      if(idxCour>=0){vals[nom][idxCour]=Number(x.montant||0);sourcesPreuves[nom][idxCour]='Valeur propriétaire courante';}
    });

    const nomsTries=Array.from(noms).sort(function(a,b){return a.localeCompare(b,'fr');});
    const base=seriesDepuisMatriceAnalyse20260922_(periodes,nomsTries,vals,totalNom);
    // Hors période courante, un total structurel n'est publié que si TOUTES les
    // composantes connues de la série sont prouvées. Pour la période courante,
    // le total direct du propriétaire métier prévaut sur toute reconstruction.
    base.series[0].valeurs=(periodes||[]).map(function(_,i){
      if(i===idxCour&&Number.isFinite(Number(totalCourantProprietaire))){
        return arrAnalyseSeries20260922_(Number(totalCourantProprietaire));
      }
      const valeurs=nomsTries.map(function(n){return vals[n]&&vals[n][i];});
      if(!valeurs.length||valeurs.some(function(v){return v==null||!Number.isFinite(Number(v));}))return null;
      return arrAnalyseSeries20260922_(valeurs.reduce(function(s,v){return s+Number(v);},0));
    });
    const totalVals=base.series[0].valeurs,idxPremier=totalVals.findIndex(function(v){return v!=null;});
    const partiel=totalVals.some(function(v){return v==null;});
    return Object.assign({
      titre:titre,unite:'€',source:source,doctrine:doctrine,
      historiqueDepuis:idxPremier>=0?String((periodes[idxPremier]&&periodes[idxPremier].fin)||''):'',
      historiquePartiel:partiel,
      reconstructionStructurelle:true,
      preuves:sourcesPreuves
    },base);
  }

  return{
    dettes:construire('dettes',lignesDettesCourantesAnalyseSeries20260922_(credits),'Dette totale','Dette totale','Crédits / Dettes canoniques','Historique prouvé : relevés/échéanciers exacts et journal d’amortissement ; le total reste vide si une composante n’est pas démontrable.',Number(credits&&credits.endettementTotal)),
    capital:construire('capital',lignesCapitalCourantAnalyseSeries20260922_(patrimoine),'Capital total','Capital','Patrimoine · actifs bruts','Historique prouvé : valeurs d’actifs datées et mouvements des comptes financiers ; aucune valeur n’est inventée avant sa première preuve.',Number(patrimoine&&patrimoine.totalActifs))
  };
}

function construireSeriesAnalysesBudgetSoft20260922_(periodes,contexte){
  contexte=contexte||{};
  const flux=construireSeriesFluxAnalysesBudgetSoft20260922_(periodes,contexte.operations||[],contexte.categories||[],contexte.charges||[]);
  const struct=construireSeriesStructurellesAnalysesBudgetSoft20260922_(periodes,contexte.credits||{},contexte.patrimoine||{},contexte.historique||[],contexte);
  return{
    ok:true,version:BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION,
    revenus:flux.revenus,chargesFixes:flux.chargesFixes,pilotable:flux.pilotable,
    dettes:struct.dettes,capital:struct.capital,
    doctrine:'Flux historiques depuis Operations ; Dette/Capital reconstruits uniquement à partir de preuves structurelles datées.'
  };
}

function auditerSeriesAnalysesBudgetSoft20260922(){
  const r=chargerAnalysesBudgetairesV23(6),s=r&&r.seriesCourbes||null;
  const familles=['revenus','chargesFixes','pilotable','dettes','capital'];
  const controles=familles.map(function(k){const x=s&&s[k];return{code:'SERIE_'+k.toUpperCase(),ok:!!(x&&Array.isArray(x.labels)&&Array.isArray(x.series)&&x.series.length>=1),labels:x&&x.labels&&x.labels.length||0,series:x&&x.series&&x.series.length||0};});
  const out={ok:!!s&&controles.every(function(x){return x.ok;}),version:BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION,source:r&&r.sourceBudgetSoft||'',revisionBudgetSoft:r&&r.revisionBudgetSoft||'',controles:controles};
  console.log('[AUDIT SERIES ANALYSES 20260922] '+JSON.stringify(out));return out;
}


function auditerReconstructionStructurelleAnalysesBudgetSoft20260929(){
  const r=chargerAnalysesBudgetairesV23(6),s=r&&r.seriesCourbes||{};
  function resume(cfg){
    const series=cfg&&Array.isArray(cfg.series)?cfg.series:[],total=series.find(function(x){return x&&x.total;}),sous=series.filter(function(x){return x&&!x.total;});
    const labels=cfg&&cfg.labels||[];
    return{
      labels:labels,
      total:total&&total.valeurs||[],
      pointsTotalConnus:total&&Array.isArray(total.valeurs)?total.valeurs.filter(function(v){return v!=null;}).length:0,
      manquantesParPeriode:labels.map(function(label,i){return{periode:label,manquantes:sous.filter(function(s){return !s.valeurs||s.valeurs[i]==null;}).map(function(s){return s.nom;})};}),
      historiqueDepuis:cfg&&cfg.historiqueDepuis||'',
      historiquePartiel:!!(cfg&&cfg.historiquePartiel),
      reconstructionStructurelle:!!(cfg&&cfg.reconstructionStructurelle)
    };
  }
  const out={ok:!!(s&&s.dettes&&s.capital),lectureSeule:true,version:BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION,revisionBudgetSoft:r&&r.revisionBudgetSoft||'',dettes:resume(s.dettes),capital:resume(s.capital)};
  console.log('[AUDIT RECONSTRUCTION STRUCTURELLE ANALYSES 20260929] '+JSON.stringify(out));return out;
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


function auditerRegroupementCategoriesChargesFixesAnalyse20260924(nombrePeriodes){
  const nb=[3,6,12].includes(parseInt(nombrePeriodes,10))?parseInt(nombrePeriodes,10):6;
  const a=chargerAnalysesBudgetairesV23(nb),s=a&&a.seriesCourbes&&a.seriesCourbes.chargesFixes||null;
  const noms=s&&Array.isArray(s.series)?s.series.map(function(x){return String(x&&x.nom||'');}):[];
  const attendu=['Abonnements numériques','Animaux','Assurances','Crédits','Crédits revolving','Énergies','Frais bancaires','Impôts','Santé','Télécom / Internet / TV'];
  const categories=noms.filter(function(x){return x&&x!=='Total charges fixes';});
  const manquantes=attendu.filter(function(x){return !categories.includes(x);});
  const out={
    ok:!!s&&noms[0]==='Total charges fixes'&&manquantes.length===0&&categories.length<=attendu.length+1,
    lectureSeule:true,version:BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION,
    source:a&&a.sourceBudgetSoft||'',revisionBudgetSoft:a&&a.revisionBudgetSoft||'',
    labels:s&&s.labels||[],series:noms,categories:categories,manquantes:manquantes
  };
  console.log('[AUDIT REGROUPEMENT CATEGORIES CF ANALYSE 20260924] '+JSON.stringify(out));
  return out;
}


function auditerImputationIonosChargesFixesAnalyse20260924(nombrePeriodes){
  const nb=[3,6,12].includes(parseInt(nombrePeriodes,10))?parseInt(nombrePeriodes,10):6;
  const a=chargerAnalysesBudgetairesV23(nb);
  const periodes=a&&Array.isArray(a.periodes)?a.periodes:[];
  const charges=lireTable_('Charges_fixes')||[],chargesById={};
  charges.forEach(function(c){const id=String(c&&c.id||'').trim();if(id)chargesById[id]=c;});
  const ionos=charges.find(function(c){return String(c&&c.libelle||'').trim().toLowerCase()==='ionos sarl';})||null;
  const id=String(ionos&&ionos.id||'');
  const ops=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'
    ?dedoublonnerOperationsCartesBudgetSoft_(lireTable_('Operations')||[])
    :(lireTable_('Operations')||[]);
  const liens=construireLiensChargesFixesAnalyseSeries20260922_(ops);
  const lignes=ops.filter(function(o){
    const opId=String(o&&o.id||'').trim();
    return id&&(String(o&&o.charge_fixe_id||'').trim()===id||String(liens[opId]||'')===id);
  }).map(function(o){
    const dBanque=typeof dateOperationCouranteBudgetSoft_==='function'
      ?dateOperationCouranteBudgetSoft_(o):dateAnalyseSeries20260922_(o&&o.date_comptable||o&&o.date);
    const dEco=dateImputationChargeFixeAnalyse20260924_(o,id,chargesById);
    return{
      operation_id:String(o&&o.id||''),
      montant:Math.abs(Number(o&&o.montant||0)),
      dateBanque:dBanque?Utilities.formatDate(dBanque,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
      dateEconomique:dEco?Utilities.formatDate(dEco,Session.getScriptTimeZone(),'yyyy-MM-dd'):'',
      moisEconomique:dEco?Utilities.formatDate(dEco,Session.getScriptTimeZone(),'yyyy-MM'):'',
      libelle:String(o&&o.libelle_bancaire||o&&o.libelle||'')
    };
  });
  const totaux={};
  lignes.forEach(function(x){totaux[x.moisEconomique]=arrAnalyseSeries20260922_((totaux[x.moisEconomique]||0)+x.montant);});
  const courbe=a&&a.seriesCourbes&&a.seriesCourbes.chargesFixes||null;
  const serieAbos=courbe&&Array.isArray(courbe.series)?courbe.series.find(function(s){return String(s&&s.nom||'')==='Abonnements numériques';}):null;
  const out={
    ok:!!id,lectureSeule:true,version:BUDGETSOFT_ANALYSIS_SERIES_20260922_VERSION,
    charge_fixe_id:id,lignes:lignes,totauxEconomiques:totaux,
    labels:courbe&&courbe.labels||[],abonnementsNumeriques:serieAbos&&serieAbos.valeurs||[]
  };
  console.log('[AUDIT IMPUTATION IONOS CF ANALYSE 20260924] '+JSON.stringify(out));
  return out;
}
