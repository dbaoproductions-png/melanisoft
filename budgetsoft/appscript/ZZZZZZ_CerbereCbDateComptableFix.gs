const CERBERE_CB_DATE_COMPTABLE_FIX_VERSION = '2026-08-26.1';

/**
 * Correctif Cerbère : pour une CB différée, la date comptable réelle est
 * autoritaire dès qu'elle est connue. La projection par date d'achat n'est
 * utilisée qu'en l'absence de date comptable.
 */
function dateImputationCarteCerbereBudgetSoft_(o) {
  const dateComptable = dateValideVentilationBudgetSoft_(o && o.date_comptable);
  if (dateComptable) return dateComptable;

  const d = dateAchatMetierBudgetSoft_(o);
  if (!d) return null;
  const debut = d.getDate() >= 28
    ? new Date(d.getFullYear(), d.getMonth(), 28)
    : new Date(d.getFullYear(), d.getMonth() - 1, 28);
  return new Date(debut.getFullYear(), debut.getMonth() + 1, 28);
}
