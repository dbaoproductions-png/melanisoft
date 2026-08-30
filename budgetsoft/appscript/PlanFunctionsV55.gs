const PLAN_FUNCTIONS_V55_VERSION='5.5.0';

function chargerResultatsObjectifsPlanV55(){
  const actions=lireFeuilleDynamiquePlan_('Plan_Actions');
  const objectifs=lireTablePlanCerbere_('Plan_Objectifs');
  const out={};
  objectifs.forEach(o=>{
    let mensuel=0,annuel=0,actionsActives=0;
    actions.filter(a=>String(a.objectif_id||'')===String(o.id)).forEach(a=>{
      if(['Abandonnée','Annulée'].includes(String(a.statut||'')))return;
      actionsActives++;
      const f=String(a.fonction_plan||'').toUpperCase();
      if(!['REDUIRE','SUPPRIMER','REMPLACER','RECEVOIR'].includes(f))return;
      const montant=Math.max(0,Number(a.cible_valeur||a.impact_montant||0));
      const freq=String(a.impact_frequence||'ponctuel').toLowerCase();
      if(freq==='mensuel'){mensuel+=montant;annuel+=montant*12;}
      else if(freq==='annuel'){mensuel+=montant/12;annuel+=montant;}
      else annuel+=montant;
    });
    out[String(o.id)]={mensuel:Math.round(mensuel*100)/100,annuel:Math.round(annuel*100)/100,actions:actionsActives};
  });
  return serialiserCerberePourClient_({version:PLAN_FUNCTIONS_V55_VERSION,objectifs:out});
}
