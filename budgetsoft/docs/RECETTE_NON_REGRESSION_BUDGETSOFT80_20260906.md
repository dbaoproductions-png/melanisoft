# BudgetSoft — recette de non-régression du 06/09/2026

Jeu témoin : classeur **BudgetSoft (80)** fourni le 06/09/2026.

Cette recette sert uniquement au développement. Les valeurs ci-dessous ne doivent jamais être codées comme données métier dans BudgetSoft. Elles sont des résultats attendus pour ce jeu de données précis et deviennent caduques dès que la signature du classeur change.

## Signature

- Operations : **2 595** lignes
- Credits : **7** lignes
- Dettes : **3** lignes

## Valeurs attendues vérifiées

- CB déjà engagée Cerbère pour le report C1 → C2 : **823,99 €**
- Nombre d'opérations à date comptable du 07/09/2026 : **9**
- Total des débits comptables du 07/09/2026 : **698,82 €**
- Capital restant dû des crédits amortissables : **108 370,87 €**
- Encours utilisé des crédits renouvelables : **12 375,93 €**
- Dettes hors crédit actives : **1 242,20 €**

## Correction importante du 06/09/2026

Le montant **−1 095,50 €** vu sur la capture Hello bank! du **05/09/2026** est un **solde bancaire observé « aujourd'hui »**, et non un résultat attendu du moteur BudgetSoft au 07/09.

Il avait été associé à tort à un « solde prévisionnel au 07/09 » dans la première version de cette recette. Cette association est supprimée.

La capture a été prise un samedi et Hello bank! peut déjà refléter dans son solde affiché une partie d'opérations portant une date comptable bancaire au lundi 07/09. Cela ne modifie pas la règle BudgetSoft : hors Cerbère, la frontière temporelle reste `date_comptable`.

En conséquence, **aucun montant absolu de solde au 07/09 n'est utilisé comme oracle tant que le pont exact entre le dernier solde comptable BudgetSoft et toutes les opérations des 05–07/09 n'a pas été audité ligne à ligne**.

## Règles de contrôle

1. Les neuf opérations du 07/09 restent futures avant le 07/09 dans tous les modules généraux.
2. Elles doivent être incluses une seule fois dans le solde prévisionnel au 07/09 selon leur date comptable.
3. La CB différée est la seule exception de lecture anticipée, exclusivement dans Cerbère/Cerbère Express.
4. Les agrégats crédits doivent être identiques dans Crédits, Patrimoine, Analyse et le snapshot global.
5. Une nouvelle révision globale incohérente n'est pas publiée : la dernière révision validée reste active.
6. Un solde bancaire observé dans l'interface de la banque et un solde comptable BudgetSoft sont deux grandeurs différentes tant qu'un rapprochement explicite n'établit pas qu'ils portent exactement le même ensemble d'opérations.

Le contrôle exécutable correspondant se trouve dans `appscript/BudgetSoftRegressionGuard20260906.gs`, complété par le correctif terminal `ZZZZZZZZZZZZZZ_RegressionOracleCorrection20260906.gs` et la fonction `auditerPontTresorerie07092026BudgetSoft()`.
