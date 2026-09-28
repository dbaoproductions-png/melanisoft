const CERBERE_SALAIRE_OUVERTURE_AUDIT_20260928_VERSION='2026-09-28.1';

function auditerSalaireOuvertureOctobreCerbere20260928(){
  const c=recalculerCerbereCockpitP1Frais20260912_();
  const p=c&&Array.isArray(c.periodes)?c.periodes[0]:null;
  if(!p)throw new Error('Cycle courant Cerbere indisponible.');
  const v=p.v37||{}, per=p.periode||p, debut=new Date(per.debut||0);
  const ops=lireTable_('Operations')||[];
  const salaires=ops.filter(function(o){
    const m=Number(o&&o.montant||0);
    const cat=String(o&&o.categorie||'').trim();
    const d=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):new Date(o&&o.date_comptable||o&&o.date||0);
    if(!(m>0)||cat!=='Salaires'||!d||isNaN(d.getTime())||isNaN(debut.getTime()))return false;
    return Math.abs((new Date(d.getFullYear(),d.getMonth(),d.getDate())-new Date(debut.getFullYear(),debut.getMonth(),debut.getDate()))/86400000)<=2;
  }).map(function(o){
    const d=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):new Date(o&&o.date_comptable||o&&o.date||0);
    return {id:String(o&&o.id||''),date:d&&d.toISOString?d.toISOString():'',montant:Number(o&&o.montant||0),categorie:String(o&&o.categorie||''),libelle:String(o&&o.libelle_bancaire||o&&o.libelle||'')};
  });
  const out={
    ok:true,
    version:CERBERE_SALAIRE_OUVERTURE_AUDIT_20260928_VERSION,
    periode:per,
    ss1:Number(v.ss1||0),
    shbt1:Number(v.shbt1||0),
    rt1:Number(v.rt1||0),
    salaireOuverture:v.salaireOuverture||null,
    rt1Audit:v.rt1Audit||null,
    salairesFrontiere:salaires
  };
  console.log('[AUDIT SALAIRE OUVERTURE OCTOBRE 20260928] '+JSON.stringify(out));
  return out;
}
