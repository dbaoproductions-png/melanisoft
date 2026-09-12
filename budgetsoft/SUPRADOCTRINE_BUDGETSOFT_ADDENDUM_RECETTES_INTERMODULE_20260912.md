# BudgetSoft — Addendum supradoctrine : recettes prévisionnelles intermodules

**Version : 2026-09-12**

Ce document est normatif. En cas de contradiction avec une formulation antérieure concernant les recettes prévisionnelles du cycle, il prévaut.

## 1. Propriétaire métier unique

La grandeur **« recettes attendues / recettes réévaluées du cycle »** possède un propriétaire unique : **Cerbère `Rt1`**, calculé dans la révision globale BudgetSoft.

Aucun écran ni module consommateur ne peut recalculer localement cette grandeur à partir de `Operations`, de `projectionEtendue`, du Plan ou d’une autre combinaison de sources.

## 2. Sémantique de `Rt1`

`Rt1` est la prévision réévaluée des recettes du cycle courant. Il applique la doctrine Cerbère validée :

- le canon de recettes régulières constitue le socle prévisionnel ;
- le réel constaté peut remplacer ou relever le canon selon la règle métier du moteur ;
- les recettes réelles hors R0 sont intégrées lorsqu’elles sont économiquement des recettes ;
- les remboursements santé positifs sont des recettes ;
- les événements Plan de recette encore dus sont intégrés ;
- une date prévue dépassée ne constitue jamais une preuve de réalisation ;
- un événement ne sort du prévisionnel que sur preuve : opération bancaire liée, rapprochement confirmé, annulation ou abandon explicite ;
- le double comptage Réel + Prévision pour un même mouvement est interdit.

## 3. Consommateurs intermodules

### Dashboard

`Dashboard.courtTerme.revenusAttendus` **doit être strictement égal** au `Rt1` du cycle courant de Cerbère dans la même `revisionBudgetSoft`.

Le Dashboard ne doit plus recomposer cette valeur par `revenusConstates + flux positifs de projectionEtendue`.

### Comptes

L’onglet Comptes ne possède pas de moteur de recettes distinct. Son **solde prévisionnel** doit être fourni par la trajectoire canonique `chargerTresorerieUnifieeBudgetSoft20260907()`, elle-même fondée sur `projectionEtendue` de la révision globale.

Les flux de recettes prévisionnelles qui expliquent le solde de Comptes doivent donc être les mêmes flux canoniques que ceux consommés par la trajectoire bancaire de Cerbère. Comptes ne calcule jamais un `Rt1` concurrent.

### Cerbère

Cerbère est le propriétaire du `Rt1`. Cerbère Express et toute vue dérivée consomment cette valeur sans la recalculer.

## 4. Invariants bloquants

Une révision BudgetSoft est invalide et ne doit pas être publiée si l’un des invariants suivants est violé :

1. `Dashboard.courtTerme.revenusAttendus !== Cerbere.periodes[0].v37.rt1` à un centime près ;
2. le `Rt1` du cycle courant est absent ou non numérique ;
3. `projectionEtendue` n’est pas produite par le propriétaire canonique de trésorerie ;
4. un événement standard encore dû disparaît de la trajectoire alors qu’aucune preuve de réalisation/rapprochement/annulation n’existe ;
5. deux consommateurs de la trajectoire bancaire utilisent des révisions BudgetSoft différentes ;
6. un module introduit un recalcul local concurrent d’une recette prévisionnelle déjà possédée par Cerbère ou par la trajectoire canonique.

## 5. Principe anti-régression

**Une donnée, un propriétaire, un calcul, plusieurs consommateurs.**

Pour les recettes du cycle :

`Sources canoniques → moteurs BudgetSoft/Plan → Cerbère Rt1 → Dashboard`

et, pour la matérialisation bancaire des flux futurs :

`Sources canoniques → projectionEtendue → Comptes / trajectoire bancaire Cerbère`

La cohérence entre `Rt1` et la trajectoire ne doit pas être obtenue par duplication de formule mais par la consommation des propriétaires canoniques et par des gardes de cohérence intermodules.
