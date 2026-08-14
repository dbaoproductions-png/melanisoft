# BudgetSoft — Import Lab

## Objectif immédiat

Fiabiliser la base avant tout développement d'analyse ou de dashboard.

Ordre de certification :
1. imports ;
2. rapprochement / absence de doublons ;
3. calculs et continuité bancaire ;
4. catégorisation ;
5. charges fixes ;
6. nettoyage du code ;
7. dashboard et analyses.

## Trois modes d'entrée à certifier

- PDF bancaire ;
- copier-coller Hello bank! : opérations classiques et CB à débit différé ;
- formulaire manuel.

Tous les modes doivent produire le même modèle canonique avant rapprochement et écriture.

## Invariants

- Une même opération réimportée ne crée jamais de doublon.
- Simulation et import utilisent le même parseur.
- Les colonnes sont écrites par nom d'en-tête, jamais par position.
- `id`, `cree_le` et `modifie_le` sont exclusivement techniques.
- Une source bancaire plus riche peut enrichir une opération existante sans écraser catégorie/commentaire métier.
- Une ambiguïté n'est jamais résolue arbitrairement : elle est signalée.
- Le contrôle final est : solde de départ + crédits - débits = solde bancaire attendu.

## Matrice d'essais

1. PDF sur base vierge.
2. Même PDF sur PDF préexistant.
3. Manuel puis PDF correspondant.
4. Copier-coller opérations sur base vierge.
5. Même copier-coller opérations réimporté.
6. Copier-coller opérations puis PDF correspondant.
7. Copier-coller CB différées sur base vierge.
8. Même copier-coller CB différées réimporté.
9. Copier-coller CB différées puis PDF correspondant.
10. Manuel puis copier-coller correspondant.

Pour chaque essai : nombre de lignes avant/après, créations, rapprochements, ambiguïtés, doublons, champs normalisés, débits, crédits et solde.

## Organisation Git

La branche `budgetsoft-import-lab` est le laboratoire actuel. Elle part de `budgetsoft-banking-safety-v2` mais les nouvelles corrections d'import doivent désormais être concentrées ici. Les anciens modules restent temporairement disponibles comme référence ; ils seront supprimés seulement après certification des imports.
