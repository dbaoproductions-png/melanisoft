/**
 * Audit ciblé Pluxee — opérations antérieures au 28 mars 2026.
 * Lecture seule : aucune écriture, sauvegarde ou modification de solde.
 * Les lignes sont journalisées par lots pour éviter la troncature de la console.
 * Les données d'opérations résident uniquement dans le registre utilisateur.
 */
const PLUXEE_AVANT_28_MARS_AUDIT_VERSION_20261108='2026-11-08.1';

function auditerHistoriquePluxeeAvant28Mars20261108(){
  const debut='2026-03-28',tailleLot=10;
  const euros=function(v){return Math.round((Number(v)+Number.EPSILON)*100)/100;};
  const jour=function(v){
    if(v==null||v==='')return '';
    const d=v instanceof Date?new Date(v.getTime()):new Date(v);
    return !isNaN(d.getTime())?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';
  };
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss.getSheetByName('Pluxee'))throw new Error('Feuille Pluxee absente.');
  const operations=lirePluxee_();
  if(!Array.isArray(operations))throw new Error('Le registre Pluxee est illisible.');
  const props=PropertiesService.getDocumentProperties();
  const valeurInitiale=props.getProperty('PLUXEE_SOLDE_INITIAL');
  const soldeInitial=valeurInitiale==null||valeurInitiale===''?
    Number(PLUXEE_SOLDE_INITIAL_DEFAUT):Number(valeurInitiale);
  if(!Number.isFinite(soldeInitial))throw new Error('Solde initial non numérique.');
  const dateReference=String(props.getProperty('PLUXEE_DATE_REFERENCE')||PLUXEE_DATE_REFERENCE_DEFAUT);
  const historiques=operations.map(function(o){
    const d=jour(o.date),montant=Number(o.montant),statut=String(o.statut||'valide').toLowerCase();
    return {
      id:String(o.id||''),date:d,heureSource:String(o.date||'').slice(11,16),
      libelle:String(o.libelle||'').slice(0,110),montant:euros(montant),
      statut,categorie:String(o.categorie||''),type:String(o.type||''),
      source:String(o.source||''),valide:d!==''&&Number.isFinite(montant)
    };
  }).filter(o=>o.date&&o.date<debut).sort((a,b)=>a.date.localeCompare(b.date)||
    a.heureSource.localeCompare(b.heureSource)||a.id.localeCompare(b.id));
  const comptes=historiques.filter(x=>x.valide&&x.statut!=='refuse');
  const ignores=historiques.filter(x=>!x.valide||x.statut==='refuse');
  const cents=xs=>xs.reduce((s,x)=>s+Math.round(Number(x.montant||0)*100),0);
  const parMois={};
  comptes.forEach(x=>{
    const cle=x.date.slice(0,7);
    if(!parMois[cle])parMois[cle]={mois:cle,nombre:0,rechargements:0,
      totalRechargements:0,depenses:0,totalDepenses:0,net:0};
    const m=parMois[cle];m.nombre++;
    if(x.montant>0){m.rechargements++;m.totalRechargements+=Math.round(x.montant*100);}
    if(x.montant<0){m.depenses++;m.totalDepenses+=Math.round(-x.montant*100);}
    m.net+=Math.round(x.montant*100);
  });
  let soldeCents=Math.round(soldeInitial*100);
  const mois=Object.keys(parMois).sort().map(cle=>{
    const m=parMois[cle];soldeCents+=m.net;
    return{mois:cle,nombre:m.nombre,rechargements:m.rechargements,
      totalRechargements:m.totalRechargements/100,
      depenses:m.depenses,totalDepenses:m.totalDepenses/100,
      net:m.net/100,soldeFin:soldeCents/100};
  });
  const identites=new Map();
  comptes.forEach(x=>{
    const key=[x.date,x.heureSource,String(x.libelle||'').toLowerCase().trim(),
      Math.round(x.montant*100)].join('|');
    if(!identites.has(key))identites.set(key,[]);
    identites.get(key).push(x);
  });
  const doublonsPossibles=[...identites.entries()].filter(([,rows])=>rows.length>1)
    .map(([cle,rows])=>({cle,ids:rows.map(x=>x.id),nombre:rows.length}));
  const achatsMontantCible=comptes.filter(x=>Math.abs(Math.round(x.montant*100))===255);
  const resume={
    version:PLUXEE_AVANT_28_MARS_AUDIT_VERSION_20261108,lectureSeule:true,
    plage:{depuis:dateReference,jusquAu:'2026-03-27'},
    soldeInitial:euros(soldeInitial),nombre:comptes.length,
    rejeteesOuInvalides:ignores.length,
    rechargements:comptes.filter(x=>x.montant>0).length,
    totalRechargements:cents(comptes.filter(x=>x.montant>0))/100,
    depenses:comptes.filter(x=>x.montant<0).length,
    totalDepenses:-cents(comptes.filter(x=>x.montant<0))/100,
    net:cents(comptes)/100,solde27Mars:euros(soldeInitial+cents(comptes)/100),
    parMois:mois,transactionsDe255Centimes:achatsMontantCible.map(x=>({date:x.date,libelle:x.libelle,montant:x.montant,id:x.id})),
    doublonsPotentiels: doublonsPossibles,
    nombreLots:Math.ceil(comptes.length/tailleLot),
    consigne:'Comparer ces lignes avec les mouvements réels avant le 28 mars. Ne modifier ni solde initial ni montant sans justification.'
  };
  console.log('[PLUXEE AVANT MARS RESUME 20261108] '+JSON.stringify(resume));
  for(let i=0;i<comptes.length;i+=tailleLot){
    console.log('[PLUXEE AVANT MARS LOT '+(Math.floor(i/tailleLot)+1)+'/'+resume.nombreLots+' 20261108] '+
      JSON.stringify({du:i+1,au:Math.min(i+tailleLot,comptes.length),
        operations:comptes.slice(i,i+tailleLot)}));
  }
  return resume;
}
