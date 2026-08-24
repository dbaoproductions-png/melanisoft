# BudgetSoft — Doctrine fonctionnelle

## 1. Autorités de données

- Le PDF bancaire fait autorité devant le copier-coller et la saisie humaine lorsqu'il existe une divergence sur une opération bancaire.
- Dans `Operations`, la catégorie enregistrée fait autorité. Une opération sans catégorie valide est provisoirement traitée comme `Divers` jusqu'à classement manuel.
- Les charges fixes ne sont reconnues comme CF0 que lorsqu'elles sont explicitement reliées à une charge fixe (`charge_fixe_id`).
- Pour Cerbère, le signe bancaire prévaut pour la liquidité : `+` améliore la trésorerie, `-` la diminue.

## 2. P0, R0, CF0

- P0 = budget pilotable maître.
- R0 = recettes structurelles maître.
- CF0 = charges fixes maître. Cerbère ne les affiche qu'en synthèse.
- P0, R0 et CF0 ne sont pas réécrits par Cerbère. Cerbère mesure le réel et propose des ajustements locaux P1–P6.

## 3. Doctrine Cerbère 3.7

Cerbère ne cherche pas à expliquer le passé. Il pilote le présent et le futur proche.

### M — aujourd'hui → 27

Le chiffre principal est : **ce que l'on peut encore dépenser d'ici au 27**.

Calcul conceptuel :

`solde bancaire actuel + recettes encore attendues - charges fixes restant à passer - autres sorties futures confirmées`

Les dépenses déjà passées sur le compte ne sont pas soustraites une deuxième fois : elles sont déjà contenues dans le solde bancaire actuel.

### M+1 — 28 → 27 suivant

Le chiffre principal est : **capacité projetée du mois suivant**.

Calcul conceptuel :

`solde reporté projeté de fin M + R0 + recettes événementielles - CF0 - CB de M déjà engagées - Plan - hors-enveloppes connus`

### Point de départ du mois

Le point de départ représente la capacité initiale à ventiler avant consommation pilotable. L'écart `point de départ - P0` est affiché explicitement comme surplus ou déficit de départ.

## 4. Cartes bancaires

- Une dépense CB n'est imputée à Cerbère qu'à sa date réelle d'impact bancaire.
- Les achats CB effectués pendant M alimentent donc normalement M+1.
- Une charge fixe réglée par CB reste une charge fixe et ne doit pas être comptée dans le pilotable.
- Les doublons provisoire/définitif sont neutralisés ; la ligne bancaire définitive gagne.

## 5. Joker P0

Si les CB héritées excèdent la capacité de compensation du mois, Cerbère peut activer automatiquement le joker : les tirettes reviennent à P0 et l'interface indique pourquoi.

Le joker peut être désactivé manuellement à tout moment. Exemple : un crédit de trésorerie réellement encaissé augmente la capacité et l'utilisateur peut rendre la main au réel et aux ajustements locaux.

## 6. Santé

La catégorie Santé est pilotée en coût net. Les remboursements déjà constatés et les remboursements attendus suffisamment certains doivent diminuer le coût prévisionnel Santé, sans être comptés une seconde fois comme renfort de trésorerie.

## 7. Plan / Actions — Événements

Un événement possède :

- une nature (`recette` ou `dépense`) ;
- une catégorie ;
- une date d'effet ;
- un mode de paiement (`CB`, `Chèque`, `Virement`, `Prélèvement`, `Espèces`, `Autre`) ;
- une certitude ;
- éventuellement un fractionnement.

Le fractionnement est activé par une case à cocher. On choisit ensuite une périodicité (`mensuel` ou `annuel`) et un nombre de fois. Chaque occurrence devient une échéance prévisionnelle distincte.

Pour une dépense CB, la date de l'événement représente la date d'achat ; Cerbère décale l'impact à la période bancaire réelle correspondante.

Les recettes prévues sont intégrées une fois dans la capacité du mois puis ajustées quand le réel arrive. Les dépenses sont consommées au fur et à mesure de leurs dates d'impact.

## 8. Après import

Après chaque import, le système doit rendre visibles au minimum :

- le nombre d'opérations non catégorisées ;
- le nombre d'opérations non rapprochées lorsqu'un rapprochement CF0 ou événement est attendu ;
- les éventuels doublons neutralisés.

Les corrections manuelles agissent directement sur la base `Operations`; Cerbère se recalcule ensuite à partir de la base corrigée.
