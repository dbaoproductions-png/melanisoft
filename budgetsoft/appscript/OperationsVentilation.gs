const OPERATIONS_VENTILATION_VERSION = '1.0.1';

/**
 * Socle commun de lecture des opérations BudgetSoft.
 * - catégorie enregistrée = autorité ; Categories porte le type ;
 * - seules les orphelines tombent dans Divers ;
 * - CB différée = données structurées date_achat/carte_fin/cle_rapprochement ;
 * - Cerbère : CB de M => M+1 ; autres mouvements => date_comptable puis date ;
 * - réel CF0 = charge_fixe_id renseigné ;
 * - trésorerie livrée avec son signe.
 */
function construireVentilationOperationsBudgetSoft_(operations, categories, periodes) {
  const ref = construireReferentielCategoriesBudgetSoft_(categories || []);
  const ops = dedoublonnerOperationsCartesBudgetSoft_(operations || []);
  const buckets = (periodes || []).map(() => creerBucketVentilationBudgetSoft_());
  const stats = {source:(operations||[]).length,apresDedoublonnage:ops.length,doublonsCbRetires:(operations||[]).length-ops.length,orphelines:0,cbStructurees:0,chargesFixesReelles:0};

  ops.forEach(o => {
    const montant = Number(o.montant || 0);
    if (!Number.isFinite(montant) || Math.abs(montant) < .0001) return;
    const catBrute = String(o.categorie || '').trim();
    const catValide = catBrute && Object.prototype.hasOwnProperty.call(ref, catBrute);
    const categorie = catValide ? catBrute : 'Divers';
    const typeCategorie = catValide ? ref[catBrute].type : 'orpheline';
    if (!catValide) stats.orphelines++;

    const chargeFixe = !!String(o.charge_fixe_id || '').trim();
    if (chargeFixe) stats.chargesFixesReelles++;
    const cb = estCarteStructureeBudgetSoft_(o, montant);
    if (cb) stats.cbStructurees++;
    const dateImputation = cb ? dateImputationCarteCerbereBudgetSoft_(o) : dateOperationCouranteBudgetSoft_(o);
    if (!dateImputation) return;
    const pi = indicePeriodeVentilationBudgetSoft_(dateImputation, periodes || []);
    if (pi < 0) return;

    const b = buckets[pi]; b.operations++;
    if (!catValide) b.orphelines[categorie] = (b.orphelines[categorie] || 0) + 1;
    if (chargeFixe) { b.chargesFixesReelles += Math.abs(Math.min(0, montant)); b.nombreChargesFixesReelles++; return; }

    // Santé nette : un remboursement diminue le coût Santé et n'est pas recompté comme renfort.
    if (categorie === 'Santé' && montant < 0) { if (cb) b.santeCb += Math.abs(montant); else b.santeNonCb += Math.abs(montant); return; }
    if (catBrute === 'Remboursements santé' && montant > 0) { b.santeRemboursements += montant; return; }

    if (typeCategorie === 'tresorerie') {
      b.tresorerieNette += montant;
      if (montant > 0) b.tresoreriePositive += montant; else b.tresorerieNegative += Math.abs(montant);
      return;
    }
    if (typeCategorie === 'revenu' || (typeCategorie === 'orpheline' && montant > 0)) {
      if (montant > 0) { b.revenusReels[categorie] = (b.revenusReels[categorie] || 0) + montant; b.revenusReelsTotal += montant; }
      return;
    }
    if (montant < 0) {
      const cible = cb ? b.cbParCategorie : b.nonCbParCategorie;
      cible[categorie] = (cible[categorie] || 0) + Math.abs(montant);
      if (cb) b.cbTotal += Math.abs(montant); else b.nonCbTotal += Math.abs(montant);
    }
  });

  buckets.forEach(b => {
    const netSante = Math.max(0, b.santeNonCb + b.santeCb - b.santeRemboursements);
    const cbNet = Math.min(b.santeCb, netSante), nonCbNet = Math.max(0, netSante - cbNet);
    if (nonCbNet > 0) b.nonCbParCategorie['Santé'] = nonCbNet;
    if (cbNet > 0) b.cbParCategorie['Santé'] = cbNet;
    b.nonCbTotal = sommeObjetVentilationBudgetSoft_(b.nonCbParCategorie);
    b.cbTotal = sommeObjetVentilationBudgetSoft_(b.cbParCategorie);
    b.santeNette = arrondirVentilationBudgetSoft_(netSante);
    ['tresorerieNette','tresoreriePositive','tresorerieNegative','revenusReelsTotal','chargesFixesReelles'].forEach(k=>b[k]=arrondirVentilationBudgetSoft_(b[k]));
  });
  return {version:OPERATIONS_VENTILATION_VERSION,referentiel:ref,buckets,stats};
}

function construireReferentielCategoriesBudgetSoft_(categories) {
  const out = {};
  (categories || []).forEach(c => { const nom=String(c.nom||'').trim(); if(!nom)return; out[nom]={type:String(c.type||'').trim().toLowerCase()||'inconnu',famille:String(c.famille_analytique||'').trim()||nom,actif:String(c.actif).toLowerCase()!=='false'}; });
  return out;
}
function creerBucketVentilationBudgetSoft_(){return{operations:0,nonCbParCategorie:{},cbParCategorie:{},revenusReels:{},orphelines:{},nonCbTotal:0,cbTotal:0,revenusReelsTotal:0,tresorerieNette:0,tresoreriePositive:0,tresorerieNegative:0,chargesFixesReelles:0,nombreChargesFixesReelles:0,santeNonCb:0,santeCb:0,santeRemboursements:0,santeNette:0};}

/**
 * Un même achat peut exister en ligne FLOW provisoire puis PDF définitive.
 * La clé métier utilise les champs structurés de cle_rapprochement lorsqu'ils sont
 * présents (date d'achat, cents, marchand, carte), puis les colonnes dédiées.
 * La ligne définitive gagne ; sa catégorie devient donc la catégorie autoritaire.
 */
function dedoublonnerOperationsCartesBudgetSoft_(operations) {
  const groupes={},horsCb=[];
  (operations||[]).forEach((o,index)=>{
    const m=Number(o.montant||0); if(!estCarteStructureeBudgetSoft_(o,m)){horsCb.push({o,index});return;}
    const meta=metaCleRapprochementBudgetSoft_(o),d=dateAchatMetierBudgetSoft_(o);
    const date=d?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';
    const carte=(meta.carte||String(o.carte_fin||'')).replace(/\D/g,'').slice(-4);
    const cents=meta.cents||String(Math.round(Math.abs(m)*100));
    const marchand=normaliserTexteVentilationBudgetSoft_(meta.marchand||o.marchand_normalise||o.libelle||o.libelle_bancaire||'');
    const cle=[date,carte,cents,marchand].join('|');
    (groupes[cle]||(groupes[cle]=[])).push({o,index});
  });
  const gardees=horsCb.slice();
  Object.keys(groupes).forEach(cle=>{const rows=groupes[cle];rows.sort((a,b)=>scoreStatutBancaireVentilationBudgetSoft_(b.o)-scoreStatutBancaireVentilationBudgetSoft_(a.o)||b.index-a.index);gardees.push(rows[0]);});
  gardees.sort((a,b)=>a.index-b.index);return gardees.map(x=>x.o);
}
function scoreStatutBancaireVentilationBudgetSoft_(o){const s=normaliserTexteVentilationBudgetSoft_(o&&o.statut_bancaire);if(s==='definitif')return 3;if(s==='provisoire')return 1;return 2;}
function metaCleRapprochementBudgetSoft_(o){
  const s=String(o&&o.cle_rapprochement||''),p=s.split('|');
  if(p.length>=7&&/^\d{4}-\d{2}-\d{2}$/.test(p[3]||''))return{dateAchat:p[3],cents:String(p[4]||''),marchand:String(p[5]||''),carte:String(p[6]||'')};
  return{dateAchat:'',cents:'',marchand:'',carte:''};
}
function dateAchatMetierBudgetSoft_(o){const m=metaCleRapprochementBudgetSoft_(o);return dateValideVentilationBudgetSoft_(m.dateAchat)||dateValideVentilationBudgetSoft_(o&&o.date_achat);}
function carteMetierBudgetSoft_(o){const m=metaCleRapprochementBudgetSoft_(o);return String(m.carte||o&&o.carte_fin||'').trim();}
function estCarteStructureeBudgetSoft_(o,montant){if(Number(montant)>=0)return false;return !!dateAchatMetierBudgetSoft_(o)&&!!carteMetierBudgetSoft_(o);}
function dateImputationCarteCerbereBudgetSoft_(o){const d=dateAchatMetierBudgetSoft_(o);if(!d)return null;const debut=d.getDate()>=28?new Date(d.getFullYear(),d.getMonth(),28):new Date(d.getFullYear(),d.getMonth()-1,28);return new Date(debut.getFullYear(),debut.getMonth()+1,28);}
function dateOperationCouranteBudgetSoft_(o){return dateValideVentilationBudgetSoft_(o&&o.date_comptable)||dateValideVentilationBudgetSoft_(o&&o.date);}
function dateValideVentilationBudgetSoft_(v){if(!v)return null;const d=v instanceof Date?new Date(v.getTime()):new Date(v);return isNaN(d.getTime())?null:d;}
function indicePeriodeVentilationBudgetSoft_(date,periodes){const d=dateValideVentilationBudgetSoft_(date);if(!d)return-1;const t=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();for(let i=0;i<(periodes||[]).length;i++){const p=periodes[i].periode||periodes[i],a=dateValideVentilationBudgetSoft_(p.debut),z=dateValideVentilationBudgetSoft_(p.fin);if(!a||!z)continue;const ta=new Date(a.getFullYear(),a.getMonth(),a.getDate()).getTime(),tz=new Date(z.getFullYear(),z.getMonth(),z.getDate()).getTime();if(t>=ta&&t<=tz)return i;}return-1;}
function sommeObjetVentilationBudgetSoft_(o){return arrondirVentilationBudgetSoft_(Object.keys(o||{}).reduce((s,k)=>s+Math.max(0,Number(o[k]||0)),0));}
function arrondirVentilationBudgetSoft_(n){return Math.round(Number(n||0)*100)/100;}
function normaliserTexteVentilationBudgetSoft_(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
