const CREDITS_DATA_V2_VERSION = '2.4-2026-09-04';

function lireCreditsEtendusV2_() {
  const f=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Credits');
  if(!f||f.getLastRow()<2)return [];
  const largeur=Math.max(1,f.getLastColumn()),entetes=f.getRange(1,1,1,largeur).getValues()[0].map(v=>String(v||'').trim());
  const valeurs=f.getRange(2,1,f.getLastRow()-1,largeur).getValues();
  return valeurs.filter(l=>l.some(v=>v!==''&&v!==null)).map(ligne=>{const o={};entetes.forEach((h,i)=>{if(h)o[h]=serialiserValeur_(ligne[i]);});return o;});
}

function typeCreditV2_(c) {
  const explicite=String(c.type_credit||'').toLowerCase();
  if(explicite==='revolving'||explicite==='amortissable')return explicite;
  const brut=[c.nom||'',c.numero_pret||''].join(' ').toUpperCase(),normalise=normaliserTexteBanque_(brut),texte=brut+' '+normalise;
  return /CARREFOUR.*PASS|ACCESSIO|FLOA|CDISCOUNT|ONEY|CARTE\s+B/.test(texte)?'revolving':'amortissable';
}

function enrichirCreditV2_(c) {
  const x=enrichirCredit_(c);x.type_credit=typeCreditV2_(c);
  const coutBrut=c.cout_restant,coutSaisi=coutBrut!==''&&coutBrut!==null&&coutBrut!==undefined&&Number(coutBrut)>=0;
  if(!coutSaisi&&x.echeances_restantes>0&&x.mensualite>0&&x.capital_restant>0)x.cout_restant=Math.max(0,Math.round((x.echeances_restantes*x.mensualite-x.capital_restant)*100)/100);
  return x;
}

function analyserCoherenceCreditsV2_(credits,dettes){
  const alertes=[],now=new Date();now.setHours(0,0,0,0);
  (credits||[]).forEach(c=>{
    const nom=String(c.nom||'Crédit'),capital=Math.max(0,Number(c.capital_restant||0)),mens=Math.max(0,Number(c.mensualite||0)),type=String(c.type_credit||'amortissable');
    if(capital>0&&mens<=0)alertes.push({niveau:'attention',type:'credit',id:c.id,nom,message:'Capital restant positif mais mensualité nulle.'});
    if(c.prochaine_echeance&&capital>0){const d=new Date(c.prochaine_echeance);if(!isNaN(d)&&d<now)alertes.push({niveau:'info',type:'credit',id:c.id,nom,message:'Prochaine échéance enregistrée déjà passée : '+Utilities.formatDate(d,Session.getScriptTimeZone(),'dd/MM/yyyy')+'.'});}
    if(type==='revolving'){
      const plafond=Math.max(0,Number(c.plafond_credit||0)),dispo=Math.max(0,Number(c.disponible_credit||0));
      if(plafond>0&&capital>plafond+.01)alertes.push({niveau:'attention',type:'credit',id:c.id,nom,message:'Encours supérieur au plafond déclaré.'});
      if(plafond>0&&dispo>plafond+.01)alertes.push({niveau:'attention',type:'credit',id:c.id,nom,message:'Disponible supérieur au plafond déclaré.'});
      if(plafond>0&&capital+dispo>plafond+Math.max(10,plafond*.05))alertes.push({niveau:'info',type:'credit',id:c.id,nom,message:'Encours + disponible ne concordent pas avec le plafond ; vérifier le dernier relevé.'});
    }
  });
  (dettes||[]).forEach(d=>{
    const nom=String(d.nom||'Dette'),capital=Math.max(0,Number(d.capital_restant||0)),actif=String(d.actif).toLowerCase()!=='false',statut=String(d.statut||'').toLowerCase();
    if(capital<=0&&actif)alertes.push({niveau:'info',type:'dette',id:d.id,nom,message:'Dette active avec un reste à payer nul.'});
    if(capital>0&&!actif)alertes.push({niveau:'attention',type:'dette',id:d.id,nom,message:'Dette inactive alors qu’un capital reste à payer.'});
    if(capital>0&&/pay|sold|clos/.test(statut))alertes.push({niveau:'attention',type:'dette',id:d.id,nom,message:'Statut payé/soldé mais capital restant positif.'});
  });
  return alertes;
}

function chargerCreditsEtDettesV2() {
  verifierInitialisation_();
  const credits=lireCreditsEtendusV2_().map(enrichirCreditV2_),dettes=typeof lireDettesV2_==='function'?lireDettesV2_():lireTable_('Dettes');
  const dettesActives=dettes.filter(d=>String(d.actif).toLowerCase()!=='false'&&Number(d.capital_restant||0)>0);
  const tous=[...credits.map(c=>Object.assign({table:'Credits',nature:c.type_credit==='revolving'?'Crédit renouvelable':'Crédit'},c)),...dettes.map(d=>Object.assign({table:'Dettes',nature:'Dette hors crédit'},d))].sort((a,b)=>String(a.nom||'').localeCompare(String(b.nom||''),'fr'));
  const capitalCredits=credits.reduce((s,c)=>s+Math.abs(Number(c.capital_restant||0)),0),dettesHorsCredit=dettesActives.reduce((s,d)=>s+Math.abs(Number(d.capital_restant||0)),0),capitalRestant=capitalCredits+dettesHorsCredit;
  const mensualitesCredits=credits.reduce((s,c)=>s+Math.abs(Number(c.mensualite||0)),0),mensualitesDettes=dettesActives.reduce((s,d)=>s+Math.abs(Number(d.mensualite||0)),0),mensualites=mensualitesCredits+mensualitesDettes;
  const tauxPondere=capitalCredits?credits.reduce((s,c)=>s+Math.abs(Number(c.capital_restant||0))*Math.abs(Number(c.taux||0)),0)/capitalCredits:0;
  const echeancesRestantes=credits.reduce((s,c)=>s+Math.max(0,Number(c.echeances_restantes||0)),0),coutRestant=credits.reduce((s,c)=>s+Math.max(0,Number(c.cout_restant||0)),0);
  const amortissables=credits.filter(c=>c.type_credit==='amortissable'),renouvelables=credits.filter(c=>c.type_credit==='revolving');
  const capitalRenouvelable=renouvelables.reduce((s,c)=>s+Number(c.capital_restant||0),0),coutRenouvelable=renouvelables.reduce((s,c)=>s+Number(c.cout_restant||0),0),tauxRenouvelablePondere=capitalRenouvelable?renouvelables.reduce((s,c)=>s+Number(c.capital_restant||0)*Number(c.taux||0),0)/capitalRenouvelable:0;
  const alertes=analyserCoherenceCreditsV2_(credits,dettes);
  return {version:CREDITS_DATA_V2_VERSION,lignes:tous,capitalRestant,capitalCredits,dettesHorsCredit,endettementTotal:capitalRestant,mensualites,mensualitesCredits,mensualitesDettes,tauxPondere,echeancesRestantes,coutRestant,amortissables,renouvelables,dettes,dettesActives,capitalRenouvelable,coutRenouvelable,tauxRenouvelablePondere,alertes};
}

function diagnostiquerCreditsV2() {
  const d=chargerCreditsEtDettesV2();
  const resume={version:d.version,capitalCredits:d.capitalCredits,dettesHorsCredit:d.dettesHorsCredit,endettementTotal:d.endettementTotal,capitalRenouvelable:d.capitalRenouvelable,coutRenouvelable:d.coutRenouvelable,alertes:d.alertes,dettes:(d.dettes||[]).map(x=>({nom:x.nom,creancier:x.creancier,capital_restant:x.capital_restant,statut:x.statut,actif:x.actif})),renouvelables:(d.renouvelables||[]).map(c=>({nom:c.nom,type_credit:c.type_credit,capital_restant:c.capital_restant,cout_restant:c.cout_restant,plafond_credit:c.plafond_credit,disponible_credit:c.disponible_credit,assurance_mensuelle:c.assurance_mensuelle,prochaine_echeance:c.prochaine_echeance})),amortissables:(d.amortissables||[]).map(c=>({nom:c.nom,capital_restant:c.capital_restant,mensualite:c.mensualite,taux:c.taux,cout_restant:c.cout_restant,prochaine_echeance:c.prochaine_echeance,date_fin:c.date_fin}))};
  console.log(JSON.stringify(resume,null,2));return resume;
}
