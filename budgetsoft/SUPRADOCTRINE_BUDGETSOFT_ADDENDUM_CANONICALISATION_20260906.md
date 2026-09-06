# Addendum normatif à la Supradoctrine BudgetSoft — Canonicalisation des opérations

**Version : 2026-09-06**

Ce document fait partie intégrante de `SUPRADOCTRINE_BUDGETSOFT_20260905.md` et a la même portée normative. En cas de contradiction avec une implémentation historique, la présente règle prévaut.

## A. Source brute et univers canonique

La table `Operations` reste la source maître du Réel, mais les modules ne doivent pas consommer directement des représentations techniques dupliquées lorsqu'une canonicalisation factuelle permet d'établir qu'elles décrivent le même mouvement économique.

BudgetSoft distingue donc :

- **Operations brutes** : lignes physiquement présentes dans la table ;
- **Operations canoniques** : univers de calcul commun après normalisations factuelles partagées ;
- **lectures métier** : partition réalisé/futur, agrégats, soldes, analyses et Cerbère, appliquées ensuite sur cet univers canonique selon leur doctrine propre.

Une canonicalisation n'est pas une doctrine métier : elle ne change ni le sens économique ni la date comptable d'une opération. Elle supprime seulement une représentation technique certaine du même mouvement.

## B. Déduplication bancaire

Une égalité de marchand, montant, carte ou date ne constitue **jamais à elle seule** une preuve de doublon. Plusieurs paiements identiques le même jour sont présumés distincts tant qu'une preuve structurée ne permet pas de conclure au contraire.

La déduplication automatique est autorisée uniquement lorsqu'un lien bancaire structuré établit une **ombre inter-dates** : même clé bancaire canonique, une représentation sur la date comptable attendue portée par la clé et une représentation du même mouvement sur une autre date comptable.

Dans ce cas :

- la représentation sur la date comptable canonique est conservée ;
- l'ombre inter-dates est neutralisée ;
- toutes les multiplicités présentes sur la date canonique sont conservées ;
- les cas ambigus restent visibles et doivent être audités, jamais supprimés par heuristique agressive.

## C. Une seule primitive de canonicalisation

Tous les modules transversaux doivent consommer la même primitive canonique de déduplication bancaire. Aucun module ne peut maintenir sa propre variante.

À compter du 06/09/2026, la primitive de référence est :

`dedoublonnerOperationsCartesCanonique20260906V3_()`

Le nom historique `dedoublonnerOperationsCartesBudgetSoft_()` n'est qu'un alias de compatibilité et ne doit pas être appelé par un nouveau moteur transversal.

## D. Invariants de non-régression

Pour chaque révision BudgetSoft, les contrôles suivants sont obligatoires :

1. `Operations brutes - Operations canoniques = doublons certains neutralisés` ;
2. la partition `réalisé + futur + indaté` couvre exactement les Operations canoniques ;
3. Comptes, Opérations, Trésorerie et le registre transversal utilisent le même nombre de doublons neutralisés ;
4. le solde réel de Trésorerie est exactement celui de Comptes ;
5. `solde réel + flux futurs canoniques = solde prévisionnel` ;
6. une différence entre ces valeurs empêche la publication de la nouvelle révision globale.

## E. Registre transversal et snapshot global

Le registre transversal publie les compteurs `sourceBrute`, `sourceCanonique`, `doublonsBancairesExclus` et la version de la primitive de canonicalisation.

Les valeurs transversales sont **composées à partir des résultats déjà calculés**. En particulier, le registre transversal ne relance pas un second moteur de trésorerie : il reprend la sortie du moteur Trésorerie canonique de la même révision.

Cette règle prolonge l'interdiction générale des recalculs concurrents : une valeur transversale possède un seul propriétaire, puis est réutilisée partout ailleurs.

## F. Leçon de recette du 06/09/2026

Le jeu témoin BudgetSoft (80) a montré pourquoi cette prudence est obligatoire : deux ombres bancaires certaines (Amazon 21,99 € et Relais Ramonvil 4,00 €) devaient être neutralisées, alors que des paiements VélôToulouse identiques le même jour étaient de vraies multiplicités et devaient rester distincts.

Cette recette n'est pas une règle métier figée sur ces libellés ; elle constitue un test historique de non-régression de la primitive canonique.