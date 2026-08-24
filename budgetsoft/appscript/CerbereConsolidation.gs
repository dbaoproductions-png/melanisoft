const CERBERE_CONSOLIDATION_VERSION='1.0.0';

/**
 * Couche de cohérence Cerbère ↔ Planification.
 * Elle ne remplace aucun moteur : elle fixe les invariants et fournit un
 * diagnostic unique pour éviter les régressions entre P0, R0, Plan et P1–P6.
 */
function invaliderProjectionBudgetSoft_(origine){
  const props=PropertiesService.getDocumentProperties();
  const maintenant=new Date().toISOString();
  props.setProperty('BUDGETSOFT_PROJECTION_DIRTY','true');
  props.setProperty('BUDGETSOFT_PROJECTION_DIRTY_LE',maintenant);
  props.setProperty('BUDGETSOFT_PROJECTION_DIRTY_ORIGINE',String(origine||'inconnue'));
  props.setProperty('PLAN_DERNIER_RECALCUL',maintenant);
  props.setProperty('PLAN_DERNIERE_ORIGINE',String(origine||'inconnue'));
  return {ok:true,invalidee:true,origine:String(origine||'inconnue'),date:maintenant};
}

function marquerProjectionBudgetSoftCalculee_(version){
  const props=PropertiesService.getDocumentProperties();
  props.setProperty('BUDGETSOFT_PROJECTION_DIRTY','false');
  props.setProperty('CERBERE_DERNIER_RECALCUL',new Date().toISOString());
  props.setProperty('CERBERE_DERNIERE_VERSION',String(version||''));
}

function etatProjectionBudgetSoft(){
  const p=PropertiesService.getDocumentProperties();
  return {
    dirty:p.getProperty('BUDGETSOFT_PROJECTION_DIRTY')==='true',
    dirty_le:p.getProperty('BUDGETSOFT_PROJECTION_DIRTY_LE')||'',
    origine:p.getProperty('BUDGETSOFT_PROJECTION_DIRTY_ORIGINE')||'',
    dernier_calcul:p.getProperty('CERBERE_DERNIER_RECALCUL')||'',
    version:p.getProperty('CERBERE_DERNIERE_VERSION')||''
  };
}

/** Diagnostic fonctionnel : aucune écriture dans les données métier. */
function diagnostiquerConsolidationCerbere(){
  const erreurs=[],avertissements=[];
  let p0,r0,cerbere,plan;
  try{p0=chargerCanonCerbereV1();}catch(e){erreurs.push('P0 illisible : '+(e.message||e));}
  try{r0=chargerCanonRecettesCerbereV1();}catch(e){erreurs.push('R0 illisible : '+(e.message||e));}
  try{plan=chargerPlanActionsV4();}catch(e){erreurs.push('Planification illisible : '+(e.message||e));}
  try{cerbere=chargerCerbereV33();}catch(e){erreurs.push('Cerbère illisible : '+(e.message||e));}

  if(p0){
    if(!(p0.postes||[]).length)erreurs.push('P0 ne contient aucun poste.');
    if(!Number.isFinite(Number(p0.totaux&&p0.totaux.monetaire)))erreurs.push('Total P0 invalide.');
  }
  if(r0){
    if(!(r0.postes||[]).length)erreurs.push('R0 ne contient aucune recette.');
    if(!(Number(r0.total)>0))avertissements.push('R0 est nul ou négatif.');
  }
  if(cerbere&&cerbere.ok){
    if((cerbere.periodes||[]).length!==6)erreurs.push('Cerbère ne produit pas exactement P1–P6.');
    (cerbere.periodes||[]).forEach((p,i)=>{
      if(!p.clePilotage)erreurs.push('P'+(i+1)+' n’a pas de clé de pilotage locale.');
      if(!Number.isFinite(Number(p.budgetDisponible)))erreurs.push('P'+(i+1)+' : budget disponible invalide.');
      if(!Number.isFinite(Number(p.budgetReparti)))erreurs.push('P'+(i+1)+' : budget réparti invalide.');
      const ev=(p.plan&&p.plan.evenements)||[];
      ev.forEach(e=>{if(['Réalisé','Annulé','Rapproché'].includes(String(e.statut||'')))erreurs.push('P'+(i+1)+' contient un événement sorti du prévisionnel : '+String(e.libelle||e.id||''));});
      const acts=(p.plan&&p.plan.actions)||[];
      acts.forEach(a=>{if(!(a.impact_confirme===true||String(a.impact_confirme)==='true'))erreurs.push('P'+(i+1)+' contient une action non confirmée : '+String(a.libelle||a.id||''));});
    });
  } else if(cerbere) erreurs.push('Cerbère a répondu en erreur : '+String(cerbere.erreur||cerbere.stage||'inconnue'));

  // Une période ne doit mémoriser que sa propre clé ; aucune ligne sans période.
  try{
    const sh=SpreadsheetApp.getActive().getSheetByName('Cerbere_Ajustements');
    if(sh&&sh.getLastRow()>1){
      const rows=sh.getRange(2,1,sh.getLastRow()-1,3).getValues();
      rows.forEach((r,n)=>{
        if(!/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/.test(String(r[0]||'')))erreurs.push('Ajustement Cerbère ligne '+(n+2)+' : période invalide.');
        if(!String(r[1]||'').trim())erreurs.push('Ajustement Cerbère ligne '+(n+2)+' : catégorie vide.');
      });
    }
  }catch(e){avertissements.push('Contrôle des ajustements impossible : '+(e.message||e));}

  return serialiserCerberePourClient_({
    ok:erreurs.length===0,
    version:CERBERE_CONSOLIDATION_VERSION,
    erreurs, avertissements,
    p0:p0?{version:p0.version,total:p0.totaux&&p0.totaux.monetaire,postes:(p0.postes||[]).length}:null,
    r0:r0?{version:r0.version,total:r0.total,postes:(r0.postes||[]).length}:null,
    plan:plan?{version:plan.version,objectifs:(plan.objectifs||[]).length,actions:(plan.actions||[]).length,evenements:(plan.evenements||[]).length}:null,
    cerbere:cerbere?{ok:cerbere.ok,version:cerbere.version,periodes:(cerbere.periodes||[]).length,duree_ms:cerbere.diagnostic&&cerbere.diagnostic.duree_ms}:null,
    projection:etatProjectionBudgetSoft()
  });
}
