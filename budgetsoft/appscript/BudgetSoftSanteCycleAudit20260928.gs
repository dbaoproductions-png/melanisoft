const BUDGETSOFT_SANTE_CYCLE_AUDIT_20260928_VERSION='2026-09-28.1';

function auditerSanteCycleCourantBudgetSoft20260928(){
  const c=recalculerCerbereCockpitP1Frais20260912_({contexteExterne:true});
  const p=c&&Array.isArray(c.periodes)?c.periodes[0]:null;
  if(!p)throw new Error('Cycle courant Cerbere indisponible.');
  const per=p.periode||p,debut=new Date(per.debut||0),fin=new Date(per.fin||0);
  const ops=lireTable_('Operations')||[];
  const lignes=ops.filter(function(o){
    const cat=String(o&&o.categorie||'').trim();
    if(cat!=='Santé')return false;
    const d=typeof dateImputationCerbereV377_==='function'?dateImputationCerbereV377_(o):new Date(o&&o.date_achat||o&&o.date_comptable||o&&o.date||0);
    if(!d||isNaN(d.getTime())||isNaN(debut.getTime())||isNaN(fin.getTime()))return false;
    return d>=debut&&d<=fin;
  }).map(function(o){
    const di=typeof dateImputationCerbereV377_==='function'?dateImputationCerbereV377_(o):new Date(o&&o.date_achat||o&&o.date_comptable||o&&o.date||0);
    const db=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):new Date(o&&o.date_comptable||o&&o.date||0);
    return {
      id:String(o&&o.id||''),
      montant:Number(o&&o.montant||0),
      dateImputation:di&&di.toISOString?di.toISOString():'',
      dateBanque:db&&db.toISOString?db.toISOString():'',
      dateAchat:String(o&&o.date_achat||''),
      libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
      carte_fin:String(o&&o.carte_fin||'')
    };
  });
  const out={
    ok:true,
    version:BUDGETSOFT_SANTE_CYCLE_AUDIT_20260928_VERSION,
    periode:per,
    pSanteDepenses:Number(p&&p.santeDepenses||0),
    pSanteRemboursements:Number(p&&p.santeRemboursements||0),
    roulantSante:p&&p.roulant&&p.roulant.sante||null,
    lignes:lignes,
    totalNegatif:Math.round(lignes.reduce(function(s,x){return s+(x.montant<0?Math.abs(x.montant):0);},0)*100)/100,
    totalPositif:Math.round(lignes.reduce(function(s,x){return s+(x.montant>0?x.montant:0);},0)*100)/100
  };
  console.log('[AUDIT SANTE CYCLE COURANT 20260928] '+JSON.stringify(out));
  return out;
}
