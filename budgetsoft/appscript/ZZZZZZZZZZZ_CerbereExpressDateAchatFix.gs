/**
 * Correctif Cerbère Express — date comportementale autoritaire.
 *
 * Express doit rattacher une dépense au moment où elle a été décidée/achetée,
 * même lorsqu'une ancienne ligne PDF n'est pas considérée comme « CB structurée ».
 * Dès qu'une date_achat métier fiable existe, elle est donc prioritaire.
 * La date comptable/date bancaire n'est qu'un repli.
 */
function dateAchatExpress_(o) {
  const achat = typeof dateAchatMetierBudgetSoft_ === 'function'
    ? dateAchatMetierBudgetSoft_(o)
    : dateExpress_(o && o.date_achat);
  if (achat) return achat;
  if (typeof dateOperationCouranteBudgetSoft_ === 'function') return dateOperationCouranteBudgetSoft_(o);
  return dateExpress_(o && (o.date_comptable || o.date));
}

/**
 * Audit court du correctif : recense les dépenses que l'ancienne logique aurait
 * placées dans le cycle par date comptable alors que leur date d'achat est hors cycle.
 * Lecture seule.
 */
function auditerCorrectifDateAchatCerbereExpress20260827() {
  const cerbere = chargerCerbereV374();
  const p = cerbere && Array.isArray(cerbere.periodes) ? cerbere.periodes[0] : null;
  if (!p || !p.periode) throw new Error('Période courante Cerbère introuvable.');
  const debut = dateExpress_(p.periode.debut), fin = dateExpress_(p.periode.fin), maintenant = new Date();
  const cats = new Set((p.enveloppes || []).map(x=>String(x&&x.categorie||'').trim()).filter(Boolean));
  const ops0 = lireTable_('Operations') || [];
  const ops = typeof dedoublonnerOperationsCartesBudgetSoft_ === 'function' ? dedoublonnerOperationsCartesBudgetSoft_(ops0) : ops0;
  const details=[];
  ops.forEach(o=>{
    const m=Number(o&&o.montant||0), cat=String(o&&o.categorie||'').trim();
    if(!Number.isFinite(m)||m>=0||!cats.has(cat))return;
    const dc=typeof dateOperationCouranteBudgetSoft_==='function'?dateOperationCouranteBudgetSoft_(o):dateExpress_(o&&(o.date_comptable||o.date));
    const da=typeof dateAchatMetierBudgetSoft_==='function'?dateAchatMetierBudgetSoft_(o):dateExpress_(o&&o.date_achat);
    if(!dc||!da||dc>maintenant)return;
    if(dansCycleExpress_(dc,debut,fin)&&!dansCycleExpress_(da,debut,fin))details.push({id:String(o.id||''),categorie:cat,montant:arrExpress_(Math.abs(m)),dateAchat:formatDateExpress_(da),dateComptable:formatDateExpress_(dc),libelle:String(o.libelle_bancaire||o.libelle||'')});
  });
  const res={ok:true,lectureSeule:true,nombre:details.length,montant:arrExpress_(details.reduce((s,x)=>s+x.montant,0)),details:details.slice(0,50)};
  console.log(JSON.stringify(res));
  return res;
}
