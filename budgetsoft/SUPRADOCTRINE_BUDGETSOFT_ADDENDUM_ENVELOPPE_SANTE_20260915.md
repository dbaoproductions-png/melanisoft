# Addendum supradoctrine BudgetSoft — enveloppe Santé — 15/09/2026

## Principe
La catégorie Santé conserve deux lectures simultanées sans confusion de propriétaire.

1. **Comptabilité / trésorerie globale** : chaque dépense Santé reste un débit et chaque remboursement Sécu/mutuelle reste un crédit. Aucun flux bancaire n'est supprimé, fusionné ou antidaté.
2. **Enveloppe pilotable Santé** : la consommation du cycle est calculée en net sur les seuls flux réellement constatés : `max(0, dépenses Santé réelles - remboursements Santé réellement encaissés)`.

## Conséquences
- un remboursement encaissé reconstitue la molette Santé dans le cycle où il est reçu, même s'il rembourse une dépense d'un cycle antérieur ;
- un remboursement seulement attendu ou planifié ne reconstitue jamais la molette ;
- la consommation Santé est bornée à zéro : un excédent de remboursement ne crée pas une allocation Santé supérieure à la décision prise ;
- l'excédent de remboursement reste intégralement une recette réelle pour la trésorerie et les agrégats globaux ;
- cette règle est propre à Santé et ne doit pas être généralisée aux autres enveloppes sans décision doctrinale explicite ;
- Pn reste un indicateur de soutenabilité et n'est pas redéfini par cette règle ; EPn reste la somme des allocations décidées.

## Propriétaires
- Détection des faits Santé : moteur Cerbère existant (`indexerDonneesCerbereV35_` dans `CerbereV33.gs`).
- Normalisation de consommation de la molette : `normaliserCerbereSantePourSnapshot20260915_` dans `BudgetSoftEnvelopeSante20260915.gs`.
- Agrégation EP : `calculerEnvelopePilotableBudgetSoft20260913_` / `enrichirEnvelopePilotableBudgetSoft20260913_` dans `BudgetSoftEnvelopePilotable20260913.gs`.
- Construction snapshot autoritaire : `reconstruireSnapshotGlobalSyntheseBudgetSoft20260907` dans `BudgetSoftGlobalSnapshotSynthese20260907.gs`.
