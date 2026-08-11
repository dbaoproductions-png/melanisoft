function chargerDashboardReel() {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const parametres = Object.fromEntries(lireTable_('Parametres').map(p=>[String(p.cle),p.valeur]));
  const maintenant = new Date();

  const dateOp = o => {
    try { return typeof dateEffectiveOperationCycle_ === 'function' ? dateEffectiveOperationCycle_(o) : new Date(o.date); }
    catch (e) { return new Date(o.date); }
  };
  const valides = operations.map(o => ({
    brut:o,
    date:dateOp(o),
    libelle:String(o.libelle || o.libelle_bancaire || 'Opération'),
    categorie:String(o.categorie || ''),
    compte:String(o.compte || ''),
    type:String(o.type || '').toLowerCase(),
    montant:Math.abs(Number(o.montant || 0))
  })).filter(o => !isNaN(o.date) && Number.isFinite(o.montant) && o.montant > 0 && o.date <= maintenant);

  const datesReleves = Object.keys(parametres)
    .filter(k=>k.indexOf('date_solde_releve_')===0)
    .map(k=>({cle:k,date:new Date(parametres[k])}))
    .filter(x=>!isNaN(x.date));
  const dernierReleve = datesReleves.length ? datesReleves.slice().sort((a,b)=>b.date-a.date)[0].date : null;
  const derniereOperation = valides.length ? valides.slice().sort((a,b)=>b.date-a.date)[0].date : null;
  let reference = dernierReleve && derniereOperation ? (dernierReleve > derniereOperation ? dernierReleve : derniereOperation) : (dernierReleve || derniereOperation || maintenant);
  reference = new Date(reference.getFullYear(),reference.getMonth(),reference.getDate(),12,0,0,0);

  let salaire = null;
  try { salaire = detecterSalairePrincipal_(operations, 12); } catch(e) {}
  const jourRepli = Number(salaire && salaire.jourMoyen) || Number(parametres.jour_debut_mois) || 28;

  function periodePour_(dateReference) {
    try { return calculerCycleDepuisSalaire_(dateReference, operations, jourRepli, salaire); }
    catch(e) {
      const jour=Math.max(1,Math.min(28,jourRepli));
      const d=dateReference instanceof Date?dateReference:new Date(dateReference);
      const debut=d.getDate()>=jour?new Date(d.getFullYear(),d.getMonth(),jour,0,0,0,0):new Date(d.getFullYear(),d.getMonth()-1,jour,0,0,0,0);
      const fin=new Date(new Date(debut.getFullYear(),debut.getMonth()+1,jour,0,0,0,0).getTime()-1);
      return construirePeriodeCycle_(debut,fin,false);
    }
  }

  function statsPeriode_(periode, dateLimite) {
    const debut=new Date(periode.debut), fin=new Date(periode.fin);
    const limite=dateLimite && new Date(dateLimite)<fin ? new Date(dateLimite) : fin;
    const ops=valides.filter(o=>o.date>=debut && o.date<=limite);
    const revenus=ops.filter(o=>o.type==='revenu').reduce((s,o)=>s+o.montant,0);
    const depenses=ops.filter(o=>o.type==='depense').reduce((s,o)=>s+o.montant,0);
    return {revenus:arrondirCycle_(revenus),depenses:arrondirCycle_(depenses),epargne:arrondirCycle_(revenus-depenses),operations:ops.length};
  }

  function dernierSoldeConnu_() {
    let total=0, trouve=false, dateMax=null;
    Object.keys(parametres).filter(k=>k.indexOf('solde_releve_')===0 && k.indexOf('date_solde_releve_')!==0).forEach(cle=>{
      const id=cle.substring('solde_releve_'.length);
      const v=Number(String(parametres[cle]).replace(',','.'));
      const d=parametres['date_solde_releve_'+id] ? new Date(parametres['date_solde_releve_'+id]) : null;
      if(Number.isFinite(v)){total+=v;trouve=true;if(d&&!isNaN(d)&&(!dateMax||d>dateMax))dateMax=d;}
    });
    return {fiable:trouve,solde:arrondirCycle_(total),date:dateMax};
  }

  function echeancesFixes_(dateApres,dateJusqua) {
    const charges=lireTable_('Charges_fixes').filter(c=>convertirBooleen_(c.actif));
    const debut=new Date(dateApres), fin=new Date(dateJusqua);
    const items=[];
    charges.forEach(c=>{
      const frequence=normaliserTexteCycle_(c.frequence || 'Mensuelle');
      if(frequence && frequence!=='MENSUELLE') return;
      const jour=Number(c.jour_execution || c.jour || c.jour_echeance || 0);
      const montant=Math.abs(Number(c.montant || c.montant_attendu || 0));
      if(!jour||!Number.isFinite(montant)||montant<=0)return;
      let curseur=new Date(debut.getFullYear(),debut.getMonth(),Math.min(28,jour),12,0,0,0);
      if(curseur<=debut) curseur=new Date(debut.getFullYear(),debut.getMonth()+1,Math.min(28,jour),12,0,0,0);
      if(curseur<=fin) items.push({libelle:String(c.libelle||c.libelle_bancaire||'Charge fixe'),montant:arrondirCycle_(montant),date:curseur.toISOString()});
    });
    return items.sort((a,b)=>new Date(a.date)-new Date(b.date));
  }

  const periodeCourante=periodePour_(reference);
  const statsCourants=statsPeriode_(periodeCourante,reference);
  const debutCourant=new Date(periodeCourante.debut), finCourant=new Date(periodeCourante.fin);
  const duree=Math.max(1,Math.round((new Date(finCourant.getFullYear(),finCourant.getMonth(),finCourant.getDate(),12)-new Date(debutCourant.getFullYear(),debutCourant.getMonth(),debutCourant.getDate(),12))/86400000)+1);
  const jour=Math.max(1,Math.min(duree,Math.round((reference-new Date(debutCourant.getFullYear(),debutCourant.getMonth(),debutCourant.getDate(),12))/86400000)+1));

  const solde=dernierSoldeConnu_();
  const chargesRestantes=echeancesFixes_(reference,finCourant);
  const totalChargesRestantes=arrondirCycle_(chargesRestantes.reduce((s,c)=>s+c.montant,0));
  const soldeProjete=solde.fiable?arrondirCycle_(solde.solde-totalChargesRestantes):null;

  const refPrecedent=new Date(debutCourant.getTime()-86400000);
  const periodePrecedente=periodePour_(refPrecedent);
  const statsPrecedents=statsPeriode_(periodePrecedente,new Date(periodePrecedente.fin));

  function libellePeriode_(p){return p.libelle || new Date(p.debut).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());}

  return {
    referenceImport:reference.toISOString(),
    dernierReleve:dernierReleve?dernierReleve.toISOString():null,
    salaire:salaire,
    cycleCourant:{
      libelle:libellePeriode_(periodeCourante),debut:periodeCourante.debut,fin:periodeCourante.fin,
      jour:jour,duree:duree,dateReference:reference.toISOString(),
      revenus:statsCourants.revenus,depenses:statsCourants.depenses,epargne:statsCourants.epargne,operations:statsCourants.operations,
      soldeBancaire:solde.fiable?solde.solde:null,dateSolde:solde.date?solde.date.toISOString():null,
      complet:reference>=finCourant
    },
    previsionnel:{
      debut:reference.toISOString(),fin:periodeCourante.fin,
      soldeDepart:solde.fiable?solde.solde:null,dateSolde:solde.date?solde.date.toISOString():null,
      chargesRestantes:totalChargesRestantes,nombreCharges:chargesRestantes.length,detailCharges:chargesRestantes,
      soldeProjete:soldeProjete
    },
    cyclePrecedent:{
      libelle:libellePeriode_(periodePrecedente),debut:periodePrecedente.debut,fin:periodePrecedente.fin,
      revenus:statsPrecedents.revenus,depenses:statsPrecedents.depenses,epargne:statsPrecedents.epargne,operations:statsPrecedents.operations
    }
  };
}
