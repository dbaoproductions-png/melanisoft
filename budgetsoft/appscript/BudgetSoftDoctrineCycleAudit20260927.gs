const BUDGETSOFT_DOCTRINE_CYCLE_AUDIT_20260927_VERSION='2026-09-27.2';

function auditerCoursConcertsEtEpargneCycle20260927(){
  const projection=typeof construireTrajectoireTresorerieCanoniqueBudgetSoft20260907==='function'
    ?construireTrajectoireTresorerieCanoniqueBudgetSoft20260907('2026-10-27'):null;
  const lignes=Array.isArray(projection&&projection.lignes)?projection.lignes:[];
  const revenus=lignes.filter(function(x){
    return String(x&&x.source||'')==='revenu_recurrent'&&['Cours','Concerts'].includes(String(x&&x.categorie||''));
  }).map(function(x){
    return{categorie:String(x.categorie||''),date:String(x.date||'').slice(0,10),montant:Number(x.montantSigne||0),preuve:String(x.preuve||'')};
  });

  const ops=typeof lireTable_==='function'?(lireTable_('Operations')||[]):[];
  const epargne=ops.filter(function(o){
    const t=[o&&o.libelle,o&&o.libelle_bancaire].filter(Boolean).join(' ');
    return /Hernebring Herne|Zz1l93auq6/i.test(t)&&Math.abs(Number(o&&o.montant||0)+50)<.011;
  }).map(function(o){
    return{id:String(o.id||''),date:String(o.date_comptable||o.date||''),compte:String(o.compte||''),categorie:String(o.categorie||''),type:String(o.type||''),montant:Number(o.montant||0),
      signeTresorerie:typeof montantSigneCanoniqueBudgetSoft20260906_==='function'?Number(montantSigneCanoniqueBudgetSoft20260906_(o)):Number(o.montant||0)};
  });

  let imprevus=null;
  try{imprevus=typeof listerImprevusCerbere20260903==='function'?listerImprevusCerbere20260903():null;}catch(e){}
  const lignesImprevus=Array.isArray(imprevus&&imprevus.lignes)?imprevus.lignes:[];
  const epargneDansImprevus=lignesImprevus.filter(function(x){
    return /Hernebring Herne|Zz1l93auq6/i.test(String(x&&x.libelle||''))||String(x&&x.categorie||'')==='Épargne';
  });
  const cer=typeof chargerCerbereCockpit20260902==='function'?chargerCerbereCockpit20260902():null;
  const p1=cer&&Array.isArray(cer.periodes)?cer.periodes[0]:null;
  const moletteEpargne=(p1&&Array.isArray(p1.enveloppes)?p1.enveloppes:[]).find(function(x){return String(x&&x.categorie||'')==='Épargne';})||null;
  const epargneConsommee=moletteEpargne?Number(moletteEpargne.reelNetPrevisionnel!=null?moletteEpargne.reelNetPrevisionnel:moletteEpargne.reelImpute||0):0;
  const epargneReste=moletteEpargne?Number(moletteEpargne.resteV37!=null?moletteEpargne.resteV37:(Number(moletteEpargne.prevu||0)-epargneConsommee)):null;

  const out={
    ok:revenus.every(function(x){return /-10-05$/.test(x.date);})&&epargne.length>0&&epargne.every(function(x){return x.montant<0&&x.signeTresorerie<0;})&&epargneDansImprevus.length===0&&Math.abs(epargneConsommee-50)<.011&&Math.abs(Number(epargneReste||0))<.011,
    version:BUDGETSOFT_DOCTRINE_CYCLE_AUDIT_20260927_VERSION,lectureSeule:true,
    revenusCoursConcerts:revenus,
    operationEpargne:epargne,
    epargneDansImprevusCerbere:epargneDansImprevus,
    moletteEpargne:moletteEpargne?{allocation:Number(moletteEpargne.prevu||0),reel:epargneConsommee,reste:epargneReste}:null,
    doctrine:{
      coursConcerts:'date conventionnelle au 5 du mois inclus dans le cycle 28->27',
      epargne:'sortie de trésorerie du compte joint ; consomme la molette Épargne ; exclue des HEt/imprévus Cerbère'
    }
  };
  console.log('[AUDIT COURS CONCERTS EPARGNE CYCLE 20260927] '+JSON.stringify(out));
  return out;
}
