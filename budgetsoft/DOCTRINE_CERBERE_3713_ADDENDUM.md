# Addendum doctrine Cerbère 3.7.13

Cette doctrine précise la section 9 de `BUDGETSOFT_DOCTRINE.md` et prévaut en cas de contradiction.

## SS1 réel et SS1 projeté

- SS1 d'un cycle ouvert = dernier solde bancaire du cycle précédent immédiatement avant le salaire d'ouverture.
- Le salaire d'ouverture est conventionnellement imputé au 28 ; sa date bancaire 27/28/29 ne change que le rapprochement du montant.
- Tant que M+1 n'est pas ouvert, son SS1 est **projeté au 27 juste avant le salaire suivant**.
- Le SS1 projeté M+1 n'est jamais `SCt1(M)` et ne dépend pas des allocations P1 non dépensées.
- Il est construit depuis `SHBt1` du cycle courant, augmenté/diminué uniquement des flux bancaires suffisamment certains restant réellement à passer avant la frontière : CF non encore rapprochées et événements bancaires confirmés. Quand de nouvelles opérations bancaires arrivent, SHBt1 et donc la projection sont recalculés.

## Distinction trajectoire / frontière bancaire

- `SCt1` répond à : « quelle est la trajectoire budgétaire de ce cycle avec le pilotable retenu ? »
- `SS1 projeté M+1` répond à : « quel solde bancaire devrait rester juste avant le salaire suivant ? »
- Les deux indicateurs ne doivent donc jamais être recopiés l'un dans l'autre.

## Actions : réalisation et effet financier

- La date de réalisation d'une action et sa date d'effet financier sont deux notions distinctes.
- Une résiliation réalisée aujourd'hui n'améliore pas le cycle courant si elle supprime une échéance qui aurait eu lieu dans un cycle futur.
- Pour une suppression ponctuelle d'une charge annuelle déjà observée, l'économie est portée par la prochaine échéance annuelle supprimée, pas par la date de réalisation de la résiliation.
- La carte Actions & Événements du cycle n'affiche dans son impact net que les effets financiers applicables au cycle affiché.

## R0 daté

- Toute modification datée de R0 s'applique au premier cycle dont l'ouverture est à ou après sa date d'effet.
- Revenus fonciers : 755 € pour le cycle ouvert le 28/07/2026 ; 780 € à partir du cycle ouvert le 28/08/2026.

## CF, HEt1 et pilotable

- Une opération reconnue comme charge fixe remplace l'occurrence CF prévue et ne doit apparaître ni dans HEt1 ni dans une molette pilotable.
- Les rapprochements forts peuvent utiliser l'identifiant/validation existante, le libellé, ou à défaut une combinaison non ambiguë catégorie + montant exact + proximité du jour d'échéance.
- Les mouvements de trésorerie internes ne constituent jamais une dépense économique HEt1.
