const BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION='2026-09-07.1';
const BUDGETSOFT_TREASURY_CANONICAL_OWNER='construireTrajectoireTresorerieCanoniqueBudgetSoft20260907';

function arrondiTresorerieCanonique20260907_(n){return Math.round((Number(n)||0)*100)/100;}
function estCbTresorerieCanonique20260907_(l){
  const s=String((l&&l.categorie||'')+' '+(l&&l.libelle||'')+' '+(l&&l.preuve||'')).toLowerCase();
  return /\bcb\b|carte|débit différé|debit differe/.test(s);
}
function sommeLignesTresorerieCanonique20260907_(ls){return arrondiTresorerieCanonique20260907_((ls||[]).reduce((s,x)=>s+Number(x&&x.montantSigne||0),0));}
function groupeTresorerieCanonique20260907_(nom,ls){return{nom:nom,montant:sommeLignesTresorerieCanonique20260907_(ls),nombre:(ls||[]).length,lignes:(ls||[])};}

function decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(r){
  const lignes=Array.isArray(r&&r.lignes)?r.lignes:[];
  const revenus=lignes.filter(x=>x.source==='revenu_recurrent');
  const charges=lignes.filter(x=>x.source==='charge_fixe');
  const cbCertaines=lignes.filter(x=>x.source==='operation_future'&&estCbTresorerieCanonique20260907_(x));
  const operationsCertaines=lignes.filter(x=>x.source==='operation_future'&&!estCbTresorerieCanonique20260907_(x));
  const plan=lignes.filter(x=>x.source==='evenement'||x.source==='action');
  const cbEstimees=lignes.filter(x=>x.source==='debit_cb_estime');
  const autres=lignes.filter(x=>!['revenu_recurrent','charge_fixe','operation_future','evenement','action','debit_cb_estime'].includes(String(x.source||'')));
  const groupes={
    recettesCanoniquesRestantes:groupeTresorerieCanonique20260907_('recettes_canoniques_restantes',revenus),
    chargesFixesRestantes:groupeTresorerieCanonique20260907_('charges_fixes_restantes',charges),
    cbDiffereesEngagees:groupeTresorerieCanonique20260907_('cb_differees_engagees',cbCertaines),
    operationsFuturesCertaines:groupeTresorerieCanonique20260907_('operations_futures_certaines',operationsCertaines),
    effetsPlanConfirmes:groupeTresorerieCanonique20260907_('effets_plan_confirmes',plan),
    cbDiffereesResiduelEstime:groupeTresorerieCanonique20260907_('cb_differees_residuel_estime',cbEstimees),
    autres:groupeTresorerieCanonique20260907_('autres',autres)
  };
  const sommeGroupes=arrondiTresorerieCanonique20260907_(Object.keys(groupes).reduce((s,k)=>s+Number(groupes[k].montant||0),0));
  const sommeLignes=sommeLignesTresorerieCanonique20260907_(lignes);
  const soldeReel=arrondiTresorerieCanonique20260907_(r&&r.soldeReel);
  const soldeCalcule=arrondiTresorerieCanonique20260907_(soldeReel+sommeLignes);
  const soldePublie=arrondiTresorerieCanonique20260907_(r&&r.soldePrevisionnel);
  const pilotableProgressif=lignes.filter(x=>x.source==='pilotable');
  const erreurs=[];
  if(Math.abs(sommeGroupes-sommeLignes)>.01)erreurs.push('Somme des groupes différente de la somme des lignes.');
  if(Math.abs(soldeCalcule-soldePublie)>.01)erreurs.push('Solde publié non réconcilié avec le solde réel et les flux.');
  if(pilotableProgressif.length)erreurs.push('Présence interdite de pilotable progressif dans la trajectoire bancaire.');
  return{
    version:BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION,
    ok:erreurs.length===0,
    soldeReel:soldeReel,
    variationPrevue:sommeLignes,
    soldePrevisionnel:soldePublie,
    groupes:groupes,
    controles:{sommeGroupes:sommeGroupes,sommeLignes:sommeLignes,soldeCalcule:soldeCalcule,soldePublie:soldePublie,pilotableProgressif:pilotableProgressif.length},
    erreurs:erreurs
  };
}

/**
 * Propriétaire canonique BudgetSoft du prévisionnel bancaire.
 * Le moteur doctrinal 20260901 construit les flux métier ; cette fonction impose
 * le contrat de publication, la décomposition canonique et l'interdiction de régression.
 */
function construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateCible){
  if(typeof chargerTresoreriePrevisionnelle20260901!=='function')return{ok:false,version:BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION,erreur:'Moteur doctrinal 20260901 absent.'};
  const r=chargerTresoreriePrevisionnelle20260901(dateCible);
  if(!r||r.ok===false)return r;
  const decomposition=decomposerTrajectoireTresorerieCanoniqueBudgetSoft20260907_(r);
  r.proprietaireBudgetSoft=BUDGETSOFT_TREASURY_CANONICAL_OWNER;
  r.moteurSousJacent='chargerTresoreriePrevisionnelle20260901';
  r.versionContratCanonique=BUDGETSOFT_TREASURY_CANONICAL_20260907_VERSION;
  r.decompositionCanonique=decomposition;
  if(!decomposition.ok){r.ok=false;r.erreur='Contrat canonique de trésorerie non satisfait.';r.erreursContrat=decomposition.erreurs.slice();}
  return r;
}

function auditerTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateCible){
  const r=construireTrajectoireTresorerieCanoniqueBudgetSoft20260907(dateCible);
  const d=r&&r.decompositionCanonique||null;
  const out={ok:!!(r&&r.ok&&d&&d.ok),version:r&&r.version||'',proprietaire:r&&r.proprietaireBudgetSoft||'',moteurSousJacent:r&&r.moteurSousJacent||'',dateReference:r&&r.dateReference||'',dateCible:r&&r.dateCible||'',soldeReel:r&&r.soldeReel,soldePrevisionnel:r&&r.soldePrevisionnel,decomposition:d};
  console.log('[AUDIT Trajectoire canonique] '+JSON.stringify(out));return out;
}
