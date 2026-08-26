const AUDIT_CERBERE_REVOLVING_20260826_VERSION='1.0.0';

/**
 * Audit LECTURE SEULE des opérations classées « Crédits revolving » qui restent
 * hors pilotable dans Cerbère. Ne modifie aucune feuille et ne change aucun moteur.
 *
 * Usage Apps Script : exécuter auditerCerbereCreditsRevolvingAout2026().
 */
function auditerCerbereCreditsRevolvingAout2026(){
  return auditerCerbereCreditsRevolving_('2026-07-28','2026-08-27');
}

function auditerCerbereCreditsRevolving_(debutIso,finIso){
  const operations=Array.isArray(lireTable_('Operations'))?lireTable_('Operations'):[];
  const charges=Array.isArray(lireTable_('Charges_fixes'))?lireTable_('Charges_fixes'):[];
  const credits=Array.isArray(lireTable_('Credits'))?lireTable_('Credits'):[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'
    ? (lireRapprochementsChargesFixes()||[]):[];
  const liens=typeof construireLiensChargesFixesCommuns_==='function'
    ? construireLiensChargesFixesCommuns_(operations,charges,rapprochements)
    : (typeof construireLiensCfCertainsV377_==='function'
      ? construireLiensCfCertainsV377_(operations,charges,rapprochements):{});

  const debut=new Date(debutIso+'T00:00:00');
  const fin=new Date(finIso+'T23:59:59');
  const normalise=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const estRevolving=o=>{
    const cat=normalise(o&&o.categorie);
    return cat==='credits revolving'||cat==='credit revolving'||cat.indexOf('revolving')>=0;
  };
  const dateOp=o=>{
    const brut=o&&(o.date_operation||o.date||o.date_valeur||o.date_banque||o.date_comptable);
    if(!brut)return null;
    const d=brut instanceof Date?brut:new Date(brut);
    return isNaN(d.getTime())?null:d;
  };
  const texte=o=>normalise([o&&o.libelle,o&&o.libelle_bancaire,o&&o.description,o&&o.commentaire].filter(Boolean).join(' '));
  const source=o=>{
    const s=normalise([o&&o.source,o&&o.source_import,o&&o.origine,o&&o.mode_import,o&&o.import_type].filter(Boolean).join(' '));
    if(s.indexOf('pdf')>=0)return 'PDF';
    if(s.indexOf('copier')>=0||s.indexOf('coller')>=0||s.indexOf('clipboard')>=0||s.indexOf('paste')>=0||s.indexOf('flux')>=0)return 'COPIER-COLLER/FLUX';
    return s||'INCONNUE';
  };
  const rapprocheCredit=o=>{
    const t=texte(o),m=Math.abs(Number(o&&o.montant||0));
    return credits.map(c=>{
      const ct=normalise([c&&c.nom,c&&c.numero_pret,c&&c.organisme,c&&c.libelle].filter(Boolean).join(' '));
      let score=0;
      ct.split(' ').filter(x=>x.length>=4).forEach(x=>{if(t.indexOf(x)>=0)score+=1;});
      const mens=Math.abs(Number(c&&c.mensualite||0));
      if(mens&&Math.abs(mens-m)<=0.02)score+=3;
      return {c,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)[0]||null;
  };

  const lignes=operations.filter(o=>{
    const d=dateOp(o),m=Number(o&&o.montant||0);
    return d&&d>=debut&&d<=fin&&m<0&&estRevolving(o);
  }).map(o=>{
    const id=String(o&&o.id||'').trim();
    const cfId=liens&&liens[id]?String(liens[id]):'';
    const cf=cfId?charges.find(c=>String(c&&c.id||'')===cfId):null;
    const cr=rapprocheCredit(o);
    let raison='HORS PILOTABLE : catégorie hors P0 et aucune CF reconnue par le cœur commun';
    if(cfId)raison='ATTENTION : CF reconnue ; cette opération ne devrait normalement pas rester dans HEt1';
    return {
      date:Utilities.formatDate(dateOp(o),Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd'),
      montant:Math.round(Math.abs(Number(o&&o.montant||0))*100)/100,
      id_operation:id,
      libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),
      compte:String(o&&o.compte||''),
      source:source(o),
      charge_fixe_id:cfId,
      charge_fixe:cf?String(cf.libelle||cf.libelle_bancaire||''):'—',
      credit:cr?String(cr.c.nom||cr.c.numero_pret||''):'—',
      score_credit:cr?cr.score:0,
      raison:raison
    };
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.montant-b.montant);

  const total=Math.round(lignes.reduce((s,x)=>s+x.montant,0)*100)/100;
  const parSource={};lignes.forEach(x=>{parSource[x.source]=(parSource[x.source]||0)+x.montant;});
  Object.keys(parSource).forEach(k=>parSource[k]=Math.round(parSource[k]*100)/100);
  const anomalies=lignes.filter(x=>x.charge_fixe_id);

  console.log('=== AUDIT CERBERE — CREDITS REVOLVING ===');
  console.log('Version : '+AUDIT_CERBERE_REVOLVING_20260826_VERSION);
  console.log('Mode : LECTURE SEULE — aucune feuille modifiee');
  console.log('Periode : '+debutIso+' -> '+finIso);
  console.log('Operations : '+lignes.length+' | total : '+total.toFixed(2)+' EUR');
  console.log('Sources : '+JSON.stringify(parSource));
  lignes.forEach((x,i)=>console.log((i+1)+'. '+x.date+' | '+x.montant.toFixed(2)+' EUR | '+x.libelle+' | source='+x.source+' | CF='+x.charge_fixe+' ['+x.charge_fixe_id+'] | credit='+x.credit+' | '+x.raison));
  console.log('Operations reconnues CF mais encore candidates revolving : '+anomalies.length);
  console.log('VERDICT : '+(anomalies.length?'A CONTROLER — au moins une CF reconnue apparait dans le lot':'OK DIAGNOSTIC — aucune CF reconnue dans le lot'));
  console.log('=== FIN AUDIT REVOLVING ===');
  return {ok:true,lectureSeule:true,version:AUDIT_CERBERE_REVOLVING_20260826_VERSION,debut:debutIso,fin:finIso,total,lignes,parSource,anomalies};
}
