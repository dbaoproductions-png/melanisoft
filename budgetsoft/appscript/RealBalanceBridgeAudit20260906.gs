const BUDGETSOFT_REAL_BALANCE_BRIDGE_AUDIT_VERSION='2026-09-06.1';

function arrPontSoldeReelBudgetSoft20260906_(n){return Math.round(Number(n||0)*100)/100;}

function auditerPontSoldeReelBudgetSoft20260906(){
  const comptes=(lireTable_('Comptes')||[]).filter(c=>typeof actifComptes20260828_==='function'?actifComptes20260828_(c.actif):c.actif!==false);
  const compte=comptes.find(c=>typeof estCompteCourantCanoniqueBudgetSoft20260906_==='function'&&estCompteCourantCanoniqueBudgetSoft20260906_(c))||comptes.find(c=>/courant|compte\s*joint/i.test(String((c.nom||'')+' '+(c.type||''))));
  if(!compte)throw new Error('Compte courant introuvable.');

  const params=Object.fromEntries((lireTable_('Parametres')||[]).map(p=>[String(p.cle),p.valeur]));
  const id=String(compte.id||''),soldeBrut=params['solde_releve_'+id],dateBrute=params['date_solde_releve_'+id],sourceRef=String(params['solde_releve_source_'+id]||'');
  const soldeReference=Number(String(soldeBrut==null?'':soldeBrut).replace(',','.'));
  const jourReference=typeof jourCanonBudgetSoft20260906_==='function'?jourCanonBudgetSoft20260906_(dateBrute):null;
  const jourAuj=typeof jourReferenceCanonBudgetSoft20260906_==='function'?jourReferenceCanonBudgetSoft20260906_(new Date()):Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');

  const ops=(lireTable_('Operations')||[]).filter(o=>{
    if(/\[RECURRENCE:[^\]]+\]/.test(String(o&&o.commentaire||'')))return false;
    const j=typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):null;
    if(!j||!jourReference||j<=jourReference||j>jourAuj)return false;
    return String(o&&o.compte||'')===id||String(o&&o.compte||'')===String(compte.nom||'');
  }).map(o=>{
    const type=String(o&&o.type||'').toLowerCase();
    const brut=Math.abs(Number(o&&o.montant||0));
    const montant=type==='depense'?-brut:type==='revenu'?brut:Number(o&&o.montant||0);
    return {
      id:String(o&&o.id||''),
      date_comptable:typeof jourComptableCanonBudgetSoft20260906_==='function'?jourComptableCanonBudgetSoft20260906_(o):'',
      libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),
      montant:arrPontSoldeReelBudgetSoft20260906_(montant),
      type:String(o&&o.type||''),
      source_bancaire:String(o&&o.source_bancaire||''),
      statut_bancaire:String(o&&o.statut_bancaire||''),
      charge_fixe_id:String(o&&o.charge_fixe_id||'')
    };
  }).sort((a,b)=>String(a.date_comptable).localeCompare(String(b.date_comptable))||String(a.id).localeCompare(String(b.id)));

  const variation=arrPontSoldeReelBudgetSoft20260906_(ops.reduce((s,o)=>s+Number(o.montant||0),0));
  const calcule=Number.isFinite(soldeReference)?arrPontSoldeReelBudgetSoft20260906_(soldeReference+variation):null;
  const synth=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():null;
  const ligneSynth=synth&&Array.isArray(synth.comptes)?synth.comptes.find(c=>String(c.id||'')===id):null;
  const publie=ligneSynth&&Number.isFinite(Number(ligneSynth.soldeReel))?arrPontSoldeReelBudgetSoft20260906_(ligneSynth.soldeReel):null;

  const parJour={};ops.forEach(o=>{const j=o.date_comptable||'sans_date';if(!parJour[j])parJour[j]={nombre:0,net:0};parJour[j].nombre++;parJour[j].net=arrPontSoldeReelBudgetSoft20260906_(parJour[j].net+Number(o.montant||0));});
  const parSource={};ops.forEach(o=>{const k=(o.source_bancaire||'sans_source')+'|'+(o.statut_bancaire||'sans_statut');if(!parSource[k])parSource[k]={nombre:0,net:0};parSource[k].nombre++;parSource[k].net=arrPontSoldeReelBudgetSoft20260906_(parSource[k].net+Number(o.montant||0));});

  const ecart=calcule!=null&&publie!=null?arrPontSoldeReelBudgetSoft20260906_(publie-calcule):null;
  const r={
    ok:Number.isFinite(soldeReference)&&!!jourReference&&jourReference<=jourAuj&&Math.abs(Number(ecart||0))<0.011,
    version:BUDGETSOFT_REAL_BALANCE_BRIDGE_AUDIT_VERSION,
    compte:{id,nom:String(compte.nom||''),type:String(compte.type||'')},
    reference:{dateBrute:String(dateBrute||''),jour:jourReference,solde:Number.isFinite(soldeReference)?arrPontSoldeReelBudgetSoft20260906_(soldeReference):null,source:sourceRef},
    aujourdHui:jourAuj,
    mouvements:{nombre:ops.length,variation,parJour,parSource,lignes:ops},
    soldeCalcule:calcule,
    soldePublie:publie,
    ecartInterne:ecart,
    sourceSoldePublie:ligneSynth&&ligneSynth.sourceSolde||'',
    dateSoldePublie:ligneSynth&&ligneSynth.dateSolde||'',
    avertissements:synth&&synth.avertissements||[]
  };
  console.log(JSON.stringify(r));return r;
}
