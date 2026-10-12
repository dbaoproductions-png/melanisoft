/**
 * Diagnostic sans écriture du prelevement Impot 96 EUR mensuel.
 * Ne force pas une echeance si elle est deja couverte ou volontairement exclue.
 */
function auditerImpot96Prelevements20261012(){
  verifierInitialisation_();
  const charges=lireTable_('Charges_fixes')||[];
  const cible=charges.filter(c=>{
    const lib=String(c.libelle||'')+' '+String(c.libelle_bancaire||'');
    return /imp[oô]t|dgfip|d\s*g\s*f\s*i\s*p/i.test(lib)&&Math.abs(Number(c.montant||0)-96)<.01;
  });
  const reference=new Date(2026,9,12,12),fin=new Date(2026,9,27,23,59);
  const ajustements=typeof lireAjustementsChargesFixes==='function'?lireAjustementsChargesFixes():[];
  const r=typeof chargerEngagementsBancairesFutursSource20260912_==='function'?chargerEngagementsBancairesFutursSource20260912_():null;
  const lignes=cible.map(c=>{
    const actif=convertirBooleen_(c.actif);
    const debut=c.date_debut?dateLocaleBudgetSoft_(c.date_debut):reference;
    const dateFin=c.date_fin?dateLocaleBudgetSoft_(c.date_fin):null;
    const dateRecherche=new Date(Math.max(reference.getTime()+1,debut.getTime()));
    const brut=calculerEcheancesJusqua_(c,dateRecherche,dateFin,fin);
    const ajuste=calculerEcheancesChargeFixeAjustees_(c,dateRecherche,dateFin,fin,ajustements);
    const nom=String(c.libelle||'');
    const detail=(r&&r.detailChargesFixes||[]).filter(x=>String(x.chargeId)===String(c.id));
    const couvert=(r&&r.rapprochements||[]).filter(x=>String(x.chargeId)===String(c.id));
    return{id:String(c.id||''),libelle:nom,montant:Number(c.montant||0),actif:actif,
      frequence:String(c.frequence||''),jour:String(c.jour_execution||c.jour||c.jour_echeance||''),
      dateDebut:String(c.date_debut||''),dateFin:String(c.date_fin||''),compte:String(c.compte||''),
      brut:brut.map(x=>Utilities.formatDate(x,Session.getScriptTimeZone(),'yyyy-MM-dd')),
      apresAjustements:ajuste.map(x=>({date:Utilities.formatDate(x.date,Session.getScriptTimeZone(),'yyyy-MM-dd'),montant:x.montant})),
      ajustements:ajustements.filter(x=>String(x.charge_fixe_id)===String(c.id)),
      presentDansEngagements:detail,chargeCouverteParBanque:couvert};
  });
  const out={ok:true,lectureSeule:true,version:'2026-10-12.1',dateReference:'2026-10-12',
    dateAttendue:'2026-10-15',nombreChargesCandidates:lignes.length,
    lignes,operationsPrelevements:r&&r.detailPrelevements||[],
    nombreEcheancesRestantes:r&&r.nombreChargesFixesRestantes||0};
  console.log('[AUDIT IMPOT 96 ECHEANCE 20261012] '+JSON.stringify(out));return out;
}