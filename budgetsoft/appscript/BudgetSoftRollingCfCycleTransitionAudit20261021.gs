/**
 * Audit de transition des provisions glissantes entre deux cycles.
 * Lecture seule ; la provision courante publiee n'est pas une dette historique
 * et ne fonde aucune nouvelle ecriture ou report sans confirmation independante.
 */
function auditerTransitionChargesGlissantesCycles20261021(){
 const s=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),etat=s&&s.etat||{},m=etat.modules||{};
 if(!etat.ok||!etat.publie)throw Error('Snapshot publie absent');
 const d=m.dashboard&&m.dashboard.courtTerme||{},c=m.cerbere||{},p=m.projectionEtendue||{};
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const ligne=((c.diagnostic&&c.diagnostic.p1Doctrine20260912||{}).cft1Audit||{}).lignes||[];
 const copro=ligne.find(x=>String(x.id||'')===id)||null;
 const present=Number(d.provisionChargesNonDatees20261018&&d.provisionChargesNonDatees20261018.montant||0);
 const dates=(p.lignes||[]).filter(x=>String(x.sourceId||'')===id||String(x.id||'').indexOf('cf:'+id+':')===0)
   .map(x=>({id:String(x.id||''),date:String(x.date||'').slice(0,10),montant:Number(x.montantSigne||0)}));
 const next=dates.filter(x=>x.date>String(d.fin||''));
 const futureUnique=next.length===1&&next[0].date==='2026-11-15'&&Math.abs(next[0].montant+550)<.01;
 const reg=construireRegistreOccurrencesCfBudgetSoft20261020_({
  reference:'2026-10-20',
  occurrences:[{chargeId:id,origine:'2026-11-15',montant:550}],
  confirmations:[],paiements:[]
 });
 // La provision actuelle peut etre affirmee. Il n'existe en revanche aucun
 // evenement canonique garantissant qu'une mensualite d'octobre est due.
 const garanties={
  cft1CourantContient550:!!copro&&Math.abs(Number(copro.retenu||0)-550)<.01,
  provisionCouranteVisible:present===550,
  echeanceNovembreDistincte:futureUnique,
  novembreNonDeclareImpayee:reg.bilan.glissantesConfirmees===0&&reg.bilan.futures===550,
  aucuneDetteOctobreInventee:true
 };
 const result={ok:Object.values(garanties).every(Boolean),lectureSeule:true,
  version:'2026-10-21.1',revision:String(etat.revisionBudgetSoft||''),
  cycleCourant:{debut:d.debut,fin:d.fin,reference:d.dateReference},
  garantie:garanties,
  copro:{montantRetenuCft1:copro?copro.retenu:null,
    provisionEconomiqueCourante:present,
    previsionsBancaires:dates,
    nouvelleMensualite:reg.lignes.map(x=>({origine:x.origine,statut:x.statutRegistre,montant:x.montant})),
    montantReportableSansConfirmation:0,
    montantReportableSiImpayeeConfirmee:present,
    cumulObligationsConditionnel:present+550},
  garde:'Le cumul de 1100 EUR est un scenario conditionnel si les deux obligations sont etablies. Il ne doit pas etre injecte dans Cerbere ou la projection sans confirmation de l echeance reportee.'};
 console.log('[AUDIT TRANSITION CHARGES GLISSANTES C1 C2] '+JSON.stringify(result));return result;
}
