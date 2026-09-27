const MAINTENANCE_GOOGLE_ONE_20260927_VERSION='2026-09-27.1';

function corrigerDeuxAbonnementsGoogleOne20260927(){
  const ID_CF_FIN_MOIS='4f91ac6e-513e-4329-b32e-72d5127602f9';
  const ID_CF_SECOND='14138a72-50a8-4f5c-89e9-db6d60f0bb92';
  const ID_OP_SECOND='629f4122-3f6e-47e3-a09f-ebee29bf51ac';

  const charges=lireTable_('Charges_fixes')||[];
  const ops=lireTable_('Operations')||[];
  const cf1=charges.find(function(c){return String(c&&c.id||'')===ID_CF_FIN_MOIS;});
  const cf2=charges.find(function(c){return String(c&&c.id||'')===ID_CF_SECOND;});
  const op=ops.find(function(o){return String(o&&o.id||'')===ID_OP_SECOND;});
  if(!cf1||!cf2||!op)throw new Error('Google One : charge(s) ou operation cible introuvable(s).');

  const avant={
    chargeFinMois:{id:cf1.id,montant:Number(cf1.montant||0),jour_execution:Number(cf1.jour_execution||0)},
    secondAbonnement:{id:cf2.id,montant:Number(cf2.montant||0),jour_execution:Number(cf2.jour_execution||0)},
    operation:{id:op.id,montant:Number(op.montant||0),date_achat:String(op.date_achat||''),charge_fixe_id:String(op.charge_fixe_id||'')}
  };

  if(Math.abs(Number(op.montant||0)+2.99)>.001)throw new Error('Google One : l operation cible n est plus a -2,99 EUR.');
  const da=new Date(op.date_achat||'');
  if(isNaN(da.getTime()))throw new Error('Google One : date achat cible invalide.');
  const jour=da.getDate();

  const maj=Object.assign({},cf2,{
    montant:2.99,
    jour_execution:jour,
    commentaire:[String(cf2.commentaire||'').trim(),'[MAINT_GOOGLE_ONE_20260927] second abonnement : 2,99 EUR, date achat de reference le '+jour].filter(Boolean).join(' ')
  });
  enregistrerLigne('Charges_fixes',maj);

  if(typeof migrerLienHistoriqueChargeFixeBudgetSoft_!=='function')throw new Error('Moteur canonique de migration CF indisponible.');
  const lien=migrerLienHistoriqueChargeFixeBudgetSoft_(ID_OP_SECOND,ID_CF_SECOND,'correction Google One : second abonnement distinct');

  if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('maintenance-google-one-20260927');
  if(typeof marquerSnapshotGlobalBudgetSoftObsolete20260916_==='function')marquerSnapshotGlobalBudgetSoftObsolete20260916_('maintenance-google-one-20260927');

  const chargesApres=lireTable_('Charges_fixes')||[];
  const opsApres=lireTable_('Operations')||[];
  const a1=chargesApres.find(function(c){return String(c&&c.id||'')===ID_CF_FIN_MOIS;})||{};
  const a2=chargesApres.find(function(c){return String(c&&c.id||'')===ID_CF_SECOND;})||{};
  const ao=opsApres.find(function(o){return String(o&&o.id||'')===ID_OP_SECOND;})||{};
  const out={
    ok:String(ao.charge_fixe_id||'')===ID_CF_SECOND&&Math.abs(Number(a2.montant||0)-2.99)<.001&&Number(a2.jour_execution||0)===jour,
    version:MAINTENANCE_GOOGLE_ONE_20260927_VERSION,
    avant:avant,
    apres:{
      chargeFinMois:{id:String(a1.id||''),montant:Number(a1.montant||0),jour_execution:Number(a1.jour_execution||0)},
      secondAbonnement:{id:String(a2.id||''),montant:Number(a2.montant||0),jour_execution:Number(a2.jour_execution||0)},
      operation:{id:String(ao.id||''),montant:Number(ao.montant||0),date_achat:String(ao.date_achat||''),charge_fixe_id:String(ao.charge_fixe_id||'')}
    },
    rapprochement:lien,
    doctrine:'Deux abonnements Google One distincts : 1,99 EUR fin de mois et 2,99 EUR selon la date achat observee du second abonnement.'
  };
  console.log('[MAINT GOOGLE ONE 20260927] '+JSON.stringify(out));
  return out;
}

function auditerCorrectionDeuxAbonnementsGoogleOne20260927(){
  const ID_CF1='4f91ac6e-513e-4329-b32e-72d5127602f9';
  const ID_CF2='14138a72-50a8-4f5c-89e9-db6d60f0bb92';
  const ID_OP='629f4122-3f6e-47e3-a09f-ebee29bf51ac';
  const charges=lireTable_('Charges_fixes')||[],ops=lireTable_('Operations')||[];
  const a=charges.find(function(c){return String(c&&c.id||'')===ID_CF1;})||{};
  const b=charges.find(function(c){return String(c&&c.id||'')===ID_CF2;})||{};
  const o=ops.find(function(x){return String(x&&x.id||'')===ID_OP;})||{};
  const out={
    ok:Math.abs(Number(a.montant||0)-1.99)<.001&&Math.abs(Number(b.montant||0)-2.99)<.001&&String(o.charge_fixe_id||'')===ID_CF2,
    version:MAINTENANCE_GOOGLE_ONE_20260927_VERSION,
    charge1:{id:String(a.id||''),montant:Number(a.montant||0),jour_execution:Number(a.jour_execution||0)},
    charge2:{id:String(b.id||''),montant:Number(b.montant||0),jour_execution:Number(b.jour_execution||0)},
    operation:{id:String(o.id||''),montant:Number(o.montant||0),date_achat:String(o.date_achat||''),charge_fixe_id:String(o.charge_fixe_id||'')}
  };
  console.log('[AUDIT CORRECTION GOOGLE ONE 20260927] '+JSON.stringify(out));
  return out;
}
