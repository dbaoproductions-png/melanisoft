/** Simulation lecture seule du provisionnement copro 550 EUR, sans operation bancaire fictive. */
function auditerSimulationProvisionCoproCycle20261018(){
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1';
 const arr=n=>Math.round(Number(n||0)*100)/100;
 const charge=(lireTable_('Charges_fixes')||[]).find(x=>String(x.id||'')===id);
 if(!charge)throw new Error('Charge copro non trouvee');
 const ops=(lireTable_('Operations')||[]).filter(o=>String(o.charge_fixe_id||'')===id);
 const st=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),etat=st&&st.etat||{};
 if(!etat.ok||!etat.publie)throw new Error('Snapshot valide publie manquant');
 const m=etat.modules||{},dashboard=m.dashboard&&m.dashboard.courtTerme||{},
  cer=m.cerbere||{},p=(cer.periodes||[])[0]||{},v=p.v37||{},
  projection=m.projectionEtendue||{};
 const d=cer.diagnostic&&cer.diagnostic.p1Doctrine20260912||{};
 const lignes=d.cft1Audit&&d.cft1Audit.lignes||[];
 const ligne=lignes.find(x=>String(x.id||'')===id)||null;
 const prev=(projection.lignes||[]).filter(x=>String(x.sourceId||'')===id)
   .map(x=>({date:String(x.date||''),montant:arr(x.montantSigne),source:String(x.source||'')}));
 const rec=arr(Number(dashboard.depensesConstatees||0)),att=arr(Number(dashboard.depensesAttendues||0)),
  restant=arr(att-rec),montant=arr(charge.montant);
 const isReal=ops.some(o=>{const date=new Date(o.date_comptable||o.date);return !isNaN(date)&&date>=new Date('2026-09-28T00:00:00+02:00')&&date<=new Date('2026-10-27T23:59:59+01:00')});
 const alreadyProjectedCurrent=prev.some(x=>{const dt=new Date(x.date);return !isNaN(dt)&&dt>=new Date('2026-09-28T00:00:00+02:00')&&dt<=new Date('2026-10-27T23:59:59+02:00')});
 const condition=!!ligne&&!isReal&&!alreadyProjectedCurrent;
 const out={ok:true,lectureSeule:true,version:'2026-10-18.1',revision:String(etat.revisionBudgetSoft||''),
  charge:{id,libelle:String(charge.libelle||''),montant,frequence:String(charge.frequence||''),actif:String(charge.actif||'')},
  cycle:{debut:String(dashboard.debut||''),fin:String(dashboard.fin||''),reference:String(dashboard.dateReference||'')},
  reelBancaireRattacheDansCycle:isReal,operationsRattachees:ops.map(o=>({id:String(o.id||''),date:String(o.date_comptable||o.date||''),montant:arr(o.montant)})),
  chargeDansCerbere:ligne,projectionBancaire:prev,projectionDansCycle:alreadyProjectedCurrent,
  depenses:{constatees:rec,attenduesPubliees:att,restePublie:restant,
    scenarioAjoutProvision:arr(att+montant),resteSiProvision:arr(restant+montant)},
  statut:'SIMULATION uniquement : provision economique dans le cycle, date bancaire non confirmee',
  propositionEligible:condition,
  garde:'Aucune ecriture bancaire ni modification de R0, Cerbere, charges fixes ou projection; scenario non applicable si la charge est deja couverte.'};
 console.log('[AUDIT SIMULATION PROVISION COPRO 550] '+JSON.stringify(out));return out;
}
