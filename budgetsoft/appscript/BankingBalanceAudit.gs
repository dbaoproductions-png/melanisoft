const BANKING_BALANCE_AUDIT_VERSION='1.0';

function dateAuditBanque_(v){
  if(!v)return null;
  const d=v instanceof Date?new Date(v):new Date(v);
  return isNaN(d)?null:d;
}
function montantSigneAuditBanque_(o){
  const m=Math.abs(Number(o.montant||0));
  return String(o.type||'').toLowerCase()==='depense'?-m:m;
}
function estDansAuditBanque_(d,debutExclusif,finInclusif){
  return !!d&&(!debutExclusif||d>debutExclusif)&&(!finInclusif||d<=finInclusif);
}
function arrAuditBanque_(n){return Math.round(Number(n||0)*100)/100;}

/**
 * Audit purement déclaratif : aucune écriture.
 * Compare la méthode historique du tableau de bord (colonne date) avec la
 * méthode bancaire correcte (date_comptable), compte par compte.
 */
function auditerSoldesBancairesV1(soldeObserve){
  verifierInitialisation_();
  const ops=lireOperationsBancaires_().map(enrichirDepuisCommentaireBanque_).filter(o=>!/[[]RECURRENCE:/i.test(String(o.commentaire||'')));
  const comptes=lireTable_('Comptes').filter(c=>convertirBooleen_(c.actif));
  const params=Object.fromEntries(lireTable_('Parametres').map(p=>[String(p.cle),p.valeur]));
  const dashboard=chargerDashboardReel();
  const reference=dateAuditBanque_(dashboard&&dashboard.courtTerme&&dashboard.courtTerme.dateReference)||new Date();
  const detailComptes=[];
  const ecartsOperations=[];
  let totalLegacy=0,totalComptable=0,totalInitial=0,manqueDateComptable=0;

  comptes.forEach(c=>{
    const id=String(c.id||''),nom=String(c.nom||''),cor=o=>String(o.compte||'')===id||String(o.compte||'')===nom;
    const liste=ops.filter(cor);
    const soldeParam=params['solde_releve_'+id],dateParam=dateAuditBanque_(params['date_solde_releve_'+id]);
    const baseParam=soldeParam!==undefined&&soldeParam!==''?Number(String(soldeParam).replace(',','.')):NaN;
    const baseFiable=Number.isFinite(baseParam)&&!!dateParam;
    const base=baseFiable?baseParam:Number(c.solde_initial||0);
    const debut=baseFiable?dateParam:null;
    totalInitial+=base;
    let mvLegacy=0,mvCompta=0,nLegacy=0,nCompta=0;

    liste.forEach(o=>{
      const db=dateAuditBanque_(o.date),dc=dateAuditBanque_(o.date_comptable)||db,signe=montantSigneAuditBanque_(o);
      if(!o.date_comptable)manqueDateComptable++;
      const inLegacy=estDansAuditBanque_(db,debut,reference),inCompta=estDansAuditBanque_(dc,debut,reference);
      if(inLegacy){mvLegacy+=signe;nLegacy++;}
      if(inCompta){mvCompta+=signe;nCompta++;}
      if(inLegacy!==inCompta){
        ecartsOperations.push({
          id:String(o.id||''),compte:nom||id,libelle:String(o.libelle_bancaire||o.libelle||''),montant:arrAuditBanque_(signe),
          dateBudget:db?db.toISOString():null,dateComptable:dc?dc.toISOString():null,
          incluseTableauBord:inLegacy,incluseComptable:inCompta,source:String(o.source_bancaire||''),statut:String(o.statut_bancaire||'')
        });
      }
    });

    const soldeLegacy=arrAuditBanque_(base+mvLegacy),soldeComptable=arrAuditBanque_(base+mvCompta);
    totalLegacy+=soldeLegacy;totalComptable+=soldeComptable;
    detailComptes.push({id,nom,base:arrAuditBanque_(base),dateBase:debut?debut.toISOString():null,baseFiable,
      mouvementsLegacy:arrAuditBanque_(mvLegacy),mouvementsComptables:arrAuditBanque_(mvCompta),
      nombreLegacy:nLegacy,nombreComptable:nCompta,soldeLegacy,soldeComptable,ecart:arrAuditBanque_(soldeLegacy-soldeComptable)});
  });

  totalLegacy=arrAuditBanque_(totalLegacy);totalComptable=arrAuditBanque_(totalComptable);
  const soldeDashboard=arrAuditBanque_(dashboard&&dashboard.courtTerme?dashboard.courtTerme.soldeBancaire:0);
  const obs=soldeObserve===undefined||soldeObserve===null||String(soldeObserve).trim()===''?null:Number(String(soldeObserve).replace(',','.'));
  const auditStructure=checksumOperationsBanque_(ops);
  const dashboardSuitLegacy=Math.abs(soldeDashboard-totalLegacy)<0.011;
  const dashboardSuitComptable=Math.abs(soldeDashboard-totalComptable)<0.011;

  let diagnostic='';
  if(dashboardSuitLegacy&&!dashboardSuitComptable)diagnostic='Le tableau de bord reproduit exactement le calcul fondé sur la colonne date, pas celui fondé sur la date comptable.';
  else if(dashboardSuitComptable)diagnostic='Le tableau de bord est cohérent avec les dates comptables.';
  else diagnostic='Le solde du tableau de bord diffère des deux reconstructions ; un autre composant du calcul intervient.';

  return{
    version:BANKING_BALANCE_AUDIT_VERSION,
    reference:reference.toISOString(),
    structure:auditStructure,
    soldeDashboard,
    soldeReconstitueDate:totalLegacy,
    soldeReconstitueComptable:totalComptable,
    ecartDateVsComptable:arrAuditBanque_(totalLegacy-totalComptable),
    ecartDashboardVsComptable:arrAuditBanque_(soldeDashboard-totalComptable),
    soldeObserve:Number.isFinite(obs)?arrAuditBanque_(obs):null,
    ecartObserveVsComptable:Number.isFinite(obs)?arrAuditBanque_(obs-totalComptable):null,
    manqueDateComptable,
    comptes:detailComptes,
    operationsDifferentes:ecartsOperations.sort((a,b)=>String(a.dateBudget||'').localeCompare(String(b.dateBudget||''))),
    diagnostic,
    lectureSeule:true
  };
}
