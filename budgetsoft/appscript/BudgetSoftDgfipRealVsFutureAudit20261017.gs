/** Audit en lecture seule des prélèvements DGFIP du 18 octobre et écritures déjà constatées. */
function auditerDgfipDejaDebitesMaisFuturs20261017(){
  verifierInitialisation_();
  const ops=lireTable_('Operations')||[];
  const compte='05f09474-e55b-4b64-b438-e31439514fdc';
  const today=jourReferenceCanonBudgetSoft20260906_(new Date());
  const isDgfip=o=>/dgfip|d[\s.\-]*g[\s.\-]*f[\s.\-]*i[\s.\-]*p|impo\b|imp[oô]t/i.test(
    [o.libelle_bancaire,o.libelle,o.marchand_normalise,o.commentaire].filter(Boolean).join(' '));
  const targets=[169,194],result=[];
  for(const montant of targets){
    const items=ops.filter(o=>String(o.compte||'')===compte&&
      String(o.type||'').toLowerCase()==='depense'&&
      Math.abs(Math.abs(Number(o.montant||0))-montant)<0.011&&isDgfip(o))
      .map(o=>({id:String(o.id||''),libelle:String(o.libelle_bancaire||o.libelle||'').slice(0,150),
        date:String(o.date||''),dateComptableBrute:String(o.date_comptable||''),
        jourComptableCanon:jourComptableCanonBudgetSoft20260906_(o),
        source:String(o.source_bancaire||''),statut:String(o.statut_bancaire||''),
        rapprochement:String(o.cle_rapprochement||''),chargeFixeId:String(o.charge_fixe_id||'')}));
    result.push({montant,candidats:items,avantOuJour:items.filter(x=>x.jourComptableCanon&&x.jourComptableCanon<=today).length,
      futurs:items.filter(x=>x.jourComptableCanon&&x.jourComptableCanon>today).length});
  }
  let engagements=null,erreur='';
  try{
    const e=chargerEngagementsBancairesFutursSource20260912_();
    engagements=(e.detailPrelevements||[]).filter(x=>targets.some(t=>Math.abs(Number(x.montant||0)-t)<0.011));
  }catch(e){erreur=String(e&&e.message||e)}
  const out={ok:true,lectureSeule:true,version:'2026-10-17.1',dateReference:today,
    cibles:result,engagementsFutursDuCalcul:engagements,erreurEngagements:erreur,
    note:'Détecte les candidats mais ne prouve pas un même mandat sans vérifier les libellés/identifiants. Aucune écriture modifiée.'};
  console.log('[AUDIT DGFIP REEL VS FUTUR] '+JSON.stringify(out));return out;
}
