# BudgetSoft — recette de non-régression du 06/09/2026

Jeu témoin : classeur **BudgetSoft (80)** fourni le 06/09/2026.

Cette recette sert uniquement au développement. Les valeurs ci-dessous ne doivent jamais être codées comme données métier dans BudgetSoft. Elles sont des résultats attendus pour ce jeu de données précis et deviennent caduques dès que la signature du classeur change.

## Signature

- Operations : **2 595** lignes
- Credits : **7** lignes
- Dettes : **3** lignes

## Valeurs attendues

- CB déjà engagée Cerbère pour le report C1 → C2 : **823,99 €**
- Nombre d'opérations à date comptable du 07/09/2026 : **9**
- Total des débits comptables du 07/09/2026 : **698,82 €**
- Solde bancaire réel de référence au 06/09/2026 : **−396,68 €**
- Solde prévisionnel au 07/09/2026 après ces débits : **−1 095,50 €**
- Capital restant dû des crédits amortissables : **108 370,87 €**
- Encours utilisé des crédits renouvelables : **12 375,93 €**
- Dettes hors crédit actives : **1 242,20 €**

## Règles de contrôle

1. Les neuf opérations du 07/09 restent futures avant le 07/09 dans tous les modules généraux.
2. Elles doivent être incluses une seule fois dans le solde prévisionnel au 07/09 selon leur date comptable.
3. La CB différée est la seule exception de lecture anticipée, exclusivement dans Cerbère/Cerbère Express.
4. Les agrégats crédits doivent être identiques dans Crédits, Patrimoine, Analyse et le snapshot global.
5. Une nouvelle révision globale incohérente n'est pas publiée : la dernière révision validée reste active.

Le contrôle exécutable correspondant se trouve dans `appscript/BudgetSoftRegressionGuard20260906.gs`, fonction `auditerOracleBudgetSoft80_20260906()`.
