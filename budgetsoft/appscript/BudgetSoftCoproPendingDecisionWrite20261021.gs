/**
 * Enregistrement EXPLICITE en TEST de la provision copro deja reconnue.
 * Ne crée ni echéance bancaire, ni impayé, ni opération.
 * Une seule provision economique de transition, ancree sur debut du cycle.
 */
function enregistrerAttenteCoproControleeBudgetSoft20261021(){
 const ss=SpreadsheetApp.getActiveSpreadsheet(),nom='Decisions_occurrences_charges_fixes';
 const feuille=ss&&ss.getSheetByName(nom);
 if(!feuille)throw Error('Registre absent. Creation controlee requise.');
 const entetes=BUDGETSOFT_CF_OCCURRENCE_DECISIONS_20261021_HEADERS;
 const presentes=feuille.getRange(1,1,1,entetes.length).getValues()[0].map(String);
 if(entetes.some((x,i)=>x!==presentes[i]))throw Error('Schema du registre divergent : aucune ecriture.');
 const snap=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),etat=snap&&snap.etat||{},m=etat.modules||{};
 if(!etat.ok||!etat.publie)throw Error('Snapshot publie indisponible');
 const d=m.dashboard&&m.dashboard.courtTerme||{},cer=m.cerbere||{};
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const cf=((cer.diagnostic&&cer.diagnostic.p1Doctrine20260912||{}).cft1Audit||{}).lignes||[];
 const ligne=cf.find(x=>String(x.id||'')===id);
 const montant=Number(d.provisionChargesNonDatees20261018&&d.provisionChargesNonDatees20261018.montant||0);
 if(d.debut!=='2026-09-28'||d.fin!=='2026-10-27'||montant!==550||
  !ligne||Number(ligne.retenu)!==550||ligne.reel!=null)
  throw Error('Garde de provision canonique non satisfaite : aucune ecriture.');
 const existants=lireDecisionsOccurrencesCfBudgetSoft20261021_();
 if(existants.some(x=>String(x.charge_fixe_id||'')===id&&String(x.date_origine||'').slice(0,10)==='2026-09-28'&&String(x.actif||'').toLowerCase()!=='false'))
  throw Error('Decision de cette provision deja presente : aucune ecriture.');
 const operationLiee=(lireTable_('Operations')||[]).some(o=>String(o.charge_fixe_id||'')===id&&
  Number(o.montant||0)<0&&String(o.date_comptable||o.date||'').slice(0,10)>='2026-09-28'&&
  String(o.date_comptable||o.date||'').slice(0,10)<='2026-10-27');
 if(operationLiee)throw Error('Operation bancaire rattachee dans le cycle : verifier avant inscription.');
 const valeur={charge_fixe_id:id,date_origine:'2026-09-28',
  decision:'en_attente_prelevement',montant:550,operation_id:'',
  reference_preuve:'snapshot:'+String(etat.revisionBudgetSoft||'')+';CFT1=550;Dashboard=550',
  commentaire:'Provision economique cycle 28/09-27/10; ne vaut pas reconnaissance d une mensualite impayee',
  actif:true,cree_le:new Date().toISOString(),modifie_le:new Date().toISOString()};
 const validation=validerDecisionOccurrenceCfBudgetSoft20261021_(valeur);
 if(!validation.ok)throw Error('Decision invalide : '+validation.errors.join(','));
 feuille.appendRow(entetes.map(k=>valeur[k]));
 const result={ok:true,registre:nom,ecriture:'une_decision_attente',chargeId:id,
  origine:'2026-09-28',montant:550,statut:'en_attente_prelevement',
  revisionSource:String(etat.revisionBudgetSoft||''),operationsBancairesCreees:0,
  publicationActive:false};
 console.log('[ENREGISTREMENT ATTENTE COPRO] '+JSON.stringify(result));return result;
}
function auditerAttenteCoproPersistanteBudgetSoft20261021(){
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const x=lireDecisionsOccurrencesCfBudgetSoft20261021_().filter(o=>
  String(o.charge_fixe_id||'')===id&&String(o.date_origine||'').slice(0,10)==='2026-09-28');
 const proj=projeterDecisionsOccurrencesCfBudgetSoft20261021_(x);
 const r={ok:proj.ok&&proj.attentes.length===1&&x.length===1,lectureSeule:true,
  decisions:x.length,attentes:proj.attentes.length,confirmationsImpayees:proj.confirmations.length,
  paiements:proj.paiements.length,anomalies:proj.anomalies,publicationActive:false};
 console.log('[AUDIT ATTENTE COPRO PERSISTANTE] '+JSON.stringify(r));return r;
}
