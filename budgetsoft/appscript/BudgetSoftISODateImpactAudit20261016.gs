/**
 * Audit en lecture seule avant validation du correctif de date ISO.
 * Liste les jours comptables qui changent, sans modifier les opérations.
 */
function auditerImpactDatesISOCanonBudgetSoft20261016(){
  verifierInitialisation_();
  const tz=Session.getScriptTimeZone(),cas=[
    {nom:'Metis minuit Paris',valeur:'2026-09-28T22:00:00.000Z',attendu:'2026-09-29'},
    {nom:'Date civile nue',valeur:'2026-09-29',attendu:'2026-09-29'},
    {nom:'Date francaise',valeur:'29/09/2026',attendu:'2026-09-29'},
    {nom:'ISO local sans zone',valeur:'2026-09-29T00:00:00',attendu:'2026-09-29'},
    {nom:'ISO explicite +02',valeur:'2026-09-29T00:00:00+02:00',attendu:'2026-09-29'},
    {nom:'Changement heure hiver',valeur:'2026-10-25T23:30:00.000Z',attendu:'2026-10-26'},
    {nom:'Jour sans decalage UTC',valeur:'2026-09-29T10:00:00.000Z',attendu:'2026-09-29'}
  ];
  const tests=cas.map(c=>({nom:c.nom,obtenu:jourCanonBudgetSoft20260906_(c.valeur),attendu:c.attendu,
    ok:jourCanonBudgetSoft20260906_(c.valeur)===c.attendu}));
  const ops=lireTable_('Operations');
  const anciens=o=>{
    const valeur=o&&(o.date_comptable||o.date);
    if(valeur==null||valeur==='')return null;
    if(valeur instanceof Date)return Utilities.formatDate(valeur,tz,'yyyy-MM-dd');
    const s=String(valeur).trim();
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
    if(m)return m[1]+'-'+m[2]+'-'+m[3];
    const f=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(f)return f[3]+'-'+String(f[2]).padStart(2,'0')+'-'+String(f[1]).padStart(2,'0');
    const d=new Date(valeur);
    return isNaN(d.getTime())?null:Utilities.formatDate(d,tz,'yyyy-MM-dd');
  };
  const changes=[];
  ops.forEach(o=>{
    const avant=anciens(o),apres=jourComptableCanonBudgetSoft20260906_(o);
    if(avant===apres)return;
    changes.push({id:String(o.id||''),avant,apres,montant:Number(o.montant||0),
      type:String(o.type||''),source:String(o.source_bancaire||''),compte:String(o.compte||'')});
  });
  const metis=changes.find(x=>x.id==='25e75f29-4efa-4985-859e-2636caa6b234')||null;
  const out={ok:tests.every(x=>x.ok)&&tz==='Europe/Paris'&&!!metis&&
    metis.avant==='2026-09-28'&&metis.apres==='2026-09-29',
    lectureSeule:true,version:'2026-10-16.1',fuseau:tz,tests,
    nombreOperations:ops.length,nombreDatesModifiees:changes.length,
    metis,changements:changes.slice(0,100),resultatsTronques:changes.length>100,
    avertissement:'Date canonique recalculée seulement en mémoire ; aucun snapshot ou solde bancaire actualisé.'};
  console.log('[AUDIT IMPACT ISO JOURS CANONIQUES] '+JSON.stringify(out));return out;
}
