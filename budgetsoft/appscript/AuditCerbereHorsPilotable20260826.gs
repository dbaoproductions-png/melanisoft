const AUDIT_CERBERE_HORS_PILOTABLE_20260826_VERSION='1.1.0';

/**
 * Audit global LECTURE SEULE du reliquat hors pilotable Cerbere pour M et M+1.
 * Cette version reproduit la population HEt1 de la passe terminale Cerbere :
 * - même coeur commun CF ;
 * - même P0 ;
 * - même typage trésorerie ;
 * - même date d'imputation, y compris CB différées ;
 * - même exclusion des règlements CB techniques.
 * Aucune écriture dans les feuilles.
 */
function auditerCerbereHorsPilotableAoutSeptembre2026(){
  const cerbere=chargerCerbereV374();
  if(!cerbere||cerbere.ok===false)throw new Error('Cerbere indisponible pour audit de parite HEt1.');
  const periodes=Array.isArray(cerbere.periodes)?cerbere.periodes:[];
  if(periodes.length<2)throw new Error('Cerbere ne fournit pas M et M+1.');
  return {
    aout:auditerCerbereHorsPilotableExact_(cerbere,periodes[0]),
    septembre:auditerCerbereHorsPilotableExact_(cerbere,periodes[1])
  };
}

function auditerCerbereHorsPilotableExact_(cerbere,p){
  const operations=Array.isArray(lireTable_('Operations'))?lireTable_('Operations'):[];
  const charges=Array.isArray(lireTable_('Charges_fixes'))?lireTable_('Charges_fixes'):[];
  const categories=Array.isArray(lireTable_('Categories'))?lireTable_('Categories'):[];
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'?(lireRapprochementsChargesFixes()||[]):[];
  if(typeof construireLiensChargesFixesCommuns_!=='function')throw new Error('Coeur commun CF indisponible.');
  if(typeof dateImputationCerbereV377_!=='function'||typeof dateDansCycleV377_!=='function')throw new Error('Fonctions d’imputation Cerbere indisponibles.');
  const liens=construireLiensChargesFixesCommuns_(operations,charges,rapprochements)||{};
  const periode=p.periode||p;
  const p0Cats=new Set((cerbere.p0&&cerbere.p0.postes||[]).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));p0Cats.add('Divers');
  const types={};categories.forEach(c=>types[String(c&&c.nom||'').trim()]=typeof normaliserV377_==='function'?normaliserV377_(c&&c.type):normAuditHet_(c&&c.type));
  const source=o=>{const s=normAuditHet_([o&&o.source,o&&o.source_import,o&&o.origine,o&&o.mode_import,o&&o.import_type].filter(Boolean).join(' '));if(s.includes('pdf'))return 'PDF';if(/copier|coller|clipboard|paste|flux/.test(s))return 'COPIER-COLLER/FLUX';return s||'INCONNUE';};
  const suggestion=o=>{
    const cat=normAuditHet_(o&&o.categorie),txt=normAuditHet_([o&&o.libelle,o&&o.libelle_bancaire,o&&o.description].filter(Boolean).join(' ')),m=Math.abs(Number(o&&o.montant||0));
    if(/carrefour banque/.test(txt)&&Math.abs(m-168)<=0.02)return 'CF PROBABLE — mensualite Carrefour PASS revolving 168 EUR';
    if(/carrefour banque/.test(txt))return 'PILOTABLE DECIDE — Courses (usage carte Carrefour Banque hors mensualite 168 EUR)';
    if(/avanssur/.test(txt)||/assurance|assurances/.test(cat+' '+txt))return 'CF PROBABLE — assurance a rapprocher';
    if(/google one|abonnement|deezer|netflix|spotify|prime/.test(cat+' '+txt))return 'CF PROBABLE — abonnement a rapprocher';
    if(/lou hernebring/.test(txt)||/argent de poche/.test(cat))return 'PILOTABLE DECIDE — Divers, jamais CF';
    if(/virement interne|virt cpte cpte/.test(txt+' '+cat))return 'TRESORERIE PROBABLE — a typer tresorerie si ce n’est pas deja le cas';
    if(/frais professionnel/.test(cat))return 'A DECIDER — frais professionnel / remboursement eventuel';
    if(/depenses diverses|divers/.test(cat))return 'A DECIDER — examiner le libelle et reclasser si possible';
    return 'A DECIDER';
  };

  const lignes=[];
  operations.forEach(o=>{
    const d=dateImputationCerbereV377_(o),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim(),id=String(o&&o.id||'').trim();
    if(!d||!dateDansCycleV377_(d,periode)||m>=0||p0Cats.has(cat)||liens[id]||types[cat]==='tresorerie'||(typeof estReglementCbTechniqueV377_==='function'&&estReglementCbTechniqueV377_(o)))return;
    const banque=typeof dateOperationBanqueV377_==='function'?dateOperationBanqueV377_(o):null;
    const achat=typeof dateAchatMetierBudgetSoft_==='function'?dateAchatMetierBudgetSoft_(o):null;
    lignes.push({
      date_imputation:formatDateAuditHet_(d),
      date_banque:formatDateAuditHet_(banque),
      date_achat:formatDateAuditHet_(achat),
      montant:arrAuditHet_(Math.abs(m)),
      id_operation:id,
      libelle:String(o&&o.libelle||o&&o.libelle_bancaire||''),
      categorie:cat,
      source:source(o),
      cb:!!String(o&&o.carte_fin||'').trim(),
      carte_fin:String(o&&o.carte_fin||''),
      diagnostic:suggestion(o)
    });
  });
  lignes.sort((a,b)=>a.date_imputation.localeCompare(b.date_imputation)||a.categorie.localeCompare(b.categorie)||a.montant-b.montant);
  const total=arrAuditHet_(lignes.reduce((s,x)=>s+x.montant,0));
  const nonCb=arrAuditHet_(lignes.filter(x=>!x.cb).reduce((s,x)=>s+x.montant,0));
  const cb=arrAuditHet_(lignes.filter(x=>x.cb).reduce((s,x)=>s+x.montant,0));
  const attendu=arrAuditHet_(Number(p&&p.v37&&p.v37.horsPilotableAControler!=null?p.v37.horsPilotableAControler:(p&&p.roulant&&p.roulant.horsPilotable&&p.roulant.horsPilotable.total)||0));
  const ecart=arrAuditHet_(total-attendu);

  console.log('=== AUDIT PARITE HEt1 CERBERE ===');
  console.log('Version audit : '+AUDIT_CERBERE_HORS_PILOTABLE_20260826_VERSION+' | moteur Cerbere : '+String(cerbere.version||''));
  console.log('Mode : LECTURE SEULE — aucune feuille modifiee');
  console.log('Periode : '+String(periode.debut||'')+' -> '+String(periode.fin||''));
  console.log('HEt1 Cerbere : '+attendu.toFixed(2)+' EUR');
  console.log('HEt1 audit exact : '+total.toFixed(2)+' EUR | non-CB='+nonCb.toFixed(2)+' | CB='+cb.toFixed(2));
  console.log('Ecart : '+ecart.toFixed(2)+' EUR');
  lignes.forEach((x,i)=>console.log((i+1)+'. imputation='+x.date_imputation+' | banque='+x.date_banque+' | achat='+x.date_achat+' | '+x.montant.toFixed(2)+' EUR | '+x.categorie+' | '+x.libelle+' | '+(x.cb?'CB '+x.carte_fin:'non-CB')+' | '+x.diagnostic));
  console.log(Math.abs(ecart)<.01?'VERDICT : OK — parite HEt1 exacte':'VERDICT : STOP — audit et Cerbere divergent');
  console.log('=== FIN AUDIT PARITE HEt1 ===');
  return {ok:Math.abs(ecart)<.01,lectureSeule:true,version:AUDIT_CERBERE_HORS_PILOTABLE_20260826_VERSION,periode:periode,total:total,attendu:attendu,ecart:ecart,nonCb:nonCb,cb:cb,lignes:lignes};
}

function normAuditHet_(s){return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function arrAuditHet_(n){return Math.round((Number(n)||0)*100)/100;}
function formatDateAuditHet_(d){if(!d)return'—';const x=d instanceof Date?d:new Date(d);if(isNaN(x.getTime()))return'—';return Utilities.formatDate(x,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');}
