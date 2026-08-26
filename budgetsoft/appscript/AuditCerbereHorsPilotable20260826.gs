const AUDIT_CERBERE_HORS_PILOTABLE_20260826_VERSION='1.0.0';

/**
 * Audit global LECTURE SEULE du reliquat hors pilotable Cerbere pour M et M+1.
 * Aucune ecriture. Le classement CF repose exclusivement sur le coeur commun.
 *
 * Usage Apps Script : auditerCerbereHorsPilotableAoutSeptembre2026()
 */
function auditerCerbereHorsPilotableAoutSeptembre2026(){
  return {
    aout:auditerCerbereHorsPilotable_('2026-07-28','2026-08-27'),
    septembre:auditerCerbereHorsPilotable_('2026-08-28','2026-09-27')
  };
}

function auditerCerbereHorsPilotable_(debutIso,finIso){
  const operations=Array.isArray(lireTable_('Operations'))?lireTable_('Operations'):[];
  const charges=Array.isArray(lireTable_('Charges_fixes'))?lireTable_('Charges_fixes'):[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  if(typeof construireLiensChargesFixesCommuns_!=='function') throw new Error('Coeur commun CF indisponible : construireLiensChargesFixesCommuns_ requis.');
  const liens=construireLiensChargesFixesCommuns_(operations,charges,rapprochements)||{};
  const debut=new Date(debutIso+'T00:00:00'),fin=new Date(finIso+'T23:59:59');
  const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const dateOp=o=>{const v=o&&(o.date_operation||o.date||o.date_valeur||o.date_banque||o.date_comptable);if(!v)return null;const d=v instanceof Date?v:new Date(v);return isNaN(d.getTime())?null:d;};
  const source=o=>{const s=norm([o&&o.source,o&&o.source_import,o&&o.origine,o&&o.mode_import,o&&o.import_type].filter(Boolean).join(' '));if(s.includes('pdf'))return 'PDF';if(/copier|coller|clipboard|paste|flux/.test(s))return 'COPIER-COLLER/FLUX';return s||'INCONNUE';};
  const p0=['courses','sante','animaux','maison entretien','voitures','transports','restaurants','loisirs','achats personnels','divers','epargne','projet'];
  const estPilotable=o=>p0.includes(norm(o&&o.categorie));
  const estTresorerie=o=>/virement interne|transfert|epargne|remboursement capital|mouvement de tresorerie/.test(norm([o&&o.categorie,o&&o.type,o&&o.libelle].join(' ')));
  const suggestion=o=>{
    const cat=norm(o&&o.categorie),txt=norm([o&&o.libelle,o&&o.libelle_bancaire,o&&o.description].filter(Boolean).join(' ')),m=Math.abs(Number(o&&o.montant||0));
    if(/carrefour banque/.test(txt)&&Math.abs(m-168)<=0.02)return 'CF PROBABLE — mensualite Carrefour PASS revolving 168 EUR';
    if(/carrefour banque/.test(txt))return 'PILOTABLE PROBABLE — Courses (usage carte Carrefour Banque hors mensualite 168 EUR)';
    if(estTresorerie(o))return 'TRESORERIE PROBABLE — verifier neutralisation economique';
    if(/assurance|assurances/.test(cat+' '+txt))return 'CF PROBABLE — assurance a rapprocher';
    if(/abonnement|google one|deezer|netflix|spotify|prime/.test(cat+' '+txt))return 'CF PROBABLE — abonnement a rapprocher';
    if(/frais professionnel/.test(cat))return 'A DECIDER — frais professionnel / remboursement eventuel';
    if(/depenses diverses|divers/.test(cat))return 'A DECIDER — examiner le libelle et reclasser si possible';
    if(/argent de poche/.test(cat))return 'A DECIDER — doctrine metier, probablement non-CF';
    return 'A DECIDER';
  };

  const lignes=operations.filter(o=>{const d=dateOp(o),m=Number(o&&o.montant||0);return d&&d>=debut&&d<=fin&&m<0&&!estPilotable(o);}).map(o=>{
    const id=String(o&&o.id||'').trim(),cfId=liens[id]?String(liens[id]):'',cf=cfId?charges.find(c=>String(c&&c.id||'')===cfId):null;
    let diagnostic=cfId?'CF RECONNUE — ne devrait pas rester hors pilotable':suggestion(o);
    return {date:Utilities.formatDate(dateOp(o),Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd'),montant:Math.round(Math.abs(Number(o&&o.montant||0))*100)/100,id_operation:id,libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),categorie:String(o&&o.categorie||''),source:source(o),charge_fixe_id:cfId,charge_fixe:cf?String(cf.libelle||cf.libelle_bancaire||''):'—',diagnostic};
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.categorie.localeCompare(b.categorie)||a.montant-b.montant);

  const total=Math.round(lignes.reduce((s,x)=>s+x.montant,0)*100)/100;
  const groupes={CF_RECONNUE:[],CF_PROBABLE:[],PILOTABLE_PROBABLE:[],TRESORERIE_PROBABLE:[],A_DECIDER:[]};
  lignes.forEach(x=>{const d=x.diagnostic;if(d.startsWith('CF RECONNUE'))groupes.CF_RECONNUE.push(x);else if(d.startsWith('CF PROBABLE'))groupes.CF_PROBABLE.push(x);else if(d.startsWith('PILOTABLE PROBABLE'))groupes.PILOTABLE_PROBABLE.push(x);else if(d.startsWith('TRESORERIE'))groupes.TRESORERIE_PROBABLE.push(x);else groupes.A_DECIDER.push(x);});
  console.log('=== AUDIT CERBERE — RELIQUAT HORS PILOTABLE ===');
  console.log('Version : '+AUDIT_CERBERE_HORS_PILOTABLE_20260826_VERSION);
  console.log('Mode : LECTURE SEULE — aucune feuille modifiee');
  console.log('Periode : '+debutIso+' -> '+finIso);
  console.log('Operations : '+lignes.length+' | total : '+total.toFixed(2)+' EUR');
  console.log('CF reconnues='+groupes.CF_RECONNUE.length+' | CF probables='+groupes.CF_PROBABLE.length+' | pilotables probables='+groupes.PILOTABLE_PROBABLE.length+' | tresorerie probable='+groupes.TRESORERIE_PROBABLE.length+' | a decider='+groupes.A_DECIDER.length);
  lignes.forEach((x,i)=>console.log((i+1)+'. '+x.date+' | '+x.montant.toFixed(2)+' EUR | '+x.categorie+' | '+x.libelle+' | source='+x.source+' | CF='+x.charge_fixe+' ['+x.charge_fixe_id+'] | '+x.diagnostic));
  console.log('=== FIN AUDIT HORS PILOTABLE ===');
  return {ok:true,lectureSeule:true,version:AUDIT_CERBERE_HORS_PILOTABLE_20260826_VERSION,debut:debutIso,fin:finIso,total,lignes,groupes};
}
