function chargerDashboardReel() {
  verifierInitialisation_();
  const operations = lireTable_('Operations');
  const parametres = Object.fromEntries(lireTable_('Parametres').map(p=>[String(p.cle),p.valeur]));
  const maintenant = new Date();

  const dateOp = o => { try { return typeof dateEffectiveOperationCycle_ === 'function' ? dateEffectiveOperationCycle_(o) : new Date(o.date); } catch (e) { return new Date(o.date); } };
  const valides = operations.map(o => ({brut:o,date:dateOp(o),libelle:String(o.libelle || o.libelle_bancaire || 'Opération'),categorie:String(o.categorie || ''),compte:String(o.compte || ''),type:String(o.type || '').toLowerCase(),montant:Math.abs(Number(o.montant || 0))})).filter(o => !isNaN(o.date) && Number.isFinite(o.montant) && o.montant > 0 && o.date <= maintenant);

  const datesReleves = Object.keys(parametres).filter(k=>k.indexOf('date_solde_releve_')===0).map(k=>({cle:k,date:new Date(parametres[k])})).filter(x=>!isNaN(x.date));
  const dernierReleve = datesReleves.length ? datesReleves.slice().sort((a,b)=>b.date-a.date)[0].date : null;
  const derniereOperation = valides.length ? valides.slice().sort((a,b)=>b.date-a.date)[0].date : null;
  let reference = dernierReleve && derniereOperation ? (dernierReleve > derniereOperation ? dernierReleve : derniereOperation) : (dernierReleve || derniereOperation || maintenant);
  reference = dateJourCycle_(reference);

  let salaire = null; try { salaire = detecterSalairePrincipal_(operations, 12); } catch(e) {}
  const jourRepli = Number(salaire && salaire.jourMoyen) || Number(parametres.jour_debut_mois) || 28;

  function periodePour_(dateReference) {
    try { return calculerCycleDepuisSalaire_(dateReference, operations, jourRepli, salaire); }
    catch(e) { const jour=Math.max(1,Math.min(28,jourRepli));const d=new Date(dateReference);const debut=d.getDate()>=jour?new Date(d.getFullYear(),d.getMonth(),jour):new Date(d.getFullYear(),d.getMonth()-1,jour);const fin=new Date(new Date(debut.getFullYear(),debut.getMonth()+1,jour).getTime()-1);return construirePeriodeCycle_(debut,fin,false); }
  }
  function statsPeriode_(periode, dateLimite) { const debut=new Date(periode.debut),fin=new Date(periode.fin),limite=dateLimite&&new Date(dateLimite)<fin?new Date(dateLimite):fin;const ops=valides.filter(o=>o.date>=debut&&o.date<=limite);const revenus=ops.filter(o=>o.type==='revenu').reduce((s,o)=>s+o.montant,0),depenses=ops.filter(o=>o.type==='depense').reduce((s,o)=>s+o.montant,0);return {revenus:arrondirCycle_(revenus),depenses:arrondirCycle_(depenses),epargne:arrondirCycle_(revenus-depenses),operations:ops.length}; }
  function dernierSoldeConnu_() { let total=0,trouve=false,dateMax=null;Object.keys(parametres).filter(k=>k.indexOf('solde_releve_')===0&&k.indexOf('date_solde_releve_')!==0).forEach(cle=>{const id=cle.substring('solde_releve_'.length),v=Number(String(parametres[cle]).replace(',','.')),d=parametres['date_solde_releve_'+id]?new Date(parametres['date_solde_releve_'+id]):null;if(Number.isFinite(v)){total+=v;trouve=true;if(d&&!isNaN(d)&&(!dateMax||d>dateMax))dateMax=d;}});return {fiable:trouve,solde:arrondirCycle_(total),date:dateMax}; }

  function valeurCharge_(c,noms,defaut) { for (let i=0;i<noms.length;i++){const v=c[noms[i]];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;}return defaut; }
  function echeancesFixes_(dateApres,dateJusqua) {
    const charges=lireTable_('Charges_fixes').filter(c=>convertirBooleen_(valeurCharge_(c,['actif','active','est_actif'],true)));
    const debut=dateJourCycle_(dateApres),fin=dateJourCycle_(dateJusqua),items=[];
    charges.forEach(c=>{
      const frequence=normaliserTexteCycle_(valeurCharge_(c,['frequence','periodicite','rythme'],'Mensuelle'));
      if(frequence && frequence.indexOf('MENSUEL')<0) return;
      const jour=Number(valeurCharge_(c,['jour_execution','jour','jour_echeance','jour_prelevement','jour_du_mois'],0));
      const montant=Math.abs(Number(String(valeurCharge_(c,['montant','montant_attendu','montant_prevu','valeur'],0)).replace(',','.')));
      if(!jour||!Number.isFinite(montant)||montant<=0)return;
      let curseur=new Date(debut.getFullYear(),debut.getMonth(),Math.min(31,jour),12,0,0,0);
      if(curseur<=debut) curseur=new Date(debut.getFullYear(),debut.getMonth()+1,Math.min(31,jour),12,0,0,0);
      if(curseur<=fin) items.push({libelle:String(valeurCharge_(c,['libelle','nom','intitule','libelle_bancaire'],'Charge fixe')),montant:arrondirCycle_(montant),date:curseur.toISOString()});
    });
    return items.sort((a,b)=>new Date(a.date)-new Date(b.date));
  }

  const periodeCourante=periodePour_(reference),statsCourants=statsPeriode_(periodeCourante,reference),debutCourant=dateJourCycle_(new Date(periodeCourante.debut)),finCourant=dateJourCycle_(new Date(periodeCourante.fin));
  const duree=Math.max(1,ecartJoursCycle_(debutCourant,finCourant)+1),jour=Math.max(1,Math.min(duree,ecartJoursCycle_(debutCourant,reference)+1));
  const solde=dernierSoldeConnu_(),chargesRestantes=echeancesFixes_(reference,finCourant),totalChargesRestantes=arrondirCycle_(chargesRestantes.reduce((s,c)=>s+c.montant,0)),soldeEngage=solde.fiable?arrondirCycle_(solde.solde-totalChargesRestantes):null;

  // Le cycle précédent s'arrête la veille calendaire du début du cycle courant.
  const finPrecedente=new Date(debutCourant);finPrecedente.setDate(finPrecedente.getDate()-1);
  const periodePrecedente=periodePour_(finPrecedente);
  // Protection contre une borne de fin renvoyée au jour du salaire suivant : on force la veille du cycle courant.
  periodePrecedente.fin=new Date(finPrecedente.getFullYear(),finPrecedente.getMonth(),finPrecedente.getDate(),23,59,59,999).toISOString();
  const statsPrecedents=statsPeriode_(periodePrecedente,new Date(periodePrecedente.fin));
  function libellePeriode_(p){return p.libelle || new Date(p.debut).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());}

  return {referenceImport:reference.toISOString(),dernierReleve:dernierReleve?dernierReleve.toISOString():null,salaire:salaire,
    cycleCourant:{libelle:libellePeriode_(periodeCourante),debut:periodeCourante.debut,fin:periodeCourante.fin,jour:jour,duree:duree,dateReference:reference.toISOString(),revenus:statsCourants.revenus,depenses:statsCourants.depenses,epargne:statsCourants.epargne,operations:statsCourants.operations,soldeBancaire:solde.fiable?solde.solde:null,dateSolde:solde.date?solde.date.toISOString():null,chargesFixesRestantes:totalChargesRestantes,nombreChargesFixes:chargesRestantes.length,detailChargesFixes:chargesRestantes,soldeEngage:soldeEngage,complet:reference>=finCourant},
    previsionnel:{debut:reference.toISOString(),fin:periodeCourante.fin,soldeDepart:solde.fiable?solde.solde:null,dateSolde:solde.date?solde.date.toISOString():null,chargesRestantes:totalChargesRestantes,nombreCharges:chargesRestantes.length,detailCharges:chargesRestantes,soldeProjete:soldeEngage},
    cyclePrecedent:{libelle:libellePeriode_(periodePrecedente),debut:periodePrecedente.debut,fin:periodePrecedente.fin,revenus:statsPrecedents.revenus,depenses:statsPrecedents.depenses,epargne:statsPrecedents.epargne,operations:statsPrecedents.operations}
  };
}
