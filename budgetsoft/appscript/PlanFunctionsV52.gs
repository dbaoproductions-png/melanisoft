const PLAN_FUNCTIONS_V52_VERSION='5.2.0';

/** Recherche unifiée de preuves/sources Plan.
 * Renvoie explicitement charges fixes, opérations réelles et crédits/dettes.
 * Les charges fixes sont prioritaires pour REDUIRE/SUPPRIMER/REMPLACER ;
 * les crédits/dettes sont prioritaires pour REMBOURSER.
 */
function rechercherRapprochementsPlanV52(terme,fonction,role){
  const q=normaliserRechercheAction_(terme); if(q.length<2)return [];
  const f=String(fonction||'').toUpperCase(), r=String(role||'source');
  const mots=q.split(' ').filter(Boolean), out=[];
  const scoreTxt=(txt)=>{const t=normaliserRechercheAction_(txt);if(!t)return 999;let s=0;if(t===q)s-=100;if(t.includes(q))s-=60;mots.forEach(m=>{if(t.includes(m))s-=10;});return s;};
  const actif=v=>v!==false&&String(v).toLowerCase()!=='false'&&String(v)!=='0';

  try{lireTable_('Charges_fixes').forEach(c=>{
    const txt=[c.libelle,c.libelle_bancaire,c.categorie,c.nature].join(' '), st=scoreTxt(txt);if(st>=0)return;
    const priorite=(f==='REDUIRE'||f==='SUPPRIMER'||f==='REMPLACER')?-80:0;
    out.push({type:'charge_fixe',id:c.id||'',libelle:c.libelle||c.libelle_bancaire||'',montant:Math.abs(Number(c.montant||0)),frequence:c.frequence||'Mensuelle',categorie:c.categorie||'',detail:'Charge fixe récurrente · '+(actif(c.actif)?'active':'inactive'),score:st+priorite+(r==='remplacement'?-20:0)});
  });}catch(e){}

  try{lireTable_('Operations').forEach(o=>{
    const txt=[o.libelle,o.libelle_bancaire,o.marchand_normalise,o.categorie,o.commentaire].join(' '), st=scoreTxt(txt);if(st>=0)return;
    const typ=String(o.type||'').toLowerCase();
    let priorite=(f==='REDUIRE'||f==='SUPPRIMER'||f==='REMPLACER')?-20:0;
    if(typ==='depense')priorite-=15; // pour une mutuelle, le prélèvement doit passer avant un remboursement
    if(typ==='revenu')priorite+=15;
    out.push({type:'operation',id:o.id||'',libelle:o.libelle||o.libelle_bancaire||'',montant:Math.abs(Number(o.montant||0)),date:o.date_comptable||o.date||'',categorie:o.categorie||'',operation_type:typ,detail:'Opération réelle · '+(typ==='depense'?'débit':typ==='revenu'?'crédit':typ||'mouvement'),score:st+priorite});
  });}catch(e){}

  if(f==='REMBOURSER'){
    try{lireTable_('Credits').forEach(c=>{const st=scoreTxt([c.nom,c.numero_pret].join(' '));if(st>=0)return;out.push({type:'credit',id:c.id||'',libelle:c.nom||'',montant:Math.abs(Number(c.mensualite||0)),capital_restant:Math.abs(Number(c.capital_restant||0)),detail:'Crédit',score:st-100});});}catch(e){}
    try{lireTable_('Dettes').forEach(c=>{const st=scoreTxt([c.nom,c.libelle].join(' '));if(st>=0)return;out.push({type:'dette',id:c.id||'',libelle:c.nom||c.libelle||'',montant:Math.abs(Number(c.mensualite||0)),capital_restant:Math.abs(Number(c.capital_restant||c.reste_du||0)),detail:'Dette',score:st-90});});}catch(e){}
  }

  return serialiserCerberePourClient_(out.sort((a,b)=>Number(a.score||0)-Number(b.score||0)||String(a.libelle||'').localeCompare(String(b.libelle||''),'fr')).slice(0,30));
}
