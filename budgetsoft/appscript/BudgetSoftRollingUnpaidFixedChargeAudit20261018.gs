/**
 * AUDIT EN LECTURE SEULE — occurrences impayees de copropriete.
 * Ne produit aucun paiement, aucune operation, aucune date fictive.
 * Une charge reconnue dans CFT1 ne doit pas etre deduite de nouveau de Cerbere.
 */
function auditerReportGlissantCopro20261018(){
  const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
  const arr=n=>Math.round(Number(n||0)*100)/100;
  const charge=(lireTable_('Charges_fixes')||[]).find(x=>String(x.id||'')===id);
  if(!charge)throw new Error('Charge copro introuvable');
  const snap=chargerSnapshotGlobalLegacyBudgetSoft20260906_();
  const etat=snap&&snap.etat||{},mods=etat.modules||{};
  if(etat.publie!==true||etat.ok!==true)throw new Error('Snapshot non publie ou invalide');
  const court=mods.dashboard&&mods.dashboard.courtTerme||{};
  const cer=mods.cerbere||{},p=(cer.periodes||[])[0]||{};
  const audit=cer.diagnostic&&cer.diagnostic.p1Doctrine20260912||{};
  const ligne=((audit.cft1Audit||{}).lignes||[]).find(x=>String(x.id||'')===id);
  const operations=(lireTable_('Operations')||[]).filter(o=>String(o.charge_fixe_id||'')===id)
     .map(o=>({id:String(o.id||''),date:String(o.date_comptable||o.date||''),
       montant:arr(o.montant),source:String(o.source||'')}));
  const projections=((mods.projectionEtendue||{}).lignes||[]).filter(x=>String(x.sourceId||'')===id)
    .map(x=>({id:String(x.id||''),date:String(x.date||''),montant:arr(x.montantSigne||0)}));
  const dateFin=String(court.fin||'');
  const inCycle=projections.filter(x=>String(x.date).slice(0,10)<=dateFin);
  const montant=arr(charge.montant);
  const retenu=arr(ligne&&ligne.retenu);
  const dejaReel=operations.some(o=>String(o.date).slice(0,10)>=String(court.debut||'')&&
    String(o.date).slice(0,10)<=dateFin);
  const aProvisionner=!!ligne&&!dejaReel&&inCycle.length===0;
  const constate=arr(court.depensesConstatees),attendu=arr(court.depensesAttendues);
  const out={ok:!!ligne&&montant===550&&retenu===550,lectureSeule:true,
    version:'2026-10-18.1',revision:String(etat.revisionBudgetSoft||''),
    charge:{id,libelle:String(charge.libelle||''),montant,frequence:String(charge.frequence||''),
      dateDebut:String(charge.date_debut||''),jourExecution:String(charge.jour_execution||charge.jour||'')},
    cycle:{debut:String(court.debut||''),fin:dateFin,reference:String(court.dateReference||'')},
    occurrencesDansCft1:Number(ligne&&ligne.occurrences||0),retenuDejaDansCft1:retenu,
    operationsRattachees:operations,projections,projectionDansCycle:inCycle.length,
    paiementConstateDansCycle:dejaReel,provisionEconomiqueNecessaire:aProvisionner,
    scenario:{depensesConstatees:constate,depensesAttenduesPubliees:attendu,
      depensesAttenduesAvecProvision:aProvisionner?arr(attendu+montant):attendu,
      cft1Inchange:true,dateBanqueNonInventee:true},
    garde:'Le test demontre uniquement la difference de presentation sur le cycle. La preuve d impaye ancien, la reconciliation des echeances et la coexistence de mensualites restent a valider avant implementation canonique.'};
  console.log('[AUDIT REPORT GLISSANT COPRO] '+JSON.stringify(out));return out;
}
