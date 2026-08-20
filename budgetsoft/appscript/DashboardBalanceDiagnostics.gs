const DASHBOARD_BALANCE_DIAG_VERSION='1.2';

function diagnosticSoldeBancaireReel(){
  verifierInitialisation_();
  const ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_).filter(o=>!/[[]RECURRENCE:/i.test(String(o.commentaire||'')));
  const comptes=lireTable_('Comptes').filter(c=>convertirBooleen_(c.actif));
  const params=Object.fromEntries(lireTable_('Parametres').map(p=>[String(p.cle),p.valeur]));
  const now=new Date();
  const asDate=v=>{if(!v)return null;const d=v instanceof Date?new Date(v):new Date(v);return isNaN(d)?null:d;};
  const signed=o=>{const n=Number(o.montant||0);if(!Number.isFinite(n))return 0;if(n<0)return n;return String(o.type||'').toLowerCase()==='depense'?-Math.abs(n):Math.abs(n);};
  const detail=[];
  let total=0,dateMax=null;
  comptes.forEach(c=>{
    const id=String(c.id||''),nom=String(c.nom||''),cor=o=>String(o.compte||'')===id||String(o.compte||'')===nom;
    const baseRaw=params['solde_releve_'+id],baseDate=asDate(params['date_solde_releve_'+id]);
    const baseNum=baseRaw!==undefined&&baseRaw!==''?Number(String(baseRaw).replace(',','.')):NaN;
    const baseFiable=Number.isFinite(baseNum)&&!!baseDate;
    const base=baseFiable?baseNum:Number(c.solde_initial||0);
    const liste=ops.filter(cor).map(o=>({o,d:asDate(o.date_comptable||o.date)})).filter(x=>x.d&&dateBancaireConnueAuJour_(x.d,now)&&(!baseFiable||x.d>baseDate));
    const mouvements=liste.reduce((s,x)=>s+signed(x.o),0),solde=Math.round((base+mouvements)*100)/100;
    const derniere=liste.length?liste.map(x=>x.d).sort((a,b)=>b-a)[0]:baseDate;
    if(derniere&&(!dateMax||derniere>dateMax))dateMax=derniere;
    total+=solde;
    detail.push({id,nom,base:Math.round(base*100)/100,dateBase:baseDate?baseDate.toISOString():null,baseFiable,nombreMouvements:liste.length,mouvements:Math.round(mouvements*100)/100,solde,dateDernierMouvement:derniere?derniere.toISOString():null});
  });
  const dash=chargerDashboardReel();
  const resultat={version:DASHBOARD_BALANCE_DIAG_VERSION,soldeCalcule:Math.round(total*100)/100,soldeDashboard:dash?.courtTerme?.soldeBancaire??null,dateDashboard:dash?.courtTerme?.dateSolde??null,dateDernierMouvement:dateMax?dateMax.toISOString():null,datesBancairesCompareesAuJourCivil:true,comptes:detail,lectureSeule:true};
  console.log(JSON.stringify(resultat,null,2));
  Logger.log(JSON.stringify(resultat,null,2));
  return resultat;
}

function enregistrerSoldeHelloBankObserve(compteId,solde,dateObservation){
  verifierInitialisation_();
  const compte=String(compteId||'').trim();if(!compte)throw new Error('Compte manquant.');
  const n=Number(String(solde).replace(/\s/g,'').replace(',','.'));if(!Number.isFinite(n))throw new Error('Solde invalide.');
  const d=dateObservation?dateLocaleBudgetSoft_(dateObservation):dateLocaleBudgetSoft_(new Date());if(isNaN(d))throw new Error('Date invalide.');
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Parametres');
  function set_(cle,val){const rows=f.getLastRow()>1?f.getRange(2,1,f.getLastRow()-1,2).getValues():[];const i=rows.findIndex(r=>String(r[0])===cle);if(i>=0)f.getRange(i+2,2).setValue(val);else f.appendRow([cle,val]);}
  set_('solde_releve_'+compte,n);set_('date_solde_releve_'+compte,formatDateLocaleBudgetSoft_(d));SpreadsheetApp.flush();
  return{ok:true,compte,solde:Math.round(n*100)/100,date:formatDateLocaleBudgetSoft_(d)};
}
