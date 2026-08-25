# Cerbère 3.7.7 — addendum normatif d'audit

Cet addendum complète `DOCTRINE_BUDGETSOFT.md` pour les règles validées après audit du classeur réel.

## SS1 — solde significatif

SS1 doit être reconstitué à partir d'une source bancaire définitive : solde de clôture d'un relevé PDF, puis opérations bancaires définitives jusqu'à la frontière 27/28. Les lignes provisoires CB ne doivent jamais doubler leurs équivalents PDF définitifs.

## Recettes R0 / Rt1

Une recette réelle portant la même catégorie qu'une recette R0 ne remplace pas automatiquement tout le canon mensuel. Tant qu'une identité de recette plus fine n'est pas renseignée, Cerbère retient pour le cycle `max(canon de la catégorie, réel constaté sur la catégorie)` ; les recettes réelles hors R0 et les recettes de Planification s'ajoutent séparément.

Les revenus fonciers peuvent provenir de plusieurs sources simultanées dans une même catégorie. Un loyer de garage encaissé ne réalise donc pas à lui seul toute la recette foncière mensuelle.

## Charges fixes CF

Une Action de baisse de charge ne diminue CFt1 que si elle est reliée à une vraie ligne de `Charges_fixes`. Une Action visant seulement une ancienne opération ne doit pas créer une économie mensuelle fictive.

Les fréquences de charges fixes doivent être respectées. Une charge annuelle n'est applicable qu'au cycle contenant son occurrence annuelle.

Une opération réelle reconnue comme charge fixe remplace l'occurrence prévue correspondante et doit sortir des enveloppes pilotables. Les rapprochements certains peuvent provenir d'un `charge_fixe_id`, d'un rapprochement validé, ou d'un rapprochement extrêmement fort (montant exact, date compatible, score suffisant).

## Opodo Prime

Opodo Prime est une charge fixe annuelle historique de 89,99 €, et non une charge mensuelle. Sa résiliation ne doit donc pas diminuer artificiellement CFt1 d'août 2026. Elle peut être conservée dans `Charges_fixes` avec fréquence annuelle et date de fin correspondant à la résiliation afin de préserver l'historique sans créer de charge future.

## Dépenses hors enveloppes — HEt1

Toute sortie réelle négative non déjà comptée dans une enveloppe pilotable ou dans CFt1 doit peser immédiatement sur SCt1. Son classement métier peut rester à contrôler, mais le départ d'argent ne peut pas être ignoré en attendant le rapprochement.

Les règlements techniques globaux de cartes à débit différé restent neutralisés afin d'éviter le double comptage des achats déjà imputés.

## Santé

Aucun remboursement santé hypothétique n'est projeté. Les remboursements réellement constatés sur le cycle diminuent le consommé Santé de ce cycle ; s'ils arrivent au cycle suivant, ils améliorent la situation Santé de M+1.
