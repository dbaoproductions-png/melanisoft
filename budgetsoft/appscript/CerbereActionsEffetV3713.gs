const CERBERE_ACTIONS_EFFET_V3713_VERSION='3.7.13';

/** Une action peut être réalisée aujourd'hui mais produire son économie plus tard.
 * Pour une suppression ponctuelle d'un prélèvement annuel déjà observé, si la date
 * d'effet saisie correspond à la réalisation et non à l'échéance financière, Cerbère
 * reporte l'effet à la prochaine date anniversaire. La donnée source n'est pas mutée.
 */
function corrigerEffetsFinanciersActionsV3713_(base){
  if(!base||base.ok===false)return base;
  const actions=typeof lireFeuilleDynamiquePlan_==='function'?tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Actions')):[];
  const ops=tableauCerbereV379_(lireTable_('Operations'));
  const parLib={};actions.forEach(a=>parLib[normaliserV377_(a&&a.libelle)]=a);
  tableauCerbereV379_(base.periodes).forEach(p=>{const v=p&&p.v37||{},periode=p&&p.periode||p,lignes=tableauCerbereV379_(v.actionsEvenementsCycle),garde=[];
    lignes.forEach(l=>{if(String(l&&l.source||'')!=='Action'){garde.push(l);return;}const a=parLib[normaliserV377_(l&&l.libelle)];if(!a){garde.push(l);return;}const nature=normaliserV377_(a.nature_action),freq=normaliserV377_(a.impact_frequence),src=normaliserV377_(a.source_libelle);if(nature!=='supprimer'||freq!=='ponctuel'||!src){garde.push(l);return;}
      const hist=ops.map(o=>({o:o,d:jourCivilV3710_(dateOperationBanqueV377_(o))})).filter(x=>x.d&&Number(x.o&&x.o.montant||0)<0&&normaliserV377_(x.o&&x.o.libelle||x.o&&x.o.libelle_bancaire).indexOf(src)>=0).sort((x,y)=>y.d-x.d);
      if(!hist.length){garde.push(l);return;}const h=hist[0].d,prochaine=new Date(h.getFullYear()+1,h.getMonth(),h.getDate());if(dateDansCycleV3712_(prochaine,periode)){l.dateEffet=formatJourV3712_(prochaine);garde.push(l);}else{v.actionsEffetsDifferes=tableauCerbereV379_(v.actionsEffetsDifferes);v.actionsEffetsDifferes.push({libelle:String(a.libelle||''),montant:Math.abs(Number(a.impact_montant||0)),dateEffet:formatJourV3712_(prochaine),raison:'action réalisée maintenant, effet financier à la prochaine échéance annuelle'});}
    });
    v.actionsEvenementsCycle=garde;v.actionsEvenementsResume={nombre:garde.length,net:arrV3713_(garde.reduce((s,x)=>s+Number(x&&x.montantSigne||0),0))};
  });
  base.diagnostic=base.diagnostic||{};base.diagnostic.actions_effet_3713='date de réalisation distincte de la date d’effet financier ; annuels ponctuels reportés à l’anniversaire';return base;
}
