const CERBERE_SS1_MOVEMENTS_AUDIT_20260928_VERSION='2026-09-28.1';

function auditerMouvementsSs1OctobreCerbere20260928(){
  const c=recalculerCerbereCockpitP1Frais20260912_({contexteExterne:true});
  const p=c&&Array.isArray(c.periodes)?c.periodes[0]:null;
  if(!p)throw new Error('Cycle courant Cerbere indisponible.');
  const v=p.v37||{}, per=p.periode||p;
  const debut=new Date(per.debut||0), fin=new Date(per.fin||0), now=new Date();
  const ops0=lireTable_('Operations')||[];
  const ops=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(ops0):ops0;
  const lignes=[];
  let total=0;
  ops.forEach(function(o){
    const d=typeof dateOperationCouranteBudgetSoft_==='function'?dateOperationCouranteBudgetSoft_(o):new Date(o&&o.date_comptable||o&&o.date||0);
    if(!d||isNaN(d.getTime())||d<debut||d>fin||d>now)return;
    const m=Number(o&&o.montant||0);if(!Number.isFinite(m)||Math.abs(m)<.000001)return;
    total+=m;
    lignes.push({
      id:String(o&&o.id||''),
      date:d.toISOString(),
      montant:m,
      type:String(o&&o.type||''),
      categorie:String(o&&o.categorie||''),
      libelle:String(o&&o.libelle_bancaire||o&&o.libelle||''),
      compte:String(o&&o.compte||'')
    });
  });
  lignes.sort(function(a,b){return String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id));});
  total=Math.round(total*100)/100;
  const out={
    ok:true,
    version:CERBERE_SS1_MOVEMENTS_AUDIT_20260928_VERSION,
    periode:per,
    shbt1:Number(v.shbt1||0),
    ss1:Number(v.ss1||0),
    mouvementBancairePasse:total,
    ss1ReconstitueAttendu:Math.round((Number(v.shbt1||0)-total)*100)/100,
    nombreLignes:lignes.length,
    lignes:lignes
  };
  console.log('[AUDIT MOUVEMENTS SS1 OCTOBRE 20260928] '+JSON.stringify(out));
  return out;
}
