function auditerPerimetreImpot96Dashboard20261012(){
  verifierInitialisation_();
  const id='b8b84363-088b-4b09-91c8-e645d5105930';
  const sources=chargerToutesLesDonnees(),brutes=sources.Operations||[];
  const apresDedup=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(brutes):brutes;
  const compteId='05f09474-e55b-4b64-b438-e31439514fdc';
  const comptes=(sources.Comptes||[]).map(c=>({id:String(c.id||''),nom:String(c.nom||''),type:String(c.type||''),actif:c.actif}));
  const r=typeof construireSyntheseComptes20260828_==='function'?construireSyntheseComptes20260828_():null;
  const synth=(r&&r.comptes||[]).map(c=>({id:String(c.id||''),nom:String(c.nom||''),type:String(c.type||''),soldeReel:c.soldeReel}));
  const op=brutes.find(x=>String(x.id)===id)||null;
  const d=op?new Date(op.date_comptable||op.date):null;
  const out={ok:true,lectureSeule:true,id:id,date:d&&!isNaN(d)?d.toISOString():null,
    avantDedoublonnage:brutes.filter(x=>String(x.id||'')===id).length,
    apresDedoublonnage:apresDedup.filter(x=>String(x.id||'')===id).length,
    compteDansSources:comptes.filter(c=>c.id===compteId),
    compteDansSynthese:synth.filter(c=>c.id===compteId),
    comptesSynthese:synth,
    candidatDedup:apresDedup.find(x=>String(x.id||'')===id)||null};
  console.log('[AUDIT PERIMETRE IMPOT96 DASHBOARD 20261012] '+JSON.stringify(out));return out;
}