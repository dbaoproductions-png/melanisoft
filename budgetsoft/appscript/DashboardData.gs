function chargerDashboardReel() {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const comptes = lireTable_('Comptes').filter(c => convertirBooleen_(c.actif));
  const parametres = Object.fromEntries(lireTable_('Parametres').map(p => [String(p.cle), p.valeur]));
  const maintenant = new Date();

  function estOperationAuto_(o) {
    return /\[RECURRENCE:[^\]]+\]/.test(String(o && o.commentaire || ''));
  }
  const operationsReelles = operations.filter(o => !estOperationAuto_(o));
  const dateOp = o => {
    try { return typeof dateEffectiveOperationCycle_ === 'function' ? dateEffectiveOperationCycle_(o) : new Date(o.date); }
    catch (e) { return new Date(o.date); }
  };
  const valides = operationsReelles.map(o => ({
    brut:o,
    date:dateOp(o),
    libelle:String(o.libelle || o.libelle_bancaire || 'Opération'),
    categorie:String(o.categorie || ''),
    compte:String(o.compte || ''),
    type:String(o.type || '').toLowerCase(),
    montant:Math.abs(Number(o.montant || 0))
  })).filter(o => !isNaN(o.date) && Number.isFinite(o.montant) && o.montant > 0 && o.date <= maintenant);

  const datesReleves = Object.keys(parametres)
    .filter(k => k.indexOf('date_solde_releve_') === 0)
    .map(k => ({cle:k,date:new Date(parametres[k])}))
    .filter(x => !isNaN(x.date));
  const dernierReleve = datesReleves.length ? datesReleves.slice().sort((a,b)=>b.date-a.date)[0].date : null;
  const derniereOperationReelle = valides.length ? valides.slice().sort((a,b)=>b.date-a.date)[0].date : null;
  let reference = dernierReleve && derniereOperationReelle
    ? (dernierReleve > derniereOperationReelle ? dernierReleve : derniereOperationReelle)
    : (dernierReleve || derniereOperationReelle || maintenant);
  reference = dateJourCycle_(reference);

  let salaire = null;
  try { salaire = detecterSalairePrincipal_(operationsReelles, 12); } catch(e) {}
  const jourRepli = Number(salaire && salaire.jourMoyen) || Number(parametres.jour_debut_mois) || 28;

  function periodePour_(dateReference) {
    try { return calculerCycleDepuisSalaire_(dateReference, operationsReelles, jourRepli, salaire); }
    catch(e) {
      const jour=Math.max(1,Math.min(28,jourRepli)),d=new Date(dateReference);
      const debut=d.getDate()>=jour?new Date(d.getFullYear(),d.getMonth(),jour):new Date(d.getFullYear(),d.getMonth()-1,jour);
      const fin=new Date(new Date(debut.getFullYear(),debut.getMonth()+1,jour).getTime()-1);
      return construirePeriodeCycle_(debut,fin,false);
    }
  }

  function statsPeriode_(periode, dateLimite) {
    const debut=new Date(periode.debut),fin=new Date(periode.fin);
    const limite=dateLimite&&new Date(dateLimite)<fin?new Date(dateLimite):fin;
    const ops=valides.filter(o=>o.date>=debut&&o.date<=limite);
    const revenus=ops.filter(o=>o.type==='revenu').reduce((s,o)=>s+o.montant,0);
    const depenses=ops.filter(o=>o.type==='depense').reduce((s,o)=>s+o.montant,0);
    return {revenus:arrondirCycle_(revenus),depenses:arrondirCycle_(depenses),epargne:arrondirCycle_(revenus-depenses),operations:ops.length};
  }

  function soldeCompteReel_(compte, dateReference) {
    const id=String(compte.id), nom=String(compte.nom||'');
    const cleSolde='solde_releve_'+id, cleDate='date_solde_releve_'+id;
    const soldeParam=parametres[cleSolde];
    const dateParam=parametres[cleDate]?new Date(parametres[cleDate]):null;
    const correspond=o=>String(o.compte)===id||String(o.compte)===nom;
    if(soldeParam!==undefined&&soldeParam!==''&&dateParam&&!isNaN(dateParam)){
      const base=Number(String(soldeParam).replace(',','.'));
      if(Number.isFinite(base)){
        const mouvements=valides.filter(o=>correspond(o)&&o.date>dateParam&&o.date<=dateReference)
          .reduce((s,o)=>s+(o.type==='depense'?-o.montant:o.montant),0);
        return {solde:arrondirCycle_(base+mouvements),date:dateReference>dateParam?dateReference:dateParam,fiable:true};
      }
    }
    const initial=Number(compte.solde_initial||0);
    const mouvements=valides.filter(o=>correspond(o)&&o.date<=dateReference)
      .reduce((s,o)=>s+(o.type==='depense'?-o.montant:o.montant),0);
    return {solde:arrondirCycle_(initial+mouvements),date:dateReference,fiable:false};
  }

  function soldeGlobalReel_(dateReference) {
    let total=0, fiable=false, dateMax=null;
    comptes.forEach(c=>{
      const r=soldeCompteReel_(c,dateReference); total+=r.solde; fiable=fiable||r.fiable;
      if(r.date&&(!dateMax||r.date>dateMax))dateMax=r.date;
    });
    return {solde:arrondirCycle_(total),fiable,date:dateMax};
  }

  function valeurCharge_(c,noms,defaut){for(let i=0;i<noms.length;i++){const v=c[noms[i]];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;}return defaut;}
  function echeancesFixes_(dateApres,dateJusqua){
    const charges=lireTable_('Charges_fixes').filter(c=>convertirBooleen_(valeurCharge_(c,['actif','active','est_actif'],true)));
    const debut=dateJourCycle_(dateApres),fin=dateJourCycle_(dateJusqua),items=[];
    charges.forEach(c=>{
      const frequence=normaliserTexteCycle_(valeurCharge_(c,['frequence','periodicite','rythme'],'Mensuelle'));
      if(frequence&&frequence.indexOf('MENSUEL')<0)return;
      const jour=Number(valeurCharge_(c,['jour_execution','jour','jour_echeance','jour_prelevement','jour_du_mois'],0));
      const montant=Math.abs(Number(String(valeurCharge_(c,['montant','montant_attendu','montant_prevu','valeur'],0)).replace(',','.')));
      if(!jour||!Number.isFinite(montant)||montant<=0)return;
      let curseur=new Date(debut.getFullYear(),debut.getMonth(),Math.min(31,jour),12,0,0,0);
      if(curseur<=debut)curseur=new Date(debut.getFullYear(),debut.getMonth()+1,Math.min(31,jour),12,0,0,0);
      if(curseur<=fin)items.push({
        id:String(c.id||''),libelle:String(valeurCharge_(c,['libelle','nom','intitule','libelle_bancaire'],'Charge fixe')),
        montant:arrondirCycle_(montant),date:curseur.toISOString(),compte:String(c.compte||''),categorie:String(c.categorie||'')
      });
    });
    return items.sort((a,b)=>new Date(a.date)-new Date(b.date));
  }

  const periodeCourante=periodePour_(reference);
  const statsCourants=statsPeriode_(periodeCourante,reference);
  const debutCourant=dateJourCycle_(new Date(periodeCourante.debut)),finCourant=dateJourCycle_(new Date(periodeCourante.fin));
  const duree=Math.max(1,ecartJoursCycle_(debutCourant,finCourant)+1);
  const jour=Math.max(1,Math.min(duree,ecartJoursCycle_(debutCourant,reference)+1));
  const solde=soldeGlobalReel_(reference);
  const chargesRestantes=echeancesFixes_(reference,finCourant);
  const totalChargesRestantes=arrondirCycle_(chargesRestantes.reduce((s,c)=>s+c.montant,0));
  const soldeEngage=solde.fiable?arrondirCycle_(solde.solde-totalChargesRestantes):null;

  const finPrecedente=new Date(debutCourant);finPrecedente.setDate(finPrecedente.getDate()-1);
  const periodePrecedente=periodePour_(finPrecedente);
  periodePrecedente.fin=new Date(finPrecedente.getFullYear(),finPrecedente.getMonth(),finPrecedente.getDate(),23,59,59,999).toISOString();
  const statsPrecedents=statsPeriode_(periodePrecedente,new Date(periodePrecedente.fin));
  function libellePeriode_(p){return p.libelle||new Date(p.debut).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());}

  return {
    referenceImport:reference.toISOString(),dernierReleve:dernierReleve?dernierReleve.toISOString():null,salaire:salaire,
    cycleCourant:{libelle:libellePeriode_(periodeCourante),debut:periodeCourante.debut,fin:periodeCourante.fin,jour,duree,dateReference:reference.toISOString(),revenus:statsCourants.revenus,depenses:statsCourants.depenses,epargne:statsCourants.epargne,operations:statsCourants.operations,soldeBancaire:solde.solde,dateSolde:solde.date?solde.date.toISOString():null,chargesFixesRestantes:totalChargesRestantes,nombreChargesFixes:chargesRestantes.length,detailChargesFixes:chargesRestantes,soldeEngage,complet:reference>=finCourant},
    previsionnel:{debut:reference.toISOString(),fin:periodeCourante.fin,soldeDepart:solde.solde,dateSolde:solde.date?solde.date.toISOString():null,chargesRestantes:totalChargesRestantes,nombreCharges:chargesRestantes.length,detailCharges:chargesRestantes,soldeProjete:soldeEngage},
    cyclePrecedent:{libelle:libellePeriode_(periodePrecedente),debut:periodePrecedente.debut,fin:periodePrecedente.fin,revenus:statsPrecedents.revenus,depenses:statsPrecedents.depenses,epargne:statsPrecedents.epargne,operations:statsPrecedents.operations}
  };
}
